import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { updateStore } from "../../../_lib/store.js";

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!ids.length) {
    res.status(400).json({ detail: "Expected { ids: number[] }" });
    return;
  }

  const uid = Number(user.id);
  await updateStore((store) => {
    for (let i = 0; i < ids.length; i++) {
      const cs = store.caseStudies.find(
        (item) => Number(item.id) === Number(ids[i]) && Number(item.author_id) === uid,
      );
      if (cs) cs.sort_order = i;
    }
    return store;
  });

  res.status(200).json({ ok: true, reordered: ids.length });
});
