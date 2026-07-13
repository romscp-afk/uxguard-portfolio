import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CreditCard,
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
import type { BillingUsageSummary, CaseStudyListItem, Project } from "../../types";

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { setOpen: openAssistant } = useAssistant();
  const [studies, setStudies] = useState<CaseStudyListItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [billing, setBilling] = useState<BillingUsageSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    loadMergedCaseStudies(user.id).then(setStudies);
    api.listProjects().then(setProjects).catch(() => setProjects([]));
    api.getBillingSubscription().then(setBilling).catch(() => setBilling(null));
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

  const planName = billing
    ? billing.is_admin_comp || billing.plan.code === "admin"
      ? "Admin · Unlimited"
      : billing.plan.name
    : null;

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500 sm:text-base">
            Welcome back, {user.name}. {intentLabel} · {role} account
          </p>
        </div>
        {planName ? (
          <Link
            to="/admin/billing"
            className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
          >
            <CreditCard className="h-3.5 w-3.5 shrink-0 text-brand-600" />
            <span className="truncate">{planName}</span>
            <span className="text-ink-400">· Billing</span>
          </Link>
        ) : null}
      </div>

      <div className="card mb-6 flex flex-col gap-4 border-brand-200 bg-gradient-to-r from-brand-50 to-white p-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 sm:h-12 sm:w-12">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink-900">UXGuard AI</h2>
            <p className="mt-1 text-sm text-ink-600">
              Draft case studies, polish your bio, and structure your portfolio with AI built for UX
              storytelling.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link to="/admin/ai" className="btn-primary">
            <Sparkles className="h-4 w-4" />
            Open UXGuard AI
          </Link>
          <button type="button" onClick={() => openAssistant(true)} className="btn-secondary">
            Quick editor AI
          </button>
        </div>
      </div>

      <div className="card mb-6 flex flex-col gap-4 border-ink-200 bg-gradient-to-r from-ink-950 to-ink-800 p-4 text-white sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-300 sm:h-12 sm:w-12">
            <LayoutTemplate className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold">Templates that feel research-native</h2>
            <p className="mt-1 text-sm text-ink-300">
              Evidence Arc scaffolds and starter kits — not generic portfolio filler.
            </p>
          </div>
        </div>
        <Link to="/admin/templates" className="btn-primary shrink-0 bg-brand-500 hover:bg-brand-400">
          Browse templates
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Projects", value: projects.length, icon: FolderKanban, color: "text-brand-600" },
          { label: "Case Studies", value: studies.length, icon: FileText, color: "text-brand-600" },
          { label: "Published", value: published, icon: Globe, color: "text-emerald-600" },
          { label: "Drafts", value: drafts, icon: Sparkles, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 sm:p-6">
            <Icon className={`h-5 w-5 ${color}`} />
            <p className="mt-3 font-display text-2xl font-bold text-ink-950 sm:mt-4 sm:text-3xl">{value}</p>
            <p className="text-xs text-ink-500 sm:text-sm">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 sm:mb-8">
        <h2 className="font-semibold text-ink-900">Your platform sections</h2>
        <p className="mt-1 text-sm text-ink-500">Quick access to the tools for your account.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {primary.map(({ to, label, section }) => {
            const icons: Record<string, typeof UserCircle> = {
              profile: UserCircle,
              projects: FolderKanban,
              ai: Sparkles,
              templates: LayoutTemplate,
              portfolio: Palette,
              "case-studies": FileText,
              billing: CreditCard,
            };
            const Icon = icons[section] || FileText;
            return (
              <Link
                key={to}
                to={to}
                className="card flex items-center justify-between gap-3 p-4 transition hover:border-brand-300 sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0 text-brand-600" />
                  <span className="truncate font-medium text-ink-900">{label}</span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 px-4 py-4 sm:px-6">
          <h2 className="font-semibold text-ink-900">Recent Case Studies</h2>
        </div>
        <div className="divide-y divide-ink-100">
          {studies.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-500 sm:px-6">No case studies yet.</p>
          ) : (
            studies.slice(0, 5).map((study) => (
              <div
                key={study.id}
                className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{study.title}</p>
                  <p className="text-xs text-ink-400">
                    {study.client || "No client"} · Updated{" "}
                    {new Date(study.updated_at).toLocaleDateString()}
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
