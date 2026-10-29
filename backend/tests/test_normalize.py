from app.careers.taxonomy import get_taxonomy
from app.jobs.normalize import map_skills, normalize_text

TAX = get_taxonomy()


def test_normalize_text_letters_digits_entities():
    assert normalize_text("پايتون  &amp; كار ۱۲٣") == "پایتون & کار 123"
    assert normalize_text("Power BI") == "power bi"


def test_arabic_letters_map_to_python():
    assert map_skills(["پايتون"], TAX) == ["python_basics"]


def test_excel_english_and_persian():
    assert map_skills(["Excel"], TAX) == ["excel"]
    assert map_skills(["اکسل"], TAX) == ["excel"]


def test_sentence_with_two_skills():
    ids = map_skills(["تسلط به SQL و Power BI"], TAX)
    assert "sql_basics" in ids and "data_visualization" in ids


def test_unknown_text_returns_empty():
    assert map_skills(["روابط عمومی قوی", "xyzzy"], TAX) == []
