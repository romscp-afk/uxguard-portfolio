import { portfolioSettings, readStore, updateStore } from "./store.js";

export { portfolioSettings };

export async function getUserById(id) {
  const store = await readStore();
  return store.users.find((u) => u.id === id) || null;
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

export async function registerUser({ email, password, name, username, title }) {
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
      contact_email: email,
      location: null,
      cv_url: null,
      social_links: {},
      role: "researcher",
    };
    store.users.push(created);
    return store;
  });

  return { user: created };
}

export async function updateUserProfile(userId, updates) {
  let updated = null;
  await updateStore((store) => {
    const index = store.users.findIndex((u) => u.id === userId);
    if (index === -1) return store;
    if (updates.username) {
      updates.username = slugify(updates.username);
      const taken = store.users.find(
        (u) => u.username === updates.username && u.id !== userId,
      );
      if (taken) throw new Error("Username already taken");
    }
    store.users[index] = { ...store.users[index], ...updates };
    updated = store.users[index];
    return store;
  });
  return updated;
}

export function toUserOut(user) {
  const { password: _password, ...rest } = user;
  return { ...rest, portfolio_url: `/u/${user.username}` };
}

export function authorSummary(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    title: user.title,
    avatar_url: user.avatar_url,
  };
}

export function toListItem(cs) {
  return {
    id: cs.id,
    slug: cs.slug,
    title: cs.title,
    subtitle: cs.subtitle,
    client: cs.client,
    cover_image: cs.cover_image,
    methods: cs.methods,
    featured: cs.featured,
    status: cs.status,
    updated_at: cs.updated_at,
  };
}

export async function getFeedItems() {
  const store = await readStore();
  return store.caseStudies
    .filter((cs) => cs.status === "published")
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .map((cs) => {
      const author = store.users.find((u) => u.id === cs.author_id);
      return {
        ...toListItem(cs),
        published_at: cs.published_at,
        author: author ? authorSummary(author) : null,
      };
    });
}

export async function getUserProfile(username) {
  const store = await readStore();
  const user = store.users.find((u) => u.username === username);
  if (!user) return null;
  const studies = store.caseStudies
    .filter((cs) => cs.author_id === user.id && cs.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order);
  const { password: _password, ...publicUser } = user;
  return {
    ...publicUser,
    case_studies: studies.map(toListItem),
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
    const index = store.caseStudies.findIndex((cs) => cs.id === id);
    if (index === -1) throw new Error("Case study not found");
    if (store.caseStudies[index].author_id !== authorId) throw new Error("Forbidden");

    const current = store.caseStudies[index];
    const nextStatus = payload.status ?? current.status;
    const next = {
      ...current,
      ...payload,
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

export async function deleteCaseStudy(id, authorId) {
  await updateStore((store) => {
    const cs = store.caseStudies.find((item) => item.id === id);
    if (!cs) throw new Error("Case study not found");
    if (cs.author_id !== authorId) throw new Error("Forbidden");
    store.caseStudies = store.caseStudies.filter((item) => item.id !== id);
    return store;
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
