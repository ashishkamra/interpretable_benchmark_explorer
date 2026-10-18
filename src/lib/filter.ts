import { tagLabel } from "./labels";
import type { Benchmark, Dataset, Model } from "./types";

export interface Filters {
  query: string;
  openClosed: "all" | "open" | "closed";
  tag: string | null;
  independent: boolean;
  recent: boolean;
  now?: string;
}

export function shiftDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle);
}

function benchmarkMatches(benchmark: Benchmark, query: string): boolean {
  if (!query) return true;
  const tags = benchmark.capability_tags.map(tagLabel).join(" ");
  return [benchmark.name, benchmark.id, benchmark.one_sentence, benchmark.how_to_read, tags].some((field) =>
    includes(field, query),
  );
}

export function filterBenchmarks(dataset: Dataset, filters: Filters): Benchmark[] {
  const query = filters.query.trim().toLowerCase();
  return dataset.benchmarks.filter((benchmark) => {
    if (filters.tag && !benchmark.capability_tags.includes(filters.tag)) return false;
    return benchmarkMatches(benchmark, query);
  });
}

export function filterModels(dataset: Dataset, filters: Filters): Model[] {
  const query = filters.query.trim().toLowerCase();
  const matchingBenchmarkIds = new Set(
    dataset.benchmarks.filter((benchmark) => benchmarkMatches(benchmark, query)).map((benchmark) => benchmark.id),
  );
  return dataset.models
    .filter((model) => {
      if (filters.openClosed !== "all" && model.open_closed !== filters.openClosed) return false;
      if (filters.recent) {
        if (!filters.now) throw new Error("recent filter requires now");
        if (model.release_date < shiftDays(filters.now, -183)) return false;
      }
      const scores = dataset.scores.filter((score) => score.model_id === model.id);
      if (filters.independent && !scores.some((score) => score.independent_available)) return false;
      if (filters.tag) {
        const tagged = scores.some((score) => {
          const benchmark = dataset.benchmarks.find((item) => item.id === score.benchmark_id);
          return benchmark?.capability_tags.includes(filters.tag ?? "");
        });
        if (!tagged) return false;
      }
      if (!query) return true;
      const modelHit = [model.name, model.provider, model.id].some((field) => includes(field, query));
      const scoreHit = scores.some((score) => matchingBenchmarkIds.has(score.benchmark_id));
      return modelHit || scoreHit;
    })
    .sort((a, b) => b.release_date.localeCompare(a.release_date) || a.name.localeCompare(b.name));
}
