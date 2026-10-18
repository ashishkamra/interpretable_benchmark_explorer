import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { applyRefresh, decodePayload, parsePayload } from "../src/lib/refresh";
import { gapNote, tertile } from "../src/lib/interpret";
import { recommendedScoreId } from "../src/lib/ids";
import { filterModels } from "../src/lib/filter";
import { normalizePath } from "../src/lib/paths";
import type { Benchmark, Dataset, Model, Score } from "../src/lib/types";
import { validateDataset } from "../src/lib/validate";

function loadSeed(): Dataset {
  const dir = resolve("data");
  const read = (name: string) => JSON.parse(readFileSync(resolve(dir, name), "utf8")) as unknown;
  return {
    benchmarks: read("benchmarks.json"),
    models: read("models.json"),
    scores: read("scores.json"),
    refusals: read("refusals.json"),
    manifest: read("manifest.json"),
  } as Dataset;
}

function model(id = "example-model"): Model {
  return {
    id,
    name: "Example Model",
    provider: "Example Lab",
    open_closed: "closed",
    release_date: "2026-10-01",
    links: { model_card: "https://example.com/card", huggingface: null, api: null },
    notes: "",
  };
}

function score(overrides: Partial<Score> = {}): Score {
  return {
    id: "example-model--swe-bench-verified--verified--nosplit--harbor",
    model_id: "example-model",
    benchmark_id: "swe-bench-verified",
    benchmark_version: "verified",
    value: 70,
    metric: "percent_resolved",
    split: null,
    primary: true,
    configuration: {
      harness: "harbor",
      effort: null,
      temperature: null,
      tools: null,
      timeout: null,
      subset: null,
      samples: null,
      notes: "",
    },
    date_reported: "2026-10-17",
    source_url: "https://example.com/eval",
    source_location: "table row Example Model",
    self_reported: true,
    independent_available: false,
    not_applicable: false,
    notes: "",
    ...overrides,
  };
}

describe("seed dataset", () => {
  test("validates", () => {
    expect(validateDataset(loadSeed())).toEqual([]);
  });
});

describe("validateDataset", () => {
  test("rejects a primary score with no source", () => {
    const dataset = loadSeed();
    dataset.models = [model()];
    dataset.scores = [score({ source_url: null, source_location: "" })];
    dataset.manifest.counts.models = 1;
    dataset.manifest.counts.scores = 1;
    const errors = validateDataset(dataset);
    expect(errors.some((error) => error.includes("source_url"))).toBe(true);
  });

  test("rejects two primaries and a missing harness on a primary", () => {
    const dataset = loadSeed();
    dataset.models = [model()];
    dataset.scores = [
      score(),
      score({
        id: "example-model--swe-bench-verified--verified--nosplit--other",
        configuration: { ...score().configuration, harness: "other" },
      }),
    ];
    dataset.manifest.counts.models = 1;
    dataset.manifest.counts.scores = 2;
    expect(validateDataset(dataset).some((error) => error.includes("more than one primary"))).toBe(true);

    dataset.scores = [score({ configuration: { ...score().configuration, harness: null } })];
    dataset.manifest.counts.scores = 1;
    expect(validateDataset(dataset).some((error) => error.includes("primary false"))).toBe(true);
  });

  test("rejects a percentage outside 0-100 and HLE-Diamond filed under hle", () => {
    const dataset = loadSeed();
    dataset.models = [model()];
    dataset.scores = [score({ value: 140 })];
    dataset.manifest.counts.models = 1;
    dataset.manifest.counts.scores = 1;
    expect(validateDataset(dataset).some((error) => error.includes("0 and 100"))).toBe(true);

    dataset.scores = [
      score({
        id: "example-model--hle--diamond--nosplit--noharness",
        benchmark_id: "hle",
        benchmark_version: "diamond",
        metric: "percent_correct",
        configuration: { ...score().configuration, harness: null, subset: "text", tools: "none" },
      }),
    ];
    expect(validateDataset(dataset).some((error) => error.includes("HLE-Diamond"))).toBe(true);
  });
});

describe("applyRefresh", () => {
  test("upserts a model and score and demotes the previous primary", () => {
    const dataset = loadSeed();
    dataset.models = [model()];
    dataset.scores = [score({ value: 60 })];
    dataset.manifest.counts.models = 1;
    dataset.manifest.counts.scores = 1;
    const incoming = score({
      id: "example-model--swe-bench-verified--verified--nosplit--mini",
      value: 71,
      configuration: { ...score().configuration, harness: "mini" },
    });
    const { summary, dataset: next } = applyRefresh(
      dataset,
      { mode: "upsert", models: [model()], scores: [incoming] },
      { now: "2026-10-17T03:00:00Z" },
    );
    expect(summary.ok).toBe(true);
    expect(summary.scores.demoted).toEqual([score().id]);
    expect(next.scores.find((item) => item.id === score().id)?.primary).toBe(false);
    expect(next.scores.find((item) => item.id === incoming.id)?.primary).toBe(true);
    expect(dataset.scores[0].primary).toBe(true);
  });

  test("fails closed on ambiguous primaries, benchmark edits, and empty replace", () => {
    const dataset = loadSeed();
    const ambiguous = applyRefresh(
      dataset,
      {
        scores: [
          score(),
          score({ id: "other-id", configuration: { ...score().configuration, harness: "other" } }),
        ],
        models: [model()],
      },
      { now: "2026-10-17T03:00:00Z" },
    );
    expect(ambiguous.summary.ok).toBe(false);
    expect(ambiguous.dataset).toBe(dataset);

    const benchmarks = applyRefresh(dataset, { benchmarks: dataset.benchmarks }, { now: "2026-10-17T03:00:00Z" });
    expect(benchmarks.summary.errors.join(" ")).toContain("update_benchmarks");

    const wiped = applyRefresh(dataset, { mode: "replace", scores: [] }, { now: "2026-10-17T03:00:00Z" });
    expect(wiped.summary.ok).toBe(false);
  });

  test("does not remove a model that still has scores", () => {
    const dataset = loadSeed();
    dataset.models = [model()];
    dataset.scores = [score()];
    dataset.manifest.counts.models = 1;
    dataset.manifest.counts.scores = 1;
    const { summary } = applyRefresh(dataset, { remove_model_ids: ["example-model"] }, { now: "2026-10-17T03:00:00Z" });
    expect(summary.ok).toBe(false);
  });
});

describe("interpretation", () => {
  test("omits a meaningful-gap claim when no threshold is on file", () => {
    const benchmark = loadSeed().benchmarks.find((item) => item.id === "swe-bench-verified") as Benchmark;
    const note = gapNote(score({ value: 70 }), score({ value: 71, model_id: "other" }), benchmark, "A", "B");
    expect(note).toContain("A 70% resolved vs B 71% resolved");
    expect(note).not.toContain("too small");
  });

  test("calls out a harness mismatch and a version mismatch", () => {
    const benchmark = loadSeed().benchmarks.find((item) => item.id === "terminal-bench") as Benchmark;
    const left = score({
      benchmark_id: "terminal-bench",
      benchmark_version: "4.0.0",
      metric: "percent_resolved",
      configuration: { ...score().configuration, harness: "harbor", timeout: "8h" },
    });
    const right = score({
      model_id: "other",
      benchmark_id: "terminal-bench",
      benchmark_version: "2.1",
      metric: "percent_resolved",
      configuration: { ...score().configuration, harness: null, timeout: null },
    });
    const note = gapNote(left, right, benchmark, "A", "B");
    expect(note).toContain("not a clean comparison");
    expect(note).toContain("should not be compared");
  });

  test("tertiles need four spread-out scores", () => {
    expect(tertile(4, [1, 2, 3], true)).toBeNull();
    expect(tertile(4, [1, 2, 3, 4], true)).toBe("higher");
    expect(tertile(1, [1, 2, 3, 4], true)).toBe("lower");
    expect(tertile(1, [1, 1, 1, 1], true)).toBeNull();
    expect(tertile(1, [1, 2, 3, 4], false)).toBe("higher");
  });
});

describe("agent helpers", () => {
  test("decodes a base64 payload and builds a stable score id", () => {
    const payload = { mode: "upsert", models: [model()] };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    expect(parsePayload(decodePayload(encoded))).toMatchObject({ mode: "upsert" });
    expect(
      recommendedScoreId({
        model_id: "Example Model",
        benchmark_id: "terminal-bench",
        benchmark_version: "4.0.0",
        harness: "Harbor",
      }),
    ).toBe("example-model--terminal-bench--4.0.0--nosplit--harbor");
  });

  test("strips the pages base path", () => {
    expect(normalizePath("/interpretable_benchmark_explorer/benchmarks/hle/", "/interpretable_benchmark_explorer/")).toBe(
      "/benchmarks/hle",
    );
  });

  test("filters models by release window without ranking them", () => {
    const dataset = loadSeed();
    dataset.models = [
      model("old"),
      { ...model("new"), release_date: "2026-10-01", name: "New" },
    ];
    dataset.models[0].release_date = "2024-01-01";
    const recent = filterModels(dataset, {
      query: "",
      openClosed: "all",
      tag: null,
      independent: false,
      recent: true,
      now: "2026-10-17",
    });
    expect(recent.map((item) => item.id)).toEqual(["new"]);
  });
});
