"""Career chat state machine (≤ settings.max_questions questions)."""
from app.schemas import CareerProfile, ChatResponse
from app.session import SessionState


def handle_message(session: SessionState, message: str) -> ChatResponse:
    """Advance the conversation by one user message.

    Algorithm:
      - Append message to session.history; ask the next question via llm.client.chat
        (prompts.CAREER_CHAT_SYSTEM) while session.questions_asked < settings.max_questions.
      - When enough info is gathered (or the cap is hit) call llm.client.chat_json with
        CareerProfile, then DISCARD any role/concept id not in the taxonomy.
      - On LLMResult.ok == False reply with a friendly Persian error and keep state.
      - Return done=True with the profile when finished.
    """
    raise NotImplementedError


def apply_correction(session: SessionState, message: str) -> CareerProfile:
    """Apply a user correction ("من اکسل بلد نیستم") to session.profile and return it.

    Use chat_json with CORRECTION_SYSTEM, validate ids against the taxonomy, drop unknown ones.
    """
    raise NotImplementedError
