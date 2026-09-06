import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { SettingsContext } from '../contexts';

// ─── Types ───────────────────────────────────────────────────────────────────

type CategoryKey =
  | 'framing'
  | 'doors-windows'
  | 'interior-finishing'
  | 'decking-outdoor'
  | 'concrete-foundations'
  | 'roofing-cladding'
  | 'site-setout'
  | 'wet-areas'
  | 'renovation';

interface Category {
  key: CategoryKey;
  label: string;
}

interface Step {
  title: string;
  body: string;
  watchFor?: string;
}

interface JobDetail {
  tools: string[];
  materials: string[];
  steps: Step[];
}

// AU and NZ build to different standards, use different terminology, and fix
// with different products. Every writeable job carries both variants; the
// active one is picked at render time from settings.region.
interface Job {
  id: string;
  category: CategoryKey;
  label: string;
  summary: string;
  au?: JobDetail;
  nz?: JobDetail;
}

// ─── Categories ──────────────────────────────────────────────────────────────
// Order roughly follows the build sequence for a new-build home: site prep
// first, structural next, weather-tight before finishing, then trim, then
// outdoor. Renovation sits last because it's not part of the linear flow.

const CATEGORIES: Category[] = [
  { key: 'site-setout',          label: 'Site setout' },
  { key: 'concrete-foundations', label: 'Concrete & foundations' },
  { key: 'framing',              label: 'Framing & structure' },
  { key: 'roofing-cladding',     label: 'Roofing & cladding' },
  { key: 'doors-windows',        label: 'Doors & windows' },
  { key: 'wet-areas',            label: 'Wet areas' },
  { key: 'interior-finishing',   label: 'Interior finishing' },
  { key: 'decking-outdoor',      label: 'Decking & outdoor' },
  { key: 'renovation',           label: 'Renovation' },
];

// ─── Jobs ────────────────────────────────────────────────────────────────────
// Only jobs with `steps` are viewable; the rest render as "coming soon"
// placeholders so the library reads as intentional & growing, not empty.

const JOBS: Job[] = [
  // ─── Site setout — first thing on a bare section ─────────────────────────
  { id: 'check-boundary-setbacks', category: 'site-setout', label: 'Check setbacks from boundary pegs', summary: 'Verify title-plan offsets before you commit a single peg.' },
  { id: 'set-datum-peg',           category: 'site-setout', label: 'Set a datum peg',                    summary: 'Height reference for the whole site — protect from disturbance.' },
  { id: 'profile-boards',          category: 'site-setout', label: 'Profile boards for a foundation',    summary: 'Position, level, string-line offsets.' },
  { id: 'setout-rectangle',        category: 'site-setout', label: 'Set out a rectangular slab',         summary: '3-4-5 rule, diagonal check, string lines.' },
  { id: 'setout-lshape-slab',      category: 'site-setout', label: 'Set out an L-shape or T-shape slab', summary: 'Break into rectangles, square each, check all diagonals.' },
  { id: 'peg-foundation-corners',  category: 'site-setout', label: 'Peg foundation corners from profile boards', summary: 'Plumb from string intersections down to dig-line pegs.' },
  { id: 'setout-piles',            category: 'site-setout', label: 'Set out for concrete piles or pads', summary: 'Grid positions from profile boards, depth to good ground.' },
  { id: 'setout-garage-slab',      category: 'site-setout', label: 'Set out a garage slab with door recess', summary: 'Perimeter, door rebate, thickened edge under wall lines.' },
  { id: 'snap-wall-lines',         category: 'site-setout', label: 'Snap wall lines on a fresh slab',    summary: 'Chalk out bottom-plate positions before framing starts.' },
  { id: 'setout-driveway-falls',   category: 'site-setout', label: 'Set falls for a driveway or path',   summary: 'Long-fall, cross-fall, high point + low point pegs.' },

  // ─── Concrete & foundations ──────────────────────────────────────────────
  { id: 'setout-strip-footing', category: 'concrete-foundations', label: 'Set out for a strip footing',   summary: 'Profile boards, dig line, level.' },
  { id: 'setout-slab',          category: 'concrete-foundations', label: 'Set out a slab',                summary: 'Formwork, mesh, DPM, pour prep.' },
  { id: 'install-slab-mesh',    category: 'concrete-foundations', label: 'Install steel mesh in a slab',  summary: 'Chairs, lap, position before pour starts.' },
  { id: 'pour-screed-slab',     category: 'concrete-foundations', label: 'Pour and screed a small slab',  summary: 'Wet-edge, screed rails, bull float.' },

  // ─── Framing & structure ─────────────────────────────────────────────────
  {
    id: 'frame-internal-wall',
    category: 'framing',
    label: 'Frame an internal wall',
    summary: 'Non-load-bearing timber stud wall, floor to ceiling.',
    nz: {
      tools: [
        'Tape', 'Chalk line', 'Pencil', 'Combination square', 'Spirit level (1.8 m+)',
        'Hammer or gun', 'Circular / drop saw', 'Off-cuts for temporary bracing',
      ],
      materials: [
        '90×45 SG8 kiln-dried radiata pine (plates + studs + nogs)',
        '90×3.15 flat-head bright framing nails (or 75×3.06 gun nails)',
        'Fixings for bottom plate: 100 mm bugle screws to joists, or Dynabolt / Loxin to slab',
      ],
      steps: [
        {
          title: 'Mark the wall on the floor',
          body: 'Grab the plans, find your wall. Chalk-line the floor along where the bottom plate will sit. Measure off two known points — an external wall you\'ve confirmed straight, or a setout line from the datum peg — not adjacent framing that could be out.',
          watchFor: "Don't reference off a wall you haven't checked for plumb. New apprentices lose hours chasing an out-of-square starting line.",
        },
        {
          title: 'Cut plates',
          body: 'Cut a bottom plate to the wall length. Cut a top plate the same length — do them together so they end up identical. Use 90×45 SG8 kiln-dried radiata for both.',
          watchFor: 'If the wall butts into an existing lined wall, subtract the gib + skirting reveal off the length so your new plate finishes flush.',
        },
        {
          title: 'Mark stud positions on both plates',
          body: 'Stack the two plates edge-to-edge and mark stud centres on both at once. NZS 3604 §8 allows up to 600 mm c/c for non-loadbearing internal walls. Drop to 400 mm c/c if the wall is loadbearing, or carries a long horizontal gib join. Mark end studs first, then space the middles evenly.',
          watchFor: "Mark a 'T' for trimmers where doors go. Cutting a doorway into a wall after it's stood is a much bigger job.",
        },
        {
          title: 'Cut studs',
          body: 'Stud length = wall height − (bottom plate + top plate). For 45 mm plates under a 2.4 m stud height that\'s 2400 − 90 = 2310 mm. Cut ONE stud first, dry-fit between the plates, confirm the top plate lands right — then cut the rest.',
          watchFor: 'On renos the floor and ceiling are rarely parallel. Measure a stud at each end of the wall and taper middle studs if the run isn\'t even.',
        },
        {
          title: 'Assemble flat on the floor',
          body: 'Lay the bottom plate on the floor, studs on their marks, top plate on the far end. Nail through the plates into each stud end — 2 × 90×3.15 nails per end. Keep the wall square as you go: measure diagonals corner-to-corner; when they match, you\'re square.',
          watchFor: 'Nail from the plate INTO the stud end, not the other way around. End-grain nailing has poor pull-out and gets flagged on inspection.',
        },
        {
          title: 'Stand the wall + brace temporarily',
          body: 'Two of you to lift and stand. As soon as it\'s up, run off-cut diagonal braces from the top corners down to fixed points — the floor, existing framing, or a plate you\'ve tacked down. Don\'t let go of it until at least two braces are on.',
          watchFor: 'A 2.4 m wall is heavier than it looks. On a long wall, tie a rope to the top plate and have someone pull from above while you walk the base up.',
        },
        {
          title: 'Plumb + straighten',
          body: 'Plumb both ends with a 1.8 m level on the end studs — check both faces (in-and-out AND left-right). Sight down the top plate for straightness; adjust the temporary brace and re-nail if the middle bows.',
          watchFor: 'A 600 mm level is useless on a 2.4 m stud. Use 1.8 m minimum, or check with a spirit level at top, middle, and bottom of the same stud.',
        },
        {
          title: 'Fix the bottom plate down',
          body: 'Timber floor over joists: 100 mm bugle screws or twist-shank nails down through the plate into the joist below — hit the joist, not the ply. Concrete slab: pre-drill through the plate with a wood bit, swap to a masonry bit, sink Dynabolts or Loxins at ~900 mm c/c minimum, extra near openings.',
          watchFor: 'Random screws through the flooring ply with no joist under will pull out the first time someone leans on the wall.',
        },
        {
          title: 'Fix the top plate up',
          body: 'Nail or screw up through the top plate into the ceiling joists or trusses above. If your wall runs parallel to the joists and there\'s no joist directly over the plate, fit blocking between the joists first to catch the fixings.',
          watchFor: 'Blind-nailing into gib and hoping to catch a joist above isn\'t a fix. Snap a line on the ceiling from a known joist position, or pop a strip of gib to sight it in.',
        },
        {
          title: 'Add nogs',
          body: 'Cut and install a row of nogs between studs at roughly half wall-height (1100–1200 mm for a standard 2.4 m ceiling). Nogs stop studs twisting and give a fix for horizontal gib joins. Stagger up/down between bays so you can face-nail through the stud sides rather than end-nailing every one.',
          watchFor: 'If you\'re fixing horizontal gib sheets, position the mid-nog line at exactly the sheet join height — measure from the floor, not the ceiling.',
        },
      ],
    },
    au: {
      tools: [
        'Tape', 'Chalk line', 'Pencil', 'Combination square', 'Spirit level (1.8 m+)',
        'Hammer or gun', 'Circular / drop saw', 'Off-cuts for temporary bracing',
      ],
      materials: [
        '90×45 MGP10 pine (plates + studs + noggins) — H2-blue treated in termite zones',
        '75×3.05 gun nails or 90×3.15 flat-head bright framing nails',
        'Fixings for bottom plate: 100 mm Type 17 screws to joists, or Dynabolts / Ramset ChemSet to slab',
      ],
      steps: [
        {
          title: 'Mark the wall on the floor',
          body: 'Grab the plans, find your wall. Chalk a line on the floor where the bottom plate will sit. Measure off two known points — a checked external wall, or a setout line from the datum peg — not from framing that hasn\'t been verified square.',
          watchFor: "Don't reference off a wall you haven't checked for plumb. First-year apprentices lose hours chasing an out-of-square starting line.",
        },
        {
          title: 'Cut plates',
          body: 'Cut a bottom plate to the wall length. Cut a top plate the same length — do them together so they finish identical. 90×45 MGP10 pine for both (H2-blue in termite-management zones — check state supplement to the NCC).',
          watchFor: 'If the wall butts into a lined wall, subtract the plasterboard + skirting reveal off the length so the plate finishes flush.',
        },
        {
          title: 'Mark stud positions on both plates',
          body: 'Stack the two plates edge-to-edge and mark stud centres on both at once. AS 1684.2 tables give you max spacing by grade + load; for MGP10 non-loadbearing you\'re usually 600 mm c/c, dropped to 450 mm c/c if loadbearing or carrying long horizontal plasterboard joins. Mark end studs first, then space the middles.',
          watchFor: "Mark a 'T' for trimmers where doors go. Cutting a doorway in after the wall is up is a much bigger job.",
        },
        {
          title: 'Cut studs',
          body: 'Stud length = wall height − (bottom plate + top plate). For 45 mm plates under a 2.4 m stud height that\'s 2400 − 90 = 2310 mm. Cut ONE stud first, dry-fit between the plates, confirm the top plate lands right — then cut the rest.',
          watchFor: 'On renos the floor and ceiling are rarely parallel. Measure a stud at each end of the wall and taper middle studs if the run isn\'t even.',
        },
        {
          title: 'Assemble flat on the floor',
          body: 'Lay the bottom plate down, studs on their marks, top plate at the far end. Nail through the plates into each stud end — 2 nails per end. Keep it square as you go: measure diagonals corner-to-corner; equal diagonals = square.',
          watchFor: 'Nail from the plate INTO the stud end, not the other way. End-grain nailing has weak pull-out and gets pulled up by the certifier.',
        },
        {
          title: 'Stand the wall + brace temporarily',
          body: 'Two of you to lift. As soon as it\'s up, run diagonal off-cut braces from the top corners down to fixed points — the floor, existing framing, or a plate you\'ve tacked down. Two braces minimum before letting go.',
          watchFor: 'A 2.4 m wall is heavier than it looks. On a long wall, tie a rope to the top plate and have someone pull from above while you walk the base up.',
        },
        {
          title: 'Plumb + straighten',
          body: 'Plumb both ends with a 1.8 m level on the end studs — check both faces (in-and-out AND left-right). Sight down the top plate for straightness; adjust the brace and re-nail if the middle bows.',
          watchFor: 'A 600 mm level is useless on a 2.4 m stud. Use 1.8 m minimum, or check with a spirit level at top, middle, and bottom of the same stud.',
        },
        {
          title: 'Fix the bottom plate down',
          body: 'Timber floor over joists: 100 mm Type 17 bugle screws or twist-shank nails through the plate into the joist below — hit the joist, not the flooring. Concrete slab: pre-drill through the plate with a wood bit, swap to a masonry bit, sink Dynabolts or Ramset ChemSet at ~900 mm c/c minimum, extra near openings.',
          watchFor: 'In a termite-management area, don\'t breach the termite barrier at the slab join with un-flashed penetrations — check the barrier manufacturer\'s spec.',
        },
        {
          title: 'Fix the top plate up',
          body: 'Nail or screw up through the top plate into the ceiling joists or trusses above. If your wall runs parallel to the joists and there\'s no joist directly over the plate, fit blocking between the joists first to catch the fixings.',
          watchFor: 'Blind-nailing into plasterboard and hoping to catch a joist above isn\'t a fix. Snap a line on the ceiling from a known joist, or pop a strip of ceiling to sight it in.',
        },
        {
          title: 'Add noggins',
          body: 'Cut and install a row of noggins between studs at roughly half wall-height (1100–1200 mm for a standard 2.4 m ceiling). Noggins stop studs twisting and give a fixing line for horizontal plasterboard joins. Stagger up/down between bays so you can face-nail through the stud sides.',
          watchFor: 'If you\'re fixing horizontal plasterboard sheets, position the mid-noggin row at exactly the sheet join — measure from the floor, not the ceiling.',
        },
      ],
    },
  },
  // Rest of the framing category, roughly in build order (floor → walls → roof)
  { id: 'fit-joist-hanger',     category: 'framing', label: 'Fit a joist hanger',            summary: 'Correct nails, correct count, correct position.' },
  { id: 'frame-external-wall',  category: 'framing', label: 'Frame an external wall',        summary: 'Load-bearing wall with lintels, corner studs, and wrap.' },
  { id: 'frame-corner',         category: 'framing', label: 'Frame a corner',                summary: 'Two-stud vs three-stud corner, plate joining.' },
  { id: 'install-beam',         category: 'framing', label: 'Install a beam',                summary: 'Sit-on-post or hung-off-post, bearing rules.' },
  { id: 'frame-stair-opening',  category: 'framing', label: 'Frame a stair opening',         summary: 'Trimmers, headers, and stringer support.' },
  { id: 'cut-rafter',           category: 'framing', label: 'Cut a rafter with birdsmouth',  summary: 'Plumb cut, seat cut, tail cut on a common rafter.' },
  { id: 'install-hip-rafter',   category: 'framing', label: 'Install a hip rafter',          summary: 'Backing bevel, side cuts, tying jack rafters.' },

  // ─── Roofing & cladding — get the building weather-tight ─────────────────
  { id: 'setout-rafters',       category: 'roofing-cladding', label: 'Set out common rafters from a ridge', summary: 'Pitch, run, birdsmouth position, tail.' },
  { id: 'install-ridge-cap',    category: 'roofing-cladding', label: 'Install ridge cap',                    summary: 'Lap direction, screws vs nails, sealant.' },
  { id: 'fit-fascia-soffit',    category: 'roofing-cladding', label: 'Cut and fit fascia + soffit',         summary: 'String line, mitre corners, spouting prep.' },
  { id: 'flash-window-head',    category: 'roofing-cladding', label: 'Flash around a window head',           summary: 'Head flashing, tape, wrap laps.' },
  { id: 'lay-weatherboards',    category: 'roofing-cladding', label: 'Lay weatherboards',                    summary: 'Story rod, starter strip, laps, joins.' },
  { id: 'install-fc-sheet',     category: 'roofing-cladding', label: 'Install fibre-cement cladding',        summary: 'Sheet layout, cutting, cavity battens.' },

  // ─── Doors & windows — installed once building is weather-tight ──────────
  { id: 'install-window',       category: 'doors-windows', label: 'Install a pre-made window',       summary: 'Packing, plumbing, flashing tape, sill flashing.' },
  { id: 'hang-internal-door',   category: 'doors-windows', label: 'Hang an internal door',           summary: 'Pre-hung frame into a stud opening.' },
  { id: 'hang-door-existing',   category: 'doors-windows', label: 'Hang a door in an existing frame',summary: 'Hinges from scratch, latch mortise, margin.' },
  { id: 'fit-hinges',           category: 'doors-windows', label: 'Fit hinges from scratch',         summary: 'Marking, mortising, chiselling, hanging.' },
  { id: 'install-lockset',      category: 'doors-windows', label: 'Install a lockset',               summary: 'Bore for a tubular latch + deadbolt or handle.' },
  { id: 'install-bifold',       category: 'doors-windows', label: 'Install a bifold door',           summary: 'Track alignment, roller adjustment, gaps.' },
  { id: 'fit-sliding-door',     category: 'doors-windows', label: 'Fit a sliding door on a track',   summary: 'Head track, bottom guide, panel hanging.' },

  // ─── Wet areas — before lining is finished ───────────────────────────────
  { id: 'waterproof-shower',    category: 'wet-areas', label: 'Waterproof a shower base', summary: 'Substrate prep, membrane, fall, tape corners.' },
  { id: 'install-shower-liner', category: 'wet-areas', label: 'Install a shower liner',   summary: 'Pre-formed liner, sealant, screw pattern.' },
  { id: 'tile-setout-wall',     category: 'wet-areas', label: 'Tile setout on a wall',    summary: 'Feature course, centre-out, cut position.' },
  { id: 'fit-bathroom-vanity',  category: 'wet-areas', label: 'Fit a bathroom vanity',    summary: 'Level, wall-fixing, plumbing gap.' },

  // ─── Interior finishing — after wet areas, in fit-out order ──────────────
  { id: 'fix-plasterboard',     category: 'interior-finishing', label: 'Fix plasterboard to a wall',           summary: 'Sheet layout, screw spacing, joint prep.' },
  { id: 'install-corner-bead',  category: 'interior-finishing', label: 'Install a metal corner bead',           summary: 'External corners, tin-snip cuts, screw fixing.' },
  { id: 'stop-butt-join',       category: 'interior-finishing', label: 'Set and stop a butt join',              summary: 'Three coats, sanding, feathering.' },
  { id: 'cut-hole-gib',         category: 'interior-finishing', label: 'Cut a hole in gib for a power point',   summary: 'Template, jab saw or router, tolerance.' },
  { id: 'install-skirting',     category: 'interior-finishing', label: 'Cut and install skirting',              summary: 'Scribes vs mitres, joins, nailing pattern.' },
  { id: 'cope-corner',          category: 'interior-finishing', label: 'Cope an internal corner',               summary: 'When to cope vs mitre, coping-saw technique.' },
  { id: 'install-architrave',   category: 'interior-finishing', label: 'Cut and install architrave',            summary: 'Margins, mitre corners, punching + filling.' },

  // ─── Decking & outdoor — usually last on a new build ─────────────────────
  { id: 'setout-deck-posts',    category: 'decking-outdoor', label: 'Set out deck posts + footings',        summary: 'Profile boards, string lines, hole layout.' },
  { id: 'concrete-post-hole',   category: 'decking-outdoor', label: 'Concrete a post hole',                 summary: 'Depth, diameter, mix, standoff, curing.' },
  { id: 'install-post-anchor',  category: 'decking-outdoor', label: 'Install a post-anchor bracket',        summary: 'Chemical anchor vs bolt-down, plumb.' },
  { id: 'lay-deck',             category: 'decking-outdoor', label: 'Lay a deck (bearer → joist → boards)', summary: 'End-to-end substructure and surface.' },
  { id: 'build-retaining-wall', category: 'decking-outdoor', label: 'Build a low timber retaining wall',    summary: 'Poles, rails, drainage, geo-textile.' },
  { id: 'build-paling-fence',   category: 'decking-outdoor', label: 'Build a paling fence',                 summary: 'Post, rail, paling sequence.' },

  // ─── Renovation — off the linear build path ──────────────────────────────
  { id: 'identify-load-bearing', category: 'renovation', label: 'Identify a load-bearing wall',   summary: 'Signs, plan check, when to call an engineer.' },
  { id: 'cut-into-wall',         category: 'renovation', label: 'Cut into an existing wall',      summary: 'Locate services first, minimise damage.' },
  { id: 'patch-gib-hole',        category: 'renovation', label: 'Patch a hole in gib',            summary: 'Backer, sheet patch, three-coat stop.' },
  { id: 'replace-weatherboard',  category: 'renovation', label: 'Replace a rotten weatherboard',  summary: 'Cut-out, splice, flash, prime, install.' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function Sequencer() {
  const { settings } = useContext(SettingsContext);
  const regionKey: 'au' | 'nz' = settings.region === 'NZ' ? 'nz' : 'au';

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);

  const activeJob = activeJobId ? JOBS.find(j => j.id === activeJobId) : null;
  const activeDetail = activeJob?.[regionKey];

  // ── Job-detail view ────────────────────────────────────────────────────────
  if (activeJob && activeDetail) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <JobHeader label={activeJob.label} onBack={() => setActiveJobId(null)} />
        <div style={{ padding: '4px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: '0 4px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {activeJob.summary} · {activeDetail.steps.length} steps · Written for {settings.region}
          </p>

          <details style={cardStyle}>
            <summary style={{
              listStyle: 'none', cursor: 'pointer', outline: 'none',
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={labelStyle}>Before you start</span>
              <span style={{ fontSize: 11, color: 'var(--color-orange)', fontWeight: 500 }}>Tap to view</span>
            </summary>
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ ...labelStyle, marginBottom: 6, fontSize: 10 }}>Tools</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {activeDetail.tools.map(t => (
                    <span key={t} style={{
                      background: 'var(--color-bg)', color: 'var(--color-text)',
                      fontSize: 12, padding: '4px 10px', borderRadius: 999,
                      letterSpacing: '-0.1px',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ ...labelStyle, marginBottom: 6, fontSize: 10 }}>Materials</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {activeDetail.materials.map(m => (
                    <li key={m} style={{ fontSize: 13, color: 'var(--color-text)', letterSpacing: '-0.1px' }}>• {m}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeDetail.steps.map((step, i) => (
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
                  }}>{i + 1}</div>
                  <h3 style={{
                    margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text)',
                    letterSpacing: '-0.02em', lineHeight: 1.3, alignSelf: 'center',
                  }}>{step.title}</h3>
                </div>
                <p style={{
                  margin: '0 0 0 48px', fontSize: 13.5, color: 'var(--color-text)',
                  lineHeight: 1.55, letterSpacing: '-0.1px',
                }}>{step.body}</p>
                {step.watchFor && (
                  <div style={{
                    marginLeft: 48,
                    background: '#fff8e6', border: '0.5px solid rgba(245, 197, 66, 0.4)',
                    borderRadius: 10, padding: '10px 12px',
                  }}>
                    <p style={{
                      margin: '0 0 2px', fontSize: 10.5, fontWeight: 600,
                      color: '#7a5b00', textTransform: 'uppercase', letterSpacing: '0.14em',
                    }}>Watch for</p>
                    <p style={{ margin: 0, fontSize: 12.5, color: '#7a5b00', lineHeight: 1.5 }}>{step.watchFor}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Library view ───────────────────────────────────────────────────────────
  const readyCount = JOBS.filter(j => j[regionKey]).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Sequencer" />

      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: '0 4px 8px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
          Step-by-step guides for common jobs, written for {settings.region} practice.
          {' '}{readyCount} of {JOBS.length} ready — more added as they get written up.
        </p>

        {CATEGORIES.map(cat => {
          const catJobs = JOBS.filter(j => j.category === cat.key);
          const catReady = catJobs.filter(j => j[regionKey]).length;
          const open = openCategory === cat.key;
          return (
            <div key={cat.key} style={{ ...cardStyle, overflow: 'hidden' }}>
              <button
                onClick={() => setOpenCategory(open ? null : cat.key)}
                aria-expanded={open}
                style={{
                  width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 500, color: 'var(--color-text)',
                    letterSpacing: '-0.2px',
                  }}>{cat.label}</div>
                  <div style={{
                    marginTop: 2, fontSize: 11.5, color: 'var(--color-muted)',
                    letterSpacing: '-0.1px',
                  }}>
                    {catReady > 0
                      ? `${catReady} of ${catJobs.length} ready`
                      : `${catJobs.length} coming`}
                  </div>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {open && (
                <div style={{ borderTop: '0.5px solid var(--color-border)' }}>
                  {catJobs.map(job => {
                    const ready = !!job[regionKey];
                    return (
                      <button
                        key={job.id}
                        onClick={() => { if (ready) setActiveJobId(job.id); }}
                        disabled={!ready}
                        style={{
                          width: '100%', padding: '12px 16px',
                          background: 'none', border: 'none',
                          borderTop: '0.5px solid var(--color-border)',
                          display: 'flex', alignItems: 'center', gap: 12,
                          cursor: ready ? 'pointer' : 'default',
                          textAlign: 'left', fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13.5, fontWeight: 500,
                            color: ready ? 'var(--color-text)' : 'var(--color-muted)',
                            letterSpacing: '-0.1px',
                          }}>{job.label}</div>
                          <div style={{
                            marginTop: 2, fontSize: 11.5, color: 'var(--color-muted)',
                            letterSpacing: '-0.1px', lineHeight: 1.4,
                          }}>{job.summary}</div>
                        </div>
                        {ready ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="var(--color-orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink: 0 }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        ) : (
                          <span style={{
                            fontSize: 10, fontWeight: 500,
                            color: 'var(--color-muted)', textTransform: 'uppercase',
                            letterSpacing: '0.12em', flexShrink: 0,
                          }}>Coming</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function JobHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 'calc(env(safe-area-inset-top) + 20px) 20px 16px',
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <h1 style={{
        margin: 0, flex: 1, fontSize: 22, fontWeight: 500,
        color: 'var(--color-text)', letterSpacing: '-0.02em',
      }}>{label}</h1>
    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--color-card)',
  border: '0.5px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
};

const labelStyle: React.CSSProperties = {
  margin: 0, fontSize: 11, fontWeight: 500,
  color: 'var(--color-muted)', letterSpacing: '0.14em', textTransform: 'uppercase',
};
