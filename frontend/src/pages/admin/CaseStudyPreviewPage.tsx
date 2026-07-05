import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../../api/client";
import { CaseStudyArticle } from "../../components/case-study/CaseStudyArticle";
import { useAuth } from "../../context/AuthContext";
import type { CaseStudy } from "../../types";

export function CaseStudyPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [study, setStudy] = useState<CaseStudy | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .adminGetCaseStudy(Number(id))
      .then(setStudy)
      .catch(() => setError("Could not load preview"))
      .finally(() => setLoading(false));
  }, [id]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="card h-96 animate-pulse bg-ink-100" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="card h-96 animate-pulse bg-ink-100" />
        </div>
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="min-h-screen bg-ink-50 px-4 py-20 text-center">
        <p className="text-ink-500">{error || "Not found"}</p>
        <Link to="/admin/case-studies" className="btn-primary mt-4 inline-flex">
          Back to case studies
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to={`/admin/case-studies/${id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to editor
          </Link>
          {study.status !== "published" ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Draft — not public yet
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Published
            </span>
          )}
        </div>
      </div>

      <CaseStudyArticle
        study={study}
        username={user?.username}
        preview={study.status !== "published"}
        backHref={`/admin/case-studies/${id}`}
        backLabel="Back to editor"
      />
    </div>
  );
}
