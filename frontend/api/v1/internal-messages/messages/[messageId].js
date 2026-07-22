import { requireAuthUser } from "../../../_lib/auth.js";
import {
  deleteInternalMessage,
  editInternalMessage,
  getInternalThread,
} from "../../../_lib/internal-messages/service.js";
import { withApi } from "../../../_lib/withApi.js";

function resolveMessageId(req) {
  const raw = req.query?.messageId ?? req.query?.param;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value) return String(value);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/internal-messages\/messages\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  const messageId = resolveMessageId(req);
  if (!messageId) {
    res.status(400).json({ detail: "Invalid message id." });
    return;
  }

  try {
    if (req.method === "PATCH") {
      const message = await editInternalMessage(user, messageId, req.body || {});
      const detail = await getInternalThread(user, message.thread_id, { markRead: false });
      res.status(200).json({ message, ...detail });
      return;
    }

    if (req.method === "DELETE") {
      const scope = String(req.query?.scope || req.body?.scope || "me");
      const result = await deleteInternalMessage(user, messageId, {
        scope: scope === "all" ? "all" : "me",
      });
      res.status(200).json(result);
      return;
    }
  } catch (error) {
    res.status(error.status || 500).json({
      detail: error.message || "Message update failed.",
      code: error.code,
    });
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
