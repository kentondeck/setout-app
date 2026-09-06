import { useState } from 'react';
import { CalcHeader } from '../components/CalcHeader';

// One step in a job sequence.
interface Step {
  title: string;
  body: string;
  watchFor?: string;
}

interface Job {
  id: string;
  label: string;
  summary: string;   // one-liner shown in the picker
  tools: string[];
  materials: string[];
  steps: Step[];
}

// ─── Content ─────────────────────────────────────────────────────────────────
// Ship-worthy content lives here. Add a new Job object to expand the library.
// Each job's steps are hand-written — no code generates them.

const JOBS: Job[] = [
  {
    id: 'frame-internal-wall',
    label: 'Frame an internal wall',
    summary: 'Non-load-bearing timber stud wall, floor to ceiling.',
    tools: [
      'Tape', 'Chalk line', 'Pencil', 'Square', 'Level',
      'Hammer or nail gun', 'Circular / mitre saw', 'Temporary brace stock',
    ],
    materials: [
      '90×45 kiln-dried pine (plates + studs + noggings)',
      '90×3.15 flat-head galv framing nails (or gun equivalent)',
      'Fixings for floor + top plate (screws / masonry anchors as needed)',
    ],
    steps: [
      {
        title: 'Mark the wall on the floor',
        body: 'Grab the plan, find your wall. Chalk-line the floor along where the bottom plate will sit. Measure off two known points (an outside wall, or a datum line you\'ve already set out) — not off adjacent framing that might not be square.',
        watchFor: "Don't reference off a wall you haven't checked for plumb. New apprentices lose hours here.",
      },
      {
        title: 'Cut plates',
        body: 'Cut a bottom plate to the wall length. Cut a top plate the same length — do them together so they\'re identical.',
        watchFor: 'If the wall butts into an existing one, subtract the finished skirting/lining allowance from the length.',
      },
      {
        title: 'Mark stud positions on both plates',
        body: 'Stack the two plates edge-to-edge and mark stud centres on both at once. Standard spacing is 600 mm c/c for a non-load-bearing wall; 400 mm c/c if it\'s load-bearing or supporting long sheet linings. Mark the two end studs first, then work the centres.',
        watchFor: 'Mark a "T" for trimmers where doors will go — cutting them in after the wall is up is a nightmare.',
      },
      {
        title: 'Cut studs',
        body: 'Stud length = wall height − (bottom plate + top plate). For 45 mm plates and a 2.4 m ceiling that\'s 2400 − 90 = 2310 mm. Cut ONE stud first, dry-fit it between the plates, confirm it lands where you want the top plate — then cut the rest.',
        watchFor: 'If the floor and ceiling aren\'t perfectly parallel (they rarely are on renovations), measure a stud at each end of the wall and taper any middle studs to suit.',
      },
      {
        title: 'Assemble flat on the floor',
        body: 'Lay the bottom plate on the floor, studs on their marks, top plate on the far end. Nail through the plates into each stud end — 2 nails per end. Keep the wall square as you go: measure the diagonals corner-to-corner; when they match, you\'re square.',
        watchFor: 'Nail from the plate INTO the stud end, not the other way around. End-nailing into the stud\'s end grain has poor pull-out resistance.',
      },
      {
        title: 'Stand the wall + brace temporarily',
        body: 'Two people to lift and stand. As soon as it\'s up, screw off-cuts diagonally from the top corners down to fixed points (existing framing, the floor, a nearby wall). Don\'t let go until it\'s braced.',
        watchFor: 'A stud wall is deceptively heavy. If it\'s a long wall, tie a rope to the top plate and pull from above while lifting the base.',
      },
      {
        title: 'Plumb + straighten',
        body: 'Plumb both ends with a level on the end studs — check both faces (the wall must be vertical in and out AND left-right). Sight down the top plate for straightness; adjust the brace and re-nail if the middle bows.',
        watchFor: 'A 4-ft level barely spans a 2.4 m stud. Use a 1.8 m or 2 m level, or check with a spirit level at top, middle, and bottom on the same stud.',
      },
      {
        title: 'Fix the bottom plate to the floor',
        body: 'Timber subfloor over joists: nails or screws down through the plate into the joist below. Concrete slab: masonry anchors (Ramset, Tapcon, Dynabolt) — pre-drill through the plate first with a wood bit, then swap to a masonry bit for the slab.',
        watchFor: 'Hit a joist. Random screws into subfloor plywood alone will pull out first time someone leans on the wall.',
      },
      {
        title: 'Fix the top plate up',
        body: 'Nail or screw the top plate up into the ceiling joists / trusses above. If you\'re running parallel to the joists, you need blocking between them to catch the top plate.',
        watchFor: 'Take the ceiling lining off (or plan the wall centreline) to hit a joist above. Blind-nailing into gib and hoping is not a strategy.',
      },
      {
        title: 'Add noggings',
        body: 'Cut and install a row of noggings between the studs at wall height ÷ 2 (about 1100–1200 mm for a standard ceiling). Noggings brace the wall from twisting and give a fixing for horizontal plasterboard joins.',
        watchFor: 'Stagger noggings up-and-down between studs so you can nail through the stud faces — trying to end-nail into every nog gets tedious fast.',
      },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function Sequencer() {
  const [activeJobId, setActiveJobId] = useState<string>(JOBS[0].id);
  const activeJob = JOBS.find(j => j.id === activeJobId) ?? JOBS[0];

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-card)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
  };

  const sectionLabelStyle: React.CSSProperties = {
    margin: 0, fontSize: 11, fontWeight: 500,
    color: 'var(--color-muted)', letterSpacing: '0.14em', textTransform: 'uppercase',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Sequencer" />

      <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Job picker — one chip per available job. */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {JOBS.map(job => {
            const active = activeJobId === job.id;
            return (
              <button
                key={job.id}
                onClick={() => setActiveJobId(job.id)}
                style={{
                  padding: '8px 14px', borderRadius: 999,
                  background: active ? 'var(--color-orange)' : 'var(--color-card)',
                  color: active ? '#fff' : 'var(--color-text)',
                  border: `0.5px solid ${active ? 'var(--color-orange)' : 'var(--color-border)'}`,
                  fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit',
                  whiteSpace: 'nowrap', letterSpacing: '-0.1px', cursor: 'pointer',
                }}
              >
                {job.label}
              </button>
            );
          })}
        </div>

        {/* Summary + step count */}
        <div style={{ padding: '2px 4px' }}>
          <h2 style={{
            margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--color-text)',
            letterSpacing: '-0.02em',
          }}>
            {activeJob.label}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {activeJob.summary} · {activeJob.steps.length} steps
          </p>
        </div>

        {/* Tools + materials — collapsed by default via <details> */}
        <details style={{ ...cardStyle, padding: '12px 14px' }}>
          <summary style={{
            listStyle: 'none', cursor: 'pointer', outline: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={sectionLabelStyle}>Before you start</span>
            <span style={{ fontSize: 11, color: 'var(--color-orange)', fontWeight: 500 }}>Tap to view</span>
          </summary>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ ...sectionLabelStyle, marginBottom: 6, fontSize: 10 }}>Tools</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activeJob.tools.map(t => (
                  <span key={t} style={{
                    background: 'var(--color-bg)', color: 'var(--color-text)',
                    fontSize: 12, padding: '4px 10px', borderRadius: 999,
                    letterSpacing: '-0.1px',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p style={{ ...sectionLabelStyle, marginBottom: 6, fontSize: 10 }}>Materials</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {activeJob.materials.map(m => (
                  <li key={m} style={{ fontSize: 13, color: 'var(--color-text)', letterSpacing: '-0.1px' }}>
                    • {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>

        {/* Steps — one card per step */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeJob.steps.map((step, i) => (
            <div key={i} style={{ ...cardStyle, padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <div style={{
                  minWidth: 36, height: 36, borderRadius: 10,
                  background: 'var(--color-orange)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'SF Pro Rounded', 'Nunito', system-ui, -apple-system, sans-serif",
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 16, fontWeight: 700, letterSpacing: '-0.5px',
                  flexShrink: 0, alignSelf: 'flex-start',
                }}>
                  {i + 1}
                </div>
                <h3 style={{
                  margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text)',
                  letterSpacing: '-0.02em', lineHeight: 1.3, alignSelf: 'center',
                }}>
                  {step.title}
                </h3>
              </div>
              <p style={{
                margin: '0 0 0 48px', fontSize: 13.5, color: 'var(--color-text)',
                lineHeight: 1.55, letterSpacing: '-0.1px',
              }}>
                {step.body}
              </p>
              {step.watchFor && (
                <div style={{
                  marginLeft: 48,
                  background: '#fff8e6', border: '0.5px solid rgba(245, 197, 66, 0.4)',
                  borderRadius: 10, padding: '10px 12px',
                }}>
                  <p style={{
                    margin: '0 0 2px', fontSize: 10.5, fontWeight: 600,
                    color: '#7a5b00', textTransform: 'uppercase', letterSpacing: '0.14em',
                  }}>
                    Watch for
                  </p>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#7a5b00', lineHeight: 1.5 }}>
                    {step.watchFor}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* More jobs coming */}
        <div style={{ ...cardStyle, padding: '14px 16px', marginTop: 4 }}>
          <p style={sectionLabelStyle}>More jobs coming</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {[
              'Hang an internal door',
              'Lay a deck (bearer → joist → boards)',
              'Install a lintel over an opening',
              'Set out for a strip footing',
              'Fix plasterboard to a wall',
            ].map(job => (
              <div key={job} style={{ fontSize: 13, color: 'var(--color-text)', letterSpacing: '-0.1px', padding: '2px 0' }}>
                {job}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
