import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom } from "../../../../_lib/testlab/http.js";
import { retestDefect } from "../../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const defectId = idFrom(req, ["defectId", "param"], /\/testlab\/defects\/([^/?#]+)\/retest/);
  if (!defectId) {
    res.status(400).json({ detail: "defectId required" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  try {
    res.status(201).json(await retestDefect(user, defectId));
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
