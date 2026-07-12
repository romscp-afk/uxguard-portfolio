import { readStore, updateStore } from "./store.js";
import { canEditPlatform } from "./roles.js";

function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

function sameId(a, b) {
  const left = Number(a);
  const right = Number(b);
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

function hasValidAuthor(authorId) {
  const id = Number(authorId);
  return Number.isFinite(id) && id > 0;
}

function nextProjectId(projects) {
  return (projects || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

export async function listProjectsForUser(authorId) {
  const store = await readStore();
  return (store.projects || [])
    .filter((project) => sameId(project.author_id, authorId))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function getProjectForAuthor(id, authorId) {
  const store = await readStore();
  const project = (store.projects || []).find((item) => sameId(item.id, id));
  if (!project) return null;

  if (sameId(project.author_id, authorId)) {
    return project;
  }

  // Repair orphaned projects created with a missing/invalid author_id.
  if (!hasValidAuthor(project.author_id)) {
    let repaired = null;
    await updateStore((s) => {
      const item = (s.projects || []).find((p) => sameId(p.id, id));
      if (item) {
        item.author_id = Number(authorId);
        repaired = item;
      }
      return s;
    });
    return repaired;
  }

  return null;
}

export async function createProject(authorId, payload) {
  const now = new Date().toISOString();
  const ownerId = Number(authorId);
  if (!Number.isFinite(ownerId) || ownerId <= 0) {
    const error = new Error("Invalid author for project");
    error.status = 400;
    throw error;
  }

  let created = null;

  await updateStore((store) => {
    if (!store.projects) store.projects = [];
    const id = nextProjectId(store.projects);
    created = {
      id,
      author_id: ownerId,
      title: payload.title || "Untitled project",
      slug: payload.slug ? slugify(payload.slug) : slugify(payload.title || `project-${id}`),
      client: payload.client || null,
      status: payload.status || "active",
      description: payload.description || null,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      role: payload.role || null,
      team: Array.isArray(payload.team) ? payload.team : [],
      outcomes: Array.isArray(payload.outcomes) ? payload.outcomes : [],
      cover_image: payload.cover_image || null,
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      created_at: now,
      updated_at: now,
    };
    store.projects.push(created);
    return store;
  });

  // Re-read to confirm persistence and return the stored record.
  const stored = await getProjectForAuthor(created.id, ownerId);
  return stored || created;
}

export async function updateProject(id, authorId, payload) {
  const now = new Date().toISOString();
  const ownerId = Number(authorId);
  let updated = null;

  await updateStore((store) => {
    const projects = store.projects || [];
    let index = projects.findIndex(
      (project) => sameId(project.id, id) && sameId(project.author_id, ownerId),
    );

    // Adopt orphaned records so users can save projects they just created.
    if (index === -1) {
      index = projects.findIndex(
        (project) => sameId(project.id, id) && !hasValidAuthor(project.author_id),
      );
    }

    if (index === -1) {
      const error = new Error("Project not found");
      error.status = 404;
      throw error;
    }

    const current = projects[index];
    const {
      id: _id,
      author_id: _authorId,
      created_at: _createdAt,
      ...safePayload
    } = payload || {};

    updated = {
      ...current,
      ...safePayload,
      id: Number(current.id),
      author_id: ownerId,
      tags: Array.isArray(safePayload.tags) ? safePayload.tags : current.tags || [],
      team: Array.isArray(safePayload.team) ? safePayload.team : current.team || [],
      outcomes: Array.isArray(safePayload.outcomes) ? safePayload.outcomes : current.outcomes || [],
      attachments: Array.isArray(safePayload.attachments)
        ? safePayload.attachments
        : current.attachments || [],
      updated_at: now,
    };
    if (safePayload.slug) {
      updated.slug = slugify(safePayload.slug);
    }
    store.projects[index] = updated;
    return store;
  });

  return updated;
}

export async function deleteProject(id, authorId) {
  const ownerId = Number(authorId);
  let deleted = false;

  await updateStore((store) => {
    const projects = store.projects || [];
    const index = projects.findIndex((item) => sameId(item.id, id));
    if (index === -1) {
      const error = new Error("Project not found");
      error.status = 404;
      throw error;
    }

    const project = projects[index];
    const ownsProject =
      sameId(project.author_id, ownerId) || !hasValidAuthor(project.author_id);
    if (!ownsProject) {
      const error = new Error("Project not found");
      error.status = 404;
      throw error;
    }

    store.projects = projects.filter((item) => !sameId(item.id, id));
    deleted = true;

    for (const cs of store.caseStudies || []) {
      if (sameId(cs.project_id, id)) {
        cs.project_id = null;
        cs.updated_at = new Date().toISOString();
      }
    }
    return store;
  });

  return { ok: deleted };
}

export function assertCanEdit(user) {
  if (!canEditPlatform(user)) {
    const error = new Error("Your account is read-only. Upgrade to Professional to edit.");
    error.status = 403;
    throw error;
  }
}
