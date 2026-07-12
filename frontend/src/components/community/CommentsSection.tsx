import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type { Comment } from "../../types";

type CommentsSectionProps = {
  caseStudyId: number;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CommentsSection({ caseStudyId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isFinite(caseStudyId) || caseStudyId <= 0) {
      setLoading(false);
      setError("Invalid case study.");
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await api.listComments(caseStudyId);
        if (!cancelled) setComments(Array.isArray(items) ? items : []);
      } catch (err) {
        if (!cancelled) {
          setComments([]);
          setError(err instanceof ApiError ? err.message : "Could not load comments.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [caseStudyId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await api.addComment(caseStudyId, body.trim());
      setComments((prev) => [...prev, created]);
      setBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not post comment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete comment");
    }
  }

  return (
    <section id="comments" className="border-t border-ink-100 bg-white">
      <div className="mx-auto w-full max-w-none px-4 py-12 sm:px-8 lg:px-12 xl:px-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand-600" />
            <h2 className="font-display text-2xl font-bold text-ink-950">Feedback &amp; Comments</h2>
            <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-600">
              {comments.length}
            </span>
          </div>

          {user ? (
            <form onSubmit={handleSubmit} className="card mb-8 p-5">
              <label className="label-field">Share your feedback</label>
              <textarea
                className="input-field min-h-[110px] resize-y"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What stood out about this case study? Questions, insights, or encouragement for the author..."
                maxLength={2000}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-ink-400">{body.length}/2000</p>
                <button type="submit" disabled={submitting || !body.trim()} className="btn-primary py-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post comment"}
                </button>
              </div>
            </form>
          ) : (
            <div className="card mb-8 p-5 text-sm text-ink-600">
              <Link to="/admin/login" className="font-semibold text-brand-600 hover:text-brand-700">
                Sign in
              </Link>{" "}
              to leave feedback and join the community conversation.
            </div>
          )}

          {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

          {loading ? (
            <div className="card h-24 animate-pulse bg-ink-100" />
          ) : comments.length === 0 ? (
            <p className="text-sm text-ink-500">No comments yet. Be the first to share feedback.</p>
          ) : (
            <ul className="space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {comment.author ? (
                        <Link
                          to={`/u/${comment.author.username}`}
                          className="font-semibold text-ink-900 hover:text-brand-600"
                        >
                          {comment.author.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-ink-900">Community member</span>
                      )}
                      {comment.author?.title ? (
                        <p className="text-xs text-ink-500">{comment.author.title}</p>
                      ) : null}
                      <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink-700">{comment.body}</p>
                      <p className="mt-2 text-xs text-ink-400">{formatWhen(comment.created_at)}</p>
                    </div>
                    {user && comment.author?.id === user.id ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="shrink-0 rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
