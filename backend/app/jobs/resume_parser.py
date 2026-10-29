"""Resume file -> text -> ResumeProfile. Resume text is never logged or persisted."""
import io

from app.schemas import ResumeProfile


def extract_text(filename: str, data: bytes) -> str:
    """PDF (PyMuPDF) or DOCX (python-docx) bytes -> plain text."""
    name = filename.lower()
    if name.endswith(".pdf"):
        import fitz  # PyMuPDF

        with fitz.open(stream=data, filetype="pdf") as doc:
            return "\n".join(page.get_text() for page in doc)
    if name.endswith(".docx"):
        import docx

        return "\n".join(p.text for p in docx.Document(io.BytesIO(data)).paragraphs)
    raise ValueError("unsupported file type")


def parse_resume(session_id: str, text: str) -> ResumeProfile:
    """Extract a ResumeProfile from resume text.

    Algorithm: normalise text (jobs.normalize), call llm.client.chat_json with
    RESUME_EXTRACT_SYSTEM and ResumeProfile, then map `skills` -> `skill_ids` via
    jobs.normalize.map_skills. On LLM failure raise RuntimeError (router returns a friendly error).
    """
    raise NotImplementedError
