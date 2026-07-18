import { withApi } from "../../_lib/withApi.js";
import { claimAndProcessNextRun, getExecutionCapabilities } from "../../_lib/testlab/service.js";

function authorizeWorker(req) {
  const token = process.env.TESTLAB_WORKER_TOKEN;
  if (!token) return false;
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const alt = req.headers["x-testlab-worker-token"];
  return bearer === token || alt === token;
}

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  if (!authorizeWorker(req)) {
    res.status(401).json({ detail: "Invalid worker token" });
    return;
  }

  try {
    const run = await claimAndProcessNextRun({
      workerId: req.headers["x-testlab-worker-id"] || `remote_${Date.now().toString(36)}`,
    });
    res.status(200).json({
      processed: Boolean(run),
      run: run || null,
      capabilities: getExecutionCapabilities(),
    });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message, code: err.code });
  }
});
