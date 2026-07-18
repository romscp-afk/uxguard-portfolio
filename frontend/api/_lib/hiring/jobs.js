import { readStore, updateStore } from "../store.js";
import { assertCanEdit } from "../projects.js";
import { trackHiringEvent } from "./analytics.js";
import { assertCompanyAccess } from "./authz.js";
import {
  emptyJob,
  normalizeJob,
  normalizeJobReport,
  normalizeSavedJob,
  publicJobView,
  validateSalary,
} from "./schema.js";
import { publicCompanyView } from "./schema.js";

function nextId(list) {
  return (list || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function companyById(store, companyId) {
  return (store.companies || []).find((c) => Number(c.id) === Number(companyId) && !c.deleted_at);
}

export async function createJob(companyId, user, payload = {}) {
  assertCanEdit(user);
  let saved = null;
  await updateStore(
    (store) => {
      assertCompanyAccess(store, companyId, user, "job_create");
      if (!store.jobs) store.jobs = [];
      const company = companyById(store, companyId);
      if (!company) {
        const err = new Error("Company not found");
        err.status = 404;
        throw err;
      }
      const id = nextId(store.jobs);
      const job = normalizeJob({
        ...emptyJob(companyId, user.id),
        ...payload,
        id,
        company_id: Number(companyId),
        created_by: user.id,
        status: "draft",
      });
      const salaryError = validateSalary(job.salary);
      if (salaryError) {
        const err = new Error(salaryError);
        err.status = 400;
        throw err;
      }
      store.jobs.push(job);
      saved = job;
      return store;
    },
    { forceRefresh: true },
  );
  await trackHiringEvent("job_draft_created", user.id, {
    job_id: saved.id,
    company_id: Number(companyId),
  });
  return saved;
}

export async function updateJob(jobId, user, payload = {}) {
  assertCanEdit(user);
  let saved = null;
  await updateStore(
    (store) => {
      const existing = (store.jobs || []).find(
        (j) => Number(j.id) === Number(jobId) && !j.deleted_at,
      );
      if (!existing) {
        const err = new Error("Job not found");
        err.status = 404;
        throw err;
      }
      assertCompanyAccess(store, existing.company_id, user, "job_create");
      const next = normalizeJob({
        ...existing,
        ...payload,
        id: existing.id,
        company_id: existing.company_id,
        created_by: existing.created_by,
        created_at: existing.created_at,
        updated_at: new Date().toISOString(),
        revision: Number(existing.revision || 1) + (payload.status ? 0 : 1),
      });
      const salaryError = validateSalary(next.salary);
      if (salaryError) {
        const err = new Error(salaryError);
        err.status = 400;
        throw err;
      }
      // Major edits to published jobs may require re-review
      if (
        existing.status === "published" &&
        (payload.description || payload.title || payload.required_skills) &&
        !payload.status
      ) {
        next.status = "pending_review";
        next.revision = Number(existing.revision || 1) + 1;
      }
      store.jobs = store.jobs.map((j) => (Number(j.id) === Number(jobId) ? next : j));
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function transitionJob(jobId, user, action, extra = {}) {
  assertCanEdit(user);
  const map = {
    publish: "published",
    submit_review: "pending_review",
    schedule: "scheduled",
    pause: "paused",
    close: "closed",
    archive: "archived",
    reopen: "published",
  };
  const status = map[action];
  if (!status) {
    const err = new Error("Unknown job action");
    err.status = 400;
    throw err;
  }
  let saved = null;
  await updateStore(
    (store) => {
      const existing = (store.jobs || []).find(
        (j) => Number(j.id) === Number(jobId) && !j.deleted_at,
      );
      if (!existing) {
        const err = new Error("Job not found");
        err.status = 404;
        throw err;
      }
      const needPublishPerm = ["publish", "submit_review", "schedule", "pause", "close"].includes(
        action,
      );
      assertCompanyAccess(
        store,
        existing.company_id,
        user,
        needPublishPerm ? "job_publish" : "job_create",
      );
      const company = companyById(store, existing.company_id);
      if (action === "publish" && company?.verification_status !== "verified") {
        const err = new Error(
          company?.verification_status === "suspended"
            ? "Suspended companies cannot publish jobs"
            : "Your company must be approved by a UXGuard admin before you can publish jobs.",
        );
        err.status = 403;
        err.code = "EMPLOYER_NOT_VERIFIED";
        throw err;
      }
      if (action === "publish" && !existing.title) {
        const err = new Error("Job title is required before publishing");
        err.status = 400;
        throw err;
      }
      const now = new Date().toISOString();
      const next = normalizeJob({
        ...existing,
        status,
        published_at:
          status === "published" ? existing.published_at || now : existing.published_at,
        closed_at: status === "closed" ? now : existing.closed_at,
        scheduled_at: status === "scheduled" ? extra.scheduled_at || now : existing.scheduled_at,
        updated_at: now,
        revision: Number(existing.revision || 1) + 1,
      });
      // Keep revision history lightly on the job
      if (!store.job_revisions) store.job_revisions = [];
      store.job_revisions.push({
        id: nextId(store.job_revisions),
        job_id: existing.id,
        snapshot: existing,
        changed_by: user.id,
        action,
        created_at: now,
      });
      store.jobs = store.jobs.map((j) => (Number(j.id) === Number(jobId) ? next : j));
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  if (action === "publish") {
    await trackHiringEvent("job_published", user.id, { job_id: Number(jobId) });
  }
  if (action === "close") {
    await trackHiringEvent("job_closed", user.id, { job_id: Number(jobId) });
  }
  return saved;
}

export async function getJobForEmployer(jobId, user) {
  const store = await readStore();
  const job = (store.jobs || []).find((j) => Number(j.id) === Number(jobId) && !j.deleted_at);
  if (!job) return null;
  assertCompanyAccess(store, job.company_id, user, "job_create");
  return normalizeJob(job);
}

export async function listCompanyJobs(companyId, user) {
  const store = await readStore();
  assertCompanyAccess(store, companyId, user, "job_create");
  return (store.jobs || [])
    .filter((j) => Number(j.company_id) === Number(companyId) && !j.deleted_at)
    .map(normalizeJob)
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

export async function getPublicJob(jobId, viewerUserId = null) {
  const store = await readStore();
  const job = (store.jobs || []).find((j) => Number(j.id) === Number(jobId) && !j.deleted_at);
  if (!job) return null;
  const company = companyById(store, job.company_id);
  const view = publicJobView(normalizeJob(job), company);
  if (viewerUserId) {
    view.saved = (store.saved_jobs || []).some(
      (s) => Number(s.user_id) === Number(viewerUserId) && Number(s.job_id) === Number(jobId),
    );
  }
  return view;
}

export async function searchJobs(query = {}, viewerUserId = null) {
  const store = await readStore();
  let jobs = (store.jobs || [])
    .filter((j) => !j.deleted_at)
    .filter((j) => j.status === "published")
    .map(normalizeJob);

  // Expire by deadline
  const now = Date.now();
  jobs = jobs.filter((j) => {
    if (!j.deadline) return true;
    const due = Date.parse(j.deadline);
    return !Number.isFinite(due) || due >= now;
  });

  const q = String(query.q || query.keyword || "").toLowerCase().trim();
  if (q) {
    jobs = jobs.filter((j) => {
      const company = companyById(store, j.company_id);
      const hay = [
        j.title,
        j.summary,
        j.description,
        j.department,
        ...(j.required_skills || []),
        company?.display_name,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
  if (query.employment_type) {
    jobs = jobs.filter((j) => j.employment_type === query.employment_type);
  }
  if (query.workplace_type) {
    jobs = jobs.filter(
      (j) => j.workplace_type === query.workplace_type || j.location?.workplace_type === query.workplace_type,
    );
  }
  if (query.experience_level) {
    jobs = jobs.filter((j) => j.experience_level === query.experience_level);
  }
  if (query.location) {
    const loc = String(query.location).toLowerCase();
    jobs = jobs.filter((j) =>
      [j.city, j.country, j.location?.city, j.location?.country].join(" ").toLowerCase().includes(loc),
    );
  }
  if (query.verified_only === "1" || query.verified_only === true) {
    jobs = jobs.filter((j) => companyById(store, j.company_id)?.verification_status === "verified");
  }
  if (query.visa_sponsorship === "1" || query.visa_sponsorship === true) {
    jobs = jobs.filter((j) => j.visa_sponsorship);
  }
  if (query.skills) {
    const skills = String(query.skills)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    jobs = jobs.filter((j) =>
      skills.every((s) =>
        [...(j.required_skills || []), ...(j.preferred_skills || [])]
          .join(" ")
          .toLowerCase()
          .includes(s),
      ),
    );
  }

  const sort = query.sort || "newest";
  if (sort === "deadline") {
    jobs.sort((a, b) => String(a.deadline || "9999").localeCompare(String(b.deadline || "9999")));
  } else if (sort === "salary") {
    jobs.sort((a, b) => Number(b.salary?.max || 0) - Number(a.salary?.max || 0));
  } else {
    jobs.sort((a, b) => String(b.published_at || b.created_at).localeCompare(String(a.published_at || a.created_at)));
  }

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.page_size) || 20));
  const start = (page - 1) * pageSize;
  const slice = jobs.slice(start, start + pageSize);
  const savedSet = new Set(
    viewerUserId
      ? (store.saved_jobs || [])
          .filter((s) => Number(s.user_id) === Number(viewerUserId))
          .map((s) => Number(s.job_id))
      : [],
  );

  const results = slice.map((job) => {
    const company = companyById(store, job.company_id);
    return {
      id: job.id,
      title: job.title,
      company: publicCompanyView(company),
      verification_status: company?.verification_status,
      location: job.location,
      city: job.city,
      country: job.country,
      workplace_type: job.workplace_type,
      employment_type: job.employment_type,
      experience_level: job.experience_level,
      salary: job.salary?.visible ? job.salary : { visible: false },
      published_at: job.published_at,
      deadline: job.deadline,
      visa_sponsorship: job.visa_sponsorship,
      saved: savedSet.has(Number(job.id)),
    };
  });

  await trackHiringEvent("job_search_completed", viewerUserId, {
    result_count: results.length,
    page,
  });

  return {
    jobs: results,
    total: jobs.length,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(jobs.length / pageSize)),
  };
}

export async function saveJob(jobId, userId) {
  let saved = null;
  await updateStore(
    (store) => {
      if (!store.saved_jobs) store.saved_jobs = [];
      const job = (store.jobs || []).find((j) => Number(j.id) === Number(jobId) && !j.deleted_at);
      if (!job || job.status !== "published") {
        const err = new Error("Job not available");
        err.status = 404;
        throw err;
      }
      const existing = store.saved_jobs.find(
        (s) => Number(s.user_id) === Number(userId) && Number(s.job_id) === Number(jobId),
      );
      if (existing) {
        saved = normalizeSavedJob(existing);
        return store;
      }
      saved = normalizeSavedJob({
        id: nextId(store.saved_jobs),
        user_id: userId,
        job_id: jobId,
      });
      store.saved_jobs.push(saved);
      return store;
    },
    { forceRefresh: true },
  );
  await trackHiringEvent("job_saved", userId, { job_id: Number(jobId) });
  return saved;
}

export async function unsaveJob(jobId, userId) {
  await updateStore(
    (store) => {
      store.saved_jobs = (store.saved_jobs || []).filter(
        (s) => !(Number(s.user_id) === Number(userId) && Number(s.job_id) === Number(jobId)),
      );
      return store;
    },
    { forceRefresh: true },
  );
  return { ok: true };
}

export async function listSavedJobs(userId) {
  const store = await readStore();
  const ids = (store.saved_jobs || [])
    .filter((s) => Number(s.user_id) === Number(userId))
    .map((s) => Number(s.job_id));
  return (store.jobs || [])
    .filter((j) => ids.includes(Number(j.id)) && !j.deleted_at)
    .map((j) => {
      const company = companyById(store, j.company_id);
      return { ...publicJobView(normalizeJob(j), company), saved: true };
    });
}

export async function reportJob(jobId, user, payload = {}) {
  let report = null;
  await updateStore(
    (store) => {
      if (!store.job_reports) store.job_reports = [];
      const job = (store.jobs || []).find((j) => Number(j.id) === Number(jobId));
      if (!job) {
        const err = new Error("Job not found");
        err.status = 404;
        throw err;
      }
      report = normalizeJobReport({
        id: nextId(store.job_reports),
        job_id: jobId,
        reported_by: user.id,
        reason: payload.reason || "other",
        description: payload.description || "",
        status: "open",
      });
      store.job_reports.push(report);
      return store;
    },
    { forceRefresh: true },
  );
  await trackHiringEvent("job_reported", user.id, { job_id: Number(jobId) });
  return report;
}
