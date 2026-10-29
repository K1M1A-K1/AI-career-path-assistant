import { useDeferredValue, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import JobCard from "../components/JobCard";
import ResumeUpload from "../components/ResumeUpload";
import ErrorBoundary from "../components/ErrorBoundary";
import TaskProgressStepper from "../components/gen-ui/TaskProgressStepper";
import { HighImpactSkillsBanner, ResumeProfileCard } from "../components/gen-ui/ResumeProfileCard";
import { useAppStore } from "../store";
import { filterJobs, isStretch, summarizeMarket } from "../lib/market";
import { LEVEL_LABEL } from "../lib/taxonomy";
import type { Level } from "../types";

const SENIORITY: ("all" | Level)[] = ["all", "junior", "mid", "senior"];

export default function JobMatch() {
  const s = useAppStore(
    useShallow((st) => ({
      privacyAccepted: st.privacyAccepted, resume: st.resume, pool: st.pool, jobBusy: st.jobBusy, jobStage: st.jobStage,
      jobError: st.jobError, filters: st.filters,
    })),
  );
  const { setPrivacyAccepted, uploadResumeAndMatch, setFilters, requestBridge } = useAppStore.getState();

  const deferred = useDeferredValue(s.filters);
  const visible = useMemo(() => filterJobs(s.pool, deferred, s.resume).slice(0, 10), [s.pool, deferred, s.resume]);
  const market = useMemo(() => summarizeMarket(s.pool, s.resume), [s.pool, s.resume]);
  const showStepper = s.jobBusy || (!!s.jobError && s.jobStage > 0 && s.jobStage < 4 && !s.resume);

  return (
    <div className="space-y-4">
      <ResumeUpload accepted={s.privacyAccepted} onAcceptChange={setPrivacyAccepted} onFile={(f) => void uploadResumeAndMatch(f)} busy={s.jobBusy} />

      {s.jobError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{s.jobError}</p>}
      {showStepper && <TaskProgressStepper completed={s.jobStage} failed={!!s.jobError} />}

      <ErrorBoundary>
        {s.resume && <ResumeProfileCard profile={s.resume} />}
        {s.resume && <HighImpactSkillsBanner market={market} />}

        {s.resume && s.pool.length > 0 && (
          <div className="card flex flex-wrap items-center gap-3" role="search" aria-label="فیلتر آگهی‌ها">
            <input
              type="text" dir="auto" className="field w-44" placeholder="شهر / محل" aria-label="محل"
              value={s.filters.location} onChange={(e) => setFilters({ location: e.target.value })}
            />
            <select className="field" aria-label="سطح" value={s.filters.seniority} onChange={(e) => setFilters({ seniority: e.target.value as "all" | Level })}>
              {SENIORITY.map((l) => <option key={l} value={l}>{l === "all" ? "همه سطوح" : LEVEL_LABEL[l]}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-blue-600" checked={s.filters.remoteOnly} onChange={(e) => setFilters({ remoteOnly: e.target.checked })} /> فقط دورکاری
            </label>
            {s.filters.seniority === "junior" && (
              <label className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs text-indigo-900">
                <input type="checkbox" className="size-4 accent-indigo-600" checked={s.filters.includeStretch} onChange={(e) => setFilters({ includeStretch: e.target.checked })} />
                نمایش موقعیت‌های Mid-Level قابل دسترس (پیشنهاد هوشمند به دلیل کمبود پوزیشن جونیور)
              </label>
            )}
            <span className="ms-auto text-xs text-slate-500">{visible.length.toLocaleString("fa-IR")} نتیجه</span>
          </div>
        )}

        {visible.map((m, i) => (
          <JobCard key={m.posting.id} match={m} rank={i + 1} stretch={isStretch(m, s.resume)} onRoadmap={requestBridge} />
        ))}
        {s.resume && !s.jobBusy && visible.length === 0 && (
          <p className="card text-center text-sm text-slate-500">{s.pool.length === 0 ? "آگهی مناسبی یافت نشد." : "با این فیلترها آگهی‌ای پیدا نشد؛ فیلترها را کمتر کنید."}</p>
        )}
      </ErrorBoundary>
    </div>
  );
}
