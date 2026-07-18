import { withApi } from "../../_lib/withApi.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { listTemplates } from "../../_lib/resume/templates.js";
import { getAiAssistStatus } from "../../_lib/resume/ai-assist.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  res.status(200).json({
    templates: listTemplates(),
    ai: getAiAssistStatus(),
  });
});
