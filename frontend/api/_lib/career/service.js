import { readStore, updateStore } from "../store.js";
import { assertCanEdit } from "../projects.js";
import {
  buildCareerInsights,
} from "./gaps.js";
import { classifyImportCandidates, resumeToTimelineCandidates } from "./import.js";
import {
  defaultWorkspaces,
  emptyCareerProfile,
  emptyTimelineEntry,
  normalizeActiveWorkspace,
  normalizeCareerProfile,
  normalizeTimelineEntry,
  normalizeTimelineSelection,
} from "./schema.js";
import { getResumeByIdForUser } from "../resume/service.js";

export { assertCanEdit };

function nextNumericId(list) {
  return (list || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function activeEntries(store, careerProfileId) {
  return (store.career_timeline_entries || []).filter(
    (item) =>
      Number(item.career_profile_id) === Number(careerProfileId) &&
      !item.deleted_at,
  );
}

export function normalizeUserWorkspaces(user) {
  const workspaces = defaultWorkspaces(user);
  return {
    workspaces,
    active_workspace: normalizeActiveWorkspace(user?.active_workspace, workspaces),
  };
}

export async function setActiveWorkspaceForUser(userId, workspace) {
  let saved = null;
  await updateStore(
    (store) => {
      const uid = Number(userId);
      const index = store.users.findIndex((u) => Number(u.id) === uid);
      if (index === -1) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
      }
      const user = store.users[index];
      const workspaces = defaultWorkspaces(user);
      if (workspace === "employer" && !workspaces.employer) {
        const err = new Error("Employer workspace is not enabled for this account yet");
        err.status = 403;
        throw err;
      }
      const next = {
        ...user,
        workspaces,
        active_workspace: normalizeActiveWorkspace(workspace, workspaces),
      };
      store.users[index] = next;
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function enableEmployerWorkspaceForUser(userId) {
  let saved = null;
  await updateStore(
    (store) => {
      const uid = Number(userId);
      const index = store.users.findIndex((u) => Number(u.id) === uid);
      if (index === -1) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
      }
      const user = store.users[index];
      const workspaces = { ...defaultWorkspaces(user), employer: true };
      const next = {
        ...user,
        workspaces,
        active_workspace: "employer",
        // Do not stamp candidate accounts as employer-only
      };
      store.users[index] = next;
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

/**
 * Switch portal mode on login. Candidate and employer portals are separate —
 * accounts only enter a portal they are entitled to.
 */
export async function setPortalWorkspaceForUser(userId, portal) {
  let saved = null;
  await updateStore(
    (store) => {
      const uid = Number(userId);
      const index = store.users.findIndex((u) => Number(u.id) === uid);
      if (index === -1) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
      }
      const user = store.users[index];
      const workspaces = defaultWorkspaces(user);
      const isAdmin = user.role === "admin";

      if (portal === "employer") {
        if (!workspaces.employer && !isAdmin) {
          const err = new Error(
            "This account is not an employer account. Register at Employer sign-up, or use Candidate sign in.",
          );
          err.status = 403;
          throw err;
        }
        const nextWorkspaces = isAdmin
          ? { candidate: true, employer: true }
          : { ...workspaces, employer: true };
        const next = {
          ...user,
          workspaces: nextWorkspaces,
          active_workspace: "employer",
          last_login_portal: "employer",
          account_type: user.account_type === "employer" ? "employer" : user.account_type || "candidate",
        };
        store.users[index] = next;
        saved = next;
        return store;
      }

      // candidate portal
      if (!workspaces.candidate && workspaces.employer && !isAdmin && user.account_type === "employer") {
        const err = new Error(
          "This is an employer account. Sign in at Employer sign in.",
        );
        err.status = 403;
        throw err;
      }
      const nextWorkspaces = isAdmin
        ? { candidate: true, employer: true }
        : {
            ...workspaces,
            candidate: workspaces.candidate !== false ? true : false,
          };
      if (!nextWorkspaces.candidate && !isAdmin) {
        const err = new Error("Candidate workspace is not available for this account");
        err.status = 403;
        throw err;
      }
      const next = {
        ...user,
        workspaces: nextWorkspaces,
        active_workspace: "candidate",
        last_login_portal: "candidate",
        // Repair legacy accounts wrongly marked as employer-only
        account_type:
          user.account_type === "employer" && nextWorkspaces.candidate
            ? "candidate"
            : user.account_type === "employer"
              ? "employer"
              : "candidate",
      };
      store.users[index] = next;
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

/** Fix legacy users stuck on employer portal after the old workspace switcher. */
export async function repairStuckEmployerPortal(userId) {
  let saved = null;
  await updateStore(
    (store) => {
      const uid = Number(userId);
      const index = store.users.findIndex((u) => Number(u.id) === uid);
      if (index === -1) return store;
      const user = store.users[index];
      const workspaces = defaultWorkspaces(user);
      const employerOnly =
        user.account_type === "employer" && workspaces.candidate === false;
      const keepEmployer =
        employerOnly || user.last_login_portal === "employer";

      if (keepEmployer) {
        saved = user;
        return store;
      }

      // Force candidate portal + repair wrong account_type stamps
      const next = {
        ...user,
        workspaces: {
          ...workspaces,
          candidate: workspaces.candidate === false && user.account_type === "employer" ? false : true,
        },
        active_workspace: "candidate",
        last_login_portal: user.last_login_portal === "candidate" ? "candidate" : "candidate",
        account_type:
          user.account_type === "employer" && workspaces.candidate === false
            ? "employer"
            : "candidate",
      };
      // Only write when something actually changes
      if (
        user.active_workspace === next.active_workspace &&
        user.account_type === next.account_type &&
        user.last_login_portal === next.last_login_portal
      ) {
        saved = user;
        return store;
      }
      store.users[index] = next;
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

function ensureProfileInStore(store, userId) {
  if (!store.career_profiles) store.career_profiles = [];
  if (!store.career_timeline_entries) store.career_timeline_entries = [];
  const uid = Number(userId);
  let profile = store.career_profiles.find((item) => Number(item.user_id) === uid);
  if (profile) {
    const profileId = Number(profile.id);
    if (!Number.isFinite(profileId) || profileId <= 0) {
      profile.id = nextNumericId(store.career_profiles.filter((item) => item !== profile));
    }
    return profile;
  }
  const user = (store.users || []).find((u) => Number(u.id) === uid);
  const id = nextNumericId(store.career_profiles);
  profile = {
    ...normalizeCareerProfile(
      {
        headline: user?.title || "",
        summary: user?.bio || "",
        user_id: uid,
      },
      uid,
    ),
    id,
    user_id: uid,
  };
  store.career_profiles.push(profile);
  return profile;
}

export async function getOrCreateCareerProfile(userId) {
  await updateStore(
    (store) => {
      ensureProfileInStore(store, userId);
      return store;
    },
    { forceRefresh: true },
  );
  const store = await readStore({ forceRefresh: true });
  const profile = (store.career_profiles || []).find(
    (item) => Number(item.user_id) === Number(userId),
  );
  return normalizeCareerProfile(profile || emptyCareerProfile(userId), userId);
}

export async function updateCareerProfile(userId, payload = {}) {
  let saved = null;
  await updateStore(
    (store) => {
      const profile = ensureProfileInStore(store, userId);
      const next = normalizeCareerProfile(
        {
          ...profile,
          ...payload,
          id: profile.id,
          user_id: profile.user_id,
          created_at: profile.created_at,
          updated_at: new Date().toISOString(),
        },
        userId,
      );
      store.career_profiles = store.career_profiles.map((item) =>
        Number(item.id) === Number(profile.id) ? next : item,
      );
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function listTimelineEntries(userId, { includeHidden = true } = {}) {
  const store = await readStore();
  const profile = (store.career_profiles || []).find(
    (item) => Number(item.user_id) === Number(userId),
  );
  if (!profile) return [];
  return activeEntries(store, profile.id)
    .filter((item) => (includeHidden ? true : !item.hidden))
    .map(normalizeTimelineEntry)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return String(b.start_date).localeCompare(String(a.start_date));
    });
}

export async function getTimelineEntryForUser(entryId, userId) {
  const store = await readStore();
  const profile = (store.career_profiles || []).find(
    (item) => Number(item.user_id) === Number(userId),
  );
  if (!profile) return null;
  const entry = (store.career_timeline_entries || []).find(
    (item) =>
      Number(item.id) === Number(entryId) &&
      Number(item.career_profile_id) === Number(profile.id) &&
      !item.deleted_at,
  );
  return entry ? normalizeTimelineEntry(entry) : null;
}

export async function createTimelineEntry(userId, payload = {}) {
  let saved = null;
  await updateStore(
    (store) => {
      const profile = ensureProfileInStore(store, userId);
      const now = new Date().toISOString();
      const entry = normalizeTimelineEntry(
        emptyTimelineEntry(profile.id, {
          ...payload,
          id: nextNumericId(store.career_timeline_entries),
          career_profile_id: profile.id,
          created_at: now,
          updated_at: now,
          source_type: payload.source_type || "manual",
        }),
      );
      store.career_timeline_entries.push(entry);
      refreshProfileStats(store, profile.id);
      saved = entry;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function updateTimelineEntry(entryId, userId, payload = {}) {
  let saved = null;
  await updateStore(
    (store) => {
      const profile = ensureProfileInStore(store, userId);
      const existing = (store.career_timeline_entries || []).find(
        (item) =>
          Number(item.id) === Number(entryId) &&
          Number(item.career_profile_id) === Number(profile.id) &&
          !item.deleted_at,
      );
      if (!existing) {
        const err = new Error("Timeline entry not found");
        err.status = 404;
        throw err;
      }
      const next = normalizeTimelineEntry({
        ...existing,
        ...payload,
        id: existing.id,
        career_profile_id: profile.id,
        created_at: existing.created_at,
        updated_at: new Date().toISOString(),
        deleted_at: existing.deleted_at,
      });
      store.career_timeline_entries = store.career_timeline_entries.map((item) =>
        Number(item.id) === Number(existing.id) ? next : item,
      );
      refreshProfileStats(store, profile.id);
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function deleteTimelineEntry(entryId, userId) {
  await updateStore(
    (store) => {
      const profile = ensureProfileInStore(store, userId);
      const existing = (store.career_timeline_entries || []).find(
        (item) =>
          Number(item.id) === Number(entryId) &&
          Number(item.career_profile_id) === Number(profile.id) &&
          !item.deleted_at,
      );
      if (!existing) {
        const err = new Error("Timeline entry not found");
        err.status = 404;
        throw err;
      }
      const now = new Date().toISOString();
      store.career_timeline_entries = store.career_timeline_entries.map((item) =>
        Number(item.id) === Number(existing.id)
          ? { ...item, deleted_at: now, updated_at: now }
          : item,
      );
      if (!store.__uxguardDeleted) store.__uxguardDeleted = {};
      if (!store.__uxguardDeleted.career_timeline_entries) {
        store.__uxguardDeleted.career_timeline_entries = [];
      }
      // Soft delete only — keep for audit; no hard tombstone needed for numeric merge
      refreshProfileStats(store, profile.id);
      return store;
    },
    { forceRefresh: true },
  );
  return { ok: true };
}

function refreshProfileStats(store, careerProfileId) {
  const entries = activeEntries(store, careerProfileId).map(normalizeTimelineEntry);
  const insights = buildCareerInsights(entries);
  store.career_profiles = (store.career_profiles || []).map((item) =>
    Number(item.id) === Number(careerProfileId)
      ? {
          ...item,
          total_experience_months: insights.total_experience_months,
          updated_at: new Date().toISOString(),
        }
      : item,
  );
}

export async function getCareerInsights(userId) {
  const profile = await getOrCreateCareerProfile(userId);
  const entries = await listTimelineEntries(userId);
  return {
    profile,
    insights: buildCareerInsights(entries),
    entries,
  };
}

export async function importTimelineFromResume(userId, resumeId, { autoImport = true } = {}) {
  const resume = await getResumeByIdForUser(resumeId, userId);
  if (!resume) {
    const err = new Error("Resume not found");
    err.status = 404;
    throw err;
  }

  const candidates = resumeToTimelineCandidates(resume);
  let created = [];
  let duplicates = [];

  await updateStore(
    (store) => {
      const profile = ensureProfileInStore(store, userId);
      const existing = activeEntries(store, profile.id).map(normalizeTimelineEntry);
      const classified = classifyImportCandidates(candidates, existing);
      duplicates = classified.duplicates.map((item) => ({
        candidate: item.candidate,
        matches: item.matches.map((m) => ({
          existing_id: m.existing_id,
          confidence: m.confidence,
          entry: m.entry,
        })),
      }));

      created = [];
      if (autoImport) {
        for (const candidate of classified.ready) {
          const entry = normalizeTimelineEntry({
            ...candidate,
            id: nextNumericId(store.career_timeline_entries),
            career_profile_id: profile.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          store.career_timeline_entries.push(entry);
          created.push(entry);
        }
        refreshProfileStats(store, profile.id);
      }
      return store;
    },
    { forceRefresh: true },
  );

  return {
    resume_id: Number(resumeId),
    created,
    duplicates,
    created_count: created.length,
    duplicate_count: duplicates.length,
  };
}

export async function resolveTimelineMerge(userId, decisions = []) {
  const results = [];
  for (const decision of decisions) {
    const action = decision.action;
    const candidate = decision.candidate;
    const existingId = decision.existing_id;

    if (action === "review_later") {
      results.push({ action, status: "deferred" });
      continue;
    }

    if (action === "keep_both") {
      const created = await createTimelineEntry(userId, {
        ...candidate,
        source_type: candidate?.source_type || "resume_import",
      });
      results.push({ action, status: "created", entry: created });
      continue;
    }

    if (action === "replace" && existingId) {
      const updated = await updateTimelineEntry(existingId, userId, {
        ...candidate,
        source_type: candidate?.source_type || "resume_import",
      });
      results.push({ action, status: "replaced", entry: updated });
      continue;
    }

    if (action === "merge" && existingId) {
      const existing = await getTimelineEntryForUser(existingId, userId);
      if (!existing) {
        results.push({ action, status: "missing", existing_id: existingId });
        continue;
      }
      const merged = {
        title: candidate.title || existing.title,
        organisation: candidate.organisation || existing.organisation,
        location: candidate.location || existing.location,
        start_date: candidate.start_date || existing.start_date,
        end_date: candidate.end_date || existing.end_date,
        is_current: candidate.is_current ?? existing.is_current,
        description: candidate.description || existing.description,
        achievements: [
          ...new Set([...(existing.achievements || []), ...(candidate.achievements || [])]),
        ],
        skills: [...new Set([...(existing.skills || []), ...(candidate.skills || [])])],
        employment_type: candidate.employment_type || existing.employment_type,
        working_arrangement: candidate.working_arrangement || existing.working_arrangement,
        field_of_study: candidate.field_of_study || existing.field_of_study,
        issuer: candidate.issuer || existing.issuer,
        supporting_url: candidate.supporting_url || existing.supporting_url,
      };
      const updated = await updateTimelineEntry(existingId, userId, merged);
      results.push({ action, status: "merged", entry: updated });
      continue;
    }

    results.push({ action, status: "ignored" });
  }
  return { results };
}

export async function getResumeTimelineSelections(resumeId, userId) {
  const resume = await getResumeByIdForUser(resumeId, userId);
  if (!resume) {
    const err = new Error("Resume not found");
    err.status = 404;
    throw err;
  }
  const selections = (resume.timeline_selections || []).map(normalizeTimelineSelection);
  const entries = await listTimelineEntries(userId);
  const byId = new Map(entries.map((item) => [Number(item.id), item]));
  return {
    resume_id: Number(resumeId),
    selections: selections.map((sel) => ({
      ...sel,
      entry: byId.get(Number(sel.timeline_entry_id)) || null,
    })),
    available_entries: entries,
  };
}

export async function putResumeTimelineSelections(resumeId, userId, selections = []) {
  const { updateResumeForUser } = await import("../resume/service.js");
  const normalized = (selections || [])
    .map(normalizeTimelineSelection)
    .filter((item) => item.timeline_entry_id);

  // Validate ownership of referenced entries
  const owned = await listTimelineEntries(userId);
  const ownedIds = new Set(owned.map((item) => Number(item.id)));
  for (const sel of normalized) {
    if (!ownedIds.has(Number(sel.timeline_entry_id))) {
      const err = new Error(`Timeline entry ${sel.timeline_entry_id} not found`);
      err.status = 400;
      throw err;
    }
  }

  const resume = await updateResumeForUser(resumeId, userId, {
    timeline_selections: normalized,
  });
  return getResumeTimelineSelections(resume.id, userId);
}

export function entriesUsedByResumes(store, entryId) {
  const id = Number(entryId);
  return (store.resumes || [])
    .filter((resume) => resume.status !== "deleted" && !resume.deleted_at)
    .filter((resume) =>
      (resume.timeline_selections || []).some(
        (sel) => Number(sel.timeline_entry_id) === id && sel.is_included !== false,
      ),
    )
    .map((resume) => ({
      id: resume.id,
      title: resume.title,
      user_id: resume.user_id,
    }));
}
