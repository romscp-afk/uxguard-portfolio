import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import { api, ApiError, resolveAssetUrl } from "../../api/client";
import { EditGuard, EditLink, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import type { Project } from "../../types";

const STATUS_LABELS: Record<Project["status"], string> = {
  planning: "Planning",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listProjects()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load projects.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(project: Project) {
    if (!window.confirm(`Delete “${project.title}”? Linked case studies will be unlinked.`)) {
      return;
    }
    setDeletingId(project.id);
    setError("");
    try {
      await api.deleteProject(project.id);
      setProjects((prev) => prev.filter((item) => item.id !== project.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete project.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Projects</h1>
          <p className="mt-1 text-ink-500">
            Manage the work behind your portfolio. Case studies and career artifacts attach to projects.
          </p>
        </div>
        <EditLink to="/admin/projects/new">
          <Plus className="h-4 w-4" />
          New Project
        </EditLink>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card h-40 animate-pulse bg-ink-100" />
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-ink-300" />
          <p className="mt-4 text-sm text-ink-500">No projects yet.</p>
          <EditGuard>
            <EditLink to="/admin/projects/new" className="btn-primary mt-4 inline-flex">
              Create your first project
            </EditLink>
          </EditGuard>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="card overflow-hidden transition hover:border-brand-300 hover:shadow-md"
            >
              <Link to={`/admin/projects/${project.id}`} className="block">
                {project.cover_image ? (
                  <img
                    src={resolveAssetUrl(project.cover_image)}
                    alt=""
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-brand-50">
                    <FolderKanban className="h-8 w-8 text-brand-400" />
                  </div>
                )}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-900">{project.title}</p>
                      <p className="mt-1 text-sm text-ink-500">{project.client || "No client"}</p>
                    </div>
                    <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600">
                      {STATUS_LABELS[project.status] || project.status || "Active"}
                    </span>
                  </div>
                  {project.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-ink-600">{project.description}</p>
                  ) : null}
                  {project.tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
              <EditGuard>
                <div className="flex justify-end border-t border-ink-100 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => handleDelete(project)}
                    disabled={deletingId === project.id}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingId === project.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </EditGuard>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
