import { Layout } from "../components/Layout";
import { ExternalLink, RichText } from "../components/RichText";
import { badgesFor, formatValue } from "../lib/interpret";
import { benchmarkTitle, tagLabel } from "../lib/labels";
import { href } from "../lib/paths";
import type { Dataset } from "../lib/types";

export function BenchmarkPage({
  dataset,
  base,
  path,
  id,
}: {
  dataset: Dataset;
  base: string;
  path: string;
  id: string;
}) {
  const benchmark = dataset.benchmarks.find((item) => item.id === id);
  if (!benchmark) {
    return (
      <Layout base={base} path={path}>
        <h1>Benchmark not in the catalog</h1>
        <p>No record for {id}.</p>
      </Layout>
    );
  }
  const reported = dataset.scores
    .filter((score) => score.benchmark_id === benchmark.id && !score.not_applicable)
    .sort((a, b) => a.benchmark_version.localeCompare(b.benchmark_version) || a.model_id.localeCompare(b.model_id));
  const scores = reported.filter((score) => score.primary);
  const otherScores = reported.filter((score) => !score.primary);
  const refusals = dataset.refusals.filter((refusal) => refusal.benchmark_id === benchmark.id);
  return (
    <Layout base={base} path={path}>
      <p className="kicker">{benchmark.metric_label}</p>
      <h1>
        {benchmark.version_policy === "exact" ? benchmarkTitle(benchmark.name, benchmark.version) : benchmark.name}
      </h1>
      <p className="sentence">{benchmark.one_sentence}</p>
      <p>{benchmark.how_to_read}</p>
      <RichText text={benchmark.long_description} />
      <h2>How to trust a number here</h2>
      <ul>
        <li>Sample size: {benchmark.sample_size ?? "not pinned yet"}</li>
        <li>Saturation: {benchmark.saturation_status.replaceAll("_", " ")}</li>
        <li>Harness sensitive: {benchmark.harness_sensitive ? "yes" : "no"}</li>
        <li>Required configuration: {benchmark.required_config.join(", ") || "none"}</li>
        <li>Version policy: {benchmark.version_policy === "exact" ? `scores should use ${benchmark.version}` : "the score names the version"}</li>
        {benchmark.splits.length > 0 ? <li>Known splits: {benchmark.splits.join(", ")}</li> : null}
      </ul>
      {benchmark.human_baseline_note && benchmark.human_baseline_source ? (
        <p>
          Human anchor: {benchmark.human_baseline_note}{" "}
          <ExternalLink href={benchmark.human_baseline_source}>Source</ExternalLink>
        </p>
      ) : (
        <p>No human anchor is shown until both a note and a source URL are on file.</p>
      )}
      <p>
        <ExternalLink href={benchmark.official_url}>Official source</ExternalLink>
        {!benchmark.official_url ? " Official URL is not pinned yet. Scores still need their own source." : null}
      </p>
      <ul className="badges">
        {benchmark.capability_tags.map((tag) => (
          <li key={tag} className="badge">
            {tagLabel(tag)}
          </li>
        ))}
      </ul>
      {benchmark.caveats.length > 0 ? (
        <>
          <h2>Caveats</h2>
          <ul>
            {benchmark.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </>
      ) : null}
      <h2>Primary scores</h2>
      {scores.length === 0 ? <p>No scores entered yet. A missing table is not a zero.</p> : null}
      {scores.length > 0 ? (
        <div className="table-wrap">
          <table>
            <caption>Primary scores only. Other configurations stay off this table until an editor marks them primary.</caption>
            <thead>
              <tr>
                <th>Model</th>
                <th>Score</th>
                <th>Version</th>
                <th>Split</th>
                <th>Harness</th>
                <th>Badges</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => {
                const model = dataset.models.find((item) => item.id === score.model_id);
                return (
                  <tr key={score.id}>
                    <td>
                      <a href={href(base, `/models/${score.model_id}`)}>{model?.name ?? score.model_id}</a>
                    </td>
                    <td>{formatValue(score.value, benchmark)}</td>
                    <td>{score.benchmark_version}</td>
                    <td>{score.split ?? "—"}</td>
                    <td>{score.configuration.harness ?? "not disclosed"}</td>
                    <td>{badgesFor(score, benchmark, dataset).map((badge) => badge.label).join(", ")}</td>
                    <td>
                      <ExternalLink href={score.source_url}>Source</ExternalLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {otherScores.length > 0 ? (
        <>
          <h2>Other reported runs</h2>
          <p>These numbers are on a cited page, but the configuration is incomplete or another run is the primary. They are not a clean comparison.</p>
          <div className="table-wrap">
            <table>
              <caption>Not primary. Missing harness, split, tools, or version stays visible instead of being filled in.</caption>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Score</th>
                  <th>Version</th>
                  <th>Split</th>
                  <th>Harness</th>
                  <th>Badges</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {otherScores.map((score) => {
                  const model = dataset.models.find((item) => item.id === score.model_id);
                  return (
                    <tr key={score.id}>
                      <td>
                        <a href={href(base, `/models/${score.model_id}`)}>{model?.name ?? score.model_id}</a>
                      </td>
                      <td>{formatValue(score.value, benchmark)}</td>
                      <td>{score.benchmark_version}</td>
                      <td>{score.split ?? "—"}</td>
                      <td>{score.configuration.harness ?? "not disclosed"}</td>
                      <td>{badgesFor(score, benchmark, dataset).map((badge) => badge.label).join(", ")}</td>
                      <td>
                        <ExternalLink href={score.source_url}>Source</ExternalLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {refusals.length > 0 ? (
        <>
          <h2>Numbers we refused</h2>
          <ul>
            {refusals.map((refusal) => (
              <li key={refusal.id}>
                {refusal.model_name}: {refusal.reason}{" "}
                <ExternalLink href={refusal.source_url}>Source</ExternalLink>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Layout>
  );
}
