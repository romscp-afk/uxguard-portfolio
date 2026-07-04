import { caseStudies, toListItem } from "../_lib/demo-data.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const status = req.query.status || "published";
  let list = caseStudies.filter((cs) => cs.status === status);
  if (req.query.featured !== undefined) {
    list = list.filter((cs) => cs.featured === (req.query.featured === "true"));
  }
  list.sort((a, b) => a.sort_order - b.sort_order);
  res.status(200).json(list.map(toListItem));
}
