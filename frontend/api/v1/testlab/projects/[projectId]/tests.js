import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../_lib/testlab/http.js";
import { createTestCase, generateTests } from "../../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const projectId = idFrom(req, ["projectId", "param"], /\/testlab\/projects\/([^/?#]+)\/tests/);
  if (!projectId) {
    res.status(400).json({ detail: "projectId required" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  try {
    const payload = await readBody(req);
    if (payload?.generate || payload?.requirement_ids || payload?.openapi) {
      const result = await generateTests(user, projectId, { ...payload, generate: true });
      res.status(201).json(result);
      return;
    }
    const test = await createTestCase(user, projectId, payload || {});
    res.status(201).json({ test });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
