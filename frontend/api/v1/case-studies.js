import { createCaseStudy, listCaseStudies, toListItem } from "../_lib/demo-data.js";
import { requireAuthUser } from "../_lib/auth.js";

export default async function handler(req, res) {
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
      const created = await createCaseStudy(user.id, req.body || {});
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ detail: err.message || "Failed to create case study" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
}
