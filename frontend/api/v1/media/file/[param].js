import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { streamMediaAsset } from "../../../_lib/media.js";
import { handlePreflight } from "../../../_lib/http.js";

export const config = {
  api: {
    responseLimit: false,
  },
};

function parseMediaId(req) {
  const fromQuery = req.query?.id ?? req.query?.param;
  const value = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  if (value != null && /^\d+$/.test(String(value))) {
    return Number(value);
  }

  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/media\/file\/(\d+)(?:\/)?$/);
  return match ? Number(match[1]) : NaN;
}

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ detail: "Method not allowed" }));
      return;
    }

    const id = parseMediaId(req);
    if (!Number.isFinite(id) || id <= 0) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ detail: "Invalid media id" }));
      return;
    }

    const result = await streamMediaAsset(id);
    if (!result) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ detail: "File not found" }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const filename = String(result.asset?.original_name || result.asset?.filename || "file").replace(
      /[^\w.\-() ]+/g,
      "_",
    );
    // Open PDFs/images in the browser tab instead of forcing download
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    await pipeline(Readable.fromWeb(result.stream), res);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({ detail: err.message || "Failed to load media" }));
    }
  }
}
