import { Layout } from "../components/Layout";
import { href } from "../lib/paths";

export function NotFound({ base, path }: { base: string; path: string }) {
  return (
    <Layout base={base} path={path}>
      <h1>Page not found</h1>
      <p>
        <a href={href(base, "/")}>Back to explore</a>
      </p>
    </Layout>
  );
}
