import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Edit, Eye, Plus } from "lucide-react";
import { EditLink, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAuth } from "../../context/AuthContext";
import { loadMergedCaseStudies } from "../../lib/caseStudyStore";
import type { CaseStudyListItem } from "../../types";

export function CaseStudiesListPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [studies, setStudies] = useState<CaseStudyListItem[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  async function refresh(claimAll = false) {
    if (!user) return;
    setSyncing(true);
    try {
      const result = await loadMergedCaseStudies(user.id, { claimAll });
      setStudies(result.studies);
      setSyncError(result.syncError);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void refresh(false);
  }, [user, location.pathname]);

  const filtered =
    filter === "all" ? studies : studies.filter((s) => s.status === filter);

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Case Studies</h1>
          <p className="mt-1 text-ink-500">Create and manage UX research case studies</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh(true)}
            disabled={syncing || !user}
            className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync to feed"}
          </button>
          <EditLink to="/admin/case-studies/new">
            <Plus className="h-4 w-4" />
            New Case Study
          </EditLink>
        </div>
      </div>
      {syncError ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Offline copies could not fully sync: {syncError}. Open each study and Save/Publish again if it is still missing from the community feed.
        </div>
      ) : null}

      <div className="mb-6 flex gap-2">
        {(["all", "published", "draft"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              filter === f
                ? "bg-brand-600 text-white"
                : "bg-white text-ink-600 hover:bg-ink-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-100 bg-ink-50/50">
            <tr>
              <th className="px-6 py-3 font-semibold text-ink-700">Title</th>
              <th className="px-6 py-3 font-semibold text-ink-700">Client</th>
              <th className="px-6 py-3 font-semibold text-ink-700">Status</th>
              <th className="px-6 py-3 font-semibold text-ink-700">Updated</th>
              <th className="px-6 py-3 font-semibold text-ink-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {filtered.map((study) => (
              <tr key={study.id} className="hover:bg-ink-50/30">
                <td className="px-6 py-4">
                  <p className="font-medium text-ink-900">{study.title}</p>
                  {study.featured ? (
                    <span className="text-xs text-brand-600">Featured</span>
                  ) : null}
                </td>
                <td className="px-6 py-4 text-ink-500">{study.client || "—"}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      study.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {study.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-ink-400">
                  {new Date(study.updated_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/admin/case-studies/${study.id}`}
                      className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    {study.status === "published" ? (
                      <Link
                        to={`/case-studies/${study.slug}`}
                        target="_blank"
                        className="text-ink-400 hover:text-ink-600"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-ink-500">No case studies match this filter.</p>
        ) : null}
      </div>
    </div>
  );
}
