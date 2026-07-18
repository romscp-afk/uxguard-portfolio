import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../_lib/testlab/http.js";
import {
  createRequirement,
  importRequirements,
} from "../../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const projectId = idFrom(req, ["projectId", "param"], /\/testlab\/projects\/([^/?#]+)\/requirements/);
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
    if (payload?.import || payload?.text || payload?.content) {
      const result = await importRequirements(user, projectId, payload);
      res.status(201).json(result);
      return;
    }
    const requirement = await createRequirement(user, projectId, payload || {});
    res.status(201).json({ requirement });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
