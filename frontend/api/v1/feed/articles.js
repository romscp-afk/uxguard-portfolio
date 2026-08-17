import { listPublishedArticles } from "../../_lib/articles.js";
import { withApi } from "../../_lib/withApi.js";

export const maxDuration = 30;

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const featured =
    req.query.featured === undefined ? undefined : req.query.featured === "true";
  const articles = await listPublishedArticles({
    featured,
    limit: req.query.limit,
  });
  res.status(200).json({ articles });
});
