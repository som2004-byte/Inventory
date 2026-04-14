import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api, getToken } from "@/lib/api";
import type { Item, PaginatedItems } from "@/types";

type Movement = { id: string; delta: number; reason: string | null; occurredAt: string };

type ForecastResult = {
  itemId: string;
  itemName: string;
  model: string;
  predictions: number[];
  horizonDays: number;
  source?: "fastapi" | "node_fallback";
};

export function Analytics() {
  const [itemId, setItemId] = useState<string>("");
  const [horizon, setHorizon] = useState(14);

  const { data: itemsPage } = useQuery({
    queryKey: ["items", "all-names"],
    queryFn: () => api<PaginatedItems>("/api/items?page=1&pageSize=200&sort=name_asc"),
  });

  const { data: movements } = useQuery({
    queryKey: ["movements", itemId],
    queryFn: () => api<Movement[]>(`/api/items/${itemId}/movements`),
    enabled: Boolean(itemId),
  });

  const forecastMutation = useMutation({
    mutationFn: () =>
      api<ForecastResult>("/api/forecast", {
        method: "POST",
        body: JSON.stringify({ itemId, horizonDays: horizon }),
      }),
  });

  const chartData = (() => {
    if (!movements?.length && !forecastMutation.data) return [];
    const hist = [...(movements ?? [])]
      .reverse()
      .slice(-30)
      .map((m, i) => ({
        label: `H${i + 1}`,
        actual: m.delta,
        forecast: null as number | null,
      }));
    const preds = forecastMutation.data?.predictions ?? [];
    const fut = preds.map((p, i) => ({
      label: `F${i + 1}`,
      actual: null as number | null,
      forecast: p,
    }));
    return [...hist, ...fut];
  })();
  const pieData =
    itemsPage?.data.map((i) => ({
      name: i.name,
      value: (i.unitCost ?? 0) * i.currentQuantity,
    })) ?? [];
  const summary = {
    totalCategories: new Set((itemsPage?.data ?? []).map((i) => i.category?.name ?? "Uncategorized"))
      .size,
    totalItems: itemsPage?.data.length ?? 0,
    totalValue: pieData.reduce((s, i) => s + i.value, 0),
    lowStock: (itemsPage?.data ?? []).filter((i) => i.currentQuantity <= i.reorderLevel).length,
  };
  const PIE_COLORS = ["#0f8a9b", "#22c55e", "#f97316", "#8b5cf6", "#3b82f6"];

  return (
    <div className="space-y-6">
      <div className="panel bg-gradient-to-r from-indigo-900 via-cyan-900 to-teal-900 p-7 text-white">
        <h1 className="font-display text-4xl font-semibold">Analytics</h1>
        <p className="mt-1 text-lg text-cyan-100">Insights and trends for your inventory</p>
      </div>

      <div className="panel flex flex-wrap items-end gap-4 p-5">
        <div>
          <label htmlFor="analytics-item-select" className="text-xs font-medium text-slate-500">
            Item
          </label>
          <select
            id="analytics-item-select"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="input-base mt-1 block min-w-[220px]"
            title="Select item"
          >
            <option value="">Select item…</option>
            {(itemsPage?.data ?? []).map((i: Item) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.sku})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="forecast-days-input" className="text-xs font-medium text-slate-500">
            Forecast days
          </label>
          <input
            id="forecast-days-input"
            type="number"
            min={1}
            max={90}
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="input-base mt-1 w-24"
            title="Forecast days"
            placeholder="30"
          />
        </div>
        <button
          type="button"
          disabled={!itemId || forecastMutation.isPending}
          onClick={() => forecastMutation.mutate()}
          className="btn-primary"
        >
          Run forecast
        </button>
      </div>

      {forecastMutation.isError && <p className="text-sm text-red-700">{forecastMutation.error.message}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-2xl font-semibold text-slate-900">Stock by Category</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(itemsPage?.data ?? []).reduce<{ name: string; count: number }[]>((acc, i) => {
                  const name = i.category?.name ?? "Uncategorized";
                  const e = acc.find((a) => a.name === name);
                  if (e) e.count += 1;
                  else acc.push({ name, count: 1 });
                  return acc;
                }, [])}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="count" fill="#0f8a9b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="text-2xl font-semibold text-slate-900">Value Distribution</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="text-2xl font-semibold text-slate-900">Items per Category</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(itemsPage?.data ?? []).reduce<{ name: string; count: number }[]>((acc, i) => {
                  const name = i.category?.name ?? "Uncategorized";
                  const e = acc.find((a) => a.name === name);
                  if (e) e.count += 1;
                  else acc.push({ name, count: 1 });
                  return acc;
                }, [])}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="text-2xl font-semibold text-slate-900">Summary</h2>
          <div className="mt-6 space-y-4 text-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">Total Categories</span>
              <span className="font-semibold text-[#0f8a9b]">{summary.totalCategories}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">Total Items</span>
              <span className="font-semibold text-[#0f8a9b]">{summary.totalItems}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">Total Value</span>
              <span className="font-semibold text-emerald-600">${summary.totalValue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Low Stock Alerts</span>
              <span className="font-semibold text-orange-600">{summary.lowStock}</span>
            </div>
          </div>
        </div>
      </div>

      {itemId && chartData.length > 0 && (
        <div className="panel p-5">
          <h2 className="text-2xl font-semibold text-slate-900">Forecast Preview</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" name="Movement" stroke="#334155" dot={false} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#0f8a9b" strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="panel p-5">
        <h2 className="text-2xl font-semibold text-slate-900">Assistant</h2>
        <p className="mt-1 text-slate-500">Use the chat below for quick inventory questions.</p>
        <ChatBox />
      </div>
    </div>
  );
}

type ChatTurn = { role: "user" | "assistant"; content: string };

type ChatResponse = {
  reply: string;
  usedLlm?: boolean;
  mode?: "openai" | "rules" | "rules_fallback" | "openai_error";
  hint?: string;
  model?: string;
  usedTools?: string[];
};

type ChatStreamEvent =
  | {
      type: "meta";
      mode?: "openai" | "rules" | "rules_fallback";
      hint?: string;
      model?: string;
      usedTools?: string[];
      usedLlm?: boolean;
    }
  | { type: "chunk"; delta: string }
  | { type: "done"; mode?: "openai" | "rules" | "rules_fallback" }
  | { type: "error"; message: string };

function ChatBox() {
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [lastMeta, setLastMeta] = useState<{ mode: string; hint?: string; model?: string; usedTools?: string[] } | null>(null);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = msg.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setLastMeta(null);
    try {
      const token = getToken();
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!response.ok || !response.body) {
        // Fallback to non-stream endpoint for compatibility.
        const r = await api<ChatResponse>("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            message: text,
            history: history.map(({ role, content }) => ({ role, content })),
          }),
        });
        setHistory((h) => [...h, { role: "user", content: text }, { role: "assistant", content: r.reply }]);
        setLastMeta({ mode: r.mode ?? "unknown", hint: r.hint, model: r.model, usedTools: r.usedTools });
        setMsg("");
        return;
      }

      setHistory((h) => [...h, { role: "user", content: text }]);
      setMsg("");
      let assistant = "";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let evt: ChatStreamEvent;
          try {
            evt = JSON.parse(trimmed) as ChatStreamEvent;
          } catch {
            continue;
          }
          if (evt.type === "meta") {
            setLastMeta({
              mode: evt.mode ?? "unknown",
              hint: evt.hint,
              model: evt.model,
              usedTools: evt.usedTools,
            });
          } else if (evt.type === "chunk") {
            assistant += evt.delta;
            setAssistantDraft(assistant);
          } else if (evt.type === "error") {
            throw new Error(evt.message);
          } else if (evt.type === "done") {
            // No-op; finalized after stream loop.
          }
        }
      }
      if (assistant.trim()) {
        setHistory((h) => [...h, { role: "assistant", content: assistant.trim() }]);
      }
      setAssistantDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setAssistantDraft("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {history.length > 0 && (
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm">
          {history.map((t, i) => (
            <div
              key={`${i}-${t.role}`}
              className={t.role === "user" ? "text-slate-800" : "text-slate-700 pl-2 border-l-2 border-teal-600"}
            >
              <span className="font-semibold text-slate-500">{t.role === "user" ? "You" : "Assistant"}: </span>
              {t.content}
            </div>
          ))}
          {assistantDraft && (
            <div className="border-l-2 border-cyan-600 pl-2 text-slate-700">
              <span className="font-semibold text-slate-500">Assistant: </span>
              {assistantDraft}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
          placeholder='e.g. "What is low stock?" or "Search keyboard"'
          className="input-base flex-1"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void send()}
          className="btn-primary"
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
      {lastMeta && (
        <p className="text-xs text-slate-500">
          Mode: <strong>{lastMeta.mode}</strong>
          {lastMeta.model ? ` · model: ${lastMeta.model}` : ""}
          {lastMeta.usedTools?.length ? ` · tools: ${lastMeta.usedTools.join(", ")}` : ""}
          {lastMeta.hint ? ` — ${lastMeta.hint}` : ""}
        </p>
      )}
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
    </div>
  );
}
