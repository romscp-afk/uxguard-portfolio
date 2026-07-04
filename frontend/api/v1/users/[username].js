import { getUserProfile } from "../../_lib/demo-data.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const profile = getUserProfile(String(req.query.username || ""));
  if (!profile) {
    res.status(404).json({ detail: "User not found" });
    return;
  }
  res.status(200).json(profile);
}
