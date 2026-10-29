// Generates src/data/taxonomy.generated.json from backend/data/taxonomy/*.yaml.
// The output is committed because docker compose builds the image from ./frontend only.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, "../../backend/data/taxonomy");
const load = (f) => yaml.load(readFileSync(resolve(dir, f), "utf8"));

const concepts = {};
for (const c of load("concepts.yaml")) {
  concepts[c.id] = {
    id: c.id,
    label_fa: c.label_fa,
    label_en: c.label_en,
    prerequisites: c.prerequisites ?? [],
    aliases: c.aliases ?? [],
  };
}
const roles = {};
for (const r of load("roles.yaml")) {
  roles[r.id] = {
    id: r.id,
    label_fa: r.label_fa,
    label_en: r.label_en,
    aliases: r.aliases ?? [],
    levels: { junior: [], mid: [], senior: [], ...(r.levels ?? {}) },
  };
}
const out = resolve(here, "../src/data/taxonomy.generated.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ concepts, roles }, null, 1) + "\n");
console.log(`taxonomy: ${Object.keys(concepts).length} concepts, ${Object.keys(roles).length} roles`);
