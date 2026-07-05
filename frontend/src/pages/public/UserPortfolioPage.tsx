import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, Mail, MapPin } from "lucide-react";
import { api } from "../../api/client";
import { CaseStudyCard } from "../../components/case-study/CaseStudyCard";
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
      <div className="min-h-screen">
        <PublicHeader />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="card h-64 animate-pulse bg-ink-100" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <p className="text-ink-500">{error || "Not found"}</p>
          <Link to="/" className="btn-primary mt-4 inline-flex">
            Back to discover
          </Link>
        </div>
      </div>
    );
  }

  const featured = profile.case_studies.filter((s) => s.featured);
  const rest = profile.case_studies.filter((s) => !s.featured);

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="h-24 w-24 rounded-2xl object-cover ring-4 ring-brand-50"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-3xl font-bold text-white">
                {profile.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-600">@{profile.username}</p>
              <h1 className="mt-1 font-display text-4xl font-bold text-ink-950">{profile.name}</h1>
              {profile.title ? <p className="mt-2 text-lg text-ink-600">{profile.title}</p> : null}
              {profile.bio ? <p className="mt-4 max-w-2xl leading-relaxed text-ink-600">{profile.bio}</p> : null}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-500">
                {profile.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </span>
                ) : null}
                {profile.contact_email ? (
                  <a
                    href={`mailto:${profile.contact_email}`}
                    className="inline-flex items-center gap-1.5 hover:text-brand-600"
                  >
                    <Mail className="h-4 w-4" />
                    {profile.contact_email}
                  </a>
                ) : null}
                {profile.cv_url ? (
                  <a
                    href={profile.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-brand-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                    CV / Resume
                  </a>
                ) : null}
              </div>
              {Object.keys(profile.social_links).length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {Object.entries(profile.social_links).map(([key, url]) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold uppercase tracking-wider text-brand-600 hover:text-brand-700"
                    >
                      {key}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8">
          <h2 className="font-display text-2xl font-bold text-ink-950">Case Studies</h2>
          <p className="mt-1 text-ink-500">
            {profile.case_study_count} published {profile.case_study_count === 1 ? "project" : "projects"}
          </p>
        </div>

        {profile.case_studies.length === 0 ? (
          <div className="card p-12 text-center text-ink-500">No published case studies yet.</div>
        ) : (
          <>
            {(featured.length ? featured : profile.case_studies.slice(0, 2)).length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {(featured.length ? featured : profile.case_studies.slice(0, 2)).map((study) => (
                  <CaseStudyCard key={study.id} study={study} username={profile.username} />
                ))}
              </div>
            ) : null}
            {rest.length > 0 ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
