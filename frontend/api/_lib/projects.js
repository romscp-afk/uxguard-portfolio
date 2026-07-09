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

export async function listProjectsForUser(authorId) {
  const store = await readStore();
  return (store.projects || [])
    .filter((project) => project.author_id === authorId)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function getProjectForAuthor(id, authorId) {
  const store = await readStore();
  return (store.projects || []).find(
    (project) => project.id === id && project.author_id === authorId,
  ) || null;
}

export async function createProject(authorId, payload) {
  const now = new Date().toISOString();
  let created = null;

  await updateStore((store) => {
    if (!store.projects) store.projects = [];
    const id = store.projects.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    created = {
      id,
      author_id: authorId,
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
      (project) => project.id === id && project.author_id === authorId,
    );
    if (index === -1) throw new Error("Project not found");

    const current = store.projects[index];
    updated = {
      ...current,
      ...payload,
      id: current.id,
      author_id: authorId,
      tags: Array.isArray(payload.tags) ? payload.tags : current.tags || [],
      team: Array.isArray(payload.team) ? payload.team : current.team || [],
      outcomes: Array.isArray(payload.outcomes) ? payload.outcomes : current.outcomes || [],
      attachments: Array.isArray(payload.attachments)
        ? payload.attachments
        : current.attachments || [],
      updated_at: now,
    };
    if (payload.title && payload.slug) {
      updated.slug = slugify(payload.slug);
    }
    store.projects[index] = updated;
    return store;
  });

  return updated;
}

export async function deleteProject(id, authorId) {
  await updateStore((store) => {
    const project = (store.projects || []).find(
      (item) => item.id === id && item.author_id === authorId,
    );
    if (!project) throw new Error("Project not found");

    store.projects = store.projects.filter(
      (item) => item.id !== id || item.author_id !== authorId,
    );

    for (const cs of store.caseStudies) {
      if (cs.author_id === authorId && cs.project_id === id) {
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
