import type { CareerProfile, JobMatch, JobPosting, Level, Resource, Roadmap, RoadmapEdge, RoadmapNode } from "../types";
import { taxonomy, type Taxonomy } from "./taxonomy";

const LEVEL_SET = new Set<string>(["junior", "mid", "senior"]);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const asLevel = (v: unknown, fallback: Level): Level => (typeof v === "string" && LEVEL_SET.has(v) ? (v as Level) : fallback);

/** Only http(s) links may reach an <a href>; blocks javascript:/data: URLs. */
export function safeUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** A-04 / NF-06: never trust raw model JSON. Unknown roles → null; unknown concepts are stripped. */
export function validateCareerProfile(raw: unknown, tax: Taxonomy = taxonomy): CareerProfile | null {
  try {
    if (!isObj(raw)) return null;
    const role = typeof raw.target_role === "string" ? raw.target_role.trim() : "";
    if (!tax.roles[role]) return null;
    const keep = (v: unknown) => [...new Set(strList(v).filter((c) => !!tax.concepts[c]))];
    return {
      target_role: role,
      target_level: asLevel(raw.target_level, "junior"),
      current_level: asLevel(raw.current_level, "junior"),
      known_concepts: keep(raw.known_concepts),
      heard_of_only: keep(raw.heard_of_only),
    };
  } catch {
    return null;
  }
}

/** A-03 secondary safeguard: iterative DFS with white/gray/black colouring over prerequisite edges. */
export function detectCycle(nodes: { id: string }[], edges: { source: string; target: string }[]): boolean {
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => adj.get(e.source)?.push(e.target));
  const color = new Map<string, 0 | 1 | 2>(); // 0 white, 1 gray, 2 black
  const visit = (start: string): boolean => {
    const stack: { id: string; i: number }[] = [{ id: start, i: 0 }];
    color.set(start, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const next = adj.get(top.id)?.[top.i++];
      if (next === undefined) {
        color.set(top.id, 2);
        stack.pop();
        continue;
      }
      const c = color.get(next) ?? 0;
      if (c === 1) return true;
      if (c === 0 && adj.has(next)) {
        color.set(next, 1);
        stack.push({ id: next, i: 0 });
      }
    }
    return false;
  };
  for (const n of nodes) if ((color.get(n.id) ?? 0) === 0 && visit(n.id)) return true;
  return false;
}

function cleanResource(r: unknown): Resource | null {
  if (!isObj(r)) return null;
  const url = safeUrl(r.url);
  if (!url || typeof r.title !== "string") return null;
  return {
    title: r.title,
    url,
    lang: typeof r.lang === "string" ? r.lang : "en",
    type: typeof r.type === "string" ? r.type : "article",
    verified: r.verified === true,
  };
}

/** Structural guard for /api/roadmap responses. Returns null when unusable. */
export function validateRoadmap(raw: unknown): Roadmap | null {
  if (!isObj(raw) || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return null;
  const nodes: RoadmapNode[] = [];
  const seen = new Set<string>();
  for (const n of raw.nodes) {
    if (!isObj(n) || typeof n.id !== "string" || seen.has(n.id)) continue;
    seen.add(n.id);
    nodes.push({
      id: n.id,
      label_fa: typeof n.label_fa === "string" ? n.label_fa : n.id,
      label_en: typeof n.label_en === "string" ? n.label_en : "",
      layer: typeof n.layer === "number" ? n.layer : 0,
      status: n.status === "known" ? "known" : "todo",
      resources: (Array.isArray(n.resources) ? n.resources : []).map(cleanResource).filter((r): r is Resource => !!r),
    });
  }
  const edges: RoadmapEdge[] = raw.edges
    .filter(isObj)
    .filter((e) => typeof e.source === "string" && typeof e.target === "string" && seen.has(e.source) && seen.has(e.target))
    .map((e) => ({ source: e.source as string, target: e.target as string }));
  const order = strList(raw.order).filter((id) => seen.has(id));
  return {
    role: typeof raw.role === "string" ? raw.role : "",
    level: asLevel(raw.level, "junior"),
    nodes,
    edges,
    order: order.length ? order : nodes.map((n) => n.id),
    summary_fa: typeof raw.summary_fa === "string" ? raw.summary_fa : "",
  };
}

function cleanPosting(p: unknown): JobPosting | null {
  if (!isObj(p) || typeof p.id !== "string" || typeof p.title !== "string") return null;
  return {
    id: p.id,
    source: typeof p.source === "string" ? p.source : "",
    title: p.title,
    company: typeof p.company === "string" ? p.company : "",
    location: typeof p.location === "string" ? p.location : "",
    remote: p.remote === true,
    seniority: typeof p.seniority === "string" && LEVEL_SET.has(p.seniority) ? (p.seniority as Level) : null,
    requirements: strList(p.requirements),
    skill_ids: strList(p.skill_ids),
    published_at: typeof p.published_at === "string" ? p.published_at : null,
    url: safeUrl(p.url) ?? "",
  };
}

export function validateJobMatches(raw: unknown): JobMatch[] {
  if (!Array.isArray(raw)) return [];
  const out: JobMatch[] = [];
  for (const m of raw) {
    if (!isObj(m)) continue;
    const posting = cleanPosting(m.posting);
    if (!posting) continue;
    out.push({
      posting,
      score: typeof m.score === "number" && isFinite(m.score) ? m.score : 0,
      matched_skills: strList(m.matched_skills),
      missing_skills: strList(m.missing_skills),
      explanation_fa: typeof m.explanation_fa === "string" ? m.explanation_fa : "",
    });
  }
  return out;
}

/** Score arrives as 0–1 (backend) but be tolerant of 0–100. */
export const scorePercent = (score: number) => Math.max(0, Math.min(100, Math.round(score <= 1 ? score * 100 : score)));

/** Numbers in a Persian summary (Persian or ASCII digits) so A-09 can be cross-checked with the graph. */
export function numbersIn(text: string): number[] {
  const ascii = text.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  return (ascii.match(/\d+/g) ?? []).map(Number);
}
