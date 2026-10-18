import benchmarks from "../data/benchmarks.json";
import manifest from "../data/manifest.json";
import models from "../data/models.json";
import refusals from "../data/refusals.json";
import scores from "../data/scores.json";
import type { Dataset } from "./lib/types";
import { validateDataset } from "./lib/validate";

export const dataset = {
  benchmarks,
  models,
  scores,
  refusals,
  manifest,
} as Dataset;

const errors = validateDataset(dataset);
if (errors.length > 0) {
  throw new Error(`Dataset failed validation:\n${errors.join("\n")}`);
}
