import { CalcHeader } from '../components/CalcHeader';
// Vite's ?raw import gives us the markdown as a string, so PRIVACY.md is the
// single source of truth — updates to the file flow straight into this page.
import markdown from '../../PRIVACY.md?raw';

// Minimal markdown → JSX for the specific patterns used in PRIVACY.md
// (h1-h3, paragraphs, bullets, tables, links, bold, horizontal rules).
type Node = { type: string; content?: string; children?: Node[]; href?: string; rows?: string[][] };

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(<strong key={key++} style={{ fontWeight: 600, color: 'var(--color-text)' }}>{m[1]}</strong>);
    } else if (m[2] !== undefined && m[3] !== undefined) {
      parts.push(
        <a key={key++} href={m[3]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-orange)', textDecoration: 'none' }}>
          {m[2]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function parseMarkdown(md: string): Node[] {
  const lines = md.split('\n');
  const nodes: Node[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Skip blank lines
    if (line.trim() === '') { i++; continue; }
    // Horizontal rule
    if (/^---+$/.test(line.trim())) { nodes.push({ type: 'hr' }); i++; continue; }
    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { nodes.push({ type: `h${h[1].length}`, content: h[2] }); i++; continue; }
    // Table (header row + separator + data rows)
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\|[\s\-|:]+\|$/.test(lines[i + 1].trim())) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        // Skip separator row
        if (/^\|[\s\-|:]+\|$/.test(lines[i].trim())) { i++; continue; }
        const cells = lines[i].trim().slice(1, -1).split('|').map(c => c.trim());
        rows.push(cells);
        i++;
      }
      nodes.push({ type: 'table', rows });
      continue;
    }
    // Bullet list
    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ''));
        i++;
      }
      nodes.push({ type: 'ul', children: items.map(s => ({ type: 'li', content: s })) });
      continue;
    }
    // Paragraph — collect until blank line
    const paragraphLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,3}\s|-\s+|---+$|\|)/.test(lines[i])) {
      paragraphLines.push(lines[i]);
      i++;
    }
    nodes.push({ type: 'p', content: paragraphLines.join(' ') });
  }
  return nodes;
}

function renderNode(node: Node, key: number): React.ReactNode {
  switch (node.type) {
    case 'h1':
      return <h1 key={key} style={{ margin: '4px 0 20px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.6px', color: 'var(--color-text)' }}>{node.content}</h1>;
    case 'h2':
      return <h2 key={key} style={{ margin: '32px 0 10px', fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px', color: 'var(--color-text)' }}>{node.content}</h2>;
    case 'h3':
      return <h3 key={key} style={{ margin: '20px 0 6px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{node.content}</h3>;
    case 'hr':
      return <hr key={key} style={{ margin: '24px 0', border: 'none', borderTop: '0.5px solid var(--color-border)' }} />;
    case 'p':
      return <p key={key} style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.65, color: 'var(--color-muted)' }}>{parseInline(node.content ?? '')}</p>;
    case 'ul':
      return (
        <ul key={key} style={{ margin: '0 0 12px', paddingLeft: 20, listStyle: 'disc' }}>
          {node.children?.map((child, i) => (
            <li key={i} style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--color-muted)', marginBottom: 4 }}>
              {parseInline(child.content ?? '')}
            </li>
          ))}
        </ul>
      );
    case 'table': {
      const [head, ...body] = node.rows ?? [];
      return (
        <div key={key} style={{ overflowX: 'auto', margin: '0 0 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {head.map((cell, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text)' }}>
                    {parseInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '8px 10px', borderBottom: '0.5px solid var(--color-border)', color: 'var(--color-muted)', verticalAlign: 'top' }}>
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return null;
  }
}

export function PrivacyPolicy() {
  const nodes = parseMarkdown(markdown);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Privacy Policy" />
      <div style={{ padding: '24px 20px', paddingBottom: 40 }}>
        {nodes.map((n, i) => renderNode(n, i))}
      </div>
    </div>
  );
}
