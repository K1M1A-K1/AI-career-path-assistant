import { create } from "zustand";
import {
  correctRoadmap, getRoadmap, getUsage, JOB_TIMEOUT_MS, matchJobs, sendChat, uploadResume, withTimeout,
} from "./api";
import type { CareerProfile, JobMatch, Level, ResumeProfile, Roadmap, UsageReport } from "./types";
import { validateCareerProfile } from "./lib/validators";
import { taxonomy, withDescendants, roleLabelFa } from "./lib/taxonomy";
import { bestRoleForJob, DEFAULT_FILTERS, missingIds, type JobFilters } from "./lib/market";
import { validateResumeFile } from "./utils/fileValidator";
import { blockForReply, type HitlRequest, type UIBlock } from "./components/gen-ui/blocks";

export type Tab = "career" | "jobs";
export interface ChatMsg { id: string; from: "user" | "bot"; text: string; block?: UIBlock }
export interface UndoState { label: string; profile: CareerProfile | null; roadmap: Roadmap }

const PRIVACY_KEY = "rc_privacy_accepted_v1";
const readPrivacy = () => {
  try { return sessionStorage.getItem(PRIVACY_KEY) === "true"; } catch { return false; }
};
let seq = 0;
const mid = () => `m${Date.now().toString(36)}${seq++}`;
const errMsg = (e: unknown, fallback = "خطایی رخ داد. دوباره تلاش کنید.") => (e instanceof Error ? e.message : fallback);

const WELCOME: ChatMsg = {
  id: "welcome",
  from: "bot",
  text: "سلام! برای شروع بنویسید به چه شغلی علاقه دارید و چه مهارت‌هایی از قبل دارید.",
  block: {
    type: "declarative",
    schema: {
      kind: "stack",
      children: [
        { kind: "text", text: "نمونه پیام‌ها (با یک کلیک ارسال می‌شود):" },
        { kind: "chips", options: ["می‌خوام تحلیلگر داده بشم", "برنامه‌نویس بک‌اند هستم و می‌خوام ارشد بشم", "مهندس دواپس میانی می‌خوام"] },
      ],
    },
  },
};

interface AppState {
  activeTab: Tab;
  usage: UsageReport | null;
  // Module A
  messages: ChatMsg[];
  questionsAsked: number;
  done: boolean;
  profile: CareerProfile | null;
  roadmap: Roadmap | null;
  focusIds: string[];
  chatBusy: boolean;
  graphBusy: boolean;
  chatError: string | null;
  hitl: HitlRequest | null;
  undo: UndoState | null;
  // Module B
  privacyAccepted: boolean;
  resume: ResumeProfile | null;
  pool: JobMatch[];
  jobBusy: boolean;
  jobStage: number; // completed stages 0..4
  jobError: string | null;
  filters: JobFilters;

  setTab: (t: Tab) => void;
  sendMessage: (text: string) => Promise<boolean>;
  toggleSkill: (conceptId: string) => Promise<void>;
  undoLast: () => void;
  dismissUndo: () => void;
  requestPivot: (unlock: string[]) => void;
  requestBridge: (job: JobMatch) => void;
  confirmHitl: (profile: CareerProfile) => Promise<void>;
  rejectHitl: () => void;
  markFormUsed: (id: string) => void;
  setPrivacyAccepted: (v: boolean) => void;
  setFilters: (f: Partial<JobFilters>) => void;
  uploadResumeAndMatch: (file: File) => Promise<void>;
  refreshUsage: () => Promise<void>;
}

const profileFromRoadmap = (rm: Roadmap, prev: CareerProfile | null): CareerProfile => {
  const todo = new Set(rm.nodes.filter((n) => n.status === "todo").map((n) => n.id));
  const known = rm.nodes.filter((n) => n.status === "known").map((n) => n.id);
  const kept = (prev?.known_concepts ?? []).filter((id) => !todo.has(id));
  return {
    target_role: rm.role,
    target_level: rm.level,
    current_level: prev?.current_level ?? "junior",
    known_concepts: [...new Set([...kept, ...known])],
    heard_of_only: prev?.heard_of_only ?? [],
  };
};

export const useAppStore = create<AppState>((set, get) => {
  const pushBot = (text: string, block?: UIBlock) =>
    set((s) => ({ messages: [...s.messages, { id: mid(), from: "bot", text, block }] }));
  const applyRoadmap = (rm: Roadmap, focusIds: string[] = []) =>
    set((s) => ({ roadmap: rm, focusIds, profile: profileFromRoadmap(rm, s.profile) }));

  return {
    activeTab: "career",
    usage: null,
    messages: [WELCOME],
    questionsAsked: 0,
    done: false,
    profile: null,
    roadmap: null,
    focusIds: [],
    chatBusy: false,
    graphBusy: false,
    chatError: null,
    hitl: null,
    undo: null,
    privacyAccepted: readPrivacy(),
    resume: null,
    pool: [],
    jobBusy: false,
    jobStage: 0,
    jobError: null,
    filters: DEFAULT_FILTERS,

    setTab: (activeTab) => set({ activeTab }),

    sendMessage: async (text) => {
      if (get().chatBusy) return false;
      const userMsg: ChatMsg = { id: mid(), from: "user", text };
      set((s) => ({ messages: [...s.messages, userMsg], chatBusy: true, chatError: null }));
      try {
        if (get().roadmap) {
          // Once a roadmap exists every message is a correction («من اکسل بلد نیستم»).
          applyRoadmap(await correctRoadmap(text), get().focusIds);
          pushBot("نقشه راه بر اساس اصلاح شما به‌روز شد.");
        } else {
          const res = await sendChat(text);
          pushBot(res.reply, blockForReply(res.reply, res.done));
          set({ questionsAsked: Math.max(0, Math.min(6, res.questions_asked ?? 0)), done: !!res.done });
          if (res.done) {
            const profile = validateCareerProfile(res.profile);
            if (profile) {
              set({ profile });
              applyRoadmap(await getRoadmap(profile));
            } else {
              pushBot("نتوانستم نقش شغلی را با چارچوب مهارت‌ها تطبیق دهم؛ لطفاً نقش را دقیق‌تر بنویسید.");
            }
          }
        }
        return true;
      } catch (e) {
        // roll back the optimistic bubble; the draft stays in the input for retry
        set((s) => ({ messages: s.messages.filter((m) => m.id !== userMsg.id), chatError: errMsg(e) }));
        return false;
      } finally {
        set({ chatBusy: false });
        void get().refreshUsage();
      }
    },

    // A-08: one-click correction, deterministic (no LLM) via POST /api/roadmap.
    toggleSkill: async (conceptId) => {
      const { roadmap, graphBusy } = get();
      if (!roadmap || graphBusy) return;
      const profile = get().profile ?? profileFromRoadmap(roadmap, null);
      const node = roadmap.nodes.find((n) => n.id === conceptId);
      if (!node) return;
      let known: string[];
      if (node.status === "known") {
        const drop = withDescendants(conceptId, taxonomy); // knowing X implied by knowing anything built on X
        known = profile.known_concepts.filter((id) => !drop.has(id));
      } else {
        known = [...new Set([...profile.known_concepts, conceptId])];
      }
      set({ graphBusy: true, chatError: null });
      try {
        const next = await getRoadmap({ ...profile, known_concepts: known });
        set({
          undo: { label: `${node.label_fa} ${node.status === "known" ? "به «بلد نیستم» تغییر کرد" : "به «بلدم» تغییر کرد"}`, profile, roadmap },
        });
        set({ profile: { ...profile, known_concepts: known } });
        applyRoadmap(next, get().focusIds);
      } catch (e) {
        set({ chatError: errMsg(e) });
      } finally {
        set({ graphBusy: false });
      }
    },
    undoLast: () => {
      const u = get().undo;
      if (u) set({ roadmap: u.roadmap, profile: u.profile, undo: null });
    },
    dismissUndo: () => set({ undo: null }),

    requestPivot: (unlock) => {
      const { roadmap, profile } = get();
      if (!roadmap) return;
      const base = profile ?? profileFromRoadmap(roadmap, null);
      set({
        hitl: {
          kind: "pivot",
          title: "تایید ارتقای هدف به سطح میانی",
          description: "هدف شما از مقدماتی به میانی تغییر می‌کند و نقشه راه با همین مهارت‌های فعلی بازتولید می‌شود.",
          profile: { ...base, target_level: "mid" },
          focusIds: unlock,
        },
      });
    },

    requestBridge: (job) => {
      const { resume } = get();
      const role = bestRoleForJob(job, resume);
      const need = missingIds(job, resume);
      if (!role) {
        set({ activeTab: "career", chatError: "برای این آگهی نقش متناظری در چارچوب مهارت‌ها پیدا نشد." });
        return;
      }
      const level: Level = job.posting.seniority ?? "mid";
      set({
        activeTab: "career",
        hitl: {
          kind: "bridge",
          title: "ساخت نقشه راه برای مهارت‌های کسری این آگهی",
          description: `نقش «${roleLabelFa(role)}» در سطح ${level} با مهارت‌های فعلی رزومه شما محاسبه می‌شود.`,
          profile: {
            target_role: role,
            target_level: level,
            current_level: resume?.level_guess ?? "junior",
            known_concepts: [...(resume?.skill_ids ?? [])].filter((id) => !!taxonomy.concepts[id]),
            heard_of_only: [],
          },
          focusIds: need,
          jobTitle: job.posting.title,
          company: job.posting.company,
        },
      });
    },

    confirmHitl: async (profile) => {
      const h = get().hitl;
      if (!h) return;
      set({ graphBusy: true, chatError: null });
      try {
        const rm = await getRoadmap(profile);
        applyRoadmap(rm, h.focusIds);
        set({ profile, hitl: null, undo: null });
        if (h.kind === "bridge") {
          const ids = new Set(rm.nodes.map((n) => n.id));
          pushBot(`نقشه راه برای آگهی «${h.jobTitle}» (${h.company}) آماده شد.`, {
            type: "bridge_summary",
            jobTitle: h.jobTitle ?? "",
            company: h.company ?? "",
            roleLabel: roleLabelFa(profile.target_role),
            needed: h.focusIds.filter((id) => ids.has(id)),
            uncovered: h.focusIds.filter((id) => !ids.has(id)),
          });
        } else {
          pushBot("هدف شما به سطح میانی ارتقا یافت و نقشه راه جدید ساخته شد.");
        }
      } catch (e) {
        set({ chatError: errMsg(e) });
      } finally {
        set({ graphBusy: false });
        void get().refreshUsage();
      }
    },
    rejectHitl: () => set({ hitl: null }),

    markFormUsed: (id) =>
      set((s) => ({ messages: s.messages.map((m) => (m.id === id && m.block?.type === "skill_assessment" ? { ...m, block: undefined } : m)) })),

    setPrivacyAccepted: (v) => {
      try { sessionStorage.setItem(PRIVACY_KEY, String(v)); } catch { /* storage may be blocked */ }
      set({ privacyAccepted: v });
    },
    setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),

    uploadResumeAndMatch: async (file) => {
      if (get().jobBusy) return;
      const check = await validateResumeFile(file, get().privacyAccepted);
      if (!check.valid) {
        set({ jobError: check.error ?? "فایل نامعتبر است." });
        return;
      }
      set({ jobBusy: true, jobError: null, jobStage: 1, resume: null, pool: [], filters: DEFAULT_FILTERS });
      const t = withTimeout(JOB_TIMEOUT_MS);
      try {
        const resume = await uploadResume(file, t.signal);
        set({ resume, jobStage: 2 });
        const top = await matchJobs({ method: "hybrid", filters: {} }, t.signal);
        set({ pool: top, jobStage: 3 });
        // widen the pool so Junior/Mid stretch analysis has data (backend returns max 10 per call)
        const extra = await Promise.allSettled([
          matchJobs({ method: "hybrid", filters: { seniority: "junior" } }, t.signal),
          matchJobs({ method: "hybrid", filters: { seniority: "mid" } }, t.signal),
        ]);
        const merged = new Map(top.map((m) => [m.posting.id, m]));
        for (const r of extra) if (r.status === "fulfilled") r.value.forEach((m) => merged.set(m.posting.id, m));
        set({ pool: [...merged.values()], jobStage: 4 });
      } catch (e) {
        set({ jobError: errMsg(e) });
      } finally {
        t.clear();
        set({ jobBusy: false });
        void get().refreshUsage();
      }
    },

    refreshUsage: async () => {
      try { set({ usage: await getUsage() }); } catch { /* telemetry is non-critical */ }
    },
  };
});
