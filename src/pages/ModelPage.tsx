import { Layout } from "../components/Layout";
import { SourceCite } from "../components/RichText";
import { ScoreCard } from "../components/ScoreCard";
import { formatValue } from "../lib/interpret";
import { href } from "../lib/paths";
import { benchmarkOf, modelGroups, notApplicableScores, unheadedScores } from "../lib/present";
import type { Dataset } from "../lib/types";

export function ModelPage({ dataset, base, path, id }: { dataset: Dataset; base: string; path: string; id: string }) {
  const model = dataset.models.find((item) => item.id === id);
  if (!model) {
    return (
      <Layout base={base} path={path}>
        <h1>Model not in the dataset</h1>
        <p>No record for {id}. Absence is not a zero.</p>
      </Layout>
    );
  }
  const groups = modelGroups(dataset, model.id);
  const others = unheadedScores(dataset, model.id);
  const na = notApplicableScores(dataset, model.id);
  return (
    <Layout base={base} path={path}>
      <p className="kicker">{model.open_closed === "open" ? "Open weights" : "Closed"}</p>
      <h1>{model.name}</h1>
      <p className="lede">
        {model.provider} · released {model.release_date}. Open weights does not mean an unrestricted license.
      </p>
      <div className="stack">
        <p>
          Model card: <SourceCite url={model.links.model_card} />
        </p>
        <p>
          Hugging Face: <SourceCite url={model.links.huggingface} />
        </p>
        <p>
          API: <SourceCite url={model.links.api} />
        </p>
      </div>
      {model.notes ? <p>{model.notes}</p> : null}
      {groups.length === 0 ? <p>No primary scores yet. Checked sources are listed on each benchmark page.</p> : null}
      {groups.map((group) => (
        <section key={group.tag}>
          <h2>{group.label}</h2>
          <div className="stack">
            {group.cards.map((card) => (
              <div key={card.score.id}>
                <ScoreCard headline={card} dataset={dataset} base={base} />
                {card.others.length > 0 ? (
                  <details>
                    <summary>Other reported runs ({card.others.length})</summary>
                    <ul>
                      {card.others.map((score) => (
                        <li key={score.id}>
                          {formatValue(score.value, card.benchmark)} · {score.benchmark_version} ·{" "}
                          {score.primary ? "primary" : "not primary"} · {score.date_reported}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
      {others.length > 0 ? (
        <section>
          <h2>Other reported runs</h2>
          <ul>
            {others.map((score) => {
              const benchmark = benchmarkOf(dataset, score.benchmark_id);
              return (
                <li key={score.id}>
                  <a href={href(base, `/benchmarks/${score.benchmark_id}`)}>{benchmark?.name ?? score.benchmark_id}</a>{" "}
                  {score.benchmark_version}: {score.value ?? "n/a"} {score.metric}.{" "}
                  {score.primary
                    ? "Primary for this version, not the current benchmark version."
                    : "Not primary. A required configuration field is missing or another run was selected."}{" "}
                  <SourceCite url={score.source_url} location={score.source_location} date={score.date_reported} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {na.length > 0 ? (
        <section>
          <h2>Not applicable</h2>
          <ul>
            {na.map((score) => (
              <li key={score.id}>
                {benchmarkOf(dataset, score.benchmark_id)?.name ?? score.benchmark_id}: {score.notes || "Not applicable"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Layout>
  );
}
