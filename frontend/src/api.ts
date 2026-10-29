import type { CareerProfile, ChatResponse, JobMatch, MatchRequest, ResumeProfile, Roadmap, UsageReport } from "./types";
import { validateJobMatches, validateRoadmap } from "./lib/validators";
import fxChat from "./fixtures/chat_script.json";
import fxProfile from "./fixtures/career_profile.json";
import fxRoadmap from "./fixtures/roadmap.json";
import fxResume from "./fixtures/resume_profile.json";
import fxJobs from "./fixtures/job_matches.json";

export const CHAT_TIMEOUT_MS = 9200; // NF-02: leaves ~800 ms render buffer inside 10 s
export const UPLOAD_TIMEOUT_MS = 30000; // resume parsing (LLM extraction)
export const JOB_TIMEOUT_MS = 55000; // first match: NF-02, inside the 60 s job-matching SLA
export const EXTRA_MATCH_TIMEOUT_MS = 20000; // junior / mid pool widening (best effort)
export const TIMEOUT_MSG = "پاسخ سرور بیش از حد طول کشید. لطفاً دوباره تلاش کنید.";
const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === "1";

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Session id lives in memory only (never persisted).
export const sessionId = makeId();

/** AbortController that fires after `ms`; call `clear()` in finally. */
export function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, abort: () => controller.abort(), clear: () => clearTimeout(timer) };
}

let fixtureTurn = 0;
function fixtureResponse(path: string, body: unknown): unknown {
  if (path === "/chat") {
    const qs = fxChat.questions;
    if (fixtureTurn < qs.length) return { reply: qs[fixtureTurn], profile: null, done: false, questions_asked: ++fixtureTurn };
    return { reply: fxChat.final, profile: fxProfile, done: true, questions_asked: fixtureTurn };
  }
  if (path === "/roadmap" || path === "/roadmap/correct") return fxRoadmap;
  if (path === "/resume") return fxResume;
  if (path === "/jobs/match") {
    const f = (body as { filters?: { seniority?: string } })?.filters;
    return (fxJobs as { posting: { seniority: string } }[]).filter((m) => !f?.seniority || m.posting.seniority === f.seniority);
  }
  if (path === "/jobs/count") return { count: 50 };
  return { session_id: sessionId, prompt_tokens: 1200, completion_tokens: 340, est_cost_usd: 0.0042, calls: 4 };
}

async function request<T>(path: string, init?: RequestInit & { body0?: unknown }): Promise<T> {
  if (USE_FIXTURES) {
    await new Promise((r) => setTimeout(r, 250));
    return fixtureResponse(path, init?.body0) as T;
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new Error(TIMEOUT_MSG);
    throw new Error("ارتباط با سرور برقرار نشد. اتصال شبکه یا سرویس را بررسی کنید.");
  }
  if (!res.ok) {
    const detail = await res.json().then((d) => d?.detail).catch(() => null);
    throw new Error(typeof detail === "string" ? detail : "خطایی رخ داد. دوباره تلاش کنید.");
  }
  try {
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new Error(TIMEOUT_MSG);
    throw new Error("پاسخ سرور قابل خواندن نبود.");
  }
}

const post = <T,>(path: string, body: unknown, signal?: AbortSignal) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    body0: body,
    signal,
  });

/** Runs `fn` under a hard timeout (NF-02). */
async function timed<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const t = withTimeout(ms);
  try {
    return await fn(t.signal);
  } finally {
    t.clear();
  }
}

export const sendChat = (message: string): Promise<ChatResponse> =>
  timed(CHAT_TIMEOUT_MS, (s) => post<ChatResponse>("/chat", { session_id: sessionId, message }, s));

const toRoadmap = (raw: unknown): Roadmap => {
  const rm = validateRoadmap(raw);
  if (!rm) throw new Error("ساختار نقشه راه دریافتی معتبر نبود.");
  return rm;
};

export const getRoadmap = (profile: CareerProfile): Promise<Roadmap> =>
  timed(CHAT_TIMEOUT_MS, (s) => post<unknown>("/roadmap", profile, s)).then(toRoadmap);

export const correctRoadmap = (message: string): Promise<Roadmap> =>
  timed(CHAT_TIMEOUT_MS, (s) => post<unknown>("/roadmap/correct", { session_id: sessionId, message }, s)).then(toRoadmap);

export const uploadResume = (file: File, signal?: AbortSignal) => {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);
  return request<ResumeProfile>("/resume", { method: "POST", body: form, signal });
};

export const matchJobs = (req: Omit<MatchRequest, "session_id">, signal?: AbortSignal): Promise<JobMatch[]> =>
  post<unknown>("/jobs/match", { session_id: sessionId, ...req }, signal).then(validateJobMatches);

export const jobsCount = () => request<{ count: number }>("/jobs/count");
export const getUsage = () => request<UsageReport>(`/usage/${sessionId}`);
