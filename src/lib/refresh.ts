import { dataSignature, sha256, stableJson } from "./serialize";
import type { ChangeSet, Dataset, RefreshPayload, RefreshSummary } from "./types";
import { isObject, primaryKey, validateDataset } from "./validate";

const PAYLOAD_KEYS = [
  "mode",
  "update_benchmarks",
  "allow_empty",
  "commit_message",
  "note",
  "models",
  "scores",
  "benchmarks",
  "refusals",
  "remove_model_ids",
  "remove_score_ids",
  "remove_benchmark_ids",
  "remove_refusal_ids",
] as const;

export interface ApplyOptions {
  now: string;
  runId?: string | null;
  dryRun?: boolean;
  commitMessageOverride?: string | null;
  payloadSha256?: string | null;
}

function emptyChanges(): ChangeSet {
  return { added: [], updated: [], removed: [] };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function idList(value: unknown, path: string, errors: string[]): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    errors.push(`${path}: must be an array of ids`);
    return [];
  }
  return value as string[];
}

function upsertById<T extends { id: string }>(
  current: T[],
  incoming: T[] | undefined,
  label: string,
  errors: string[],
): { records: T[]; changes: ChangeSet } {
  const changes = emptyChanges();
  if (!incoming) return { records: current, changes };
  if (incoming.length === 0) return { records: current, changes };
  const seen = new Set<string>();
  for (const record of incoming) {
    if (!record || typeof record.id !== "string") {
      errors.push(`${label}: every record needs an id`);
      continue;
    }
    if (seen.has(record.id)) errors.push(`${label}: duplicate id ${record.id} in payload`);
    seen.add(record.id);
  }
  const next = [...current];
  const index = new Map(next.map((record, position) => [record.id, position]));
  for (const record of incoming) {
    if (!record?.id || seen.size === 0) continue;
    const position = index.get(record.id);
    if (position == null) {
      index.set(record.id, next.length);
      next.push(record);
      changes.added.push(record.id);
    } else {
      next[position] = record;
      changes.updated.push(record.id);
    }
  }
  return { records: next, changes };
}

function replaceCollection<T extends { id: string }>(
  current: T[],
  incoming: T[] | undefined,
  label: string,
  allowEmpty: boolean,
  errors: string[],
): { records: T[]; changes: ChangeSet } {
  const changes = emptyChanges();
  if (!incoming) return { records: current, changes };
  if (incoming.length === 0 && !allowEmpty) {
    errors.push(`${label}: replace with an empty array requires allow_empty true`);
    return { records: current, changes };
  }
  const incomingIds = new Set(incoming.map((record) => record.id));
  changes.removed = current.filter((record) => !incomingIds.has(record.id)).map((record) => record.id);
  changes.added = incoming.filter((record) => !current.some((item) => item.id === record.id)).map((record) => record.id);
  changes.updated = incoming.filter((record) => current.some((item) => item.id === record.id)).map((record) => record.id);
  return { records: incoming, changes };
}

function removeIds<T extends { id: string }>(records: T[], ids: string[], label: string, errors: string[]): T[] {
  if (ids.length === 0) return records;
  const known = new Set(records.map((record) => record.id));
  for (const id of ids) {
    if (!known.has(id)) errors.push(`${label}: cannot remove unknown id ${id}`);
  }
  const drop = new Set(ids);
  return records.filter((record) => !drop.has(record.id));
}

function subject(summary: Omit<RefreshSummary, "commit_subject" | "commit_body">, override?: string | null): string {
  const cleaned = override?.replace(/[\r\n\t]+/g, " ").trim();
  if (cleaned && cleaned.length <= 120 && !cleaned.includes("`")) return cleaned;
  const parts = [
    summary.models.added.length ? `+${summary.models.added.length} models` : "",
    summary.models.updated.length ? `${summary.models.updated.length} models updated` : "",
    summary.scores.added.length ? `+${summary.scores.added.length} scores` : "",
    summary.scores.updated.length ? `${summary.scores.updated.length} scores updated` : "",
    summary.scores.removed.length ? `-${summary.scores.removed.length} scores` : "",
  ].filter(Boolean);
  const detail = parts.length ? parts.join(", ") : "no record changes";
  return `Refresh dataset (${summary.mode}): ${detail}`.slice(0, 120);
}

function body(summary: Omit<RefreshSummary, "commit_subject" | "commit_body">): string {
  const lines = [
    `Mode: ${summary.mode}`,
    summary.payload_sha256 ? `Payload-SHA256: ${summary.payload_sha256}` : "",
    summary.models.added.length ? `Added models: ${summary.models.added.join(", ")}` : "",
    summary.models.updated.length ? `Updated models: ${summary.models.updated.join(", ")}` : "",
    summary.models.removed.length ? `Removed models: ${summary.models.removed.join(", ")}` : "",
    summary.scores.added.length ? `Added scores: ${summary.scores.added.join(", ")}` : "",
    summary.scores.updated.length ? `Updated scores: ${summary.scores.updated.join(", ")}` : "",
    summary.scores.removed.length ? `Removed scores: ${summary.scores.removed.join(", ")}` : "",
    summary.scores.demoted.length ? `Demoted previous primaries: ${summary.scores.demoted.join(", ")}` : "",
    summary.benchmarks.updated.length ? `Updated benchmarks: ${summary.benchmarks.updated.join(", ")}` : "",
    summary.refusals.added.length ? `Added refusals: ${summary.refusals.added.join(", ")}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function applyRefresh(dataset: Dataset, payload: RefreshPayload, options: ApplyOptions): {
  dataset: Dataset;
  summary: RefreshSummary;
} {
  const errors: string[] = [];
  const mode = payload.mode ?? "upsert";
  if (mode !== "upsert" && mode !== "replace") errors.push("mode: must be upsert or replace");
  const updateBenchmarks = payload.update_benchmarks === true;
  const allowEmpty = payload.allow_empty === true;
  if ((payload.benchmarks || payload.remove_benchmark_ids) && !updateBenchmarks) {
    errors.push("benchmarks were included but update_benchmarks is false");
  }
  if (payload.note != null && (typeof payload.note !== "string" || payload.note.length > 200)) {
    errors.push("note: must be a string of at most 200 characters");
  }
  const removeModels = idList(payload.remove_model_ids, "remove_model_ids", errors);
  const removeScores = idList(payload.remove_score_ids, "remove_score_ids", errors);
  const removeBenchmarks = idList(payload.remove_benchmark_ids, "remove_benchmark_ids", errors);
  const removeRefusals = idList(payload.remove_refusal_ids, "remove_refusal_ids", errors);

  const next = clone(dataset);
  let modelChanges = emptyChanges();
  let scoreChanges = emptyChanges();
  let benchmarkChanges = emptyChanges();
  let refusalChanges = emptyChanges();
  const demoted: string[] = [];

  if (mode === "replace") {
    ({ records: next.models, changes: modelChanges } = replaceCollection(next.models, payload.models, "models", allowEmpty, errors));
    ({ records: next.scores, changes: scoreChanges } = replaceCollection(next.scores, payload.scores, "scores", allowEmpty, errors));
    ({ records: next.refusals, changes: refusalChanges } = replaceCollection(
      next.refusals,
      payload.refusals,
      "refusals",
      true,
      errors,
    ));
    if (updateBenchmarks) {
      ({ records: next.benchmarks, changes: benchmarkChanges } = replaceCollection(
        next.benchmarks,
        payload.benchmarks,
        "benchmarks",
        false,
        errors,
      ));
    }
  } else {
    ({ records: next.models, changes: modelChanges } = upsertById(next.models, payload.models, "models", errors));
    ({ records: next.scores, changes: scoreChanges } = upsertById(next.scores, payload.scores, "scores", errors));
    ({ records: next.refusals, changes: refusalChanges } = upsertById(next.refusals, payload.refusals, "refusals", errors));
    if (updateBenchmarks) {
      ({ records: next.benchmarks, changes: benchmarkChanges } = upsertById(
        next.benchmarks,
        payload.benchmarks,
        "benchmarks",
        errors,
      ));
    }
  }

  if (removeModels.length) {
    next.models = removeIds(next.models, removeModels, "remove_model_ids", errors);
    modelChanges.removed.push(...removeModels);
  }
  if (removeScores.length) {
    next.scores = removeIds(next.scores, removeScores, "remove_score_ids", errors);
    scoreChanges.removed.push(...removeScores);
  }
  if (updateBenchmarks && removeBenchmarks.length) {
    next.benchmarks = removeIds(next.benchmarks, removeBenchmarks, "remove_benchmark_ids", errors);
    benchmarkChanges.removed.push(...removeBenchmarks);
  }
  if (removeRefusals.length) {
    next.refusals = removeIds(next.refusals, removeRefusals, "remove_refusal_ids", errors);
    refusalChanges.removed.push(...removeRefusals);
  }

  const incomingPrimaries = new Map<string, string[]>();
  for (const score of payload.scores ?? []) {
    if (score?.primary) {
      const key = primaryKey(score);
      const list = incomingPrimaries.get(key) ?? [];
      list.push(score.id);
      incomingPrimaries.set(key, list);
    }
  }
  for (const [key, ids] of incomingPrimaries) {
    if (ids.length > 1) errors.push(`scores: payload sets more than one primary for ${key.replaceAll("\0", " + ")}`);
  }
  if (mode === "upsert") {
    for (const score of next.scores) {
      const incoming = incomingPrimaries.get(primaryKey(score));
      if (incoming && score.primary && !incoming.includes(score.id)) {
        score.primary = false;
        demoted.push(score.id);
      }
    }
  }

  const removedModels = new Set(modelChanges.removed);
  const dangling = next.scores.filter((score) => removedModels.has(score.model_id) && !removeScores.includes(score.id));
  if (dangling.length) {
    errors.push(`remove_model_ids: still referenced by scores ${dangling.map((score) => score.id).join(", ")}`);
  }
  const removedBenchmarkIds = new Set(benchmarkChanges.removed);
  const danglingBenchmarks = next.scores.filter((score) => removedBenchmarkIds.has(score.benchmark_id));
  if (danglingBenchmarks.length) {
    errors.push("remove_benchmark_ids: benchmarks still have scores");
  }

  next.manifest = {
    updated_at: options.now,
    source: "agent-refresh",
    note: payload.note?.trim() || `Agent refresh (${mode}).`,
    run_id: options.runId ?? null,
    payload_sha256: options.payloadSha256 ?? null,
    counts: {
      benchmarks: next.benchmarks.length,
      models: next.models.length,
      scores: next.scores.length,
      refusals: next.refusals.length,
    },
  };

  const validationErrors = errors.length ? [] : validateDataset(next);
  const allErrors = [...errors, ...validationErrors];
  const changed = allErrors.length === 0 && dataSignature(dataset) !== dataSignature(next);
  if (!changed && allErrors.length === 0) next.manifest = dataset.manifest;

  const partial = {
    ok: allErrors.length === 0,
    dry_run: options.dryRun === true,
    mode,
    changed,
    models: modelChanges,
    scores: { ...scoreChanges, demoted },
    benchmarks: benchmarkChanges,
    refusals: refusalChanges,
    errors: allErrors,
    payload_sha256: options.payloadSha256 ?? null,
  } satisfies Omit<RefreshSummary, "commit_subject" | "commit_body">;

  const summary: RefreshSummary = {
    ...partial,
    commit_subject: subject(partial, options.commitMessageOverride || payload.commit_message),
    commit_body: body(partial),
  };
  return { dataset: allErrors.length ? dataset : next, summary };
}

export function parsePayload(value: unknown): RefreshPayload {
  if (!isObject(value)) throw new Error("payload: must be a JSON object");
  for (const key of Object.keys(value)) {
    if (!PAYLOAD_KEYS.includes(key as (typeof PAYLOAD_KEYS)[number])) {
      throw new Error(`payload.${key}: unknown field`);
    }
  }
  if (
    value.models == null &&
    value.scores == null &&
    value.benchmarks == null &&
    value.refusals == null &&
    value.remove_model_ids == null &&
    value.remove_score_ids == null &&
    value.remove_benchmark_ids == null &&
    value.remove_refusal_ids == null
  ) {
    throw new Error("payload: include at least one collection or removal list");
  }
  return value as unknown as RefreshPayload;
}

export function decodePayload(encoded: string): unknown {
  const cleaned = encoded.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) throw new Error("payload_b64: not valid base64");
  const pad = cleaned.length % 4 === 0 ? "" : "=".repeat(4 - (cleaned.length % 4));
  const json = Buffer.from(cleaned + pad, "base64").toString("utf8");
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error("payload_b64: decoded value is not JSON");
  }
}

export function payloadHash(value: unknown): string {
  return sha256(stableJson(value));
}

export interface ResolveInput {
  payloadB64?: string;
  payloadUrl?: string;
  inboxRef?: string;
  inboxPath?: string;
  githubRepository?: string;
  githubToken?: string;
}

const MAX_BYTES = 2_000_000;

function unset(value: string | undefined): boolean {
  return value == null || value.trim() === "";
}

function assertPublicHttps(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("payload_url: not a URL");
  }
  if (url.protocol !== "https:") throw new Error("payload_url: must be https");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") {
    throw new Error("payload_url: host is not allowed");
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/.test(host)) {
    throw new Error("payload_url: host is not allowed");
  }
  return url;
}

async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (text.length > MAX_BYTES) throw new Error("payload exceeds 2MB");
    return text;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) throw new Error("payload exceeds 2MB");
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function resolvePayload(input: ResolveInput, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const hasB64 = !unset(input.payloadB64);
  const hasUrl = !unset(input.payloadUrl);
  const hasInbox = !unset(input.inboxRef);
  const selected = [hasB64, hasUrl, hasInbox].filter(Boolean).length;
  if (selected === 0) throw new Error("Provide payload_b64, payload_url, or inbox_ref");
  if (selected > 1) throw new Error("Provide only one of payload_b64, payload_url, or inbox_ref");
  if (hasB64) return decodePayload(input.payloadB64 ?? "");
  if (hasUrl) {
    const url = assertPublicHttps(input.payloadUrl ?? "");
    const response = await fetchImpl(url, { redirect: "error" });
    if (!response.ok) throw new Error(`payload_url: HTTP ${response.status}`);
    const text = await readLimited(response);
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error("payload_url: response is not JSON");
    }
  }
  const ref = input.inboxRef ?? "";
  if (!/^[A-Za-z0-9._/-]+$/.test(ref) || ref.includes("..")) throw new Error("inbox_ref: invalid ref");
  const path = unset(input.inboxPath) ? "payload.json" : (input.inboxPath ?? "");
  if (!/^[A-Za-z0-9._/-]+$/.test(path) || path.includes("..") || path.startsWith("/")) {
    throw new Error("inbox_path: invalid path");
  }
  if (!input.githubRepository || !input.githubToken) {
    throw new Error("inbox_ref requires GITHUB_REPOSITORY and GITHUB_TOKEN");
  }
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const api = `https://api.github.com/repos/${input.githubRepository}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`;
  const response = await fetchImpl(api, {
    headers: {
      Accept: "application/vnd.github.raw",
      Authorization: `Bearer ${input.githubToken}`,
      "User-Agent": "interpretable-benchmark-explorer",
    },
  });
  if (!response.ok) throw new Error(`inbox file not found (${response.status})`);
  const text = await readLimited(response);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("inbox file is not JSON");
  }
}
