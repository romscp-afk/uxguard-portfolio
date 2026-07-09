import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Save, Star } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAuth } from "../../context/AuthContext";
import { canEditPlatform } from "../../lib/roles";
import type { CaseStudyListItem, PortfolioBuilderConfig } from "../../types";

const SECTION_TOGGLES: { key: keyof PortfolioBuilderConfig; label: string; phase2?: boolean }[] = [
  { key: "show_profile", label: "Professional profile" },
  { key: "show_projects", label: "Projects" },
  { key: "show_case_studies", label: "Case studies" },
  { key: "show_timeline", label: "Career timeline", phase2: true },
  { key: "show_achievements", label: "Achievements", phase2: true },
  { key: "show_analytics", label: "Portfolio analytics", phase2: true },
];

export function PortfolioBuilderPage() {
  const { user } = useAuth();
  const readOnly = !canEditPlatform(user);
  const [config, setConfig] = useState<PortfolioBuilderConfig | null>(null);
  const [studies, setStudies] = useState<CaseStudyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getPortfolioBuilder(), api.adminListCaseStudies()])
      .then(([builderConfig, caseStudies]) => {
        if (cancelled) return;
        setConfig(builderConfig);
        const order = builderConfig.case_study_order || [];
        const sorted = [...caseStudies].sort((a, b) => {
          const aIndex = order.indexOf(a.id);
          const bIndex = order.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        setStudies(sorted);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load portfolio builder.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function moveStudy(index: number, direction: -1 | 1) {
    const next = [...studies];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setStudies(next);
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            case_study_order: next.map((study) => study.id),
          }
        : prev,
    );
  }

  function toggleFeatured(studyId: number) {
    setConfig((prev) => {
      if (!prev) return prev;
      const featured = new Set(prev.featured_case_study_ids || []);
      if (featured.has(studyId)) featured.delete(studyId);
      else featured.add(studyId);
      return { ...prev, featured_case_study_ids: [...featured] };
    });
  }

  async function handleSave() {
    if (!config || readOnly) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const saved = await api.updatePortfolioBuilder({
        ...config,
        case_study_order: studies.map((study) => study.id),
      });
      setConfig(saved);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save portfolio settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return <div className="card h-64 animate-pulse bg-ink-100" />;
  }

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Portfolio Builder</h1>
          <p className="mt-1 text-ink-500">
            Control what appears on your public portfolio and how case studies are ordered.
          </p>
        </div>
        {user?.portfolio_url ? (
          <Link to={user.portfolio_url} className="btn-secondary">
            View public portfolio
          </Link>
        ) : null}
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Portfolio settings saved.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold text-ink-900">Public sections</h2>
          <div className="mt-4 space-y-3">
            {SECTION_TOGGLES.map(({ key, label, phase2 }) => (
              <label
                key={key}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                  phase2 ? "border-dashed border-ink-200 bg-ink-50" : "border-ink-100"
                }`}
              >
                <span className="text-sm font-medium text-ink-800">
                  {label}
                  {phase2 ? (
                    <span className="ml-2 text-xs font-normal text-ink-400">Phase 2</span>
                  ) : null}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(config[key])}
                  disabled={readOnly || phase2}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-ink-900">Case study order & featured</h2>
          <p className="mt-1 text-sm text-ink-500">
            Reorder published and draft studies for your portfolio layout. Star items to feature them.
          </p>
          <div className="mt-4 space-y-3">
            {studies.length === 0 ? (
              <p className="text-sm text-ink-500">No case studies yet.</p>
            ) : (
              studies.map((study, index) => {
                const featured = (config.featured_case_study_ids || []).includes(study.id);
                return (
                  <div
                    key={study.id}
                    className="flex items-center gap-3 rounded-xl border border-ink-100 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-900">{study.title}</p>
                      <p className="text-xs text-ink-400">{study.status}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFeatured(study.id)}
                      disabled={readOnly}
                      className={`rounded-lg p-2 ${featured ? "text-amber-500" : "text-ink-300"}`}
                      aria-label={featured ? "Unfeature" : "Feature"}
                    >
                      <Star className={`h-4 w-4 ${featured ? "fill-current" : ""}`} />
                    </button>
                    <EditGuard>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveStudy(index, -1)}
                          disabled={index === 0}
                          className="rounded-lg border border-ink-200 p-2 text-ink-500 disabled:opacity-40"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStudy(index, 1)}
                          disabled={index === studies.length - 1}
                          className="rounded-lg border border-ink-200 p-2 text-ink-500 disabled:opacity-40"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </EditGuard>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <EditGuard>
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary mt-6">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save portfolio builder"}
        </button>
      </EditGuard>
    </div>
  );
}
