import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { App, pageTitle } from "../src/App";
import { dataset } from "../src/data";
import { browserPath, href, normalizeBase } from "../src/lib/paths";

const dist = resolve("dist");
const template = readFileSync(resolve(dist, "index.html"), "utf8");
const base = normalizeBase(process.env.BASE_PATH ?? "/");
const repo = process.env.VITE_GITHUB_REPOSITORY ?? null;

function render(route: string): string {
  const path = browserPath(base, route);
  const html = renderToString(createElement(App, { base, path, search: "", repo }));
  const title = pageTitle(path, base);
  return template
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(
      '<div id="root" data-path="/" data-search=""></div>',
      `<div id="root" data-path="${path}" data-search="">${html}</div>`,
    );
}

function writePage(route: string) {
  const target = route === "/" ? resolve(dist, "index.html") : resolve(dist, route.slice(1), "index.html");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, render(route));
}

const routes = ["/", "/about", "/compare"];
for (const benchmark of dataset.benchmarks) routes.push(`/benchmarks/${benchmark.id}`);
for (const model of dataset.models) routes.push(`/models/${model.id}`);
for (const route of routes) writePage(route);

const notFound = template
  .replace(/<title>.*?<\/title>/, "<title>Not found · Interpretable Benchmark Explorer</title>")
  .replace(
    '<div id="root" data-path="/" data-search=""></div>',
    `<div id="root" data-path="${href(base, "/404")}" data-search=""></div>`,
  );
writeFileSync(resolve(dist, "404.html"), notFound);
console.log(`Prerendered ${routes.length} routes`);
