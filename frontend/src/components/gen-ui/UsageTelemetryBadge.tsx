import { Coins } from "lucide-react";
import { useAppStore } from "../../store";

const fa = (n: number) => n.toLocaleString("fa-IR");
const budget = Number(import.meta.env.VITE_SESSION_BUDGET_USD) || 0;

/** NF-05/NF-07 — session tokens & estimated cost; refreshed by the store after each turn / match. */
export default function UsageTelemetryBadge() {
  const usage = useAppStore((s) => s.usage);
  if (!usage) return <span className="text-xs text-slate-400">مصرف نشست: —</span>;
  const total = usage.prompt_tokens + usage.completion_tokens;
  const pct = budget > 0 ? Math.min(100, (usage.est_cost_usd / budget) * 100) : null;
  return (
    <div
      tabIndex={0}
      className="group relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
      aria-label={`مصرف توکن ${fa(total)}، هزینه تخمینی ${usage.est_cost_usd.toFixed(4)} دلار`}
    >
      <Coins className="size-4 text-amber-500" aria-hidden />
      <span>توکن مصرفی: <strong>{fa(total)}</strong></span>
      <span className="text-slate-300">|</span>
      <span>هزینه تخمینی نشست: <strong dir="ltr" className="inline-block">${usage.est_cost_usd.toFixed(4)}</strong></span>
      {pct !== null && (
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <span className={`block h-full ${pct > 80 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
        </span>
      )}
      <div className="pointer-events-none absolute end-0 top-full z-20 mt-1 hidden w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg group-hover:block group-focus:block">
        <div>ورودی (prompt): {fa(usage.prompt_tokens)}</div>
        <div>خروجی (completion): {fa(usage.completion_tokens)}</div>
        <div>تعداد فراخوانی: {fa(usage.calls)}</div>
      </div>
    </div>
  );
}
