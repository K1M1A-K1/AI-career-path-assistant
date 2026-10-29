import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { CareerProfile, Level } from "../../types";
import { LEVELS, LEVEL_LABEL, conceptLabelFa, roleLabelFa, taxonomy } from "../../lib/taxonomy";
import type { HitlRequest } from "./blocks";

interface Props {
  request: HitlRequest;
  busy?: boolean;
  onApprove: (profile: CareerProfile) => void;
  onReject: () => void;
}

/** GenUI #4 — human-in-the-loop gate before a roadmap is regenerated. Shows the exact payload. */
export default function HitlConfirmationCard({ request, busy, onApprove, onReject }: Props) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<CareerProfile>(request.profile);

  return (
    <section role="alertdialog" aria-label={request.title} className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-900">
        <ShieldCheck className="size-4" aria-hidden /> {request.title}
      </h3>
      <p className="mb-3 leading-6 text-slate-700">{request.description}</p>

      <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-white p-3">
        <dt className="font-bold">نقش هدف</dt>
        <dd>
          {editing ? (
            <select className="field py-1" value={profile.target_role} onChange={(e) => setProfile({ ...profile, target_role: e.target.value })}>
              {Object.values(taxonomy.roles).map((r) => <option key={r.id} value={r.id}>{r.label_fa}</option>)}
            </select>
          ) : roleLabelFa(profile.target_role)}
        </dd>
        <dt className="font-bold">سطح هدف</dt>
        <dd>
          {editing ? (
            <select className="field py-1" value={profile.target_level} onChange={(e) => setProfile({ ...profile, target_level: e.target.value as Level })}>
              {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          ) : LEVEL_LABEL[profile.target_level]}
        </dd>
        <dt className="font-bold">مهارت‌های فعلی</dt>
        <dd className="flex flex-wrap gap-1">
          {profile.known_concepts.length === 0 && "—"}
          {profile.known_concepts.map((id) => (
            <span key={id} className="chip border-emerald-300 bg-emerald-50 py-0.5 text-emerald-800">
              <bdi>{conceptLabelFa(id)}</bdi>
              {editing && (
                <button
                  type="button"
                  className="ms-1 text-emerald-900"
                  aria-label={`حذف ${conceptLabelFa(id)}`}
                  onClick={() => setProfile({ ...profile, known_concepts: profile.known_concepts.filter((k) => k !== id) })}
                >×</button>
              )}
            </span>
          ))}
        </dd>
        {request.focusIds.length > 0 && (
          <>
            <dt className="font-bold">مهارت‌های هدف</dt>
            <dd className="flex flex-wrap gap-1">
              {request.focusIds.map((id) => (
                <span key={id} className="chip border-indigo-300 bg-indigo-50 py-0.5 text-indigo-800"><bdi>{conceptLabelFa(id)}</bdi></span>
              ))}
            </dd>
          </>
        )}
      </dl>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={busy} onClick={() => onApprove(profile)}>تایید و بازتولید نقشه راه</button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => setEditing((v) => !v)}>
          {editing ? "پایان ویرایش" : "ویرایش پارامترها"}
        </button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={onReject}>رد</button>
      </div>
    </section>
  );
}
