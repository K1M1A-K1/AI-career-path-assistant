import type { JobMatch } from "../types";

interface Props { match: JobMatch; onRoadmap?: (m: JobMatch) => void }

export default function JobCard({ match, onRoadmap }: Props) {
  const p = match.posting;
  return (
    <div className="card job">
      <span className="score">{Math.round(match.score * 100)}٪</span>
      <h3>{p.title}</h3>
      <div>{p.company} · {p.location}{p.remote ? " · دورکاری" : ""}</div>
      <p>{match.explanation_fa}</p>
      <div>
        مهارت‌های منطبق: {match.matched_skills.map((s) => <span key={s} className="tag ok">{s}</span>)}
      </div>
      <div>
        مهارت‌های کم: {match.missing_skills.map((s) => <span key={s} className="tag miss">{s}</span>)}
      </div>
      <p className="row">
        <a href={p.url} target="_blank" rel="noreferrer">مشاهده آگهی اصلی</a>
        {onRoadmap && match.missing_skills.length > 0 && (
          <button className="btn" onClick={() => onRoadmap(match)}>نقشه راه برای مهارت‌های کم</button>
        )}
      </p>
    </div>
  );
}
