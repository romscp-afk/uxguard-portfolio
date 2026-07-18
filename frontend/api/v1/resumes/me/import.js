import { requireAuthUser } from "../../../_lib/auth.js";
import { parseMultipartForm } from "../../../_lib/multipart.js";
import { withApi } from "../../../_lib/withApi.js";
import { assertCanEdit, importResumeForUser } from "../../../_lib/resume/service.js";

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
    assertCanEdit(user);
    const { file, fields } = await parseMultipartForm(req);
    const meta = {
      title: fields?.title || fields?.resume_name || "",
      target_role: fields?.target_role || "",
      target_industry: fields?.target_industry || "",
      target_country: fields?.target_country || "",
      experience_level: fields?.experience_level || "mid",
    };
    const result = await importResumeForUser(user.id, file, meta);
    res.status(200).json(result);
  } catch (err) {
    const status = err.status || 400;
    res.status(status).json({
      detail: err.message || "Resume import failed",
      code: err.code || undefined,
    });
  }
});
