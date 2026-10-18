# Design Document: Interpretable Benchmark Explorer

**Version:** 0.2  
**Date:** October 17, 2026  
**Status:** Ready to start the prototype  
**Supersedes:** the 0.1 sketch already in this directory

## 1. Purpose and Problem Statement

Model providers publish dense tables of benchmark scores. An average user sees numbers and the instruction “higher is better,” but has no immediate way to understand:

- What the benchmark actually tests
- How hard the tasks are relative to human or expert performance
- Whether the score is near saturation, sensitive to harness choice, or subject to contamination
- Whether a small gap between models is meaningful
- Whether two numbers were even produced under comparable conditions

The goal of this site is a fast, searchable explorer of frontier and open models that keeps the numbers but surrounds every score with the context needed to interpret it. The primary experience is understanding, not ranking.

This is an editorial product with a dataset, not an evaluation harness. We do not run models. We collect published scores, refuse to hide the configuration, and write the interpretation in language a non-expert can check.

## 2. Target Users

- Practitioners choosing a model for coding, agents, or research
- Researchers and journalists who need to report scores accurately
- Curious users who want to know what the headline numbers mean
- Anyone who has looked at a model card table and felt lost

The first reader we design for is a competent practitioner who is not an eval specialist. If that person can explain a score out loud after one look, the page works. Specialists are served by provenance, configuration fields, and links, not by a separate “expert mode.”

## 3. Product Principles

- **Numbers stay visible, context is immediate.** No score appears without its interpretation layer. The one-sentence meaning sits on the same visual unit as the number, not on another page.
- **Progressive disclosure.** A one-sentence summary is always visible. Configuration, caveats, and methodology expand in place or open on the benchmark page. Hover-only disclosure is not enough; the same content must work on touch and keyboard.
- **Honest about uncertainty.** Surface harness sensitivity, sample size, saturation, split, version, and self-reported vs. independent status. Say when a comparison is not clean.
- **No forced single ranking.** Relative comparison is available. The default view is an annotated profile, not a ladder.
- **Never silently pick the flattering number.** If a model has several reported runs, an editor marks one primary score. The UI does not default to the maximum.
- **Source always one click away.** Every score links to the page that produced it. Aggregator sites may help us find a number. They are not the citation unless they ran the eval.
- **Every sentence on a card is traceable.** Interpretation text is curated or templated from fields. The prototype does not generate free-form prose with a language model.
- **Fast search and filter.** Users can find a model, a benchmark, or a capability area without reading the whole catalog.

## 4. Non-Goals

The prototype will not:

- Produce a single “best model” score, Elo, or weighted index
- Run evaluations, host an agent harness, or proxy model APIs
- Scrape model cards automatically
- Let a language model write the “what this means” copy
- Become a pricing calculator or model marketplace
- Attempt coverage of every benchmark a lab has ever cited
- Treat a screenshot-friendly rank table as the homepage

Pricing, context-window length, and license may appear on the model page as optional facts. They are not the product.

## 5. Benchmark Catalog

These are the benchmarks most frequently appearing in current model cards and launch posts as of October 2026. SWE-bench Pro is included because labs now cite it as a harder, less saturated alternative to Verified. Each entry has the canonical one-sentence that ships on cards, tooltips, and search results.

Interpretive copy below is the starting text. It is refined during seed collection against the primary source, then frozen per benchmark version. When a benchmark’s task set or verifier changes, the record is versioned. Old scores stay attached to the version they measured.

### Priority for the first score-collection pass

All 15 benchmarks get a full page and canonical copy in the prototype. Scores are collected first for the eight where model cards and official leaderboards are densest:

1. SWE-bench Verified
2. SWE-bench Pro
3. GPQA Diamond
4. Terminal-Bench 4.0
5. Humanity’s Last Exam
6. AIME (current contest year the lab cites)
7. LiveCodeBench
8. ARC-AGI-2

The other seven ship as complete benchmark pages. Their score tables start sparse and fill as primary sources are confirmed. A sparse table is preferable to a copied aggregator row.

### 5.1 SWE-bench Verified

- **One sentence:** Can an agent fix real GitHub issues in popular Python repositories so that the project’s own tests pass?
- **Context:** 500 human-verified tasks. Most are short for an experienced engineer (under an hour). Near saturation at the frontier. Highly sensitive to agent harness. Public tasks create contamination risk.
- **How to read it:** A high score means “this agent setup can land tested patches on short, public issues,” not “this model is a senior engineer.” Gaps of a few points near the ceiling are often harness and scaffold noise. Do not compare a lab’s internal harness to an independent Mini-SWE-agent run as if they were the same test.
- **Tags:** short coding fixes, agents, contamination risk, harness-sensitive, near ceiling
- **Primary sources to confirm:** [swebench.com](https://www.swebench.com/), the model card, and the harness repo named in the result.

### 5.2 SWE-bench Pro

- **One sentence:** Can an agent solve longer-horizon software-engineering tasks from a larger, harder repository set than SWE-bench Verified?
- **Context:** The paper describes 1,865 problems from 41 repositories, split into public, held-out, and commercial pools ([arxiv 2509.16941](https://arxiv.org/abs/2509.16941), [code](https://github.com/scaleapi/SWE-bench_Pro-os)). Scores are not comparable across splits. The public split is the one most labs quote, and it is the one with known task-quality problems.
- **How to read it:** Use it as evidence of longer repository work only after the split, scaffold, tool budget, and retry policy match. Secondary reporting of OpenAI’s July 2026 coding-eval audit says a large fraction of the public split was judged broken, and that an earlier recommendation to adopt the benchmark was walked back. Confirm that claim against the primary audit post before it becomes site copy: [Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/). Until that check, the card must still say “split and task quality matter; do not treat this as a clean purchase metric.”
- **Tags:** long-horizon coding, agents, harness-sensitive, split-sensitive, task-quality risk
- **Required config:** split, harness. A Pro score with no split is incomplete.

### 5.3 GPQA Diamond

- **One sentence:** Can the model answer hard graduate-level science questions in biology, physics, and chemistry written by domain experts?
- **Context:** 198 questions. Designed to be difficult even for skilled non-experts with web access. Small sample. Top models sit near the ceiling. Contamination is possible because the set is public.
- **How to read it:** A few questions swing the percentage. “Google-proof” describes the design goal, not a guarantee that a 2026 model has never seen the items. Report whether tools or search were allowed.
- **Tags:** graduate science, small sample, near ceiling, contamination risk
- **Human anchor:** non-expert and expert baselines from the GPQA paper, once re-checked against the paper rather than memory.

### 5.4 Terminal-Bench 4.0

- **One sentence:** Can the model, acting as an agent inside a real Linux terminal, complete practical tasks that automated tests can verify?
- **Context:** 66 tasks spanning software, science, operations, and related work. Terminal-Bench 4.0 is a semantic-version bump, not a cosmetic rename: the task set changed (saturated and broken tasks removed, others fixed) and the agent environment changed, including a flat 8-hour timeout ([release note](https://www.tbench.ai/news/terminal-bench-4-0)). Major version changes require a rerun. Scores from 2.1 or 3.0 are not the same benchmark.
- **How to read it:** This number is model plus harness plus resource budget. The official 4.0 runs use Harbor. A vendor number that does not name the harness, the version, and the timeout is not comparable to the leaderboard. Remaining errors are often refusals or output-token limits, not just “the model could not do the task.”
- **Tags:** terminal agents, harness-sensitive, version-sensitive, long-horizon
- **Required config:** benchmark version, harness, timeout.

### 5.5 DeepSWE v1.1

- **One sentence:** Can a coding agent complete original, long-horizon software-engineering tasks across real repositories and leave working code?
- **Context:** Described in current model cards as an original task set, graded by functional tests, with lower contamination risk than public GitHub issues. Task count, owner, and version history must be confirmed from the primary source during seed collection. Do not copy the “113 tasks” or “mid-70s is strong” lines onto the site until that source is in hand.
- **How to read it:** Treat it as a long-horizon coding signal that is only meaningful inside a named version. If the card does not say v1.1, do not file the score under v1.1.
- **Tags:** long-horizon coding, contamination-resistant (claimed), harness-sensitive
- **Status:** benchmark page in prototype; scores only from a primary citation.

### 5.6 Humanity’s Last Exam (HLE)

- **One sentence:** Can the model answer extremely hard, expert-written questions across many domains that require deep knowledge and reasoning?
- **Context:** Labs report text-only, multimodal, with-tools, and without-tools slices. Those slices are different tests. The benchmark still separates frontier models more than saturated academic sets do.
- **How to read it:** Never display a bare “HLE” number. The card must name the subset and whether tools were used. A with-tools score is an agent result. A without-tools score is a knowledge-and-reasoning result.
- **Tags:** expert knowledge, multi-domain, tools-sensitive, still differentiating
- **Required config:** subset, tools.

### 5.7 Agents’ Last Exam

- **One sentence:** Can an agent finish realistic professional work, across many occupations, well enough that the deliverable passes a check a human expert’s work already passed?
- **Context:** Long-horizon, economically relevant tasks. Broader than coding. Primary description: [agents-last-exam.org](https://agents-last-exam.org/) and [arxiv 2606.05405](https://arxiv.org/abs/2606.05405). Confirm the exact task count, the reported tier, and the tool setup from the paper before publishing numbers. Public discussion describes a set on the order of a thousand-plus tasks; that figure is not site copy until checked.
- **How to read it:** A low score can still be the informative one. Do not rescale the axis so the leader looks close to done. Name the occupation mix and the grading rule that the cited run used.
- **Tags:** professional agents, long-horizon, economically relevant, still hard

### 5.8 AIME (current contest year)

- **One sentence:** Can the model solve challenging high-school contest mathematics problems and hit the exact answer?
- **Context:** Small problem set. Exact-match scoring. Useful for math reasoning, narrow as a picture of general ability. Labs often quote AIME 2024, 2025, or a later year, sometimes averaged, sometimes with a tool such as code execution.
- **How to read it:** The year is part of the benchmark name. AIME 2024 and AIME 2025 are not one row. Majority-vote or pass@k numbers must not be labeled as a single-sample accuracy.
- **Tags:** contest math, small sample, exact match
- **Required config:** contest year, samples per problem, tools.

### 5.9 LiveCodeBench

- **One sentence:** Can the model solve competitive programming problems published after its training cutoff?
- **Context:** Contamination-resistant by construction: problems are date-filtered. Measures coding under contest constraints, not repository engineering.
- **How to read it:** The date window is the benchmark. A score on an old window does not transfer to a window published after the model’s cutoff. Pass@1 and pass@k are different claims.
- **Tags:** contest coding, contamination-resistant, date-filtered
- **Required config:** date window, pass@k.

### 5.10 ProgramBench

- **One sentence:** Given a compiled binary and its documentation, but not the source, can an agent rebuild a working program that matches the original behavior?
- **Context:** Tests reverse engineering and full-system reconstruction. A paper exists ([arxiv 2605.03546](https://arxiv.org/abs/2605.03546)). Absolute scores are still low for top models in early reports. Confirm task count, metric, and whether the cited run saw documentation only.
- **How to read it:** This is not a coding-agent score in the SWE-bench sense. A model can be excellent at issue fixing and weak here. Do not average it into a “coding” blob.
- **Tags:** reverse engineering, long-horizon, still hard
- **Status:** page in prototype; scores only after the paper and the cited table are checked.

### 5.11 NL2Repo-Bench

- **One sentence:** Given only a natural-language requirements document and an empty workspace, can the agent design and build a complete, installable software repository?
- **Context:** Measures sustained planning and multi-file coherence. Early model-card mentions show strong models still failing to finish entire repositories. Canonical paper, task count, and metric are not yet pinned in this document. Do not invent them.
- **How to read it:** Partial progress is not a pass. If the lab reports a custom partial-credit metric, the card says so in the metric label, not in a footnote.
- **Tags:** long-horizon, repo construction, planning
- **Status:** page in prototype; no score until a primary URL is attached.

### 5.12 ARC-AGI-2

- **One sentence:** Can the model solve novel abstract visual puzzles that require fluid intelligence rather than memorized patterns?
- **Context:** Built to resist contamination and scale-alone pattern matching ([arcprize.org/arc-agi/2](https://arcprize.org/arc-agi/2)). Still separates frontier systems. Labs report different reasoning-effort levels, and those levels are different runs.
- **How to read it:** Effort, cost, and number of attempts are part of the result. A max-effort score and a default-effort score do not belong in one cell. Human baseline, when shown, comes from the ARC Prize materials, not from a rounded memory of “humans score X.”
- **Tags:** abstract reasoning, contamination-resistant, effort-sensitive, still differentiating
- **Required config:** effort, attempts.

### 5.13 OSWorld (or OSWorld-Verified)

- **One sentence:** Can an agent complete realistic desktop tasks — files, browser, applications — in a real operating system?
- **Context:** Multimodal and tool-using. Measures computer use, not pure coding. Verified and original splits must not be merged. Screenshot-action setups differ from DOM or accessibility-tree setups.
- **How to read it:** Name the OS, the action space, and the step budget. A number without those is an advertisement, not a measurement.
- **Tags:** computer use, multimodal, agents, harness-sensitive
- **Required config:** split, action space, step budget.

### 5.14 BrowseComp (or the closest cited web-agent benchmark)

- **One sentence:** Can an agent browse the live web, gather evidence, and complete multi-step research tasks?
- **Context:** Tests tool use, planning, and synthesis under changing web content. Live web benchmarks move. A score from six months ago may not be reproducible.
- **How to read it:** Record the benchmark version or paper date, whether browsing was the only tool, and whether the lab used a frozen cache. If the lab cited a “similar” web-agent benchmark rather than BrowseComp itself, file it under that benchmark’s own record. Do not alias them.
- **Tags:** web agents, tools, live environment, reproducibility risk
- **Required config:** benchmark identity, tools, date of the run.

### 5.15 MMMU-Pro (or the equivalent multimodal set the lab cites)

- **One sentence:** Can the model reason about college-level images, charts, and diagrams rather than only describe them?
- **Context:** Multimodal perception plus reasoning. Frequently reported by labs with vision. MMMU and MMMU-Pro are not the same set.
- **How to read it:** Vision capability is a prerequisite, not the result. A text-only model with no score is “not applicable,” not a zero. Name the subset if the lab did not run the full set.
- **Tags:** multimodal, college reasoning, perception
- **Required config:** exact benchmark name, subset.

Later waves can add specialized sets (chart, vision, domain suites) as new benchmark records. They do not get squeezed into the fifteen above.

## 6. Site Architecture

Five routes. No account system.

| Route | Job |
| --- | --- |
| `/` Explore | Search, filter, and scan models without ranking them into one ladder |
| `/models/:slug` | One model, every reported score, each annotated |
| `/benchmarks/:slug` | What the benchmark is, how to read it, caveats, official link, and the score table |
| `/compare?models=a,b` | Two to four models, side by side, with gap notes |
| `/about` | How scores are collected, how interpretations are written, what the site will not claim |

### 6.1 Explore

- Search matches model name, provider, benchmark name, and capability tags.
- Filter chips: open / closed, capability tag, “has an independent run,” “released in the last 6 months.”
- Default layout is a list of model cards, not a ranked table. Each card shows the model, provider, open/closed, release date, and up to four annotated scores chosen by editorial priority (the priority eight, then whatever else exists). A “show all scores” control expands the rest.
- A table toggle exists for people who want to scan. The table still renders the one-sentence and the reliability badges in the cell. Sorting by a column is allowed. Sorting is not labeled “rank,” and the page does not remember a global winner.
- Empty filters explain what was excluded. They never fall back to showing unrelated models.

### 6.2 Model page

Header: name, provider, open or closed, release date, links to the model card, Hugging Face record if any, and API docs if any.

Body: one score card per reported primary score, grouped by capability tag. Other configurations of the same benchmark sit under “other reported runs,” collapsed by default, never deleted.

Missing benchmarks are shown as “not reported in sources we checked,” with the date of the last collection pass. Absence is data. It is not rendered as zero.

### 6.3 Benchmark page

Order on the page:

1. Name, version, metric, one sentence
2. “What it tests” and “How to read it”
3. Reliability facts: sample size, saturation status, harness sensitivity, required configuration, human anchor if we have one
4. Known caveats
5. Official link
6. Table of primary scores, with configuration columns visible, not hidden
7. A note listing scores we refused to enter, and why (no URL, split missing, version unclear)

### 6.4 Compare

- User picks 2–4 models. Selection is explicit. The URL is shareable.
- Rows are benchmarks, not a blended score.
- Each row shows the primary scores, the metric, the one sentence, and a templated gap note (section 7).
- Benchmarks where either model has no primary score say “not reported.” They are not dropped, because a missing cell is often the finding.
- No paragraph of generated analysis under the table. The row notes are the analysis.

### 6.5 About

States, in plain language:

- We transcribe published numbers. We do not re-run them.
- A self-reported score and an independent score are labeled differently.
- Configuration we could not find is labeled missing, not assumed.
- Interpretations are human-written and versioned with the dataset.
- Aggregators are used to discover tables, then checked against a primary URL.
- The raw JSON is in this repository.

## 7. Interpretation System

This is the product. The pages are a way to show it.

### 7.1 Three layers

| Layer | Always contains | Where |
| --- | --- | --- |
| Glance | Number, metric, one sentence, reliability badges | Score card, table cell, search result |
| Expand | How to read it, this run’s configuration, the caveats that apply to this run | In-place disclosure |
| Full | Methodology, sample size, human anchor, source list, refused rows | Benchmark page |

The glance layer must be understandable with no pointer and no second click. Expand is for the person who asked “why?”

### 7.2 Score card

```
SWE-bench Verified                         near ceiling
97% resolved
Can an agent fix real GitHub issues so the project's tests pass?
Self-reported · harness not disclosed · public tasks
▸ What this means
```

Rules for that block:

- The number is the largest text. The one sentence is directly under it, not behind an icon.
- Badges are words. Color may reinforce them. Color is never the only signal.
- “What this means” repeats nothing the glance layer already said. It adds the how-to-read text plus this run’s configuration and source.
- The source link is inside the card, not only in a footer.

### 7.3 Reliability badges

Badges are derived from fields. Editors do not hand-pick a vibe. If the field is missing, the badge says the field is missing.

| Badge | Rule |
| --- | --- |
| Self-reported | `self_reported` and no independent run on file for this configuration |
| Independent run exists | `independent_available` |
| Harness not disclosed | Benchmark is harness-sensitive and `configuration.harness` is empty |
| Config incomplete | Any field in the benchmark’s `required_config` is empty |
| Split not specified | Benchmark has splits and `split` is empty |
| Small sample | `sample_size` is below the benchmark’s `small_n_threshold` |
| Near ceiling | Benchmark `saturation_status` is `near_ceiling` |
| Still differentiating | Benchmark `saturation_status` is `differentiating` |
| Version mismatch | Score’s version is not the benchmark record’s current version |
| Not applicable | Model cannot take this test (for example, no vision on a multimodal set) |

A score can carry several badges. The card shows all of them. We do not collapse them into a green/yellow/red health score. A single health score would hide the thing the site exists to explain.

### 7.4 Relative standing

Inside the current filtered view only:

- A score may be marked “higher in this view,” “mid in this view,” or “lower in this view” by tertile of the visible primary scores on that benchmark.
- The label includes “in this view” so a filter cannot be mistaken for a world ranking.
- Fewer than four visible scores: no tertile. Showing a podium of two models is theater.
- Color, if used, follows the same tertile and is paired with the words.

There is no sitewide rank, no crown icon, and no “#1” badge.

### 7.5 Primary score selection

Editors set `primary: true` on exactly one score per model per benchmark per version. Selection rules, in order:

1. Prefer the configuration the lab presents as the headline result, if the configuration is complete enough to interpret.
2. Prefer an independent run over a self-reported run when both exist and the independent run’s configuration is known.
3. If the headline number’s harness, split, or version is missing, do not make it primary. File it under other runs and say why on the benchmark page.
4. Never select primary by sorting on `value`.

### 7.6 Gap notes

Compare view and any two-up display use templates. No free-form generation.

Inputs: the two primary scores, their configurations, and the benchmark record.

Template, in order, omitting empty clauses:

1. `{A} {value}{unit} vs {B} {value}{unit} on {benchmark} {version} ({metric}).`
2. If a required config field differs or is missing: `These runs are not a clean comparison: {field} is {value or "not disclosed"} vs {value or "not disclosed"}.`
3. If both configs match and the absolute gap is below the benchmark’s editorial `meaningful_gap`: `The gap is inside the range we currently treat as too small to change a decision on this benchmark.`
4. If one side is self-reported and the other is independent: `One number is self-reported and the other is an independent run.`
5. If versions differ: `These scores are from different versions and should not be compared.`

`meaningful_gap` is an editorial threshold with a one-line justification stored on the benchmark. It is not a confidence interval and the UI must not call it one. If we do not yet have a justification, the field stays null and clause 3 is omitted. A missing threshold is better than a fake one.

Starting point for justifications, to be replaced when a harness ablation is actually cited:

- Harness-sensitive coding and agent benchmarks: leave `meaningful_gap` null until a published same-model harness delta is on file. Until then, clause 2 does the work.
- Small-n exact-match sets (GPQA Diamond, AIME): a gap smaller than a few items is called out only after `meaningful_gap` is set from the item count, and the note says “about N items,” not “statistically insignificant.”

### 7.7 Human anchors

Shown only when `human_baseline_note` has a source URL. The note is a sentence, not a second score pretending to be on the same scale, unless the paper reports a number on the same metric. We do not draw a “human level” line from an anecdote.

### 7.8 Language constraints

Copy on the site may say:

- what the tasks are
- what configuration was disclosed
- what is unknown
- whether the benchmark is near a ceiling or still spread out
- that a gap is not comparable

Copy may not say:

- that a model is “smarter,” “AGI,” or “ready for production” because of one score
- that a lab cheated, unless we are quoting a specific published audit and linking it
- a blended “coding score” across benchmarks
- “significantly better” without a defined threshold

## 8. Visual Language

- Dark background, high contrast, large numerals, secondary explanatory text that is still readable. Muted gray paragraphs fail the product. If the explanation matters, it clears contrast.
- One type family for UI, tabular figures for scores so digits do not jump.
- Cards, not spreadsheets, are the default. The table is a view, not the identity of the site.
- Badges are short, literal, and visually quiet. The number and the sentence outrank the badge.
- Capability tags are filters first and decoration second. A tag without a filter is clutter.
- Expansion does not move the number. The card grows downward.
- Compare is a stack of rows on narrow screens, not a table that requires sideways scrolling to see the caveat.
- No hero illustration, no gradient rank bars, no animated leaderboard.

A later visual pass can tune color. It cannot move the one sentence off the card.

## 9. Data Model

Three JSON documents in `data/`, plus a generated index later if we need one. Git is the database for the prototype. A score that is not in a commit does not exist.

Identifiers are stable slugs. Display names can change. Slugs do not, once published.

### 9.1 `data/benchmarks.json`

```json
{
  "id": "terminal-bench",
  "name": "Terminal-Bench",
  "version": "4.0.0",
  "one_sentence": "Can the model, acting as an agent inside a real Linux terminal, complete practical tasks that automated tests can verify?",
  "how_to_read": "This number is model plus harness plus resource budget. Scores from 2.1 or 3.0 are not this benchmark.",
  "long_description": "Markdown. Methodology, what changed in this version, what we will not infer.",
  "capability_tags": ["terminal-agents", "harness-sensitive", "version-sensitive"],
  "caveats": [
    "Major version changes require a rerun.",
    "Vendor numbers that omit harness and timeout are not comparable to the Harbor leaderboard."
  ],
  "sample_size": 66,
  "small_n_threshold": 100,
  "metric": "percent_resolved",
  "metric_label": "% resolved",
  "higher_is_better": true,
  "saturation_status": "differentiating",
  "harness_sensitive": true,
  "splits": [],
  "required_config": ["harness", "timeout", "benchmark_version"],
  "human_baseline_note": null,
  "human_baseline_source": null,
  "official_url": "https://www.tbench.ai/news/terminal-bench-4-0",
  "meaningful_gap": null,
  "meaningful_gap_note": null,
  "score_collection": "priority"
}
```

`saturation_status` is one of `near_ceiling`, `differentiating`, `wide_open`, `unknown`. `score_collection` is `priority` or `page_only` until scores exist, then `seeded`.

### 9.2 `data/models.json`

```json
{
  "id": "example-model",
  "name": "Example Model",
  "provider": "Example Lab",
  "open_closed": "open",
  "release_date": "2026-10-01",
  "links": {
    "model_card": "https://example.com/model",
    "huggingface": null,
    "api": null
  },
  "notes": ""
}
```

`open_closed` is `open` or `closed`. Weights available under a usable license are `open`. API-only is `closed`. A custom license that restricts use is still `open` for this site if weights are public, and the license name goes in `notes` or a later `license` field. Do not pretend “open” means “unrestricted.”

Context window and price are out of the prototype schema. Add them later as optional fields. Do not block seed collection on them.

### 9.3 `data/scores.json`

```json
{
  "id": "example-model--terminal-bench--4.0.0--harbor",
  "model_id": "example-model",
  "benchmark_id": "terminal-bench",
  "benchmark_version": "4.0.0",
  "value": 61.2,
  "metric": "percent_resolved",
  "split": null,
  "primary": true,
  "configuration": {
    "harness": "harbor",
    "effort": null,
    "temperature": null,
    "tools": "terminal",
    "timeout": "8h",
    "subset": null,
    "samples": null,
    "notes": ""
  },
  "date_reported": "2026-10-17",
  "source_url": "https://example.com/leaderboard",
  "source_location": "Terminal-Bench 4.0 table, row Example Model",
  "self_reported": false,
  "independent_available": true,
  "not_applicable": false,
  "notes": ""
}
```

Constraints:

- `source_url` is required unless `not_applicable` is true.
- `source_location` says where on that page the number sits, so a reviewer can find it after the page changes.
- `value` is a number on the benchmark’s metric. The unit lives on the benchmark (`metric_label`), not in the value.
- Unknown configuration keys are `null`, never guessed, never copied from a different run of the same model.
- Two scores with the same model, benchmark, version, split, and configuration are a data error.
- A model may have many scores per benchmark. At most one has `primary: true` for that version.

### 9.4 What we deliberately do not store

- A computed overall score
- A scraped HTML blob
- Embeddings or generated summaries
- User accounts, favorites, or analytics identities

A later `data/refusals.json` can list numbers we saw and declined, with a reason. That file is in scope for the first collection pass if we hit ambiguous tables, which we will.

## 10. Data Collection

### 10.1 Source order

1. The lab’s model card or launch post, for self-reported numbers.
2. The benchmark’s official leaderboard or paper, for independent or canonical numbers.
3. A named third-party eval (Vals, Artificial Analysis, a lab reproducing someone else’s model) only when that party ran the eval and says so.
4. Aggregators such as BenchLM are a map to the table. They are not the citation. If the only place a number exists is an aggregator, it is not entered.

Every accepted score has a URL, a date, and a location note. If the page is likely to change, quote the relevant cell in `notes` in a few words. Do not paste large copyrighted tables into the repo.

### 10.2 Seed set

**Benchmarks:** the fifteen in section 5. Score priority is the eight named there.

**Models:** the current flagship and, where it exists, one smaller sibling from each lab that shows up across those eight. Starting list for the October 2026 pass, to be confirmed against cards rather than treated as a frozen roster:

- Anthropic Claude (latest Opus-class and a smaller sibling)
- OpenAI GPT (latest flagship and a smaller sibling)
- Google Gemini (latest flagship)
- xAI Grok (latest flagship)
- DeepSeek, Qwen, Kimi / Moonshot, and Z.AI GLM leading open-weight models

Target size: about 12–20 models. Enough to compare. Small enough that every row is checked.

Record the collection date on each score. A model with no number on a priority benchmark still gets a model record, so the absence shows up.

### 10.3 Entry rules

- Manual extraction for the seed set. No scraper in the prototype.
- If the configuration is not on the page, leave it null and let the badge fire.
- If the version or split is ambiguous, do not guess. Write a refusal note.
- If two sources disagree, keep both scores, mark neither primary until a human picks, and put the disagreement in `notes`.
- Do not convert metrics. A pass@1 and a percent-resolved stay on their own benchmarks or their own metric field. Never multiply by 100 “to make the table neat” without the source using that scale.
- Dates are ISO-8601. Unknown day is not allowed; find the post date or use the date we observed the page, and say which in `notes`.

### 10.4 Validation

A small script, added with the first data files, fails if:

- a score references an unknown model or benchmark
- a primary score is missing a `source_url`
- more than one primary exists for a model + benchmark + version
- a required config field is missing and the score is marked primary
- slugs are duplicated
- `value` is outside 0–100 when the metric is a percentage
- benchmark `one_sentence` or `how_to_read` is empty

Validation does not check whether the number is true. That remains a human review of `source_url`.

### 10.5 Maintenance

- A new flagship release triggers a collection pass on the priority eight, not a rewrite of the interpretations.
- A benchmark version bump creates a new benchmark version. Old scores remain queryable and cannot be primary on the new version.
- Interpretive text changes are commits with a reason, same as data changes.
- Review independent leaderboards for deltas. A delta is a lead, not an overwrite, until the primary table confirms it.

## 11. Technical Architecture

Prototype constraints: one person can update a score with a pull request, the site can be hosted as static files, and the dataset is the same files the site reads.

| Choice | Decision |
| --- | --- |
| App | Vite, React, TypeScript. Client-rendered static site |
| Data | JSON in `data/`, imported at build time |
| Search | In-memory filter over the seed set. No search service |
| Backend | None |
| Auth | None |
| Interpretation | Templates plus curated fields. No model calls at runtime |
| Hosting | Any static host. Undecided; not required to start |
| Styling | One CSS file or a minimal setup already in the project. No component library unless a later pass needs it |

Why not a database or CMS: provenance is the feature. A score needs a diff, a reviewer, and a commit message more than it needs an admin form.

Why not a server: the seed set is a few hundred rows at most. Filtering it in the browser is the whole interaction. A server would add an auth and update story we do not need.

Routing can be a small client router with shareable paths. Compare state lives in the query string so a link reproduces the view.

Build output is static. Opening a model page directly must work, so use a host configuration that falls back to `index.html`, or prerender the known routes. Prefer prerendering the model and benchmark routes once the slugs exist, so the one sentence is in the HTML a journalist copies from.

### 11.1 Repository layout (when implementation starts)

```
data/benchmarks.json
data/models.json
data/scores.json
data/refusals.json          # optional, first time we reject a number
src/                        # site
scripts/validate.ts         # schema checks
Interpretable_Benchmark_Explorer_Design_Doc.md
```

Do not generate a second, divergent copy of the interpretation text in React components. Components read `one_sentence` and `how_to_read` from the JSON.

## 12. Prototype Scope

**In**

- The five routes
- All 15 benchmark records with canonical copy
- Score rows for the priority eight, across the seed models, each with a source
- Badges, in-view tertiles, primary-score rules, templated gap notes
- About page that matches this document
- Validator script
- Raw JSON published in the repo

**Out**

- Accounts, comments, saved comparisons
- Scrapers, schedulers, admin UI
- Historical charts
- Price and latency comparison
- Language-model narratives
- Internationalization
- A native app

If a feature does not help someone answer “what does this number mean?” or “are these two numbers comparable?”, it waits.

## 13. Accessibility and Performance

- Every expander is a button, operable by keyboard, with the number remaining visible.
- Badges have text. Do not encode self-reported vs independent by color alone.
- Contrast for the one-sentence text meets WCAG AA on the dark background.
- Target: the explore page is usable on a phone without horizontal scroll.
- No layout that depends on hover.
- The seed dataset should keep the initial JS payload small. Do not import a charting library for v0.
- Pages should render the glance layer without waiting on a network call beyond the static document.

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| Stale scores presented as current | `date_reported` on the card. About page states the last collection pass. |
| Aggregator number transcribed as fact | Source rule in section 10. Validator requires a URL. Review requires that the URL actually contains the number. |
| Flattering config chosen as primary | Primary is editorial and must not be the max by default. Disagreements stay unprimary. |
| Version mashups, especially Terminal-Bench and AIME | Version is part of the key. Mismatch badge. Compare template refuses cross-version gaps. |
| Interpretation drifting into opinion | Language constraints in section 7.8. Copy changes are reviewed like data. |
| Users screenshot the number and crop the sentence | The sentence is on the same card as the number, directly beneath it, in readable type. |
| SWE-bench Pro task-quality story misstated | Caveat stays qualified until the OpenAI audit post is read and quoted accurately. |
| DeepSWE, ProgramBench, NL2Repo details invented | Those three do not receive numeric claims in the UI until a primary source is filed. |
| Scope creep into “another leaderboard” | Non-goals. Explore default is cards, not a rank. |

## 15. Success Criteria

- A new user can look at any score and correctly answer “what does this number mean?” without leaving the page or reading a paper.
- The same user can tell whether two scores are comparable, and the page says so when they are not.
- A researcher can verify any score from the source link and the location note in under a few minutes.
- The site is fast to search and does not bury the numbers under explanation.
- No sentence on a score card lacks a field, a curated caveat, or a template clause that produced it.
- A non-expert read-aloud of three cards, done before calling the prototype done, does not turn up a sentence they cannot paraphrase.

## 16. Decisions

Locked for the prototype unless this document is revised:

1. Understanding over ranking. No sitewide score.
2. Static Vite + React + TypeScript site. JSON in git. No backend.
3. Human-curated and templated interpretation only.
4. Primary score is chosen by an editor, never by `max(value)`.
5. Aggregators are not citations.
6. All 15 benchmarks get pages. Eight get the first score pass.
7. Missing configuration is displayed, not filled in.
8. Cross-version comparisons are refused by the template.

## 17. Milestones

1. **This document.** Specification committed. Done when this file is the repo’s design source of truth.
2. **Schema and validator.** Empty-valid JSON files and `scripts/validate.ts` implementing section 10.4. No UI yet.
3. **Benchmark records.** Fifteen records with `one_sentence`, `how_to_read`, caveats, and official URLs. Unconfirmed fields stay null.
4. **Seed scores.** Priority eight, seed models, refusals file started. Each primary score opened and checked against its URL.
5. **Prototype UI.** Explore, model, benchmark, compare, about, reading only from the JSON.
6. **Read-aloud pass.** Three cards, one compare row, one missing-config case, with a person who does not work on evals. Revise copy. Do not add features.

## 18. Open Questions

These do not block milestones 2–4.

- Where the static site is hosted, and under what domain.
- Whether license should be a first-class model field in the first UI or stay in notes.
- How prominent to make the SWE-bench Pro task-quality caveat once the audit post is read: badge, caveat paragraph, or both.
- Whether “open” needs a third state for “weights public, license restricted.”
- A dataset license, decided before anyone outside this repo is invited to reuse the JSON.

## 19. Next Action

Milestone 2: add `data/benchmarks.json`, `data/models.json`, and `data/scores.json` as empty arrays, and a validator that encodes the constraints in section 10.4. Do not collect scores in the same change as the schema.

---

*Interpretive language for each benchmark is a starting text. It is revised when the primary source disagrees, and only then copied into the JSON the site renders.*
