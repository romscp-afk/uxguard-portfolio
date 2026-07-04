import { caseStudies } from "../../_lib/demo-data.js";

export default function handler(req, res) {
  const param = String(req.query.param || "");
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const cs = caseStudies.find((c) => c.slug === param && c.status === "published");
  if (!cs) {
    res.status(404).json({ detail: "Case study not found" });
    return;
  }
  res.status(200).json(cs);
}
