export const MAX_RESUME_BYTES = 5 * 1024 * 1024; // backend settings.max_upload_mb = 5

export interface FileCheck { valid: boolean; error?: string }

const startsWith = (b: Uint8Array, sig: number[]) => sig.every((x, i) => b[i] === x);
const PDF = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04 (OOXML)
const OLE = [0xd0, 0xcf, 0x11, 0xe0]; // legacy .doc

const MIME_OK: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

/** B-01 / NF-03 / NF-06: four client-side layers before any FormData is built. */
export async function validateResumeFile(file: File, privacyAccepted: boolean): Promise<FileCheck> {
  if (!privacyAccepted) return { valid: false, error: "ابتدا بیانیه حریم خصوصی را بپذیرید." };
  if (!file || file.size <= 0) return { valid: false, error: "فایل انتخاب‌شده خالی است." };
  if (file.size > MAX_RESUME_BYTES) return { valid: false, error: "حجم فایل نباید بیشتر از ۵ مگابایت باشد." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "doc") return { valid: false, error: "فرمت قدیمی DOC پشتیبانی نمی‌شود؛ فایل را به DOCX یا PDF تبدیل کنید." };
  if (ext !== "pdf" && ext !== "docx") return { valid: false, error: "فقط فایل‌های PDF و DOCX مجاز هستند." };
  if (file.type && !MIME_OK[ext].includes(file.type) && file.type !== "application/octet-stream") {
    return { valid: false, error: "نوع فایل با پسوند آن هم‌خوانی ندارد." };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  } catch {
    return { valid: false, error: "خواندن فایل ممکن نشد." };
  }
  if (startsWith(bytes, OLE)) return { valid: false, error: "فرمت قدیمی DOC شناسایی شد؛ فایل را به DOCX یا PDF تبدیل کنید." };
  if (ext === "pdf" && !startsWith(bytes, PDF)) return { valid: false, error: "ساختار باینری فایل با استاندارد PDF مطابقت ندارد." };
  if (ext === "docx" && !startsWith(bytes, ZIP)) return { valid: false, error: "ساختار باینری فایل با استاندارد DOCX مطابقت ندارد." };
  return { valid: true };
}
