// Mirror of backend/app/schemas.py — keep in sync.
export type Level = "junior" | "mid" | "senior";

export interface CareerProfile {
  target_role: string;
  target_level: Level;
  current_level: Level;
  known_concepts: string[];
  heard_of_only: string[];
}
export interface ChatRequest { session_id: string; message: string }
export interface ChatResponse {
  reply: string;
  profile: CareerProfile | null;
  done: boolean;
  questions_asked: number;
}
export interface Resource { title: string; url: string; lang: string; type: string; verified: boolean }
export interface RoadmapNode {
  id: string;
  label_fa: string;
  label_en: string;
  layer: number;
  status: "todo" | "known";
  resources: Resource[];
}
export interface RoadmapEdge { source: string; target: string }
export interface Roadmap {
  role: string;
  level: Level;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  order: string[];
  summary_fa: string;
}
export interface CorrectionRequest { session_id: string; message: string }

export interface ResumeProfile {
  skills: string[];
  skill_ids: string[];
  years_experience: number;
  education: string[];
  previous_roles: string[];
  location: string | null;
  level_guess: Level | null;
}
export interface JobPosting {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  seniority: Level | null;
  requirements: string[];
  skill_ids: string[];
  published_at: string | null;
  url: string;
}
export interface JobMatch {
  posting: JobPosting;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  explanation_fa: string;
}
export interface MatchFilters { location?: string | null; seniority?: Level | null; remote?: boolean | null }
export interface MatchRequest {
  session_id: string;
  filters: MatchFilters;
  method: "baseline" | "hybrid";
}
export interface UsageReport {
  session_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  est_cost_usd: number;
  calls: number;
}
