import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, FileText, Globe, Plus, Sparkles } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type { CaseStudyListItem } from "../../types";

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<CaseStudyListItem[]>([]);

  useEffect(() => {
    api.adminListCaseStudies().then(setStudies);
  }, []);

  const published = studies.filter((s) => s.status === "published").length;
  const drafts = studies.filter((s) => s.status === "draft").length;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Dashboard</h1>
          <p className="mt-1 text-ink-500">Manage your UX research portfolio</p>
        </div>
        <Link to="/admin/case-studies/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          New Case Study
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Case Studies", value: studies.length, icon: FileText, color: "text-brand-600" },
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
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      study.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {study.status}
                  </span>
                  <Link
                    to={`/admin/case-studies/${study.id}`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Edit
                  </Link>
                  {study.status === "published" && user?.username ? (
                    <Link
                      to={`/u/${user.username}/${study.slug}`}
                      className="text-ink-400 hover:text-ink-600"
                      aria-label="View published"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
