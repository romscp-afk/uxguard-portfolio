import { checkLogin, signToken } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";
import { toUserOut } from "../../_lib/demo-data.js";
import { setPortalWorkspaceForUser } from "../../_lib/career/service.js";

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const { email, password, portal } = req.body || {};
  const user = email && password ? await checkLogin(email, password) : null;
  if (!user) {
    res.status(401).json({ detail: "Invalid credentials" });
    return;
  }

  const portalMode = portal === "employer" ? "employer" : "candidate";
  try {
    const updated = await setPortalWorkspaceForUser(user.id, portalMode);
    res.status(200).json({
      access_token: signToken(updated || user),
      token_type: "bearer",
      user: toUserOut(updated || user),
    });
  } catch (err) {
    res.status(err.status || 403).json({ detail: err.message || "Login failed" });
  }
});
