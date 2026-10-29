import { toPng } from "html-to-image";
import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";

const W = 1600;
const H = 1000;

/**
 * A-11: export the whole DAG (including off-screen nodes) as PNG or PDF.
 * `root` is the element that contains `.react-flow__viewport`. The PDF embeds the PNG (raster).
 */
export async function exportRoadmap(root: HTMLElement | null, nodes: Node[], format: "png" | "pdf", name = "roadmap") {
  const viewportEl = root?.querySelector<HTMLElement>(".react-flow__viewport");
  if (!root || !viewportEl || nodes.length === 0) throw new Error("گراف نقشه راه برای خروجی گرفتن آماده نیست.");

  const bounds = getNodesBounds(nodes);
  const vp = getViewportForBounds(bounds, W, H, 0.1, 2, 0.12);

  root.setAttribute("data-exporting", "true");
  try {
    const dataUrl = await toPng(viewportEl, {
      backgroundColor: "#f8fafc",
      width: W,
      height: H,
      pixelRatio: 2,
      style: {
        width: `${W}px`,
        height: `${H}px`,
        transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
        letterSpacing: "normal",
      },
      filter: (n) => {
        if (!(n instanceof HTMLElement)) return true;
        const c = n.classList;
        return !c.contains("react-flow__controls") && !c.contains("react-flow__minimap") && !c.contains("react-flow__panel");
      },
    });
    const file = `roadmap-${name.replace(/\s+/g, "-")}`;
    if (format === "png") {
      const a = document.createElement("a");
      a.download = `${file}.png`;
      a.href = dataUrl;
      a.click();
      return;
    }
    const { jsPDF } = await import("jspdf"); // lazy: keeps jspdf out of the main bundle
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [W, H] });
    pdf.addImage(dataUrl, "PNG", 0, 0, W, H);
    pdf.save(`${file}.pdf`);
  } finally {
    root.removeAttribute("data-exporting");
  }
}
