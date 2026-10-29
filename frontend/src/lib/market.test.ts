import { describe, expect, it } from "vitest";
import type { JobMatch, ResumeProfile } from "../types";
import { DEFAULT_FILTERS, bestRoleForJob, computeStretchJobs, filterJobs, jobsUnlockedBy, missingIds, rankUnlockSkills, summarizeMarket, unlockIds } from "./market";

const resume: ResumeProfile = {
  skills: ["Python", "SQL", "Git"], skill_ids: ["python_basics", "sql_basics", "git_basics"],
  years_experience: 1, education: [], previous_roles: [], location: "Tehran", level_guess: "junior",
};
const job = (id: string, seniority: "junior" | "mid" | "senior", skill_ids: string[], extra: Partial<JobMatch["posting"]> = {}, score = 0.5): JobMatch => ({
  posting: { id, source: "t", title: `Backend Developer ${id}`, company: "C", location: "Tehran", remote: false, seniority, requirements: [], skill_ids, published_at: null, url: "https://e.com", ...extra },
  score, matched_skills: [], missing_skills: [], explanation_fa: "",
});

const pool = [
  job("j1", "junior", ["python_basics", "sql_basics"], {}, 0.9),
  job("m1", "mid", ["python_basics", "docker_basics"], {}, 0.7),
  job("m2", "mid", ["sql_basics", "docker_basics", "ci_cd"], { remote: true, location: "Remote" }, 0.6),
  job("m3", "mid", ["a", "b", "c", "d"], {}, 0.5), // 4 missing → not stretch
  job("s1", "senior", ["python_basics", "docker_basics"], {}, 0.4),
];

describe("market insights", () => {
  it("computes missing ids from posting minus resume", () => {
    expect(missingIds(pool[2], resume)).toEqual(["docker_basics", "ci_cd"]);
  });
  it("stretch = mid job with 1–3 missing skills", () => {
    expect(computeStretchJobs(pool, resume).map((m) => m.posting.id)).toEqual(["m1", "m2"]);
  });
  it("ranks Docker as the top unlock skill and marks it as unlock", () => {
    const stretch = computeStretchJobs(pool, resume);
    expect(rankUnlockSkills(stretch, resume)[0]).toMatchObject({ id: "docker_basics", count: 2 });
    expect(unlockIds(stretch, resume)).toEqual(["docker_basics"]);
  });
  it("counts jobs unlocked by learning given skills", () => {
    const stretch = computeStretchJobs(pool, resume);
    expect(jobsUnlockedBy(stretch, resume, ["docker_basics"]).map((m) => m.posting.id)).toEqual(["m1"]);
    expect(jobsUnlockedBy(stretch, resume, ["docker_basics", "ci_cd"])).toHaveLength(2);
  });
  it("summarises only from real data and handles empty pools", () => {
    const s = summarizeMarket(pool, resume);
    expect([s.total, s.junior, s.mid]).toEqual([5, 1, 3]);
    expect(summarizeMarket([], null)).toMatchObject({ total: 0, stretch: [], unlocked: 0 });
  });
  it("maps a backend-style job to a taxonomy role", () => {
    expect(bestRoleForJob(job("x", "mid", ["python_basics", "rest_api", "docker_basics"]), resume)).toBe("backend_developer");
  });
});

describe("filterJobs (B-08)", () => {
  it("filters by location, remote and seniority; sorts by score", () => {
    expect(filterJobs(pool, { ...DEFAULT_FILTERS, remoteOnly: true }, resume).map((m) => m.posting.id)).toEqual(["m2"]);
    expect(filterJobs(pool, { ...DEFAULT_FILTERS, location: "teh" }, resume).map((m) => m.posting.id)).toEqual(["j1", "m1", "m3", "s1"]);
    expect(filterJobs(pool, { ...DEFAULT_FILTERS, seniority: "junior" }, resume).map((m) => m.posting.id)).toEqual(["j1"]);
  });
  it("includes reachable Mid jobs for Junior only when the smart toggle is on", () => {
    const on = filterJobs(pool, { ...DEFAULT_FILTERS, seniority: "junior", includeStretch: true }, resume).map((m) => m.posting.id);
    expect(on).toEqual(["j1", "m1", "m2"]);
  });
  it("is pure and fast on a large pool", () => {
    const big = Array.from({ length: 500 }, (_, i) => job(`b${i}`, i % 2 ? "mid" : "junior", ["python_basics", "docker_basics"], {}, Math.random()));
    const frozen = JSON.stringify(big);
    const t0 = performance.now();
    filterJobs(big, { ...DEFAULT_FILTERS, seniority: "junior", includeStretch: true }, resume);
    expect(performance.now() - t0).toBeLessThan(50);
    expect(JSON.stringify(big)).toBe(frozen);
  });
});
