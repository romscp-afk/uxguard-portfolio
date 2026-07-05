import { json } from "./_lib/http.js";
import { isPersistentStoreEnabled } from "./_lib/store.js";
import { withApi } from "./_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    json(res, 405, { detail: "Method not allowed" });
    return;
  }

  json(res, 200, {
    status: "ok",
    persistent_store: isPersistentStoreEnabled(),
  });
});
