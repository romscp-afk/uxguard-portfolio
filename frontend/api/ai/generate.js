import { requireAuthUser } from "../_lib/auth.js";
import { assertCanEdit } from "../_lib/projects.js";
import { generateAiResponse } from "../_lib/ai/generate.js";
import { withApi } from "../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    assertCanEdit(user);
  } catch (err) {
    res.status(err.status || 403).json({ detail: err.message, code: "forbidden" });
    return;
  }

  try {
    const result = await generateAiResponse({ user, body: req.body || {} });
    res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const payload = {
      success: false,
      detail: err.message || "Generation failed",
      code: err.code || "generation_failed",
    };
    if (err.remainingCredits !== undefined) {
      payload.remainingCredits = err.remainingCredits;
    }
    res.status(status).json(payload);
  }
});
