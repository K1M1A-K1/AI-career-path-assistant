import { useMemo, useState } from "react";
import type { Level } from "../../types";
import { LEVELS, LEVEL_SHORT, roleTargets, taxonomy } from "../../lib/taxonomy";

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

/** GenUI #1 — structured clarification form rendered inside the chat stream. */
export default function SkillAssessmentForm({ onSubmit, disabled }: Props) {
  const roles = useMemo(() => Object.values(taxonomy.roles), []);
  const [roleId, setRoleId] = useState("");
  const [level, setLevel] = useState<Level>("junior");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const candidates = useMemo(
    () => (roleId ? [...roleTargets(roleId, level)].slice(0, 18) : []),
    [roleId, level],
  );
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const submit = () => {
    const role = taxonomy.roles[roleId];
    if (!role) return;
    const skills = [...picked].filter((id) => candidates.includes(id)).map((id) => taxonomy.concepts[id].label_fa);
    onSubmit(
      `می‌خوام ${role.label_fa} بشم، سطح هدفم ${LEVEL_SHORT[level]} است.` +
        (skills.length ? ` این مهارت‌ها را بلدم: ${skills.join("، ")}.` : " هنوز مهارت خاصی ندارم."),
    );
  };

  return (
    <form
      className="mt-2 space-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs"
      aria-label="فرم ارزیابی سریع مهارت"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
    >
      <label className="block">
        <span className="mb-1 block font-bold text-slate-800">نقش شغلی هدف</span>
        <select className="field w-full" value={roleId} onChange={(e) => { setRoleId(e.target.value); setPicked(new Set()); }}>
          <option value="">انتخاب کنید…</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.label_fa}</option>)}
        </select>
      </label>

      <fieldset>
        <legend className="mb-1 font-bold text-slate-800">سطح هدف</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              role="radio"
              aria-checked={level === lv}
              onClick={() => setLevel(lv)}
              className={`chip ${level === lv ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}
            >
              {LEVEL_SHORT[lv]}
            </button>
          ))}
        </div>
      </fieldset>

      {candidates.length > 0 && (
        <fieldset>
          <legend className="mb-1 font-bold text-slate-800">کدام‌ها را از قبل بلدید؟</legend>
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={picked.has(id)}
                onClick={() => toggle(id)}
                className={`chip ${picked.has(id) ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}
              >
                {taxonomy.concepts[id].label_fa}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <button type="submit" className="btn" disabled={!roleId || disabled}>ارسال یکجا</button>
    </form>
  );
}
