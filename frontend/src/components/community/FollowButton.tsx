import { useEffect, useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

type FollowButtonProps = {
  username: string;
  initialFollowing?: boolean;
  followerCount?: number;
  variant?: "light" | "dark";
  onStatsChange?: (stats: { is_following: boolean; follower_count: number }) => void;
};

export function FollowButton({
  username,
  initialFollowing = false,
  followerCount = 0,
  variant = "light",
  onStatsChange,
}: FollowButtonProps) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [followers, setFollowers] = useState(followerCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFollowing(initialFollowing);
    setFollowers(followerCount);
  }, [initialFollowing, followerCount, username]);

  const countClass =
    variant === "dark"
      ? "rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 backdrop-blur"
      : "text-sm text-ink-500";
  const errorClass = variant === "dark" ? "mt-2 text-xs text-rose-200" : "mt-2 text-xs text-red-600";

  if (!user) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className={countClass}>{followers} followers</span>
        <Link to="/admin/login" className="btn-primary py-2 text-sm">
          Sign in to follow
        </Link>
      </div>
    );
  }

  if (user.username === username) {
    return <span className={countClass}>{followers} followers</span>;
  }

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

  const followingBtn =
    variant === "dark"
      ? "inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
      : "btn-secondary py-2 text-sm";
  const followBtn =
    variant === "dark"
      ? "inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
      : "btn-primary py-2 text-sm";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className={countClass}>{followers} followers</span>
        <button
          type="button"
          onClick={toggleFollow}
          disabled={loading}
          className={following ? followingBtn : followBtn}
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
      {error ? <p className={errorClass}>{error}</p> : null}
    </div>
  );
}
