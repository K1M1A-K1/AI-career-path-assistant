import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { AlertTriangle, Undo2, Volume2 } from "lucide-react";
import ChatBox from "../components/ChatBox";
import RoadmapGraph from "../components/RoadmapGraph";
import ErrorBoundary from "../components/ErrorBoundary";
import HitlConfirmationCard from "../components/gen-ui/HitlConfirmationCard";
import OpportunityPivotCard from "../components/gen-ui/OpportunityPivotCard";
import { useAppStore } from "../store";
import { computeStretchJobs, summarizeMarket, unlockIds as calcUnlock } from "../lib/market";
import { numbersIn } from "../lib/validators";
import { roleLabelFa } from "../lib/taxonomy";
import { speakFa, useFaVoice } from "../utils/voice";

export default function CareerChat() {
  const s = useAppStore(
    useShallow((st) => ({
      messages: st.messages, questionsAsked: st.questionsAsked, done: st.done, roadmap: st.roadmap, focusIds: st.focusIds,
      chatBusy: st.chatBusy, graphBusy: st.graphBusy, chatError: st.chatError, hitl: st.hitl, undo: st.undo,
      pool: st.pool, resume: st.resume,
    })),
  );
  const { sendMessage, toggleSkill, undoLast, dismissUndo, requestPivot, confirmHitl, rejectHitl } = useAppStore.getState();
  const hasFa = useFaVoice();

  const market = useMemo(() => summarizeMarket(s.pool, s.resume), [s.pool, s.resume]);
  const unlock = useMemo(() => calcUnlock(computeStretchJobs(s.pool, s.resume), s.resume), [s.pool, s.resume]);

  useEffect(() => {
    if (!s.undo) return;
    const t = setTimeout(dismissUndo, 8000);
    return () => clearTimeout(t);
  }, [s.undo, dismissUndo]);

  const rm = s.roadmap;
  const known = useMemo(() => (rm ? rm.nodes.filter((n) => n.status === "known").map((n) => ({ id: n.id, label: n.label_fa })) : []), [rm]);
  const todoCount = rm ? rm.nodes.filter((n) => n.status === "todo").length : 0;
  // A-09: the textual summary must agree with the graph it sits above.
  const nums = rm ? numbersIn(rm.summary_fa) : [];
  const mismatch = !!rm && nums.length > 0 && !nums.includes(todoCount);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <ErrorBoundary>
          <ChatBox
            messages={s.messages}
            questionsAsked={s.questionsAsked}
            done={s.done}
            busy={s.chatBusy}
            error={s.chatError}
            onSend={sendMessage}
            known={known}
            onCorrect={(label) => void sendMessage(`من ${label} بلد نیستم`)}
            footer={
              s.hitl && (
                <HitlConfirmationCard request={s.hitl} busy={s.graphBusy} onApprove={(p) => void confirmHitl(p)} onReject={rejectHitl} />
              )
            }
          />
        </ErrorBoundary>
      </div>

      <div className="space-y-3 lg:col-span-7">
        {!rm ? (
          <div className="card flex h-[640px] flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
            <p className="font-bold text-slate-700">نقشه راه شما اینجا ساخته می‌شود</p>
            <p>با دستیار گفتگو کنید یا فرم سریع را پر کنید؛ پس از تشخیص نقش و مهارت‌ها گراف پیش‌نیازها نمایش داده می‌شود.</p>
          </div>
        ) : (
          <ErrorBoundary>
            <section className="card" aria-label="خلاصه نقشه راه">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold">نقشه راه: {roleLabelFa(rm.role)}</h2>
                  <p className="mt-1 text-sm leading-7 text-slate-700">{rm.summary_fa}</p>
                </div>
                {hasFa && (
                  <button type="button" className="btn-ghost shrink-0" onClick={() => speakFa(rm.summary_fa)}>
                    <Volume2 className="size-4" aria-hidden /> خوانش صوتی نقشه راه
                  </button>
                )}
              </div>
              {mismatch && (
                <p role="status" className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                  <AlertTriangle className="size-3.5" aria-hidden /> تعداد مفاهیم در خلاصه با گراف ({todoCount.toLocaleString("fa-IR")} مفهوم باقی‌مانده) هم‌خوانی ندارد.
                </p>
              )}
            </section>

            {rm.level === "junior" && (
              <OpportunityPivotCard market={market} busy={s.graphBusy} onPivot={() => requestPivot(market.top.map((t) => t.id))} />
            )}

            <RoadmapGraph roadmap={rm} unlockIds={unlock} focusIds={s.focusIds} busy={s.graphBusy} onToggle={(id) => void toggleSkill(id)} />

            {s.undo && (
              <div role="status" className="flex items-center justify-between gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs text-white">
                <span>{s.undo.label}</span>
                <button type="button" className="inline-flex items-center gap-1 font-semibold text-amber-300" onClick={undoLast}>
                  <Undo2 className="size-3.5" aria-hidden /> بازگردانی
                </button>
              </div>
            )}
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
