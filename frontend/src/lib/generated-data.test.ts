import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { taxonomy } from "./taxonomy";

// Vitest runs with cwd = frontend/
const backend = (p: string) => resolve(process.cwd(), "../backend/data", p);

describe("generated data stays in sync with the backend", () => {
  it("taxonomy.generated.json matches concepts.yaml and roles.yaml (run `npm run sync:taxonomy` if this fails)", () => {
    const concepts = yaml.load(readFileSync(backend("taxonomy/concepts.yaml"), "utf8")) as { id: string; label_fa: string; prerequisites?: string[] }[];
    const roles = yaml.load(readFileSync(backend("taxonomy/roles.yaml"), "utf8")) as { id: string }[];

    expect(Object.keys(taxonomy.concepts).sort()).toEqual(concepts.map((c) => c.id).sort());
    for (const c of concepts) {
      expect(taxonomy.concepts[c.id].label_fa).toBe(c.label_fa);
      expect(taxonomy.concepts[c.id].prerequisites).toEqual(c.prerequisites ?? []);
    }
    expect(Object.keys(taxonomy.roles).sort()).toEqual(roles.map((r) => r.id).sort());
  });

  it("src/fixtures/*.json are identical to backend/data/fixtures/*.json (copy them again if this fails)", () => {
    for (const f of ["career_profile", "chat_script", "job_matches", "resume_profile", "roadmap"]) {
      const mine = JSON.parse(readFileSync(resolve(process.cwd(), `src/fixtures/${f}.json`), "utf8"));
      const theirs = JSON.parse(readFileSync(backend(`fixtures/${f}.json`), "utf8"));
      expect(mine, f).toEqual(theirs);
    }
  });
});
