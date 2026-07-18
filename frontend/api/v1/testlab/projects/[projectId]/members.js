import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../_lib/testlab/http.js";
import { addMember, listMembers } from "../../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const projectId = idFrom(req, ["projectId", "param"], /\/testlab\/projects\/([^/?#]+)\/members/);
  if (!projectId) {
    res.status(400).json({ detail: "projectId required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const members = await listMembers(user, projectId);
      res.status(200).json({ members });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const payload = await readBody(req);
      const member = await addMember(user, projectId, payload || {});
      res.status(201).json({ member });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
