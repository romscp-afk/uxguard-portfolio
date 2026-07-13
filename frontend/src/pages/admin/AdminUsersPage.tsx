import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Pencil, Search, Trash2, Users } from "lucide-react";
import { api, ApiError, resolveAssetUrl } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../lib/roles";
import type { AdminUserSummary } from "../../types";

export function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setUsers(await api.adminListUsers());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin(user)) return;
    void load();
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.username, u.role, u.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [users, query]);

  async function handleDelete(target: AdminUserSummary) {
    if (user && target.id === user.id) {
      setError("You cannot delete your own account here.");
      return;
    }
    const ok = window.confirm(
      `Delete ${target.name} (@${target.username})?\n\nThis removes their profile, case studies, projects, and media metadata.`,
    );
    if (!ok) return;

    setDeletingId(target.id);
    setError("");
    try {
      await api.adminDeleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!isAdmin(user)) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-600">Admin access required to manage users.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Users</h1>
          <p className="mt-1 text-ink-500">
            View, edit, and delete every account on the platform — including Alex and registered users.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input-field pl-9"
            placeholder="Search name, email, username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3 text-sm text-ink-500 sm:px-6">
          <Users className="h-4 w-4" />
          {loading ? "Loading…" : `${filtered.length} user${filtered.length === 1 ? "" : "s"}`}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-ink-700 sm:px-6">User</th>
                <th className="px-4 py-3 font-semibold text-ink-700">Role</th>
                <th className="px-4 py-3 font-semibold text-ink-700">Content</th>
                <th className="px-4 py-3 font-semibold text-ink-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-ink-50/40">
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      {row.avatar_url ? (
                        <img
                          src={resolveAssetUrl(row.avatar_url)}
                          alt=""
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 font-semibold text-brand-700">
                          {(row.name || "?").charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">{row.name}</p>
                        <p className="truncate text-xs text-ink-500">
                          @{row.username} · {row.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 capitalize text-ink-600">{row.role}</td>
                  <td className="px-4 py-4 text-ink-500">
                    {row.case_study_count} studies · {row.project_count} projects
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to={`/admin/users/${row.id}`}
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        View / Edit
                      </Link>
                      <a
                        href={`/u/${row.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-ink-500 hover:text-ink-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Portfolio
                      </a>
                      <button
                        type="button"
                        disabled={deletingId === row.id || row.id === user?.id}
                        onClick={() => void handleDelete(row)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === row.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-ink-500">No users match this search.</p>
        ) : null}
      </div>
    </div>
  );
}
