import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Background, Controls, Handle, MarkerType, Panel, Position, ReactFlow, ReactFlowProvider, useReactFlow,
  type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import type { Roadmap, RoadmapNode } from "../types";
import { detectCycle } from "../lib/validators";
import { LEVEL_LABEL, conceptLevel, roleLabelFa, roleTargets } from "../lib/taxonomy";
import type { Level } from "../types";
import { exportRoadmap } from "../utils/exportRoadmap";

const NODE_W = 260;
const NODE_H = 136;

type Kind = "known" | "gap" | "prereq";
interface CardData extends Record<string, unknown> {
  node: RoadmapNode;
  kind: Kind;
  step: number;
  level: Level | null;
  unlock: boolean;
  focus: boolean;
}

interface Actions {
  onToggle: (id: string) => void;
  onMore: (n: RoadmapNode) => void;
  busy: boolean;
}
const ActionsCtx = createContext<Actions>({ onToggle: () => {}, onMore: () => {}, busy: false });

const KIND_STYLE: Record<Kind, string> = {
  known: "border-emerald-500 bg-emerald-50 text-emerald-950",
  prereq: "border-amber-500 bg-amber-50 text-amber-950",
  gap: "border-blue-600 bg-white text-slate-900",
};

function ConceptCardNode({ data }: NodeProps<Node<CardData>>) {
  const { onToggle, onMore, busy } = useContext(ActionsCtx);
  const { node, kind, step, level, unlock, focus } = data;
  const shown = node.resources.slice(0, 2);
  return (
    <div
      dir="rtl"
      style={{ width: NODE_W, minHeight: NODE_H }}
      className={`flex flex-col justify-between rounded-xl border-2 p-3 text-start shadow-md ${KIND_STYLE[kind]} ${focus ? "ring-4 ring-indigo-400/70" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="!size-2.5 !bg-slate-500" />
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">گام {step.toLocaleString("fa-IR")}</span>
          {level && <span className="text-[11px] font-medium text-slate-600">{LEVEL_LABEL[level]}</span>}
          {unlock && <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">باز‌کننده بازار کار</span>}
          {focus && !unlock && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">لازم برای این آگهی</span>}
        </div>
        <h4 className="text-sm font-bold leading-snug">
          {node.label_fa}
          {node.label_en && <bdi dir="ltr" className="ms-1.5 inline-block font-mono text-xs font-normal text-slate-500">({node.label_en})</bdi>}
        </h4>
      </div>

      {node.status === "todo" && shown.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 border-t border-slate-200/80 pt-1.5">
          {shown.map((r) => (
            <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" title={r.title} className="nodrag flex items-center gap-1 truncate text-xs text-blue-700 hover:underline">
              <ExternalLink className="size-3 shrink-0" aria-hidden />
              <bdi className="truncate">{r.title}</bdi>
              {r.verified && <span className="shrink-0 text-emerald-600" title="منبع تاییدشده">✓</span>}
            </a>
          ))}
          {node.resources.length > 2 && (
            <button type="button" className="nodrag export-hide text-start text-[11px] font-medium text-blue-700 hover:underline" onClick={() => onMore(node)}>
              +{(node.resources.length - 2).toLocaleString("fa-IR")} منبع دیگر
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => onToggle(node.id)}
        className="nodrag export-hide mt-2 w-full rounded bg-white/70 px-2 py-1 text-center text-[11px] font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-white disabled:opacity-50"
      >
        {node.status === "known" ? "❌ این مهارت را بلد نیستم" : "✅ این مهارت را بلدم"}
      </button>
      <Handle type="source" position={Position.Bottom} className="!size-2.5 !bg-blue-600" />
    </div>
  );
}
const nodeTypes = { conceptCard: ConceptCardNode };

function layout(roadmap: Roadmap, unlock: Set<string>, focus: Set<string>) {
  const targets = roleTargets(roadmap.role, roadmap.level);
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 45, ranksep: 75, marginx: 24, marginy: 24 });
  roadmap.nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  roadmap.edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const nodes: Node<CardData>[] = roadmap.nodes.map((n) => {
    const p = g.node(n.id);
    const kind: Kind = n.status === "known" ? "known" : targets.has(n.id) ? "gap" : "prereq";
    return {
      id: n.id,
      type: "conceptCard",
      position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 },
      draggable: false,
      data: {
        node: n, kind, step: Math.max(1, roadmap.order.indexOf(n.id) + 1),
        level: conceptLevel(roadmap.role, n.id), unlock: unlock.has(n.id), focus: focus.has(n.id),
      },
    };
  });
  const edges: Edge[] = roadmap.edges.map((e) => ({
    id: `${e.source}->${e.target}`, source: e.source, target: e.target, type: "smoothstep",
    style: { stroke: "#1A73E8", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#1A73E8" },
  }));
  return { nodes, edges };
}

interface Props {
  roadmap: Roadmap;
  unlockIds?: string[];
  focusIds?: string[];
  busy?: boolean;
  onToggle: (id: string) => void;
}

function Inner({ roadmap, unlockIds = [], focusIds = [], busy = false, onToggle }: Props) {
  const { fitView, getNodes } = useReactFlow();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drawer, setDrawer] = useState<RoadmapNode | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);

  const cyclic = useMemo(() => detectCycle(roadmap.nodes, roadmap.edges), [roadmap]);
  const laid = useMemo(
    () => (cyclic ? { nodes: [], edges: [] } : layout(roadmap, new Set(unlockIds), new Set(focusIds))),
    [roadmap, cyclic, unlockIds, focusIds],
  );

  const refit = useCallback(() => requestAnimationFrame(() => fitView({ padding: 0.18, duration: 350 })), [fitView]);
  useEffect(() => {
    const id = refit();
    return () => cancelAnimationFrame(id);
  }, [laid, refit]);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => refit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [refit]);

  const actions = useMemo(() => ({ onToggle, onMore: setDrawer, busy }), [onToggle, busy]);

  if (cyclic) {
    return (
      <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-900">
        <strong>خطای ساختار گراف (A-03):</strong> در پیش‌نیازهای استخراج‌شده دور شناسایی شد. نمایش گراف معیوب متوقف شد.
      </div>
    );
  }

  const doExport = async (fmt: "png" | "pdf") => {
    setExportErr(null);
    try {
      await exportRoadmap(wrapRef.current, getNodes(), fmt, roleLabelFa(roadmap.role));
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : "خطا در خروجی گرفتن");
    }
  };

  return (
    <ActionsCtx.Provider value={actions}>
      <div ref={wrapRef} dir="ltr" className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <ReactFlow
          nodes={laid.nodes}
          edges={laid.edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.2}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} position="bottom-left" />
          <Panel position="top-right" className="flex gap-2" >
            <div dir="rtl" className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={() => doExport("png")}><Download className="size-4" aria-hidden /> دانلود تصویر (PNG)</button>
              <button type="button" className="btn-ghost" onClick={() => doExport("pdf")}><FileText className="size-4" aria-hidden /> دانلود فایل (PDF)</button>
            </div>
          </Panel>
        </ReactFlow>

        {drawer && (
          <aside dir="rtl" className="absolute inset-y-0 end-0 z-20 w-72 overflow-y-auto border-s border-slate-200 bg-white p-4 shadow-xl" aria-label="منابع یادگیری">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold">منابع: {drawer.label_fa}</h4>
              <button type="button" aria-label="بستن" onClick={() => setDrawer(null)}><X className="size-4" /></button>
            </div>
            <ul className="space-y-2 text-xs">
              {drawer.resources.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline"><bdi>{r.title}</bdi></a>
                  <div className="text-slate-500">{r.type} · {r.lang}{r.verified ? " · تاییدشده ✓" : ""}</div>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
      {exportErr && <p role="alert" className="mt-1 text-xs text-red-700">{exportErr}</p>}
      <ul className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600" aria-label="راهنمای رنگ‌ها">
        <li><span className="me-1 inline-block size-2.5 rounded-sm bg-emerald-500" />بلد هستید</li>
        <li><span className="me-1 inline-block size-2.5 rounded-sm bg-amber-500" />پیش‌نیاز</li>
        <li><span className="me-1 inline-block size-2.5 rounded-sm bg-blue-600" />مهارت هدف (شکاف)</li>
        <li><span className="me-1 inline-block size-2.5 rounded-sm bg-indigo-600" />باز‌کننده بازار کار</li>
      </ul>
    </ActionsCtx.Provider>
  );
}

export default function RoadmapGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
