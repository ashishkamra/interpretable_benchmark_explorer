import { createHash } from "node:crypto";
import type { Benchmark, Dataset, Manifest, Model, Refusal, Score, ScoreConfiguration } from "./types";

function config(value: ScoreConfiguration): ScoreConfiguration {
  return {
    harness: value.harness,
    effort: value.effort,
    temperature: value.temperature,
    tools: value.tools,
    timeout: value.timeout,
    subset: value.subset,
    samples: value.samples,
    notes: value.notes,
  };
}

export function canonicalBenchmark(value: Benchmark): Benchmark {
  return {
    id: value.id,
    name: value.name,
    version: value.version,
    version_policy: value.version_policy,
    one_sentence: value.one_sentence,
    how_to_read: value.how_to_read,
    long_description: value.long_description,
    capability_tags: [...value.capability_tags],
    caveats: [...value.caveats],
    sample_size: value.sample_size,
    small_n_threshold: value.small_n_threshold,
    metric: value.metric,
    metric_label: value.metric_label,
    higher_is_better: value.higher_is_better,
    saturation_status: value.saturation_status,
    harness_sensitive: value.harness_sensitive,
    splits: [...value.splits],
    required_config: [...value.required_config],
    human_baseline_note: value.human_baseline_note,
    human_baseline_source: value.human_baseline_source,
    official_url: value.official_url,
    meaningful_gap: value.meaningful_gap,
    meaningful_gap_note: value.meaningful_gap_note,
    score_collection: value.score_collection,
  };
}

export function canonicalModel(value: Model): Model {
  return {
    id: value.id,
    name: value.name,
    provider: value.provider,
    open_closed: value.open_closed,
    release_date: value.release_date,
    links: {
      model_card: value.links.model_card,
      huggingface: value.links.huggingface,
      api: value.links.api,
    },
    notes: value.notes,
  };
}

export function canonicalScore(value: Score): Score {
  return {
    id: value.id,
    model_id: value.model_id,
    benchmark_id: value.benchmark_id,
    benchmark_version: value.benchmark_version,
    value: value.value,
    metric: value.metric,
    split: value.split,
    primary: value.primary,
    configuration: config(value.configuration),
    date_reported: value.date_reported,
    source_url: value.source_url,
    source_location: value.source_location,
    self_reported: value.self_reported,
    independent_available: value.independent_available,
    not_applicable: value.not_applicable,
    notes: value.notes,
  };
}

export function canonicalRefusal(value: Refusal): Refusal {
  return {
    id: value.id,
    model_name: value.model_name,
    benchmark_id: value.benchmark_id,
    source_url: value.source_url,
    reason: value.reason,
    date_observed: value.date_observed,
  };
}

export function canonicalManifest(value: Manifest): Manifest {
  return {
    updated_at: value.updated_at,
    source: value.source,
    note: value.note,
    run_id: value.run_id,
    payload_sha256: value.payload_sha256,
    counts: { ...value.counts },
  };
}

export function canonicalDataset(dataset: Dataset): Dataset {
  return {
    benchmarks: dataset.benchmarks.map(canonicalBenchmark),
    models: dataset.models.map(canonicalModel),
    scores: dataset.scores.map(canonicalScore),
    refusals: dataset.refusals.map(canonicalRefusal),
    manifest: canonicalManifest(dataset.manifest),
  };
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function dataSignature(dataset: Dataset): string {
  const { manifest: _manifest, ...records } = canonicalDataset(dataset);
  return stableJson(records);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
