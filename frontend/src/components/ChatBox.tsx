import { useEffect, useRef, useState } from "react";

export interface ChatMessage { from: "user" | "bot"; text: string }

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  busy?: boolean;
  placeholder?: string;
}

export default function ChatBox({ messages, onSend, busy, placeholder }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    onSend(t);
  };

  return (
    <div>
      <div className="chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>{m.text}</div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="row">
        <input
          type="text"
          value={text}
          placeholder={placeholder ?? "پیام خود را بنویسید…"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="btn" onClick={submit} disabled={busy || !text.trim()}>
          ارسال
        </button>
      </div>
    </div>
  );
}
