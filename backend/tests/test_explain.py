from app.jobs.explain import explanation_fa, matched_missing
from app.schemas import JobPosting, ResumeProfile


def posting(skill_ids):
    return JobPosting(id="p", source="s", title="t", company="c", location="تهران", url="https://x.test/p",
                      skill_ids=skill_ids)


def test_matched_missing_are_set_ops():
    r = ResumeProfile(skill_ids=["python_basics", "sql_basics", "excel"])
    m, x = matched_missing(r, posting(["docker_basics", "python_basics", "sql_basics", "python_basics", "git_basics"]))
    assert m == ["python_basics", "sql_basics"]          # posting order, no duplicates
    assert x == ["docker_basics", "git_basics"]
    assert not set(m) & set(x)


def test_explanation_edge_cases():
    both = explanation_fa(["python_basics", "sql_basics"], ["docker_basics"])
    assert "۲ مهارت از ۳" in both and "پایتون" in both and "پیشنهاد می‌شود" in both
    assert "python_basics" not in both  # labels, not ids
    assert "هیچ‌یک" in explanation_fa([], ["docker_basics"])
    full = explanation_fa(["python_basics"], [])
    assert "تمام" in full and "پیشنهاد" not in full
    assert "ثبت نشده" in explanation_fa([], [])


def test_explanation_lists_at_most_four():
    ids = ["python_basics", "sql_basics", "excel", "git_basics", "docker_basics", "linux_basics"]
    text = explanation_fa(ids, [])
    assert text.count("،") == 3 and "و …" in text
    assert "ي" not in text and "ك" not in text
