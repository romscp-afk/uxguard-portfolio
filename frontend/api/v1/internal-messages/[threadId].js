import { requireAuthUser } from "../../_lib/auth.js";
import {
  deleteInternalMessage,
  editInternalMessage,
  getInternalThread,
  replyInternalThread,
  deleteInternalThreadForMe,
} from "../../_lib/internal-messages/service.js";
import { withApi } from "../../_lib/withApi.js";

function resolveThreadId(req) {
  const raw = req.query?.threadId ?? req.query?.param;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value) return String(value);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/internal-messages\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  const threadId = resolveThreadId(req);
  if (!threadId) {
    res.status(400).json({ detail: "Invalid conversation id." });
    return;
  }

  try {
    if (req.method === "GET") {
      res.status(200).json(await getInternalThread(user, threadId));
      return;
    }

    if (req.method === "POST") {
      const message = await replyInternalThread(user, threadId, req.body || {});
      res.status(201).json({
        message,
        ...(await getInternalThread(user, threadId, { markRead: false })),
      });
      return;
    }

    if (req.method === "DELETE") {
      const result = await deleteInternalThreadForMe(user, threadId);
      res.status(200).json(result);
      return;
    }
  } catch (error) {
    res.status(error.status || 500).json({
      detail: error.message || "Private message action failed.",
      code: error.code,
    });
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
