import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Cpu,
  LayoutGrid,
  Link2,
  Radio,
  RefreshCw,
  ScanLine,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  IotEventRow,
  ReorderRow,
  RiskResponse,
  SmartOverview,
  WarehouseZone,
} from "@/types";

type WarehouseApi = {
  zones: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    itemCount: number;
    totalUnits: number;
    stockValueApprox: number;
    topMovers: { sku: string; name: string; activity: number }[];
  }[];
  hints: string[];
};

export function SmartOperations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [scanCode, setScanCode] = useState("INV|SKU-MOUSE-02");
  const [zoneForm, setZoneForm] = useState({ code: "", name: "", description: "" });

  const overview = useQuery({
    queryKey: ["smart-overview"],
    queryFn: () => api<SmartOverview>("/api/smart/overview"),
  });

  const risk = useQuery({
    queryKey: ["smart-risk"],
    queryFn: () => api<RiskResponse>("/api/smart/risk"),
  });

  const warehouse = useQuery({
    queryKey: ["smart-warehouse"],
    queryFn: () => api<WarehouseApi>("/api/smart/warehouse"),
  });

  const iot = useQuery({
    queryKey: ["iot-events"],
    queryFn: () => api<IotEventRow[]>("/api/iot/events?limit=40"),
  });

  const reorder = useQuery({
    queryKey: ["smart-reorder"],
    queryFn: () => api<ReorderRow[]>("/api/smart/reorder"),
  });

  const zones = useQuery({
    queryKey: ["zones"],
    queryFn: () => api<WarehouseZone[]>("/api/zones"),
  });

  const generateReorder = useMutation({
    mutationFn: () => api<{ generated: number }>("/api/smart/reorder/generate", { method: "POST", body: "{}" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["smart-reorder"] });
      void qc.invalidateQueries({ queryKey: ["smart-overview"] });
    },
  });

  const patchReorder = useMutation({
    mutationFn: async (args: { id: string; status: "ordered" | "dismissed" }) =>
      api(`/api/smart/reorder/${args.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: args.status }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["smart-reorder"] });
      void qc.invalidateQueries({ queryKey: ["smart-overview"] });
    },
  });

  const createZone = useMutation({
    mutationFn: () =>
      api("/api/zones", {
        method: "POST",
        body: JSON.stringify({
          code: zoneForm.code.trim(),
          name: zoneForm.name.trim(),
          description: zoneForm.description.trim() || null,
        }),
      }),
    onSuccess: () => {
      setZoneForm({ code: "", name: "", description: "" });
      void qc.invalidateQueries({ queryKey: ["zones"] });
      void qc.invalidateQueries({ queryKey: ["smart-warehouse"] });
      void qc.invalidateQueries({ queryKey: ["smart-overview"] });
    },
  });

  const [scanResult, setScanResult] = useState<string | null>(null);
  const simulateScan = useMutation({
    mutationFn: async () => {
      const q = encodeURIComponent(scanCode.trim());
      return api<{ id: string; sku: string; name: string }>(`/api/smart/scan?code=${q}`);
    },
    onSuccess: (data) => {
      setScanResult(`${data.sku} — ${data.name}`);
      void qc.invalidateQueries({ queryKey: ["iot-events"] });
    },
    onError: () => setScanResult(null),
  });

  const simulateIot = useMutation({
    mutationFn: async () => {
      const first = reorder.data?.[0];
      if (!first) throw new Error("No reorder row to attach a demo event to");
      return api("/api/iot/events", {
        method: "POST",
        body: JSON.stringify({
          itemId: first.itemId,
          source: "sensor",
          eventType: "demo_ping",
          message: "Simulated shelf sensor heartbeat",
          metadata: { demo: true },
        }),
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["iot-events"] }),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-tour="smart-hero">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Smart supply chain</p>
          <h1 className="font-display text-3xl font-semibold text-slate-900">Smart operations</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Demand signals, IoT visibility, automated reorder suggestions, warehouse layout hints, and risk alerts — wired
            to your PostgreSQL inventory and the forecasting service.
          </p>
        </div>
        <Link to="/analytics" className="btn-secondary inline-flex items-center gap-2 self-start">
          <Activity size={16} />
          Open demand analytics
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<ShoppingCart size={18} />} label="Pending reorders" value={overview.data?.pendingReorderCount} loading={overview.isLoading} tone="amber" />
        <Kpi icon={<Radio size={18} />} label="IoT events (24h)" value={overview.data?.iotEvents24h} loading={overview.isLoading} tone="teal" />
        <Kpi icon={<AlertTriangle size={18} />} label="SKUs at risk" value={overview.data?.atRiskSkuCount} loading={overview.isLoading} tone="rose" />
        <Kpi icon={<Warehouse size={18} />} label="Warehouse zones" value={overview.data?.warehouseZoneCount} loading={overview.isLoading} tone="slate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-600" size={20} />
            <h2 className="font-display text-lg font-semibold text-slate-900">Risk management</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Proactive signals from stock levels and recent demand forecasts (when available).
          </p>
          {risk.isLoading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
          {risk.data && (
            <p className="mt-3 text-sm text-slate-600">
              <strong className="text-slate-800">{risk.data.summary.high}</strong> high-priority ·{" "}
              <strong className="text-slate-800">{risk.data.summary.medium}</strong> medium
            </p>
          )}
          <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto">
            {(risk.data?.signals ?? []).slice(0, 12).map((s) => (
              <li
                key={`${s.itemId}-${s.type}-${s.title}`}
                className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{s.title}</span>
                  <span
                    className={
                      s.severity === "high"
                        ? "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800"
                        : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"
                    }
                  >
                    {s.severity}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{s.detail}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {s.sku} ·{" "}
                  <Link className="text-teal-700 hover:underline" to={`/inventory/${s.itemId}/edit`}>
                    Open item
                  </Link>
                </p>
              </li>
            ))}
            {risk.data && risk.data.signals.length === 0 && (
              <li className="text-sm text-slate-500">No active risk signals — inventory looks stable.</li>
            )}
          </ul>
        </section>

        <section className="panel p-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-teal-700" size={20} />
            <h2 className="font-display text-lg font-semibold text-slate-900">Warehouse optimization</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">Zone load, pick activity proxy (30d), and layout hints.</p>
          {warehouse.isLoading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
          <ul className="mt-4 space-y-3 text-sm">
            {(warehouse.data?.hints ?? []).map((h) => (
              <li key={h} className="rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2 text-teal-950">
                {h}
              </li>
            ))}
          </ul>
          <div className="mt-4 max-h-56 space-y-3 overflow-y-auto">
            {(warehouse.data?.zones ?? []).map((z) => (
              <div key={z.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {z.code} · {z.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {z.itemCount} SKUs · {z.totalUnits} units · ~${z.stockValueApprox}
                  </span>
                </div>
                {z.topMovers[0] && (
                  <p className="mt-1 text-xs text-slate-600">
                    Top movement: {z.topMovers[0].sku} ({z.topMovers[0].activity} units / 30d)
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="text-slate-700" size={20} />
              <h2 className="font-display text-lg font-semibold text-slate-900">IoT &amp; RFID feed</h2>
            </div>
            <button
              type="button"
              disabled={simulateIot.isPending || !reorder.data?.length}
              onClick={() => simulateIot.mutate()}
              className="btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-40"
              title="Posts a demo event for the first item in the reorder list"
            >
              <RefreshCw size={14} className={simulateIot.isPending ? "animate-spin" : ""} />
              Simulate sensor event
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Real devices POST to <code className="rounded bg-slate-100 px-1 text-xs">/api/iot/events</code> with{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">rfid</code>,{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">sensor</code>, or{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">webhook</code>.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Event</th>
                </tr>
              </thead>
              <tbody>
                {(iot.data ?? []).map((e) => (
                  <tr key={e.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-600">
                      {new Date(e.occurredAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-800">{e.source}</td>
                    <td className="py-2 pr-3">{e.sku}</td>
                    <td className="py-2 pr-3 text-slate-600">{e.eventType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {iot.data && iot.data.length === 0 && <p className="mt-3 text-sm text-slate-500">No telemetry yet.</p>}
          </div>
        </section>

        <section className="panel p-6">
          <div className="flex items-center gap-2">
            <ScanLine className="text-teal-700" size={20} />
            <h2 className="font-display text-lg font-semibold text-slate-900">QR scan simulator</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Resolves <code className="rounded bg-slate-100 px-1 text-xs">INV|SKU</code> payloads and logs a{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">qr_scan</code> event.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              className="input-base min-w-[220px] flex-1"
            />
            <button
              type="button"
              disabled={simulateScan.isPending}
              onClick={() => simulateScan.mutate()}
              className="btn-primary inline-flex items-center gap-2"
            >
              <ScanLine size={16} />
              Resolve
            </button>
          </div>
          {simulateScan.isError && <p className="mt-2 text-sm text-red-700">No match — check the SKU.</p>}
          {scanResult && <p className="mt-2 text-sm font-medium text-teal-800">✓ {scanResult}</p>}
        </section>
      </div>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-teal-700" size={20} />
            <h2 className="font-display text-lg font-semibold text-slate-900">Automated replenishment</h2>
          </div>
          <button
            type="button"
            disabled={generateReorder.isPending}
            onClick={() => generateReorder.mutate()}
            className="btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw size={16} className={generateReorder.isPending ? "animate-spin" : ""} />
            Generate suggestions
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Suggested order quantities when on-hand is at or below reorder. Mark lines as ordered in your procurement flow
          (export to Excel from Inventory, or extend with a supplier module).
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Reason</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(reorder.data ?? []).map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-slate-900">{r.sku}</span>
                    <div className="text-xs text-slate-500">{r.name}</div>
                  </td>
                  <td className="py-2 pr-3">{r.suggestedQty}</td>
                  <td className="py-2 pr-3">{r.status}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.reason}</td>
                  <td className="py-2 pr-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs py-1.5"
                        disabled={patchReorder.isPending}
                        onClick={() => patchReorder.mutate({ id: r.id, status: "ordered" })}
                      >
                        Mark ordered
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                        disabled={patchReorder.isPending}
                        onClick={() => patchReorder.mutate({ id: r.id, status: "dismissed" })}
                      >
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reorder.data && reorder.data.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">No open suggestions — generate from current stock levels.</p>
          )}
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Link2 size={14} />
          Tie this to suppliers on the{" "}
          <Link to="/suppliers" className="font-medium text-teal-700 hover:underline">
            Suppliers
          </Link>{" "}
          page as you grow the workflow.
        </p>
      </section>

      {isAdmin && (
        <section className="panel p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">Warehouse zones (admin)</h2>
          <p className="mt-1 text-sm text-slate-600">Define aisles or pick zones — assign SKUs on the item form.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              placeholder="Code (e.g. C)"
              value={zoneForm.code}
              onChange={(e) => setZoneForm((z) => ({ ...z, code: e.target.value }))}
              className="input-base"
            />
            <input
              placeholder="Name"
              value={zoneForm.name}
              onChange={(e) => setZoneForm((z) => ({ ...z, name: e.target.value }))}
              className="input-base sm:col-span-2"
            />
            <input
              placeholder="Description (optional)"
              value={zoneForm.description}
              onChange={(e) => setZoneForm((z) => ({ ...z, description: e.target.value }))}
              className="input-base sm:col-span-3"
            />
          </div>
          <button
            type="button"
            disabled={createZone.isPending || !zoneForm.code || !zoneForm.name}
            onClick={() => createZone.mutate()}
            className="btn-primary mt-3"
          >
            Add zone
          </button>
          {createZone.isError && (
            <p className="mt-2 text-sm text-red-700">
              {createZone.error instanceof Error ? createZone.error.message : "Could not create zone"}
            </p>
          )}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {(zones.data ?? []).map((z) => (
              <li key={z.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-900">{z.code}</span> · {z.name}
                {z.itemCount != null && <span className="text-slate-500"> — {z.itemCount} items</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number | undefined;
  loading: boolean;
  tone: "teal" | "amber" | "rose" | "slate";
}) {
  const ring =
    tone === "teal"
      ? "border-teal-100 bg-teal-50/50"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50/50"
        : tone === "rose"
          ? "border-rose-100 bg-rose-50/50"
          : "border-slate-200 bg-white";
  return (
    <div className={`panel flex items-center gap-3 p-4 ${ring}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="font-display text-2xl font-semibold text-slate-900">
          {loading ? "…" : value ?? "—"}
        </p>
      </div>
    </div>
  );
}
