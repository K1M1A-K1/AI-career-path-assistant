import { Lightbulb } from "lucide-react";
import type { ResumeProfile } from "../../types";
import type { MarketSummary } from "../../lib/market";
import { conceptLabelFa } from "../../lib/taxonomy";

const fa = (n: number) => n.toLocaleString("fa-IR");

/** B-02 — extracted resume profile; mapped skills are shown with taxonomy labels. */
export function ResumeProfileCard({ profile }: { profile: ResumeProfile }) {
  const mapped = new Set(profile.skill_ids);
  return (
    <section className="card" aria-label="پروفایل استخراج‌شده از رزومه">
      <h3 className="mb-2 text-sm font-bold">پروفایل استخراج‌شده از رزومه</h3>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {profile.skills.length === 0 && <span className="text-xs text-slate-500">مهارتی شناسایی نشد.</span>}
        {profile.skills.map((s) => (
          <bdi key={s} className="chip border-emerald-300 bg-emerald-50 text-emerald-800">{s}</bdi>
        ))}
        {profile.skill_ids.filter((id) => !profile.skills.some((s) => s.toLowerCase() === conceptLabelFa(id).toLowerCase())).length > 0 && mapped.size > 0 && (
          <span className="self-center text-[11px] text-slate-500">{fa(mapped.size)} مهارت با چارچوب مهارت‌ها تطبیق یافت</span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700 sm:grid-cols-4">
        <div><dt className="text-slate-500">سابقه کار</dt><dd className="font-medium">{fa(profile.years_experience)} سال</dd></div>
        <div><dt className="text-slate-500">محل</dt><dd className="font-medium"><bdi>{profile.location ?? "نامشخص"}</bdi></dd></div>
        <div><dt className="text-slate-500">تحصیلات</dt><dd className="font-medium">{profile.education.join("، ") || "—"}</dd></div>
        <div><dt className="text-slate-500">سوابق شغلی</dt><dd className="font-medium">{profile.previous_roles.join("، ") || "—"}</dd></div>
      </dl>
    </section>
  );
}

/** B-02 — «پرتکرارترین مهارت‌های کسری بازار کار», derived from the stretch jobs in the pool. */
export function HighImpactSkillsBanner({ market }: { market: MarketSummary }) {
  if (market.stretch.length === 0 || market.top.length === 0) return null;
  return (
    <aside className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4" aria-label="پرتکرارترین مهارت‌های کسری بازار کار">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-indigo-900">
        <Lightbulb className="size-4" aria-hidden /> پرتکرارترین مهارت‌های کسری بازار کار
      </h3>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {market.top.map((s) => (
          <span key={s.id} className="chip border-indigo-300 bg-white text-indigo-800">
            <bdi>{s.label}</bdi>
            <span className="ms-1.5 text-[11px] text-indigo-500">در {fa(s.count)} آگهی</span>
          </span>
        ))}
      </div>
      <p className="text-xs leading-6 text-slate-700">
        آگهی‌های Junior محدودند، اما با یادگیری{" "}
        {market.top.map((s, i) => <span key={s.id}>{i > 0 && "، "}<bdi className="font-semibold">{s.label}</bdi></span>)}{" "}
        برای <strong>{fa(market.unlocked)}</strong> موقعیت Mid-Level دیگر در فهرست زیر واجد شرایط می‌شوید.
      </p>
    </aside>
  );
}
