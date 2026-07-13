import {
  followUser,
  getFollowStats,
  unfollowUser,
} from "../../../_lib/community.js";
import { getUserByUsername } from "../../../_lib/demo-data.js";
import { getAuthUser, requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";

function parseUsername(req) {
  const raw = req.query?.username;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value) return decodeURIComponent(String(value));
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/users\/([^/]+)\/follow\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default withApi(async (req, res) => {
  const username = parseUsername(req);
  if (!username) {
    res.status(400).json({ detail: "Username is required" });
    return;
  }

  if (req.method === "GET") {
    const target = await getUserByUsername(username);
    if (!target) {
      res.status(404).json({ detail: "User not found" });
      return;
    }
    const session = await getAuthUser(req);
    const stats = await getFollowStats(target.id, session?.id ?? null);
    res.status(200).json({ username: target.username, ...stats });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "POST") {
    try {
      const result = await followUser(user.id, username);
      if (result.error) {
        res.status(result.status).json({ detail: result.error });
        return;
      }
      const stats = await getFollowStats(result.user_id, user.id);
      res.status(200).json({ ...result, ...stats });
    } catch (err) {
      console.error("[follow POST]", err);
      res.status(500).json({ detail: err?.message || "Could not follow user." });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const result = await unfollowUser(user.id, username);
      if (result.error) {
        res.status(result.status).json({ detail: result.error });
        return;
      }
      const target = await getUserByUsername(username);
      const stats = target
        ? await getFollowStats(target.id, user.id)
        : { follower_count: 0, following_count: 0, is_following: false };
      res.status(200).json(stats);
    } catch (err) {
      console.error("[follow DELETE]", err);
      res.status(500).json({ detail: err?.message || "Could not unfollow user." });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
