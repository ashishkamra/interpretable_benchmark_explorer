import { StrictMode, useEffect, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { App } from "./App";
import { NavigateContext, type Navigate } from "./nav";
import "./styles.css";

const repo = import.meta.env.VITE_GITHUB_REPOSITORY || null;

function ClientApp({ initialPath, initialSearch }: { initialPath: string; initialSearch: string }) {
  const [loc, setLoc] = useState({ path: initialPath, search: initialSearch });
  useEffect(() => {
    const next = { path: window.location.pathname, search: window.location.search };
    setLoc((prev) => (prev.path === next.path && prev.search === next.search ? prev : next));
    const navigate: Navigate = (to, options) => {
      const url = new URL(to, window.location.origin);
      if (options?.replace) history.replaceState({}, "", url.pathname + url.search);
      else history.pushState({}, "", url.pathname + url.search);
      setLoc({ path: url.pathname, search: url.search });
      window.scrollTo(0, 0);
    };
    (window as Window & { __ibeNavigate?: Navigate }).__ibeNavigate = navigate;
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("mailto:") || raw.startsWith("#")) return;
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      navigate(url.pathname + url.search);
    }
    function onPop() {
      setLoc({ path: window.location.pathname, search: window.location.search });
    }
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  const navigate: Navigate = (to, options) => {
    const stored = (window as Window & { __ibeNavigate?: Navigate }).__ibeNavigate;
    if (stored) stored(to, options);
  };
  return (
    <NavigateContext.Provider value={navigate}>
      <App base={import.meta.env.BASE_URL} path={loc.path} search={loc.search} repo={repo} />
    </NavigateContext.Provider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
hydrateRoot(
  root,
  <StrictMode>
    <ClientApp initialPath={root.dataset.path ?? window.location.pathname} initialSearch={root.dataset.search ?? ""} />
  </StrictMode>,
);
