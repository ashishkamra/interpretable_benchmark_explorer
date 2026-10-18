export type SaturationStatus = "near_ceiling" | "differentiating" | "wide_open" | "unknown";
export type ScoreCollection = "priority" | "page_only" | "seeded";
export type VersionPolicy = "exact" | "score_defined";
export type OpenClosed = "open" | "closed";
export type Standing = "higher" | "mid" | "lower";

export const CONFIG_FIELDS = [
  "harness",
  "effort",
  "temperature",
  "tools",
  "timeout",
  "subset",
  "samples",
  "split",
  "benchmark_version",
] as const;

export type ConfigField = (typeof CONFIG_FIELDS)[number];

export interface Benchmark {
  id: string;
  name: string;
  version: string;
  version_policy: VersionPolicy;
  one_sentence: string;
  how_to_read: string;
  long_description: string;
  capability_tags: string[];
  caveats: string[];
  sample_size: number | null;
  small_n_threshold: number | null;
  metric: string;
  metric_label: string;
  higher_is_better: boolean;
  saturation_status: SaturationStatus;
  harness_sensitive: boolean;
  splits: string[];
  required_config: ConfigField[];
  human_baseline_note: string | null;
  human_baseline_source: string | null;
  official_url: string | null;
  meaningful_gap: number | null;
  meaningful_gap_note: string | null;
  score_collection: ScoreCollection;
}

export interface ModelLinks {
  model_card: string | null;
  huggingface: string | null;
  api: string | null;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  open_closed: OpenClosed;
  release_date: string;
  links: ModelLinks;
  notes: string;
}

export interface ScoreConfiguration {
  harness: string | null;
  effort: string | null;
  temperature: number | null;
  tools: string | null;
  timeout: string | null;
  subset: string | null;
  samples: number | null;
  notes: string;
}

export interface Score {
  id: string;
  model_id: string;
  benchmark_id: string;
  benchmark_version: string;
  value: number | null;
  metric: string;
  split: string | null;
  primary: boolean;
  configuration: ScoreConfiguration;
  date_reported: string;
  source_url: string | null;
  source_location: string;
  self_reported: boolean;
  independent_available: boolean;
  not_applicable: boolean;
  notes: string;
}

export interface Refusal {
  id: string;
  model_name: string;
  benchmark_id: string | null;
  source_url: string;
  reason: string;
  date_observed: string;
}

export interface Manifest {
  updated_at: string;
  source: string;
  note: string;
  run_id: string | null;
  payload_sha256: string | null;
  counts: {
    benchmarks: number;
    models: number;
    scores: number;
    refusals: number;
  };
}

export interface Dataset {
  benchmarks: Benchmark[];
  models: Model[];
  scores: Score[];
  refusals: Refusal[];
  manifest: Manifest;
}

export interface RefreshPayload {
  mode?: "upsert" | "replace";
  update_benchmarks?: boolean;
  allow_empty?: boolean;
  commit_message?: string;
  note?: string;
  models?: Model[];
  scores?: Score[];
  benchmarks?: Benchmark[];
  refusals?: Refusal[];
  remove_model_ids?: string[];
  remove_score_ids?: string[];
  remove_benchmark_ids?: string[];
  remove_refusal_ids?: string[];
}

export interface ChangeSet {
  added: string[];
  updated: string[];
  removed: string[];
}

export interface RefreshSummary {
  ok: boolean;
  dry_run: boolean;
  mode: "upsert" | "replace";
  changed: boolean;
  models: ChangeSet;
  scores: ChangeSet & { demoted: string[] };
  benchmarks: ChangeSet;
  refusals: ChangeSet;
  errors: string[];
  commit_subject: string;
  commit_body: string;
  payload_sha256: string | null;
}
