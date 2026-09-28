import { MarkdownPage } from '../components/MarkdownDoc';
// TERMS.md is the single source of truth — the Terms page and the first-launch
// Terms gate both render this same markdown.
import markdown from '../../TERMS.md?raw';

export function Terms() {
  return <MarkdownPage title="Terms & Disclaimer" markdown={markdown} />;
}
