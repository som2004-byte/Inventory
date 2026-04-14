import { Grip, Maximize2, Minimize2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/api";

type ChatTurn = { role: "user" | "assistant"; content: string };

type ChatResponse = {
  reply: string;
  mode?: string;
  hint?: string;
  model?: string;
  usedTools?: string[];
};

type ChatStreamEvent =
  | { type: "meta"; mode?: string; hint?: string; model?: string; usedTools?: string[] }
  | { type: "chunk"; delta: string }
  | { type: "done"; mode?: string }
  | { type: "error"; message: string };

type DockSide = "top" | "left" | "right" | "bottom";

export function ChatbotWidget({ dockSide = "top" }: { dockSide?: DockSide }) {
  const SMALL_SIZE = { width: 380, height: 460 };
  const LARGE_SIZE = { width: 500, height: 620 };
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [width, setWidth] = useState(SMALL_SIZE.width);
  const [height, setHeight] = useState(SMALL_SIZE.height);
  const [meta, setMeta] = useState<{ mode?: string; hint?: string; model?: string; usedTools?: string[] }>({
    mode: "checking",
  });
  const dragRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const nextW = Math.max(320, Math.min(620, dragRef.current.startW + (dragRef.current.startX - e.clientX)));
      const nextH = Math.max(360, Math.min(760, dragRef.current.startH + (dragRef.current.startY - e.clientY)));
      setWidth(nextW);
      setHeight(nextH);
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await api<{ hasOpenAiKey: boolean; mode: string; model: string }>("/api/chat/status");
        if (cancelled) return;
        setMeta((m) => ({ ...m, mode: status.mode, model: status.model }));
      } catch {
        if (!cancelled) setMeta((m) => ({ ...m, mode: "rules", hint: "Could not verify AI status." }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function send() {
    const text = msg.trim();
    if (!text || pending) return;
    setPending(true);
    setDraft("");
    setHistory((h) => [...h, { role: "user", content: text }]);
    setMsg("");
    try {
      const token = getToken();
      const streamRes = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: history.slice(-10).map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!streamRes.ok || !streamRes.body) {
        const r = await api<ChatResponse>("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            message: text,
            history: history.slice(-10).map(({ role, content }) => ({ role, content })),
          }),
        });
        setMeta({ mode: r.mode, hint: r.hint, model: r.model, usedTools: r.usedTools });
        setHistory((h) => [...h, { role: "assistant", content: r.reply }]);
        return;
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: ChatStreamEvent;
          try {
            evt = JSON.parse(line) as ChatStreamEvent;
          } catch {
            continue;
          }
          if (evt.type === "meta") {
            setMeta({ mode: evt.mode, hint: evt.hint, model: evt.model, usedTools: evt.usedTools });
          } else if (evt.type === "chunk") {
            assistant += evt.delta;
            setDraft(assistant);
          } else if (evt.type === "error") {
            throw new Error(evt.message);
          }
        }
      }
      if (assistant.trim()) setHistory((h) => [...h, { role: "assistant", content: assistant.trim() }]);
      setDraft("");
    } catch (e) {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          content: e instanceof Error ? `Oops 😅 ${e.message}` : "Sorry, I could not reply right now.",
        },
      ]);
      setDraft("");
    } finally {
      setPending(false);
    }
  }

  const anchorClass =
    dockSide === "right"
      ? "bottom-5 right-[270px]"
      : dockSide === "bottom"
        ? "bottom-24 right-5"
        : "bottom-5 right-5";
  const chatBodyHeight = Math.max(150, height - 165);
  const isLarge = width >= LARGE_SIZE.width - 8 && height >= LARGE_SIZE.height - 8;

  if (!open) {
    return (
      <button
        type="button"
        data-tour="assistant-fab"
        onClick={() => setOpen(true)}
        className={`group fixed z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-glow ring-2 ring-white/50 transition hover:scale-[1.02] hover:shadow-glow-sm active:scale-[0.98] ${anchorClass}`}
      >
        <Sparkles size={16} className="animate-pulse group-hover:animate-none" />
        Assistant
      </button>
    );
  }

  return (
    <div
      className={`fixed z-30 overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-glow backdrop-blur-xl ${anchorClass}`}
      style={{ width, height }}
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 px-4 py-3 text-white">
        <div>
          <p className="font-display text-sm font-bold tracking-tight">Inventory Assistant</p>
          <p className="text-xs text-white/85">Ask stock, SKU, or categories</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              if (isLarge) {
                setWidth(SMALL_SIZE.width);
                setHeight(SMALL_SIZE.height);
              } else {
                setWidth(LARGE_SIZE.width);
                setHeight(LARGE_SIZE.height);
              }
            }}
            className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/15"
            title={isLarge ? "Shrink" : "Expand"}
            aria-label={isLarge ? "Shrink assistant" : "Expand assistant"}
          >
            {isLarge ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/15"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div
        className="space-y-2 overflow-y-auto bg-gradient-to-b from-teal-50/40 to-slate-50/90 p-3 text-sm"
        style={{ height: chatBodyHeight }}
      >
        {history.length === 0 ? (
          <div className="space-y-2">
            <p className="text-slate-500">Try: "show low stock items"</p>
            <div className="flex flex-wrap gap-2">
              {["📦 Stock summary", "⚠️ Low stock", "🔎 Search keyboard"].map((q) => (
                <button
                  key={q}
                  type="button"
                  className="rounded-full border border-teal-200/60 bg-white/90 px-3 py-1.5 text-xs font-medium text-teal-900 shadow-sm transition hover:border-teal-400 hover:shadow-md"
                  onClick={() => setMsg(q.replace(/^[^ ]+\s/, ""))}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          history.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={
                m.role === "user"
                  ? "ml-8 rounded-2xl rounded-br-md bg-gradient-to-br from-teal-600 to-cyan-600 px-3 py-2 text-white shadow-md"
                  : "mr-8 rounded-2xl rounded-bl-md border border-white/80 bg-white/95 px-3 py-2 text-slate-700 shadow-sm"
              }
            >
              {m.role === "assistant" ? `${m.content}` : m.content}
            </div>
          ))
        )}
        {pending && (
          <div className="mr-8 inline-flex items-center gap-1 rounded-2xl border border-teal-100 bg-white px-3 py-2 text-slate-500 shadow-sm">
            <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-500 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400" />
          </div>
        )}
        {draft && (
          <div className="mr-8 rounded-2xl border border-teal-100 bg-white/95 px-3 py-2 text-slate-700 shadow-sm">
            {draft}
          </div>
        )}
        {meta.mode && (
          <p className="pt-1 text-[11px] text-slate-500">
            mode: <strong>{meta.mode}</strong>
            {meta.model ? ` · model: ${meta.model}` : ""}
            {meta.usedTools?.length ? ` · tools: ${meta.usedTools.join(", ")}` : ""}
          </p>
        )}
        {meta.hint && <p className="text-[11px] text-amber-700">⚠️ {meta.hint}</p>}
      </div>

      <div className="flex gap-2 border-t border-teal-900/5 bg-white/80 p-3 backdrop-blur-sm">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          placeholder="Type your message..."
          className="input-base mt-0 flex-1"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={pending}
          className="btn-primary shrink-0 px-4"
          aria-label="Send message"
        >
          <Send size={14} />
        </button>
      </div>
      <button
        type="button"
        className="absolute left-1 top-12 cursor-nwse-resize rounded-lg p-1 text-teal-600/50 transition hover:bg-teal-50 hover:text-teal-700"
        title="Drag to resize"
        onMouseDown={(e) => {
          dragRef.current = { startX: e.clientX, startY: e.clientY, startW: width, startH: height };
        }}
      >
        <Grip size={12} />
      </button>
    </div>
  );
}
