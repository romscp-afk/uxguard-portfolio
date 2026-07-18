import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../_lib/testlab/http.js";
import { upsertSecret } from "../../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const projectId = idFrom(req, ["projectId", "param"], /\/testlab\/projects\/([^/?#]+)\/secrets/);
  if (!projectId) {
    res.status(400).json({ detail: "projectId required" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  try {
    const secret = await upsertSecret(user, projectId, (await readBody(req)) || {});
    res.status(201).json({ secret });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
