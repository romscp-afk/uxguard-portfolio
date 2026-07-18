import { readStore, updateStore } from "../store.js";
import { assertCanEdit } from "../projects.js";
import { getResumeByIdForUser } from "../resume/service.js";
import { listTimelineEntries, getOrCreateCareerProfile } from "../career/service.js";
import { trackHiringEvent } from "./analytics.js";
import { assertCompanyAccess } from "./authz.js";
import { computeJobMatch } from "./match.js";
import {
  normalizeApplication,
  normalizeInternalNote,
  normalizeJob,
  normalizeStageHistory,
} from "./schema.js";

function nextId(list) {
  return (list || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function pushNotification(store, userId, { type, title, message, link }) {
  if (!store.notifications) store.notifications = [];
  store.notifications.push({
    id: nextId(store.notifications),
    user_id: Number(userId),
    type: type || "follow",
    title,
    message,
    link: link || null,
    read_at: null,
    created_at: new Date().toISOString(),
  });
}

function candidatePublicApplication(app) {
  return {
    id: app.id,
    job_id: app.job_id,
    company_id: app.company_id,
    resume_id: app.resume_id,
    status: app.candidate_visible_status || app.status,
    submitted_at: app.submitted_at,
    updated_at: app.updated_at,
    withdrawn_at: app.withdrawn_at,
    cover_letter: app.cover_letter,
    portfolio_url: app.portfolio_url,
    match_summary: app.match_summary
      ? {
          percent: app.match_summary.percent,
          disclaimer: app.match_summary.disclaimer,
          categories: app.match_summary.categories,
          suggested_improvements: app.match_summary.suggested_improvements,
        }
      : null,
  };
}

export async function applyToJob(jobId, user, payload = {}) {
  assertCanEdit(user);
  await trackHiringEvent("application_started", user.id, { job_id: Number(jobId) });

  const resumeId = payload.resume_id;
  if (!resumeId) {
    const err = new Error("resume_id is required");
    err.status = 400;
    throw err;
  }
  if (!payload.consent_accepted) {
    const err = new Error("You must confirm accuracy and consent before submitting");
    err.status = 400;
    throw err;
  }

  const resume = await getResumeByIdForUser(resumeId, user.id);
  if (!resume) {
    const err = new Error("Resume not found");
    err.status = 404;
    throw err;
  }

  const profile = await getOrCreateCareerProfile(user.id);
  const timeline = await listTimelineEntries(user.id, { includeHidden: false });
  const publicTimeline = timeline.filter(
    (e) => !e.hidden && e.visibility !== "private",
  );

  let saved = null;
  await updateStore(
    (store) => {
      if (!store.job_applications) store.job_applications = [];
      if (!store.application_stage_history) store.application_stage_history = [];
      const job = (store.jobs || []).find((j) => Number(j.id) === Number(jobId) && !j.deleted_at);
      if (!job) {
        const err = new Error("Job not found");
        err.status = 404;
        throw err;
      }
      if (job.status !== "published") {
        const err = new Error(
          job.status === "expired" || job.status === "closed"
            ? "This job is no longer accepting applications"
            : "This job is not open for applications",
        );
        err.status = 400;
        throw err;
      }
      if (job.deadline) {
        const due = Date.parse(job.deadline);
        if (Number.isFinite(due) && due < Date.now()) {
          const err = new Error("This job has expired");
          err.status = 400;
          throw err;
        }
      }
      if (job.application_settings?.mode === "external") {
        const err = new Error("This job uses an external application URL");
        err.status = 400;
        throw err;
      }

      const existing = (store.job_applications || []).find(
        (a) =>
          Number(a.job_id) === Number(jobId) &&
          Number(a.candidate_user_id) === Number(user.id) &&
          a.status !== "withdrawn",
      );
      if (existing && !job.application_settings?.allow_reapply) {
        const err = new Error("You have already applied to this job");
        err.status = 409;
        throw err;
      }

      const match = computeJobMatch(normalizeJob(job), resume, {
        screeningAnswers: payload.screening_answers || [],
      });

      // Immutable snapshots — strip sensitive extraction raw text
      const resumeSnapshot = {
        ...resume,
        extraction: resume.extraction
          ? { ...resume.extraction, raw_text: undefined }
          : null,
        versions: undefined,
      };
      const careerSnapshot = {
        profile: {
          headline: profile.headline,
          summary: profile.summary,
          visibility: profile.visibility,
        },
        entries: publicTimeline.map((e) => ({
          id: e.id,
          type: e.type,
          title: e.title,
          organisation: e.organisation,
          start_date: e.start_date,
          end_date: e.end_date,
          is_current: e.is_current,
          description: e.description,
          skills: e.skills,
        })),
      };
      const contactSnapshot = {
        name: resume.basics?.name || user.name,
        email: resume.basics?.email || user.email,
        phone: resume.basics?.phone || "",
        location: resume.basics?.location || user.location || "",
        linkedin_url: resume.basics?.linkedin_url || "",
        portfolio_url: resume.basics?.portfolio_url || payload.portfolio_url || "",
      };

      const now = new Date().toISOString();
      const app = normalizeApplication({
        id: nextId(store.job_applications),
        job_id: Number(jobId),
        company_id: Number(job.company_id),
        candidate_user_id: user.id,
        resume_id: Number(resumeId),
        resume_version_id: payload.resume_version_id || null,
        resume_snapshot: resumeSnapshot,
        career_profile_snapshot: careerSnapshot,
        contact_snapshot: contactSnapshot,
        cover_letter: payload.cover_letter || "",
        portfolio_url: payload.portfolio_url || "",
        screening_answers: payload.screening_answers || [],
        attachments: payload.attachments || [],
        status: "submitted",
        candidate_visible_status: "submitted",
        match_summary: match,
        consent_accepted_at: now,
        submitted_at: now,
        created_at: now,
        updated_at: now,
      });
      store.job_applications.push(app);
      store.application_stage_history.push(
        normalizeStageHistory({
          id: nextId(store.application_stage_history),
          application_id: app.id,
          previous_stage: "draft",
          new_stage: "submitted",
          candidate_visible_stage: "submitted",
          changed_by: user.id,
          note: "Application submitted",
        }),
      );

      // Notify employer owner / assigned team (no sensitive details in message)
      const company = (store.companies || []).find((c) => Number(c.id) === Number(job.company_id));
      if (company?.owner_user_id) {
        pushNotification(store, company.owner_user_id, {
          type: "follow",
          title: "New application",
          message: `A candidate applied to ${job.title}.`,
          link: `/admin/employer/jobs/${job.id}/applications`,
        });
      }
      saved = app;
      return store;
    },
    { forceRefresh: true },
  );

  await trackHiringEvent("application_submitted", user.id, { job_id: Number(jobId) });
  await trackHiringEvent("application_received", null, {
    job_id: Number(jobId),
    company_id: saved.company_id,
  });
  return candidatePublicApplication(saved);
}

export async function listCandidateApplications(userId) {
  const store = await readStore();
  const apps = (store.job_applications || [])
    .filter((a) => Number(a.candidate_user_id) === Number(userId))
    .map(normalizeApplication)
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));

  return apps.map((app) => {
    const job = (store.jobs || []).find((j) => Number(j.id) === Number(app.job_id));
    const company = (store.companies || []).find((c) => Number(c.id) === Number(app.company_id));
    return {
      ...candidatePublicApplication(app),
      job_title: job?.title || "Job",
      company_name: company?.display_name || "Company",
      company_logo: company?.logo_url || "",
      next_action:
        app.status === "submitted"
          ? "Waiting for review"
          : app.status === "interview"
            ? "Prepare for interview"
            : app.status === "offer"
              ? "Review offer"
              : null,
    };
  });
}

export async function getCandidateApplication(applicationId, userId) {
  const store = await readStore();
  const app = (store.job_applications || []).find(
    (a) => Number(a.id) === Number(applicationId) && Number(a.candidate_user_id) === Number(userId),
  );
  if (!app) return null;
  const job = (store.jobs || []).find((j) => Number(j.id) === Number(app.job_id));
  const company = (store.companies || []).find((c) => Number(c.id) === Number(app.company_id));
  const history = (store.application_stage_history || [])
    .filter((h) => Number(h.application_id) === Number(applicationId))
    .map((h) => ({
      new_stage: h.candidate_visible_stage || h.new_stage,
      created_at: h.created_at,
      note: undefined, // never expose internal notes
    }));
  return {
    application: candidatePublicApplication(normalizeApplication(app)),
    resume_snapshot: app.resume_snapshot,
    career_profile_snapshot: app.career_profile_snapshot,
    job: job
      ? { id: job.id, title: job.title, status: job.status, company_id: job.company_id }
      : null,
    company: company
      ? { id: company.id, display_name: company.display_name, logo_url: company.logo_url }
      : null,
    history,
  };
}

export async function withdrawApplication(applicationId, userId) {
  let saved = null;
  await updateStore(
    (store) => {
      const app = (store.job_applications || []).find(
        (a) =>
          Number(a.id) === Number(applicationId) && Number(a.candidate_user_id) === Number(userId),
      );
      if (!app) {
        const err = new Error("Application not found");
        err.status = 404;
        throw err;
      }
      if (app.status === "withdrawn") {
        saved = normalizeApplication(app);
        return store;
      }
      const now = new Date().toISOString();
      const next = normalizeApplication({
        ...app,
        status: "withdrawn",
        candidate_visible_status: "withdrawn",
        withdrawn_at: now,
        updated_at: now,
      });
      store.job_applications = store.job_applications.map((a) =>
        Number(a.id) === Number(applicationId) ? next : a,
      );
      if (!store.application_stage_history) store.application_stage_history = [];
      store.application_stage_history.push(
        normalizeStageHistory({
          id: nextId(store.application_stage_history),
          application_id: applicationId,
          previous_stage: app.status,
          new_stage: "withdrawn",
          candidate_visible_stage: "withdrawn",
          changed_by: userId,
          note: "Withdrawn by candidate",
        }),
      );
      const job = (store.jobs || []).find((j) => Number(j.id) === Number(app.job_id));
      const company = (store.companies || []).find((c) => Number(c.id) === Number(app.company_id));
      if (company?.owner_user_id) {
        pushNotification(store, company.owner_user_id, {
          type: "follow",
          title: "Application withdrawn",
          message: `A candidate withdrew an application${job ? ` for ${job.title}` : ""}.`,
          link: job ? `/admin/employer/jobs/${job.id}/applications` : "/admin/employer",
        });
      }
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  await trackHiringEvent("application_withdrawn", userId, { application_id: Number(applicationId) });
  return candidatePublicApplication(saved);
}

export async function listEmployerApplications(jobId, user, filters = {}) {
  const store = await readStore();
  const job = (store.jobs || []).find((j) => Number(j.id) === Number(jobId) && !j.deleted_at);
  if (!job) {
    const err = new Error("Job not found");
    err.status = 404;
    throw err;
  }
  assertCompanyAccess(store, job.company_id, user, "candidate_access");

  let apps = (store.job_applications || [])
    .filter((a) => Number(a.job_id) === Number(jobId))
    .map(normalizeApplication);

  if (filters.stage) apps = apps.filter((a) => a.status === filters.stage);

  return apps.map((app) => {
    const candidate = (store.users || []).find((u) => Number(u.id) === Number(app.candidate_user_id));
    const snap = app.resume_snapshot || {};
    const latestRole = (snap.experience || [])[0];
    return {
      id: app.id,
      candidate_name: app.contact_snapshot?.name || candidate?.name || "Candidate",
      headline: snap.basics?.title || candidate?.title || "",
      latest_role: latestRole ? `${latestRole.role} · ${latestRole.company}` : "",
      location: app.contact_snapshot?.location || "",
      submitted_at: app.submitted_at,
      status: app.status,
      match_percent: app.match_summary?.percent ?? null,
      assigned_member_id: app.assigned_member_id,
      tags: app.tags,
    };
  });
}

export async function getEmployerApplication(applicationId, user) {
  const store = await readStore();
  const app = (store.job_applications || []).find((a) => Number(a.id) === Number(applicationId));
  if (!app) return null;
  assertCompanyAccess(store, app.company_id, user, "candidate_access");
  const notes = (store.application_internal_notes || [])
    .filter((n) => Number(n.application_id) === Number(applicationId))
    .map(normalizeInternalNote);
  const history = (store.application_stage_history || [])
    .filter((h) => Number(h.application_id) === Number(applicationId))
    .map(normalizeStageHistory);
  const candidate = (store.users || []).find((u) => Number(u.id) === Number(app.candidate_user_id));
  return {
    application: normalizeApplication(app),
    candidate: candidate
      ? { id: candidate.id, name: candidate.name, title: candidate.title, username: candidate.username }
      : null,
    resume_snapshot: app.resume_snapshot,
    career_profile_snapshot: app.career_profile_snapshot,
    notes,
    history,
  };
}

export async function updateApplicationStage(applicationId, user, payload = {}) {
  assertCanEdit(user);
  const newStage = payload.status || payload.stage;
  if (!newStage) {
    const err = new Error("status is required");
    err.status = 400;
    throw err;
  }
  let saved = null;
  await updateStore(
    (store) => {
      const app = (store.job_applications || []).find((a) => Number(a.id) === Number(applicationId));
      if (!app) {
        const err = new Error("Application not found");
        err.status = 404;
        throw err;
      }
      assertCompanyAccess(store, app.company_id, user, "stage_update");
      const visible =
        payload.candidate_visible_status ||
        (["under_review", "viewed"].includes(newStage) ? "under_review" : newStage);
      const now = new Date().toISOString();
      const next = normalizeApplication({
        ...app,
        status: newStage,
        candidate_visible_status: visible,
        updated_at: now,
      });
      store.job_applications = store.job_applications.map((a) =>
        Number(a.id) === Number(applicationId) ? next : a,
      );
      if (!store.application_stage_history) store.application_stage_history = [];
      store.application_stage_history.push(
        normalizeStageHistory({
          id: nextId(store.application_stage_history),
          application_id: applicationId,
          previous_stage: app.status,
          new_stage: newStage,
          candidate_visible_stage: visible,
          changed_by: user.id,
          note: payload.note || "",
        }),
      );
      pushNotification(store, app.candidate_user_id, {
        type: "follow",
        title: "Application update",
        message: "Your application status was updated.",
        link: "/admin/applications",
      });
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  await trackHiringEvent("application_stage_changed", user.id, {
    application_id: Number(applicationId),
    stage: newStage,
  });
  return normalizeApplication(saved);
}

export async function addApplicationNote(applicationId, user, note) {
  assertCanEdit(user);
  if (!String(note || "").trim()) {
    const err = new Error("Note is required");
    err.status = 400;
    throw err;
  }
  let saved = null;
  await updateStore(
    (store) => {
      const app = (store.job_applications || []).find((a) => Number(a.id) === Number(applicationId));
      if (!app) {
        const err = new Error("Application not found");
        err.status = 404;
        throw err;
      }
      assertCompanyAccess(store, app.company_id, user, "internal_notes");
      if (!store.application_internal_notes) store.application_internal_notes = [];
      saved = normalizeInternalNote({
        id: nextId(store.application_internal_notes),
        application_id: applicationId,
        author_user_id: user.id,
        note: String(note).trim(),
        visibility: "internal",
      });
      store.application_internal_notes.push(saved);
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function assignApplication(applicationId, user, memberId) {
  assertCanEdit(user);
  let saved = null;
  await updateStore(
    (store) => {
      const app = (store.job_applications || []).find((a) => Number(a.id) === Number(applicationId));
      if (!app) {
        const err = new Error("Application not found");
        err.status = 404;
        throw err;
      }
      assertCompanyAccess(store, app.company_id, user, "stage_update");
      saved = normalizeApplication({
        ...app,
        assigned_member_id: memberId == null ? null : Number(memberId),
        updated_at: new Date().toISOString(),
      });
      store.job_applications = store.job_applications.map((a) =>
        Number(a.id) === Number(applicationId) ? saved : a,
      );
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function matchResumeToJob(jobId, userId, resumeId) {
  const store = await readStore();
  const job = (store.jobs || []).find((j) => Number(j.id) === Number(jobId) && !j.deleted_at);
  if (!job) {
    const err = new Error("Job not found");
    err.status = 404;
    throw err;
  }
  const resume = await getResumeByIdForUser(resumeId, userId);
  if (!resume) {
    const err = new Error("Resume not found");
    err.status = 404;
    throw err;
  }
  return computeJobMatch(normalizeJob(job), resume);
}
