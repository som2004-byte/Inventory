import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category } from "@/types";

export function CategoriesAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/api/categories"),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      api<Category>("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setEditingId(null);
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["items"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const patchMut = useMutation({
    mutationFn: (vars: { id: string; name: string; description: string | null }) =>
      api<Category>(`/api/categories/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: vars.name, description: vars.description }),
      }),
    onSuccess: () => {
      setEditingId(null);
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["items"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["items"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDescription(c.description ?? "");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="relative">
          <div className="absolute -left-2 top-0 h-14 w-1 rounded-full bg-gradient-to-b from-teal-400 to-cyan-500 opacity-80" aria-hidden />
          <h1 className="page-hero-title pl-4">Categories</h1>
          <p className="page-hero-sub pl-4">Organize your inventory into clear, searchable groups.</p>
        </div>
        {user?.role === "admin" && (
          <button
            type="button"
            onClick={() => setEditingId("new")}
            className="btn-primary inline-flex items-center gap-2 px-6"
          >
            <Plus size={15} />
            Add Category
          </button>
        )}
      </div>

      {editingId === "new" && user?.role === "admin" && (
        <section className="panel p-6">
          <form
            className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              createMut.mutate();
            }}
          >
            <div className="min-w-[220px] flex-1">
              <label htmlFor="cat-name" className="text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                id="cat-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base"
                placeholder="e.g. Electronics"
              />
            </div>
            <div className="min-w-[260px] flex-[2]">
              <label htmlFor="cat-desc" className="text-sm font-medium text-slate-700">
                Description
              </label>
              <input
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-base"
                placeholder="Optional"
              />
            </div>
            <button type="submit" disabled={createMut.isPending} className="btn-primary">
              {createMut.isPending ? "Saving..." : "Save"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </form>
        </section>
      )}

      <section className="panel overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-slate-600">Loading…</p>
        ) : error ? (
          <p className="p-6 text-red-700">
            {error instanceof Error ? error.message : "Failed to load"}
          </p>
        ) : !categories?.length ? (
          <p className="p-6 text-slate-600">No categories yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Description</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Created At</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    {editingId === c.id ? (
                      <>
                        <td className="px-4 py-3 align-top">
                          <label className="sr-only" htmlFor={`edit-name-${c.id}`}>
                            Name
                          </label>
                          <input
                            id={`edit-name-${c.id}`}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="input-base mt-0 w-full px-2 py-1"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <label className="sr-only" htmlFor={`edit-desc-${c.id}`}>
                            Description
                          </label>
                          <input
                            id={`edit-desc-${c.id}`}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="input-base mt-0 w-full px-2 py-1"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="text-sm font-medium text-teal-700 hover:underline"
                              disabled={patchMut.isPending || !editName.trim()}
                              onClick={() =>
                                patchMut.mutate({
                                  id: c.id,
                                  name: editName.trim(),
                                  description: editDescription.trim() || null,
                                })
                              }
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="text-sm text-slate-600 hover:underline"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                        <td className="px-4 py-3 text-slate-600">{c.description ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="rounded p-1 text-[#118a9d] hover:bg-slate-100"
                              onClick={() => startEdit(c)}
                            >
                              <Pencil size={14} />
                            </button>
                            {user?.role === "admin" && (
                              <button
                                type="button"
                                className="rounded p-1 text-rose-600 hover:bg-slate-100"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Delete category “${c.name}”? Items will become uncategorized.`
                                    )
                                  ) {
                                    deleteMut.mutate(c.id);
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
