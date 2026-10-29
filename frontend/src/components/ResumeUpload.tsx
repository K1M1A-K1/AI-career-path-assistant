import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import PrivacyNotice from "./PrivacyNotice";

interface Props {
  accepted: boolean;
  onAcceptChange: (v: boolean) => void;
  onFile: (file: File) => void;
  busy?: boolean;
}

/** B-01 — privacy-gated uploader. Validation itself lives in the store (validateResumeFile). */
export default function ResumeUpload({ accepted, onAcceptChange, onFile, busy }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const locked = !accepted || !!busy;

  return (
    <div className="space-y-3">
      <PrivacyNotice accepted={accepted} onChange={onAcceptChange} />
      <div
        aria-disabled={locked}
        onDragOver={(e) => { e.preventDefault(); if (!locked) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (locked) return;
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center text-sm transition-colors ${
          locked ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : drag ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
        }`}
      >
        <UploadCloud className="size-8" aria-hidden />
        <p>{accepted ? "رزومه (PDF یا DOCX، فارسی یا انگلیسی، حداکثر ۵ مگابایت) را اینجا رها کنید یا انتخاب کنید" : "برای فعال شدن بارگذاری، ابتدا بیانیه حریم خصوصی را بپذیرید"}</p>
        <input
          ref={input}
          type="file"
          accept=".pdf,.docx"
          disabled={locked}
          className="sr-only"
          aria-label="انتخاب فایل رزومه"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <button type="button" className="btn" disabled={locked} onClick={() => input.current?.click()}>انتخاب فایل</button>
      </div>
    </div>
  );
}
