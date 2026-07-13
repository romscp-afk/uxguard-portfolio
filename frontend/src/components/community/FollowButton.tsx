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
    let cancelled = false;

    // Always load live counts (works logged-out too) so the badge is never stuck/stale.
    api
      .getFollowStats(username)
      .then((stats) => {
        if (cancelled) return;
        const count = Number(stats.follower_count) || 0;
        setFollowers(count);
        if (user && user.username !== username) {
          setFollowing(Boolean(stats.is_following));
        }
        onStatsChange?.({
          is_following: Boolean(stats.is_following),
          follower_count: count,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFollowing(initialFollowing);
        setFollowers(Number(followerCount) || 0);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, username]);

  const countClass =
    variant === "dark"
      ? "inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-900 shadow-sm"
      : "inline-flex items-center rounded-full bg-ink-100 px-3 py-1.5 text-sm font-semibold text-ink-800";
  const errorClass = variant === "dark" ? "mt-2 text-xs text-rose-100" : "mt-2 text-xs text-red-600";

  const countLabel = (
    <span className={countClass}>
      {followers} follower{followers === 1 ? "" : "s"}
    </span>
  );

  if (!user) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {countLabel}
        <Link to="/admin/login" className="btn-primary py-2 text-sm">
          Sign in to follow
        </Link>
      </div>
    );
  }

  if (user.username === username) {
    return <div className="flex flex-wrap items-center gap-3">{countLabel}</div>;
  }

  async function toggleFollow() {
    setLoading(true);
    setError("");
    try {
      const stats = following ? await api.unfollowUser(username) : await api.followUser(username);
      const count = Number(stats.follower_count) || 0;
      setFollowing(Boolean(stats.is_following));
      setFollowers(count);
      onStatsChange?.({ is_following: Boolean(stats.is_following), follower_count: count });
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
        {countLabel}
        <button
          type="button"
          onClick={() => void toggleFollow()}
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
