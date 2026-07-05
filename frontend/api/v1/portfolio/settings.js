import { requireAuthUser } from "../../_lib/auth.js";
import { portfolioSettings, readStore, updateStore } from "../../_lib/store.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const store = await readStore();
    res.status(200).json(store.portfolioSettings || portfolioSettings);
    return;
  }

  if (req.method === "PATCH") {
    const user = await requireAuthUser(req, res);
    if (!user) return;

    await updateStore((store) => {
      store.portfolioSettings = {
        ...(store.portfolioSettings || portfolioSettings),
        ...(req.body || {}),
      };
      return store;
    });
    const store = await readStore();
    res.status(200).json(store.portfolioSettings || portfolioSettings);
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
}
