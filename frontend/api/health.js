import { json } from "./_lib/http.js";
import { isPersistentStoreEnabled, readStore } from "./_lib/store.js";
import { withApi } from "./_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    json(res, 405, { detail: "Method not allowed" });
    return;
  }

  const persistent = isPersistentStoreEnabled();
  let storeReadable = false;

  if (persistent) {
    try {
      const store = await readStore();
      storeReadable = Boolean(store?.users && store?.caseStudies);
    } catch {
      storeReadable = false;
    }
  }

  json(res, 200, {
    status: storeReadable || !persistent ? "ok" : "degraded",
    persistent_store: persistent,
    store_readable: storeReadable,
  });
});
