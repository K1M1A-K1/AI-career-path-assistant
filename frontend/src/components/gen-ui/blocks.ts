import type { CareerProfile } from "../../types";

/** Declarative (Level 2) schema: small allow-list of atoms, validated at runtime. */
export type DeclNode =
  | { kind: "text"; text: string }
  | { kind: "chips"; options: string[] }
  | { kind: "metric"; label: string; value: string }
  | { kind: "stack"; children: DeclNode[] };

/** Typed GenUI blocks produced by adapters from validated backend data. */
export type UIBlock =
  | { type: "skill_assessment" }
  | { type: "bridge_summary"; jobTitle: string; company: string; roleLabel: string; needed: string[]; uncovered: string[] }
  | { type: "declarative"; schema: DeclNode };

export interface HitlRequest {
  kind: "pivot" | "bridge";
  title: string;
  description: string;
  profile: CareerProfile;
  focusIds: string[];
  jobTitle?: string;
  company?: string;
}

const ASK_RE = /(نقش|شغل|سطح|مبتدی|متوسط|پیشرفته|بلدید|مهارت|ابزار|مفاهیم)/;

/** Adapter: which block (if any) should accompany an assistant reply. */
export function blockForReply(reply: string, done: boolean): UIBlock | undefined {
  return !done && ASK_RE.test(reply) ? { type: "skill_assessment" } : undefined;
}
