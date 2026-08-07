import {
  assertAdminOnly,
  deleteArticle,
  getArticleById,
  getPublishedArticleBySlug,
  updateArticle,
} from "../../_lib/articles.js";
import { getAuthUser, requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";

function parseParam(req) {
  const raw = req.query?.param ?? req.query?.id;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  if (fromQuery != null && String(fromQuery).trim()) return String(fromQuery).trim();
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/articles\/([^/]+)(?:\/)?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

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
  const param = parseParam(req);
  if (!param) {
    res.status(400).json({ detail: "Invalid article id or slug" });
    return;
  }

  if (req.method === "GET") {
    // Numeric id — author preview (auth); slug — public published
    if (/^\d+$/.test(param)) {
      const user = await requireAuthUser(req, res);
      if (!user) return;
      try {
        assertAdminOnly(user);
      } catch (err) {
        res.status(err.status || 403).json({ detail: err.message });
        return;
      }
      const article = await getArticleById(Number(param));
      if (!article) {
        res.status(404).json({ detail: "Article not found" });
        return;
      }
      res.status(200).json({ article });
      return;
    }

    const viewer = await getAuthUser(req);
    const result = await getPublishedArticleBySlug(param, viewer?.id ?? null);
    if (!result) {
      res.status(404).json({ detail: "Article not found" });
      return;
    }
    res.status(200).json(result);
    return;
  }

  if (req.method === "PATCH" || req.method === "DELETE") {
    const user = await requireAuthUser(req, res);
    if (!user) return;
    try {
      assertAdminOnly(user);
    } catch (err) {
      res.status(err.status || 403).json({ detail: err.message });
      return;
    }

    const id = /^\d+$/.test(param) ? Number(param) : NaN;
    if (!Number.isFinite(id)) {
      res.status(400).json({ detail: "Use numeric id for article updates" });
      return;
    }

    try {
      if (req.method === "DELETE") {
        await deleteArticle(id, user.id, { adminBypass: true });
        res.status(204).end();
        return;
      }
      const body = await readBody(req);
      const article = await updateArticle(id, user.id, body || {}, { adminBypass: true });
      res.status(200).json({ article });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to update article" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
