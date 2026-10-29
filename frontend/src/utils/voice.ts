import { useEffect, useState } from "react";

/* Minimal typings: Web Speech API is not in lib.dom for all TS versions. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type Ctor = new () => SpeechRecognitionLike;

export function getRecognitionCtor(): Ctor | null {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** A-10 STT: browser SpeechRecognition with lang fa-IR (zero token cost). Returns a stop function. */
export function startListening(onText: (t: string) => void, onEnd: () => void): (() => void) | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "fa-IR";
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let text = "";
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    onText(text);
  };
  rec.onend = onEnd;
  rec.onerror = onEnd;
  try { rec.start(); } catch { onEnd(); return null; }
  return () => { try { rec.stop(); } catch { /* already stopped */ } };
}

const faVoice = () => window.speechSynthesis?.getVoices().find((v) => v.lang.toLowerCase().startsWith("fa")) ?? null;

/** True once the OS exposes a Persian voice (voices load asynchronously). */
export function useFaVoice(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const check = () => setOk(!!faVoice());
    check();
    window.speechSynthesis.addEventListener?.("voiceschanged", check);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", check);
  }, []);
  return ok;
}

export function speakFa(text: string): boolean {
  const v = faVoice();
  if (!v) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = v;
  u.lang = v.lang;
  window.speechSynthesis.speak(u);
  return true;
}
export const stopSpeaking = () => window.speechSynthesis?.cancel();
