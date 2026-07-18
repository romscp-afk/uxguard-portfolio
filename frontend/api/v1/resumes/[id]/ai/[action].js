import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { assertCanEdit, getResumeByIdForUser } from "../../../../_lib/resume/service.js";
import {
  improveSummary,
  rewriteBullet,
  tailorResume,
  computeResumeMatch,
  getAiAssistStatus,
} from "../../../../_lib/resume/ai-assist.js";

function parseResumeId(req) {
  const raw = req.query?.id ?? req.query?.param;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  if (fromQuery != null && /^\d+$/.test(String(fromQuery))) return Number(fromQuery);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/resumes\/(\d+)\/ai\/([^/]+)(?:\/)?$/);
  return match ? Number(match[1]) : NaN;
}

function parseAction(req) {
  const raw = req.query?.action;
  if (raw) return Array.isArray(raw) ? raw[0] : raw;
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/resumes\/\d+\/ai\/([^/]+)(?:\/)?$/);
  return match ? match[1] : "";
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default withApi(async (req, res) => {
  if (req.method === "GET") {
    const user = await requireAuthUser(req, res);
    if (!user) return;
    res.status(200).json(getAiAssistStatus());
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  const id = parseResumeId(req);
  const action = parseAction(req);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ detail: "Invalid resume id" });
    return;
  }

  try {
    assertCanEdit(user);
    const resume = await getResumeByIdForUser(id, user.id);
    if (!resume) {
      res.status(404).json({ detail: "Resume not found" });
      return;
    }
    const body = await readBody(req);

    if (action === "improve-summary") {
      const result = await improveSummary({
        userId: user.id,
        resume,
        tone: body.tone || "professional",
      });
      res.status(200).json(result);
      return;
    }
    if (action === "rewrite-bullet") {
      if (!body.bullet) {
        res.status(400).json({ detail: "bullet is required" });
        return;
      }
      const result = await rewriteBullet({
        userId: user.id,
        resume,
        bullet: body.bullet,
        style: body.style || "achievement",
      });
      res.status(200).json(result);
      return;
    }
    if (action === "tailor") {
      const result = await tailorResume({
        userId: user.id,
        resume,
        jobDescription: body.job_description || "",
        targetCompany: body.target_company || "",
        targetRole: body.target_role || "",
      });
      res.status(200).json(result);
      return;
    }
    if (action === "match" || action === "quality-check") {
      // match does not require AI key
      const result = computeResumeMatch(resume, {
        jobDescription: body.job_description || "",
        targetRole: body.target_role || resume.target_role || "",
      });
      res.status(200).json(result);
      return;
    }

    res.status(404).json({ detail: "Unknown AI action" });
  } catch (err) {
    res.status(err.status || 500).json({
      detail: err.message || "AI request failed",
      code: err.code || undefined,
    });
  }
});
