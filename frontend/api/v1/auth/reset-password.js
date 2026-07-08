import {
  completePasswordReset,
  verifyPasswordResetToken,
} from "../../_lib/password-reset.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method === "GET") {
    const token = String(req.query.token || "");
    const result = await verifyPasswordResetToken(token);
    if (!result.valid) {
      res.status(400).json({ detail: result.error, valid: false });
      return;
    }
    res.status(200).json({ valid: true, email: result.email });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const { token, new_password: newPassword } = req.body || {};

  if (!token || !newPassword) {
    res.status(400).json({ detail: "Reset token and new password are required" });
    return;
  }

  const result = await completePasswordReset(token, newPassword);
  if (result.error) {
    res.status(result.status || 400).json({ detail: result.error });
    return;
  }

  res.status(200).json({ message: result.message });
});
