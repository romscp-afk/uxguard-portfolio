import { createCaseStudy, listCaseStudies, toListItem } from "../../_lib/demo-data.js";
import { notifyNewPublication } from "../../_lib/community.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { assertCanEdit } from "../../_lib/projects.js";
import { assertCanCreateCaseStudy, syncCaseStudyUsage } from "../../_lib/billing/entitlements.js";
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
  if (req.method === "GET") {
    const status = req.query.status || "published";
    let list = await listCaseStudies({ status: status === "all" ? undefined : status });
    if (req.query.featured !== undefined) {
      list = list.filter((cs) => cs.featured === (req.query.featured === "true"));
    }
    res.status(200).json(list.map(toListItem));
    return;
  }

  if (req.method === "POST") {
    const user = await requireAuthUser(req, res);
    if (!user) return;
    try {
      assertCanEdit(user);
      await assertCanCreateCaseStudy(user.id);
      const body = await readBody(req);
      const created = await createCaseStudy(user.id, body || {});
      await syncCaseStudyUsage(user.id);
      if (created.status === "published") {
        await notifyNewPublication(created, user);
      }
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({
        detail: err.message || "Failed to create case study",
        code: err.code,
        limit: err.limit,
        upgrade_required: err.upgrade_required || err.code === "limit_reached",
      });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
