export default function PrivacyNotice({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="notice">
      <strong>اطلاعیه حریم خصوصی</strong>
      <p>
        رزومه و اطلاعات شما فقط در حافظه همین نشست نگهداری می‌شود، ذخیره یا ثبت (log) نمی‌شود و با بستن
        صفحه از بین می‌رود. متن رزومه برای استخراج مهارت‌ها به سرویس مدل زبانی ارسال می‌شود.
      </p>
      <button className="btn" onClick={onAccept}>متوجه شدم، ادامه</button>
    </div>
  );
}
