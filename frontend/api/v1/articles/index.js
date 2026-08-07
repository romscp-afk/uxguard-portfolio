import {
  assertAdminOnly,
  createArticle,
  listPublishedArticles,
} from "../_lib/articles.js";
import { requireAuthUser } from "../_lib/auth.js";
import { withApi } from "../_lib/withApi.js";

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default withApi(async (req, res) => {
  if (req.method === "GET") {
    const featured =
      req.query.featured === undefined ? undefined : req.query.featured === "true";
    const limit = req.query.limit;
    const list = await listPublishedArticles({ featured, limit });
    res.status(200).json({ articles: list });
    return;
  }

  if (req.method === "POST") {
    const user = await requireAuthUser(req, res);
    if (!user) return;
    try {
      assertAdminOnly(user);
      const body = await readBody(req);
      const created = await createArticle(user.id, body || {});
      res.status(201).json({ article: created });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to create article" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
