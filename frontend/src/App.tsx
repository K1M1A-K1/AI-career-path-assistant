import { Briefcase, Map } from "lucide-react";
import CareerChat from "./pages/CareerChat";
import JobMatch from "./pages/JobMatch";
import ErrorBoundary from "./components/ErrorBoundary";
import UsageTelemetryBadge from "./components/gen-ui/UsageTelemetryBadge";
import { useAppStore, type Tab } from "./store";

const TABS: { id: Tab; label: string; Icon: typeof Map }[] = [
  { id: "career", label: "نقشه راه شغلی", Icon: Map },
  { id: "jobs", label: "تطبیق رزومه با شغل", Icon: Briefcase },
];

export default function App() {
  const tab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.setTab);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <h1 className="text-lg font-bold">دستیار مسیر شغلی با هوش مصنوعی</h1>
        <nav className="flex gap-1" aria-label="ماژول‌ها">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${tab === id ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </nav>
        <div className="ms-auto"><UsageTelemetryBadge /></div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        {/* Both pages stay mounted so state survives tab switches. */}
        <div hidden={tab !== "career"}><ErrorBoundary><CareerChat /></ErrorBoundary></div>
        <div hidden={tab !== "jobs"}><ErrorBoundary><JobMatch /></ErrorBoundary></div>
      </main>
    </div>
  );
}
