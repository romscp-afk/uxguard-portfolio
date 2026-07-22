import { requireAuthUser } from "../../../../_lib/auth.js";
import {
  acceptCall,
  endCall,
  getCall,
  markCallConnected,
  postCallSignal,
  rejectCall,
} from "../../../../_lib/internal-messages/calls.js";
import { withApi } from "../../../../_lib/withApi.js";

function resolveCallId(req) {
  const raw = req.query?.callId ?? req.query?.param;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value) return String(value);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/internal-messages\/calls\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString("utf8"));
    } catch {
      return {};
    }
  }
  return {};
}

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const callId = resolveCallId(req);
  if (!callId) {
    res.status(400).json({ detail: "callId is required" });
    return;
  }

  try {
    if (req.method === "GET") {
      const since = Number(req.query.since || 0);
      const result = await getCall(user, callId, { since });
      res.status(200).json(result);
      return;
    }

    if (req.method === "POST") {
      const body = readBody(req);
      const action = String(body.action || req.query.action || "signal").toLowerCase();
      if (action === "accept") {
        res.status(200).json(await acceptCall(user, callId));
        return;
      }
      if (action === "reject") {
        res.status(200).json(await rejectCall(user, callId));
        return;
      }
      if (action === "hangup" || action === "end") {
        res.status(200).json(await endCall(user, callId, { reason: "hangup" }));
        return;
      }
      if (action === "connected") {
        res.status(200).json(await markCallConnected(user, callId));
        return;
      }
      if (action === "signal") {
        res.status(200).json(await postCallSignal(user, callId, body));
        return;
      }
      res.status(400).json({ detail: "Unknown call action" });
      return;
    }

    res.status(405).json({ detail: "Method not allowed" });
  } catch (err) {
    res.status(err.status || 400).json({ detail: err.message || "Call request failed", code: err.code });
  }
});
