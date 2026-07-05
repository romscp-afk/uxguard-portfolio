import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { AuthorBadge } from "../../components/case-study/AuthorBadge";
import { CaseStudyArticle } from "../../components/case-study/CaseStudyArticle";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { getUserFromRegistry } from "../../lib/platformRegistry";
import type { CaseStudy, UserProfile } from "../../types";

export function CaseStudyDetailPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const [study, setStudy] = useState<CaseStudy | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username || !slug) return;
    Promise.all([api.getUserCaseStudy(username, slug), api.getUserProfile(username)])
      .then(([cs, profile]) => {
        setStudy(cs);
        setAuthor(profile);
      })
      .catch(async () => {
        const cached = getUserFromRegistry(username);
        if (cached) {
          setAuthor(cached);
          setError("This portfolio is still syncing. Published case studies will appear shortly.");
        } else {
          setError("Case study not found");
        }
      })
      .finally(() => setLoading(false));
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

  if (error || !study || !username) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <p className="text-ink-500">{error || "Not found"}</p>
          <Link to="/" className="btn-primary mt-4 inline-flex">
            Back to discover
          </Link>
        </div>
      </div>
    );
  }

  const authorSummary = author
    ? { id: author.id, username: author.username, name: author.name, title: author.title, avatar_url: author.avatar_url }
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
      <PublicFooter />
    </div>
  );
}
