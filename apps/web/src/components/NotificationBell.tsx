import { Bell, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

type LowStockRow = {
  id: string;
  sku: string;
  name: string;
  currentQuantity: number;
  reorderLevel: number;
  categoryName: string | null;
};

export function NotificationBell({ sidebar = false }: { sidebar?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alerts", "low-stock"],
    queryFn: () => api<LowStockRow[]>("/api/alerts/low-stock"),
    refetchInterval: 60_000,
  });

  const count = alerts?.length ?? 0;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        data-tour="notifications-bell"
        aria-label={count > 0 ? `${count} low-stock alerts` : "Notifications"}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={
          sidebar
            ? "relative inline-flex items-center rounded-xl px-3 py-2 text-left text-white/85 transition hover:bg-white/10 hover:text-white"
            : "nav-pill nav-pill-idle relative text-slate-600"
        }
      >
        <span className="relative inline-flex items-center">
          <Bell size={16} strokeWidth={2} className={sidebar ? "text-white/90" : open ? "text-teal-700" : ""} />
          {count > 0 && sidebar && (
            <span className="absolute -right-3 -top-2 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 px-1 text-[11px] font-bold leading-none text-white shadow-md ring-2 ring-[#184955]">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </span>
        {count > 0 && !sidebar && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 -translate-y-1/3 translate-x-1/3 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 px-1 text-[9px] font-bold leading-none text-white shadow-md ring-2 ring-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-white/70 bg-white/90 py-0 shadow-glow backdrop-blur-xl"
          role="dialog"
          aria-label="Low stock notifications"
        >
          <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Package size={18} />
              </div>
              <div>
                <p className="font-display text-sm font-bold tracking-tight">Stock alerts</p>
                <p className="text-xs text-white/85">At or below reorder level</p>
              </div>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading && <p className="px-4 py-4 text-sm text-slate-500">Scanning shelves…</p>}
            {!isLoading && count === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">All clear</p>
                <p className="mt-1 text-xs text-slate-500">Nothing needs attention right now.</p>
              </div>
            )}
            {(alerts ?? []).map((a) => (
              <Link
                key={a.id}
                to={`/inventory/${a.id}/edit`}
                onClick={() => setOpen(false)}
                className="group block border-b border-teal-900/5 px-4 py-3 transition hover:bg-gradient-to-r hover:from-teal-50/80 hover:to-transparent"
              >
                <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-900">{a.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">{a.sku}</p>
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                  Qty {a.currentQuantity} · reorder {a.reorderLevel}
                  {a.categoryName ? ` · ${a.categoryName}` : ""}
                </p>
              </Link>
            ))}
          </div>

          <div className="border-t border-teal-900/5 bg-teal-50/30 p-2">
            <Link
              to="/inventory?lowStock=1"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-teal-800 transition hover:bg-white/80"
            >
              Open filtered inventory →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
