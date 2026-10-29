from fastapi import APIRouter

from app.careers import conversation, graph
from app.careers.taxonomy import get_taxonomy
from app.schemas import CareerProfile, CorrectionRequest, Roadmap
from app.session import get_session
from app.stubs import load_fixture, run_or_stub

router = APIRouter()


def _stub_roadmap() -> Roadmap:
    return Roadmap(**load_fixture("roadmap.json"))


@router.post("/roadmap", response_model=Roadmap)
def make_roadmap(profile: CareerProfile) -> Roadmap:
    return run_or_stub(lambda: graph.compute_roadmap(profile, get_taxonomy()), _stub_roadmap)


@router.post("/roadmap/correct", response_model=Roadmap)
def correct_roadmap(req: CorrectionRequest) -> Roadmap:
    session = get_session(req.session_id)

    def real() -> Roadmap:
        session.profile = conversation.apply_correction(session, req.message)
        return graph.compute_roadmap(session.profile, get_taxonomy())

    return run_or_stub(real, _stub_roadmap)
