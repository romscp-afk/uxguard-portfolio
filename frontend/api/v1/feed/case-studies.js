import { getFeedItems } from "../../_lib/demo-data.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  res.status(200).json(await getFeedItems());
}
