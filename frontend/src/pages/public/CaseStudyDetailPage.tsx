import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, resolveAssetUrl } from "../../api/client";
import { AuthorBadge } from "../../components/case-study/AuthorBadge";
import { CaseStudyArticle } from "../../components/case-study/CaseStudyArticle";
import { CaseStudyCard } from "../../components/case-study/CaseStudyCard";
import { CommentsSection } from "../../components/community/CommentsSection";
import { FollowButton } from "../../components/community/FollowButton";
import { LikeButton } from "../../components/community/LikeButton";
import { ShareBar } from "../../components/community/ShareBar";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { DocumentMeta } from "../../components/seo/DocumentMeta";
import { getCaseStudyFromCache, listCachedCaseStudies } from "../../lib/caseStudyStore";
import { getUserFromRegistry } from "../../lib/platformRegistry";
import { getOrCreateViewerKey, sessionViewGuardKey } from "../../lib/viewerKey";
import type { CaseStudy, CaseStudyListItem, UserProfile } from "../../types";

export function CaseStudyDetailPage() {
  const { username: rawUsername, slug: rawSlug } = useParams<{ username: string; slug: string }>();
  const username = rawUsername ? decodeURIComponent(rawUsername) : "";
  const slug = rawSlug ? decodeURIComponent(rawSlug) : "";

  const [study, setStudy] = useState<CaseStudy | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [likeStats, setLikeStats] = useState({ like_count: 0, is_liked: false });
  const relatedRailRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
        setLikeStats({
          like_count: Number(studyResult.value.like_count) || 0,
          is_liked: Boolean(studyResult.value.is_liked),
        });
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

  useEffect(() => {
    if (!study?.id || study.status !== "published") return;

    const guardKey = sessionViewGuardKey(study.id);
    try {
      if (sessionStorage.getItem(guardKey)) return;
      sessionStorage.setItem(guardKey, "1");
    } catch {
      // sessionStorage may be unavailable; still attempt server-side dedupe
    }

    const path = `/u/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
    void api
      .recordCaseStudyView(study.id, {
        viewer_key: getOrCreateViewerKey(),
        path,
      })
      .catch(() => {
        // Analytics must never block reading the case study.
      });
  }, [study?.id, study?.status, username, slug]);

  const relatedStudies = useMemo(() => {
    if (!study) return [];
    const items = (author?.case_studies || []) as CaseStudyListItem[];
    return items
      .filter(
        (item) =>
          Number(item.id) !== Number(study.id) &&
          item.slug !== study.slug &&
          String(item.status || "published").toLowerCase() === "published",
      )
      .slice(0, 3);
  }, [author?.case_studies, study]);

  useEffect(() => {
    const rail = relatedRailRef.current;
    if (!rail) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    function updateScrollState() {
      if (!rail) return;
      const maxScroll = rail.scrollWidth - rail.clientWidth;
      setCanScrollLeft(rail.scrollLeft > 4);
      setCanScrollRight(maxScroll > 4 && rail.scrollLeft < maxScroll - 4);
    }

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [relatedStudies.length, study?.id]);

  function scrollRelated(direction: "left" | "right") {
    const rail = relatedRailRef.current;
    if (!rail) return;
    const amount = Math.max(280, Math.floor(rail.clientWidth * 0.85));
    rail.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }

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

  const sharePath = `/u/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
  const shareSummary = study.summary || study.subtitle || study.title;
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : sharePath;
  const shareImage = study.cover_image ? resolveAssetUrl(study.cover_image) : undefined;
  const pageTitle = `${study.title} · ${author?.name || username} · UXGuard Studio`;

  return (
    <div className="min-h-screen">
      <DocumentMeta
        title={pageTitle}
        description={shareSummary}
        image={shareImage}
        url={shareUrl}
      />
      <PublicHeader />
      {authorSummary ? (
        <div className="mx-auto flex w-full max-w-none flex-wrap items-center justify-between gap-4 px-4 pt-8 sm:px-8 lg:px-12 xl:px-16">
          <AuthorBadge author={authorSummary} />
          {author ? (
            <FollowButton
              username={author.username}
              initialFollowing={author.is_following}
              followerCount={author.follower_count || 0}
              onStatsChange={(stats) =>
                setAuthor((prev) =>
                  prev
                    ? {
                        ...prev,
                        is_following: stats.is_following,
                        follower_count: stats.follower_count,
                      }
                    : prev,
                )
              }
            />
          ) : null}
        </div>
      ) : null}

      <section className="sticky top-0 z-20 border-y border-ink-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12 xl:px-16">
          <LikeButton
            caseStudyId={study.id}
            initialCount={likeStats.like_count}
            initialLiked={likeStats.is_liked}
            onChange={setLikeStats}
          />
          <ShareBar title={study.title} url={sharePath} summary={shareSummary} />
        </div>
      </section>

      <CaseStudyArticle study={study} author={author} username={username} />

      <section className="border-t border-ink-100 bg-ink-50/70">
        <div className="mx-auto flex w-full max-w-none flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12 xl:px-16">
          <div>
            <p className="text-sm font-semibold text-ink-900">Enjoyed this case study?</p>
            <p className="mt-1 text-sm text-ink-500">Like it or share it with your network.</p>
          </div>
          <div className="flex flex-col gap-4 sm:items-end">
            <LikeButton
              caseStudyId={study.id}
              initialCount={likeStats.like_count}
              initialLiked={likeStats.is_liked}
              onChange={setLikeStats}
            />
            <ShareBar title={study.title} url={sharePath} summary={shareSummary} />
          </div>
        </div>
      </section>

      {relatedStudies.length > 0 ? (
        <section className="border-t border-ink-100 bg-white">
          <div className="mx-auto w-full max-w-none px-4 py-12 sm:px-8 lg:px-12 xl:px-16">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                  More from {author?.name || username}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-ink-950">
                  Related case studies
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollRelated("left")}
                    disabled={!canScrollLeft}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Scroll related case studies left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollRelated("right")}
                    disabled={!canScrollRight}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Scroll related case studies right"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {username ? (
                  <Link
                    to={`/u/${encodeURIComponent(username)}`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-500"
                  >
                    View full portfolio
                  </Link>
                ) : null}
              </div>
            </div>

            <div
              ref={relatedRailRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {relatedStudies.map((item) => (
                <div
                  key={item.id}
                  className="w-[min(86vw,320px)] shrink-0 snap-start sm:w-[300px]"
                >
                  <CaseStudyCard study={item} username={username} showSummary />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <CommentsSection caseStudyId={study.id} />
      <PublicFooter />
    </div>
  );
}
