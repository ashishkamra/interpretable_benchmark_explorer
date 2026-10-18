import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyRefresh, parsePayload, payloadHash, resolvePayload } from "../src/lib/refresh";
import { canonicalDataset, stableJson } from "../src/lib/serialize";
import type { Dataset } from "../src/lib/types";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || process.env.DRY_RUN === "true";
const fromEnv = args.includes("--from-env");
const fileFlag = args.indexOf("--file");

function readJson(dir: string, name: string): unknown {
  return JSON.parse(readFileSync(resolve(dir, name), "utf8")) as unknown;
}

function loadDataset(dir: string): Dataset {
  return {
    benchmarks: readJson(dir, "benchmarks.json"),
    models: readJson(dir, "models.json"),
    scores: readJson(dir, "scores.json"),
    refusals: readJson(dir, "refusals.json"),
    manifest: readJson(dir, "manifest.json"),
  } as Dataset;
}

function saveDataset(dir: string, dataset: Dataset) {
  const canonical = canonicalDataset(dataset);
  writeFileSync(resolve(dir, "benchmarks.json"), stableJson(canonical.benchmarks));
  writeFileSync(resolve(dir, "models.json"), stableJson(canonical.models));
  writeFileSync(resolve(dir, "scores.json"), stableJson(canonical.scores));
  writeFileSync(resolve(dir, "refusals.json"), stableJson(canonical.refusals));
  writeFileSync(resolve(dir, "manifest.json"), stableJson(canonical.manifest));
}

async function main() {
  const dir = resolve(process.env.DATA_DIR ?? "data");
  let raw: unknown;
  if (fileFlag >= 0) {
    raw = JSON.parse(readFileSync(resolve(args[fileFlag + 1] ?? ""), "utf8")) as unknown;
  } else if (fromEnv) {
    raw = await resolvePayload({
      payloadB64: process.env.PAYLOAD_B64,
      payloadUrl: process.env.PAYLOAD_URL,
      inboxRef: process.env.INBOX_REF,
      inboxPath: process.env.INBOX_PATH,
      githubRepository: process.env.GITHUB_REPOSITORY,
      githubToken: process.env.GITHUB_TOKEN,
    });
  } else {
    console.error("Usage: npm run refresh -- --file payload.json [--dry-run]\n   or: npm run refresh -- --from-env");
    process.exit(1);
  }

  const payload = parsePayload(raw);
  const hash = payloadHash(raw);
  const current = loadDataset(dir);
  const { dataset, summary } = applyRefresh(current, payload, {
    now: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    runId: process.env.GITHUB_RUN_ID ?? null,
    dryRun,
    commitMessageOverride: process.env.COMMIT_MESSAGE || null,
    payloadSha256: hash,
  });
  const report = { ...summary, dry_run: dryRun };
  writeFileSync(resolve("refresh-summary.json"), stableJson(report));
  console.log(stableJson(report));
  if (!report.ok) process.exit(1);
  if (!dryRun && report.changed) {
    saveDataset(dir, dataset);
    writeFileSync(resolve("refresh-commit.txt"), `${report.commit_subject}\n\n${report.commit_body}\n`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  writeFileSync(resolve("refresh-summary.json"), stableJson({ ok: false, errors: [message] }));
  console.error(message);
  process.exit(1);
});
