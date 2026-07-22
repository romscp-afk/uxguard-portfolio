import { requireAuthUser } from "../../_lib/auth.js";
import {
  createInternalThread,
  listInternalThreads,
} from "../../_lib/internal-messages/service.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    res.status(200).json(await listInternalThreads(user));
    return;
  }

  if (req.method === "POST") {
    try {
      const result = await createInternalThread(user, req.body || {});
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({
        detail: error.message || "Could not create conversation.",
        code: error.code,
      });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
