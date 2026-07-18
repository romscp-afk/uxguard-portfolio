import { requireAuthUser } from "../../../../../_lib/auth.js";
import { withApi } from "../../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../../_lib/hiring/http.js";
import { updateCompanyMember } from "../../../../../_lib/hiring/companies.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (req.method !== "PATCH") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const companyId = idFrom(req, ["companyId"], /\/companies\/([^/?#]+)\/team/);
  const memberId = idFrom(req, ["memberId", "id"], /\/team\/([^/?#]+)/);
  try {
    const member = await updateCompanyMember(companyId, memberId, user, await readBody(req));
    res.status(200).json({ member });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
