import {
  assertCanManageArticles,
  listArticlesForUser,
} from "../../_lib/articles.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { isAdmin } from "../../_lib/roles.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    assertCanManageArticles(user);
    // Admins see all articles; everyone else sees only their own.
    const articles = await listArticlesForUser(user.id, { includeAll: isAdmin(user) });
    res.status(200).json({ articles });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message || "Failed to list articles" });
  }
});
