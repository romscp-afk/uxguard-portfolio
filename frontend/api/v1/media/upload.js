import { requireAuthUser } from "../../_lib/auth.js";
import { parseMultipartForm } from "../../_lib/multipart.js";
import { uploadMediaAsset } from "../../_lib/media.js";
import { withApi } from "../../_lib/withApi.js";

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
    const { file, altText } = await parseMultipartForm(req);
    const asset = await uploadMediaAsset(user.id, file, altText);
    res.status(200).json(asset);
  } catch (err) {
    res.status(400).json({ detail: err.message || "Upload failed" });
  }
});
