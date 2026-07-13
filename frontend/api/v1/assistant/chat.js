import { requireAuthUser } from "../../_lib/auth.js";
import { assertCanEdit } from "../../_lib/projects.js";
import { chatWithAssistant } from "../../_lib/assistant.js";
import { withApi } from "../../_lib/withApi.js";

const VALID_CONTEXTS = new Set(["general", "case_study", "project", "profile", "portfolio"]);

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  const body = req.body || {};
  const context = VALID_CONTEXTS.has(body.context) ? body.context : "general";
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (messages.length === 0) {
    res.status(400).json({ detail: "messages array is required" });
    return;
  }

  if (messages.length > 40) {
    res.status(400).json({ detail: "Too many messages in conversation" });
    return;
  }

  for (const msg of messages) {
    if (!msg?.role || !msg?.content || typeof msg.content !== "string") {
      res.status(400).json({ detail: "Each message needs role and content" });
      return;
    }
    if (msg.content.length > 8000) {
      res.status(400).json({ detail: "Message too long" });
      return;
    }
  }

  if (body.field_updates_requested) {
    try {
      assertCanEdit(user);
    } catch (err) {
      res.status(err.status || 403).json({ detail: err.message });
      return;
    }
  }

  try {
    const result = await chatWithAssistant({
      messages,
      context,
      field: typeof body.field === "string" ? body.field : undefined,
      draft: body.draft && typeof body.draft === "object" ? body.draft : undefined,
      user,
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message || "AI request failed" });
  }
});
