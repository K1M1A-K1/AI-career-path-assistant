import { Check, Loader2 } from "lucide-react";

export const JOB_STAGES = [
  "بررسی امنیتی بایت‌ها",
  "استخراج مهارت‌های فعلی رزومه",
  "رتبه‌بندی معنایی آگهی‌های شغلی (Junior و Mid-Level)",
  "تحلیل شکاف مهارتی و فرصت‌های ارتقا",
];

interface Props {
  /** number of finished stages, 0..stages.length */
  completed: number;
  failed?: boolean;
  stages?: string[];
}

/** GenUI #3 — live multi-step tracker. Stages advance from real response milestones. */
export default function TaskProgressStepper({ completed, failed, stages = JOB_STAGES }: Props) {
  return (
    <ol className="card space-y-2" aria-label="پیشرفت تحلیل رزومه" aria-live="polite">
      {stages.map((label, i) => {
        const done = i < completed;
        const active = i === completed && !failed;
        return (
          <li key={label} className="flex items-center gap-3 text-sm">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done ? "bg-emerald-600 text-white" : active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : active ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : (i + 1).toLocaleString("fa-IR")}
            </span>
            <span className={done ? "text-slate-700" : active ? "font-medium text-slate-900" : "text-slate-400"}>
              {(i + 1).toLocaleString("fa-IR")}. {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
