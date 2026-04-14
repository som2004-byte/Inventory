import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ChatbotWidget } from "./chatbot/ChatbotWidget";
import { NotificationBell } from "./NotificationBell";
import { AppTutorial } from "./AppTutorial";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-pill ${isActive ? "nav-pill-active" : "nav-pill-idle"}`;

type DockSide = "top" | "left" | "right" | "bottom";

export function Layout() {
  const { user, logout } = useAuth();
  const displayName = user?.email?.split("@")[0].replace(/[._-]/g, " ") ?? "User";
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [dockMenuOpen, setDockMenuOpen] = useState(false);
  const [dockSide, setDockSide] = useState<DockSide>(() => {
    const s = localStorage.getItem("inventory_nav_dock_v1");
    if (s === "top" || s === "left" || s === "right" || s === "bottom") return s;
    return "top";
  });

  useEffect(() => {
    const seen = localStorage.getItem("inventory_tutorial_completed_v1");
    if (!seen) setTutorialOpen(true);
  }, []);

  function closeTutorial() {
    setTutorialOpen(false);
    localStorage.setItem("inventory_tutorial_completed_v1", "true");
  }

  function reopenTutorial() {
    setTutorialOpen(true);
  }

  function updateDock(side: DockSide) {
    setDockSide(side);
    setDockMenuOpen(false);
    localStorage.setItem("inventory_nav_dock_v1", side);
  }

  const isHorizontalDock = dockSide === "top" || dockSide === "bottom";
  const verticalItemClass =
    "w-full min-h-[48px] justify-start gap-3 rounded-xl px-3 py-2.5 text-base font-medium text-white/90 transition hover:bg-white/10 hover:text-white";
  const verticalActiveClass = "!bg-white/15 !text-teal-100 ring-1 ring-white/20";

  const primaryNavLinks = (
    <>
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          isHorizontalDock
            ? `${linkClass({ isActive })} justify-center`
            : `${verticalItemClass} ${isActive ? verticalActiveClass : ""}`
        }
      >
        <span className="inline-flex w-6 justify-center text-base leading-none">🏠</span>
        Dashboard
      </NavLink>
      <NavLink
        to="/inventory"
        className={({ isActive }) =>
          isHorizontalDock
            ? `${linkClass({ isActive })} justify-center`
            : `${verticalItemClass} ${isActive ? verticalActiveClass : ""}`
        }
      >
        <span className="inline-flex w-6 justify-center text-base leading-none">📦</span>
        Inventory
      </NavLink>
      <NavLink
        to="/suppliers"
        className={({ isActive }) =>
          isHorizontalDock
            ? `${linkClass({ isActive })} justify-center`
            : `${verticalItemClass} ${isActive ? verticalActiveClass : ""}`
        }
      >
        <span className="inline-flex w-6 justify-center text-base leading-none">🤝</span>
        Suppliers
      </NavLink>
      <NavLink
        to="/analytics"
        className={({ isActive }) =>
          isHorizontalDock
            ? `${linkClass({ isActive })} justify-center`
            : `${verticalItemClass} ${isActive ? verticalActiveClass : ""}`
        }
      >
        <span className="inline-flex w-6 justify-center text-base leading-none">📊</span>
        Analytics
      </NavLink>
      <NavLink
        to="/smart-ops"
        className={({ isActive }) =>
          isHorizontalDock
            ? `${linkClass({ isActive })} justify-center`
            : `${verticalItemClass} ${isActive ? verticalActiveClass : ""}`
        }
      >
        <span className="inline-flex w-6 justify-center text-base leading-none">⚙️</span>
        Smart ops
      </NavLink>
      <NavLink
        to="/categories"
        className={({ isActive }) =>
          isHorizontalDock
            ? `${linkClass({ isActive })} justify-center`
            : `${verticalItemClass} ${isActive ? verticalActiveClass : ""}`
        }
      >
        <span className="inline-flex w-6 justify-center text-base leading-none">🗂️</span>
        Categories
      </NavLink>
    </>
  );

  const utilityNavLinks = (
    <>
      <button
        type="button"
        onClick={reopenTutorial}
        className={
          isHorizontalDock
            ? "nav-pill nav-pill-idle justify-center"
            : "w-full min-h-[48px] justify-start gap-3 rounded-xl px-3 py-2.5 text-base font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
        }
      >
        <span className="inline-flex w-6 justify-center text-base leading-none">🎓</span>
        Tutorial
      </button>
      <div className={`${isHorizontalDock ? "flex justify-center" : "w-full"}`}>
        <NotificationBell sidebar={!isHorizontalDock} />
      </div>
    </>
  );

  const dockControls = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setDockMenuOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-lg border border-white/80 bg-white px-2.5 py-1.5 text-slate-700 shadow-sm transition hover:bg-slate-50"
        title="Dock options"
      >
        <SlidersHorizontal size={14} strokeWidth={2} />
      </button>
      {dockMenuOpen && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[168px] rounded-xl border border-white/70 bg-white/95 p-1.5 shadow-lg backdrop-blur">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dock bar</p>
          <div className="grid grid-cols-2 gap-1">
            <DockButton
              active={dockSide === "top"}
              label="Top"
              icon={<ArrowUp size={12} />}
              onClick={() => updateDock("top")}
            />
            <DockButton
              active={dockSide === "left"}
              label="Left"
              icon={<ArrowLeft size={12} />}
              onClick={() => updateDock("left")}
            />
            <DockButton
              active={dockSide === "right"}
              label="Right"
              icon={<ArrowRight size={12} />}
              onClick={() => updateDock("right")}
            />
            <DockButton
              active={dockSide === "bottom"}
              label="Bottom"
              icon={<ArrowDown size={12} />}
              onClick={() => updateDock("bottom")}
            />
          </div>
        </div>
      )}
    </div>
  );

  const mainPadding =
    dockSide === "left"
      ? "md:pl-[292px]"
      : dockSide === "right"
        ? "md:pr-[292px]"
        : dockSide === "bottom"
          ? "pb-24"
          : "";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/55 shadow-sm backdrop-blur-xl">
        <div
          className="h-1 w-full bg-gradient-to-r from-teal-400 via-cyan-500 to-rose-300"
          aria-hidden
        />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/Logo.png"
              alt="Inventra AI logo"
              className="h-11 w-11 shrink-0 rounded-xl bg-white/80 object-cover object-top ring-1 ring-white/90"
            />
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold leading-tight text-slate-900">Inventra AI</p>
              <p className="truncate text-xs font-medium text-teal-800/70">
                Hi, <span className="text-slate-700">{displayName}</span>
              </p>
            </div>
          </div>
        </div>
        {user && dockSide === "top" && (
          <div className="flex w-full flex-wrap items-center justify-between gap-1 border-t border-white/70 bg-white/92 px-3 py-2 sm:px-4">
            <nav className="flex flex-1 flex-wrap items-center gap-1">
              <div className="flex w-full flex-wrap items-center justify-between gap-1">
                {primaryNavLinks}
                {utilityNavLinks}
              </div>
            </nav>
            <div className="ml-2 shrink-0">{dockControls}</div>
          </div>
        )}
      </header>

      {user && dockSide !== "top" && (
        <aside
          className={`fixed z-30 hidden border-white/70 bg-white/85 p-3 shadow-lg backdrop-blur-xl md:block ${
            dockSide === "left"
              ? "left-2 top-[110px] bottom-2 w-[250px] rounded-2xl border border-teal-200/30 bg-gradient-to-b from-[#1c5660] via-[#194a57] to-[#163f4c] text-white"
              : dockSide === "right"
                ? "right-2 top-[110px] bottom-2 w-[250px] rounded-2xl border border-teal-200/30 bg-gradient-to-b from-[#1c5660] via-[#194a57] to-[#163f4c] text-white"
                : "bottom-0 left-0 w-full border-t border-white/70 bg-white/92"
          }`}
        >
          <div className="absolute right-2 top-3 z-40">{dockControls}</div>
          <nav
            className={`flex h-full ${isHorizontalDock ? "w-full gap-1 px-2 py-1" : "flex-col gap-2"}`}
          >
            {isHorizontalDock ? (
              <div className="flex w-full flex-wrap items-center justify-between gap-1">
                {primaryNavLinks}
                {utilityNavLinks}
              </div>
            ) : (
              <div className="flex h-full flex-col justify-between">
                <div className="mb-2 flex items-center gap-2 border-b border-white/15 pb-3 pr-10">
                  <img src="/Logo.png" alt="Inventra AI" className="h-10 w-10 rounded-lg bg-white/90 object-cover object-top" />
                  <div>
                    <p className="text-sm font-semibold text-white">Smart Inventory System</p>
                    <p className="text-xs text-teal-100/80">Management</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">{primaryNavLinks}</div>
                <div className="mt-3 flex flex-col gap-1.5 border-t border-white/10 pt-3">{utilityNavLinks}</div>
              </div>
            )}
          </nav>
        </aside>
      )}

      <main className={`mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 ${mainPadding}`}>
        <Outlet />
      </main>
      {user && (
        <>
          <button
            type="button"
            onClick={() => logout()}
            className="fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-md backdrop-blur hover:bg-rose-50 hover:text-rose-900"
          >
            <LogOut size={15} strokeWidth={2} />
            Log out
          </button>
        </>
      )}
      <AppTutorial open={tutorialOpen} onClose={closeTutorial} />
      <ChatbotWidget dockSide={dockSide} />
    </div>
  );
}

function DockButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
        active ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
      title={label}
    >
      {icon}
      {label}
    </button>
  );
}
