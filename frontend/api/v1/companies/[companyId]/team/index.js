import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../_lib/hiring/http.js";
import {
  inviteCompanyMember,
  listCompanyMembers,
  updateCompanyMember,
} from "../../../../_lib/hiring/companies.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  const companyId = idFrom(req, ["companyId", "id"], /\/companies\/([^/?#]+)\/team/);

  if (req.method === "GET") {
    try {
      const members = await listCompanyMembers(companyId, user);
      res.status(200).json({ members });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const result = await inviteCompanyMember(companyId, user, await readBody(req));
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
