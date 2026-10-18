# Interpretable Benchmark Explorer

A searchable explorer of frontier and open model scores. The numbers stay visible. Every score carries the context needed to interpret it: what the benchmark tests, how the run was configured, and where the number came from.

This is not a leaderboard.

The specification is [Interpretable_Benchmark_Explorer_Design_Doc.md](./Interpretable_Benchmark_Explorer_Design_Doc.md). Agents that refresh the data should follow [docs/agent-refresh.md](./docs/agent-refresh.md).

## Local

```bash
npm install
npm test
npm run dev
```

`npm run validate` checks `data/`. `npm run build` writes a static site to `dist/`, including prerendered model and benchmark pages.

The seed dataset has the 15 benchmark writeups and no scores. Empty tables are intentional.

## Refresh

`.github/workflows/refresh.yml` is `workflow_dispatch` only. An agent calls it as often as new sourced numbers show up. The action validates the payload, commits it to `main`, and deploys GitHub Pages. It does not scrape.

One-time setup after the repo exists on GitHub:

1. Settings → Pages → Build and deployment → Source: GitHub Actions.
2. Allow GitHub Actions to push to `main`, or the data commit step will fail and the site will not update.

A failed validation does not change `main`. The run summary has the errors.
