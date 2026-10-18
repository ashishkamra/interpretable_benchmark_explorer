import { Fragment, type ReactNode } from "react";

const URL = /https:\/\/[^\s)]+/g;

export function linkify(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const href = match[0];
    nodes.push(
      <a key={`${href}-${index}`} href={href} target="_blank" rel="noopener noreferrer">
        {href}
      </a>,
    );
    last = index + href.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichText({ text }: { text: string }) {
  return text.split(/\n\n+/).map((paragraph, index) => (
    <p key={index}>
      <Fragment>{linkify(paragraph)}</Fragment>
    </p>
  ));
}

export function ExternalLink({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href || !/^https:\/\//i.test(href)) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
