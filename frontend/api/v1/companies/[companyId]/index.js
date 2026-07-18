import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../_lib/hiring/http.js";
import { getCompanyById, updateCompany } from "../../../_lib/hiring/companies.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  const companyId = idFrom(req, ["companyId", "id"], /\/companies\/([^/?#]+)/);
  if (!companyId) {
    res.status(400).json({ detail: "company id required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const company = await getCompanyById(companyId, user);
      if (!company) {
        res.status(404).json({ detail: "Company not found" });
        return;
      }
      res.status(200).json({ company });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "PATCH") {
    try {
      const company = await updateCompany(companyId, user, await readBody(req));
      res.status(200).json({ company });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
