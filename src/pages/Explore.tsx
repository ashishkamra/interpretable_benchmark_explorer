import { useState } from "react";
import { Layout } from "../components/Layout";
import { ScoreCard } from "../components/ScoreCard";
import type { Dataset } from "../lib/types";
import { filterBenchmarks } from "../lib/filter";
import { badgesFor, formatValue, standingLabel } from "../lib/interpret";
import { TAG_ORDER, tagLabel } from "../lib/labels";
import { href, parseExploreSearch } from "../lib/paths";
import { exploreHeadlines, scoreCount, visibleModels } from "../lib/present";
import { useNavigate } from "../nav";

export function Explore({
  dataset,
  base,
  path,
  search,
}: {
  dataset: Dataset;
  base: string;
  path: string;
  search: string;
}) {
  const navigate = useNavigate();
  const initial = parseExploreSearch(search);
  const [query, setQuery] = useState(initial.query);
  const [openClosed, setOpenClosed] = useState(initial.openClosed);
  const [tag, setTag] = useState<string | null>(initial.tag);
  const [independent, setIndependent] = useState(initial.independent);
  const [recent, setRecent] = useState(false);
  const [table, setTable] = useState(false);
  const filters = {
    query,
    openClosed,
    tag,
    independent,
    recent,
    now: recent ? new Date().toISOString().slice(0, 10) : undefined,
  };
  const models = visibleModels(dataset, filters);
  const benchmarks = filterBenchmarks(dataset, filters);
  const headlines = exploreHeadlines(dataset, models, tag);
  const tags = TAG_ORDER.filter((item) => dataset.benchmarks.some((benchmark) => benchmark.capability_tags.includes(item)));

  function push(next: Partial<typeof filters>) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.query.trim()) params.set("q", merged.query.trim());
    if (merged.openClosed !== "all") params.set("open", merged.openClosed);
    if (merged.tag) params.set("tag", merged.tag);
    if (merged.independent) params.set("independent", "1");
    const qs = params.toString();
    navigate(qs ? `/?${qs}` : "/", { replace: true });
  }

  return (
    <Layout base={base} path={path}>
      <h1>Explore</h1>
      <p className="lede">
        Search a model or a benchmark. Scores stay on the card with the sentence that says what they measure. Newest
        release first. That order is not a ranking.
      </p>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          push({ query });
        }}
      >
        <input
          className="search"
          type="search"
          value={query}
          placeholder="Search models, benchmarks, or tags"
          aria-label="Search models, benchmarks, or tags"
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>
      <div className="filters">
        <button type="button" className="chip" aria-pressed={openClosed === "open"} onClick={() => {
          const next = openClosed === "open" ? "all" : "open";
          setOpenClosed(next);
          push({ openClosed: next });
        }}>
          Open weights
        </button>
        <button type="button" className="chip" aria-pressed={openClosed === "closed"} onClick={() => {
          const next = openClosed === "closed" ? "all" : "closed";
          setOpenClosed(next);
          push({ openClosed: next });
        }}>
          Closed
        </button>
        <button type="button" className="chip" aria-pressed={independent} onClick={() => {
          setIndependent(!independent);
          push({ independent: !independent });
        }}>
          Has independent run
        </button>
        <button type="button" className="chip" aria-pressed={recent} onClick={() => setRecent(!recent)}>
          Released in 6 months
        </button>
        {tags.map((item) => (
          <button
            key={item}
            type="button"
            className="chip"
            aria-pressed={tag === item}
            onClick={() => {
              const next = tag === item ? null : item;
              setTag(next);
              push({ tag: next });
            }}
          >
            {tagLabel(item)}
          </button>
        ))}
      </div>
      <p className="quiet" aria-live="polite">
        {models.length} {models.length === 1 ? "model" : "models"} in this view.
      </p>
      <button type="button" className="toggle" aria-pressed={table} onClick={() => setTable(!table)}>
        {table ? "Card view" : "Table view"}
      </button>
      {models.length === 0 ? (
        <section className="panel">
          <h2>No models in this view</h2>
          <p>
            Benchmark pages below are ready. Scores appear after a sourced refresh: an agent sends published numbers,
            the action checks that every primary score has a source and a complete configuration, then the site rebuilds.
          </p>
        </section>
      ) : table ? (
        <ScoreTable dataset={dataset} models={models} tag={tag} base={base} />
      ) : (
        <div className="stack">
          {models.map((model) => {
            const cards = headlines.get(model.id) ?? [];
            const total = scoreCount(dataset, model.id);
            return (
              <section className="model-block" key={model.id}>
                <header>
                  <h2>
                    <a href={href(base, `/models/${model.id}`)}>{model.name}</a>
                  </h2>
                  <span className="kicker">{model.open_closed === "open" ? "Open weights" : "Closed"}</span>
                </header>
                <p className="meta">
                  {model.provider} · {model.release_date}
                  {total > cards.length ? ` · ${cards.length} of ${total} scores` : ""}
                </p>
                {cards.length === 0 ? <p>No primary scores in this view.</p> : null}
                <div className="stack">
                  {cards.map((card) => (
                    <ScoreCard key={card.score.id} headline={card} dataset={dataset} base={base} showStanding />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <h2>Benchmarks</h2>
      <ul className="catalog">
        {benchmarks.map((benchmark) => (
          <li key={benchmark.id}>
            <a href={href(base, `/benchmarks/${benchmark.id}`)}>{benchmark.name}</a>
            <p>{benchmark.one_sentence}</p>
          </li>
        ))}
      </ul>
    </Layout>
  );
}

function ScoreTable({
  dataset,
  models,
  tag,
  base,
}: {
  dataset: Dataset;
  models: ReturnType<typeof visibleModels>;
  tag: string | null;
  base: string;
}) {
  const headlines = exploreHeadlines(dataset, models, tag);
  const rows = models.flatMap((model) =>
    (headlines.get(model.id) ?? []).map((card) => ({ model, card })),
  );
  return (
    <div className="table-wrap">
      <table>
        <caption>Scores in this view. Sorting is not a rank, and this table is not an overall ordering of models.</caption>
        <thead>
          <tr>
            <th>Model</th>
            <th>Benchmark</th>
            <th>Score</th>
            <th>In this view</th>
            <th>Badges</th>
            <th>What it tests</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ model, card }) => (
            <tr key={card.score.id}>
              <td>
                <a href={href(base, `/models/${model.id}`)}>{model.name}</a>
              </td>
              <td>
                <a href={href(base, `/benchmarks/${card.benchmark.id}`)}>{card.benchmark.name}</a>
              </td>
              <td>{formatValue(card.score.value, card.benchmark)}</td>
              <td>{standingLabel(card.standing) ?? "—"}</td>
              <td>{badgesFor(card.score, card.benchmark, dataset).map((badge) => badge.label).join(", ")}</td>
              <td>{card.benchmark.one_sentence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
