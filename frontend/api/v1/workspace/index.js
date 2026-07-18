import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";
import { assertCanEdit } from "../../_lib/roles.js";
import { toUserOut } from "../../_lib/demo-data.js";
import {
  enableEmployerWorkspaceForUser,
  setActiveWorkspaceForUser,
} from "../../_lib/career/service.js";

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

  if (req.method !== "PATCH" && req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  try {
    assertCanEdit(user);
    const payload = await readBody(req);
    let updated = user;

    if (payload.enable_employer) {
      updated = await enableEmployerWorkspaceForUser(user.id);
    } else if (payload.active_workspace) {
      updated = await setActiveWorkspaceForUser(user.id, payload.active_workspace);
    } else {
      res.status(400).json({ detail: "active_workspace or enable_employer required" });
      return;
    }

    res.status(200).json(toUserOut(updated));
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message || "Workspace update failed" });
  }
});
