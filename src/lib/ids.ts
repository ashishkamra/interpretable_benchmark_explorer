function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function recommendedScoreId(parts: {
  model_id: string;
  benchmark_id: string;
  benchmark_version: string;
  split?: string | null;
  harness?: string | null;
  effort?: string | null;
}): string {
  const segments = [
    slugPart(parts.model_id),
    slugPart(parts.benchmark_id),
    slugPart(parts.benchmark_version),
    slugPart(parts.split || "nosplit"),
    slugPart(parts.harness || "noharness"),
  ];
  if (parts.effort) segments.push(slugPart(parts.effort));
  return segments.filter(Boolean).join("--");
}
