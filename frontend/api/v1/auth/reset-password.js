import { resetUserPassword } from "../../_lib/demo-data.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const { email, new_password: newPassword } = req.body || {};

  if (!email || !newPassword) {
    res.status(400).json({ detail: "Email and new password are required" });
    return;
  }

  const result = await resetUserPassword(email, newPassword);
  if (result.error) {
    res.status(result.status || 400).json({ detail: result.error });
    return;
  }

  res.status(200).json({ message: "Password updated. You can sign in with your new password." });
});
