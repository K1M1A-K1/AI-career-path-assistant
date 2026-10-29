import { useState } from "react";
import ChatBox, { type ChatMessage } from "../components/ChatBox";
import RoadmapGraph from "../components/RoadmapGraph";
import { correctRoadmap, getRoadmap, sendChat } from "../api";
import type { Roadmap } from "../types";

export default function CareerChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "سلام! برای شروع بنویسید به چه شغلی علاقه دارید." },
  ]);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const push = (m: ChatMessage) => setMessages((prev) => [...prev, m]);

  const onSend = async (text: string) => {
    push({ from: "user", text });
    setBusy(true);
    setError(null);
    try {
      if (roadmap) {
        // After the roadmap exists, every message is a correction ("من اکسل بلد نیستم").
        setRoadmap(await correctRoadmap(text));
        push({ from: "bot", text: "نقشه راه بر اساس اصلاح شما به‌روز شد." });
      } else {
        const res = await sendChat(text);
        push({ from: "bot", text: res.reply });
        if (res.done && res.profile) setRoadmap(await getRoadmap(res.profile));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="card">
        <ChatBox messages={messages} onSend={onSend} busy={busy} />
        {error && <p className="err">{error}</p>}
      </div>
      {roadmap && (
        <>
          <div className="card">{roadmap.summary_fa}</div>
          <RoadmapGraph roadmap={roadmap} />
          <div className="card">
            <h3>منابع یادگیری</h3>
            <ul>
              {roadmap.nodes.flatMap((n) =>
                n.status === "todo"
                  ? n.resources.map((r) => (
                      <li key={n.id + r.url}>
                        {n.label_fa}: <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                      </li>
                    ))
                  : [],
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
