import { ArrowRight, Rocket } from "lucide-react";
import type { MarketSummary } from "../../lib/market";

interface Props {
  market: MarketSummary;
  onPivot: () => void;
  busy?: boolean;
  /** Chat roadmap already targets Mid or above → hide the action */
  canPivot?: boolean;
}

const fa = (n: number) => n.toLocaleString("fa-IR");

/** GenUI #2 — Junior vs Mid availability (computed from the real match pool) + one-click pivot. */
export default function OpportunityPivotCard({ market, onPivot, busy, canPivot = true }: Props) {
  if (market.stretch.length === 0) return null;
  const skills = market.top;
  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-l from-indigo-50 to-white p-4" aria-label="فرصت ارتقا به سطح میانی">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-indigo-900">
        <Rocket className="size-4" aria-hidden /> فرصت‌های Mid-Level در دسترس
      </h3>
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <div className="text-lg font-bold text-slate-800">{fa(market.junior)}</div>
          آگهی مقدماتی (Junior) در نتایج
        </div>
        <div className="rounded-xl border border-indigo-200 bg-white p-2">
          <div className="text-lg font-bold text-indigo-700">{fa(market.mid)}</div>
          آگهی میانی (Mid) در نتایج
        </div>
      </div>
      <p className="mt-3 text-xs leading-6 text-slate-700">
        با یادگیری{" "}
        {skills.map((s, i) => (
          <span key={s.id}>
            {i > 0 && "، "}
            <bdi className="rounded-md bg-indigo-100 px-1.5 py-0.5 font-semibold text-indigo-800">{s.label}</bdi>
          </span>
        ))}{" "}
        می‌توانید برای <strong>{fa(market.unlocked)}</strong> موقعیت Mid-Level دیگر از میان {fa(market.total)} آگهی تطبیق‌یافته درخواست دهید.
      </p>
      {canPivot && (
        <button type="button" className="btn mt-3 w-full" onClick={onPivot} disabled={busy}>
          ارتقای هدف به سطح میانی و افزودن مهارت‌های کلیدی به نقشه راه
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </button>
      )}
    </section>
  );
}
