from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import settings
from app.jobs import resume_parser
from app.schemas import ResumeProfile
from app.session import get_session
from app.stubs import load_fixture, run_or_stub

router = APIRouter()


@router.post("/resume", response_model=ResumeProfile)
async def upload_resume(session_id: str = Form(...), file: UploadFile = File(...)) -> ResumeProfile:
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, "فایل خیلی بزرگ است")
    name = file.filename or ""
    if not name.lower().endswith((".pdf", ".docx")):
        raise HTTPException(400, "فقط فایل PDF یا DOCX پذیرفته می‌شود")

    def real() -> ResumeProfile:
        try:
            text = resume_parser.extract_text(name, data)
            return resume_parser.parse_resume(session_id, text)
        except NotImplementedError:
            raise  # NotImplementedError subclasses RuntimeError; let the stub fallback see it
        except (ValueError, RuntimeError) as exc:
            raise HTTPException(422, "خواندن رزومه ممکن نشد") from exc

    profile = run_or_stub(real, lambda: ResumeProfile(**load_fixture("resume_profile.json")))
    get_session(session_id).resume = profile  # in memory only
    return profile
