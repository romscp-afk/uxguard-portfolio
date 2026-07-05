import { getUserCaseStudy } from "../../../../_lib/demo-data.js";
import { withApi } from "../../../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const cs = await getUserCaseStudy(String(req.query.username || ""), String(req.query.slug || ""));
  if (!cs) {
    res.status(404).json({ detail: "Case study not found" });
    return;
  }
  res.status(200).json(cs);
});
