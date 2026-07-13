import { adminListCaseStudies, toListItem } from "../../../_lib/demo-data.js";
import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";

/** Explicit list route so local + Vercel both resolve /case-studies/admin/all. */
export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const list = await adminListCaseStudies(user.id);
  res.status(200).json(list.map(toListItem));
});
