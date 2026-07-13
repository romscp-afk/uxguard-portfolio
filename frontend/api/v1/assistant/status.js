import { requireAuthUser } from "../../_lib/auth.js";
import { getAssistantStatus } from "../../_lib/assistant.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  res.status(200).json(getAssistantStatus());
});
