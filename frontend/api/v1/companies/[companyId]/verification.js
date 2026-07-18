import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { isAdmin } from "../../../../_lib/roles.js";
import { idFrom, readBody } from "../../../../_lib/hiring/http.js";
import { setCompanyVerification } from "../../../../_lib/hiring/companies.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) {
    res.status(403).json({ detail: "Admin only" });
    return;
  }
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const companyId = idFrom(req, ["companyId", "id"], /\/companies\/([^/?#]+)\/verification/);
  try {
    const body = await readBody(req);
    const company = await setCompanyVerification(
      companyId,
      user,
      body.status || body.verification_status,
      body.note || "",
    );
    res.status(200).json({ company });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
