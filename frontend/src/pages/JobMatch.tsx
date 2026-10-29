import { useState } from "react";
import JobCard from "../components/JobCard";
import ResumeUpload from "../components/ResumeUpload";
import { matchJobs, uploadResume } from "../api";
import type { JobMatch as Match, Level, ResumeProfile } from "../types";

export default function JobMatch() {
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState<"" | Level>("");
  const [remote, setRemote] = useState(false);
  const [method, setMethod] = useState<"baseline" | "hybrid">("hybrid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const search = () =>
    run(async () =>
      setMatches(
        await matchJobs({
          method,
          filters: { location: location || null, seniority: seniority || null, remote: remote || null },
        }),
      ),
    );

  const onFile = (file: File) =>
    run(async () => {
      setResume(await uploadResume(file));
      setMatches(await matchJobs({ method, filters: {} }));
    });

  return (
    <div>
      <ResumeUpload onFile={onFile} busy={busy} />
      {error && <p className="err">{error}</p>}
      {resume && (
        <div className="card">
          <strong>مهارت‌های استخراج‌شده:</strong> {resume.skills.join("، ")}
          <div>سابقه: {resume.years_experience} سال · محل: {resume.location ?? "نامشخص"}</div>
        </div>
      )}
      {resume && (
        <div className="filters">
          <input type="text" placeholder="شهر / محل" value={location} onChange={(e) => setLocation(e.target.value)} />
          <select value={seniority} onChange={(e) => setSeniority(e.target.value as "" | Level)}>
            <option value="">همه سطوح</option>
            <option value="junior">مبتدی</option>
            <option value="mid">متوسط</option>
            <option value="senior">پیشرفته</option>
          </select>
          <label><input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> دورکاری</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as "baseline" | "hybrid")}>
            <option value="hybrid">روش ترکیبی</option>
            <option value="baseline">روش پایه (BM25)</option>
          </select>
          <button className="btn" onClick={search} disabled={busy}>جستجو</button>
        </div>
      )}
      {matches.map((m) => (
        <JobCard key={m.posting.id} match={m} />
      ))}
      {resume && matches.length === 0 && !busy && <p>موردی یافت نشد.</p>}
    </div>
  );
}
