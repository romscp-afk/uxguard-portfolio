import { adminListCaseStudies, getCaseStudyByIdForAuthor, toListItem } from "../../../_lib/demo-data.js";
import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const segment = String(req.query.id || req.query.param || "");

  if (segment === "all" || !segment) {
    if (req.method !== "GET") {
      res.status(405).json({ detail: "Method not allowed" });
      return;
    }
    const list = await adminListCaseStudies(user.id);
    res.status(200).json(list.map(toListItem));
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const cs = await getCaseStudyByIdForAuthor(Number(segment), user.id);
  if (!cs) {
    res.status(404).json({ detail: "Case study not found" });
    return;
  }
  res.status(200).json(cs);
});
