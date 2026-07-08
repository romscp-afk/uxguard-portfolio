import { getUserProfile } from "../../_lib/demo-data.js";
import { getFollowStats } from "../../_lib/community.js";
import { getAuthUser, requireAuth } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";

function profileFromSession(session) {
  return {
    id: session.userId,
    username: session.username,
    name: session.name,
    title: session.title || null,
    bio: null,
    avatar_url: null,
    contact_email: session.email,
    location: null,
    cv_url: null,
    social_links: {},
    case_studies: [],
    case_study_count: 0,
  };
}

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const username = String(req.query.username || "");
  let profile = await getUserProfile(username);

  if (!profile) {
    const session = requireAuth(req);
    if (session?.username === username) {
      profile = profileFromSession(session);
    }
  }

  if (!profile) {
    res.status(404).json({ detail: "User not found" });
    return;
  }

  const viewer = await getAuthUser(req);
  const followStats = await getFollowStats(profile.id, viewer?.id ?? null);
  res.status(200).json({ ...profile, ...followStats });
});
