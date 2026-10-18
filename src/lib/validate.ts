import { CONFIG_FIELDS, type Benchmark, type ConfigField, type Model, type Refusal, type Score } from "./types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SCORE_ID = /^[a-z0-9][a-z0-9.-]{0,199}$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,48}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const BENCHMARK_KEYS = [
  "id",
  "name",
  "version",
  "version_policy",
  "one_sentence",
  "how_to_read",
  "long_description",
  "capability_tags",
  "caveats",
  "sample_size",
  "small_n_threshold",
  "metric",
  "metric_label",
  "higher_is_better",
  "saturation_status",
  "harness_sensitive",
  "splits",
  "required_config",
  "human_baseline_note",
  "human_baseline_source",
  "official_url",
  "meaningful_gap",
  "meaningful_gap_note",
  "score_collection",
] as const;

const MODEL_KEYS = ["id", "name", "provider", "open_closed", "release_date", "links", "notes"] as const;
const LINK_KEYS = ["model_card", "huggingface", "api"] as const;
const SCORE_KEYS = [
  "id",
  "model_id",
  "benchmark_id",
  "benchmark_version",
  "value",
  "metric",
  "split",
  "primary",
  "configuration",
  "date_reported",
  "source_url",
  "source_location",
  "self_reported",
  "independent_available",
  "not_applicable",
  "notes",
] as const;
const CONFIG_KEYS = ["harness", "effort", "temperature", "tools", "timeout", "subset", "samples", "notes"] as const;
const REFUSAL_KEYS = ["id", "model_name", "benchmark_id", "source_url", "reason", "date_observed"] as const;
const MANIFEST_KEYS = ["updated_at", "source", "note", "run_id", "payload_sha256", "counts"] as const;

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownFields(obj: Record<string, unknown>, allowed: readonly string[], path: string, errors: string[]) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) errors.push(`${path}.${key}: unknown field`);
  }
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isIsoDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isIsoDateTime(value: string): boolean {
  return DATETIME.test(value) && !Number.isNaN(Date.parse(value));
}

function requireString(obj: Record<string, unknown>, key: string, path: string, errors: string[], max = 4000): string | null {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path}.${key}: required non-empty string`);
    return null;
  }
  if (value.length > max) errors.push(`${path}.${key}: longer than ${max} characters`);
  return value;
}

function requireNullableString(obj: Record<string, unknown>, key: string, path: string, errors: string[]): string | null | undefined {
  const value = obj[key];
  if (value === null) return null;
  if (typeof value !== "string") {
    errors.push(`${path}.${key}: must be a string or null`);
    return undefined;
  }
  return value;
}

function requireBoolean(obj: Record<string, unknown>, key: string, path: string, errors: string[]): boolean | null {
  const value = obj[key];
  if (typeof value !== "boolean") {
    errors.push(`${path}.${key}: must be a boolean`);
    return null;
  }
  return value;
}

function optionalHttps(value: string | null | undefined, path: string, errors: string[]) {
  if (value === null || value === undefined || value === "") return;
  if (!isHttpsUrl(value)) errors.push(`${path}: must be an https URL`);
}

function configKey(score: Pick<Score, "configuration" | "split">): string {
  const config = score.configuration;
  return JSON.stringify([
    score.split,
    config.harness,
    config.effort,
    config.temperature,
    config.tools,
    config.timeout,
    config.subset,
    config.samples,
  ]);
}

export function logicalScoreKey(score: Pick<Score, "model_id" | "benchmark_id" | "benchmark_version" | "split" | "configuration">): string {
  return `${score.model_id}\0${score.benchmark_id}\0${score.benchmark_version}\0${configKey(score)}`;
}

export function primaryKey(score: Pick<Score, "model_id" | "benchmark_id" | "benchmark_version">): string {
  return `${score.model_id}\0${score.benchmark_id}\0${score.benchmark_version}`;
}

function fieldEmpty(score: Score, field: ConfigField): boolean {
  switch (field) {
    case "harness":
      return !score.configuration.harness;
    case "effort":
      return !score.configuration.effort;
    case "temperature":
      return score.configuration.temperature == null;
    case "tools":
      return !score.configuration.tools;
    case "timeout":
      return !score.configuration.timeout;
    case "subset":
      return !score.configuration.subset;
    case "samples":
      return score.configuration.samples == null;
    case "split":
      return !score.split;
    case "benchmark_version":
      return !score.benchmark_version;
    default:
      return true;
  }
}

export function missingRequiredConfig(score: Score, benchmark: Benchmark): ConfigField[] {
  return benchmark.required_config.filter((field) => fieldEmpty(score, field));
}

function validateBenchmark(value: unknown, index: number, errors: string[]): Benchmark | null {
  const path = `benchmarks[${index}]`;
  if (!isObject(value)) {
    errors.push(`${path}: must be an object`);
    return null;
  }
  unknownFields(value, BENCHMARK_KEYS, path, errors);
  const id = requireString(value, "id", path, errors, 80);
  if (id && !SLUG.test(id)) errors.push(`${path}.id: must be a lowercase slug`);
  requireString(value, "name", path, errors, 120);
  const version = requireString(value, "version", path, errors, 48);
  if (version && !VERSION.test(version)) errors.push(`${path}.version: invalid version string`);
  const policy = value.version_policy;
  if (policy !== "exact" && policy !== "score_defined") {
    errors.push(`${path}.version_policy: must be exact or score_defined`);
  }
  const one = requireString(value, "one_sentence", path, errors, 240);
  if (one && one.length > 240) errors.push(`${path}.one_sentence: keep it to one sentence under 240 characters`);
  requireString(value, "how_to_read", path, errors, 800);
  requireString(value, "long_description", path, errors, 6000);
  if (!Array.isArray(value.capability_tags) || value.capability_tags.some((tag) => typeof tag !== "string" || !SLUG.test(tag))) {
    errors.push(`${path}.capability_tags: must be an array of slugs`);
  } else if (new Set(value.capability_tags).size !== value.capability_tags.length) {
    errors.push(`${path}.capability_tags: duplicate tag`);
  }
  if (!Array.isArray(value.caveats) || value.caveats.some((item) => typeof item !== "string" || item.trim() === "")) {
    errors.push(`${path}.caveats: must be an array of non-empty strings`);
  }
  for (const key of ["sample_size", "small_n_threshold"] as const) {
    const item = value[key];
    if (item !== null && (!Number.isInteger(item) || (item as number) <= 0)) {
      errors.push(`${path}.${key}: must be a positive integer or null`);
    }
  }
  requireString(value, "metric", path, errors, 80);
  requireString(value, "metric_label", path, errors, 80);
  requireBoolean(value, "higher_is_better", path, errors);
  if (!["near_ceiling", "differentiating", "wide_open", "unknown"].includes(String(value.saturation_status))) {
    errors.push(`${path}.saturation_status: invalid`);
  }
  requireBoolean(value, "harness_sensitive", path, errors);
  if (!Array.isArray(value.splits) || value.splits.some((item) => typeof item !== "string" || item.trim() === "")) {
    errors.push(`${path}.splits: must be an array of strings`);
  }
  if (!Array.isArray(value.required_config) || value.required_config.some((item) => !CONFIG_FIELDS.includes(item as ConfigField))) {
    errors.push(`${path}.required_config: contains an unknown field`);
  }
  const baseline = requireNullableString(value, "human_baseline_note", path, errors);
  const baselineSource = requireNullableString(value, "human_baseline_source", path, errors);
  if ((baseline == null) !== (baselineSource == null)) {
    errors.push(`${path}: human baseline note and source must both be set or both be null`);
  }
  optionalHttps(baselineSource, `${path}.human_baseline_source`, errors);
  const official = requireNullableString(value, "official_url", path, errors);
  optionalHttps(official, `${path}.official_url`, errors);
  const gap = value.meaningful_gap;
  const gapNote = requireNullableString(value, "meaningful_gap_note", path, errors);
  if (gap !== null && (typeof gap !== "number" || !Number.isFinite(gap) || gap <= 0)) {
    errors.push(`${path}.meaningful_gap: must be a positive number or null`);
  }
  if ((gap == null) !== (gapNote == null)) {
    errors.push(`${path}: meaningful_gap and meaningful_gap_note must both be set or both be null`);
  }
  if (!["priority", "page_only", "seeded"].includes(String(value.score_collection))) {
    errors.push(`${path}.score_collection: invalid`);
  }
  return errors.some((error) => error.startsWith(path)) ? null : (value as unknown as Benchmark);
}

function validateModel(value: unknown, index: number, errors: string[]): Model | null {
  const path = `models[${index}]`;
  if (!isObject(value)) {
    errors.push(`${path}: must be an object`);
    return null;
  }
  unknownFields(value, MODEL_KEYS, path, errors);
  const id = requireString(value, "id", path, errors, 80);
  if (id && !SLUG.test(id)) errors.push(`${path}.id: must be a lowercase slug`);
  requireString(value, "name", path, errors, 120);
  requireString(value, "provider", path, errors, 120);
  if (value.open_closed !== "open" && value.open_closed !== "closed") {
    errors.push(`${path}.open_closed: must be open or closed`);
  }
  const release = requireString(value, "release_date", path, errors, 10);
  if (release && !isIsoDate(release)) errors.push(`${path}.release_date: must be YYYY-MM-DD`);
  if (!isObject(value.links)) {
    errors.push(`${path}.links: must be an object`);
  } else {
    unknownFields(value.links, LINK_KEYS, `${path}.links`, errors);
    for (const key of LINK_KEYS) {
      const link = requireNullableString(value.links, key, `${path}.links`, errors);
      optionalHttps(link, `${path}.links.${key}`, errors);
    }
  }
  if (typeof value.notes !== "string") errors.push(`${path}.notes: must be a string`);
  return errors.some((error) => error.startsWith(path)) ? null : (value as unknown as Model);
}

function validateScore(value: unknown, index: number, errors: string[]): Score | null {
  const path = `scores[${index}]`;
  if (!isObject(value)) {
    errors.push(`${path}: must be an object`);
    return null;
  }
  unknownFields(value, SCORE_KEYS, path, errors);
  const id = requireString(value, "id", path, errors, 200);
  if (id && !SCORE_ID.test(id)) errors.push(`${path}.id: use a lowercase id of letters, numbers, dots, and hyphens`);
  const modelId = requireString(value, "model_id", path, errors, 80);
  if (modelId && !SLUG.test(modelId)) errors.push(`${path}.model_id: must be a slug`);
  const benchmarkId = requireString(value, "benchmark_id", path, errors, 80);
  if (benchmarkId && !SLUG.test(benchmarkId)) errors.push(`${path}.benchmark_id: must be a slug`);
  const version = requireString(value, "benchmark_version", path, errors, 48);
  if (version && !VERSION.test(version)) errors.push(`${path}.benchmark_version: invalid version string`);
  requireString(value, "metric", path, errors, 80);
  const split = requireNullableString(value, "split", path, errors);
  if (split === "") errors.push(`${path}.split: use null, not an empty string`);
  const primary = requireBoolean(value, "primary", path, errors);
  const selfReported = requireBoolean(value, "self_reported", path, errors);
  const independent = requireBoolean(value, "independent_available", path, errors);
  const notApplicable = requireBoolean(value, "not_applicable", path, errors);
  if (!isObject(value.configuration)) {
    errors.push(`${path}.configuration: must be an object`);
  } else {
    unknownFields(value.configuration, CONFIG_KEYS, `${path}.configuration`, errors);
    for (const key of ["harness", "effort", "tools", "timeout", "subset"] as const) {
      const item = requireNullableString(value.configuration, key, `${path}.configuration`, errors);
      if (item === "") errors.push(`${path}.configuration.${key}: use null, not an empty string`);
    }
    const temperature = value.configuration.temperature;
    if (temperature !== null && (typeof temperature !== "number" || !Number.isFinite(temperature))) {
      errors.push(`${path}.configuration.temperature: must be a finite number or null`);
    }
    const samples = value.configuration.samples;
    if (samples !== null && (!Number.isInteger(samples) || (samples as number) <= 0)) {
      errors.push(`${path}.configuration.samples: must be a positive integer or null`);
    }
    if (typeof value.configuration.notes !== "string") errors.push(`${path}.configuration.notes: must be a string`);
  }
  const reported = requireString(value, "date_reported", path, errors, 10);
  if (reported && !isIsoDate(reported)) errors.push(`${path}.date_reported: must be YYYY-MM-DD`);
  const source = requireNullableString(value, "source_url", path, errors);
  optionalHttps(source, `${path}.source_url`, errors);
  if (typeof value.source_location !== "string") errors.push(`${path}.source_location: must be a string`);
  if (typeof value.notes !== "string") errors.push(`${path}.notes: must be a string`);
  const numeric = value.value;
  if (notApplicable) {
    if (numeric !== null) errors.push(`${path}.value: must be null when not_applicable is true`);
    if (primary) errors.push(`${path}.primary: not_applicable scores cannot be primary`);
  } else if (typeof numeric !== "number" || !Number.isFinite(numeric)) {
    errors.push(`${path}.value: must be a finite number`);
  }
  if (primary && !source) errors.push(`${path}.source_url: required for a primary score`);
  if (primary && (!value.source_location || value.source_location === "")) {
    errors.push(`${path}.source_location: required for a primary score`);
  }
  if (!notApplicable && !source) errors.push(`${path}.source_url: required unless not_applicable`);
  if (!notApplicable && source && (!value.source_location || value.source_location === "")) {
    errors.push(`${path}.source_location: say where on the page the number sits`);
  }
  void selfReported;
  void independent;
  return errors.some((error) => error.startsWith(path)) ? null : (value as unknown as Score);
}

function validateRefusal(value: unknown, index: number, errors: string[]): Refusal | null {
  const path = `refusals[${index}]`;
  if (!isObject(value)) {
    errors.push(`${path}: must be an object`);
    return null;
  }
  unknownFields(value, REFUSAL_KEYS, path, errors);
  const id = requireString(value, "id", path, errors, 80);
  if (id && !SLUG.test(id)) errors.push(`${path}.id: must be a lowercase slug`);
  requireString(value, "model_name", path, errors, 120);
  const benchmarkId = requireNullableString(value, "benchmark_id", path, errors);
  if (benchmarkId && !SLUG.test(benchmarkId)) errors.push(`${path}.benchmark_id: must be a slug or null`);
  const source = requireString(value, "source_url", path, errors);
  if (source && !isHttpsUrl(source)) errors.push(`${path}.source_url: must be an https URL`);
  requireString(value, "reason", path, errors, 1000);
  const observed = requireString(value, "date_observed", path, errors, 10);
  if (observed && !isIsoDate(observed)) errors.push(`${path}.date_observed: must be YYYY-MM-DD`);
  return errors.some((error) => error.startsWith(path)) ? null : (value as unknown as Refusal);
}

function validateManifest(value: unknown, counts: ManifestCounts, errors: string[]) {
  if (!isObject(value)) {
    errors.push("manifest: must be an object");
    return;
  }
  unknownFields(value, MANIFEST_KEYS, "manifest", errors);
  const updated = requireString(value, "updated_at", "manifest", errors, 40);
  if (updated && !isIsoDateTime(updated)) errors.push("manifest.updated_at: must be YYYY-MM-DDTHH:MM:SSZ");
  requireString(value, "source", "manifest", errors, 80);
  if (typeof value.note !== "string") errors.push("manifest.note: must be a string");
  if (value.run_id !== null && typeof value.run_id !== "string") errors.push("manifest.run_id: must be a string or null");
  if (value.payload_sha256 !== null && !/^[a-f0-9]{64}$/.test(String(value.payload_sha256))) {
    errors.push("manifest.payload_sha256: must be a sha256 hex string or null");
  }
  if (!isObject(value.counts)) {
    errors.push("manifest.counts: must be an object");
    return;
  }
  for (const key of ["benchmarks", "models", "scores", "refusals"] as const) {
    if (value.counts[key] !== counts[key]) {
      errors.push(`manifest.counts.${key}: ${String(value.counts[key])} does not match ${counts[key]} records`);
    }
  }
}

interface ManifestCounts {
  benchmarks: number;
  models: number;
  scores: number;
  refusals: number;
}

export function validateDataset(input: unknown): string[] {
  const errors: string[] = [];
  if (!isObject(input)) return ["dataset: must be an object"];
  unknownFields(input, ["benchmarks", "models", "scores", "refusals", "manifest"], "dataset", errors);
  const benchmarkRows = input.benchmarks;
  const modelRows = input.models;
  const scoreRows = input.scores;
  const refusalRows = input.refusals;
  if (!Array.isArray(benchmarkRows)) errors.push("benchmarks: must be an array");
  if (!Array.isArray(modelRows)) errors.push("models: must be an array");
  if (!Array.isArray(scoreRows)) errors.push("scores: must be an array");
  if (!Array.isArray(refusalRows)) errors.push("refusals: must be an array");
  if (!Array.isArray(benchmarkRows) || !Array.isArray(modelRows) || !Array.isArray(scoreRows) || !Array.isArray(refusalRows)) {
    return errors;
  }

  const benchmarks = benchmarkRows.map((item, index) => validateBenchmark(item, index, errors));
  const models = modelRows.map((item, index) => validateModel(item, index, errors));
  const scores = scoreRows.map((item, index) => validateScore(item, index, errors));
  refusalRows.map((item, index) => validateRefusal(item, index, errors));
  validateManifest(
    input.manifest,
    {
      benchmarks: benchmarkRows.length,
      models: modelRows.length,
      scores: scoreRows.length,
      refusals: refusalRows.length,
    },
    errors,
  );

  const benchmarkIds = new Map<string, Benchmark>();
  benchmarks.forEach((benchmark, index) => {
    if (!benchmark) return;
    if (benchmarkIds.has(benchmark.id)) errors.push(`benchmarks[${index}].id: duplicate ${benchmark.id}`);
    benchmarkIds.set(benchmark.id, benchmark);
  });
  const modelIds = new Set<string>();
  models.forEach((model, index) => {
    if (!model) return;
    if (modelIds.has(model.id)) errors.push(`models[${index}].id: duplicate ${model.id}`);
    modelIds.add(model.id);
  });
  const scoreIds = new Set<string>();
  const logical = new Map<string, number>();
  const primaries = new Map<string, number[]>();
  scores.forEach((score, index) => {
    if (!score) return;
    if (scoreIds.has(score.id)) errors.push(`scores[${index}].id: duplicate ${score.id}`);
    scoreIds.add(score.id);
    if (!modelIds.has(score.model_id)) errors.push(`scores[${index}].model_id: unknown model ${score.model_id}`);
    const benchmark = benchmarkIds.get(score.benchmark_id);
    if (!benchmark) {
      errors.push(`scores[${index}].benchmark_id: unknown benchmark ${score.benchmark_id}`);
      return;
    }
    if (score.metric !== benchmark.metric) {
      errors.push(`scores[${index}].metric: must match ${benchmark.metric}`);
    }
    if (score.split && benchmark.splits.length > 0 && !benchmark.splits.includes(score.split)) {
      errors.push(`scores[${index}].split: ${score.split} is not a known split of ${benchmark.id}`);
    }
    if (benchmark.id === "hle" && /diamond/i.test(score.benchmark_version)) {
      errors.push(`scores[${index}].benchmark_version: HLE-Diamond is a different benchmark; do not file it under hle`);
    }
    if (score.value != null && benchmark.metric.startsWith("percent_") && (score.value < 0 || score.value > 100)) {
      errors.push(`scores[${index}].value: percentage metrics must be between 0 and 100`);
    }
    if (score.value != null && benchmark.metric === "fraction" && (score.value < 0 || score.value > 1)) {
      errors.push(`scores[${index}].value: fraction metrics must be between 0 and 1`);
    }
    if (score.primary && !score.not_applicable && missingRequiredConfig(score, benchmark).length > 0) {
      errors.push(
        `scores[${index}]: primary score is missing ${missingRequiredConfig(score, benchmark).join(", ")}; file it with primary false`,
      );
    }
    const logicalId = logicalScoreKey(score);
    const previous = logical.get(logicalId);
    if (previous != null) {
      errors.push(`scores[${index}]: same model, benchmark, version, split, and configuration as scores[${previous}]`);
    }
    logical.set(logicalId, index);
    if (score.primary) {
      const key = primaryKey(score);
      const list = primaries.get(key) ?? [];
      list.push(index);
      primaries.set(key, list);
    }
  });
  for (const [key, indexes] of primaries) {
    if (indexes.length > 1) {
      errors.push(`scores: more than one primary for ${key.replaceAll("\0", " + ")}`);
    }
  }
  refusalRows.forEach((item, index) => {
    if (!isObject(item) || typeof item.benchmark_id !== "string") return;
    if (!benchmarkIds.has(item.benchmark_id)) {
      errors.push(`refusals[${index}].benchmark_id: unknown benchmark ${item.benchmark_id}`);
    }
  });
  if (benchmarkRows.length === 0) errors.push("benchmarks: the catalog cannot be empty");
  return errors;
}
