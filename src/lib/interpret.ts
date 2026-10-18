import type { Benchmark, Dataset, Score, Standing } from "./types";
import { missingRequiredConfig } from "./validate";

export interface Badge {
  id: string;
  label: string;
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1000) / 1000);
}

export function formatValue(value: number | null, benchmark: Benchmark): string {
  if (value == null) return "n/a";
  const number = formatNumber(value);
  if (benchmark.metric_label.startsWith("%")) return `${number}${benchmark.metric_label}`;
  return `${number} ${benchmark.metric_label}`;
}

export function disclosed(value: string | number | null | undefined): string {
  if (value == null || value === "") return "not disclosed";
  return String(value);
}

function configValue(score: Score, field: string): string | number | null {
  switch (field) {
    case "harness":
      return score.configuration.harness;
    case "effort":
      return score.configuration.effort;
    case "temperature":
      return score.configuration.temperature;
    case "tools":
      return score.configuration.tools;
    case "timeout":
      return score.configuration.timeout;
    case "subset":
      return score.configuration.subset;
    case "samples":
      return score.configuration.samples;
    case "split":
      return score.split;
    case "benchmark_version":
      return score.benchmark_version;
    default:
      return null;
  }
}

function empty(value: string | number | null): boolean {
  return value == null || value === "";
}

export function badgesFor(score: Score, benchmark: Benchmark, dataset: Dataset): Badge[] {
  if (score.not_applicable) return [{ id: "na", label: "Not applicable" }];
  const badges: Badge[] = [];
  if (score.independent_available) badges.push({ id: "independent", label: "Independent run exists" });
  const independentSameConfig = dataset.scores.some(
    (other) =>
      other.id !== score.id &&
      other.model_id === score.model_id &&
      other.benchmark_id === score.benchmark_id &&
      other.benchmark_version === score.benchmark_version &&
      other.independent_available &&
      !other.not_applicable &&
      other.split === score.split &&
      other.configuration.harness === score.configuration.harness,
  );
  if (score.self_reported && !score.independent_available && !independentSameConfig) {
    badges.push({ id: "self", label: "Self-reported" });
  }
  const missing = missingRequiredConfig(score, benchmark);
  if (benchmark.harness_sensitive && missing.includes("harness")) {
    badges.push({ id: "harness", label: "Harness not disclosed" });
  }
  if (benchmark.splits.length > 0 && !score.split) badges.push({ id: "split", label: "Split not specified" });
  const rest = missing.filter((field) => field !== "harness" && field !== "split");
  if (rest.length) badges.push({ id: "config", label: "Config incomplete" });
  if (
    benchmark.sample_size != null &&
    benchmark.small_n_threshold != null &&
    benchmark.sample_size < benchmark.small_n_threshold
  ) {
    badges.push({ id: "small", label: "Small sample" });
  }
  if (benchmark.saturation_status === "near_ceiling") badges.push({ id: "ceiling", label: "Near ceiling" });
  if (benchmark.saturation_status === "differentiating") badges.push({ id: "diff", label: "Still differentiating" });
  if (benchmark.version_policy === "exact" && score.benchmark_version !== benchmark.version) {
    badges.push({ id: "version", label: "Version mismatch" });
  }
  return badges;
}

export function standingLabel(standing: Standing | null): string | null {
  if (standing === "higher") return "Higher in this view";
  if (standing === "mid") return "Mid in this view";
  if (standing === "lower") return "Lower in this view";
  return null;
}

export function tertile(value: number, values: number[], higherIsBetter: boolean): Standing | null {
  if (values.length < 4) return null;
  if (Math.min(...values) === Math.max(...values)) return null;
  const oriented = higherIsBetter ? values : values.map((item) => -item);
  const target = higherIsBetter ? value : -value;
  const below = oriented.filter((item) => item < target).length;
  const position = below / (oriented.length - 1);
  if (position >= 2 / 3) return "higher";
  if (position <= 1 / 3) return "lower";
  return "mid";
}

export function gapNote(left: Score, right: Score, benchmark: Benchmark, leftName: string, rightName: string): string {
  const sameVersion = left.benchmark_version === right.benchmark_version;
  const versionText = sameVersion
    ? left.benchmark_version
    : `${left.benchmark_version} vs ${right.benchmark_version}`;
  const clauses = [
    `${leftName} ${formatValue(left.value, benchmark)} vs ${rightName} ${formatValue(right.value, benchmark)} on ${benchmark.name} ${versionText} (${benchmark.metric_label}).`,
  ];
  const messy = benchmark.required_config.filter((field) => field !== "benchmark_version").filter((field) => {
    const a = configValue(left, field);
    const b = configValue(right, field);
    return empty(a) || empty(b) || String(a) !== String(b);
  });
  if (messy.length) {
    const details = messy
      .map((field) => `${field} is ${disclosed(configValue(left, field))} vs ${disclosed(configValue(right, field))}`)
      .join("; ");
    clauses.push(`These runs are not a clean comparison: ${details}.`);
  }
  if (
    sameVersion &&
    messy.length === 0 &&
    benchmark.meaningful_gap != null &&
    left.value != null &&
    right.value != null &&
    Math.abs(left.value - right.value) < benchmark.meaningful_gap
  ) {
    clauses.push("The gap is inside the range we currently treat as too small to change a decision on this benchmark.");
  }
  const leftSelf = left.self_reported && !left.independent_available;
  const rightSelf = right.self_reported && !right.independent_available;
  if (leftSelf !== rightSelf) {
    clauses.push("One number is self-reported and the other is an independent run.");
  }
  if (!sameVersion) clauses.push("These scores are from different versions and should not be compared.");
  return clauses.join(" ");
}
