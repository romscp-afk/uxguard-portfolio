import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";

export function TestLabCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { project } = await api.createTestLabProject({
        name,
        description,
        ownership_confirmed: confirmed,
      });
      if (!project?.id) {
        throw new Error("Project was created but no id was returned. Refresh TestLab and try again.");
      }
      navigate(`/admin/testlab/${project.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl text-ink-900">
      <ReadOnlyNotice />
      <Link
        to="/admin/testlab"
        className="text-sm font-medium text-ink-600 underline-offset-2 hover:text-ink-950 hover:underline"
      >
        ← TestLab
      </Link>
      <h1 className="mt-3 font-display text-3xl text-ink-950">New TestLab project</h1>
      <p className="mt-2 text-sm text-ink-600">
        Confirm you are authorized to test the applications you will add as targets.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-5 rounded-xl border border-ink-200 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium text-ink-800">Project name</span>
          <input
            className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink-800">Description</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm text-ink-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            required
          />
          <span>
            I confirm I own or am authorized to test the websites and applications associated with
            this project, including staging and production targets I will verify.
          </span>
        </label>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !confirmed}
          className="rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-800 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create project"}
        </button>
      </form>
    </div>
  );
}
