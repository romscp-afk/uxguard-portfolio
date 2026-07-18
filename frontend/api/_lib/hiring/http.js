function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function idFrom(req, keys, regex) {
  for (const key of keys) {
    if (req.query?.[key] != null) return req.query[key];
  }
  const match = String(req.url || "").match(regex);
  return match?.[1] || null;
}

export { readBody, idFrom };
