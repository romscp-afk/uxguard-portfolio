import { recordCaseStudyView, viewerKeyFromRequest } from "../../_lib/analytics.js";
import { readStore } from "../../_lib/store.js";
import { withApi } from "../../_lib/withApi.js";

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
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
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  try {
    const body = await readBody(req);
    const caseStudyId = Number(body.case_study_id);
    if (!Number.isFinite(caseStudyId) || caseStudyId <= 0) {
      res.status(400).json({ detail: "case_study_id is required" });
      return;
    }

    const store = await readStore({ forceRefresh: true });
    const study = (store.caseStudies || []).find((cs) => Number(cs.id) === caseStudyId);
    if (!study || study.status !== "published") {
      res.status(404).json({ detail: "Case study not found" });
      return;
    }

    const authorId = Number(study.author_id);
    if (!Number.isFinite(authorId)) {
      res.status(400).json({ detail: "Case study has no author" });
      return;
    }

    const viewerKey = viewerKeyFromRequest(req, body.viewer_key);
    const result = await recordCaseStudyView({
      caseStudyId,
      authorId,
      viewerKey,
      path: body.path || null,
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("[analytics/views]", err);
    res.status(500).json({ detail: err?.message || "Could not record view." });
  }
});
