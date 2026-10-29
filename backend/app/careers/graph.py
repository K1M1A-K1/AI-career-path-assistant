"""Deterministic roadmap computation. MUST NOT call the LLM."""
from app.careers.resources import pick_resources
from app.careers.taxonomy import Taxonomy, ancestors, get_taxonomy
from app.schemas import CareerProfile, Roadmap, RoadmapEdge, RoadmapNode

LEVELS = ("junior", "mid", "senior")
LEVEL_FA = {"junior": "جونیور", "mid": "میان‌رده", "senior": "سینیور"}


def target_concepts(role_levels: dict[str, list[str]], level: str, taxonomy: Taxonomy) -> set[str]:
    """Concepts a role requires at `level`: that level plus all lower ones (cumulative)."""
    out: set[str] = set()
    for lv in LEVELS[: LEVELS.index(level) + 1]:
        out.update(c for c in role_levels.get(lv, []) if c in taxonomy.concepts)
    return out


def compute_roadmap(profile: CareerProfile, taxonomy: Taxonomy | None = None) -> Roadmap:
    """Compute the roadmap for `profile`.

    Algorithm:
      1. targets = concepts of roles[profile.target_role].levels up to target_level (cumulative).
      2. needed = targets + all transitive prerequisites (networkx.ancestors).
      3. Nodes with status "known" are those in profile.known_concepts; `heard_of_only`
         does NOT count as known. Known concepts are kept as nodes (status="known") only
         if needed; known concepts' own prerequisites are not required.
      4. layer = longest path from a root (0 = no prerequisites); `order` = topological order.
      5. Attach resources via careers.resources.pick_resources.
      6. Unknown role / concept ids are discarded, never shown.
    Raise ValueError for an unknown target_role.

    Knowing a concept implies knowing its prerequisites, so those count as known too (they only
    appear, as "known", when something else needs them). `heard_of_only` never counts.
    """
    tax = taxonomy or get_taxonomy()
    role = tax.roles.get(profile.target_role)
    if role is None:
        raise ValueError(f"unknown target_role: {profile.target_role!r}")

    targets = target_concepts(role.levels, profile.target_level, tax)
    known = ancestors(tax.concepts, profile.known_concepts)  # unknown ids are dropped here

    needed: set[str] = set()
    stack = sorted(targets)
    while stack:
        c = stack.pop()
        if c in needed:
            continue
        needed.add(c)
        if c not in known:  # a known concept's own prerequisites are not required
            stack.extend(p for p in tax.concepts[c].prerequisites if p in tax.concepts)

    layer: dict[str, int] = {}

    def depth(c: str, visiting: frozenset = frozenset()) -> int:
        if c in layer:
            return layer[c]
        if c in visiting:
            raise ValueError(f"cycle in prerequisites involving {c!r}")
        ps = [p for p in tax.concepts[c].prerequisites if p in needed]
        layer[c] = 0 if not ps else 1 + max(depth(p, visiting | {c}) for p in ps)
        return layer[c]

    for c in sorted(needed):
        depth(c)
    order = sorted(needed, key=lambda c: (layer[c], c))

    nodes = []
    for c in order:
        concept = tax.concepts[c]
        status = "known" if c in known else "todo"
        nodes.append(RoadmapNode(
            id=c, label_fa=concept.label_fa, label_en=concept.label_en, layer=layer[c], status=status,
            resources=pick_resources(c, tax) if status == "todo" else [],
        ))
    edges = [RoadmapEdge(source=p, target=c) for c in order
             for p in sorted(tax.concepts[c].prerequisites) if p in needed]
    return Roadmap(role=role.id, level=profile.target_level, nodes=nodes, edges=edges, order=order,
                   summary_fa=_summary_fa(role.label_fa, profile.target_level, nodes))


def _summary_fa(role_fa: str, level: str, nodes: list[RoadmapNode]) -> str:
    """Persian summary built from the graph itself, so text and graph always agree (A-09)."""
    todo = [n.label_fa for n in nodes if n.status == "todo"]
    head = f"برای رسیدن به {role_fa} در سطح {LEVEL_FA[level]}"
    if not todo:
        return f"{head}، همه مفاهیم لازم را بلدید."
    shown = "، سپس ".join(todo[:6]) + (" و ..." if len(todo) > 6 else "")
    return f"{head}، {len(todo)} مفهوم برای یادگیری مانده است. ترتیب پیشنهادی: {shown}."
