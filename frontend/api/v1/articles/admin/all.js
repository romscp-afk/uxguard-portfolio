import { assertAdminOnly, listArticlesForAdmin } from "../../_lib/articles.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    assertAdminOnly(user);
    const articles = await listArticlesForAdmin();
    res.status(200).json({ articles });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message || "Failed to list articles" });
  }
});
