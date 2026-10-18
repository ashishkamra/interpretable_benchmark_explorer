import type { ReactNode } from "react";
import { href, normalizePath } from "../lib/paths";

export function Layout({
  base,
  path,
  children,
}: {
  base: string;
  path: string;
  children: ReactNode;
}) {
  const current = normalizePath(path, base);
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <div className="shell">
        <header className="top">
          <a className="brand" href={href(base, "/")}>
            <strong>Interpretable Benchmark Explorer</strong>
            <span>Numbers, with what they mean.</span>
          </a>
          <nav aria-label="Primary">
            <a href={href(base, "/")} aria-current={current === "/" ? "page" : undefined}>
              Explore
            </a>
            <a href={href(base, "/compare")} aria-current={current === "/compare" ? "page" : undefined}>
              Compare
            </a>
            <a href={href(base, "/about")} aria-current={current === "/about" ? "page" : undefined}>
              About
            </a>
          </nav>
        </header>
        <main id="content">{children}</main>
        <footer className="footer">Not a leaderboard. A small gap is unlabeled unless the runs are actually comparable.</footer>
      </div>
    </>
  );
}
