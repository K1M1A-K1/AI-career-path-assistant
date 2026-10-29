import data from "../data/taxonomy.generated.json";
import type { Level } from "../types";

export interface ConceptInfo {
  id: string;
  label_fa: string;
  label_en: string;
  prerequisites: string[];
  aliases: string[];
}
export interface RoleInfo {
  id: string;
  label_fa: string;
  label_en: string;
  aliases: string[];
  levels: Record<Level, string[]>;
}
export interface Taxonomy {
  concepts: Record<string, ConceptInfo>;
  roles: Record<string, RoleInfo>;
}

export const taxonomy = data as unknown as Taxonomy;
export const LEVELS: Level[] = ["junior", "mid", "senior"];
export const LEVEL_LABEL: Record<Level, string> = {
  junior: "مقدماتی (Junior)",
  mid: "میانی (Mid)",
  senior: "ارشد (Senior)",
};
export const LEVEL_SHORT: Record<Level, string> = { junior: "مقدماتی", mid: "میانی", senior: "ارشد" };

/** Concepts a role requires at `level` (cumulative, like backend graph.target_concepts). */
export function roleTargets(roleId: string, level: Level, tax: Taxonomy = taxonomy): Set<string> {
  const role = tax.roles[roleId];
  const out = new Set<string>();
  if (!role) return out;
  for (const lv of LEVELS.slice(0, LEVELS.indexOf(level) + 1)) {
    for (const c of role.levels[lv] ?? []) if (tax.concepts[c]) out.add(c);
  }
  return out;
}

/** ids plus all their transitive prerequisites. Unknown ids are dropped. */
export function withAncestors(ids: Iterable<string>, tax: Taxonomy = taxonomy): Set<string> {
  const out = new Set<string>();
  const stack = [...ids].filter((i) => tax.concepts[i]);
  while (stack.length) {
    const c = stack.pop()!;
    if (out.has(c)) continue;
    out.add(c);
    stack.push(...tax.concepts[c].prerequisites.filter((p) => tax.concepts[p]));
  }
  return out;
}

/** id plus every concept that (transitively) requires it. */
export function withDescendants(id: string, tax: Taxonomy = taxonomy): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of Object.values(tax.concepts)) {
      if (!out.has(c.id) && c.prerequisites.some((p) => out.has(p))) {
        out.add(c.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Lowest role level whose list contains the concept; null when it is only a prerequisite. */
export function conceptLevel(roleId: string, conceptId: string, tax: Taxonomy = taxonomy): Level | null {
  const role = tax.roles[roleId];
  if (!role) return null;
  return LEVELS.find((lv) => role.levels[lv]?.includes(conceptId)) ?? null;
}

export const conceptLabelFa = (id: string) => taxonomy.concepts[id]?.label_fa ?? id;
export const roleLabelFa = (id: string) => taxonomy.roles[id]?.label_fa ?? id;
