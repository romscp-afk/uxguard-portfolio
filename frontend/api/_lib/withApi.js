import { applyApiHeaders, handlePreflight, json } from "./http.js";

export function withApi(handler) {
  return async (req, res) => {
    if (handlePreflight(req, res)) return;

    const originalStatus = res.status.bind(res);
    const originalJson = res.json.bind(res);
    const originalEnd = res.end.bind(res);

    res.status = (code) => {
      applyApiHeaders(res);
      return originalStatus(code);
    };
    res.json = (body) => {
      applyApiHeaders(res);
      return originalJson(body);
    };
    res.end = (...args) => {
      applyApiHeaders(res);
      return originalEnd(...args);
    };

    try {
      await handler(req, res);
    } catch (err) {
      if (!res.writableEnded) {
        json(res, 500, { detail: err.message || "Internal server error" });
      }
    }
  };
}
