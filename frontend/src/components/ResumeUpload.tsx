import { useState } from "react";
import PrivacyNotice from "./PrivacyNotice";

interface Props { onFile: (file: File) => void; busy?: boolean }

export default function ResumeUpload({ onFile, busy }: Props) {
  const [accepted, setAccepted] = useState(false);
  if (!accepted) return <PrivacyNotice onAccept={() => setAccepted(true)} />;
  return (
    <div className="card">
      <label>
        رزومه (PDF یا DOCX، فارسی یا انگلیسی):{" "}
        <input
          type="file"
          accept=".pdf,.docx"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
    </div>
  );
}
