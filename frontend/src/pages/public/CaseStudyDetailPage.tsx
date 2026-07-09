import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { AuthorBadge } from "../../components/case-study/AuthorBadge";
import { CaseStudyArticle } from "../../components/case-study/CaseStudyArticle";
import { CommentsSection } from "../../components/community/CommentsSection";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { getCaseStudyFromCache, listCachedCaseStudies } from "../../lib/caseStudyStore";
import { getUserFromRegistry } from "../../lib/platformRegistry";
import type { CaseStudy, UserProfile } from "../../types";

export function CaseStudyDetailPage() {
  const { username: rawUsername, slug: rawSlug } = useParams<{ username: string; slug: string }>();
  const username = rawUsername ? decodeURIComponent(rawUsername) : "";
  const slug = rawSlug ? decodeURIComponent(rawSlug) : "";

  const [study, setStudy] = useState<CaseStudy | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username || !slug) {
      setError("Invalid case study link.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const [studyResult, profileResult] = await Promise.allSettled([
        api.getUserCaseStudy(username, slug),
        api.getUserProfile(username),
      ]);

      if (cancelled) return;

      if (studyResult.status === "fulfilled") {
        setStudy(studyResult.value);
        setError("");
      } else {
        const registryUser = getUserFromRegistry(username);
        const cached = registryUser
          ? listCachedCaseStudies(registryUser.id).find(
              (item) => item.slug === slug && item.status === "published",
            )
          : null;
        const cachedFull = cached ? getCaseStudyFromCache(cached.id) : null;
        if (cachedFull) {
          setStudy(cachedFull);
          setError("");
        } else {
          setError("Case study not found");
        }
      }

      if (profileResult.status === "fulfilled") {
        setAuthor(profileResult.value);
      } else {
        const registryUser = getUserFromRegistry(username);
        if (registryUser) {
          setAuthor({
            ...registryUser,
            case_studies: [],
            case_study_count: 0,
          });
        }
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username, slug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="card h-96 animate-pulse bg-ink-100" />
        </div>
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="text-ink-500">{error || "Not found"}</p>
          <Link to="/discover" className="btn-primary mt-4 inline-flex">
            Back to discover
          </Link>
        </div>
      </div>
    );
  }

  const authorSummary = author
    ? {
        id: author.id,
        username: author.username,
        name: author.name,
        title: author.title,
        avatar_url: author.avatar_url,
      }
    : null;

  return (
    <div className="min-h-screen">
      <PublicHeader />
      {authorSummary ? (
        <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
          <AuthorBadge author={authorSummary} />
        </div>
      ) : null}
      <CaseStudyArticle study={study} author={author} username={username} />
      <CommentsSection caseStudyId={study.id} />
      <PublicFooter />
    </div>
  );
}
