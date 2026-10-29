import ErrorBoundary from "../ErrorBoundary";
import SkillAssessmentForm from "./SkillAssessmentForm";
import { conceptLabelFa } from "../../lib/taxonomy";
import type { DeclNode, UIBlock } from "./blocks";

interface Ctx {
  send: (text: string) => void;
  busy: boolean;
}

/** Level 2: renders an allow-listed declarative tree; unknown node kinds render nothing. */
function Decl({ node, ctx, depth = 0 }: { node: DeclNode; ctx: Ctx; depth?: number }) {
  if (depth > 4 || !node || typeof node !== "object") return null;
  switch (node.kind) {
    case "text":
      return typeof node.text === "string" ? <p className="text-xs text-slate-600">{node.text}</p> : null;
    case "chips":
      return Array.isArray(node.options) ? (
        <div className="flex flex-wrap gap-1.5">
          {node.options.filter((o) => typeof o === "string").map((o) => (
            <button key={o} type="button" className="chip border-blue-300 bg-white text-blue-700 hover:bg-blue-50" disabled={ctx.busy} onClick={() => ctx.send(o)}>
              {o}
            </button>
          ))}
        </div>
      ) : null;
    case "metric":
      return <div className="rounded-lg bg-white p-2 text-xs"><div className="text-slate-500">{String(node.label)}</div><div className="font-bold">{String(node.value)}</div></div>;
    case "stack":
      return Array.isArray(node.children) ? (
        <div className="space-y-2">{node.children.map((c, i) => <Decl key={i} node={c} ctx={ctx} depth={depth + 1} />)}</div>
      ) : null;
    default:
      return null;
  }
}

/** Level 1 registry: UIBlock type → component. Each block has its own error boundary. */
export default function GenUIRegistry({ block, ctx }: { block: UIBlock; ctx: Ctx }) {
  const body = (() => {
    switch (block.type) {
      case "skill_assessment":
        return <SkillAssessmentForm onSubmit={ctx.send} disabled={ctx.busy} />;
      case "declarative":
        return <Decl node={block.schema} ctx={ctx} />;
      case "bridge_summary":
        return (
          <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs leading-6">
            <div className="font-bold text-indigo-900">{block.jobTitle} · {block.company}</div>
            <div>نقش هدف: {block.roleLabel}</div>
            {block.needed.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                مهارت‌های لازم برای این آگهی:
                {block.needed.map((id) => <bdi key={id} className="chip border-indigo-300 bg-white py-0.5 text-indigo-800">{conceptLabelFa(id)}</bdi>)}
              </div>
            )}
            {block.uncovered.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-amber-800">
                خارج از این نقشه راه:
                {block.uncovered.map((id) => <bdi key={id} className="chip border-amber-300 bg-white py-0.5">{conceptLabelFa(id)}</bdi>)}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  })();
  return body ? <ErrorBoundary compact>{body}</ErrorBoundary> : null;
}
