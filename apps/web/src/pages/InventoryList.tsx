import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category, Item, PaginatedItems } from "@/types";

export function InventoryList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const lowStock = searchParams.get("lowStock") === "1" || searchParams.get("lowStock") === "true";
  const sort = searchParams.get("sort") ?? "updated_desc";

  const [qInput, setQInput] = useState(q);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/api/categories"),
  });

  const listQuery = useQuery({
    queryKey: ["items", { page, pageSize, q, categoryId, lowStock, sort }],
    queryFn: () => {
      const p = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
      });
      if (q) p.set("q", q);
      if (categoryId) p.set("categoryId", categoryId);
      if (lowStock) p.set("lowStock", "true");
      return api<PaginatedItems>(`/api/items?${p.toString()}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["items"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const columns = useMemo<ColumnDef<Item>[]>(
    () => [
      { accessorKey: "sku", header: "SKU", cell: (c) => <span className="font-mono text-xs">{c.getValue() as string}</span> },
      { accessorKey: "name", header: "Name" },
      {
        id: "category",
        header: "Category",
        accessorFn: (row) => row.category?.name ?? "—",
      },
      {
        id: "location",
        header: "Zone / bin",
        accessorFn: (row) => {
          const z = row.zone?.code;
          const b = row.binCode;
          if (!z && !b) return "—";
          return [z, b].filter(Boolean).join(" · ");
        },
      },
      {
        accessorKey: "currentQuantity",
        header: "Qty",
        cell: (c) => {
          const row = c.row.original;
          const low = row.currentQuantity <= row.reorderLevel;
          return (
            <span className={low ? "font-semibold text-amber-800" : ""}>{c.getValue() as number}</span>
          );
        },
      },
      { accessorKey: "reorderLevel", header: "Reorder" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Link
              to={`/inventory/${row.original.id}/edit`}
              className="text-sm font-medium text-teal-700 hover:underline"
            >
              Edit
            </Link>
            {user?.role === "admin" && (
              <button
                type="button"
                className="text-sm font-medium text-red-700 hover:underline"
                onClick={() => {
                  if (confirm(`Delete ${row.original.name}?`)) deleteMutation.mutate(row.original.id);
                }}
              >
                Delete
              </button>
            )}
          </div>
        ),
      },
    ],
    [user?.role, deleteMutation]
  );

  const table = useReactTable({
    data: listQuery.data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: listQuery.data ? Math.ceil(listQuery.data.total / pageSize) : 0,
    state: { pagination: { pageIndex: page - 1, pageSize } },
  });

  function updateParams(next: Record<string, string | undefined>) {
    const n = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === "") n.delete(k);
      else n.set(k, v);
    });
    setSearchParams(n);
  }

  async function exportExcel() {
    const t = getToken();
    const res = await fetch("/api/items/export", {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">Inventory</h1>
          <p className="mt-1 text-slate-600">Search, filter, and manage items.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void exportExcel()}
            className="btn-secondary"
          >
            Export Excel
          </button>
          <Link
            to="/inventory/new"
            className="btn-primary"
          >
            Add item
          </Link>
        </div>
      </div>

      <div className="panel flex flex-wrap items-end gap-3 p-4" data-tour="inventory-filters">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs font-medium text-slate-500">Search</label>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParams({ q: qInput || undefined, page: "1" });
            }}
            placeholder="Name or SKU"
            className="input-base"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Category</label>
          <select
            value={categoryId}
            onChange={(e) => updateParams({ categoryId: e.target.value || undefined, page: "1" })}
            className="input-base mt-1 block min-w-[160px]"
          >
            <option value="">All</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Sort</label>
          <select
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value, page: "1" })}
            className="input-base mt-1 block min-w-[160px]"
          >
            <option value="updated_desc">Recently updated</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="qty_asc">Quantity low → high</option>
            <option value="qty_desc">Quantity high → low</option>
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) =>
              updateParams({ lowStock: e.target.checked ? "1" : undefined, page: "1" })
            }
          />
          Low stock only
        </label>
        <button
          type="button"
          onClick={() => updateParams({ q: qInput || undefined, page: "1" })}
          className="btn-primary"
        >
          Apply
        </button>
      </div>

      <div className="panel overflow-hidden">
        {listQuery.isLoading ? (
          <p className="p-6 text-slate-600">Loading…</p>
        ) : listQuery.isError ? (
          <p className="p-6 text-red-700">
            {listQuery.error instanceof Error ? listQuery.error.message : "Error"}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/90">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 font-semibold text-slate-700">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-cyan-50/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-slate-800">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {listQuery.data && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>
            Page {page} of {Math.max(1, Math.ceil(listQuery.data.total / pageSize))} ·{" "}
            {listQuery.data.total} items
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
              className="btn-secondary px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= Math.ceil(listQuery.data.total / pageSize)}
              onClick={() => updateParams({ page: String(page + 1) })}
              className="btn-secondary px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
