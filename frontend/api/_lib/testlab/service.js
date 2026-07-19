import { readStore, updateStore } from "../store.js";
import { assertCanAccessTestLab, assertProjectPermission, resolveProjectRole } from "./authz.js";
import { resolveExecutionProvider } from "./execution-provider.js";
import { generateTestsFromOpenApi, generateTestsFromRequirement, maybeEnrichWithAi } from "./generate.js";
import { executeRunPayload } from "./runner.js";
import {
  decodeSecret,
  encodeSecret,
  normalizeAuditEvent,
  normalizeDefect,
  normalizeMember,
  normalizeProject,
  normalizeRequirement,
  normalizeResult,
  normalizeRun,
  normalizeSchedule,
  normalizeSecret,
  normalizeTarget,
  normalizeTestCase,
} from "./schema.js";
import { assertUrlSafe } from "./url-safety.js";
import { buildChallenge, confirmChallenge } from "./verification.js";
import { baselineKey, normalizeBaseline } from "./visual.js";
import { createNotification } from "../community.js";
import { DEFAULT_VIEWPORTS } from "./runner.js";

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sameProjectId(a, b) {
  return String(a || "").trim() === String(b || "").trim();
}

function ensureCollections(store) {
  store.testlab_projects = store.testlab_projects || [];
  store.testlab_targets = store.testlab_targets || [];
  store.testlab_project_members = store.testlab_project_members || [];
  store.testlab_verification_challenges = store.testlab_verification_challenges || [];
  store.testlab_requirements = store.testlab_requirements || [];
  store.testlab_test_cases = store.testlab_test_cases || [];
  store.testlab_runs = store.testlab_runs || [];
  store.testlab_results = store.testlab_results || [];
  store.testlab_defects = store.testlab_defects || [];
  store.testlab_schedules = store.testlab_schedules || [];
  store.testlab_secrets = store.testlab_secrets || [];
  store.testlab_audit_events = store.testlab_audit_events || [];
  store.testlab_baselines = store.testlab_baselines || [];
  return store;
}

function audit(store, event) {
  store.testlab_audit_events.unshift(normalizeAuditEvent(event));
  store.testlab_audit_events = store.testlab_audit_events.slice(0, 2000);
}

function publicSecret(secret) {
  return {
    id: secret.id,
    project_id: secret.project_id,
    key: secret.key,
    created_by: secret.created_by,
    created_at: secret.created_at,
    updated_at: secret.updated_at,
    has_value: Boolean(secret.value_enc),
  };
}

function getProjectOrThrow(store, projectId) {
  const project = (store.testlab_projects || []).find(
    (p) => sameProjectId(p.id, projectId) && !p.deleted_at,
  );
  if (!project) throw httpError("TestLab project not found", 404);
  return project;
}

async function readProjectStore(forceRefresh = false) {
  return ensureCollections(await readStore({ forceRefresh }));
}

export function getExecutionCapabilities() {
  return resolveExecutionProvider().getCapabilities();
}

export async function listProjectsForUser(user) {
  assertCanAccessTestLab(user);
  const store = await readProjectStore(true);
  return (store.testlab_projects || [])
    .filter((p) => !p.deleted_at && resolveProjectRole(store, p.id, user))
    .map((p) => ({
      ...p,
      role: resolveProjectRole(store, p.id, user),
      target_count: (store.testlab_targets || []).filter((t) => sameProjectId(t.project_id, p.id))
        .length,
      test_count: (store.testlab_test_cases || []).filter(
        (t) => sameProjectId(t.project_id, p.id) && t.enabled !== false,
      ).length,
      open_defects: (store.testlab_defects || []).filter(
        (d) =>
          sameProjectId(d.project_id, p.id) && !["closed", "wont_fix"].includes(d.status),
      ).length,
    }))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

export async function createProject(user, payload) {
  assertCanAccessTestLab(user);
  if (!payload?.ownership_confirmed) {
    throw httpError("You must confirm you are authorized to test the target applications");
  }
  if (!String(payload?.name || "").trim()) throw httpError("Project name is required");

  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const project = normalizeProject(
        {
          ...payload,
          ownership_confirmed: true,
          owner_user_id: user.id,
        },
        user.id,
      );
      store.testlab_projects.push(project);
      store.testlab_project_members.push(
        normalizeMember(
          { user_id: user.id, email: user.email, role: "owner", invited_by: user.id },
          project.id,
        ),
      );
      audit(store, {
        project_id: project.id,
        actor_user_id: user.id,
        action: "project.create",
        meta: { name: project.name },
      });
      saved = project;
      return store;
    },
    { forceRefresh: true },
  );

  // Confirm the project is readable after Blob write (same race as resumes).
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const store = await readProjectStore(true);
      getProjectOrThrow(store, saved.id);
      return saved;
    } catch (err) {
      if (err?.status !== 404 || attempt === 3) {
        if (saved) return saved;
        throw err;
      }
      await sleep(100 * (attempt + 1));
    }
  }
  return saved;
}

export async function getProjectDetail(user, projectId) {
  assertCanAccessTestLab(user);
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const store = await readProjectStore(true);
      const project = getProjectOrThrow(store, projectId);
      const role = assertProjectPermission(store, projectId, user, "project_read");
      const targets = store.testlab_targets.filter((t) => sameProjectId(t.project_id, projectId));
      const members = store.testlab_project_members.filter((m) =>
        sameProjectId(m.project_id, projectId),
      );
      const requirements = store.testlab_requirements.filter((r) =>
        sameProjectId(r.project_id, projectId),
      );
      const tests = store.testlab_test_cases.filter((t) => sameProjectId(t.project_id, projectId));
      const runs = store.testlab_runs
        .filter((r) => sameProjectId(r.project_id, projectId))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 20);
      const defects = store.testlab_defects.filter((d) => sameProjectId(d.project_id, projectId));
      const schedules = store.testlab_schedules.filter((s) =>
        sameProjectId(s.project_id, projectId),
      );
      const secrets = store.testlab_secrets
        .filter((s) => sameProjectId(s.project_id, projectId))
        .map(publicSecret);
      const baselines = (store.testlab_baselines || []).filter((b) =>
        sameProjectId(b.project_id, projectId),
      );

      return {
        project: { ...project, role },
        targets,
        members,
        requirements,
        tests,
        runs,
        defects,
        schedules,
        secrets,
        baselines,
        execution: getExecutionCapabilities(),
        stats: {
          targets: targets.length,
          verified_targets: targets.filter((t) => t.verification_status === "verified").length,
          requirements: requirements.length,
          tests: tests.length,
          runs: store.testlab_runs.filter((r) => sameProjectId(r.project_id, projectId)).length,
          open_defects: defects.filter((d) => !["closed", "wont_fix"].includes(d.status)).length,
          baselines: baselines.length,
        },
      };
    } catch (err) {
      lastError = err;
      if (err?.status !== 404 || attempt === 3) throw err;
      await sleep(120 * (attempt + 1));
    }
  }
  throw lastError || httpError("TestLab project not found", 404);
}

export async function updateProject(user, projectId, payload) {
  assertCanAccessTestLab(user);
  try {
    return await writeProjectUpdate(user, projectId, payload);
  } catch (err) {
    if (err?.status !== 404) throw err;
    await sleep(120);
    return writeProjectUpdate(user, projectId, payload);
  }
}

async function writeProjectUpdate(user, projectId, payload) {
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "project_write");
      const idx = store.testlab_projects.findIndex(
        (p) => sameProjectId(p.id, projectId) && !p.deleted_at,
      );
      if (idx === -1) throw httpError("TestLab project not found", 404);
      const next = normalizeProject(
        {
          ...store.testlab_projects[idx],
          ...payload,
          id: projectId,
          owner_user_id: store.testlab_projects[idx].owner_user_id,
          updated_at: new Date().toISOString(),
        },
        store.testlab_projects[idx].owner_user_id,
      );
      if (payload?.status === "archived") next.archived_at = new Date().toISOString();
      store.testlab_projects[idx] = next;
      audit(store, {
        project_id: projectId,
        actor_user_id: user.id,
        action: "project.update",
        meta: { fields: Object.keys(payload || {}) },
      });
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function deleteProject(user, projectId) {
  assertCanAccessTestLab(user);
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "project_delete");
      const idx = store.testlab_projects.findIndex((p) => p.id === projectId);
      if (idx === -1) throw httpError("TestLab project not found", 404);
      store.testlab_projects[idx] = {
        ...store.testlab_projects[idx],
        status: "deleted",
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      audit(store, {
        project_id: projectId,
        actor_user_id: user.id,
        action: "project.delete",
      });
      return store;
    },
    { forceRefresh: true },
  );
  return { ok: true };
}

export async function addTarget(user, projectId, payload) {
  assertCanAccessTestLab(user);
  await assertUrlSafe(payload?.base_url);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "targets_manage");
      getProjectOrThrow(store, projectId);
      const target = normalizeTarget(
        {
          ...payload,
          verification_status: "unverified",
        },
        projectId,
      );
      store.testlab_targets.push(target);
      audit(store, {
        project_id: projectId,
        actor_user_id: user.id,
        action: "target.create",
        meta: { target_id: target.id, environment: target.environment },
      });
      saved = target;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function updateTarget(user, targetId, payload) {
  assertCanAccessTestLab(user);
  if (payload?.base_url) await assertUrlSafe(payload.base_url);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const idx = store.testlab_targets.findIndex((t) => t.id === targetId);
      if (idx === -1) throw httpError("Target not found", 404);
      const existing = store.testlab_targets[idx];
      assertProjectPermission(store, existing.project_id, user, "targets_manage");
      const next = normalizeTarget(
        {
          ...existing,
          ...payload,
          id: targetId,
          project_id: existing.project_id,
          updated_at: new Date().toISOString(),
          verification_status:
            payload?.base_url && payload.base_url !== existing.base_url
              ? "unverified"
              : existing.verification_status,
        },
        existing.project_id,
      );
      store.testlab_targets[idx] = next;
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function startVerification(user, targetId, method) {
  assertCanAccessTestLab(user);
  let challenge = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const target = store.testlab_targets.find((t) => t.id === targetId);
      if (!target) throw httpError("Target not found", 404);
      assertProjectPermission(store, target.project_id, user, "targets_manage");
      challenge = buildChallenge(target, method || "meta_tag");
      store.testlab_verification_challenges = store.testlab_verification_challenges.filter(
        (c) => c.target_id !== targetId || c.status !== "pending",
      );
      store.testlab_verification_challenges.push(challenge);
      const tIdx = store.testlab_targets.findIndex((t) => t.id === targetId);
      store.testlab_targets[tIdx] = {
        ...store.testlab_targets[tIdx],
        verification_status: "pending",
        verification_method: challenge.method,
        updated_at: new Date().toISOString(),
      };
      return store;
    },
    { forceRefresh: true },
  );
  return challenge;
}

export async function confirmVerification(user, targetId) {
  assertCanAccessTestLab(user);
  const store = ensureCollections(await readStore());
  const target = store.testlab_targets.find((t) => t.id === targetId);
  if (!target) throw httpError("Target not found", 404);
  assertProjectPermission(store, target.project_id, user, "targets_manage");
  const challenge = store.testlab_verification_challenges.find(
    (c) => c.target_id === targetId && c.status === "pending",
  );
  if (!challenge) throw httpError("No pending verification challenge", 400);

  await confirmChallenge(challenge, target);

  let saved = null;
  await updateStore(
    (s) => {
      ensureCollections(s);
      const tIdx = s.testlab_targets.findIndex((t) => t.id === targetId);
      const now = new Date().toISOString();
      s.testlab_targets[tIdx] = {
        ...s.testlab_targets[tIdx],
        verification_status: "verified",
        verified_at: now,
        verification_expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
        updated_at: now,
      };
      const cIdx = s.testlab_verification_challenges.findIndex((c) => c.id === challenge.id);
      if (cIdx >= 0) {
        s.testlab_verification_challenges[cIdx] = {
          ...s.testlab_verification_challenges[cIdx],
          status: "verified",
          verified_at: now,
        };
      }
      audit(s, {
        project_id: target.project_id,
        actor_user_id: user.id,
        action: "target.verify",
        meta: { target_id: targetId },
      });
      saved = s.testlab_targets[tIdx];
      return s;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function listMembers(user, projectId) {
  assertCanAccessTestLab(user);
  const store = ensureCollections(await readStore());
  assertProjectPermission(store, projectId, user, "project_read");
  return store.testlab_project_members.filter((m) => m.project_id === projectId);
}

export async function addMember(user, projectId, payload) {
  assertCanAccessTestLab(user);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "members_manage");
      const member = normalizeMember(
        {
          ...payload,
          invited_by: user.id,
          user_id: payload.user_id || 0,
        },
        projectId,
      );
      store.testlab_project_members.push(member);
      audit(store, {
        project_id: projectId,
        actor_user_id: user.id,
        action: "member.add",
        meta: { role: member.role, email: member.email },
      });
      saved = member;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function createRequirement(user, projectId, payload) {
  assertCanAccessTestLab(user);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "requirements_write");
      const req = normalizeRequirement(payload, projectId);
      store.testlab_requirements.push(req);
      saved = req;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function importRequirements(user, projectId, payload) {
  assertCanAccessTestLab(user);
  const text = String(payload?.text || payload?.content || "");
  if (!text.trim()) throw httpError("Import text is required");

  const chunks = text
    .split(/\n{2,}|\n(?=-\s|\*\s|\d+\.\s)/)
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 50);

  const created = [];
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "requirements_write");
      for (const chunk of chunks) {
        const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
        const req = normalizeRequirement(
          {
            title: lines[0].replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").slice(0, 120),
            description: lines.slice(1).join("\n") || lines[0],
            source: payload?.source || "import",
            acceptance_criteria: lines.slice(1),
          },
          projectId,
        );
        store.testlab_requirements.push(req);
        created.push(req);
      }
      return store;
    },
    { forceRefresh: true },
  );
  return { created, count: created.length };
}

export async function generateTests(user, projectId, payload) {
  assertCanAccessTestLab(user);
  const store = ensureCollections(await readStore());
  assertProjectPermission(store, projectId, user, "tests_write");

  let generated = [];
  if (payload?.openapi) {
    generated = generateTestsFromOpenApi(payload.openapi, projectId);
  } else {
    const requirementIds = payload?.requirement_ids || [];
    const requirements = store.testlab_requirements.filter(
      (r) =>
        sameProjectId(r.project_id, projectId) &&
        (requirementIds.length ? requirementIds.includes(r.id) : true),
    );
    if (!requirements.length) throw httpError("No requirements found to generate from");
    for (const req of requirements) {
      let tests = generateTestsFromRequirement(req, projectId);
      if (payload?.use_ai !== false) {
        tests = await maybeEnrichWithAi(req, projectId, tests);
      }
      generated.push(...tests);
    }
  }

  const saved = [];
  await updateStore(
    (s) => {
      ensureCollections(s);
      assertProjectPermission(s, projectId, user, "tests_write");
      for (const tc of generated) {
        s.testlab_test_cases.push(tc);
        saved.push(tc);
      }
      audit(s, {
        project_id: projectId,
        actor_user_id: user.id,
        action: "tests.generate",
        meta: { count: saved.length, ai: Boolean(process.env.OPENAI_API_KEY) },
      });
      return s;
    },
    { forceRefresh: true },
  );
  return { tests: saved, count: saved.length };
}

export async function createTestCase(user, projectId, payload) {
  assertCanAccessTestLab(user);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "tests_write");
      const tc = normalizeTestCase({ ...payload, generated_by: payload?.generated_by || "manual" }, projectId);
      store.testlab_test_cases.push(tc);
      saved = tc;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function updateTestCase(user, testId, payload) {
  assertCanAccessTestLab(user);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const idx = store.testlab_test_cases.findIndex((t) => t.id === testId);
      if (idx === -1) throw httpError("Test case not found", 404);
      const existing = store.testlab_test_cases[idx];
      assertProjectPermission(store, existing.project_id, user, "tests_write");
      const next = normalizeTestCase(
        { ...existing, ...payload, id: testId, project_id: existing.project_id, updated_at: new Date().toISOString() },
        existing.project_id,
      );
      store.testlab_test_cases[idx] = next;
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function deleteTestCase(user, testId) {
  assertCanAccessTestLab(user);
  await updateStore(
    (store) => {
      ensureCollections(store);
      const idx = store.testlab_test_cases.findIndex((t) => t.id === testId);
      if (idx === -1) throw httpError("Test case not found", 404);
      assertProjectPermission(store, store.testlab_test_cases[idx].project_id, user, "tests_write");
      store.testlab_test_cases.splice(idx, 1);
      return store;
    },
    { forceRefresh: true },
  );
  return { ok: true };
}

export async function getTraceability(user, projectId) {
  assertCanAccessTestLab(user);
  const store = ensureCollections(await readStore());
  assertProjectPermission(store, projectId, user, "project_read");
  const requirements = store.testlab_requirements.filter((r) =>
    sameProjectId(r.project_id, projectId),
  );
  const tests = store.testlab_test_cases.filter((t) => sameProjectId(t.project_id, projectId));
  return {
    matrix: requirements.map((req) => ({
      requirement: req,
      tests: tests.filter((t) => (t.requirement_ids || []).includes(req.id)),
    })),
    uncovered_requirements: requirements.filter(
      (req) => !tests.some((t) => (t.requirement_ids || []).includes(req.id)),
    ),
    orphan_tests: tests.filter((t) => !(t.requirement_ids || []).length),
  };
}

async function maybeInlineExecute(runId) {
  const caps = getExecutionCapabilities();
  if (!caps.inline || !caps.configured) return null;
  // Must await on serverless — fire-and-forget setTimeout is killed after the response.
  try {
    return await processQueuedRun(runId);
  } catch (err) {
    console.error("[testlab] inline run failed", runId, err.message);
    return null;
  }
}

export async function createRun(user, projectId, payload) {
  assertCanAccessTestLab(user);
  const provider = resolveExecutionProvider();
  if (!provider.getCapabilities().configured) {
    await provider.enqueueRun();
  }

  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "runs_trigger");
      const target = store.testlab_targets.find(
        (t) => sameProjectId(t.id, payload?.target_id) && sameProjectId(t.project_id, projectId),
      );
      if (!target) throw httpError("Target not found", 404);
      if (target.verification_status !== "verified" && target.environment === "production") {
        throw httpError("Production targets must be verified before running tests");
      }

      let testIds = payload?.test_case_ids || [];
      if (!testIds.length) {
        testIds = store.testlab_test_cases
          .filter((t) => sameProjectId(t.project_id, projectId) && t.enabled !== false)
          .map((t) => t.id);
      }
      if (!testIds.length) throw httpError("No test cases to run");

      const run = normalizeRun(
        {
          ...payload,
          test_case_ids: testIds,
          target_id: target.id,
          status: "queued",
          triggered_by: user.id,
          viewports: payload?.viewports?.length
            ? payload.viewports
            : payload?.options?.responsive
              ? [DEFAULT_VIEWPORTS.desktop, DEFAULT_VIEWPORTS.tablet, DEFAULT_VIEWPORTS.mobile]
              : undefined,
          options: {
            accessibility: Boolean(payload?.options?.accessibility),
            performance: Boolean(payload?.options?.performance),
            broken_links: Boolean(payload?.options?.broken_links),
            visual: Boolean(payload?.options?.visual),
            responsive: Boolean(payload?.options?.responsive),
            authenticated: Boolean(payload?.options?.authenticated),
            ...(payload?.options && typeof payload.options === "object" ? payload.options : {}),
          },
        },
        projectId,
      );
      store.testlab_runs.unshift(run);
      audit(store, {
        project_id: projectId,
        actor_user_id: user.id,
        action: "run.create",
        meta: { run_id: run.id, tests: testIds.length },
      });
      saved = run;
      return store;
    },
    { forceRefresh: true },
  );

  const processed = await maybeInlineExecute(saved.id);
  return {
    run: processed || saved,
    execution: provider.getCapabilities(),
  };
}

export async function cancelRun(user, runId) {
  assertCanAccessTestLab(user);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const idx = store.testlab_runs.findIndex((r) => r.id === runId);
      if (idx === -1) throw httpError("Run not found", 404);
      const run = store.testlab_runs[idx];
      assertProjectPermission(store, run.project_id, user, "runs_cancel");
      if (["passed", "failed", "cancelled", "error", "timed_out"].includes(run.status)) {
        throw httpError("Run is already finished");
      }
      const next = {
        ...run,
        cancel_requested: true,
        status: run.status === "queued" ? "cancelled" : run.status,
        finished_at: run.status === "queued" ? new Date().toISOString() : run.finished_at,
        updated_at: new Date().toISOString(),
      };
      store.testlab_runs[idx] = next;
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function getRun(user, runId) {
  assertCanAccessTestLab(user);
  const store = ensureCollections(await readStore());
  const run = store.testlab_runs.find((r) => r.id === runId);
  if (!run) throw httpError("Run not found", 404);
  assertProjectPermission(store, run.project_id, user, "project_read");
  const results = store.testlab_results.filter((r) => r.run_id === runId);
  return { run, results };
}

export async function processQueuedRun(runId, options = {}) {
  const workerId = options.workerId || `worker_${Date.now().toString(36)}`;
  let claimed = null;
  let target = null;
  let testCases = [];
  let secrets = {};
  let baselines = [];

  await updateStore(
    (store) => {
      ensureCollections(store);
      const idx = store.testlab_runs.findIndex((r) => r.id === runId);
      if (idx === -1) throw httpError("Run not found", 404);
      const run = store.testlab_runs[idx];
      if (run.cancel_requested || run.status === "cancelled") {
        store.testlab_runs[idx] = {
          ...run,
          status: "cancelled",
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        claimed = store.testlab_runs[idx];
        return store;
      }
      if (run.status !== "queued" && run.status !== "running") {
        claimed = run;
        return store;
      }
      target = store.testlab_targets.find((t) => t.id === run.target_id);
      if (!target) throw httpError("Target missing for run", 400);
      testCases = store.testlab_test_cases.filter((t) => run.test_case_ids.includes(t.id));
      for (const sec of store.testlab_secrets.filter((s) => s.project_id === run.project_id)) {
        secrets[sec.key] = decodeSecret(sec.value_enc);
      }
      baselines = (store.testlab_baselines || []).filter((b) => b.project_id === run.project_id);
      store.testlab_runs[idx] = {
        ...run,
        status: "running",
        started_at: run.started_at || new Date().toISOString(),
        worker_id: workerId,
        updated_at: new Date().toISOString(),
      };
      claimed = store.testlab_runs[idx];
      return store;
    },
    { forceRefresh: true },
  );

  if (!claimed || claimed.status === "cancelled" || claimed.status !== "running") {
    return claimed;
  }

  const cancelCache = { at: 0, value: false };
  async function refreshCancel() {
    const now = Date.now();
    if (now - cancelCache.at < 800) return cancelCache.value;
    cancelCache.at = now;
    try {
      const s = ensureCollections(await readStore({ forceRefresh: true }));
      const live = s.testlab_runs.find((r) => r.id === runId);
      cancelCache.value = Boolean(live?.cancel_requested);
    } catch {
      /* keep last */
    }
    return cancelCache.value;
  }

  let outcome;
  try {
    outcome = await executeRunPayload({
      run: claimed,
      target,
      testCases,
      secrets,
      baselines,
      shouldCancel: () => {
        void refreshCancel();
        return cancelCache.value;
      },
      onProgress: async () => {
        await refreshCancel();
      },
    });
  } catch (err) {
    outcome = {
      results: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 1 },
      status: "error",
      error_message: err.message,
      baselineUpdates: [],
    };
  }

  if (await refreshCancel()) {
    outcome.status = "cancelled";
  }

  await updateStore(
    (store) => {
      ensureCollections(store);
      const idx = store.testlab_runs.findIndex((r) => r.id === runId);
      if (idx === -1) return store;
      store.testlab_results = store.testlab_results.filter((r) => r.run_id !== runId);
      for (const result of outcome.results || []) {
        store.testlab_results.push(normalizeResult(result, runId));
      }
      for (const baseline of outcome.baselineUpdates || []) {
        const key = baselineKey(baseline.test_case_id, baseline.browser, baseline.viewport_name);
        const bIdx = store.testlab_baselines.findIndex(
          (b) => baselineKey(b.test_case_id, b.browser, b.viewport_name) === key,
        );
        const next = normalizeBaseline({ ...baseline, project_id: claimed.project_id });
        if (bIdx >= 0) store.testlab_baselines[bIdx] = { ...store.testlab_baselines[bIdx], ...next };
        else store.testlab_baselines.push(next);
      }
      store.testlab_runs[idx] = {
        ...store.testlab_runs[idx],
        status: outcome.status,
        summary: outcome.summary,
        error_message: outcome.error_message || null,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      for (const result of outcome.results || []) {
        if (result.status !== "failed") continue;
        const already = store.testlab_defects.some(
          (d) =>
            d.run_id === runId &&
            d.test_case_id === result.test_case_id &&
            !["closed", "wont_fix"].includes(d.status),
        );
        if (already) continue;
        const tc = testCases.find((t) => t.id === result.test_case_id);
        store.testlab_defects.push(
          normalizeDefect(
            {
              title: `Failed: ${tc?.title || result.test_case_id}`,
              description: result.error_message || "Test failed",
              severity: tc?.priority === "critical" ? "critical" : "high",
              test_case_id: result.test_case_id,
              run_id: runId,
              result_id: result.id,
              created_by: claimed.triggered_by,
            },
            claimed.project_id,
          ),
        );
      }
      return store;
    },
    { forceRefresh: true },
  );

  if (claimed.triggered_by) {
    try {
      await createNotification({
        userId: claimed.triggered_by,
        type: "testlab_run",
        title: `TestLab run ${outcome.status}`,
        message: `Run ${runId} finished with status ${outcome.status} (${outcome.summary?.passed || 0} passed / ${outcome.summary?.failed || 0} failed).`,
        link: `/admin/testlab/${claimed.project_id}`,
      });
    } catch (err) {
      console.warn("[testlab] notification failed", err.message);
    }
  }

  const storeAfter = ensureCollections(await readStore());
  return storeAfter.testlab_runs.find((r) => r.id === runId) || claimed;
}

export async function claimAndProcessNextRun(options = {}) {
  // Materialize due schedules into queued runs (best-effort cron match: hour+dow)
  await materializeDueSchedules();

  const store = ensureCollections(await readStore());
  const next = (store.testlab_runs || []).find((r) => r.status === "queued" && !r.cancel_requested);
  if (!next) return null;
  return processQueuedRun(next.id, options);
}

async function materializeDueSchedules() {
  const now = new Date();
  const hour = now.getUTCHours();
  const dow = now.getUTCDay(); // 0 Sun
  await updateStore(
    (store) => {
      ensureCollections(store);
      for (const schedule of store.testlab_schedules || []) {
        if (!schedule.enabled) continue;
        // Support simple "0 H * * 1-5" style
        const parts = String(schedule.cron || "").split(/\s+/);
        if (parts.length < 5) continue;
        const cronHour = Number(parts[1]);
        const dowPart = parts[4];
        if (Number.isFinite(cronHour) && cronHour !== hour) continue;
        if (dowPart.includes("-")) {
          const [a, b] = dowPart.split("-").map(Number);
          if (dow < a || dow > b) continue;
        } else if (dowPart !== "*" && Number(dowPart) !== dow) {
          continue;
        }
        const last = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
        if (last && now.getTime() - last.getTime() < 50 * 60 * 1000) continue;

        const run = normalizeRun(
          {
            target_id: schedule.target_id,
            test_case_ids: schedule.test_case_ids,
            browsers: schedule.browsers,
            triggered_by: 0,
            status: "queued",
          },
          schedule.project_id,
        );
        store.testlab_runs.unshift(run);
        const idx = store.testlab_schedules.findIndex((s) => s.id === schedule.id);
        if (idx >= 0) {
          store.testlab_schedules[idx] = {
            ...store.testlab_schedules[idx],
            last_run_at: now.toISOString(),
            updated_at: now.toISOString(),
          };
        }
      }
      return store;
    },
    { forceRefresh: true },
  );
}

export async function upsertSecret(user, projectId, payload) {
  assertCanAccessTestLab(user);
  if (!payload?.key || !payload?.value) throw httpError("Secret key and value are required");
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "secrets_manage");
      const key = String(payload.key).toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      const idx = store.testlab_secrets.findIndex((s) => s.project_id === projectId && s.key === key);
      const secret = normalizeSecret(
        {
          ...(idx >= 0 ? store.testlab_secrets[idx] : {}),
          key,
          value_enc: encodeSecret(payload.value),
          created_by: user.id,
          updated_at: new Date().toISOString(),
        },
        projectId,
      );
      if (idx >= 0) store.testlab_secrets[idx] = secret;
      else store.testlab_secrets.push(secret);
      audit(store, {
        project_id: projectId,
        actor_user_id: user.id,
        action: "secret.upsert",
        meta: { key },
      });
      saved = publicSecret(secret);
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function createDefect(user, projectId, payload) {
  assertCanAccessTestLab(user);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "defects_write");
      const defect = normalizeDefect({ ...payload, created_by: user.id }, projectId);
      store.testlab_defects.push(defect);
      saved = defect;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function updateDefect(user, defectId, payload) {
  assertCanAccessTestLab(user);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const idx = store.testlab_defects.findIndex((d) => d.id === defectId);
      if (idx === -1) throw httpError("Defect not found", 404);
      const existing = store.testlab_defects[idx];
      assertProjectPermission(store, existing.project_id, user, "defects_write");
      const next = normalizeDefect(
        { ...existing, ...payload, id: defectId, project_id: existing.project_id, updated_at: new Date().toISOString() },
        existing.project_id,
      );
      store.testlab_defects[idx] = next;
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function retestDefect(user, defectId) {
  assertCanAccessTestLab(user);
  const store = ensureCollections(await readStore());
  const defect = store.testlab_defects.find((d) => d.id === defectId);
  if (!defect) throw httpError("Defect not found", 404);
  assertProjectPermission(store, defect.project_id, user, "runs_trigger");
  if (!defect.test_case_id) throw httpError("Defect has no linked test case");

  const target =
    store.testlab_targets.find((t) => t.project_id === defect.project_id && t.verification_status === "verified") ||
    store.testlab_targets.find((t) => t.project_id === defect.project_id);
  if (!target) throw httpError("No target available for retest");

  const { run } = await createRun(user, defect.project_id, {
    target_id: target.id,
    test_case_ids: [defect.test_case_id],
  });

  await updateDefect(user, defectId, { status: "retest", retest_run_id: run.id });
  return { run, defect_id: defectId };
}

export async function createSchedule(user, projectId, payload) {
  assertCanAccessTestLab(user);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "schedules_manage");
      const schedule = normalizeSchedule(payload, projectId);
      store.testlab_schedules.push(schedule);
      saved = schedule;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function updateSchedule(user, scheduleId, payload) {
  assertCanAccessTestLab(user);
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const idx = store.testlab_schedules.findIndex((s) => s.id === scheduleId);
      if (idx === -1) throw httpError("Schedule not found", 404);
      const existing = store.testlab_schedules[idx];
      assertProjectPermission(store, existing.project_id, user, "schedules_manage");
      const next = normalizeSchedule(
        { ...existing, ...payload, id: scheduleId, project_id: existing.project_id, updated_at: new Date().toISOString() },
        existing.project_id,
      );
      store.testlab_schedules[idx] = next;
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function getReport(user, projectId) {
  assertCanAccessTestLab(user);
  const store = ensureCollections(await readStore());
  assertProjectPermission(store, projectId, user, "reports_read");
  const runs = store.testlab_runs.filter((r) => r.project_id === projectId);
  const results = store.testlab_results.filter((r) => runs.some((run) => run.id === r.run_id));
  const defects = store.testlab_defects.filter((d) => d.project_id === projectId);
  const tests = store.testlab_test_cases.filter((t) => t.project_id === projectId);
  const requirements = store.testlab_requirements.filter((r) => r.project_id === projectId);

  const last10 = runs.slice(0, 10);
  return {
    executive: {
      total_runs: runs.length,
      pass_rate:
        results.length === 0
          ? null
          : Math.round((results.filter((r) => r.status === "passed").length / results.length) * 100),
      open_defects: defects.filter((d) => !["closed", "wont_fix"].includes(d.status)).length,
      coverage:
        requirements.length === 0
          ? null
          : Math.round(
              (requirements.filter((req) =>
                tests.some((t) => (t.requirement_ids || []).includes(req.id)),
              ).length /
                requirements.length) *
                100,
            ),
    },
    technical: {
      recent_runs: last10,
      failing_tests: results
        .filter((r) => r.status === "failed")
        .slice(0, 20)
        .map((r) => ({
          ...r,
          test_title: tests.find((t) => t.id === r.test_case_id)?.title,
        })),
      accessibility_hotspots: results
        .filter((r) => (r.accessibility?.violations || []).length)
        .slice(0, 10),
    },
  };
}

export async function saveRecorderDraft(user, projectId, payload) {
  // Workflow recorder stores a draft test case from recorded steps
  return createTestCase(user, projectId, {
    title: payload?.title || "Recorded workflow",
    description: payload?.description || "Created from TestLab recorder",
    type: "e2e",
    generated_by: "recorder",
    steps: payload?.steps || [],
  });
}

export async function listBaselines(user, projectId) {
  assertCanAccessTestLab(user);
  const store = ensureCollections(await readStore());
  assertProjectPermission(store, projectId, user, "project_read");
  return (store.testlab_baselines || []).filter((b) => b.project_id === projectId);
}

export async function acceptBaseline(user, projectId, payload) {
  assertCanAccessTestLab(user);
  if (!payload?.test_case_id || !payload?.data_url) {
    throw httpError("test_case_id and data_url are required");
  }
  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      assertProjectPermission(store, projectId, user, "tests_write");
      const baseline = normalizeBaseline({
        ...payload,
        project_id: projectId,
        browser: payload.browser || "chromium",
        viewport_name: payload.viewport_name || "desktop",
        updated_at: new Date().toISOString(),
      });
      const key = baselineKey(baseline.test_case_id, baseline.browser, baseline.viewport_name);
      const idx = store.testlab_baselines.findIndex(
        (b) => baselineKey(b.test_case_id, b.browser, b.viewport_name) === key,
      );
      if (idx >= 0) store.testlab_baselines[idx] = { ...store.testlab_baselines[idx], ...baseline };
      else store.testlab_baselines.push(baseline);
      saved = idx >= 0 ? store.testlab_baselines[idx] : baseline;
      audit(store, {
        project_id: projectId,
        actor_user_id: user.id,
        action: "baseline.accept",
        meta: { key },
      });
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

/** CI/CD entrypoint: queue a run from an external pipeline. */
export async function triggerCiRun(user, projectId, payload) {
  assertCanAccessTestLab(user);
  const store = ensureCollections(await readStore());
  assertProjectPermission(store, projectId, user, "runs_trigger");

  const target =
    (payload?.target_id &&
      store.testlab_targets.find((t) => t.id === payload.target_id && t.project_id === projectId)) ||
    store.testlab_targets.find(
      (t) => t.project_id === projectId && t.verification_status === "verified",
    ) ||
    store.testlab_targets.find((t) => t.project_id === projectId);

  if (!target) throw httpError("No target available for CI run");

  return createRun(user, projectId, {
    target_id: target.id,
    test_case_ids: payload?.test_case_ids,
    browsers: payload?.browsers || ["chromium"],
    options: {
      accessibility: true,
      visual: Boolean(payload?.visual),
      responsive: Boolean(payload?.responsive),
      broken_links: Boolean(payload?.broken_links),
      performance: Boolean(payload?.performance),
      authenticated: Boolean(payload?.authenticated),
      ci: true,
      commit_sha: payload?.commit_sha || null,
      branch: payload?.branch || null,
    },
  });
}
