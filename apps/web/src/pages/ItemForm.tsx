import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Category, Item, WarehouseZone } from "@/types";
import QRCode from "qrcode";

type FormState = {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  zoneId: string;
  binCode: string;
  unit: string;
  reorderLevel: number;
  currentQuantity: number;
  unitCost: string;
};

const empty: FormState = {
  sku: "",
  name: "",
  description: "",
  categoryId: "",
  zoneId: "",
  binCode: "",
  unit: "pcs",
  reorderLevel: 0,
  currentQuantity: 0,
  unitCost: "",
};

export function ItemForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [delta, setDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/api/categories"),
  });

  const { data: zones } = useQuery({
    queryKey: ["zones"],
    queryFn: () => api<WarehouseZone[]>("/api/zones"),
  });

  const { data: existing } = useQuery({
    queryKey: ["item", id],
    queryFn: () => api<Item>(`/api/items/${id}`),
    enabled: !isNew && Boolean(id),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        sku: existing.sku,
        name: existing.name,
        description: existing.description ?? "",
        categoryId: existing.categoryId ?? "",
        zoneId: existing.zoneId ?? "",
        binCode: existing.binCode ?? "",
        unit: existing.unit,
        reorderLevel: existing.reorderLevel,
        currentQuantity: existing.currentQuantity,
        unitCost: existing.unitCost != null ? String(existing.unitCost) : "",
      });
    }
  }, [existing]);

  useEffect(() => {
    if (!isNew && form.sku) {
      void QRCode.toDataURL(`INV|${form.sku}`, { width: 200, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [isNew, form.sku]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        sku: form.sku,
        name: form.name,
        description: form.description || null,
        categoryId: form.categoryId || null,
        zoneId: form.zoneId || null,
        binCode: form.binCode.trim() || null,
        unit: form.unit,
        reorderLevel: form.reorderLevel,
        unitCost: form.unitCost === "" ? null : Number(form.unitCost),
        ...(isNew ? { currentQuantity: form.currentQuantity } : {}),
      };
      if (isNew) {
        return api<Item>("/api/items", { method: "POST", body: JSON.stringify(payload) });
      }
      return api<Item>(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["items"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/inventory");
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const d = Number(delta);
      if (Number.isNaN(d)) throw new Error("Invalid delta");
      return api<Item>(`/api/items/${id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ delta: d, reason: adjustReason || undefined }),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["items"] });
      void qc.invalidateQueries({ queryKey: ["item", id] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setDelta("");
      setAdjustReason("");
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/inventory" className="text-sm font-medium text-teal-700 hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">
          {isNew ? "Add item" : "Edit item"}
        </h1>
      </div>

      <form
        className="panel space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">SKU</label>
            <input
              required
              disabled={!isNew}
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              className="input-base disabled:bg-slate-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input-base"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="input-base"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="input-base"
            >
              <option value="">—</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Warehouse zone</label>
            <select
              value={form.zoneId}
              onChange={(e) => setForm((f) => ({ ...f, zoneId: e.target.value }))}
              className="input-base"
            >
              <option value="">—</option>
              {(zones ?? []).map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code} — {z.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Bin / slot</label>
            <input
              value={form.binCode}
              onChange={(e) => setForm((f) => ({ ...f, binCode: e.target.value }))}
              placeholder="e.g. A-12-03"
              className="input-base"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Unit</label>
            <input
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className="input-base"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Reorder level</label>
            <input
              type="number"
              min={0}
              value={form.reorderLevel}
              onChange={(e) => setForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))}
              className="input-base"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Unit cost</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.unitCost}
              onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
              className="input-base"
            />
          </div>
          {isNew && (
            <div>
              <label className="text-sm font-medium text-slate-700">Initial quantity</label>
              <input
                type="number"
                value={form.currentQuantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currentQuantity: Number(e.target.value) }))
                }
                className="input-base"
              />
            </div>
          )}
        </div>
        {saveMutation.isError && (
          <p className="text-sm text-red-700">
            {saveMutation.error instanceof Error ? saveMutation.error.message : "Save failed"}
          </p>
        )}
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="btn-primary"
        >
          {saveMutation.isPending ? "Saving…" : "Save"}
        </button>
      </form>

      {!isNew && id && (
        <div className="panel p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">QR label (scan payload)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Encodes <code className="rounded bg-slate-100 px-1">INV|{form.sku || "SKU"}</code> — use the Smart Ops scanner or any QR reader app.
          </p>
          <div className="mt-4 flex flex-wrap items-start gap-6">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Item QR" className="rounded-lg border border-slate-200 bg-white p-2" />
            ) : (
              <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-slate-100" />
            )}
            <div className="max-w-md space-y-2 text-sm text-slate-600">
              <p>
                <strong className="text-slate-800">IoT / RFID:</strong> point device integrations at{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">POST /api/iot/events</code> with the item UUID.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isNew && id && (
        <div className="panel p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">Adjust stock</h2>
          <p className="mt-1 text-sm text-slate-600">
            Positive adds stock, negative removes (e.g. sales). Current:{" "}
            <strong>{existing?.currentQuantity ?? "…"}</strong>
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Delta</label>
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="input-base w-32"
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="text-xs font-medium text-slate-500">Reason (optional)</label>
              <input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="input-base"
              />
            </div>
            <button
              type="button"
              disabled={adjustMutation.isPending || delta === ""}
              onClick={() => adjustMutation.mutate()}
              className="btn-primary disabled:opacity-40"
            >
              Apply
            </button>
          </div>
          {adjustMutation.isError && (
            <p className="mt-2 text-sm text-red-700">
              {adjustMutation.error instanceof Error
                ? adjustMutation.error.message
                : "Adjust failed"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
