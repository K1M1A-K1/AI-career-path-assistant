import { useEffect, useState } from "react";
import CareerChat from "./pages/CareerChat";
import JobMatch from "./pages/JobMatch";
import { getUsage } from "./api";
import type { UsageReport } from "./types";

type Tab = "career" | "jobs";

export default function App() {
  const [tab, setTab] = useState<Tab>("career");
  const [usage, setUsage] = useState<UsageReport | null>(null);

  useEffect(() => {
    getUsage().then(setUsage).catch(() => setUsage(null));
  }, [tab]);

  return (
    <>
      <header>
        <h1>دستیار مسیر شغلی با هوش مصنوعی</h1>
        <nav>
          <button className={tab === "career" ? "active" : ""} onClick={() => setTab("career")}>
            نقشه راه شغلی
          </button>
          <button className={tab === "jobs" ? "active" : ""} onClick={() => setTab("jobs")}>
            تطبیق رزومه با شغل
          </button>
        </nav>
      </header>
      <main>
        {/* Both pages stay mounted so state survives tab switches. */}
        <div hidden={tab !== "career"}><CareerChat /></div>
        <div hidden={tab !== "jobs"}><JobMatch /></div>
        {usage && (
          <div className="usage">
            مصرف این نشست: {usage.prompt_tokens + usage.completion_tokens} توکن · هزینه تقریبی ${usage.est_cost_usd.toFixed(4)}
          </div>
        )}
      </main>
    </>
  );
}
