import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../_lib/testlab/http.js";
import { updateTarget } from "../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const targetId = idFrom(req, ["targetId", "param", "id"], /\/testlab\/targets\/([^/?#]+)/);
  if (!targetId) {
    res.status(400).json({ detail: "targetId required" });
    return;
  }

  if (req.method === "PATCH") {
    try {
      const target = await updateTarget(user, targetId, (await readBody(req)) || {});
      res.status(200).json({ target });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message, code: err.code });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
