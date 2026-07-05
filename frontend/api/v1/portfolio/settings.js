import { portfolioSettings } from "../../_lib/store.js";

export default function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json(portfolioSettings);
    return;
  }
  res.status(405).json({ detail: "Method not allowed" });
}
