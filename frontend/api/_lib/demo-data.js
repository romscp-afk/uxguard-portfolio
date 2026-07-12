import { portfolioSettings, readStore, updateStore } from "./store.js";
import { defaultPortfolioConfig, resolveUserRole } from "./roles.js";
import { likeCountsByCaseStudy } from "./like-utils.js";
import { applyPortfolioOrdering, getUserPortfolioConfig } from "./portfolio-config.js";

export { portfolioSettings };

function normalizeProjectId(value) {
  if (value == null || value === "") return null;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function getUserById(id) {
  const store = await readStore();
  const target = Number(id);
  return store.users.find((u) => Number(u.id) === target) || null;
}

export async function getUserByUsername(username) {
  const store = await readStore();
  return store.users.find((u) => u.username === username) || null;
}

export async function getUserByEmail(email) {
  const store = await readStore();
  return store.users.find((u) => u.email === email) || null;
}

function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "researcher"
  );
}

async function uniqueUsername(base) {
  let candidate = slugify(base);
  let counter = 1;
  while (await getUserByUsername(candidate)) {
    candidate = `${slugify(base)}-${counter}`;
    counter += 1;
  }
  return candidate;
}

export async function registerUser({ email, password, name, username, title, role, onboarding_intent }) {
  if (!email || !password || !name) {
    return { error: "Name, email, and password are required", status: 400 };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters", status: 400 };
  }
  if (await getUserByEmail(email)) {
    return { error: "Email already registered", status: 400 };
  }

  const finalUsername = username ? slugify(username) : await uniqueUsername(name);
  if (username && (await getUserByUsername(finalUsername))) {
    return { error: "Username already taken", status: 400 };
  }

  let created = null;
  await updateStore((store) => {
    const id = store.users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
    created = {
      id,
      email,
      password,
      username: finalUsername,
      name,
      title: title || null,
      bio: null,
      avatar_url: null,
      cover_image_url: null,
      contact_email: email,
      location: null,
      cv_url: null,
      social_links: {},
      role: resolveUserRole(email, role),
      onboarding_intent: onboarding_intent || "build_portfolio",
      portfolio_config: defaultPortfolioConfig(),
    };
    store.users.push(created);
    return store;
  });

  return { user: created };
}

const PROFILE_FIELDS = new Set([
  "name",
  "username",
  "title",
  "bio",
  "avatar_url",
  "cover_image_url",
  "contact_email",
  "location",
  "cv_url",
  "social_links",
]);

function normalizeProfileValue(key, value) {
  if (key === "social_links") {
    if (!value || typeof value !== "object") return {};
    const next = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" && v.trim()) next[k] = v.trim();
    }
    return next;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return value ?? null;
}

export async function updateUserProfile(userId, updates) {
  let updated = null;
  const sanitized = {};
  for (const [key, value] of Object.entries(updates || {})) {
    if (PROFILE_FIELDS.has(key)) sanitized[key] = normalizeProfileValue(key, value);
  }

  await updateStore((store) => {
    const index = store.users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error("User not found");
    if (sanitized.username) {
      sanitized.username = slugify(sanitized.username);
      const taken = store.users.find(
        (u) => u.username === sanitized.username && u.id !== userId,
      );
      if (taken) throw new Error("Username already taken");
    }
    store.users[index] = { ...store.users[index], ...sanitized };
    updated = store.users[index];
    return store;
  });
  return updated;
}

export function toUserOut(user) {
  const { password: _password, ...rest } = user;
  return {
    ...rest,
    role: rest.role === "researcher" ? "professional" : rest.role,
    portfolio_url: `/u/${user.username}`,
    portfolio_config: {
      ...defaultPortfolioConfig(),
      ...(user.portfolio_config || {}),
    },
  };
}

export function authorSummary(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    title: user.title || null,
    bio: user.bio || null,
    avatar_url: user.avatar_url,
  };
}

export function toListItem(cs, likeCount = 0) {
  return {
    id: cs.id,
    slug: cs.slug,
    title: cs.title,
    subtitle: cs.subtitle,
    summary: cs.summary,
    client: cs.client,
    cover_image: cs.cover_image,
    methods: cs.methods,
    featured: cs.featured,
    status: cs.status,
    sort_order: cs.sort_order,
    project_id: cs.project_id ?? null,
    like_count: likeCount,
    updated_at: cs.updated_at,
  };
}

export async function getFeedItems(limit) {
  const store = await readStore();
  const likeCounts = likeCountsByCaseStudy(store);
  const items = store.caseStudies
    .filter((cs) => cs.status === "published")
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .map((cs) => {
      const author = store.users.find((u) => u.id === cs.author_id);
      if (!author) return null;
      return {
        ...toListItem(cs, likeCounts.get(Number(cs.id)) || 0),
        published_at: cs.published_at,
        author: authorSummary(author),
      };
    })
    .filter(Boolean);

  if (limit && Number.isFinite(limit) && limit > 0) {
    return items.slice(0, limit);
  }
  return items;
}

export async function getUserProfile(username) {
  const store = await readStore();
  const user = store.users.find((u) => u.username === username);
  if (!user) return null;

  const config = getUserPortfolioConfig(user);
  const studies = applyPortfolioOrdering(
    store.caseStudies.filter(
      (cs) => Number(cs.author_id) === Number(user.id) && cs.status === "published",
    ),
    config,
  );

  const projects = (store.projects || [])
    .filter(
      (project) =>
        Number(project.author_id) === Number(user.id) &&
        String(project.status || "active") !== "archived",
    )
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const likeCounts = likeCountsByCaseStudy(store);
  const { password: _password, ...publicUser } = user;
  const showProjects = config.show_projects !== false;
  return {
    ...publicUser,
    portfolio_config: config,
    projects: showProjects ? projects : [],
    case_studies: config.show_case_studies
      ? studies.map((cs) => toListItem(cs, likeCounts.get(Number(cs.id)) || 0))
      : [],
    case_study_count: studies.length,
  };
}

export async function getUserCaseStudy(username, slug) {
  const store = await readStore();
  const user = store.users.find((u) => u.username === username);
  if (!user) return null;
  return (
    store.caseStudies.find(
      (cs) => cs.author_id === user.id && cs.slug === slug && cs.status === "published",
    ) || null
  );
}

export async function listCaseStudies({ status, featured, authorId } = {}) {
  const store = await readStore();
  let list = [...store.caseStudies];
  if (authorId) list = list.filter((cs) => cs.author_id === authorId);
  if (status) list = list.filter((cs) => cs.status === status);
  else list = list.filter((cs) => cs.status === "published");
  if (featured !== undefined) list = list.filter((cs) => cs.featured === featured);
  list.sort((a, b) => a.sort_order - b.sort_order || new Date(b.updated_at) - new Date(a.updated_at));
  return list;
}

export async function getCaseStudyBySlug(slug) {
  const store = await readStore();
  return store.caseStudies.find((cs) => cs.slug === slug && cs.status === "published") || null;
}

export async function getCaseStudyById(id) {
  const store = await readStore();
  return store.caseStudies.find((cs) => cs.id === id) || null;
}

export async function getCaseStudyByIdForAuthor(id, authorId) {
  const store = await readStore();
  return store.caseStudies.find((cs) => cs.id === id && cs.author_id === authorId) || null;
}

function slugifyTitle(text) {
  return slugify(text) || `study-${Date.now()}`;
}

async function uniqueSlug(title, excludeId) {
  const store = await readStore();
  let candidate = slugifyTitle(title);
  let counter = 1;
  while (store.caseStudies.some((cs) => cs.slug === candidate && cs.id !== excludeId)) {
    candidate = `${slugifyTitle(title)}-${counter}`;
    counter += 1;
  }
  return candidate;
}

export async function createCaseStudy(authorId, payload) {
  const now = new Date().toISOString();
  const slug = payload.slug ? slugify(payload.slug) : await uniqueSlug(payload.title || "case-study");
  let created = null;

  await updateStore((store) => {
    const id = store.caseStudies.reduce((max, cs) => Math.max(max, cs.id), 0) + 1;
    created = {
      id,
      slug,
      title: payload.title || "Untitled",
      subtitle: payload.subtitle || null,
      client: payload.client || null,
      project_type: payload.project_type || null,
      role: payload.role || null,
      duration: payload.duration || null,
      summary: payload.summary || null,
      challenge: payload.challenge || null,
      methodology: payload.methodology || null,
      impact: payload.impact || null,
      reflections: payload.reflections || null,
      cover_image: payload.cover_image || null,
      methods: payload.methods || [],
      metrics: payload.metrics || [],
      content_blocks: payload.content_blocks || [],
      status: payload.status || "draft",
      featured: payload.featured || false,
      sort_order: payload.sort_order ?? 0,
      project_id: normalizeProjectId(payload.project_id),
      author_id: authorId,
      created_at: now,
      updated_at: now,
      published_at: payload.status === "published" ? now : null,
      attachments: [],
    };
    store.caseStudies.push(created);
    return store;
  });

  return created;
}

export async function updateCaseStudy(id, authorId, payload) {
  const now = new Date().toISOString();
  let updated = null;

  await updateStore((store) => {
    let index = store.caseStudies.findIndex((cs) => cs.id === id && cs.author_id === authorId);

    if (index === -1) {
      let finalId = id;
      const conflicting = store.caseStudies.find((cs) => cs.id === id);
      if (conflicting && conflicting.author_id !== authorId) {
        finalId = store.caseStudies.reduce((max, cs) => Math.max(max, cs.id), 0) + 1;
      }

      const nextStatus = payload.status || "draft";
      updated = {
        id: finalId,
        slug: payload.slug ? slugify(payload.slug) : slugifyTitle(payload.title || "case-study"),
        title: payload.title || "Untitled",
        subtitle: payload.subtitle || null,
        client: payload.client || null,
        project_type: payload.project_type || null,
        role: payload.role || null,
        duration: payload.duration || null,
        summary: payload.summary || null,
        challenge: payload.challenge || null,
        methodology: payload.methodology || null,
        impact: payload.impact || null,
        reflections: payload.reflections || null,
        cover_image: payload.cover_image || null,
        methods: payload.methods || [],
        metrics: payload.metrics || [],
        content_blocks: payload.content_blocks || [],
        status: nextStatus,
        featured: payload.featured || false,
        sort_order: payload.sort_order ?? 0,
        project_id: normalizeProjectId(payload.project_id),
        author_id: authorId,
        created_at: payload.created_at || now,
        updated_at: now,
        published_at: nextStatus === "published" ? now : null,
        attachments: payload.attachments || [],
      };
      store.caseStudies.push(updated);
      return store;
    }

    const current = store.caseStudies[index];
    const nextStatus = payload.status ?? current.status;
    const next = {
      ...current,
      ...payload,
      id: current.id,
      author_id: authorId,
      updated_at: now,
      published_at:
        nextStatus === "published"
          ? current.published_at || now
          : nextStatus === "draft"
            ? null
            : current.published_at,
    };

    if (payload.title && !payload.slug) {
      next.slug = current.slug || slugifyTitle(payload.title);
    }
    if (payload.slug) next.slug = slugify(payload.slug);

    store.caseStudies[index] = next;
    updated = next;
    return store;
  });

  return updated;
}

export async function syncCaseStudies(authorId, studies) {
  const now = new Date().toISOString();

  await updateStore((store) => {
    for (const incoming of studies || []) {
      if (!incoming || incoming.author_id !== authorId) continue;

      let index = store.caseStudies.findIndex(
        (cs) => cs.id === incoming.id && cs.author_id === authorId,
      );

      if (index === -1) {
        let finalId = incoming.id;
        const conflicting = store.caseStudies.find((cs) => cs.id === incoming.id);
        if (conflicting && conflicting.author_id !== authorId) {
          finalId = store.caseStudies.reduce((max, cs) => Math.max(max, cs.id), 0) + 1;
        }

        const status = incoming.status || "draft";
        store.caseStudies.push({
          id: finalId,
          slug: incoming.slug ? slugify(incoming.slug) : slugifyTitle(incoming.title || "case-study"),
          title: incoming.title || "Untitled",
          subtitle: incoming.subtitle || null,
          client: incoming.client || null,
          project_type: incoming.project_type || null,
          role: incoming.role || null,
          duration: incoming.duration || null,
          summary: incoming.summary || null,
          challenge: incoming.challenge || null,
          methodology: incoming.methodology || null,
          impact: incoming.impact || null,
          reflections: incoming.reflections || null,
          cover_image: incoming.cover_image || null,
          methods: incoming.methods || [],
          metrics: incoming.metrics || [],
          content_blocks: incoming.content_blocks || [],
          status,
          featured: incoming.featured || false,
          sort_order: incoming.sort_order ?? 0,
          project_id: normalizeProjectId(incoming.project_id),
          author_id: authorId,
          created_at: incoming.created_at || now,
          updated_at: incoming.updated_at || now,
          published_at:
            status === "published" ? incoming.published_at || now : null,
          attachments: incoming.attachments || [],
        });
        continue;
      }

      const current = store.caseStudies[index];
      const nextStatus = incoming.status ?? current.status;
      store.caseStudies[index] = {
        ...current,
        ...incoming,
        id: current.id,
        author_id: authorId,
        updated_at: incoming.updated_at || now,
        published_at:
          nextStatus === "published"
            ? current.published_at || incoming.published_at || now
            : nextStatus === "draft"
              ? null
              : current.published_at,
      };
    }
    return store;
  });
}

export async function deleteCaseStudy(id, authorId) {
  await updateStore((store) => {
    const cs = store.caseStudies.find((item) => item.id === id && item.author_id === authorId);
    if (!cs) throw new Error("Case study not found");
    store.caseStudies = store.caseStudies.filter((item) => item.id !== id || item.author_id !== authorId);
    return store;
  });
}

export async function addCaseStudyAttachment(caseId, authorId, attachment) {
  let created = null;
  await updateStore((store) => {
    const index = store.caseStudies.findIndex((cs) => cs.id === caseId && cs.author_id === authorId);
    if (index === -1) throw new Error("Case study not found");

    const current = store.caseStudies[index];
    const attachments = [...(current.attachments || [])];
    const id = attachments.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    created = {
      id,
      title: attachment.title || "Attachment",
      file_url: attachment.file_url,
      file_type: attachment.file_type || "application/octet-stream",
      size_bytes: Number(attachment.size_bytes) || 0,
    };
    attachments.push(created);
    store.caseStudies[index] = { ...current, attachments, updated_at: new Date().toISOString() };
    return store;
  });
  return created;
}

export async function deleteCaseStudyAttachment(attachmentId, authorId) {
  await updateStore((store) => {
    for (const cs of store.caseStudies) {
      if (cs.author_id !== authorId) continue;
      const index = (cs.attachments || []).findIndex((item) => item.id === attachmentId);
      if (index === -1) continue;
      cs.attachments = cs.attachments.filter((item) => item.id !== attachmentId);
      cs.updated_at = new Date().toISOString();
      return store;
    }
    throw new Error("Attachment not found");
  });
}

export async function adminListCaseStudies(authorId) {
  const store = await readStore();
  return store.caseStudies
    .filter((cs) => cs.author_id === authorId)
    .sort((a, b) => a.sort_order - b.sort_order || new Date(b.updated_at) - new Date(a.updated_at));
}

/** @deprecated */
export async function getDemoUser() {
  return getUserById(1);
}
