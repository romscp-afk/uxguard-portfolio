import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../_lib/testlab/http.js";
import { retestDefect, updateDefect } from "../../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const defectId = idFrom(req, ["defectId", "param", "id"], /\/testlab\/defects\/([^/?#]+)/);
  if (!defectId) {
    res.status(400).json({ detail: "defectId required" });
    return;
  }

  const isRetest = String(req.url || "").includes("/retest");

  if (req.method === "POST" && isRetest) {
    try {
      res.status(201).json(await retestDefect(user, defectId));
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "PATCH") {
    try {
      const defect = await updateDefect(user, defectId, (await readBody(req)) || {});
      res.status(200).json({ defect });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
