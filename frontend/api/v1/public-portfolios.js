import { listPublicPortfolios } from "../_lib/demo-data.js";
import { withApi } from "../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const raw = Number(req.query?.limit);
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 100) : 40;
  const portfolios = await listPublicPortfolios(limit);
  res.status(200).json(portfolios);
});
