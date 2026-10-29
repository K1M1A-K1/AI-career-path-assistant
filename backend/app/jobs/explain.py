from app.careers.taxonomy import get_taxonomy
from app.schemas import JobPosting, ResumeProfile

_MAX_LISTED = 4
_FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def _fa(n: int) -> str:
    return str(n).translate(_FA_DIGITS)


def matched_missing(resume: ResumeProfile, posting: JobPosting) -> tuple[list[str], list[str]]:
    """Return (matched_skill_ids, missing_skill_ids): posting.skill_ids ∩ / − resume.skill_ids.

    Both keep the posting's order and contain no duplicates.
    """
    have = set(resume.skill_ids)
    matched: list[str] = []
    missing: list[str] = []
    for sid in dict.fromkeys(posting.skill_ids):
        (matched if sid in have else missing).append(sid)
    return matched, missing


def _names(ids: list[str]) -> str:
    """Persian labels, at most 4, then «و …»."""
    concepts = get_taxonomy().concepts
    labels = [concepts[i].label_fa if i in concepts else i for i in ids[:_MAX_LISTED]]
    text = "، ".join(labels)
    return text + " و …" if len(ids) > _MAX_LISTED else text


def explanation_fa(matched: list[str], missing: list[str]) -> str:
    """Short deterministic Persian explanation built from the two lists (no LLM)."""
    total = len(matched) + len(missing)
    if total == 0:
        return "برای این آگهی مهارت مشخصی در فهرست ما ثبت نشده است؛ متن آگهی را مستقیم بررسی کنید."
    if not matched:
        return (
            f"هیچ‌یک از {_fa(total)} مهارت این آگهی در رزومه شما دیده نشد. "
            f"برای این شغل یادگیری {_names(missing)} پیشنهاد می‌شود."
        )
    if not missing:
        return f"با تمام {_fa(total)} مهارت این آگهی آشنا هستید: {_names(matched)}."
    return (
        f"با {_fa(len(matched))} مهارت از {_fa(total)} مهارت این آگهی آشنا هستید: {_names(matched)}. "
        f"برای این شغل یادگیری {_names(missing)} پیشنهاد می‌شود."
    )
