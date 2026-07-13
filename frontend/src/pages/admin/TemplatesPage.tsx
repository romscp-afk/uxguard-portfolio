import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  FlaskConical,
  LayoutTemplate,
  Loader2,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAssistant } from "../../context/AssistantContext";
import { useAuth } from "../../context/AuthContext";
import {
  ALL_TEMPLATES,
  TEMPLATE_CATEGORIES,
  portfolioUpdatesFromTemplate,
  stripCaseStudyForCreate,
  stripProjectForCreate,
  templatesByCategory,
  themeLabel,
} from "../../lib/portfolioTemplates";
import { canEditPlatform } from "../../lib/roles";
import type { TemplateCategory, TemplateDefinition } from "../../types";

const ACCENT: Record<TemplateDefinition["accent"], string> = {
  teal: "from-brand-600 to-brand-800",
  ink: "from-ink-800 to-ink-950",
  amber: "from-amber-500 to-orange-700",
  violet: "from-violet-600 to-indigo-900",
};

const BADGE: Record<TemplateDefinition["accent"], string> = {
  teal: "bg-brand-50 text-brand-700",
  ink: "bg-ink-100 text-ink-700",
  amber: "bg-amber-50 text-amber-800",
  violet: "bg-violet-50 text-violet-700",
};

export function TemplatesPage() {
  const { user, refreshUser, logout } = useAuth();
  const { setOpen: openAssistant } = useAssistant();
  const navigate = useNavigate();
  const readOnly = !canEditPlatform(user);
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(ALL_TEMPLATES[0]?.id || null);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [appliedId, setAppliedId] = useState<string | null>(
    user?.portfolio_config?.applied_template_id || null,
  );

  const templates = useMemo(() => templatesByCategory(category), [category]);
  const selected = useMemo(
    () => ALL_TEMPLATES.find((t) => t.id === selectedId) || templates[0] || null,
    [selectedId, templates],
  );

  function requireSession() {
    const token = localStorage.getItem("uxguard_token");
    if (!token || !user) {
      setMessageType("error");
      setMessage("Your session expired. Please log in again to apply templates.");
      logout();
      navigate("/admin/login", { state: { from: "/admin/templates" }, replace: true });
      return false;
    }
    return true;
  }

  async function applyTemplate(template: TemplateDefinition) {
    if (readOnly || applying) return;
    if (!requireSession()) return;

    setApplying(true);
    setMessage("");
    try {
      const createdIds: number[] = [];
      let projectId: number | undefined;
      let profileUpdated = false;

      // Always persist theme / section config first so theme-only templates still work.
      const configPatch = {
        ...portfolioUpdatesFromTemplate(template),
        applied_template_id: template.id,
      };
      await api.updatePortfolioBuilder(configPatch);

      if (template.profile && (template.profile.title || template.profile.bio)) {
        const patch: { title?: string; bio?: string } = {};
        if (template.profile.title && !user?.title?.trim()) patch.title = template.profile.title;
        if (template.profile.bio && !user?.bio?.trim()) patch.bio = template.profile.bio;
        if (Object.keys(patch).length) {
          await api.updateMe(patch);
          profileUpdated = true;
          try {
            await refreshUser();
          } catch {
            // Profile was saved; ignore refresh failures.
          }
        }
      }

      if (template.project) {
        const project = await api.createProject(stripProjectForCreate(template.project));
        projectId = project.id;
      }

      const caseDrafts = [
        ...(template.caseStudies || []),
        ...(template.caseStudy ? [template.caseStudy] : []),
      ];

      for (const draft of caseDrafts) {
        const payload = stripCaseStudyForCreate(draft);
        if (projectId) payload.project_id = projectId;
        const created = await api.createCaseStudy(payload);
        if (created?.id) createdIds.push(created.id);
      }

      if (createdIds.length) {
        await api.updatePortfolioBuilder({
          ...configPatch,
          featured_case_study_ids: createdIds.slice(0, 2),
          case_study_order: createdIds,
        });
      }

      setAppliedId(template.id);

      const bits: string[] = [];
      if (template.theme) bits.push(`${themeLabel(template.theme)} theme`);
      if (createdIds.length) bits.push(`${createdIds.length} case draft${createdIds.length > 1 ? "s" : ""}`);
      if (projectId) bits.push("a project");
      if (profileUpdated) bits.push("profile copy");

      setMessageType("success");
      setMessage(
        bits.length
          ? `Applied “${template.name}”: ${bits.join(", ")}. Review drafts, then ask UXGuard AI to personalize.`
          : `Applied “${template.name}”.`,
      );

      if (createdIds.length === 1 && template.category === "case_study") {
        navigate(`/admin/case-studies/${createdIds[0]}`);
        return;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setMessageType("error");
        setMessage("Your session expired. Please log in again to apply templates.");
        logout();
        navigate("/admin/login", { state: { from: "/admin/templates" }, replace: true });
        return;
      }
      setMessageType("error");
      setMessage(err instanceof ApiError ? err.message : "Could not apply template.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            UXGuard exclusive
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-950">Templates</h1>
          <p className="mt-1 max-w-2xl text-ink-500">
            Research-native scaffolds, recruiter-ready themes, and one-click starter kits — built for
            UX evidence storytelling, not generic portfolio filler.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openAssistant(true)} className="btn-secondary">
            <Sparkles className="h-4 w-4" />
            Ask AI to personalize
          </button>
          <Link to="/admin/portfolio-builder" className="btn-secondary">
            Portfolio builder
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setCategory(cat.id);
              const next = templatesByCategory(cat.id)[0];
              if (next) setSelectedId(next.id);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              category === cat.id
                ? "bg-brand-600 text-white"
                : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {message ? (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            messageType === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7 xl:grid-cols-2">
          {templates.map((template) => {
            const active = selected?.id === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={`overflow-hidden rounded-2xl border text-left transition ${
                  active
                    ? "border-brand-400 shadow-md ring-2 ring-brand-200"
                    : "border-ink-100 bg-white hover:border-brand-200 hover:shadow-sm"
                }`}
              >
                <div className={`h-24 bg-gradient-to-br ${ACCENT[template.accent]} p-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                      {template.badge}
                    </span>
                    {appliedId === template.id ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Check className="h-3 w-3" /> Applied
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 font-display text-lg font-bold text-white">{template.name}</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-sm font-medium text-ink-800">{template.tagline}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-500">
                    {template.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {template.previewSections.slice(0, 3).map((section) => (
                      <span
                        key={section}
                        className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-medium text-ink-600"
                      >
                        {section}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-5">
          {selected ? (
            <div className="card sticky top-8 overflow-hidden">
              <div className={`bg-gradient-to-br ${ACCENT[selected.accent]} px-6 py-8 text-white`}>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${BADGE[selected.accent]} bg-white/90`}>
                  {selected.category.replace("_", " ")}
                </span>
                <h2 className="mt-4 font-display text-2xl font-bold">{selected.name}</h2>
                <p className="mt-2 text-sm text-white/85">{selected.tagline}</p>
              </div>
              <div className="space-y-5 p-6">
                <p className="text-sm leading-relaxed text-ink-600">{selected.description}</p>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Built for
                  </p>
                  <p className="mt-1 text-sm text-ink-800">{selected.audience}</p>
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    <FlaskConical className="h-3.5 w-3.5 text-brand-600" />
                    Rigor checklist
                  </p>
                  <ul className="space-y-2">
                    {selected.rigorHints.map((hint) => (
                      <li key={hint} className="flex items-start gap-2 text-sm text-ink-700">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                        {hint}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Includes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.previewSections.map((section) => (
                      <span
                        key={section}
                        className="rounded-lg border border-ink-100 bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700"
                      >
                        {section}
                      </span>
                    ))}
                    {selected.theme ? (
                      <span className="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                        {themeLabel(selected.theme)} theme
                      </span>
                    ) : null}
                  </div>
                </div>

                <EditGuard>
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => applyTemplate(selected)}
                    className="btn-primary w-full"
                  >
                    {applying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Applying…
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        {selected.category === "theme"
                          ? "Apply theme"
                          : selected.category === "case_study"
                            ? "Create draft from template"
                            : "Apply starter kit"}
                      </>
                    )}
                  </button>
                </EditGuard>

                <p className="text-xs text-ink-400">
                  Drafts stay unpublished until you review and publish. Pair with UXGuard AI to replace
                  placeholders with your real evidence.
                </p>
              </div>
            </div>
          ) : (
            <div className="card flex h-64 items-center justify-center text-sm text-ink-400">
              <LayoutTemplate className="mr-2 h-5 w-5" />
              Select a template
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
