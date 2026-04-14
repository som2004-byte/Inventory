import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import type { DashboardSummary, PaginatedItems } from "@/types";

type MetricKey = "total-items" | "low-stock" | "inventory-value" | "activity-days";

const metricMeta: Record<MetricKey, { title: string; subtitle: string }> = {
  "total-items": {
    title: "Total Items Detail",
    subtitle: "Overview of all inventory records and top stock counts.",
  },
  "low-stock": {
    title: "Low Stock Detail",
    subtitle: "Items that need attention soon to avoid stockouts.",
  },
  "inventory-value": {
    title: "Inventory Value Detail",
    subtitle: "Estimated value split from current quantities and unit cost.",
  },
  "activity-days": {
    title: "Activity Days Detail",
    subtitle: "Movement trend and recent net stock changes.",
  },
};

function isMetricKey(v: string | undefined): v is MetricKey {
  return v === "total-items" || v === "low-stock" || v === "inventory-value" || v === "activity-days";
}

export function DashboardDetail() {
  const { metric } = useParams();
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardSummary>("/api/dashboard/summary"),
  });
  const { data: items } = useQuery({
    queryKey: ["items", "dashboard-details"],
    queryFn: () => api<PaginatedItems>("/api/items?page=1&pageSize=500&sort=updated_desc"),
  });

  if (!isMetricKey(metric)) return <Navigate to="/dashboard" replace />;
  if (isLoading) return <p className="text-slate-600">Loading details…</p>;
  if (error || !summary) {
    return <p className="text-red-700">{error instanceof Error ? error.message : "Failed to load details"}</p>;
  }

  const allItems = items?.data ?? [];
  const inventoryValue = allItems.reduce((sum, i) => sum + i.currentQuantity * (i.unitCost ?? 0), 0);
  const topValueItems = useMemo(
    () =>
      [...allItems]
        .map((i) => ({
          id: i.id,
          name: i.name,
          sku: i.sku,
          value: i.currentQuantity * (i.unitCost ?? 0),
          qty: i.currentQuantity,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [allItems]
  );

  const topQuantityItems = useMemo(
    () => [...allItems].sort((a, b) => b.currentQuantity - a.currentQuantity).slice(0, 8),
    [allItems]
  );

  const latestMoves = useMemo(
    () => [...summary.movementTrend].slice(-10).reverse(),
    [summary.movementTrend]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-hero-title">{metricMeta[metric].title}</h1>
          <p className="page-hero-sub mt-1">{metricMeta[metric].subtitle}</p>
        </div>
        <Link to="/dashboard" className="btn-secondary">
          Back to dashboard
        </Link>
      </div>

      {metric === "total-items" && (
        <div className="panel p-5">
          <p className="text-sm text-slate-600">
            You currently track <span className="font-semibold text-slate-900">{summary.itemCount}</span> items across{" "}
            <span className="font-semibold text-slate-900">{summary.categoryCount}</span> categories.
          </p>
          <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">Highest quantity items</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {topQuantityItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-slate-900">
                  {item.name} <span className="text-slate-500">({item.sku})</span>
                </span>
                <span className="text-slate-700">Qty {item.currentQuantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {metric === "low-stock" && (
        <div className="panel p-5">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-rose-700">{summary.lowStockCount}</span> items are currently below reorder level.
          </p>
          <ul className="mt-3 divide-y divide-slate-100">
            {summary.lowStockItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-slate-900">
                  {item.name} <span className="text-slate-500">({item.sku})</span>
                </span>
                <span className="text-slate-700">
                  Qty {item.currentQuantity} / reorder {item.reorderLevel}
                </span>
              </li>
            ))}
          </ul>
          {summary.lowStockItems.length === 0 && (
            <p className="mt-3 text-sm text-emerald-700">Everything is healthy right now.</p>
          )}
        </div>
      )}

      {metric === "inventory-value" && (
        <div className="panel p-5">
          <p className="text-sm text-slate-600">
            Total inventory value is <span className="font-semibold text-slate-900">${inventoryValue.toFixed(2)}</span>.
          </p>
          <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">Top value contributors</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {topValueItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-slate-900">
                  {item.name} <span className="text-slate-500">({item.sku})</span>
                </span>
                <span className="text-slate-700">
                  ${item.value.toFixed(2)} <span className="text-slate-500">(qty {item.qty})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {metric === "activity-days" && (
        <div className="panel p-5">
          <p className="text-sm text-slate-600">
            Trend captures <span className="font-semibold text-slate-900">{summary.movementTrend.length}</span> activity days.
          </p>
          <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">Recent net movement</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {latestMoves.map((m) => (
              <li key={m.date} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-slate-900">{m.date}</span>
                <span className={m.netDelta >= 0 ? "text-emerald-700" : "text-rose-700"}>
                  {m.netDelta >= 0 ? "+" : ""}
                  {m.netDelta}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
