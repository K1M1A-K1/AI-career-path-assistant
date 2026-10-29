from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    # LLM gateway (OpenAI-compatible). Keys stay server-side.
    llm_base_url: str = ""
    llm_api_key: str = ""
    chat_model: str = "gpt-4o-mini"
    extract_model: str = "gpt-4o-mini"
    embed_model: str = "text-embedding-3-small"
    llm_timeout_s: float = 30.0

    # USD per 1M tokens: model -> (prompt, completion). "default" is the fallback.
    price_table: dict[str, tuple[float, float]] = {
        "default": (0.15, 0.60),
        "text-embedding-3-small": (0.02, 0.0),
    }

    # Scraper politeness
    scraper_user_agent: str = "CareerPathHackathonBot/0.1 (+contact: team@example.com)"
    scraper_min_delay_s: float = 2.0

    # Ranking weights (hybrid = skill overlap + embedding cosine, optional LLM re-rank)
    w_skill_overlap: float = 0.6
    w_embedding: float = 0.4
    llm_rerank: bool = False
    llm_rerank_top_k: int = 20

    max_questions: int = 6
    max_upload_mb: int = 5
    cors_origins: list[str] = ["http://localhost:5173"]

    data_dir: Path = BACKEND_DIR / "data"


settings = Settings()
