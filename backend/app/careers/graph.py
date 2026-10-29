"""Deterministic roadmap computation. MUST NOT call the LLM."""
from app.careers.taxonomy import Taxonomy
from app.schemas import CareerProfile, Roadmap


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
    """
    raise NotImplementedError
