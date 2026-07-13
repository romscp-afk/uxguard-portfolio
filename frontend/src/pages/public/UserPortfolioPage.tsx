import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  ExternalLink,
  FileText,
  FolderKanban,
  Heart,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import { api, resolveAssetUrl } from "../../api/client";
import { CaseStudyCard } from "../../components/case-study/CaseStudyCard";
import { FollowButton } from "../../components/community/FollowButton";
import { ShareBar } from "../../components/community/ShareBar";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { getUserFromRegistry } from "../../lib/platformRegistry";
import {
  mergePublishedIntoProfile,
  syncCachedCaseStudies,
} from "../../lib/caseStudyStore";
import { useAuth } from "../../context/AuthContext";
import type { UserProfile } from "../../types";

function profileFromAuthUser(user: NonNullable<ReturnType<typeof useAuth>["user"]>): UserProfile {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    title: user.title,
    bio: user.bio,
    avatar_url: user.avatar_url,
    cover_image_url: user.cover_image_url,
    contact_email: user.contact_email,
    location: user.location,
    cv_url: user.cv_url,
    social_links: user.social_links ?? {},
    case_studies: [],
    case_study_count: 0,
  };
}

export function UserPortfolioPage() {
  const { username } = useParams<{ username: string }>();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    const profileUsername = username;
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");
      const isOwner = Boolean(authUser && authUser.username === profileUsername);

      try {
        if (isOwner && authUser) {
          await syncCachedCaseStudies(authUser.id);
        }

        const remote = await api.getUserProfile(profileUsername);
        if (cancelled) return;

        const nextProfile =
          isOwner && authUser ? mergePublishedIntoProfile(remote, authUser.id) : remote;
        setProfile(nextProfile);
      } catch {
        if (cancelled) return;

        const cached = getUserFromRegistry(profileUsername);
        if (cached) {
          const nextProfile =
            isOwner && authUser
              ? mergePublishedIntoProfile(
                  {
                    ...cached,
                    case_studies: cached.case_studies || [],
                    case_study_count: cached.case_study_count || 0,
                  },
                  authUser.id,
                )
              : cached;
          setProfile(nextProfile);
          return;
        }

        if (isOwner && authUser) {
          setProfile(profileFromAuthUser(authUser));
          return;
        }

        setError("Researcher not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [username, authUser?.username, authUser?.id]);

  if (loading) {
    return (
      <div className="min-h-screen surface-page">
        <PublicHeader />
        <div className="mx-auto w-full max-w-none px-4 py-20 sm:px-8 lg:px-12 xl:px-16">
          <div className="h-56 animate-pulse rounded-3xl bg-ink-100" />
          <div className="mt-8 card h-40 animate-pulse bg-ink-100" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen surface-page">
        <PublicHeader />
        <div className="mx-auto w-full max-w-none px-4 sm:px-8 lg:px-12 xl:px-16 py-20 text-center">
          <p className="text-ink-500">{error || "Not found"}</p>
          <Link to="/discover" className="btn-primary mt-4 inline-flex">
            Back to discover
          </Link>
        </div>
      </div>
    );
  }

  const featured = profile.case_studies.filter((s) => s.featured);
  const rest = profile.case_studies.filter((s) => !s.featured);
  const showProfile = profile.portfolio_config?.show_profile !== false;
  const totalLikes = profile.case_studies.reduce((sum, study) => sum + (study.like_count || 0), 0);
  const portfolioPath = `/u/${encodeURIComponent(profile.username)}`;

  return (
    <div className="min-h-screen surface-page">
      <PublicHeader />

      {/* Hero band */}
      <section className="relative overflow-hidden border-b border-ink-100">
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950 via-ink-900 to-brand-800" />
        <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl" />

        {profile.cover_image_url ? (
          <div className="relative h-52 w-full sm:h-64 md:h-72">
            <img
              src={resolveAssetUrl(profile.cover_image_url)}
              alt=""
              className="h-full w-full object-cover object-center opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
          </div>
        ) : (
          <div className="relative h-40 sm:h-48" />
        )}

        {showProfile ? (
          <div className="relative mx-auto w-full max-w-none px-4 pb-12 sm:px-8 lg:px-12 xl:px-16">
            <div className={`flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between ${profile.cover_image_url ? "-mt-16" : "-mt-8"}`}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                {profile.avatar_url ? (
                  <img
                    src={resolveAssetUrl(profile.avatar_url)}
                    alt={profile.name}
                    className="h-32 w-32 rounded-[1.75rem] object-cover object-center shadow-2xl ring-4 ring-white/90"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-brand-400 to-brand-700 font-display text-4xl font-bold text-white shadow-2xl ring-4 ring-white/90">
                    {profile.name.charAt(0)}
                  </div>
                )}
                <div className="pb-1 text-white">
                  <p className="text-sm font-semibold tracking-wide text-brand-200">@{profile.username}</p>
                  <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                    {profile.name}
                  </h1>
                  {profile.title ? (
                    <p className="mt-2 max-w-xl text-lg text-ink-200">{profile.title}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {profile.cv_url ? (
                  <a
                    href={resolveAssetUrl(profile.cv_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition hover:bg-brand-50"
                  >
                    <FileText className="h-4 w-4 text-brand-600" />
                    View CV
                    <ExternalLink className="h-3.5 w-3.5 text-ink-400" />
                  </a>
                ) : null}
                <FollowButton
                  username={profile.username}
                  initialFollowing={profile.is_following}
                  followerCount={profile.follower_count || 0}
                  variant="dark"
                  onStatsChange={(stats) =>
                    setProfile((prev) =>
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
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {showProfile ? (
        <section className="border-b border-ink-100 bg-white">
          <div className="mx-auto w-full max-w-none px-4 py-10 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                {profile.bio ? (
                  <p className="max-w-2xl whitespace-pre-wrap text-lg leading-relaxed text-ink-700">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-ink-400">This professional hasn&apos;t added a bio yet.</p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-ink-500">
                  {profile.location ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5">
                      <MapPin className="h-4 w-4 text-brand-600" />
                      {profile.location}
                    </span>
                  ) : null}
                  {profile.contact_email ? (
                    <a
                      href={`mailto:${profile.contact_email}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Mail className="h-4 w-4 text-brand-600" />
                      {profile.contact_email}
                    </a>
                  ) : null}
                  {profile.cv_url ? (
                    <a
                      href={resolveAssetUrl(profile.cv_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 font-medium text-brand-700 hover:bg-brand-100"
                    >
                      <FileText className="h-4 w-4" />
                      View CV
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>

                {Object.keys(profile.social_links || {}).length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {Object.entries(profile.social_links).map(([key, url]) =>
                      url ? (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 hover:text-brand-500"
                        >
                          {key}
                        </a>
                      ) : null,
                    )}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
                {[
                  {
                    label: "Case studies",
                    value: profile.case_study_count,
                    icon: BookOpen,
                  },
                  {
                    label: "Followers",
                    value: profile.follower_count || 0,
                    icon: Users,
                  },
                  {
                    label: "Projects",
                    value: profile.projects?.length || 0,
                    icon: FolderKanban,
                  },
                  {
                    label: "Likes received",
                    value: totalLikes,
                    icon: Heart,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-ink-100 bg-gradient-to-br from-white to-ink-50 p-5 shadow-sm"
                  >
                    <Icon className="h-5 w-5 text-brand-600" />
                    <p className="mt-4 font-display text-3xl font-bold text-ink-950">{value}</p>
                    <p className="text-sm text-ink-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-ink-100 bg-ink-50/80 p-5">
              <ShareBar
                title={`${profile.name} on UXGuard Studio`}
                url={portfolioPath}
                summary={profile.title || profile.bio || `Explore ${profile.name}'s professional portfolio`}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-none px-4 py-16 sm:px-8 lg:px-12 xl:px-16">
        {profile.projects && profile.projects.length > 0 ? (
          <div className="mb-16">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Work</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-ink-950">Projects</h2>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {profile.projects.map((project, index) => (
                <div
                  key={project.id}
                  className="group overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {project.cover_image ? (
                    <img
                      src={resolveAssetUrl(project.cover_image)}
                      alt=""
                      className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className="flex h-44 items-end p-6"
                      style={{
                        background: `linear-gradient(135deg, hsl(${180 + index * 18} 55% 42%), hsl(${200 + index * 12} 45% 22%))`,
                      }}
                    >
                      <p className="font-display text-2xl font-bold text-white/90">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                    </div>
                  )}
                  <div className="p-6">
                    <p className="font-semibold text-ink-900">{project.title}</p>
                    <p className="mt-1 text-sm text-ink-500">{project.client || project.role}</p>
                    {project.description ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">
                        {project.description}
                      </p>
                    ) : null}
                    {project.tags?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {project.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Impact stories</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-ink-950">Case Studies</h2>
          <p className="mt-2 text-ink-500">
            {profile.case_study_count} published{" "}
            {profile.case_study_count === 1 ? "story" : "stories"}
          </p>
        </div>

        {profile.case_studies.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
            No published case studies yet.
          </div>
        ) : (
          <>
            {(featured.length ? featured : profile.case_studies.slice(0, 2)).length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {(featured.length ? featured : profile.case_studies.slice(0, 2)).map((study) => (
                  <CaseStudyCard key={study.id} study={study} username={profile.username} />
                ))}
              </div>
            ) : null}
            {rest.length > 0 ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rest.map((study) => (
                  <CaseStudyCard key={study.id} study={study} username={profile.username} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      <PublicFooter />
    </div>
  );
}
