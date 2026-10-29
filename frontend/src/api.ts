import type {
  CareerProfile, ChatResponse, JobMatch, MatchRequest, ResumeProfile, Roadmap, UsageReport,
} from "./types";

// Session id lives in memory only (never persisted).
export const sessionId = crypto.randomUUID();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    const detail = await res.json().then((d) => d.detail).catch(() => null);
    throw new Error(typeof detail === "string" ? detail : "خطایی رخ داد. دوباره تلاش کنید.");
  }
  return res.json();
}

const post = <T,>(path: string, body: unknown) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const sendChat = (message: string) =>
  post<ChatResponse>("/chat", { session_id: sessionId, message });
export const getRoadmap = (profile: CareerProfile) => post<Roadmap>("/roadmap", profile);
export const correctRoadmap = (message: string) =>
  post<Roadmap>("/roadmap/correct", { session_id: sessionId, message });
export const uploadResume = (file: File) => {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);
  return request<ResumeProfile>("/resume", { method: "POST", body: form });
};
export const matchJobs = (req: Omit<MatchRequest, "session_id">) =>
  post<JobMatch[]>("/jobs/match", { session_id: sessionId, ...req });
export const jobsCount = () => request<{ count: number }>("/jobs/count");
export const getUsage = () => request<UsageReport>(`/usage/${sessionId}`);
