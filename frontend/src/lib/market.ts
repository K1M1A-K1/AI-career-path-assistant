import type { JobMatch, Level, ResumeProfile } from "../types";
import { LEVELS, roleTargets, taxonomy, conceptLabelFa, type Taxonomy } from "./taxonomy";

export const MAX_STRETCH_GAP = 3;
export const MIN_UNLOCK_JOBS = 2;

/** posting.skill_ids − resume.skill_ids (ids drive logic; display strings come from the API). */
export function missingIds(match: JobMatch, resume: ResumeProfile | null): string[] {
  const have = new Set(resume?.skill_ids ?? []);
  return match.posting.skill_ids.filter((id) => !have.has(id));
}

/** Mid-level job that is only 1–3 skills away. */
export function isStretch(match: JobMatch, resume: ResumeProfile | null): boolean {
  const n = missingIds(match, resume).length;
  return match.posting.seniority === "mid" && n >= 1 && n <= MAX_STRETCH_GAP;
}

export const computeStretchJobs = (pool: JobMatch[], resume: ResumeProfile | null) =>
  pool.filter((m) => isStretch(m, resume));

export interface UnlockSkill { id: string; label: string; count: number }

/** Skills missing most often across stretch jobs, most frequent first. */
export function rankUnlockSkills(stretch: JobMatch[], resume: ResumeProfile | null): UnlockSkill[] {
  const counts = new Map<string, number>();
  for (const m of stretch) for (const id of missingIds(m, resume)) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: conceptLabelFa(id), count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

/** "Market unlock" ids: missing in ≥2 stretch jobs (or the top skill when there is a single stretch job). */
export function unlockIds(stretch: JobMatch[], resume: ResumeProfile | null): string[] {
  const min = Math.min(MIN_UNLOCK_JOBS, stretch.length);
  return rankUnlockSkills(stretch, resume).filter((s) => s.count >= min).map((s) => s.id);
}

/** Stretch jobs that become fully reachable once `skillIds` are learned. */
export const jobsUnlockedBy = (stretch: JobMatch[], resume: ResumeProfile | null, skillIds: string[]) => {
  const set = new Set(skillIds);
  return stretch.filter((m) => missingIds(m, resume).every((id) => set.has(id)));
};

export interface MarketSummary {
  total: number;
  junior: number;
  mid: number;
  stretch: JobMatch[];
  top: UnlockSkill[];
  unlocked: number;
}

/** Numbers for OpportunityPivotCard / banner — all derived from the real match pool. */
export function summarizeMarket(pool: JobMatch[], resume: ResumeProfile | null): MarketSummary {
  const stretch = computeStretchJobs(pool, resume);
  const top = rankUnlockSkills(stretch, resume).slice(0, 3);
  return {
    total: pool.length,
    junior: pool.filter((m) => m.posting.seniority === "junior").length,
    mid: pool.filter((m) => m.posting.seniority === "mid").length,
    stretch,
    top,
    unlocked: jobsUnlockedBy(stretch, resume, top.map((t) => t.id)).length,
  };
}

/** Role whose senior-level concept set best covers the posting's skills (alias in title wins ties). */
export function bestRoleForJob(match: JobMatch, resume: ResumeProfile | null, tax: Taxonomy = taxonomy): string | null {
  const ids = match.posting.skill_ids.filter((i) => tax.concepts[i]);
  const title = match.posting.title.toLowerCase();
  let best: { id: string; score: number } | null = null;
  for (const role of Object.values(tax.roles)) {
    const all = roleTargets(role.id, LEVELS[2], tax);
    const covered = ids.filter((i) => all.has(i)).length;
    const alias = [role.label_en, ...role.aliases].some((a) => title.includes(a.toLowerCase())) ? 0.5 : 0;
    const prev = (resume?.previous_roles ?? []).some((r) => role.aliases.some((a) => r.toLowerCase().includes(a.toLowerCase()))) ? 0.1 : 0;
    const score = (ids.length ? covered / ids.length : 0) + alias + prev;
    if (score > 0 && (!best || score > best.score)) best = { id: role.id, score };
  }
  return best?.id ?? null;
}

export interface JobFilters {
  location: string;
  seniority: "all" | Level;
  remoteOnly: boolean;
  includeStretch: boolean;
}
export const DEFAULT_FILTERS: JobFilters = { location: "", seniority: "all", remoteOnly: false, includeStretch: false };

/** Pure client-side filter (B-08). Sorted by score; stretch Mid jobs ride along for Junior when enabled. */
export function filterJobs(pool: JobMatch[], f: JobFilters, resume: ResumeProfile | null): JobMatch[] {
  const loc = f.location.trim().toLowerCase();
  return pool
    .filter((m) => {
      const p = m.posting;
      if (loc && !p.location.toLowerCase().includes(loc)) return false;
      if (f.remoteOnly && !p.remote) return false;
      if (f.seniority === "all" || p.seniority === f.seniority) return true;
      return f.seniority === "junior" && f.includeStretch && isStretch(m, resume);
    })
    .sort((a, b) => b.score - a.score);
}

export type { Level };
