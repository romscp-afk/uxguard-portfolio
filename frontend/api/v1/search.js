import { searchPlatform } from "../../_lib/community.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const q = String(req.query.q || "");
  const results = await searchPlatform(q);
  res.status(200).json(results);
});
