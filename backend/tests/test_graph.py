"""Graph tests. xfail(NotImplementedError) until P1 implements careers/graph.py + check_acyclic."""
import pytest

from app.careers.graph import compute_roadmap
from app.careers.taxonomy import Concept, Role, Taxonomy, TaxonomyError, check_acyclic
from app.schemas import CareerProfile

pending = pytest.mark.xfail(raises=NotImplementedError, reason="P1 has not implemented this yet")


def _tax() -> Taxonomy:
    def c(i: str, pre: list[str]) -> Concept:
        return Concept(id=i, label_fa=i, label_en=i, prerequisites=pre)

    concepts = {x.id: x for x in [c("a", []), c("b", ["a"]), c("c", ["b"]), c("d", [])]}
    role = Role(id="r", label_fa="r", label_en="r", domain="x", levels={"junior": ["c"], "mid": [], "senior": []})
    return Taxonomy(concepts=concepts, roles={"r": role})


def _profile(**kw) -> CareerProfile:
    base = dict(target_role="r", target_level="junior", current_level="junior")
    return CareerProfile(**{**base, **kw})


@pending
def test_cycle_is_rejected():
    tax = _tax()
    tax.concepts["a"].prerequisites = ["c"]
    with pytest.raises(TaxonomyError):
        check_acyclic(tax.concepts)


@pending
def test_prerequisites_ordered_before_dependents():
    rm = compute_roadmap(_profile(), _tax())
    assert rm.order.index("a") < rm.order.index("b") < rm.order.index("c")
    layers = {n.id: n.layer for n in rm.nodes}
    assert layers["a"] < layers["b"] < layers["c"]


@pending
def test_known_concepts_are_marked_known_and_not_todo():
    rm = compute_roadmap(_profile(known_concepts=["a"]), _tax())
    status = {n.id: n.status for n in rm.nodes}
    assert status["a"] == "known"
    assert status["b"] == "todo"


@pending
def test_heard_of_only_is_not_counted_as_known():
    rm = compute_roadmap(_profile(heard_of_only=["a"]), _tax())
    assert {n.id: n.status for n in rm.nodes}["a"] == "todo"


@pending
def test_unrelated_concepts_and_unknown_ids_are_excluded():
    rm = compute_roadmap(_profile(known_concepts=["nonexistent"]), _tax())
    ids = {n.id for n in rm.nodes}
    assert "d" not in ids and "nonexistent" not in ids
