import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { decodeChatPathToken, streamChatImage } from "../../../_lib/internal-messages/chat-media.js";
import { handlePreflight } from "../../../_lib/http.js";

export const config = {
  api: {
    responseLimit: false,
  },
};

function parseToken(req) {
  const fromQuery = req.query?.param ?? req.query?.token ?? req.query?.id;
  const value = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  if (value) return String(value);

  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/internal-messages\/file\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
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

    const token = parseToken(req);
    const pathname = decodeChatPathToken(token);
    if (!pathname) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({ detail: "Invalid chat image token" }));
      return;
    }

    const result = await streamChatImage(pathname, { retries: 5 });
    if (!result) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({ detail: "Chat image not found" }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", 'inline; filename="chat-image.jpg"');

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
      res.end(JSON.stringify({ detail: err.message || "Failed to load chat image" }));
    }
  }
}
