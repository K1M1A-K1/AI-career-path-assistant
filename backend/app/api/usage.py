from fastapi import APIRouter

from app.schemas import UsageReport
from app.session import get_session

router = APIRouter()


@router.get("/usage/{session_id}", response_model=UsageReport)
def usage(session_id: str) -> UsageReport:
    return get_session(session_id).usage
