import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { streamMediaAsset } from "../../../_lib/media.js";
import { applyApiHeaders } from "../../../_lib/http.js";
import { withApi } from "../../../_lib/withApi.js";

function parseMediaId(req) {
  const fromQuery = req.query?.id ?? req.query?.param;
  if (fromQuery && /^\d+$/.test(String(fromQuery))) {
    return Number(fromQuery);
  }

  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/media\/file\/(\d+)(?:\/)?$/);
  return match ? Number(match[1]) : NaN;
}

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const id = parseMediaId(req);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ detail: "Invalid media id" });
    return;
  }

  const result = await streamMediaAsset(id);
  if (!result) {
    res.status(404).json({ detail: "File not found" });
    return;
  }

  applyApiHeaders(res);
  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200);

  await pipeline(Readable.fromWeb(result.stream), res);
});
