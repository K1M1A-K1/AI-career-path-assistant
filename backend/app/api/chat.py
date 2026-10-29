from fastapi import APIRouter

from app.careers import conversation
from app.schemas import CareerProfile, ChatRequest, ChatResponse
from app.session import get_session
from app.stubs import load_fixture, run_or_stub

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    session = get_session(req.session_id)

    def stub() -> ChatResponse:
        script = load_fixture("chat_script.json")
        n = session.questions_asked
        if n < len(script["questions"]):
            session.questions_asked += 1
            return ChatResponse(
                reply=script["questions"][n], done=False, questions_asked=session.questions_asked
            )
        session.profile = CareerProfile(**load_fixture("career_profile.json"))
        return ChatResponse(
            reply=script["final"],
            profile=session.profile,
            done=True,
            questions_asked=session.questions_asked,
        )

    return run_or_stub(lambda: conversation.handle_message(session, req.message), stub)
