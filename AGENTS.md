# Interpretable Benchmark Explorer

Read `docs/agent-refresh.md` before sending scores.

- Do not invent scores, harnesses, splits, task counts, or human baselines.
- Do not file HLE-Diamond under `hle`, and do not alias other web benchmarks to `browsecomp`.
- Primary scores need a source URL, a location on that page, and every required config field.
- Invoke `.github/workflows/refresh.yml` on `main`. Do not push dataset JSON straight to `main` unless you are editing the site itself.
- Benchmark essays live in `data/benchmarks.json`. A score refresh must not include them unless you are intentionally revising copy and set `update_benchmarks`.
