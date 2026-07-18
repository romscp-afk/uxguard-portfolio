export async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export function idFrom(req, keys, regex) {
  for (const key of keys) {
    if (req.query?.[key] != null) {
      const raw = req.query[key];
      return Array.isArray(raw) ? raw[0] : raw;
    }
  }
  if (regex) {
    const match = String(req.url || "").match(regex);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return null;
}

/** @deprecated prefer idFrom with regex */
export function routeParam(req, keys = ["param", "id", "projectId"]) {
  return idFrom(req, keys);
}
