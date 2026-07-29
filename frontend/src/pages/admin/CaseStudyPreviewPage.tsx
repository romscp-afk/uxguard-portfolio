import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../../api/client";
import { CaseStudyArticle } from "../../components/case-study/CaseStudyArticle";
import { useAuth } from "../../context/AuthContext";
import { getCaseStudyFromCache, saveCaseStudyToCache } from "../../lib/caseStudyStore";
import type { CaseStudy, ContentBlock } from "../../types";

function parseStudyId(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function countBlockMedia(blocks: ContentBlock[] | undefined): number {
  let count = 0;
  for (const block of blocks || []) {
    if (block.type === "image" && String(block.data?.url || "").trim()) count += 1;
    if (block.type === "gallery") {
      const images = (block.data?.images as Array<{ url?: string }> | undefined) || [];
      count += images.filter((img) => String(img?.url || "").trim()).length;
    }
  }
  return count;
}

/** Prefer server study, but keep richer attachments/content media from cache when needed. */
function mergePreviewStudy(cached: CaseStudy | null, remote: CaseStudy | null): CaseStudy | null {
  if (!cached) return remote;
  if (!remote) return cached;

  const remoteAttachments = remote.attachments || [];
  const cachedAttachments = cached.attachments || [];
  const attachments =
    remoteAttachments.length >= cachedAttachments.length ? remoteAttachments : cachedAttachments;

  const remoteBlocks = remote.content_blocks || [];
  const cachedBlocks = cached.content_blocks || [];
  const content_blocks =
    countBlockMedia(remoteBlocks) >= countBlockMedia(cachedBlocks) ? remoteBlocks : cachedBlocks;

  // Admin preview should prefer the API payload for text/status, then restore media if cache is richer.
  return {
    ...remote,
    cover_image: remote.cover_image || cached.cover_image,
    content_blocks,
    attachments,
  };
}

export function CaseStudyPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const studyId = parseStudyId(id);
  const { user, loading: authLoading } = useAuth();
  const [study, setStudy] = useState<CaseStudy | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studyId == null) {
      setError("Invalid preview link.");
      setLoading(false);
      return;
    }

    const cached = getCaseStudyFromCache(studyId);
    if (cached) {
      setStudy(cached);
      setLoading(false);
    }

    api
      .adminGetCaseStudy(studyId)
      .then((loaded) => {
        const best = mergePreviewStudy(cached, loaded);
        if (best) {
          setStudy(best);
          saveCaseStudyToCache(best);
        } else if (!cached) {
          setError("Could not load preview. Save your draft in the editor, then try again.");
        }
      })
      .catch(() => {
        if (!cached) {
          setError("Could not load preview. Save your draft in the editor, then try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [studyId]);

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
        <Link
          to={studyId ? `/admin/case-studies/${studyId}` : "/admin/case-studies"}
          className="btn-primary mt-4 inline-flex"
        >
          Back to editor
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to={`/admin/case-studies/${studyId}`}
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
        backHref={`/admin/case-studies/${studyId}`}
        backLabel="Back to editor"
      />
    </div>
  );
}
