export function normalizeBase(base: string): string {
  if (base === "" || base === "/") return "/";
  return base.endsWith("/") ? base : `${base}/`;
}

export function normalizePath(pathname: string, base: string): string {
  const prefix = normalizeBase(base);
  const prefixNoTrail = prefix === "/" ? "" : prefix.slice(0, -1);
  let path = pathname || "/";
  if (prefixNoTrail && (path === prefixNoTrail || path.startsWith(`${prefixNoTrail}/`))) {
    path = path.slice(prefixNoTrail.length) || "/";
  }
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

export function href(base: string, path: string): string {
  const prefix = normalizeBase(base);
  if (path === "/") return prefix;
  return `${prefix.slice(0, -1)}${path}`;
}

export function browserPath(base: string, route: string): string {
  const full = href(base, route);
  if (full !== "/" && full.endsWith("/")) return full.slice(0, -1);
  return full || "/";
}

export type Route =
  | { page: "explore" }
  | { page: "about" }
  | { page: "compare" }
  | { page: "model"; id: string }
  | { page: "benchmark"; id: string }
  | { page: "not-found" };

export function matchRoute(pathname: string, base: string): Route {
  const path = normalizePath(pathname, base);
  if (path === "/") return { page: "explore" };
  if (path === "/about") return { page: "about" };
  if (path === "/compare") return { page: "compare" };
  const model = path.match(/^\/models\/([^/]+)$/);
  if (model) return { page: "model", id: decodeURIComponent(model[1]) };
  const benchmark = path.match(/^\/benchmarks\/([^/]+)$/);
  if (benchmark) return { page: "benchmark", id: decodeURIComponent(benchmark[1]) };
  return { page: "not-found" };
}

export function parseModelsParam(search: string): string[] {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const ids = query
    .getAll("models")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, 4);
}

export function parseExploreSearch(search: string): {
  query: string;
  openClosed: "all" | "open" | "closed";
  tag: string | null;
  independent: boolean;
} {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const open = params.get("open");
  return {
    query: params.get("q") ?? "",
    openClosed: open === "open" || open === "closed" ? open : "all",
    tag: params.get("tag"),
    independent: params.get("independent") === "1",
  };
}
