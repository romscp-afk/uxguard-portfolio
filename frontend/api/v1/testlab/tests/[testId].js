import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../_lib/testlab/http.js";
import { deleteTestCase, updateTestCase } from "../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const testId = idFrom(req, ["testId", "param", "id"], /\/testlab\/tests\/([^/?#]+)/);
  if (!testId) {
    res.status(400).json({ detail: "testId required" });
    return;
  }

  if (req.method === "PATCH") {
    try {
      const test = await updateTestCase(user, testId, (await readBody(req)) || {});
      res.status(200).json({ test });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      res.status(200).json(await deleteTestCase(user, testId));
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
