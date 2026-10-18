import { AboutPage } from "./pages/AboutPage";
import { BenchmarkPage } from "./pages/BenchmarkPage";
import { ComparePage } from "./pages/ComparePage";
import { Explore } from "./pages/Explore";
import { ModelPage } from "./pages/ModelPage";
import { NotFound } from "./pages/NotFound";
import { dataset } from "./data";
import { matchRoute } from "./lib/paths";

export function App({
  base,
  path,
  search,
  repo,
}: {
  base: string;
  path: string;
  search: string;
  repo: string | null;
}) {
  const route = matchRoute(path, base);
  if (route.page === "about") return <AboutPage dataset={dataset} base={base} path={path} repo={repo} />;
  if (route.page === "compare") {
    return <ComparePage key={search} dataset={dataset} base={base} path={path} search={search} />;
  }
  if (route.page === "model") return <ModelPage dataset={dataset} base={base} path={path} id={route.id} />;
  if (route.page === "benchmark") return <BenchmarkPage dataset={dataset} base={base} path={path} id={route.id} />;
  if (route.page === "not-found") return <NotFound base={base} path={path} />;
  return <Explore key={search} dataset={dataset} base={base} path={path} search={search} />;
}

export function pageTitle(path: string, base: string): string {
  const route = matchRoute(path, base);
  const suffix = "Interpretable Benchmark Explorer";
  if (route.page === "about") return `About · ${suffix}`;
  if (route.page === "compare") return `Compare · ${suffix}`;
  if (route.page === "model") {
    const model = dataset.models.find((item) => item.id === route.id);
    return model ? `${model.name} · ${suffix}` : suffix;
  }
  if (route.page === "benchmark") {
    const benchmark = dataset.benchmarks.find((item) => item.id === route.id);
    return benchmark ? `${benchmark.name} · ${suffix}` : suffix;
  }
  if (route.page === "not-found") return `Not found · ${suffix}`;
  return suffix;
}
