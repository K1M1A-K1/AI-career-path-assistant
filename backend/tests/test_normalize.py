from app.careers.taxonomy import Concept, Taxonomy
from app.jobs.normalize import normalize_text, map_skills


def test_persian_and_technical_tokens():
    assert normalize_text("  پايه كاري\n C++ C# .NET sql_basics  ") == "پایه کاری c++ c# .net sql_basics"
    assert normalize_text("كَار ۱۲٣") == "کار 123"
    assert "\u200c" in normalize_text("می‌توانم")


def test_dynamic_mapping_ambiguity_and_order():
    def concept(id, fa, en, aliases):
        return Concept(id=id, label_fa=fa, label_en=en, aliases=aliases)
    tax = Taxonomy(roles={}, concepts={c.id:c for c in [
        concept("excel", "اکسل", "Excel", ["spreadsheet", "مشترک"]),
        concept("cpp", "سی پلاس", "C++", ["مشترک"]),
        concept("csharp", "سی شارپ", "C#", []),
        concept("dotnet", "دات‌نت", ".NET", []),
        concept("power_bi", "پاور بی آی", "Power BI", []),
    ]})
    assert map_skills(["Spreadsheet", "اکسل", "unknown", "C++", "C#", ".NET", "Power BI", "مشترک", "excellent"], tax) == ["excel", "cpp", "csharp", "dotnet", "power_bi"]
    assert map_skills(["دات نت"], tax) == ["dotnet"]
