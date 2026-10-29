import { ExternalLink, MapPin, Compass } from "lucide-react";
import type { JobMatch } from "../types";
import { scorePercent } from "../lib/validators";
import { LEVEL_LABEL } from "../lib/taxonomy";

interface Props {
  match: JobMatch;
  rank: number;
  stretch?: boolean;
  onRoadmap?: (m: JobMatch) => void;
}

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function JobCard({ match, rank, stretch, onRoadmap }: Props) {
  const p = match.posting;
  const pct = scorePercent(match.score);
  const badge =
    pct >= 75 ? "border-emerald-300 bg-emerald-100 text-emerald-800" : pct >= 50 ? "border-blue-300 bg-blue-100 text-blue-800" : "border-amber-300 bg-amber-100 text-amber-800";

  return (
    <article dir="rtl" className="card flex flex-col gap-3 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white" aria-label={`رتبه ${fa(rank)}`}>{fa(rank)}</span>
          <div>
            <h3 className="text-base font-bold leading-snug"><bdi>{p.title}</bdi></h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-800"><bdi>{p.company}</bdi></span>
              <span aria-hidden>•</span>
              <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden /><bdi>{p.location}</bdi></span>
              {p.remote && <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">دورکاری</span>}
              {p.seniority && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{LEVEL_LABEL[p.seniority]}</span>}
            </div>
          </div>
        </div>
        <div className={`shrink-0 rounded-xl border px-3 py-1.5 text-sm font-bold ${badge}`}>{fa(pct)}٪ تطابق</div>
      </div>

      {stretch && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 text-xs leading-6 text-indigo-900">
          🚀 <strong>موقعیت Mid-Level قابل دسترس با یادگیری مهارت کسری</strong> — حتی اگر الان Junior هستید، با پر کردن شکاف مهارتی
          مشخص‌شده در پایین می‌توانید برای این موقعیت درخواست دهید.
        </div>
      )}

      {match.explanation_fa && <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-6 text-slate-600">{match.explanation_fa}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-2.5">
          <span className="mb-1.5 block text-[11px] font-bold text-emerald-900">✓ مهارت‌های منطبق شما ({fa(match.matched_skills.length)})</span>
          <div className="flex flex-wrap gap-1.5">
            {match.matched_skills.length ? match.matched_skills.map((s) => <bdi key={s} className="rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-xs font-medium text-emerald-800">{s}</bdi>) : <span className="text-xs text-slate-400">موردی یافت نشد</span>}
          </div>
        </div>
        <div className="rounded-xl border border-rose-200/70 bg-rose-50/50 p-2.5">
          <span className="mb-1.5 block text-[11px] font-bold text-rose-900">! مهارت‌های کسری برای این شغل ({fa(match.missing_skills.length)})</span>
          <div className="flex flex-wrap gap-1.5">
            {match.missing_skills.length ? match.missing_skills.map((s) => <bdi key={s} className="rounded-md border border-rose-300 bg-white px-2 py-0.5 text-xs font-medium text-rose-800">{s}</bdi>) : <span className="text-xs font-medium text-emerald-700">تمام مهارت‌های اصلی را دارید!</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
        {p.url ? (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
            مشاهده آگهی اصلی در سایت منبع <ExternalLink className="size-3 rtl:-scale-x-100" aria-hidden />
          </a>
        ) : <span className="text-xs text-slate-400">پیوند آگهی در دسترس نیست</span>}
        {onRoadmap && match.missing_skills.length > 0 && (
          <button type="button" className="btn-ghost !border-blue-200 !bg-blue-50 !text-blue-700" onClick={() => onRoadmap(match)}>
            <Compass className="size-4" aria-hidden /> ساخت نقشه راه یادگیری برای مهارت‌های کسری
          </button>
        )}
      </div>
    </article>
  );
}
