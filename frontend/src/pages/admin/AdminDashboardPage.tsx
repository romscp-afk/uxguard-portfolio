import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  FileText,
  FolderKanban,
  Globe,
  LayoutTemplate,
  Palette,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAssistant } from "../../context/AssistantContext";
import { loadMergedCaseStudies } from "../../lib/caseStudyStore";
import { dashboardLinksForUser, normalizeRole } from "../../lib/roles";
import { ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { api } from "../../api/client";
import type { CaseStudyListItem, Project } from "../../types";

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { setOpen: openAssistant } = useAssistant();
  const [studies, setStudies] = useState<CaseStudyListItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!user) return;
    loadMergedCaseStudies(user.id).then(setStudies);
    api.listProjects().then(setProjects).catch(() => setProjects([]));
  }, [user]);

  if (!user) return null;

  const published = studies.filter((s) => s.status === "published").length;
  const drafts = studies.filter((s) => s.status === "draft").length;
  const { primary } = dashboardLinksForUser(user);
  const role = normalizeRole(user.role);

  const intentLabel =
    user.onboarding_intent === "publish_case_studies"
      ? "Publishing case studies"
      : user.onboarding_intent === "track_career"
        ? "Tracking your career"
        : "Building your portfolio";

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-950">Dashboard</h1>
        <p className="mt-1 text-ink-500">
          Welcome back, {user.name}. {intentLabel} · {role} account
        </p>
      </div>

      <div className="card mb-8 flex flex-col gap-4 border-brand-200 bg-gradient-to-r from-brand-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-semibold text-ink-900">UXGuard AI</h2>
            <p className="mt-1 max-w-xl text-sm text-ink-600">
              Draft case studies, polish your bio, and structure your portfolio with an AI assistant
              built for UX research storytelling.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => openAssistant(true)} className="btn-primary shrink-0">
          <Sparkles className="h-4 w-4" />
          Open AI Assistant
        </button>
      </div>

      <div className="card mb-8 flex flex-col gap-4 border-ink-200 bg-gradient-to-r from-ink-950 to-ink-800 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-300">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-semibold">Templates that feel research-native</h2>
            <p className="mt-1 max-w-xl text-sm text-ink-300">
              Evidence Arc scaffolds, recruiter-ready themes, and one-click starter kits — not generic
              portfolio filler.
            </p>
          </div>
        </div>
        <Link to="/admin/templates" className="btn-primary shrink-0 bg-brand-500 hover:bg-brand-400">
          Browse templates
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Projects", value: projects.length, icon: FolderKanban, color: "text-brand-600" },
          { label: "Case Studies", value: studies.length, icon: FileText, color: "text-brand-600" },
          { label: "Published", value: published, icon: Globe, color: "text-emerald-600" },
          { label: "Drafts", value: drafts, icon: Sparkles, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-6">
            <Icon className={`h-5 w-5 ${color}`} />
            <p className="mt-4 font-display text-3xl font-bold text-ink-950">{value}</p>
            <p className="text-sm text-ink-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="font-semibold text-ink-900">Your platform sections</h2>
        <p className="mt-1 text-sm text-ink-500">
          Quick access to the tools configured for your account.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {primary.map(({ to, label, section }) => {
            const icons: Record<string, typeof UserCircle> = {
              profile: UserCircle,
              projects: FolderKanban,
              templates: LayoutTemplate,
              portfolio: Palette,
              "case-studies": FileText,
            };
            const Icon = icons[section] || FileText;
            return (
              <Link
                key={to}
                to={to}
                className="card flex items-center justify-between p-5 transition hover:border-brand-300"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-brand-600" />
                  <span className="font-medium text-ink-900">{label}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-400" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="border-b border-ink-100 px-6 py-4">
          <h2 className="font-semibold text-ink-900">Recent Case Studies</h2>
        </div>
        <div className="divide-y divide-ink-100">
          {studies.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-ink-500">No case studies yet.</p>
          ) : (
            studies.slice(0, 5).map((study) => (
              <div key={study.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-ink-900">{study.title}</p>
                  <p className="text-xs text-ink-400">
                    {study.client || "No client"} · Updated {new Date(study.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to={`/admin/case-studies/${study.id}`}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Open
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
