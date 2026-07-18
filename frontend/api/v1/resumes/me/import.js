import { requireAuthUser } from "../../../_lib/auth.js";
import { parseMultipartForm } from "../../../_lib/multipart.js";
import { withApi } from "../../../_lib/withApi.js";
import { importResumeForUser } from "../../../_lib/resume/service.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    const { file } = await parseMultipartForm(req);
    const result = await importResumeForUser(user.id, file);
    res.status(200).json(result);
  } catch (err) {
    const status = err.status || 400;
    res.status(status).json({
      detail: err.message || "Resume import failed",
      code: err.code || undefined,
    });
  }
});
