import { describe, expect, it } from "vitest";
import { detectCycle, numbersIn, safeUrl, scorePercent, validateCareerProfile, validateJobMatches, validateRoadmap } from "./validators";

describe("detectCycle", () => {
  const n = (...ids: string[]) => ids.map((id) => ({ id }));
  it("accepts a DAG", () => {
    expect(detectCycle(n("a", "b", "c"), [{ source: "a", target: "b" }, { source: "a", target: "c" }, { source: "b", target: "c" }])).toBe(false);
  });
  it("finds a cycle", () => {
    expect(detectCycle(n("a", "b", "c"), [{ source: "a", target: "b" }, { source: "b", target: "c" }, { source: "c", target: "a" }])).toBe(true);
  });
  it("finds a self loop and ignores unknown endpoints", () => {
    expect(detectCycle(n("a"), [{ source: "a", target: "a" }])).toBe(true);
    expect(detectCycle(n("a"), [{ source: "a", target: "zzz" }])).toBe(false);
  });
});

describe("validateCareerProfile", () => {
  it("strips hallucinated concepts and keeps real ones", () => {
    const p = validateCareerProfile({ target_role: "data_analyst", target_level: "mid", current_level: "wizard", known_concepts: ["excel", "quantum_sql", 7], heard_of_only: ["pandas", "nope"] });
    expect(p).toEqual({ target_role: "data_analyst", target_level: "mid", current_level: "junior", known_concepts: ["excel"], heard_of_only: ["pandas"] });
  });
  it("rejects unknown roles and garbage without throwing", () => {
    expect(validateCareerProfile({ target_role: "astronaut" })).toBeNull();
    expect(validateCareerProfile(null)).toBeNull();
    expect(validateCareerProfile("{bad json")).toBeNull();
    expect(validateCareerProfile([1, 2])).toBeNull();
  });
});

describe("validateRoadmap", () => {
  it("drops dangling edges, duplicate nodes and unsafe resource urls", () => {
    const rm = validateRoadmap({
      role: "x", level: "mid", order: ["a", "ghost"], summary_fa: "s",
      nodes: [
        { id: "a", label_fa: "الف", label_en: "A", layer: 0, status: "todo", resources: [{ title: "ok", url: "https://e.com" }, { title: "bad", url: "javascript:alert(1)" }] },
        { id: "a", label_fa: "dup" },
        { id: "b", status: "known" },
      ],
      edges: [{ source: "a", target: "b" }, { source: "a", target: "ghost" }],
    });
    expect(rm?.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(rm?.edges).toHaveLength(1);
    expect(rm?.nodes[0].resources.map((r) => r.title)).toEqual(["ok"]);
    expect(rm?.order).toEqual(["a"]);
  });
  it("returns null for malformed payloads", () => {
    expect(validateRoadmap({})).toBeNull();
    expect(validateRoadmap(undefined)).toBeNull();
  });
});

describe("misc guards", () => {
  it("safeUrl allows only http(s)", () => {
    expect(safeUrl("https://a.com/x")).toBe("https://a.com/x");
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl(5)).toBeNull();
  });
  it("scorePercent normalises 0–1 and 0–100", () => {
    expect(scorePercent(0.86)).toBe(86);
    expect(scorePercent(72)).toBe(72);
    expect(scorePercent(2000)).toBe(100);
  });
  it("numbersIn reads Persian digits", () => {
    expect(numbersIn("۵ مفهوم و 3 مورد")).toEqual([5, 3]);
  });
  it("validateJobMatches skips junk entries", () => {
    const out = validateJobMatches([{ posting: { id: "1", title: "t", url: "javascript:x" }, score: 0.5 }, { nope: 1 }, null]);
    expect(out).toHaveLength(1);
    expect(out[0].posting.url).toBe("");
  });
});
