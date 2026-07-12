import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

type LikeButtonProps = {
  caseStudyId: number;
  initialCount?: number;
  initialLiked?: boolean;
  compact?: boolean;
  onChange?: (stats: { like_count: number; is_liked: boolean }) => void;
};

export function LikeButton({
  caseStudyId,
  initialCount = 0,
  initialLiked = false,
  compact = false,
  onChange,
}: LikeButtonProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .getLikeStats(caseStudyId)
      .then((stats) => {
        if (cancelled) return;
        setLiked(stats.is_liked);
        setCount(stats.like_count);
      })
      .catch(() => {
        /* keep initial values */
      });
    return () => {
      cancelled = true;
    };
  }, [caseStudyId]);

  useEffect(() => {
    setLiked(initialLiked);
    setCount(initialCount);
  }, [initialLiked, initialCount]);

  if (!user) {
    return (
      <div className={compact ? "inline-flex items-center gap-2" : "flex flex-wrap items-center gap-3"}>
        <span className="inline-flex items-center gap-1.5 text-sm text-ink-500">
          <Heart className="h-4 w-4" />
          {count}
        </span>
        {!compact ? (
          <Link to="/admin/login" className="text-sm font-medium text-brand-600 hover:text-brand-500">
            Sign in to like
          </Link>
        ) : null}
      </div>
    );
  }

  async function toggleLike() {
    setLoading(true);
    setError("");
    try {
      const stats = liked
        ? await api.unlikeCaseStudy(caseStudyId)
        : await api.likeCaseStudy(caseStudyId);
      setLiked(stats.is_liked);
      setCount(stats.like_count);
      onChange?.(stats);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update like");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleLike}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
          liked
            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700"
        }`}
        aria-pressed={liked}
        aria-label={liked ? "Unlike case study" : "Like case study"}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
        )}
        {liked ? "Liked" : "Like"}
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{count}</span>
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
