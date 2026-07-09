import { createCaseStudy, listCaseStudies, toListItem } from "../_lib/demo-data.js";
import { notifyNewPublication } from "../_lib/community.js";
import { requireAuthUser } from "../_lib/auth.js";
import { assertCanEdit } from "../_lib/projects.js";
import { withApi } from "../_lib/withApi.js";

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
      const created = await createCaseStudy(user.id, req.body || {});
      if (created.status === "published") {
        await notifyNewPublication(created, user);
      }
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ detail: err.message || "Failed to create case study" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
