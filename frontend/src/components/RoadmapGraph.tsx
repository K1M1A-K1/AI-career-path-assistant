import { useMemo } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import type { Roadmap } from "../types";

const X_GAP = 200;
const Y_GAP = 110;

export default function RoadmapGraph({ roadmap }: { roadmap: Roadmap }) {
  const { nodes, edges } = useMemo(() => {
    const perLayer: Record<number, number> = {};
    const nodes: Node[] = roadmap.nodes.map((n) => {
      const idx = (perLayer[n.layer] = (perLayer[n.layer] ?? -1) + 1);
      const known = n.status === "known";
      return {
        id: n.id,
        position: { x: idx * X_GAP, y: n.layer * Y_GAP },
        data: { label: `${n.label_fa}${known ? " ✓" : ""}` },
        style: {
          background: known ? "#e0f4e8" : "#fff",
          border: `1px solid ${known ? "#1f9d55" : "#2f5be7"}`,
          borderRadius: 10,
          padding: 8,
          fontFamily: "Vazirmatn, sans-serif",
        },
      };
    });
    const edges: Edge[] = roadmap.edges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: true,
    }));
    return { nodes, edges };
  }, [roadmap]);

  return (
    <div className="graph" dir="ltr">
      <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false}>
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
