import { requestPasswordReset } from "../../_lib/password-reset.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const { email } = req.body || {};
  if (!email) {
    res.status(400).json({ detail: "Email is required" });
    return;
  }

  try {
    const result = await requestPasswordReset(email);
    if (result.error) {
      res.status(result.status || 400).json({ detail: result.error });
      return;
    }
    res.status(200).json({ message: result.message });
  } catch (err) {
    res.status(503).json({
      detail: err.message || "Could not send reset email. Try again later.",
    });
  }
});
