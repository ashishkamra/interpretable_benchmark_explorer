import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateDataset } from "../src/lib/validate";

const dir = resolve(process.argv[2] ?? "data");

function read(name: string): unknown {
  return JSON.parse(readFileSync(resolve(dir, name), "utf8")) as unknown;
}

const dataset = {
  benchmarks: read("benchmarks.json"),
  models: read("models.json"),
  scores: read("scores.json"),
  refusals: read("refusals.json"),
  manifest: read("manifest.json"),
};

const errors = validateDataset(dataset);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validated ${dir}`);
