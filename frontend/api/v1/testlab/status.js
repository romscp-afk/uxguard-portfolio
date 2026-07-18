import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";
import { assertCanAccessTestLab } from "../../_lib/testlab/authz.js";
import { getExecutionCapabilities } from "../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    assertCanAccessTestLab(user);
  } catch (err) {
    res.status(err.status || 403).json({ detail: err.message });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  res.status(200).json({
    product: "TestLab",
    subtitle: "QA Autopilot",
    execution: getExecutionCapabilities(),
  });
});
