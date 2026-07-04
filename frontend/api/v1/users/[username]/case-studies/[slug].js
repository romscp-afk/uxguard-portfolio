import { getUserCaseStudy } from "../../../../_lib/demo-data.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const cs = getUserCaseStudy(String(req.query.username || ""), String(req.query.slug || ""));
  if (!cs) {
    res.status(404).json({ detail: "Case study not found" });
    return;
  }
  res.status(200).json(cs);
}
