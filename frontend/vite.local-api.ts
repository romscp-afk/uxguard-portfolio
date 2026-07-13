import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Connect, Plugin } from "vite";
import { loadEnv } from "vite";

type Params = Record<string, string>;

function augmentNodeResponse(res: Connect.ServerResponse) {
  const anyRes = res as Connect.ServerResponse & {
    status: (code: number) => typeof anyRes;
    json: (body: unknown) => void;
  };

  if (typeof anyRes.status !== "function") {
    anyRes.status = (code: number) => {
      anyRes.statusCode = code;
      return anyRes;
    };
  }

  if (typeof anyRes.json !== "function") {
    anyRes.json = (body: unknown) => {
      if (!anyRes.getHeader("Content-Type")) {
        anyRes.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      anyRes.end(JSON.stringify(body));
    };
  }

  return anyRes;
}

async function readJsonBody(req: Connect.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

function resolveApiFile(apiRoot: string, routePath: string): { file: string; params: Params } | null {
  const parts = routePath.split("/").filter(Boolean);
  const params: Params = {};

  function walk(dir: string, index: number): string | null {
    if (index >= parts.length) {
      const asFile = `${dir}.js`;
      if (fs.existsSync(asFile) && fs.statSync(asFile).isFile()) return asFile;
      const asIndex = path.join(dir, "index.js");
      if (fs.existsSync(asIndex) && fs.statSync(asIndex).isFile()) return asIndex;
      return null;
    }

    const part = parts[index];
    const exact = path.join(dir, part);
    if (fs.existsSync(exact) && fs.statSync(exact).isDirectory()) {
      const found = walk(exact, index + 1);
      if (found) return found;
    }
    if (index === parts.length - 1) {
      const exactFile = path.join(dir, `${part}.js`);
      if (fs.existsSync(exactFile) && fs.statSync(exactFile).isFile()) return exactFile;
    }

    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
    const names = fs.readdirSync(dir);
    // Match Vercel-style [param] directories and [param].js files
    const dynamic = names.find(
      (name) =>
        (name.startsWith("[") && name.endsWith("]") && fs.statSync(path.join(dir, name)).isDirectory()) ||
        /^\[.+\]\.js$/.test(name),
    );
    if (!dynamic) return null;

    const key = dynamic.replace(/^\[/, "").replace(/\](?:\.js)?$/, "");
    params[key] = decodeURIComponent(part);

    const dynPath = path.join(dir, dynamic);
    if (fs.existsSync(dynPath) && fs.statSync(dynPath).isDirectory()) {
      return walk(dynPath, index + 1);
    }
    if (index === parts.length - 1 && dynamic.endsWith(".js") && fs.statSync(dynPath).isFile()) {
      return dynPath;
    }
    if (index === parts.length - 1) {
      const dynFile = path.join(dir, `${dynamic}.js`);
      if (fs.existsSync(dynFile) && fs.statSync(dynFile).isFile()) return dynFile;
    }
    return null;
  }

  const file = walk(apiRoot, 0);
  return file ? { file, params } : null;
}

/**
 * Serve /api/* from local serverless handlers so localhost works without
 * proxying to production (and without requiring `vercel dev` login/network).
 */
export function localApiPlugin(apiRoot = path.resolve(process.cwd(), "api")): Plugin {
  return {
    name: "uxguard-local-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] == null) process.env[key] = value;
      }

      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url || "/";
          if (!rawUrl.startsWith("/api/")) return next();

          const url = new URL(rawUrl, "http://127.0.0.1");
          const routePath = url.pathname.replace(/^\/api\//, "");
          const resolved = resolveApiFile(apiRoot, routePath);
          if (!resolved) return next();

          const mod = await server.ssrLoadModule(pathToFileURL(resolved.file).href);
          const handler = mod.default;
          if (typeof handler !== "function") return next();

          const query: Record<string, string | string[]> = { ...resolved.params };
          url.searchParams.forEach((value, key) => {
            const existing = query[key];
            if (existing == null) query[key] = value;
            else if (Array.isArray(existing)) existing.push(value);
            else query[key] = [existing, value];
          });

          const anyReq = req as Connect.IncomingMessage & {
            query: Record<string, string | string[]>;
            body?: unknown;
          };
          anyReq.query = query;

          const contentType = String(req.headers["content-type"] || "");
          const isMultipart = contentType.includes("multipart/form-data");

          // Never pre-consume multipart bodies — upload handlers read the raw stream.
          if (
            req.method !== "GET" &&
            req.method !== "HEAD" &&
            req.method !== "OPTIONS" &&
            !isMultipart
          ) {
            anyReq.body = await readJsonBody(req);
          }

          const anyRes = augmentNodeResponse(res);
          await handler(anyReq, anyRes);
          if (!res.writableEnded) {
            anyRes.status(404).json({ detail: "Not found" });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Local API error";
          console.error("[local-api]", message);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ detail: message }));
          }
        }
      });
    },
  };
}
