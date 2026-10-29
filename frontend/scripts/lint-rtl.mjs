// Fails when physical-direction utilities or letter-spacing utilities appear in src/ (NF-01).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const rules = [
  [/(?<![\w-])-?(ml|mr|pl|pr)-(\d|\[|px|auto)/, "use ms-/me-/ps-/pe-"],
  [/(?<![\w-])-?(left|right)-(\d|\[|px|full|auto|1\/2)/, "use start-/end-"],
  [/(?<![\w-])text-(left|right)(?![\w-])/, "use text-start/text-end"],
  [/(?<![\w-])rounded-(tl|tr|bl|br)(?![a-z])/, "use rounded-ss/se/es/ee"],
  [/(?<![\w-])border-(l|r)(?![a-z])(-\d)?/, "use border-s/border-e"],
  [/(?<![\w-])tracking-/, "no letter-spacing utilities on Persian text"],
  [/margin-(left|right)|padding-(left|right)/, "use logical CSS properties"],
];
let bad = 0;
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (f !== "fixtures" && f !== "data") walk(p); continue; }
    if (!/\.(tsx?|css)$/.test(f) || /\.test\./.test(f)) continue;
    readFileSync(p, "utf8").split("\n").forEach((line, i) => {
      for (const [re, hint] of rules) if (re.test(line)) { console.error(`${p}:${i + 1}: ${hint}\n  ${line.trim()}`); bad++; }
    });
  }
};
walk(root);
if (bad) { console.error(`lint:rtl failed (${bad})`); process.exit(1); }
console.log("lint:rtl ok");
