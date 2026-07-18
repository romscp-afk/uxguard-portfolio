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
      navigate(`/admin/testlab/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <ReadOnlyNotice />
      <Link to="/admin/testlab" className="text-sm text-stone-500 hover:text-ink">
        ← TestLab
      </Link>
      <h1 className="mt-3 font-display text-3xl text-ink">New TestLab project</h1>
      <p className="mt-2 text-sm text-stone-600">
        Confirm you are authorized to test the applications you will add as targets.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-ink">Project name</span>
          <input
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Description</span>
          <textarea
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="flex items-start gap-3 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm">
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
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !confirmed}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create project"}
        </button>
      </form>
    </div>
  );
}
