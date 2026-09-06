import { useState } from 'react';
import { CalcHeader } from '../components/CalcHeader';

// One tappable part of a diagram: its name, spec label, plain-English
// description, quick-fact tags, and (optionally) the common apprentice mistake
// to watch for.
interface Part {
  id: string;
  name: string;
  alias: string;
  body: string;
  tags: string[];
  mistake?: string;
}

interface Diagram {
  id: string;
  title: string;
  parts: Record<string, Part>;
  defaultPartId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content — every part shown in a diagram lives here. Add more diagrams by
// adding entries + a matching SVG renderer below.

const DECK: Diagram = {
  id: 'deck',
  title: 'Deck cross-section',
  defaultPartId: 'joist',
  parts: {
    board: {
      id: 'board',
      name: 'Decking board',
      alias: '140×22 H3.2 · pine',
      body: 'The surface you walk on. Ordered in lineal metres, fixed to joists with two screws per joist crossing. Gap between boards (4–8mm) lets water drain and lets the timber move seasonally without cupping.',
      tags: ['Wearing surface', 'H3.2 outdoors', '4–8mm gap'],
      mistake: 'Butting boards tight instead of leaving a gap — they swell in wet weather and cup or push each other apart.',
    },
    joist: {
      id: 'joist',
      name: 'Joist',
      alias: '140×45 H3.2 · MSG8',
      body: 'Secondary framing timber that sits on top of the bearer and carries the decking boards. Spaced 400–600mm centres so board fixings always land on solid timber.',
      tags: ['Structural', 'NZS 3604 Table 7.2', 'Perpendicular to bearer'],
      mistake: 'Using untreated (H1.2) instead of H3.2 for exposed decks — H1.2 rots inside 5 years outdoors. Ask for "outdoor grade" if in doubt.',
    },
    bearer: {
      id: 'bearer',
      name: 'Bearer',
      alias: '190×90 H3.2 · MSG8',
      body: 'Main structural timber running between posts. Joists sit on top of it and load the bearer, which loads the posts, which load the footings. First member you set out.',
      tags: ['Structural', 'NZS 3604 Table 7.1', 'Parallel to house'],
      mistake: 'Forgetting the 50mm bearing rule — the joist must land at least 50mm on the bearer or it can roll off under load.',
    },
    bolt: {
      id: 'bolt',
      name: 'Coach bolt',
      alias: 'M12 × 100 galv',
      body: 'Fastener with a domed head and a square shank collar — used to connect bearer to post. Torque with a socket. Two per connection is standard.',
      tags: ['Fastener', 'M12 × 100', '2 per post-bearer joint'],
      mistake: 'Using nails instead of bolts for the bearer-to-post joint. Nails pull out under wind or live load; bolts are the code-required fastener.',
    },
    post: {
      id: 'post',
      name: 'Post',
      alias: '125×125 H5',
      body: 'Vertical structural member that transfers the deck load down to the concrete footing. H5 treatment (not H3.2) because the base sits in ground contact.',
      tags: ['Structural', 'H5 in-ground grade', 'Post-anchor if not embedded'],
      mistake: 'Using H3.2 or H4 in-ground — will rot at the ground line within 5–10 years. H5 is the minimum for anything below finished ground level.',
    },
    footing: {
      id: 'footing',
      name: 'Concrete footing',
      alias: '450mm dia × 600mm deep',
      body: "Concrete pad in the ground that spreads the post's load over enough area to stop the deck sinking. Post sits in the wet concrete or bolts to a post-anchor bracket fixed to a cured pad.",
      tags: ['Concrete', 'Below frost line', 'Post-anchor or embedded'],
      mistake: 'Skipping the footing and pouring straight onto topsoil — deck settles unevenly within one season, especially after wet winters.',
    },
    screw: {
      id: 'screw',
      name: 'Deck screw',
      alias: '65mm stainless bugle',
      body: "Fastens decking boards to joists. Two per crossing. Stainless because they're outside; bugle head so they countersink neatly into the board face. Predrill if the timber's hard (kwila, garapa) to avoid splitting.",
      tags: ['Fastener', 'Stainless outdoors', '2 per joist crossing'],
      mistake: 'Using galvanised deck screws with treated pine — the treatment chemicals eat galvanising within a couple of years and boards start lifting.',
    },
  },
};

// SVG hotspot positions — one per part id in the diagram above.
// Coordinates are within the viewBox of the diagram's SVG below.
const DECK_HOTSPOTS: Record<string, { x: number; y: number; r?: number }> = {
  board:   { x: 170, y: 32,  r: 8 },
  joist:   { x: 190, y: 55,  r: 8 },
  bearer:  { x: 140, y: 81,  r: 8 },
  bolt:    { x: 90,  y: 81,  r: 8 },
  post:    { x: 90,  y: 140, r: 8 },
  footing: { x: 250, y: 210, r: 8 },
  screw:   { x: 99,  y: 30,  r: 6 },
};

// The static illustration — timber, concrete, ground fill. Rendered once,
// then hotspot circles overlay on top.
function DeckIllustration() {
  return (
    <g>
      {/* Ground fill + hatch */}
      <rect x="0" y="200" width="340" height="60" fill="#E8DFCB" opacity="0.5" />
      <line x1="0" y1="200" x2="340" y2="200" stroke="#B8A883" strokeWidth="1" />
      <g stroke="#B8A883" strokeWidth="0.6" opacity="0.7">
        {[5, 30, 55, 80, 105, 130, 155, 180, 205, 230, 255, 280, 305].map(x => (
          <line key={x} x1={x} y1={205} x2={x + 10} y2={215} />
        ))}
      </g>

      {/* Concrete footings */}
      <rect x="60"  y="180" width="60" height="55" fill="#C9C4B8" stroke="#6E695B" strokeWidth="1.2" rx="2" />
      <rect x="220" y="180" width="60" height="55" fill="#C9C4B8" stroke="#6E695B" strokeWidth="1.2" rx="2" />
      <g fill="#8E8977" opacity="0.6">
        <circle cx="72"  cy="195" r="1.2" /><circle cx="92"  cy="205" r="1" /><circle cx="105" cy="220" r="1.4" />
        <circle cx="80"  cy="225" r="1" /><circle cx="112" cy="197" r="1.1" />
        <circle cx="232" cy="195" r="1.2" /><circle cx="252" cy="205" r="1" /><circle cx="265" cy="220" r="1.4" />
        <circle cx="240" cy="225" r="1" /><circle cx="272" cy="197" r="1.1" />
      </g>

      {/* Posts */}
      <rect x="80"  y="90" width="20" height="110" fill="#B99165" stroke="#5C3F1F" strokeWidth="1.2" />
      <rect x="240" y="90" width="20" height="110" fill="#B99165" stroke="#5C3F1F" strokeWidth="1.2" />
      <line x1="86"  y1="100" x2="86"  y2="195" stroke="#5C3F1F" strokeWidth="0.4" opacity="0.4" />
      <line x1="94"  y1="100" x2="94"  y2="195" stroke="#5C3F1F" strokeWidth="0.4" opacity="0.4" />
      <line x1="246" y1="100" x2="246" y2="195" stroke="#5C3F1F" strokeWidth="0.4" opacity="0.4" />
      <line x1="254" y1="100" x2="254" y2="195" stroke="#5C3F1F" strokeWidth="0.4" opacity="0.4" />

      {/* Bearer */}
      <rect x="70" y="70" width="200" height="22" fill="#CCA478" stroke="#6E4720" strokeWidth="1.2" />
      <line x1="72" y1="76" x2="268" y2="76" stroke="#6E4720" strokeWidth="0.4" opacity="0.4" />
      <line x1="72" y1="86" x2="268" y2="86" stroke="#6E4720" strokeWidth="0.4" opacity="0.4" />

      {/* Bolt heads through post + bearer (drawn under hotspot) */}
      <circle cx="90"  cy="81" r="3.5" fill="#4a4a48" stroke="#1e1e1c" strokeWidth="0.8" />
      <circle cx="250" cy="81" r="3.5" fill="#4a4a48" stroke="#1e1e1c" strokeWidth="0.8" />

      {/* Joists (end-on) */}
      {[90, 130, 170, 210, 242].map(x => (
        <rect key={x} x={x} y="40" width="18" height="30" fill="#D6B896" stroke="#7A5326" strokeWidth="1" />
      ))}

      {/* Decking boards */}
      {[60, 104, 148, 192, 236].map(x => (
        <g key={x}>
          <rect x={x} y="26" width="42" height="12" fill="#D9B788" stroke="#8B5E2D" strokeWidth="0.8" />
          <line x1={x + 2} y1="32" x2={x + 40} y2="32" stroke="#8B5E2D" strokeWidth="0.3" opacity="0.4" />
        </g>
      ))}

      {/* Deck screws (drawn under hotspot on first board) */}
      <g fill="#3a3a38">
        {[99, 139, 179, 219, 251].map(x => <circle key={x} cx={x} cy={30} r={1} />)}
      </g>
    </g>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FieldGuide() {
  const [activePartId, setActivePartId] = useState<string>(DECK.defaultPartId);
  const activePart = DECK.parts[activePartId];

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-card)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Field guide" />

      <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Diagram picker — one chip per diagram. Only one built for now;
            others sit as coming-soon hints below. */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          <div style={{
            padding: '8px 14px', borderRadius: 999,
            background: 'var(--color-orange)', color: '#fff',
            fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
          }}>
            {DECK.title}
          </div>
        </div>

        {/* Interactive diagram */}
        <div style={{ ...cardStyle, padding: '14px 12px 10px' }}>
          <svg
            viewBox="0 0 340 260"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={DECK.title}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          >
            <DeckIllustration />

            {/* Hotspots — overlaid on top of the illustration */}
            {Object.entries(DECK_HOTSPOTS).map(([partId, { x, y, r = 8 }]) => {
              const active = activePartId === partId;
              return (
                <g
                  key={partId}
                  onClick={() => setActivePartId(partId)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Invisible larger click target for finger taps */}
                  <circle cx={x} cy={y} r={r + 12} fill="transparent" />
                  {/* Pulsing ring — only when NOT active */}
                  {!active && (
                    <circle cx={x} cy={y} r={r + 2} fill="var(--color-orange)" opacity="0.35">
                      <animate attributeName="r" from={r + 2} to={r + 10} dur="2.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.5" to="0" dur="2.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* The dot */}
                  <circle
                    cx={x} cy={y} r={r}
                    fill={active ? 'var(--color-orange)' : '#fff'}
                    stroke="var(--color-orange)"
                    strokeWidth="2.5"
                  />
                </g>
              );
            })}
          </svg>

          <p style={{
            margin: '6px 0 0', fontSize: 11, color: 'var(--color-muted)',
            textAlign: 'center', letterSpacing: '-0.1px',
          }}>
            Tap any orange dot to learn what it is
          </p>
        </div>

        {/* Info card — updates as parts are tapped */}
        <div style={{ ...cardStyle, padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h3 style={{
              margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text)',
              letterSpacing: '-0.02em',
            }}>
              {activePart.name}
            </h3>
            <p style={{
              margin: 0, fontSize: 11.5, color: 'var(--color-muted)',
              textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500,
              flexShrink: 0, textAlign: 'right',
            }}>
              {activePart.alias}
            </p>
          </div>

          <p style={{
            margin: 0, fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.55,
            letterSpacing: '-0.1px',
          }}>
            {activePart.body}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {activePart.tags.map(tag => (
              <span
                key={tag}
                style={{
                  background: '#fff0e9', color: 'var(--color-orange)',
                  fontSize: 11, fontWeight: 500, padding: '4px 10px',
                  borderRadius: 999, letterSpacing: '-0.1px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {activePart.mistake && (
            <div style={{
              background: '#fff8e6', border: '0.5px solid rgba(245, 197, 66, 0.4)',
              borderRadius: 10, padding: '10px 12px', marginTop: 4,
            }}>
              <p style={{
                margin: '0 0 2px', fontSize: 10.5, fontWeight: 600,
                color: '#7a5b00', textTransform: 'uppercase', letterSpacing: '0.14em',
              }}>
                Common mistake
              </p>
              <p style={{ margin: 0, fontSize: 12.5, color: '#7a5b00', lineHeight: 1.5 }}>
                {activePart.mistake}
              </p>
            </div>
          )}
        </div>

        {/* Coming soon — the roadmap of future diagrams */}
        <div style={{ ...cardStyle, padding: '14px 16px', marginTop: 4 }}>
          <p style={{
            margin: '0 0 8px', fontSize: 11, fontWeight: 500,
            color: 'var(--color-muted)', letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            More diagrams coming
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { name: 'Timber wall frame', detail: 'top plate, studs, noggings, lintel, sill trimmer' },
              { name: 'Roof cross-section', detail: 'ridge, rafter, purlin, fascia, soffit, birdsmouth' },
              { name: 'Floor build-up',    detail: 'pile, bearer, joist, subfloor, insulation, DPM' },
              { name: 'Door / window jamb', detail: 'jamb, sill, head, trimmer, cripple, flashing' },
              { name: 'Stair section',      detail: 'stringer, tread, riser, nosing, going, drop' },
            ].map(d => (
              <div key={d.name} style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500 }}>{d.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>{d.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
