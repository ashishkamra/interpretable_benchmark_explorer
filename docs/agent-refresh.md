# Agent refresh contract

Invoke `.github/workflows/refresh.yml` when a model release or a newly checked primary source changes the dataset. The action does not scrape. You feed it data. It can run many times a day. Runs queue; they are not cancelled.

Do not invent a number, a harness, a split, a task count, or a human baseline. If the page does not say it, leave the field null and do not mark the score primary.

## Before you send

Read `data/benchmarks.json`. Use its `id`, `metric`, `required_config`, `splits`, and `version_policy`.

- `version_policy: exact` — set `benchmark_version` to the record's `version` (`terminal-bench` is `4.0.0`, `swe-bench-verified` is `verified`). An older version may be stored, but it is a mismatch, not the current row.
- `version_policy: score_defined` — put the real test in `benchmark_version`: AIME year (`2025`), LiveCodeBench window, HLE slice (`full` or `text`), OSWorld `original`, `verified`, or `2.0`.
- Do not file HLE-Diamond under `hle`. The action rejects that.
- Do not alias a different web benchmark to `browsecomp`.
- Enter percentages only when the source published a percentage. Do not multiply a 0–1 fraction by 100 to fit the table. File a refusal instead.
- `nl2repo-bench` has no official URL yet. Do not add scores for it until this record has one.

## Payload

```json
{
  "mode": "upsert",
  "note": "Added Example Model from its launch post.",
  "models": [
    {
      "id": "example-model",
      "name": "Example Model",
      "provider": "Example Lab",
      "open_closed": "closed",
      "release_date": "2026-10-17",
      "links": { "model_card": "https://example.com/card", "huggingface": null, "api": null },
      "notes": ""
    }
  ],
  "scores": [
    {
      "id": "example-model--swe-bench-verified--verified--nosplit--harbor",
      "model_id": "example-model",
      "benchmark_id": "swe-bench-verified",
      "benchmark_version": "verified",
      "value": 70,
      "metric": "percent_resolved",
      "split": null,
      "primary": true,
      "configuration": {
        "harness": "harbor",
        "effort": null,
        "temperature": null,
        "tools": null,
        "timeout": null,
        "subset": null,
        "samples": null,
        "notes": ""
      },
      "date_reported": "2026-10-17",
      "source_url": "https://example.com/launch",
      "source_location": "benchmark table, SWE-bench Verified row",
      "self_reported": true,
      "independent_available": false,
      "not_applicable": false,
      "notes": ""
    }
  ]
}
```

`mode` defaults to `upsert`. Upsert merges by `id`. An empty array does not delete anything. To delete, send `remove_score_ids` or `remove_model_ids`. Removing a model that still has scores fails.

`replace` overwrites only the collections you include. Clearing models or scores requires `"allow_empty": true`.

Benchmark copy is not yours to refresh. Including `benchmarks` without `"update_benchmarks": true` fails the run.

Recommended score id, stable across retries:

```text
{model_id}--{benchmark_id}--{benchmark_version}--{split|nosplit}--{harness|noharness}
```

Slug each part: lowercase, non-alphanumerics except dots become hyphens. Add `--{effort}` when effort distinguishes two runs. Reusing the id updates the row. A new id leaves the old row in place.

Primary rules the action enforces:

- A primary score needs `source_url`, `source_location`, and every `required_config` field.
- If harness, split, or tools were not disclosed, set `primary` to false. The number can still be stored.
- Do not pick the primary by sorting on `value`.
- One incoming primary demotes the previous primary for that model + benchmark + version. Two primaries in one payload fail.

`not_applicable` scores have `value: null`, `primary: false`, and no fake zero.

Unknown JSON fields fail. Send the full record on update, not a patch.

## How to invoke

Stay under the workflow_dispatch limit of 65,535 characters for the whole inputs object. A normal release fits in `payload_b64` (about 45KB of JSON). Larger bundles use an inbox branch.

Dispatch against `main` only.

```bash
B64=$(base64 -w0 payload.json)
gh api --method POST "/repos/{owner}/{repo}/actions/workflows/refresh.yml/dispatches" --input - <<EOF
{
  "ref": "main",
  "inputs": {
    "payload_b64": "$B64",
    "dry_run": "false"
  }
}
EOF
```

Boolean inputs are the strings `"true"` and `"false"`.

Inbox path, for a large or private-repo payload:

```bash
git push origin HEAD:agent-inbox/2026-10-17-1
gh workflow run refresh.yml --ref main \
  -f inbox_ref=agent-inbox/2026-10-17-1 \
  -f inbox_path=payload.json
```

The action reads that file with `GITHUB_TOKEN`. It does not delete the branch. Leave it; it is the audit trail.

`payload_url` is the third option: an https URL, max 2MB, no redirects. Do not point it at a link-local host.

Check locally first:

```bash
npm run refresh -- --file payload.json --dry-run
```

## How to read the result

`workflow_dispatch` returns as soon as the run is queued. Poll the run. The job summary contains `refresh-summary.json`.

- `ok: false` — nothing was committed. Fix the errors and send again. Upsert by the same ids is safe to retry.
- `changed: false` — the records already matched. No deploy.
- `changed: true` — data is on `main` and Pages deploy follows.

A failed deploy after a successful commit means the dataset landed and the site did not. Re-run `deploy.yml`. Do not resend the same payload unless you also need a data change.

## What the action will not do

- Scrape model cards or leaderboards
- Generate interpretation text
- Choose the highest score as primary
- Overwrite benchmark essays unless `update_benchmarks` is true
- Publish a payload that fails validation
