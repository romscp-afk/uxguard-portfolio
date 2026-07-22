import { requireAuthUser } from "../../../_lib/auth.js";
import { createCall, listActiveCalls } from "../../../_lib/internal-messages/calls.js";
import { withApi } from "../../../_lib/withApi.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    if (req.method === "GET") {
      const result = await listActiveCalls(user);
      res.status(200).json(result);
      return;
    }

    if (req.method === "POST") {
      const result = await createCall(user, req.body || {});
      res.status(201).json(result);
      return;
    }

    res.status(405).json({ detail: "Method not allowed" });
  } catch (err) {
    res.status(err.status || 400).json({ detail: err.message || "Call request failed", code: err.code });
  }
});
