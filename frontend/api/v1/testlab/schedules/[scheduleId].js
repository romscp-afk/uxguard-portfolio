import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../_lib/testlab/http.js";
import { updateSchedule } from "../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const scheduleId = idFrom(req, ["scheduleId", "param", "id"], /\/testlab\/schedules\/([^/?#]+)/);
  if (!scheduleId) {
    res.status(400).json({ detail: "scheduleId required" });
    return;
  }

  if (req.method !== "PATCH") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  try {
    const schedule = await updateSchedule(user, scheduleId, (await readBody(req)) || {});
    res.status(200).json({ schedule });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
