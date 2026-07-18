import { requireAuthUser } from "../../../../../_lib/auth.js";
import { withApi } from "../../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../../_lib/testlab/http.js";
import { startVerification } from "../../../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const targetId = idFrom(req, ["targetId", "param"], /\/testlab\/targets\/([^/?#]+)\/verify\/start/);
  if (!targetId) {
    res.status(400).json({ detail: "targetId required" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  try {
    const payload = await readBody(req);
    const challenge = await startVerification(user, targetId, payload?.method);
    res.status(201).json({ challenge });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
