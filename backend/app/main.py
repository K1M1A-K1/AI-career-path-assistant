from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, jobs, resume, roadmap, usage
from app.config import settings

app = FastAPI(title="AI Career Path Assistant")
app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"]
)

api = APIRouter(prefix="/api")
for module in (chat, roadmap, resume, jobs, usage):
    api.include_router(module.router)


@api.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api)
app.add_api_route("/health", health, methods=["GET"])
