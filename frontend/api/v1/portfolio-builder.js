import { assertCanEdit } from "../../_lib/projects.js";
import {
  getPortfolioConfigForUser,
  updatePortfolioConfigForUser,
} from "../../_lib/portfolio-config.js";
import { requireAuthUser } from "../_lib/auth.js";
import { withApi } from "../_lib/withApi.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const config = await getPortfolioConfigForUser(user.id);
    res.status(200).json(config);
    return;
  }

  if (req.method === "PATCH") {
    try {
      assertCanEdit(user);
      const updated = await updatePortfolioConfigForUser(user.id, req.body || {});
      res.status(200).json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to update portfolio" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
