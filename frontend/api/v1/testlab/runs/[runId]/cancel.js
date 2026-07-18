import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom } from "../../../../_lib/testlab/http.js";
import { cancelRun } from "../../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const runId = idFrom(req, ["runId", "param"], /\/testlab\/runs\/([^/?#]+)\/cancel/);
  if (!runId) {
    res.status(400).json({ detail: "runId required" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  try {
    const run = await cancelRun(user, runId);
    res.status(200).json({ run });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
