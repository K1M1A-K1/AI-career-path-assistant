"""Evaluate our ranker vs the BM25 baseline on the labelled set.  Run: python -m scripts.evaluate_ranking

Data: data/eval/resumes/*.json (ResumeProfile per resume_id), data/eval/labels.csv
(resume_id,posting_id,relevant), postings from data/jobs/postings.jsonl.

Metrics, per resume then averaged over resumes:
  Precision@5 = (# relevant postings among the top 5 ranked) / 5
  nDCG@10     = DCG@10 / IDCG@10 with binary gains,
                DCG = sum_{i=1..10} rel_i / log2(i + 1); IDCG = DCG of the ideal ordering.
Only rank postings that have a label for that resume.
Print a markdown table `method | P@5 | nDCG@10` for REPORT.md.
"""


def precision_at_k(ranked_ids: list[str], relevant: set[str], k: int = 5) -> float:
    raise NotImplementedError


def ndcg_at_k(ranked_ids: list[str], relevant: set[str], k: int = 10) -> float:
    raise NotImplementedError


def main() -> None:
    raise NotImplementedError


if __name__ == "__main__":
    main()
