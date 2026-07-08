import { useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

type FollowButtonProps = {
  username: string;
  initialFollowing?: boolean;
  followerCount?: number;
  onStatsChange?: (stats: { is_following: boolean; follower_count: number }) => void;
};

export function FollowButton({
  username,
  initialFollowing = false,
  followerCount = 0,
  onStatsChange,
}: FollowButtonProps) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [followers, setFollowers] = useState(followerCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-500">{followers} followers</span>
        <Link to="/admin/login" className="btn-primary py-2 text-sm">
          Sign in to follow
        </Link>
      </div>
    );
  }

  if (user.username === username) return null;

  async function toggleFollow() {
    setLoading(true);
    setError("");
    try {
      const stats = following ? await api.unfollowUser(username) : await api.followUser(username);
      setFollowing(stats.is_following);
      setFollowers(stats.follower_count);
      onStatsChange?.({ is_following: stats.is_following, follower_count: stats.follower_count });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update follow status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-500">{followers} followers</span>
        <button
          type="button"
          onClick={toggleFollow}
          disabled={loading}
          className={following ? "btn-secondary py-2 text-sm" : "btn-primary py-2 text-sm"}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : following ? (
            <>
              <UserMinus className="h-4 w-4" />
              Following
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Follow
            </>
          )}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
