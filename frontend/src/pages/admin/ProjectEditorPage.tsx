import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { UrlOrUploadField } from "../../components/ui/UrlOrUploadField";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAuth } from "../../context/AuthContext";
import { api, ApiError, toStoredAssetUrl } from "../../api/client";
import { canEditPlatform } from "../../lib/roles";
import type { Project, ProjectOutcome } from "../../types";

const STATUSES: Project["status"][] = ["planning", "active", "completed", "archived"];

const emptyProject: Partial<Project> = {
  title: "",
  client: "",
  status: "active",
  description: "",
  start_date: "",
  end_date: "",
  tags: [],
  role: "",
  team: [],
  outcomes: [],
  cover_image: "",
};

export function ProjectEditorPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const isNew = !id || id === "new" || !Number.isFinite(projectId) || projectId <= 0;
  const navigate = useNavigate();
  const { user } = useAuth();
  const readOnly = !canEditPlatform(user);

  const [form, setForm] = useState<Partial<Project>>(emptyProject);
  const [tagsInput, setTagsInput] = useState("");
  const [teamInput, setTeamInput] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    api
      .getProject(projectId)
      .then((project) => {
        if (!cancelled) {
          setForm(project);
          setTagsInput((project.tags || []).join(", "));
          setTeamInput((project.team || []).join(", "));
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Project not found.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew, projectId]);

  function updateField<K extends keyof Project>(key: K, value: Project[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateOutcome(index: number, patch: Partial<ProjectOutcome>) {
    const outcomes = [...(form.outcomes || [])];
    outcomes[index] = { ...outcomes[index], ...patch };
    updateField("outcomes", outcomes);
  }

  async function handleSubmit(e: FormEvent, andExit = false) {
    e.preventDefault();
    if (readOnly) return;
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      cover_image: toStoredAssetUrl(form.cover_image) || form.cover_image || null,
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      team: teamInput
        .split(",")
        .map((member) => member.trim())
        .filter(Boolean),
    };

    try {
      const saved = isNew
        ? await api.createProject(payload)
        : await api.updateProject(projectId, payload);
      if (!saved?.id) {
        throw new ApiError(500, "Project saved without an id. Please refresh and try again.");
      }
      if (andExit) {
        navigate("/admin/projects");
      } else if (isNew) {
        navigate(`/admin/projects/${saved.id}`, { replace: true });
      } else {
        setForm(saved);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (readOnly || isNew) return;
    if (!window.confirm("Delete this project? Linked case studies will be unlinked.")) return;
    try {
      await api.deleteProject(projectId);
      navigate("/admin/projects");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete project.");
    }
  }

  if (loading) {
    return <div className="card h-64 animate-pulse bg-ink-100" />;
  }

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link to="/admin/projects" className="inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
        <EditGuard>
          {!isNew ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
        </EditGuard>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <div className="card p-6">
          <h1 className="font-display text-2xl font-bold text-ink-950">
            {isNew ? "New project" : "Edit project"}
          </h1>
          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label-field">Title</label>
              <input
                className="input-field"
                value={form.title || ""}
                onChange={(e) => updateField("title", e.target.value)}
                required
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="label-field">Client</label>
              <input
                className="input-field"
                value={form.client || ""}
                onChange={(e) => updateField("client", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="label-field">Status</label>
              <select
                className="input-field"
                value={form.status || "active"}
                onChange={(e) => updateField("status", e.target.value as Project["status"])}
                disabled={readOnly}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Your role</label>
              <input
                className="input-field"
                value={form.role || ""}
                onChange={(e) => updateField("role", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="label-field">Start date</label>
              <input
                type="date"
                className="input-field"
                value={form.start_date || ""}
                onChange={(e) => updateField("start_date", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="label-field">End date</label>
              <input
                type="date"
                className="input-field"
                value={form.end_date || ""}
                onChange={(e) => updateField("end_date", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field">Description</label>
              <textarea
                className="input-field min-h-[120px]"
                value={form.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="label-field">Tags (comma-separated)</label>
              <input
                className="input-field"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="label-field">Team (comma-separated)</label>
              <input
                className="input-field"
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="sm:col-span-2">
              <UrlOrUploadField
                label="Cover image"
                value={form.cover_image || ""}
                onChange={(value) => updateField("cover_image", value)}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold text-ink-900">Outcomes & metrics</h2>
            <EditGuard>
              <button
                type="button"
                onClick={() =>
                  updateField("outcomes", [
                    ...(form.outcomes || []),
                    { label: "", value: "", description: "" },
                  ])
                }
                className="btn-secondary py-2 text-xs"
              >
                <Plus className="h-4 w-4" />
                Add outcome
              </button>
            </EditGuard>
          </div>
          <div className="mt-4 space-y-4">
            {(form.outcomes || []).map((outcome, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-ink-100 p-4 sm:grid-cols-3">
                <input
                  className="input-field"
                  placeholder="Label"
                  value={outcome.label}
                  onChange={(e) => updateOutcome(index, { label: e.target.value })}
                  disabled={readOnly}
                />
                <input
                  className="input-field"
                  placeholder="Value"
                  value={outcome.value}
                  onChange={(e) => updateOutcome(index, { value: e.target.value })}
                  disabled={readOnly}
                />
                <input
                  className="input-field"
                  placeholder="Description"
                  value={outcome.description || ""}
                  onChange={(e) => updateOutcome(index, { description: e.target.value })}
                  disabled={readOnly}
                />
              </div>
            ))}
          </div>
        </div>

        <EditGuard>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save project"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={saving}
              onClick={(e) => handleSubmit(e, true)}
            >
              Save & exit
            </button>
          </div>
        </EditGuard>
      </form>
    </div>
  );
}
