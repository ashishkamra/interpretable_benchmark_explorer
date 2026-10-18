import { filterModels, type Filters } from "./filter";
import { gapNote, tertile, type Badge } from "./interpret";
import { benchmarkRank, TAG_ORDER, tagLabel } from "./labels";
import type { Benchmark, Dataset, Model, Score, Standing } from "./types";

export interface Headline {
  benchmark: Benchmark;
  score: Score;
  others: Score[];
  standing: Standing | null;
}

export interface ScoreGroup {
  tag: string;
  label: string;
  cards: Headline[];
}

export interface CompareCell {
  model: Model;
  score: Score | null;
  otherCount: number;
}

export interface CompareRow {
  benchmark: Benchmark;
  version: string;
  title: string;
  cells: CompareCell[];
  gaps: string[];
}

function byId<T extends { id: string }>(records: T[]): Map<string, T> {
  return new Map(records.map((record) => [record.id, record]));
}

export function benchmarkOf(dataset: Dataset, id: string): Benchmark | undefined {
  return dataset.benchmarks.find((benchmark) => benchmark.id === id);
}

function isHeadline(score: Score, benchmark: Benchmark): boolean {
  if (!score.primary || score.not_applicable || score.value == null) return false;
  if (benchmark.version_policy === "exact" && score.benchmark_version !== benchmark.version) return false;
  return true;
}

export function headlineScores(dataset: Dataset, modelId: string, tag: string | null, limit?: number): Score[] {
  const scores = dataset.scores.filter((score) => {
    if (score.model_id !== modelId) return false;
    const benchmark = benchmarkOf(dataset, score.benchmark_id);
    if (!benchmark || !isHeadline(score, benchmark)) return false;
    if (tag && !benchmark.capability_tags.includes(tag)) return false;
    return true;
  });
  scores.sort(
    (a, b) => benchmarkRank(a.benchmark_id) - benchmarkRank(b.benchmark_id) || b.date_reported.localeCompare(a.date_reported),
  );
  const seen = new Set<string>();
  const unique: Score[] = [];
  for (const score of scores) {
    const key = `${score.benchmark_id}@${score.benchmark_version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(score);
  }
  return limit == null ? unique : unique.slice(0, limit);
}

export function otherScores(dataset: Dataset, score: Score): Score[] {
  return dataset.scores.filter(
    (other) =>
      other.id !== score.id &&
      other.model_id === score.model_id &&
      other.benchmark_id === score.benchmark_id &&
      !other.not_applicable,
  );
}

export function standingFor(dataset: Dataset, models: Model[], score: Score): Standing | null {
  const benchmark = benchmarkOf(dataset, score.benchmark_id);
  if (!benchmark || score.value == null) return null;
  const values = models.flatMap((model) => {
    const headline = headlineScores(dataset, model.id, null).find(
      (item) => item.benchmark_id === score.benchmark_id && item.benchmark_version === score.benchmark_version,
    );
    return headline?.value == null ? [] : [headline.value];
  });
  return tertile(score.value, values, benchmark.higher_is_better);
}

export function modelGroups(dataset: Dataset, modelId: string): ScoreGroup[] {
  const cards = headlineScores(dataset, modelId, null).map((score) => ({
    benchmark: benchmarkOf(dataset, score.benchmark_id) as Benchmark,
    score,
    others: otherScores(dataset, score),
    standing: null,
  }));
  const groups = new Map<string, Headline[]>();
  for (const card of cards) {
    const tag = TAG_ORDER.find((item) => card.benchmark.capability_tags.includes(item)) ?? card.benchmark.capability_tags[0] ?? "other";
    const list = groups.get(tag) ?? [];
    list.push(card);
    groups.set(tag, list);
  }
  return [...groups.entries()]
    .sort((a, b) => TAG_ORDER.indexOf(a[0]) - TAG_ORDER.indexOf(b[0]))
    .map(([tag, groupCards]) => ({ tag, label: tagLabel(tag), cards: groupCards }));
}

export function unheadedScores(dataset: Dataset, modelId: string): Score[] {
  const headed = new Set(headlineScores(dataset, modelId, null).map((score) => score.id));
  return dataset.scores.filter((score) => score.model_id === modelId && !headed.has(score.id) && !score.not_applicable);
}

export function notApplicableScores(dataset: Dataset, modelId: string): Score[] {
  return dataset.scores.filter((score) => score.model_id === modelId && score.not_applicable);
}

export function exploreHeadlines(dataset: Dataset, models: Model[], tag: string | null): Map<string, Headline[]> {
  const map = new Map<string, Headline[]>();
  for (const model of models) {
    const scores = headlineScores(dataset, model.id, tag, 4);
    map.set(
      model.id,
      scores.map((score) => ({
        benchmark: benchmarkOf(dataset, score.benchmark_id) as Benchmark,
        score,
        others: otherScores(dataset, score),
        standing: standingFor(dataset, models, score),
      })),
    );
  }
  return map;
}

export function visibleModels(dataset: Dataset, filters: Filters): Model[] {
  return filterModels(dataset, filters);
}

function rowTitle(benchmark: Benchmark, version: string): string {
  if (benchmark.name.toLowerCase().includes(version.toLowerCase())) return benchmark.name;
  return `${benchmark.name} ${version}`;
}

export function compareRows(dataset: Dataset, modelIds: string[]): CompareRow[] {
  const models = modelIds.flatMap((id) => {
    const model = byId(dataset.models).get(id);
    return model ? [model] : [];
  });
  const keys = new Map<string, { benchmark: Benchmark; version: string }>();
  for (const benchmark of dataset.benchmarks) {
    if (benchmark.version_policy === "exact" || benchmark.score_collection === "priority") {
      keys.set(`${benchmark.id}@${benchmark.version}`, { benchmark, version: benchmark.version });
    }
  }
  for (const model of models) {
    for (const score of dataset.scores.filter((item) => item.model_id === model.id && item.primary)) {
      const benchmark = benchmarkOf(dataset, score.benchmark_id);
      if (!benchmark) continue;
      keys.set(`${benchmark.id}@${score.benchmark_version}`, { benchmark, version: score.benchmark_version });
    }
  }
  const rows = [...keys.values()].sort(
    (a, b) => benchmarkRank(a.benchmark.id) - benchmarkRank(b.benchmark.id) || a.version.localeCompare(b.version),
  );
  return rows.map(({ benchmark, version }) => {
    const cells: CompareCell[] = models.map((model) => {
      const related = dataset.scores.filter(
        (score) => score.model_id === model.id && score.benchmark_id === benchmark.id && score.benchmark_version === version,
      );
      const score = related.find((item) => item.primary && !item.not_applicable) ?? null;
      return { model, score, otherCount: related.filter((item) => item.id !== score?.id).length };
    });
    const paired = cells.filter((cell) => cell.score && cell.score.value != null);
    const gaps: string[] = [];
    if (paired.length >= 2) {
      for (let i = 0; i < paired.length; i += 1) {
        for (let j = i + 1; j < paired.length; j += 1) {
          gaps.push(gapNote(paired[i].score as Score, paired[j].score as Score, benchmark, paired[i].model.name, paired[j].model.name));
        }
      }
    }
    return { benchmark, version, title: rowTitle(benchmark, version), cells, gaps };
  });
}

export function scoreCount(dataset: Dataset, modelId: string): number {
  return dataset.scores.filter((score) => score.model_id === modelId && !score.not_applicable).length;
}

export type { Badge };
