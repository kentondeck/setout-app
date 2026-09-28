import { MarkdownPage } from '../components/MarkdownDoc';
// Vite's ?raw import gives us the markdown as a string, so PRIVACY.md is the
// single source of truth — updates to the file flow straight into this page.
import markdown from '../../PRIVACY.md?raw';

export function PrivacyPolicy() {
  return <MarkdownPage title="Privacy Policy" markdown={markdown} />;
}
