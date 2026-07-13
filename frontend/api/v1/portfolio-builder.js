import { assertCanEdit } from "../_lib/projects.js";
import {
  getPortfolioConfigForUser,
  updatePortfolioConfigForUser,
} from "../_lib/portfolio-config.js";
import { defaultPortfolioConfig } from "../_lib/roles.js";
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
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const config = (await getPortfolioConfigForUser(user.id)) || defaultPortfolioConfig();
    res.status(200).json(config);
    return;
  }

  if (req.method === "PATCH") {
    try {
      assertCanEdit(user);
      const body = await readBody(req);
      const updated = await updatePortfolioConfigForUser(user.id, body || {});
      res.status(200).json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to update portfolio" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
