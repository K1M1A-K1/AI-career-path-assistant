"""Shared Pydantic contracts. SINGLE SOURCE OF TRUTH.

Mirror every change in frontend/src/types.ts and tell the team before editing.
"""
from typing import Literal

from pydantic import BaseModel, Field

Level = Literal["junior", "mid", "senior"]
NodeStatus = Literal["todo", "known"]
MatchMethod = Literal["baseline", "hybrid"]


# ---------- Module A: career roadmap ----------
class CareerProfile(BaseModel):
    target_role: str  # role id from roles.yaml
    target_level: Level
    current_level: Level
    known_concepts: list[str] = Field(default_factory=list)  # concept ids
    heard_of_only: list[str] = Field(default_factory=list)  # NOT counted as known


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str
    profile: CareerProfile | None = None
    done: bool = False
    questions_asked: int = 0


class Resource(BaseModel):
    title: str
    url: str
    lang: str = "en"
    type: str = "article"
    verified: bool = False


class RoadmapNode(BaseModel):
    id: str
    label_fa: str
    label_en: str
    layer: int
    status: NodeStatus = "todo"
    resources: list[Resource] = Field(default_factory=list)


class RoadmapEdge(BaseModel):
    source: str
    target: str


class Roadmap(BaseModel):
    role: str
    level: Level
    nodes: list[RoadmapNode]
    edges: list[RoadmapEdge]
    order: list[str]  # topological order of concept ids
    summary_fa: str = ""


class CorrectionRequest(BaseModel):
    session_id: str
    message: str  # e.g. "من اکسل بلد نیستم"


# ---------- Module B: resume job matching ----------
class ResumeProfile(BaseModel):
    skills: list[str] = Field(default_factory=list)  # raw strings
    skill_ids: list[str] = Field(default_factory=list)  # mapped taxonomy concept ids
    years_experience: float = 0
    education: list[str] = Field(default_factory=list)
    previous_roles: list[str] = Field(default_factory=list)
    location: str | None = None
    level_guess: Level | None = None


class JobPosting(BaseModel):
    id: str
    source: str
    title: str
    company: str
    location: str
    remote: bool = False
    seniority: Level | None = None
    requirements: list[str] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)
    published_at: str | None = None
    url: str


class JobMatch(BaseModel):
    posting: JobPosting
    score: float
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    explanation_fa: str = ""


class MatchFilters(BaseModel):
    location: str | None = None
    seniority: Level | None = None
    remote: bool | None = None


class MatchRequest(BaseModel):
    session_id: str
    filters: MatchFilters = Field(default_factory=MatchFilters)
    method: MatchMethod = "hybrid"


# ---------- Usage ----------
class UsageReport(BaseModel):
    session_id: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    est_cost_usd: float = 0.0
    calls: int = 0
