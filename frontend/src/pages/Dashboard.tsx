import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Activity, AlertTriangle, Boxes, DollarSign } from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardSummary, PaginatedItems } from "@/types";
import { Link } from "react-router-dom";

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardSummary>("/api/dashboard/summary"),
  });
  const { data: items } = useQuery({
    queryKey: ["items", "dashboard-total"],
    queryFn: () => api<PaginatedItems>("/api/items?page=1&pageSize=500&sort=updated_desc"),
  });

  if (isLoading) return <p className="text-slate-600">Loading dashboard…</p>;
  if (error || !data)
    return <p className="text-red-700">{error instanceof Error ? error.message : "Error"}</p>;
  const totalValue =
    items?.data.reduce((sum, i) => sum + i.currentQuantity * (i.unitCost ?? 0), 0) ?? 0;

  return (
    <div className="space-y-8">
      <div className="relative" data-tour="dashboard-hero">
        <div className="absolute -left-2 top-0 h-16 w-1 rounded-full bg-gradient-to-b from-teal-400 to-cyan-500 opacity-80" aria-hidden />
        <h1 className="page-hero-title pl-4">Dashboard</h1>
        <p className="page-hero-sub pl-4">Live pulse of stock, value, and movement across your warehouse.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total items"
          value={data.itemCount}
          icon={<Boxes size={18} />}
          gradient="from-sky-500 to-blue-600"
          to="/dashboard/details/total-items"
        />
        <KpiCard
          label="Low stock"
          value={data.lowStockCount}
          icon={<AlertTriangle size={18} />}
          gradient="from-amber-500 to-rose-500"
          to="/dashboard/details/low-stock"
        />
        <KpiCard
          label="Inventory value"
          value={`$${totalValue.toFixed(2)}`}
          icon={<DollarSign size={18} />}
          gradient="from-emerald-500 to-teal-600"
          to="/dashboard/details/inventory-value"
        />
        <KpiCard
          label="Activity days"
          value={data.movementTrend.length}
          icon={<Activity size={18} />}
          gradient="from-violet-500 to-fuchsia-500"
          to="/dashboard/details/activity-days"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">Stock by category</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.stockByCategory}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#0f766e" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="quantity" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Net movement (30 days)
          </h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.movementTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="netDelta" stroke="#0d9488" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">Low stock items</h2>
          <Link
            to="/inventory?lowStock=1"
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            View in inventory
          </Link>
        </div>
        {data.lowStockItems.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">All clear — nothing at reorder level.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {data.lowStockItems.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-slate-900">{i.name}</span>
                <span className="text-slate-600">
                  Qty {i.currentQuantity} / reorder {i.reorderLevel}
                  {i.categoryName ? ` · ${i.categoryName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  gradient,
  to,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  gradient: string;
  to?: string;
}) {
  const card = (
    <div className="panel group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-glow-sm">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-25 blur-2xl transition duration-300 group-hover:opacity-40`}
      />
      <div className="relative">
        <div className="min-w-0 pr-16">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 truncate font-display text-[2rem] font-bold leading-none tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`absolute right-0 top-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md ring-2 ring-white/50`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  if (!to) return card;
  return (
    <Link to={to} className="block">
      {card}
    </Link>
  );
}
