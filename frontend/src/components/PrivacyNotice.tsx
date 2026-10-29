import { Lock, ShieldAlert } from "lucide-react";

interface Props { accepted: boolean; onChange: (v: boolean) => void }

/** NF-03 — shown before any file can be chosen. */
export default function PrivacyNotice({ accepted, onChange }: Props) {
  return (
    <section
      dir="rtl"
      aria-label="بیانیه حریم خصوصی"
      className={`rounded-2xl border p-4 transition-colors ${accepted ? "border-emerald-300 bg-emerald-50/60" : "border-amber-300 bg-amber-50"}`}
    >
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
        {accepted ? <Lock className="size-4 text-emerald-700" aria-hidden /> : <ShieldAlert className="size-4 text-amber-700" aria-hidden />}
        اطلاعیه حریم خصوصی رزومه
      </h3>
      <p className="text-xs leading-6 text-slate-700">
        رزومه و پروفایل استخراج‌شده شما <strong>فقط در حافظه همین نشست</strong> نگهداری می‌شود، در هیچ لاگی ثبت یا ذخیره نمی‌شود و با
        بستن نشست از بین می‌رود. متن رزومه برای استخراج مهارت‌ها فقط به سرویس مدل هوش مصنوعی ارسال می‌شود و با شخص ثالث دیگری به
        اشتراک گذاشته نمی‌شود. لطفاً فقط از رزومه آزمایشی یا رزومه‌ای که صاحب آن رضایت داده استفاده کنید.
      </p>
      <label className="mt-3 inline-flex cursor-pointer select-none items-center gap-2 text-xs font-semibold">
        <input type="checkbox" className="size-4 accent-blue-600" checked={accepted} onChange={(e) => onChange(e.target.checked)} />
        شرایط حریم خصوصی را مطالعه کرده‌ام و اجازه پردازش موقت رزومه را می‌دهم.
      </label>
    </section>
  );
}
