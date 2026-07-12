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
  return Number(a) === Number(b);
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
  return (
    (store.projects || []).find(
      (project) => sameId(project.id, id) && sameId(project.author_id, authorId),
    ) || null
  );
}

export async function createProject(authorId, payload) {
  const now = new Date().toISOString();
  let created = null;

  await updateStore((store) => {
    if (!store.projects) store.projects = [];
    const id = nextProjectId(store.projects);
    created = {
      id,
      author_id: Number(authorId),
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

  return created;
}

export async function updateProject(id, authorId, payload) {
  const now = new Date().toISOString();
  let updated = null;

  await updateStore((store) => {
    const index = (store.projects || []).findIndex(
      (project) => sameId(project.id, id) && sameId(project.author_id, authorId),
    );
    if (index === -1) {
      const error = new Error("Project not found");
      error.status = 404;
      throw error;
    }

    const current = store.projects[index];
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
      author_id: Number(authorId),
      tags: Array.isArray(safePayload.tags) ? safePayload.tags : current.tags || [],
      team: Array.isArray(safePayload.team) ? safePayload.team : current.team || [],
      outcomes: Array.isArray(safePayload.outcomes) ? safePayload.outcomes : current.outcomes || [],
      attachments: Array.isArray(safePayload.attachments)
        ? safePayload.attachments
        : current.attachments || [],
      updated_at: now,
    };
    if (safePayload.title && safePayload.slug) {
      updated.slug = slugify(safePayload.slug);
    } else if (safePayload.title && !safePayload.slug) {
      // keep existing slug unless explicitly provided
    }
    store.projects[index] = updated;
    return store;
  });

  return updated;
}

export async function deleteProject(id, authorId) {
  await updateStore((store) => {
    const project = (store.projects || []).find(
      (item) => sameId(item.id, id) && sameId(item.author_id, authorId),
    );
    if (!project) {
      const error = new Error("Project not found");
      error.status = 404;
      throw error;
    }

    store.projects = store.projects.filter(
      (item) => !(sameId(item.id, id) && sameId(item.author_id, authorId)),
    );

    for (const cs of store.caseStudies) {
      if (sameId(cs.author_id, authorId) && sameId(cs.project_id, id)) {
        cs.project_id = null;
        cs.updated_at = new Date().toISOString();
      }
    }
    return store;
  });
}

export function assertCanEdit(user) {
  if (!canEditPlatform(user)) {
    const error = new Error("Your account is read-only. Upgrade to Professional to edit.");
    error.status = 403;
    throw error;
  }
}
