import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type TutorialStep = {
  title: string;
  description: string;
  action: string;
  path: string;
  selector: string;
};

const steps: TutorialStep[] = [
  {
    title: "Dashboard overview",
    description: "Track KPIs, low-stock risk, and movement trends from the dashboard hero section.",
    action: "We just navigated to Dashboard and highlighted the overview header.",
    path: "/dashboard",
    selector: '[data-tour="dashboard-hero"]',
  },
  {
    title: "Inventory controls",
    description: "Search, filter, and sort items. This is your primary operations area for daily stock management.",
    action: "This highlight shows your inventory filter toolbar.",
    path: "/inventory",
    selector: '[data-tour="inventory-filters"]',
  },
  {
    title: "Smart operations",
    description: "Use AI-assisted risk insights, IoT data, and automated suggestions in one place.",
    action: "You are now on Smart ops with the main section highlighted.",
    path: "/smart-ops",
    selector: '[data-tour="smart-hero"]',
  },
  {
    title: "Notification center",
    description: "Click the bell anytime to check low-stock alerts without leaving your current page.",
    action: "This is your notification bell in the top nav.",
    path: "/dashboard",
    selector: '[data-tour="notifications-bell"]',
  },
  {
    title: "Inventory assistant",
    description: "Use the floating assistant to ask stock questions in natural language.",
    action: "This highlight shows the assistant launch button.",
    path: "/dashboard",
    selector: '[data-tour="assistant-fab"]',
  },
];

type AppTutorialProps = {
  open: boolean;
  onClose: () => void;
};

export function AppTutorial({ open, onClose }: AppTutorialProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  useEffect(() => {
    if (!open) return;
    setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (location.pathname !== current.path) navigate(current.path);
  }, [open, current.path, location.pathname, navigate]);

  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      const el = document.querySelector(current.selector);
      if (!el) {
        setRect(null);
        return;
      }
      setRect(el.getBoundingClientRect());
    };

    const t = window.setTimeout(updateRect, 220);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, current.selector, location.pathname, step]);

  const cardStyle = useMemo(() => {
    const margin = 16;
    const width = Math.min(420, window.innerWidth - margin * 2);
    const estimatedHeight = 355;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    if (!rect) {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)" as const,
        width,
      };
    }

    // Prefer placing below target; if not enough room, place above.
    const roomBelow = window.innerHeight - rect.bottom - margin;
    const roomAbove = rect.top - margin;
    const preferredTop =
      roomBelow >= estimatedHeight || roomBelow >= roomAbove
        ? rect.bottom + 12
        : rect.top - estimatedHeight - 12;

    // Prefer aligned with target; if target is on right side, shift card left a bit.
    const preferredLeft =
      rect.left + width > window.innerWidth - margin ? rect.right - width : rect.left;

    const top = clamp(preferredTop, margin, window.innerHeight - estimatedHeight - margin);
    const left = clamp(preferredLeft, margin, window.innerWidth - width - margin);
    return { left, top, width };
  }, [rect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]" />

      {rect && (
        <div
          className="pointer-events-none fixed z-[81] rounded-2xl border-2 border-teal-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.38)]"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      <div
        className="fixed z-[82] w-full max-h-[calc(100vh-2rem)] overflow-auto rounded-2xl border border-white/70 bg-white/95 shadow-glow"
        style={cardStyle}
      >
        <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-500 p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Sparkles size={16} />
              </span>
              <p className="font-display text-lg font-bold tracking-tight">Guided App Tour</p>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs font-semibold text-white/90 hover:bg-white/15"
              onClick={onClose}
            >
              Skip
            </button>
          </div>
          <p className="mt-2 text-sm text-white/90">
            Step {step + 1} of {steps.length}
          </p>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-teal-500" : "bg-slate-200"}`}
              />
            ))}
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">{current.title}</h2>
            <p className="mt-2 text-slate-600">{current.description}</p>
            <p className="mt-3 rounded-xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">
              {current.action}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={isFirst}
              className="btn-secondary disabled:opacity-50"
            >
              Back
            </button>
            {isLast ? (
              <button type="button" onClick={onClose} className="btn-primary">
                Finish tutorial
              </button>
            ) : (
              <button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} className="btn-primary">
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
