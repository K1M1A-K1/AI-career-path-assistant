"""Graph + taxonomy tests (P1): toy graphs for the algorithm, the real YAML for data quality."""
import pytest

from app.careers.graph import LEVELS, compute_roadmap
from app.careers.resources import pick_resources
from app.careers.taxonomy import (
    Concept, Role, Taxonomy, TaxonomyError, check_acyclic, find_role, load_taxonomy,
)
from app.schemas import CareerProfile, Resource


def _tax() -> Taxonomy:
    def c(i: str, pre: list[str]) -> Concept:
        return Concept(id=i, label_fa=i, label_en=i, prerequisites=pre)

    concepts = {x.id: x for x in [c("a", []), c("b", ["a"]), c("c", ["b"]), c("d", [])]}
    role = Role(id="r", label_fa="r", label_en="r", domain="x", levels={"junior": ["c"], "mid": [], "senior": []})
    return Taxonomy(concepts=concepts, roles={"r": role})


def _profile(**kw) -> CareerProfile:
    base = dict(target_role="r", target_level="junior", current_level="junior")
    return CareerProfile(**{**base, **kw})


REAL = load_taxonomy(validate=True)


def _real(role: str, level: str, **kw):
    return compute_roadmap(CareerProfile(target_role=role, target_level=level, current_level="junior", **kw), REAL)


# ---------- toy graph ----------
def test_cycle_is_rejected():
    tax = _tax()
    tax.concepts["a"].prerequisites = ["c"]
    with pytest.raises(TaxonomyError, match="cycle"):
        check_acyclic(tax.concepts)


def test_dangling_prerequisite_is_rejected():
    tax = _tax()
    tax.concepts["a"].prerequisites = ["ghost"]
    with pytest.raises(TaxonomyError, match="ghost"):
        check_acyclic(tax.concepts)


def test_prerequisites_ordered_before_dependents():
    rm = compute_roadmap(_profile(), _tax())
    assert rm.order.index("a") < rm.order.index("b") < rm.order.index("c")
    layers = {n.id: n.layer for n in rm.nodes}
    assert layers["a"] < layers["b"] < layers["c"]


def test_known_concepts_are_marked_known_and_not_todo():
    rm = compute_roadmap(_profile(known_concepts=["a"]), _tax())
    status = {n.id: n.status for n in rm.nodes}
    assert status["a"] == "known"
    assert status["b"] == "todo"


def test_heard_of_only_is_not_counted_as_known():
    rm = compute_roadmap(_profile(heard_of_only=["a"]), _tax())
    assert {n.id: n.status for n in rm.nodes}["a"] == "todo"


def test_unrelated_concepts_and_unknown_ids_are_excluded():
    rm = compute_roadmap(_profile(known_concepts=["nonexistent"]), _tax())
    ids = {n.id for n in rm.nodes}
    assert "d" not in ids and "nonexistent" not in ids


def test_known_concepts_own_prerequisites_not_required():
    rm = compute_roadmap(_profile(known_concepts=["b"]), _tax())
    assert {n.id: n.status for n in rm.nodes} == {"c": "todo", "b": "known"}


def test_unknown_role_raises_value_error():
    with pytest.raises(ValueError):
        compute_roadmap(_profile(target_role="nope"), _tax())


def test_deterministic():
    p = _profile(known_concepts=["a"])
    assert compute_roadmap(p, _tax()) == compute_roadmap(p, _tax())


# ---------- real taxonomy ----------
def test_real_taxonomy_meets_rfp_minimums():
    assert len(REAL.roles) >= 10
    assert len({r.domain for r in REAL.roles.values()}) >= 3


@pytest.mark.parametrize("role", sorted(REAL.roles))
@pytest.mark.parametrize("level", LEVELS)
def test_every_roadmap_is_ordered_and_fits_one_screen(role, level):
    rm = _real(role, level)
    layer = {n.id: n.layer for n in rm.nodes}
    pos = {c: i for i, c in enumerate(rm.order)}
    for e in rm.edges:
        assert layer[e.source] < layer[e.target]
        assert pos[e.source] < pos[e.target]
    assert len(rm.nodes) <= 35


def test_scenario_a_beginner_data_analyst():
    rm = _real("data_analyst", "junior", heard_of_only=["excel", "sql_basics"])
    status = {n.id: n.status for n in rm.nodes}
    for c in ("excel", "sql_basics", "statistics_basics", "bi_tools_basics"):
        assert status[c] == "todo"
    assert rm.order.index("excel") < rm.order.index("pivot_tables")


def test_scenario_b_junior_backend_to_senior():
    known = ["python_basics", "sql_basics", "relational_db", "git_basics", "http_basics", "rest_api"]
    rm = _real("backend_developer", "senior", known_concepts=known)
    todo = {n.id for n in rm.nodes if n.status == "todo"}
    for c in ("caching", "message_queues", "system_design", "distributed_systems"):
        assert c in todo
    assert not todo & set(known)


def test_correction_removing_a_known_concept_regenerates_the_roadmap():
    before = _real("data_analyst", "junior", known_concepts=["excel"])
    after = _real("data_analyst", "junior", known_concepts=[])
    assert {n.id: n.status for n in before.nodes}["excel"] == "known"
    assert {n.id: n.status for n in after.nodes}["excel"] == "todo"


def test_summary_mentions_only_graph_concepts():
    rm = _real("data_analyst", "junior", known_concepts=["excel"])
    todo = [n.label_fa for n in rm.nodes if n.status == "todo"]
    assert todo[0] in rm.summary_fa
    assert "اکسل" not in rm.summary_fa


def test_find_role_persian_variants():
    assert find_role("تحلیلگر داده", REAL) == "data_analyst"
    assert find_role("تحليلگر داده", REAL) == "data_analyst"  # Arabic yeh
    assert find_role("می‌خوام تحلیلگر داده بشم", REAL) == "data_analyst"
    assert find_role("Backend Developer", REAL) == "backend_developer"
    assert find_role("مهندس فضایی", REAL) is None


# ---------- resources ----------
def test_pick_resources_returns_only_verified_persian_first():
    tax = _tax()
    tax.resources["a"] = [
        Resource(title="dead", url="https://x.invalid", verified=False),
        Resource(title="en", url="https://e.example", verified=True),
        Resource(title="fa", url="https://f.example", lang="fa", verified=True),
    ]
    assert [r.title for r in pick_resources("a", tax)] == ["fa", "en"]
    assert pick_resources("b", tax) == []


def test_every_concept_has_a_verified_resource():
    missing = [c for c in REAL.concepts if not pick_resources(c, REAL)]
    assert not missing, f"no verified resource for: {missing}"
