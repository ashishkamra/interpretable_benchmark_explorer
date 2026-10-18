export const TAG_LABELS: Record<string, string> = {
  "short-coding-fixes": "Short coding fixes",
  "long-horizon-coding": "Long-horizon coding",
  "contest-coding": "Contest coding",
  "terminal-agents": "Terminal agents",
  "computer-use": "Computer use",
  "web-agents": "Web agents",
  "professional-agents": "Professional agents",
  "graduate-science": "Graduate science",
  "expert-knowledge": "Expert knowledge",
  "contest-math": "Contest math",
  "abstract-reasoning": "Abstract reasoning",
  multimodal: "Multimodal",
  "reverse-engineering": "Reverse engineering",
  "repo-construction": "Repo construction",
  "contamination-resistant": "Contamination-resistant",
};

export const TAG_ORDER = [
  "short-coding-fixes",
  "long-horizon-coding",
  "contest-coding",
  "reverse-engineering",
  "repo-construction",
  "terminal-agents",
  "computer-use",
  "web-agents",
  "professional-agents",
  "graduate-science",
  "expert-knowledge",
  "contest-math",
  "abstract-reasoning",
  "multimodal",
  "contamination-resistant",
];

export function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag.replace(/-/g, " ");
}

export const PRIORITY_ORDER = [
  "swe-bench-verified",
  "swe-bench-pro",
  "gpqa-diamond",
  "terminal-bench",
  "hle",
  "aime",
  "livecodebench",
  "arc-agi-2",
  "deepswe",
  "agents-last-exam",
  "programbench",
  "nl2repo-bench",
  "osworld",
  "browsecomp",
  "mmmu-pro",
];

export function benchmarkRank(id: string): number {
  const index = PRIORITY_ORDER.indexOf(id);
  return index === -1 ? PRIORITY_ORDER.length : index;
}

export function benchmarkTitle(name: string, version: string): string {
  if (!version) return name;
  if (name.toLowerCase().includes(version.toLowerCase())) return name;
  return `${name} ${version}`;
}
