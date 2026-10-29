import { useEffect, useRef, useState, type ReactNode } from "react";
import { Mic, Send, Square } from "lucide-react";
import type { ChatMsg } from "../store";
import GenUIRegistry from "./gen-ui/GenUIRegistry";
import { getRecognitionCtor, startListening } from "../utils/voice";
import { useAppStore } from "../store";

const MAX_QUESTIONS = 6;
const fa = (n: number) => n.toLocaleString("fa-IR");

export interface KnownChip { id: string; label: string }

interface Props {
  messages: ChatMsg[];
  questionsAsked: number;
  done: boolean;
  busy: boolean;
  error: string | null;
  /** Resolves true when the message was accepted (input is then cleared). */
  onSend: (text: string) => Promise<boolean>;
  known: KnownChip[];
  onCorrect: (label: string) => void;
  /** Rendered after the last message (e.g. HITL card). */
  footer?: ReactNode;
}

export default function ChatBox({ messages, questionsAsked, done, busy, error, onSend, known, onCorrect, footer }: Props) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const canListen = typeof window !== "undefined" && !!getRecognitionCtor();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, footer]);
  useEffect(() => {
    return () => { stopRef.current?.(); };
  }, []);

  const send = async (raw: string) => {
    const t = raw.trim();
    if (!t || busy) return;
    if (await onSend(t)) setText((cur) => (cur.trim() === t ? "" : cur)); // keep the draft on failure
  };

  const toggleMic = () => {
    if (listening) { stopRef.current?.(); return; }
    setListening(true);
    stopRef.current = startListening(setText, () => { setListening(false); stopRef.current = null; });
    if (!stopRef.current) setListening(false);
  };

  const step = Math.min(questionsAsked, MAX_QUESTIONS);
  // only the newest assessment form stays interactive
  const lastFormId = done ? undefined : [...messages].reverse().find((m) => m.block?.type === "skill_assessment")?.id;

  return (
    <section dir="rtl" aria-label="گفتگو با دستیار مسیر شغلی" className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold">دستیار هوشمند مسیر شغلی</h2>
          <p className="text-xs text-slate-500">ارزیابی هدف شغلی و مهارت‌های فعلی شما</p>
        </div>
        <span className="chip border-blue-200 bg-blue-50 text-blue-700" aria-live="polite">
          {done ? "تشخیص کامل شد ✓" : `گام تشخیص: ${fa(step)} از ${fa(MAX_QUESTIONS)}`}
        </span>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
        {messages.map((m) => {
          const user = m.from === "user";
          return (
            <div key={m.id} className={`flex flex-col ${user ? "items-start" : "items-end"}`}>
              <div
                className={`max-w-[88%] whitespace-pre-wrap px-4 py-2.5 text-sm leading-7 ${
                  user ? "rounded-2xl rounded-ss-sm bg-blue-600 text-white" : "rounded-2xl rounded-ee-sm border border-slate-200 bg-slate-100 text-slate-900"
                }`}
              >
                {m.text}
                {m.block && (m.block.type !== "skill_assessment" || m.id === lastFormId) && <GenUIRegistry block={m.block} ctx={{ send: (t) => { void send(t); if (m.block?.type === "skill_assessment") useAppStore.getState().markFormUsed(m.id); }, busy }} />}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="flex items-end">
            <div className="flex items-center gap-2 rounded-2xl rounded-ee-sm border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs text-slate-600">
              <span className="size-2 animate-ping rounded-full bg-blue-600" />
              دستیار در حال تحلیل مهارت‌های شماست...
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <span>{error}</span>
            {text.trim() && <button type="button" className="btn !bg-red-600 !px-3 !py-1 hover:!bg-red-700" onClick={() => send(text)}>تلاش مجدد</button>}
          </div>
        )}
        {footer}
        <div ref={endRef} />
      </div>

      {known.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-amber-200 bg-amber-50/70 px-4 py-2" aria-label="اصلاح سریع مهارت‌ها">
          <span className="shrink-0 text-[11px] font-semibold text-amber-900">اصلاح سریع:</span>
          {known.map((k) => (
            <button key={k.id} type="button" disabled={busy} onClick={() => onCorrect(k.label)} className="chip shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 disabled:opacity-50">
              ❌ من <bdi className="mx-1">{k.label}</bdi> بلد نیستم
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 p-3">
        {canListen && (
          <button type="button" onClick={toggleMic} className={`btn-ghost !px-2.5 ${listening ? "!border-red-400 !text-red-600" : ""}`} aria-pressed={listening} aria-label={listening ? "توقف ضبط صدا" : "ورودی صوتی فارسی"} title="ورودی صوتی (fa-IR)">
            {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
          </button>
        )}
        <input
          type="text"
          dir="auto"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="مثال: می‌خوام تحلیلگر داده بشم یا من اکسل بلد نیستم…"
          className="field flex-1"
          aria-label="پیام شما"
        />
        <button type="submit" className="btn" disabled={busy || !text.trim()}>
          ارسال <Send className="size-4 rtl:-scale-x-100" aria-hidden />
        </button>
      </form>
    </section>
  );
}
