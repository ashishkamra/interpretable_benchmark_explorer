import type { Dataset, Score } from "../lib/types";
import { badgesFor, disclosed, formatValue, standingLabel } from "../lib/interpret";
import { benchmarkTitle } from "../lib/labels";
import type { Headline } from "../lib/present";
import { href } from "../lib/paths";
import { ExternalLink } from "./RichText";

export function ScoreCard({
  headline,
  dataset,
  base,
  showStanding = false,
}: {
  headline: Headline;
  dataset: Dataset;
  base: string;
  showStanding?: boolean;
}) {
  const { benchmark, score, standing } = headline;
  const badges = badgesFor(score, benchmark, dataset);
  const standingText = showStanding ? standingLabel(standing) : null;
  return (
    <article className="score">
      <header>
        <a href={href(base, `/benchmarks/${benchmark.id}`)}>{benchmarkTitle(benchmark.name, score.benchmark_version)}</a>
        <span className="kicker">{benchmark.saturation_status.replaceAll("_", " ")}</span>
      </header>
      <p className="number">{formatValue(score.value, benchmark)}</p>
      <p className="sentence">{benchmark.one_sentence}</p>
      <ul className="badges">
        {badges.map((badge) => (
          <li key={badge.id} className={`badge ${badge.id}`}>
            {badge.label}
          </li>
        ))}
      </ul>
      <div className="glance-links">
        {standingText ? <span className={`standing ${standing ?? ""}`}>{standingText}</span> : null}
        <ExternalLink href={score.source_url}>Source</ExternalLink>
      </div>
      <details>
        <summary>What this means</summary>
        <div className="expand">
          <p>{benchmark.how_to_read}</p>
          <Configuration score={score} />
          {benchmark.caveats.length > 0 ? (
            <ul>
              {benchmark.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          ) : null}
          {benchmark.human_baseline_note && benchmark.human_baseline_source ? (
            <p>
              Human anchor: {benchmark.human_baseline_note}{" "}
              <ExternalLink href={benchmark.human_baseline_source}>Baseline source</ExternalLink>
            </p>
          ) : null}
          {score.source_location ? <p>Where to look: {score.source_location}</p> : null}
          {score.notes ? <p>{score.notes}</p> : null}
        </div>
      </details>
    </article>
  );
}

function Configuration({ score }: { score: Score }) {
  const rows: [string, string][] = [
    ["Harness", disclosed(score.configuration.harness)],
    ["Effort", disclosed(score.configuration.effort)],
    ["Tools", disclosed(score.configuration.tools)],
    ["Timeout", disclosed(score.configuration.timeout)],
    ["Split", disclosed(score.split)],
    ["Subset", disclosed(score.configuration.subset)],
    ["Samples", disclosed(score.configuration.samples)],
    ["Temperature", disclosed(score.configuration.temperature)],
    ["Reported", score.date_reported],
    ["Version", score.benchmark_version],
  ];
  return (
    <dl>
      {rows.map(([label, value]) => (
        <FragmentRow key={label} label={label} value={value} />
      ))}
    </dl>
  );
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
