import { Layout } from "../components/Layout";
import { SourceCite } from "../components/RichText";
import { formatValue } from "../lib/interpret";
import { href, parseModelsParam } from "../lib/paths";
import { compareRows } from "../lib/present";
import type { Dataset } from "../lib/types";
import { useNavigate } from "../nav";

export function ComparePage({
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
  const selected = parseModelsParam(search);
  const rows = compareRows(dataset, selected);
  return (
    <Layout base={base} path={path}>
      <h1>Compare</h1>
      <p className="lede">
        Pick two to four models. A missing cell stays on the page. The note under a row is a template, not a generated
        essay, and it refuses a comparison when the runs do not match.
      </p>
      {dataset.models.length === 0 ? <p>No models to compare yet.</p> : null}
      <form
        method="get"
        action={href(base, "/compare")}
        onSubmit={(event) => {
          event.preventDefault();
          const picked = [...new FormData(event.currentTarget).getAll("models")].map(String).slice(0, 4);
          navigate(`/compare?models=${picked.join(",")}`);
        }}
      >
        <div className="checks">
          {dataset.models.map((model) => (
            <label key={model.id}>
              <input type="checkbox" name="models" value={model.id} defaultChecked={selected.includes(model.id)} />
              {model.name} <span className="quiet">{model.provider}</span>
            </label>
          ))}
        </div>
        <button type="submit">Compare selected</button>
      </form>
      {selected.length > 0 ? (
        <div className="stack">
          {rows.map((row) => (
            <section className="card" key={`${row.benchmark.id}@${row.version}`}>
              <div className="row-head">
                <h2>
                  <a href={href(base, `/benchmarks/${row.benchmark.id}`)}>{row.title}</a>
                </h2>
              </div>
              <p className="sentence">{row.benchmark.one_sentence}</p>
              <div className="compare-cells">
                {row.cells.map((cell) => (
                  <div key={cell.model.id}>
                    <h3>
                      <a href={href(base, `/models/${cell.model.id}`)}>{cell.model.name}</a>
                    </h3>
                    {cell.score ? (
                      <>
                        <p className="number">{formatValue(cell.score.value, row.benchmark)}</p>
                        <SourceCite
                          url={cell.score.source_url}
                          location={cell.score.source_location}
                          date={cell.score.date_reported}
                        />
                      </>
                    ) : (
                      <p>Not reported</p>
                    )}
                    {cell.otherCount > 0 ? <p className="quiet">{cell.otherCount} other reported run(s)</p> : null}
                  </div>
                ))}
              </div>
              {row.gaps.map((gap) => (
                <p className="gap" key={gap}>
                  {gap}
                </p>
              ))}
            </section>
          ))}
        </div>
      ) : null}
    </Layout>
  );
}
