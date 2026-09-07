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
  {
    id: 'check-boundary-setbacks',
    category: 'site-setout',
    label: 'Check setbacks from boundary pegs',
    summary: 'Verify title-plan offsets before you commit a single peg.',
    nz: {
      tools: ['30 m + 8 m tape', 'Marker pen + notepad', 'Current title (record of title)', 'Camera / phone', 'Sledge hammer'],
      materials: ['Fluoro spray or flagging tape', '4× marker pegs (40×40×600 H4)', 'Permanent marker'],
      steps: [
        { title: 'Pull the title + District Plan rules', body: 'Print the current record of title from LINZ or your solicitor. Pull the setback rules out of your council\'s District Plan — front, side, rear, and any recession-plane / daylight rules. Note easements marked on the title.', watchFor: 'Setbacks vary hugely by zone. Residential Suburban is usually 1–1.5 m sides; Rural could need 5 m+. Assume nothing.' },
        { title: 'Locate every boundary peg on site', body: 'NZ boundary pegs are typically iron pins with a coloured plastic cap (surveyor\'s firm code stamped on the cap), or older sites use wooden pegs. Sweep the whole perimeter — some are buried under grass, fill, or the old fence.', watchFor: 'If a peg is missing, disturbed, or you can\'t verify it, stop and get the surveyor back. Building off the wrong reference is a five-figure fix.' },
        { title: 'Verify pegs against the title dimensions', body: 'Measure between each pair of adjacent pegs and compare to the boundary lengths on the title. Anything more than about 30–50 mm off, query it before you commit.', watchFor: 'Fence lines are not boundaries — old fences drift over decades. Always measure between the actual pegs.' },
        { title: 'Apply the setback to your building line', body: 'From each boundary peg, measure inward the required setback and drop a marker peg for your building corner. Flag with fluoro so no one drives over it.', watchFor: 'The setback is usually measured to the outermost part of the building (finished cladding, eaves in some councils). Read the definitions in your District Plan — don\'t measure to the frame line.' },
        { title: 'Photograph everything before machinery arrives', body: 'Wide shots showing all four boundary pegs, your marker pegs, and a permanent reference (kerb, existing dwelling, power pole). Time-stamped.', watchFor: 'Diggers and delivery trucks flatten pegs. Your photos are the only defence if one goes missing.' },
      ],
    },
    au: {
      tools: ['30 m + 8 m tape', 'Marker pen + notepad', 'Current title + permit', 'Camera / phone', 'Sledge hammer'],
      materials: ['Fluoro spray or hi-vis flagging tape', '4× marker pegs (50×50×600 H4)', 'Permanent marker'],
      steps: [
        { title: 'Pull the title, permit, and planning overlays', body: 'Print the current title plan and your development approval. Pull setbacks from the state Planning Scheme + local council schedule. Note any overlays: bushfire (BAL), flood (LSIO), heritage (HO), tree protection.', watchFor: 'BAL zones can add setback + construction requirements on top of the standard planning setbacks. Check the permit condition sheet line by line.' },
        { title: 'Locate every survey peg on site', body: 'Surveyor pegs are usually 50×50 timber painted hi-vis pink or orange, or iron pins with a plastic cap. Sweep the whole perimeter — some get buried under fill or the old fence line.', watchFor: 'If a peg is missing, disturbed, or you can\'t verify it, stop and get the surveyor back. Building off the wrong reference is a five-figure fix.' },
        { title: 'Verify pegs against the title dimensions', body: 'Measure between each pair of adjacent pegs and compare to the boundary lengths on the title plan. Anything more than about 30–50 mm off, query it before you commit.', watchFor: 'Fence lines are not boundaries. Always measure between the actual survey pegs.' },
        { title: 'Apply the setback to your building line', body: 'From each boundary peg, measure inward the required setback and drop a marker peg for your building corner. Flag with hi-vis so no one drives over it.', watchFor: 'The setback is measured to the closest projecting wall in most schemes. Eaves and gutters may sit inside the setback — check your council\'s definition.' },
        { title: 'Photograph everything before machinery arrives', body: 'Wide shots showing all four boundary pegs, your marker pegs, and a permanent reference (kerb, existing dwelling, power pole). Time-stamped.', watchFor: 'Diggers and delivery trucks flatten pegs. Your photos are the only defence if one goes missing.' },
      ],
    },
  },
  {
    id: 'profile-boards',
    category: 'site-setout',
    label: 'Set up profile boards + peg the corners',
    summary: 'Datum peg, level rails, string lines, drop corner pegs.',
    nz: {
      tools: ['30 m tape', 'Rotary laser or dumpy level + staff', 'Spirit level', 'Sledge hammer', 'Claw hammer', 'Handsaw or drop saw', 'Plumb bob', 'Chalk line', 'Marker pen'],
      materials: ['Stakes: 50×50 H4 pointed pine, ~1.2 m (2 per corner)', 'Rails: 100×25 H3.2 pine, ~1.2 m (1 per corner)', '75×3.75 flat-head galv nails', 'Builder\'s string line (nylon)', 'Marker pegs (40×40×450 H4) for corners', 'Fluoro spray'],
      steps: [
        { title: 'Establish your datum', body: 'Transfer a height reference onto site from a permanent mark — a footpath kerb, LINZ benchmark, or a nail in a neighbour\'s driveway that won\'t move. Drive a solid datum peg somewhere it won\'t be disturbed and record its RL.', watchFor: 'The datum runs the whole project. If it moves, every level after it is wrong. Fence it off or paint it hi-vis.' },
        { title: 'Position profile stakes clear of the corners', body: 'Drive two stakes per corner, ~1.5 m clear of the actual building corner, roughly on the extended line of each wall. Keeps them out of the way of the digger and formwork.', watchFor: 'If stakes are too close, the excavator will knock them out on day one. Give yourself elbow room.' },
        { title: 'Nail level rails at datum height', body: 'Set the laser (or dumpy) up on the datum and shoot each stake pair. Nail a 100×25 rail across each pair at exact datum height + your chosen offset (e.g. datum + 900 mm = future FFL).', watchFor: 'Get every rail to the same height. Sight along them at the end — if one looks off, re-shoot before you pull strings.' },
        { title: 'Pull string lines between opposite rails', body: 'Mark the wall centreline on each rail with a nail. Run string between opposite nails — the string is now your wall line, floating at datum height above the ground.', watchFor: 'Nylon builder\'s string sags. Tension it hard, and use masonry line for spans over 15 m.' },
        { title: 'Square the strings', body: '3-4-5 method: mark 3 m on one string, 4 m on the perpendicular; the diagonal must be exactly 5 m. Or measure both diagonals of the rectangle — they match when it\'s square.', watchFor: 'Squaring off a short leg (3 m diagonal check) is less accurate than off a long one. Scale up — 6-8-10, or 9-12-15 — for a big footprint.' },
        { title: 'Peg the corners with a plumb bob', body: 'Where two strings cross, drop a plumb bob to the ground and drive a marker peg dead under it. Nail into the top of the peg — that nail head is your true corner.', watchFor: 'Wind blows plumb bobs sideways. Do it early morning, or shelter it with a bucket.' },
        { title: 'Label + protect the profiles', body: 'Number each profile (P1, P2…), mark the wall line and stake orientation on the rail with permanent marker. Take wide-angle photos before the digger turns up.', watchFor: 'If a profile gets bumped, you can re-establish it from the marks + photos. Without them, you\'re resetting from scratch.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Rotary laser or dumpy level + staff', 'Spirit level', 'Sledge hammer', 'Claw hammer', 'Handsaw or drop saw', 'Plumb bob', 'Chalk line', 'Marker pen'],
      materials: ['Stakes: 50×50 H4 pointed pine, ~1.2 m (2 per corner)', 'Rails: 100×25 H3-treated pine, ~1.2 m (1 per corner)', '75×3.75 flat-head galv nails', 'Builder\'s string line (nylon)', 'Marker pegs (50×50×450 H4) for corners', 'Fluoro spray'],
      steps: [
        { title: 'Establish your datum', body: 'Transfer a height reference onto site from a permanent mark — kerb crossover, PSM (Permanent Survey Mark) if one\'s nearby, or a nail in a neighbour\'s driveway. Drive a solid datum peg somewhere it won\'t move and record its RL against your permit\'s FFL.', watchFor: 'The datum runs the whole project. If it moves, every level after it is wrong. Fence it off or paint it hi-vis.' },
        { title: 'Position profile stakes clear of the corners', body: 'Drive two stakes per corner, ~1.5 m clear of the actual building corner, roughly on the extended line of each wall. Keeps them clear of the excavator and formwork.', watchFor: 'If stakes are too close, the excavator will knock them on day one. Give yourself elbow room.' },
        { title: 'Nail level rails at datum height', body: 'Set the laser (or dumpy) up on the datum and shoot each stake pair. Nail a 100×25 rail across each pair at datum + your chosen offset (e.g. datum + 900 mm = future FFL).', watchFor: 'Get every rail to the same height. Sight along them at the end — if one looks off, re-shoot before you pull strings.' },
        { title: 'Pull string lines between opposite rails', body: 'Mark the wall centreline on each rail with a nail. Run string between opposite nails — the string is your wall line, floating at datum height above the ground.', watchFor: 'Nylon builder\'s string sags. Tension it hard, and use masonry line for spans over 15 m.' },
        { title: 'Square the strings', body: '3-4-5 method: mark 3 m on one string, 4 m on the perpendicular; the diagonal must be exactly 5 m. Or measure both diagonals of the rectangle — they match when it\'s square.', watchFor: 'Scale the check to suit the footprint. On a big slab, use 6-8-10 or 9-12-15 for far better accuracy than 3-4-5.' },
        { title: 'Peg the corners with a plumb bob', body: 'Where two strings cross, drop a plumb bob to the ground and drive a marker peg dead under it. Nail into the top of the peg — that nail head is your true corner.', watchFor: 'Wind blows plumb bobs sideways. Do it early morning, or shelter it with a bucket.' },
        { title: 'Label + protect the profiles', body: 'Number each profile (P1, P2…), mark the wall line and stake orientation on the rail with permanent marker. Take wide-angle photos before machinery arrives.', watchFor: 'If a profile gets bumped, you can re-establish it from the marks + photos. Without them, you\'re resetting from scratch.' },
      ],
    },
  },
  {
    id: 'setout-slab',
    category: 'site-setout',
    label: 'Set out a slab (rectangle, L, or T)',
    summary: '3-4-5 rule, diagonal check, break L / T into rectangles.',
    nz: {
      tools: ['30 m tape', 'Rotary laser or dumpy', 'Spirit level', 'Sledge + claw hammer', 'Handsaw', 'Plumb bob', 'Chalk line', 'Calculator'],
      materials: ['Profile stakes + rails (see profile-boards job)', 'Builder\'s string, marker pegs, fluoro spray', 'Permanent marker'],
      steps: [
        { title: 'Pull the slab dimensions off the plan', body: 'Get the overall length + width, then note any offsets. For an L or T, mark the corner where the two rectangles meet — you\'ll set that up as your control corner.', watchFor: 'Plans dimension to the outside of the slab, but confirm — some architects dimension to grid or centreline. If in doubt, ask.' },
        { title: 'Set the first (longest) rectangle', body: 'Establish profile boards + strings for the biggest rectangle first, as per the profile-boards job. Square it with 3-4-5 (or larger — 9-12-15). Diagonals must match to within 3–5 mm on a residential footprint.', watchFor: 'Squaring the biggest rectangle first means any error is smallest. Squaring an L off a short leg first amplifies error into the long leg.' },
        { title: 'Extend one wall line for the second rectangle', body: 'For L or T shapes, pick a wall of the first rectangle that continues into the second. Extend that string past the shared corner — the second rectangle sits on that line.', watchFor: 'The extended string must be dead straight. Sight down it; even 5 mm sideways at the joint means the two rectangles won\'t align.' },
        { title: 'Set the second rectangle off the extended line', body: 'Drive new profile stakes for the second rectangle. Set one wall along the extended string; run the perpendicular walls out square using 3-4-5 or the diagonal-match method.', watchFor: 'Check the diagonals of the second rectangle too — square-off-square is not automatic.' },
        { title: 'Verify the whole footprint', body: 'Measure every external wall length against the plan. Measure both overall diagonals of the bounding rectangle (as if the L were completed to a rectangle). Any wall > 10 mm off, or diagonals differing by > 10 mm, redo it.', watchFor: 'It\'s much cheaper to correct now than after the digger has trenched the wrong shape.' },
        { title: 'Peg the corners + label', body: 'Plumb-bob every intersection down to a marker peg. Label each corner (C1, C2…) with permanent marker on the peg + a photo. Note the RL of the future FFL on each rail.', watchFor: 'On an L or T, the reflex corner (where the two rectangles meet) is the most-checked point on site. Peg it heavy and paint it hi-vis.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Rotary laser or dumpy', 'Spirit level', 'Sledge + claw hammer', 'Handsaw', 'Plumb bob', 'Chalk line', 'Calculator'],
      materials: ['Profile stakes + rails (see profile-boards job)', 'Builder\'s string, marker pegs, fluoro spray', 'Permanent marker'],
      steps: [
        { title: 'Pull the slab dimensions off the plan', body: 'Get overall length + width, then note offsets. For an L or T, mark the reflex corner where the two rectangles meet — that becomes your control corner. Cross-check against the engineer\'s slab drawing (edge beams, thickenings).', watchFor: 'Plans usually dimension to the outside of the slab, but confirm — some drawings dimension to grid or centreline. Ask if unclear.' },
        { title: 'Set the first (longest) rectangle', body: 'Establish profiles + strings for the biggest rectangle first, per the profile-boards job. Square it with 3-4-5 or larger. Diagonals must match to within 3–5 mm on a residential footprint.', watchFor: 'Squaring the biggest rectangle first keeps the error small. Squaring an L off the short leg amplifies error into the long leg.' },
        { title: 'Extend one wall line for the second rectangle', body: 'Pick a wall of the first rectangle that continues into the second. Extend that string past the shared corner — the second rectangle sits on that line.', watchFor: 'The extended string must be dead straight. Sight down it; 5 mm sideways at the joint means the two rectangles won\'t align.' },
        { title: 'Set the second rectangle off the extended line', body: 'Drive new profile stakes for the second rectangle. Set one wall along the extended string; run the perpendicular walls out square using 3-4-5 or the diagonal-match method.', watchFor: 'Check the diagonals of the second rectangle too. Square-off-square is not automatic.' },
        { title: 'Verify the whole footprint', body: 'Measure every external wall length against the plan. Measure both overall diagonals of the bounding rectangle. Any wall > 10 mm off, or diagonals differing by > 10 mm, redo it.', watchFor: 'It\'s much cheaper to correct now than after the excavator has trenched the wrong shape.' },
        { title: 'Peg the corners + label', body: 'Plumb-bob every intersection down to a marker peg. Label each corner (C1, C2…) with permanent marker + photo. Note the FFL RL on each rail so the concreter can shoot heights straight off the profile.', watchFor: 'On an L or T, the reflex corner is the most-checked point on site. Peg it heavy and paint it hi-vis.' },
      ],
    },
  },
  {
    id: 'setout-piles',
    category: 'site-setout',
    label: 'Set out for piles or pier pads',
    summary: 'Grid positions from profile boards, depth to good ground.',
    nz: {
      tools: ['30 m + 5 m tape', 'Dumpy or laser + staff', 'Plumb bob', 'Sledge + claw hammer', 'Marker pen', 'Spray can'],
      materials: ['Marker pegs (40×40×600 H4) — one per pile', 'Fluoro spray or flagging tape', 'Foundation plan + pile schedule (engineer\'s)'],
      steps: [
        { title: 'Read the pile schedule + foundation plan', body: 'Pull the engineer\'s pile positions, diameters, depths, and any raft / driven / bored pile call-outs. Note piles that carry point loads (beam ends, wall corners) — those are the ones you cannot move.', watchFor: 'NZS 3604 §5 allows a lot of pile layouts, but if the engineer has specified a schedule you follow it exactly. Any change needs their sign-off.' },
        { title: 'Set up profile boards on the perimeter', body: 'Establish profiles + strings around the building footprint (per the profile-boards job). Piles will be measured off those strings, so they need to be dead accurate before you start.', watchFor: 'On sloping ground, transfer the string height off the datum so all piles reference the same RL.' },
        { title: 'Mark pile positions on the strings', body: 'From a corner, measure the pile spacing along each string and hang a peg or bright tape at each pile centreline. Do all one direction, then all the other, so you get a grid of intersections in the air.', watchFor: 'Piles under beams need to line up under the beam line, not the wall centreline. Read the plan carefully — they\'re not always the same.' },
        { title: 'Plumb each intersection to a marker peg', body: 'Drop the plumb bob at every string intersection and drive a marker peg dead under it. Nail into the peg top, spray a bright dot around it. That\'s your dig target for the auger.', watchFor: 'On a windy day, plumb-bob positions wander. Use a plumbing rod (or a hollow plumb) if you\'re fussy about accuracy.' },
        { title: 'Confirm depth-to-good-ground per pile', body: 'The engineer\'s pile depth is a starting point — actual depth is often set on the day by the driller / auger operator when they hit competent ground. Have the geotech / engineer\'s inspection number handy.', watchFor: 'If the driller stops short of the specified depth because "it feels solid", that\'s not your call — get the engineer to confirm.' },
        { title: 'Set out temporary pile-top RL marks', body: 'Once holes are dug, transfer FFL RL onto a batter stake next to each pile so the concreter can screed the top of each pile / pier to the right level.', watchFor: 'Pile tops that are too low mean packing later; too high means grinding. Aim for -3 to 0 mm off target.' },
      ],
    },
    au: {
      tools: ['30 m + 5 m tape', 'Dumpy or laser + staff', 'Plumb bob', 'Sledge + claw hammer', 'Marker pen', 'Spray can'],
      materials: ['Marker pegs (50×50×600 H4) — one per pile', 'Fluoro spray or flagging tape', 'Engineer\'s footing plan + pile schedule'],
      steps: [
        { title: 'Read the pile schedule + footing plan', body: 'Pull the engineer\'s pile / pier positions, diameters, depths, and any bored / screw / driven call-outs. Reference the site classification (M, H1, H2, E, P per AS 2870) — that drives the design depth.', watchFor: 'On a reactive-clay site (H1/H2/E) the engineer usually specifies depth to founding layer, not a fixed number. Follow the drilling log, not a metre mark.' },
        { title: 'Set up profile boards on the perimeter', body: 'Establish profiles + strings around the building footprint (per the profile-boards job). Piers get measured off those strings, so they must be accurate before you drop a single peg.', watchFor: 'On sloping ground, transfer the string height off the datum so all piers reference the same RL.' },
        { title: 'Mark pier positions on the strings', body: 'From a corner, measure the pier spacing along each string and hang a peg or bright tape at each pier centreline. Do all one direction, then all the other — you\'ll have a grid of intersections in the air.', watchFor: 'Piers under bearers need to line up under the bearer line, not the wall centreline. Read the plan carefully.' },
        { title: 'Plumb each intersection to a marker peg', body: 'Drop the plumb bob at every string intersection and drive a marker peg dead under it. Nail the peg top, spray a bright dot around it — that\'s the drill target for the auger operator.', watchFor: 'On windy days plumb positions wander. Use a plumbing rod or hollow plumb if you\'re fussy about accuracy.' },
        { title: 'Verify depth to founding layer per pier', body: 'On a Class H, E, or P site the design depth may be nominal — the operator confirms when they hit competent material. Have the engineer\'s inspection contact ready before the drill starts.', watchFor: 'If the driller stops short because "it feels solid", it\'s not your call. Engineer confirms every hole on reactive-soil sites.' },
        { title: 'Mark pier-top RLs on batter stakes', body: 'Once holes are drilled, transfer FFL RL to a batter stake next to each pier so the concreter can screed the pier top to level.', watchFor: 'Pier tops too low = packing later; too high = grinding. Aim for -3 to 0 mm off target.' },
      ],
    },
  },
  {
    id: 'snap-wall-lines',
    category: 'site-setout',
    label: 'Snap wall lines on a fresh slab',
    summary: 'Chalk out bottom-plate positions before framing starts.',
    nz: {
      tools: ['30 m tape', 'Chalk line (blue chalk for permanent, red for temporary)', 'Marker pen or crayon', 'Combination square', 'Broom', 'Spirit level'],
      materials: ['Chalk refill', 'Framing plan'],
      steps: [
        { title: 'Sweep the slab clean', body: 'Chalk lines are useless on a dusty or wet slab. Sweep the whole area, especially where lines will run. If the slab has any curing compound residue, scrub it — chalk won\'t bite through it.', watchFor: 'Red chalk barely shows on a wet or green slab. Wait until the surface is dry to the touch, or use blue.' },
        { title: 'Re-establish two reference sides', body: 'Pick two adjacent external walls that are dead-square to each other — usually the ones you set up first from profiles. Snap those first, then everything else keys off them.', watchFor: 'If the slab dimensions don\'t match your setout (a poured slab has typical +/- 10 mm tolerance), work off the outside face of the slab, not the setout string.' },
        { title: 'Mark bottom-plate faces, not centrelines', body: 'For a 90 mm frame, snap the outside face of the plate. Some crews snap both faces (a 90 mm gap between two parallel lines) so studs sit visually inside the tramlines.', watchFor: 'Don\'t snap wall centrelines. Framers will end up guessing which side of the line the plate sits — always mark the face.' },
        { title: 'Snap internal walls off the externals', body: 'Measure from an established external wall to each internal wall, snap the face. Number or label each wall on the slab with a crayon (W1, W2…) that matches the framing plan.', watchFor: 'Double-check any wall that carries a door — snap the opening positions too, so the framer doesn\'t have to figure it out later.' },
        { title: 'Mark studs at wall junctions + openings', body: 'Where an internal wall lands on an external, mark the corner stud position. At each door / window, mark the trimmer + jack positions so the framer knows the stud line at a glance.', watchFor: 'Missing junction marks are the #1 cause of a framer stopping to grab you for a decision. A five-minute crayon session saves a half-hour phone call later.' },
        { title: 'Check every internal dimension one more time', body: 'Walk the slab with the framing plan. Measure every room from opposite walls; compare to plan. Any wall off by more than 5 mm gets re-snapped now, not after the plates are down.', watchFor: 'A 10 mm error grows fast — by the time the door lining goes in, it\'s a 20 mm reveal on one side and 0 mm on the other.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Chalk line (blue for permanent, red for temporary)', 'Marker pen or crayon', 'Combination square', 'Broom', 'Spirit level'],
      materials: ['Chalk refill', 'Framing plan'],
      steps: [
        { title: 'Sweep the slab clean', body: 'Chalk lines are useless on a dusty or wet slab. Sweep the whole area, especially where lines will run. Curing compound residue kills chalk — scrub it off if present.', watchFor: 'Red chalk barely shows on a green slab. Wait until the surface is dry to the touch, or use blue.' },
        { title: 'Re-establish two reference sides', body: 'Pick two adjacent external walls that are dead-square to each other. Snap those first, then everything else keys off them.', watchFor: 'If the poured slab is +/- off setout (typical is 10 mm), work off the actual outside face of the slab, not the original string.' },
        { title: 'Mark bottom-plate faces, not centrelines', body: 'For a 90 mm frame, snap the outside face of the plate. Some crews snap both faces (90 mm apart) so studs sit visually inside the tramlines.', watchFor: 'Don\'t snap centrelines. Framers guess which side the plate sits — always mark the face.' },
        { title: 'Snap internal walls off the externals', body: 'Measure from an established external wall to each internal wall, snap the face. Label each wall with a crayon (W1, W2…) matching the framing plan.', watchFor: 'On a wall that carries a door, snap the opening positions too so the framer doesn\'t have to work it out.' },
        { title: 'Mark studs at wall junctions + openings', body: 'Where an internal wall lands on an external, mark the corner stud. At each door / window, mark trimmer + jack positions so the framer sees the stud line at a glance.', watchFor: 'Missing junction marks are the #1 reason a framer stops to grab you. A five-minute crayon session saves a half-hour phone call.' },
        { title: 'Check every internal dimension', body: 'Walk the slab with the framing plan. Measure every room from opposite walls; compare to plan. Any wall off by more than 5 mm gets re-snapped before plates are fixed.', watchFor: 'A 10 mm error grows fast — by the time architraves go on, it\'s 20 mm reveal one side and 0 mm the other.' },
      ],
    },
  },
  {
    id: 'setout-driveway-falls',
    category: 'site-setout',
    label: 'Set falls for a driveway or path',
    summary: 'Long-fall, cross-fall, high point + low point pegs.',
    nz: {
      tools: ['30 m tape', 'Rotary laser or dumpy + staff', 'Sledge + claw hammer', 'Spirit level', 'String line', 'Marker pen'],
      materials: ['Marker pegs (50×50×450 H4) — one every 3–5 m', 'Fluoro spray', 'Site drainage plan'],
      steps: [
        { title: 'Find high + low points from the plan', body: 'Read the site plan or drainage plan for the driveway high point (usually near the garage) and low point (usually the street / soak-hole). Minimum fall for concrete paths is around 1 in 100 (1%) to shed water; driveways typically 1 in 60 to 1 in 80.', watchFor: 'Cross-fall must direct water AWAY from the house. If the plan doesn\'t call out which way, ask — a driveway that drains toward the garage floor is a callback waiting to happen.' },
        { title: 'Set the datum + calculate total fall', body: 'Shoot the RL at both ends. Total fall = length × grade. E.g. a 20 m driveway at 1:80 needs 250 mm total fall. Compare that to the RL difference on the ground — if the site slope is already steeper than the target, you may need step-downs.', watchFor: 'If your calculated fall is less than the existing ground slope, you\'ll be cutting deep at the top or building up at the bottom — cost implications, discuss with client first.' },
        { title: 'Peg the high point + low point', body: 'Drive a substantial peg at each end. Nail the finished surface height into each peg (from your RLs). Paint them hi-vis.', watchFor: 'The peg heights are the FINISHED concrete surface, not the sub-base. Note it clearly — writing "FSL" on the peg avoids confusion.' },
        { title: 'Set intermediate pegs every 3–5 m', body: 'Run a string between the two end pegs. Drive intermediate pegs along the line and nail each one at string height. Straight-run driveway: string sags — check every peg with the laser too, don\'t trust the string alone over 15 m.', watchFor: 'A sagging string will give you a low spot in the middle. Cross-check with the laser or you\'ll find a puddle there in the first rain.' },
        { title: 'Set cross-fall on both edges', body: 'From each centreline peg, measure the driveway width and drop a peg on each edge. Set the low edge lower than the high edge by (width × cross-fall). E.g. a 3.5 m wide driveway with 1:50 cross-fall needs 70 mm drop across.', watchFor: 'Cross-fall usually falls toward the property side away from the neighbour\'s boundary — check for any fence-line drainage swale that has to catch the water.' },
        { title: 'Confirm the falls read visually', body: 'Once all pegs are in, sight down the driveway from the low end. You should see a clean, consistent slope — no bumps or dips. Water will find them, so fix any wobble now.', watchFor: 'Any low spot between pegs holds water. If your pegs are 5 m apart and the ground dips 20 mm in between, add an intermediate peg.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Rotary laser or dumpy + staff', 'Sledge + claw hammer', 'Spirit level', 'String line', 'Marker pen'],
      materials: ['Marker pegs (50×50×450 H4) — one every 3–5 m', 'Fluoro spray', 'Site drainage plan + council stormwater conditions'],
      steps: [
        { title: 'Find high + low points from the plan', body: 'Read the site + drainage plan for the driveway high point (usually near the garage) and low point (street kerb / infiltration pit). Minimum fall for concrete paths is around 1 in 100 (1%) to shed water; driveways typically 1 in 60 to 1 in 80. Some councils specify a maximum grade (often 1 in 4 = 25%) for vehicle access — check.', watchFor: 'Cross-fall must direct water AWAY from the house. If not called out on the plan, ask — a driveway draining to the garage floor is a callback waiting to happen.' },
        { title: 'Set the datum + calculate total fall', body: 'Shoot RLs at both ends. Total fall = length × grade. E.g. a 20 m driveway at 1:80 needs 250 mm total fall. Compare to the actual RL difference on ground — if site slope is steeper than target, step-downs may be needed.', watchFor: 'If calculated fall is less than the existing slope, you\'re cutting deep up top or building up at the bottom — cost impact, flag with the client before pouring.' },
        { title: 'Peg the high point + low point', body: 'Drive substantial pegs at each end. Nail the finished surface height into each peg (from your RLs). Paint them hi-vis.', watchFor: 'The peg heights are the FINISHED concrete surface, not the sub-base. Write "FSL" on the peg to avoid confusion at pour day.' },
        { title: 'Set intermediate pegs every 3–5 m', body: 'Run a string between the two end pegs. Drive intermediate pegs and nail each at string height. On runs over 15 m, verify each intermediate with the laser too — string sags.', watchFor: 'A sagging string gives you a low spot mid-driveway. Cross-check with the laser or you\'ll find a puddle there in the first rain.' },
        { title: 'Set cross-fall on both edges', body: 'From each centreline peg, measure the driveway width and drop a peg on each edge. Set the low edge lower by (width × cross-fall). E.g. 3.5 m wide × 1:50 cross-fall = 70 mm drop across.', watchFor: 'Cross-fall usually goes toward the property side away from the boundary — but confirm with any council stormwater condition on your permit.' },
        { title: 'Confirm the falls read visually', body: 'Once all pegs are in, sight down the driveway from the low end. Clean consistent slope, no bumps or dips. Water finds every one, so fix wobble now.', watchFor: 'Any low spot between pegs holds water. If pegs are 5 m apart and the ground dips 20 mm between them, add an intermediate peg.' },
      ],
    },
  },

  // ─── Concrete & foundations ──────────────────────────────────────────────
  {
    id: 'excavate-strip-footing',
    category: 'concrete-foundations',
    label: 'Excavate for a strip footing',
    summary: 'Trench line, depth to good ground, base level.',
    nz: {
      tools: ['30 m tape', 'Laser or dumpy level + staff', 'Spirit level', 'Long-handled shovel', 'Square-mouth spade', 'Wheelbarrow', 'Sledge hammer', 'Marker pen'],
      materials: ['Fluoro spray or lime line', 'Marker pegs (40×40×450)', 'Timber scraps for founding tests (if hand-digging)'],
      steps: [
        { title: 'Read footing size + depth off the plan', body: 'Get the trench width, depth, and any step-downs from the engineer\'s foundation plan. Standard NZS 3604 §5 footings are 300×200 for a single-storey light-frame, deeper for two-storey or bad ground.', watchFor: 'A specific engineer\'s footing overrides NZS 3604 defaults. If the plan says 400 deep, that\'s 400 — don\'t assume 200 will do.' },
        { title: 'Mark the trench line on ground', body: 'From the profile board strings, transfer the outside face of the footing to the ground with fluoro spray. Add a second line for the inside face (footing width offset). Fluoro both lines the full run.', watchFor: 'Spray a line that\'s slightly wider than the footing (~50 mm each side) so the digger operator has room to work without dropping the bucket exactly on the mark.' },
        { title: 'Excavate to depth', body: 'Mini-digger for anything over ~5 m of trench; shovel + spade by hand for smaller work. Dig in one pass — trying to "level up later" from a rough dig wastes time.', watchFor: 'Call before you dig. Underground services (water, sewer, electrical, comms) are not always where the plan says.' },
        { title: 'Level the base', body: 'Set the laser on the datum and shoot the bottom of the trench at each end and every 2–3 m along. Trim high spots with a spade; fill any low spots with compacted crushed hardfill, not loose soil.', watchFor: 'A soft or uneven base under a footing = differential settlement = cracks in the wall above. Don\'t skip this step.' },
        { title: 'Check for good ground', body: 'Push a piece of 4×2 timber into the base. If it goes in easily, the ground isn\'t bearing — dig deeper until you hit competent material. On uncertain sites (fill, wet clay, peat), get the engineer or geotech to inspect before you pour.', watchFor: 'NZ has a lot of surface fill from old sites and reclamation. If the base feels spongy or you find debris, stop and get someone to look at it.' },
        { title: 'Clean out the trench', body: 'Shovel out any collapsed material, loose crumbs, or water pooling in the base. The trench should be clean and dry when the concrete goes in.', watchFor: 'Water in the trench dilutes the concrete at the base and weakens the footing. If it\'s wet, pump it out or postpone the pour.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Laser or dumpy level + staff', 'Spirit level', 'Long-handled shovel', 'Square-mouth spade', 'Wheelbarrow', 'Sledge hammer', 'Marker pen'],
      materials: ['Fluoro spray or lime line', 'Marker pegs (50×50×450)', 'Timber scraps for founding tests'],
      steps: [
        { title: 'Read footing size + depth off the engineer\'s plan', body: 'Get trench width, depth, and step-downs off the engineer\'s footing plan. AS 2870 site classification (M, H1, H2, E, P) drives the design — a Class H clay may need 900+ deep footings; a Class A site much less.', watchFor: 'On a Class H, E, or P site you follow the engineer\'s design exactly. Standard footings from the NCC deemed-to-satisfy tables only apply to Class A and S.' },
        { title: 'Mark the trench line on ground', body: 'From the profile board strings, transfer the outside face of the footing to the ground with fluoro spray. Add a second line for the inside face. Fluoro both lines the full run.', watchFor: 'Spray a line slightly wider than the footing (~50 mm each side) so the operator has room to work without dropping the bucket exactly on the mark.' },
        { title: 'Excavate to depth', body: 'Mini-excavator for anything over ~5 m of trench; shovel + spade by hand for smaller work. Dig in one pass — trying to "level up later" wastes time.', watchFor: 'Dial Before You Dig. Underground services aren\'t always where the plan says, and the DBYD ticket is your legal cover if you hit something.' },
        { title: 'Level the base', body: 'Set the laser on the datum and shoot the trench base at each end and every 2–3 m along. Trim high spots with a spade; fill low spots with compacted crushed rock (not loose soil).', watchFor: 'A soft or uneven base under a footing = differential settlement = cracks in the wall above. Don\'t skip this.' },
        { title: 'Check for competent founding + termite prep', body: 'Push a piece of 90×45 into the base. If it goes in easy, dig deeper. In termite-management zones, the engineer\'s design may require the trench base to allow a Type A physical barrier or chemical treatment — coordinate with the barrier installer before pouring.', watchFor: 'On Class E / P sites, engineer\'s inspection of the trench base is mandatory before pour. Book it before you\'re ready to pour, not on the day.' },
        { title: 'Clean out the trench', body: 'Shovel out collapsed material, crumbs, or pooled water. The trench must be clean and dry at pour time.', watchFor: 'Water in the base dilutes the concrete and weakens the footing. Pump out or postpone if it\'s wet.' },
      ],
    },
  },
  {
    id: 'formwork-slab',
    category: 'concrete-foundations',
    label: 'Build formwork for a slab',
    summary: 'Boxing, stakes, bracing, set to FFL.',
    nz: {
      tools: ['Drop saw or handsaw', 'Cordless drill / impact driver', 'Sledge hammer', 'Hammer', 'Laser or dumpy + staff', 'Spirit level (1.8 m+)', 'String line', 'Tape', 'Combination square'],
      materials: ['Boxing timber: 200×50 or 300×50 H3.2 pine (perimeter)', 'Stakes: 50×50 H4 pointed pine, 600 long, one every 600–900 mm', '75 mm bugle screws (formwork to stakes)', '90 mm framing nails or duplex nails (bracing)', 'Timber off-cuts for bracing', 'Formwork release oil (Sika Formshield or similar) — do NOT use diesel or engine oil'],
      steps: [
        { title: 'Snap the slab perimeter onto the sub-base', body: 'From the profile board strings, transfer the outside face of the slab to the ground. Mark corners with pegs, run a string between them to guide the boxing.', watchFor: 'The boxing sits AT the outside face — don\'t position it beyond the string, or you\'ll pour a bigger slab than the plans call for.' },
        { title: 'Cut boxing to the slab dimensions', body: 'Cut 200×50 (for 150 slab + edge thickening) or 300×50 (for deeper edge beams) to the wall lengths. Cut mitres or butt-joins for corners — mitres seal better but butt-joins are fine for temporary work.', watchFor: 'Boxing height = slab thickness + any turn-up above final ground level. Getting it wrong here means the slab pours to the wrong FFL.' },
        { title: 'Drive stakes on the outside every 600–900 mm', body: 'Sledge H4 stakes into the ground on the OUTSIDE of the boxing line, spaced 600–900 mm apart. Extra stakes at corners, at any joins, and either side of edge-beam step-downs.', watchFor: 'Stakes hold back a lot of wet-concrete pressure. Space them tighter (500 mm) on any run where the slab is deeper than 200 mm, or the boxing will bow out during pour.' },
        { title: 'Fix boxing to stakes at FFL', body: 'Shoot the top of the boxing to the FFL RL using the laser. Screw or nail the boxing to each stake with bugle screws — better than nails for stripping later. Check level along the top with a long spirit level every couple of metres.', watchFor: 'A dip in the top of the boxing = a dip in the finished slab. Sight along the top after fixing; anything that reads out, undo the screw and reset.' },
        { title: 'Brace externally + corners', body: 'Add diagonal timber braces from the top of the boxing back to a peg driven further out (or nailed to an adjacent stake). Every 2–3 m, plus at every corner. Corners get a double brace.', watchFor: 'Corners blow out first. If a corner isn\'t braced solid, the wet concrete will push it open 20–30 mm and you\'ll have a bulge in your slab edge.' },
        { title: 'Check diagonals, straightness, and level', body: 'Measure the diagonals of the slab — must match. Sight down every edge for straightness — kink any bowed boards with a wedge / stake. Laser-check the top RL at every corner + middle of every long run.', watchFor: 'Once you tick this off, the boxing is signed off for pour. Any tweak after mesh is in the way is 3× harder — get it right now.' },
        { title: 'Seal joins + apply release', body: 'Silicone or expanding foam over any gap between boxing pieces at corners / joins — otherwise concrete cream leaks out and you get a rough edge. Brush a proprietary formwork release oil on the inside face of the boxing so it strips cleanly.', watchFor: 'Don\'t use diesel or engine oil as release — both stain the concrete + leave residue + are a pollution issue on site. Buy proper release; it\'s cheap.' },
      ],
    },
    au: {
      tools: ['Drop saw or handsaw', 'Cordless drill / impact driver', 'Sledge hammer', 'Hammer', 'Laser or dumpy + staff', 'Spirit level (1.8 m+)', 'String line', 'Tape', 'Combination square'],
      materials: ['Boxing timber: 200×50 or 300×50 H3-treated pine (perimeter)', 'Stakes: 50×50 H4 pointed pine, 600 long, one every 600–900 mm', '75 mm Type 17 screws (formwork to stakes)', '90 mm framing nails or duplex nails (bracing)', 'Timber off-cuts for bracing', 'Formwork release agent'],
      steps: [
        { title: 'Snap the slab perimeter onto the sub-base', body: 'From profile board strings, transfer the outside face of the slab to the ground. Mark corners with pegs, run a string between to guide the boxing line.', watchFor: 'Boxing sits AT the outside face. Position it beyond the string and you\'ll pour a bigger slab than the plans call for.' },
        { title: 'Cut boxing to the slab dimensions', body: 'Cut 200×50 (150 slab + edge thickening) or 300×50 (deeper edge beams) to the wall lengths. Mitred or butt-joined corners — mitres seal better but butt-joins are fine short-term.', watchFor: 'Boxing height = slab thickness + turn-up above ground level. Wrong here = wrong FFL, wrong everything above.' },
        { title: 'Drive stakes on the outside every 600–900 mm', body: 'Sledge H4 stakes into the ground OUTSIDE the boxing line, spaced 600–900 mm apart. Extra stakes at corners, at joins, and either side of edge-beam step-downs.', watchFor: 'Wet concrete puts significant lateral pressure on the boxing. Space stakes at 500 mm on runs where the slab is deeper than 200 mm.' },
        { title: 'Fix boxing to stakes at FFL', body: 'Shoot the top of the boxing to FFL RL with the laser. Screw the boxing to each stake with Type 17s — better than nails for stripping. Check level along the top with a long spirit level every couple of metres.', watchFor: 'A dip in the boxing top = a dip in the slab. Sight along after fixing; anything out, undo the screw and reset.' },
        { title: 'Brace externally + corners', body: 'Diagonal timber braces from the top of the boxing back to a peg further out (or to an adjacent stake). Every 2–3 m, plus every corner. Corners get double braces.', watchFor: 'Corners blow out first. If unbraced, wet concrete pushes them open 20–30 mm and the slab edge bulges.' },
        { title: 'Check diagonals, straightness, and level', body: 'Measure diagonals — must match. Sight every edge for straightness — kink any bow with a wedge. Laser-check top RL at every corner + middle of every long run.', watchFor: 'Once ticked off, the boxing is signed off for pour. Post-mesh tweaks are 3× harder — get it right now.' },
        { title: 'Seal joins + apply release', body: 'Silicone or expanding foam over any gap at corners / joins — otherwise cream leaks out and the edge is rough. Brush a proprietary formwork release oil on the inside face so it strips cleanly.', watchFor: 'Don\'t use diesel or engine oil as release — both stain the finished concrete + leave residue + are a pollution issue. Proper release is cheap.' },
      ],
    },
  },
  {
    id: 'lay-dpm-slab',
    category: 'concrete-foundations',
    label: 'Lay a DPM under a slab',
    summary: 'Sand blinding, roll, lap + tape, seal penetrations.',
    nz: {
      tools: ['Utility knife', 'Broom', 'Rake', 'Tape', 'Marker pen'],
      materials: ['DPM: 250 μm polythene sheet (per NZS 3604 / NZBC E2)', 'Sand: 25–50 mm blinding layer over compacted hardfill', 'DPM joining tape (wide, self-adhesive)', 'Sealant for penetrations (butyl or proprietary)'],
      steps: [
        { title: 'Compact + level the sub-base', body: 'Sub-base should already be crushed hardfill (GAP 40 or similar), compacted with a plate compactor or roller. Rake it level and remove any sharp rocks that would puncture the DPM.', watchFor: 'A single sharp stone can rip a DPM sheet and let ground moisture through into the slab. Rake carefully.' },
        { title: 'Spread a sand blinding layer', body: '25–50 mm of clean sand raked flat over the compacted hardfill. Purpose is to protect the DPM from puncture and give an even surface for the polythene to sit on.', watchFor: 'On tight sites, some builders skip the sand and lay DPM straight on hardfill. NZS 3604 §7 requires a smooth base — if the hardfill is fine and even, you can, but a sand blinding is cheap insurance.' },
        { title: 'Roll the DPM out over the slab area', body: 'Position the roll at one edge and unroll across the slab. 250 μm minimum per E2 (many use 300 μm — thicker is tougher). Lay sheets so laps run perpendicular to the pour direction.', watchFor: 'Windy day + polythene sheet = disaster. Weigh the edges down with off-cuts as you unroll, especially if you can\'t pour the same day.' },
        { title: 'Lap sheets by minimum 300 mm + tape', body: 'Overlap adjacent sheets by at least 300 mm (E2 minimum), then tape the full length of the join with wide DPM tape. Both surfaces must be dry and clean for the tape to bond.', watchFor: 'A lap without tape lets ground moisture through the join. Tape is not optional if you want the DPM to actually work.' },
        { title: 'Turn up + tape at the perimeter', body: 'Turn the DPM up the inside face of the boxing to at least the top of the slab, and tape it to the boxing so it stays. Trim any excess after pour.', watchFor: 'A short turn-up gets buried under concrete and stops working at the slab edge. Take it all the way up.' },
        { title: 'Cut around + seal all penetrations', body: 'Cut a neat X over each plumbing / electrical penetration. Fold the flaps up around the pipe / conduit, tape the flaps together, then wrap butyl / proprietary sealant around the pipe-to-DPM join.', watchFor: 'Plumbing penetrations are the #1 spot moisture gets past the DPM. Seal them properly — a wrap of tape isn\'t enough on a rough pipe surface.' },
        { title: 'Protect from puncture during steel + pour', body: 'Chairs, mesh drops, foot traffic, wheelbarrows — all can rip the DPM once it\'s down. Walk on the sheet carefully, put a plank down for wheelbarrows, and repair any tear immediately with a patch + tape.', watchFor: 'A torn DPM under a poured slab is invisible until moisture problems appear years later. Inspect the sheet just before the pour and patch any damage.' },
      ],
    },
    au: {
      tools: ['Utility knife', 'Broom', 'Rake', 'Tape', 'Marker pen'],
      materials: ['DPM: 0.2 mm (200 μm) polyethylene sheet minimum per NCC Vol 2 3.4.1; 0.3 mm on Class M+ / reactive sites — branded for underslab use', 'Sand: 25–50 mm blinding layer over compacted crushed rock', 'DPM joining tape (wide, self-adhesive)', 'Sealant for penetrations (butyl or proprietary)', 'Termite management collar for each penetration (Type A physical or Part A chemical, per AS 3660)'],
      steps: [
        { title: 'Compact + level the sub-base', body: 'Sub-base is compacted crushed rock (Class 2 or 3 depending on state spec) run over with a plate compactor. Rake level; remove sharp rocks that would puncture the DPM.', watchFor: 'A single sharp stone can rip DPM and let ground moisture into the slab. Rake carefully.' },
        { title: 'Spread a sand blinding layer', body: '25–50 mm of clean sand raked flat over the compacted rock. Protects the DPM from puncture and gives an even base for the poly.', watchFor: 'NCC deemed-to-satisfy for slabs allows DPM straight on smooth compacted base; check your engineer\'s spec. A sand blinding is cheap insurance either way.' },
        { title: 'Roll the DPM out', body: 'Position the roll at one edge and unroll across the slab. 0.2 mm minimum per NCC — 0.3 mm on Class M and worse. Sheets so laps run perpendicular to pour direction.', watchFor: 'Wind + polythene = disaster. Weigh edges with off-cuts as you unroll if the pour is not the same day.' },
        { title: 'Lap sheets by minimum 200 mm + tape', body: 'Overlap adjacent sheets by at least 200 mm (NCC min), tape the full length of the join with wide DPM tape. Both surfaces must be dry and clean for the tape to bond.', watchFor: 'A lap without tape lets moisture through the join. Tape is not optional.' },
        { title: 'Turn up + tape at the perimeter', body: 'Turn DPM up the inside face of the boxing to at least the top of the slab, tape to boxing so it stays. Trim excess after pour.', watchFor: 'Short turn-up gets buried and stops working at the slab edge. Take it all the way up.' },
        { title: 'Seal penetrations + install termite collars', body: 'Cut a neat X over each plumbing / electrical penetration. Fold flaps up around the pipe, tape together, wrap butyl. In termite-management zones, fit an approved termite collar (physical or chemical Part A) to each penetration per AS 3660.', watchFor: 'A missed or badly-fitted termite collar creates a direct pathway for termites into the frame above. Building surveyors will pull you up on this before the pour is signed off.' },
        { title: 'Protect from puncture during steel + pour', body: 'Chairs, mesh drops, foot traffic — all rip the DPM once it\'s down. Walk carefully, plank under wheelbarrows, repair tears immediately with patch + tape.', watchFor: 'A torn DPM is invisible under the finished slab until moisture problems (or termite ingress) show up years later. Inspect just before the pour and patch any damage.' },
      ],
    },
  },
  {
    id: 'place-slab-mesh',
    category: 'concrete-foundations',
    label: 'Place mesh + starter bars in a slab',
    summary: 'Read schedule, chair, position, tie laps, cover check.',
    nz: {
      tools: ['Bolt cutters (mesh)', 'Rebar cutter or angle grinder (bars)', 'Bar-tying pliers', 'Tape', 'Marker pen', 'Cover meter (if available)'],
      materials: ['Mesh: SE62 / SE72 / SE82 or 665 / 668 (per engineer\'s schedule)', 'Bar chairs: 40–50 mm plastic or wire chairs at ~1 m spacing', 'Tie wire (annealed, black)', 'Starter bars (D12 or D16 typically) — length + spacing per plan', 'Cover blocks for edge steel'],
      steps: [
        { title: 'Read the engineer\'s steel schedule', body: 'Get the mesh grade, chair height, lap length, and any additional bars (edge beam reinforcement, thickened edge bars, starter bars for walls above). NZS 3109 governs concrete construction — engineer\'s design overrides defaults.', watchFor: 'Substituting mesh grade (e.g. SE62 instead of specified SE72) is a common cost-saving mistake. It changes the slab\'s crack control; engineer\'s spec is not a suggestion.' },
        { title: 'Position bar chairs', body: 'Lay chairs on the DPM at approx 1 m centres each way, tighter under expected load points (columns, wall footings). Chair height = cover to top of slab required minus mesh diameter (usually gives 40–50 mm cover top and bottom on a 150 slab).', watchFor: 'Chairs that flatten the DPM into a puddle beneath will punch through. Use chairs with a wide base, or sit them on off-cuts of DPM as a protector.' },
        { title: 'Lay mesh sheets over chairs', body: 'Position first sheet aligned with the slab edge, keeping 50 mm cover from the boxing (use edge cover blocks). Lay subsequent sheets, lapping by at least 2 full mesh squares per NZS 3109.', watchFor: 'Under-sized lap fails the crack-control at the join — inspector will call it out. Count squares as you go.' },
        { title: 'Tie laps with wire', body: 'At every lap, twist a piece of tie wire around the two crossing bars — one tie every 300 mm along the lap length. Bar-tying pliers make this quick.', watchFor: 'Untied laps shift during the pour when the concrete pump kicks the mesh around. Tie them all, even if it\'s tedious.' },
        { title: 'Place edge beam + starter bars', body: 'Cut deformed bars to length for edge-beam reinforcement (usually 2× D12 or D16 top and bottom in the thickened edge). Position and tie to the mesh. Set starter bars for walls / columns above, projecting the required length above slab top.', watchFor: 'Starter bar positions are critical — they must land inside the wall thickness above. Measure carefully off the framing plan, not just eyeball off the mesh.' },
        { title: 'Check cover before pour', body: 'Cover to top of slab = distance from top of mesh to finished slab surface. NZS 3109 is 50 mm min for slab-on-ground external surfaces; 30 mm min for internal / protected. Cover to edge (side of slab to nearest bar) similar. Walk the slab, measure at multiple points, adjust chairs if wrong.', watchFor: 'Steel too close to surface = spalling and rust when the slab weathers. Steel too deep = no structural benefit. Cover check pre-pour is engineer-required on any inspected job.' },
        { title: 'Get pre-pour sign-off', body: 'Before the truck arrives, get the engineer or council inspector to look at the steel + formwork if that\'s a condition of the consent. Some councils require it, some don\'t — check the consent conditions.', watchFor: 'Pouring without a required inspection is grounds for a NOT — Notice to Fix. Cheaper to wait a day than tear out.' },
      ],
    },
    au: {
      tools: ['Bolt cutters (mesh)', 'Rebar cutter or angle grinder (bars)', 'Bar-tying pliers', 'Tape', 'Marker pen', 'Cover meter (if available)'],
      materials: ['Mesh: SL62 / SL72 / SL82 (per engineer\'s schedule + AS 2870 site class)', 'Bar chairs: 40–50 mm plastic or wire, ~1 m spacing', 'Tie wire (annealed, black)', 'Starter bars (N12 or N16 typically) per plan', 'Cover blocks for edge steel'],
      steps: [
        { title: 'Read the engineer\'s steel schedule', body: 'Get mesh grade, chair height, lap length, edge-beam reinforcement, starter bars. Slab reinforcement follows the engineer\'s design per AS 2870 for the site class — Class M gets standard; Class H1/H2/E gets more.', watchFor: 'Substituting mesh (e.g. SL62 for spec\'d SL72) is a common shortcut that changes the crack-control performance. Engineer\'s spec is not a suggestion.' },
        { title: 'Position bar chairs', body: 'Lay chairs on the DPM at approx 1 m centres, tighter under expected load points. Chair height = cover to top required minus mesh diameter — typically 40 mm top + 40 mm bottom on a 100–150 slab.', watchFor: 'Chairs with narrow bases punch through the DPM. Use wide-base chairs or sit them on DPM off-cuts as protectors.' },
        { title: 'Lay mesh sheets over chairs', body: 'Position first sheet aligned with slab edge, 40 mm cover from boxing (use edge cover blocks). Subsequent sheets lap by at least 225 mm (one full mesh square + 25 mm) per AS 3600.', watchFor: 'Undersized lap is a common defect — inspector will make you cut and re-lay. Do it right first time.' },
        { title: 'Tie laps with wire', body: 'At every lap, tie wire around crossing bars — one tie every 300 mm along the lap length. Bar-tying pliers make it quick.', watchFor: 'Untied laps shift during pour when the pump kicks the mesh around. Tie them all.' },
        { title: 'Place edge beam + starter bars', body: 'Cut N12 or N16 deformed bars for edge-beam reinforcement (usually 2 top, 2 bottom in the thickened edge). Position and tie. Set starter bars for walls / columns above, projecting the required length.', watchFor: 'Starter bar positions must land inside the wall / column thickness above. Measure carefully off the framing plan.' },
        { title: 'Check cover before pour', body: 'Cover to top = distance from top of mesh to finished slab surface. AS 3600 typical for slab-on-ground exterior is 40 mm min; 30 mm for internal-exposure surfaces. Check spec. Walk the slab, measure, adjust chairs.', watchFor: 'Insufficient cover = spalling and rebar corrosion long-term. Excess cover = no structural benefit. Cover check pre-pour is standard on any inspected job.' },
        { title: 'Get pre-pour sign-off', body: 'Before the truck arrives, get the engineer or building surveyor to look at the steel + formwork + termite provisions if that\'s a permit condition. Certifier\'s inspection is common at this stage.', watchFor: 'Pouring without a mandatory inspection is grounds for a rectification notice. Cheaper to wait a day than tear out a slab.' },
      ],
    },
  },
  {
    id: 'pour-screed-slab',
    category: 'concrete-foundations',
    label: 'Pour and screed a slab',
    summary: 'Order, discharge, vibrate, screed, float, cure.',
    nz: {
      tools: ['Wheelbarrows', 'Concrete rake / lute', 'Aluminium screed (magnesium bull screed for larger slabs)', 'Bull float + handle', 'Concrete vibrator (poker)', 'Steel trowel or power float', 'Edging tool', 'PPE: gumboots, gloves, safety glasses'],
      materials: ['Concrete: 20 MPa (NZS 3604 standard house slab) or 25 MPa (engineered) per plan, 80–100 slump for hand-placed slabs', 'Curing compound (sprayed) or polythene for wet-covering', 'Bond breaker for control joints (if cutting)'],
      steps: [
        { title: 'Order concrete correctly', body: 'Volume = slab area × thickness + 10% waste. Grade per plan — 20 MPa for a standard NZS 3604 house slab, 25+ MPa for engineered. Slump per placement (80 for pump, 100 for wheelbarrow). Book the truck 24 hrs ahead, confirm pump arrangement.', watchFor: 'Under-order by 5% and you\'re short at the end; over-order by 20% and you\'re paying for waste. 10% buffer is the sweet spot.' },
        { title: 'Prep the site pre-truck', body: 'Set screed rails at FFL height across the slab (top of the boxing acts as the perimeter rail; drive intermediate stakes with a short pipe on top set to FFL for the middle). Hose, tools, PPE, wheelbarrows, bull float all ready before the truck arrives.', watchFor: 'A truck sitting on site waiting for you to set up is charging waiting time. Have everything ready before you ring "on your way".' },
        { title: 'Truck arrives — check the docket', body: 'Docket shows batch time, MPa, slump, additives. Confirm it matches the order. If slump is way out (too wet or too dry), get the driver to add water on-site (if permitted) or reject the load.', watchFor: 'Concrete life is 90 min from batch. If the truck was delayed and the batch is 100+ minutes old, reject it — the concrete will be lumpy and won\'t place well.' },
        { title: 'Discharge + rake to depth', body: 'Discharge into formwork in strips, working from one end. Rake / lute the concrete to roughly FFL. Vibrate with a poker every 300–500 mm — especially at edges, corners, around pipes, and along edge-beam thickenings.', watchFor: 'Over-vibration segregates the mix (aggregate sinks, cream floats). Poker in and out in one motion, not left in one spot for 30 seconds.' },
        { title: 'Screed to level', body: 'One person, aluminium screed rested on the perimeter boxing + intermediate rails. Draw the screed back in a sawing motion as you step down the slab. Fill low spots ahead of the screed as you go.', watchFor: 'Screed too short = dips in the middle. Screed length ≥ widest span between rails; for anything over 3 m use a magnesium bull screed on a pole.' },
        { title: 'Bull float once bleed water is gone', body: 'After screeding, wait for surface bleed water to disappear (10–30 min depending on temp). Then run the bull float across the slab — flatten ridges, close pores, get a uniform surface. One pass, don\'t over-work.', watchFor: 'Bull-floating while bleed water is still there traps water under the surface and causes surface delamination. Wait until the sheen has gone matte.' },
        { title: 'Steel trowel or power float finish', body: 'Once the slab has stiffened enough that you can stand on it and leave only a 3–5 mm footprint (usually 2–4 hrs from pour), start trowelling. Two passes: first for smoothing, second for a tight burnished finish.', watchFor: 'Trowelling too early opens up the surface; too late and the trowel just skips over hard concrete. Feel for the right window — the surface should be firm but responsive.' },
        { title: 'Apply curing compound + protect', body: 'Once trowelled, spray a curing compound over the whole slab (or cover with wet hessian / polythene for 3–5 days for residential; longer in dry or hot weather). Prevents rapid moisture loss which causes surface crazing.', watchFor: 'Rain on fresh concrete washes the cream off the surface = weak dusty finish. Cover with poly if rain is forecast within 6 hours.' },
      ],
    },
    au: {
      tools: ['Wheelbarrows', 'Concrete rake / lute', 'Aluminium screed (magnesium bull screed for larger slabs)', 'Bull float + handle', 'Concrete vibrator (poker)', 'Steel trowel or power float', 'Edging tool', 'PPE: gumboots, gloves, safety glasses'],
      materials: ['Concrete: N25 or N32 (per engineer + AS 2870 site class), 80–100 slump for hand-placed', 'Curing compound or polythene for wet-covering', 'Bond breaker for control joints'],
      steps: [
        { title: 'Order concrete correctly', body: 'Volume = slab area × thickness + 10% waste. Grade per engineer (N25 typical residential; N32 for high-exposure or reactive sites). Slump per placement (80 pump, 100 wheelbarrow). Book truck 24 hrs ahead, confirm pump.', watchFor: 'Under-order 5% = short at the end; over 20% = paying for waste. 10% buffer is standard.' },
        { title: 'Prep the site pre-truck', body: 'Set screed rails at FFL (top of boxing = perimeter rail; intermediate stakes with pipe on top set to FFL for the middle). Hose, tools, PPE, wheelbarrows, bull float ready before truck arrives.', watchFor: 'A truck waiting on site is charging waiting time. Have everything ready before you ring "on your way".' },
        { title: 'Truck arrives — check the docket', body: 'Docket shows batch time, MPa, slump, additives. Confirm against order. If slump is out, get driver to add water (if permitted) or reject.', watchFor: 'Concrete life is 90 min from batch under AS 1379. Batch over 100 min = reject — won\'t place well and will fail QA.' },
        { title: 'Discharge + rake to depth', body: 'Discharge into formwork in strips from one end. Rake to roughly FFL. Vibrate with poker every 300–500 mm, especially at edges, corners, around pipes and edge-beam thickenings.', watchFor: 'Over-vibration segregates the mix. Poker in and out in one motion, not held in one spot.' },
        { title: 'Screed to level', body: 'One person, aluminium screed rested on perimeter boxing + intermediate rails. Draw the screed back in a sawing motion as you step down the slab. Fill low spots ahead as you go.', watchFor: 'Screed too short = dips in the middle. Screed length ≥ widest span between rails; over 3 m use a magnesium bull screed on a pole.' },
        { title: 'Bull float once bleed water is gone', body: 'After screeding, wait for bleed water to disappear (10–30 min depending on temp). Then bull-float — one pass, flatten ridges, close pores. Don\'t over-work.', watchFor: 'Floating while bleed water is present traps water and causes surface delamination. Wait for the sheen to go matte.' },
        { title: 'Steel trowel or power float finish', body: 'Once you can stand on the slab with only a 3–5 mm footprint (2–4 hrs from pour), start trowelling. Two passes: smoothing then burnishing.', watchFor: 'Too early = open surface. Too late = trowel skips. Feel for the window — firm but responsive.' },
        { title: 'Apply curing compound + protect', body: 'Spray curing compound over the finished surface, or cover with wet hessian / poly for 3–5 days for residential (longer in hot / dry weather). Prevents rapid moisture loss + surface crazing. In hot conditions (>28 °C) start covering immediately after finishing.', watchFor: 'Rain on fresh concrete washes cream off = weak dusty finish. Cover with poly if rain forecast within 6 hours.' },
      ],
    },
  },
  {
    id: 'install-bored-pile',
    category: 'concrete-foundations',
    label: 'Install a bored-pier / concrete pile foundation',
    summary: 'Auger, cage, formwork tube, pour, anchor bolts.',
    nz: {
      tools: ['Hand auger or hydraulic post-hole borer', 'Sledge + claw hammer', 'Shovel', 'Spirit level', 'Laser or dumpy + staff', 'Wheelbarrow', 'Concrete vibrator (poker) or rod', 'Trowel'],
      materials: ['Reinforcing cage or bars (per engineer)', 'Sonotube / cardboard formwork (if above ground)', 'Concrete: 20 or 25 MPa (per engineer)', 'Bolts / bracket embedment per engineer', 'Timber for temporary bracing of tubes'],
      steps: [
        { title: 'Set out pile positions', body: 'Off profile boards, drop marker pegs at every pile position (see the set-out-for-piles job). Confirm depth requirements from the engineer\'s foundation plan and NZS 3604 §5 if you\'re using standard details.', watchFor: 'Standard NZS 3604 piles have a defined pile spacing + hole diameter. If your plan calls for anything non-standard (deeper, wider, cage-reinforced), it\'s an engineer-designed pile and the spec is not negotiable.' },
        { title: 'Auger each hole to design depth', body: 'Hydraulic post-hole borer for anything over 8–10 holes; hand auger for smaller jobs. Bore straight down, plumbing the borer at each hole. Keep spoil clear of the working area.', watchFor: 'On sloping ground, augering perpendicular to the slope gives you a slanted hole. Always plumb the borer vertically, not to the slope.' },
        { title: 'Inspect founding + confirm depth', body: 'When you hit design depth, prod the base with a rod. If it\'s solid, good. If soft, keep going until you hit competent ground. On engineer-designed piles, the engineer inspects; on NZS 3604 piles, you sign off.', watchFor: 'Kiwi soils vary hugely. If you\'ve got a bore-log from a geotech report, cross-reference — if your hole is way shallower or deeper than the log expected, flag it.' },
        { title: 'Lower reinforcing cage or bars (if required)', body: 'For engineer-designed piles, lower the pre-fabricated cage down the hole. Use bar chairs or hangers to keep the cage centred in the hole and off the base by 50 mm. Confirm projection above the hole for tying into the foundation above.', watchFor: 'A cage sitting on the base has no cover to the bottom — steel corrodes and the pile fails. Always centre with chairs or hangers.' },
        { title: 'Position formwork tube (if above ground)', body: 'For piles that project above ground level (deck piles, subfloor piles), slide a cardboard sonotube down over the hole, plumb it, brace to nearby pegs. Tube outside diameter should match hole diameter or slightly wider.', watchFor: 'Poorly-braced sonotubes tilt during pour. Brace to at least two adjacent stakes each direction, and check plumb once the concrete starts going in.' },
        { title: 'Pour concrete + vibrate', body: 'Wheelbarrow or chute concrete into each hole. Fill in one pass, don\'t stop halfway (creates a cold joint = weak pile). Vibrate with a poker or push a rebar / rod up-and-down to compact and remove air.', watchFor: 'Free-falling concrete more than 2 m segregates. On deep piles, use a tremie tube or lower the barrow chute into the hole.' },
        { title: 'Set anchor bolts / brackets before it sets', body: 'For subfloor piles carrying a bearer, push a hot-dipped galv anchor bolt / holding-down bolt down into the wet concrete to the depth spec\'d by the engineer / manufacturer. For adjustable pile-cap brackets, embed the bracket base while wet.', watchFor: 'Setting the bolt after the concrete has stiffened creates a loose bolt that won\'t hold pull-out load. Do it within 30 min of pour, before initial set.' },
        { title: 'Screed the top + cure', body: 'Once anchor bolts are in and concrete is at pile-top level, trowel the top smooth. Wet-cover or apply curing compound. Leave 24 hrs before any load, 7 days before full load.', watchFor: 'Piles poured in direct sun without cure will crack. Even a bit of shade cloth over the pile tops is better than nothing.' },
      ],
    },
    au: {
      tools: ['Hand auger or hydraulic post-hole borer', 'Sledge + claw hammer', 'Shovel', 'Spirit level', 'Laser or dumpy + staff', 'Wheelbarrow', 'Concrete vibrator (poker) or rod', 'Trowel'],
      materials: ['Reinforcing cage or bars (per engineer)', 'Sonotube / cardboard formwork (if above ground)', 'Concrete: N20 or N25 (per engineer)', 'Bolts / bracket embedment per engineer', 'Timber for temporary bracing of tubes'],
      steps: [
        { title: 'Set out pile positions', body: 'Off profile boards, drop marker pegs at every pier position (see the set-out-for-piles job). Confirm depth from the engineer\'s footing plan — on reactive-soil sites (Class H, E, P per AS 2870), depth is set by the founding layer, not a fixed number.', watchFor: 'Depth to founding layer on a Class H clay may be 1500+ mm. Don\'t assume the shallow figure on the plan is final — engineer confirms on the day.' },
        { title: 'Auger each hole to design depth', body: 'Hydraulic post-hole borer for anything over 8–10 holes; hand auger for smaller. Bore straight down, plumb the borer. Keep spoil clear of the work area.', watchFor: 'On sloping ground, augering perpendicular to slope gives a slanted hole. Always plumb the borer vertically.' },
        { title: 'Engineer inspection of founding', body: 'On Class M / H / E / P sites, the engineer inspects the base of each hole before pour to confirm founding. Book the inspection before the concrete truck. Photograph each hole with a metre rule for depth reference.', watchFor: 'Pouring without the engineer\'s hole-inspection sign-off is a rework guarantee. Book it into the day\'s programme.' },
        { title: 'Lower reinforcing cage', body: 'Pre-fabricated cage lowered into the hole. Use bar chairs or hangers to keep the cage centred and off the base by 50 mm. Confirm projection above the hole for tying into the footing / bearer above.', watchFor: 'Cage on the base = no cover = corrosion. Always centre and lift.' },
        { title: 'Position formwork tube (if above ground)', body: 'For piers projecting above ground, slide a sonotube over the hole, plumb, brace to nearby pegs. Tube OD = hole OD or slightly bigger.', watchFor: 'Poorly-braced sonotubes tilt during pour. Brace to two adjacent stakes each direction; check plumb as concrete goes in.' },
        { title: 'Pour concrete + vibrate', body: 'Wheelbarrow or chute into each hole. Fill in one pass — no stopping halfway (cold joint = weak pier). Vibrate with poker or push rod up-and-down.', watchFor: 'Free-falling concrete over 2 m segregates. On deep piers, use a tremie or lower the barrow chute into the hole.' },
        { title: 'Set anchor bolts / brackets while wet', body: 'For subfloor piers carrying bearers, push a hot-dipped galv anchor bolt into wet concrete to spec\'d depth. For adjustable pile-cap brackets, embed the base while wet.', watchFor: 'Bolts set after initial set won\'t hold pull-out load. Within 30 min of pour.' },
        { title: 'Screed top + cure', body: 'Trowel pier top smooth once bolts are in. Curing compound or wet-cover. 24 hrs before any load, 7 days before full load. In hot climates (>30 °C) protect from direct sun for the first 4 hrs.', watchFor: 'Piers in direct summer sun without cure will crack. Shade cloth over pier tops for the first day is worth it.' },
      ],
    },
  },

  // ─── Framing & structure ─────────────────────────────────────────────────
  {
    id: 'lay-subfloor',
    category: 'framing',
    label: 'Lay a sub-floor (bearers → joists → floor sheet)',
    summary: 'Bearers on piles, joists across, T&G sheet screwed down.',
    nz: {
      tools: ['30 m + 8 m tape', 'Laser or dumpy + staff', 'Spirit level (1.8 m+)', 'String line', 'Drop saw or circular saw', 'Hammer or nail gun', 'Cordless drill / impact driver', 'Chalk line', 'Framing square'],
      materials: ['Bearers: 100×75 or 125×100 SG8 H4 (per NZS 3604 §6 span tables)', 'Joists: 140×45 or 190×45 SG8 H1.2 (per NZS 3604 §7 span tables)', 'Joist hangers where joists lap or land on internal walls', '90×3.15 flat-head bright framing nails, 100 mm bugle screws to piles', 'Flooring: 20 mm T&G structural particleboard (or 17–19 mm structural ply)', 'Flooring adhesive (PU) + 50 mm particleboard screws'],
      steps: [
        { title: 'Confirm sizes + spacing from the plan', body: 'NZS 3604 §6/§7 span tables give bearer + joist sizes for standard light-timber-framed floors. Typical is 140×45 joists at 450 c/c across 100×75 bearers at 1400 c/c (400 c/c for tiles / heavy loads). Engineered joists (I-joists, LVL) override the standard tables — follow the manufacturer spec.', watchFor: 'Standard tables only apply within their limits. Longer spans, heavier loads, or engineered joists = follow the specific design, not the default.' },
        { title: 'Position + level bearers on the piles', body: 'Sit each bearer on the pile bracket. Shoot every bearer with the laser to datum + FFL offset. Skew-nail through the bracket or fix per NZS 3604 §5 fastening tables. Adjust with hardwood packers if a pile is low.', watchFor: 'Bearers that aren\'t dead level throw off every joist above them. Sight along after fixing; anything > 3 mm out gets re-shot.' },
        { title: 'Set out joist positions on the bearers', body: 'Mark 450 c/c (or 400 / 600 per plan) on the bearer top with a pencil. Mark end joists first, then evenly space the middles.', watchFor: 'Match joist positions under any internal load-bearing walls above — the wall load has to land on a joist, not span between two.' },
        { title: 'Lay joists across bearers', body: 'Place joists across bearers, single-span end-to-end or lap-joined over a bearer with 300 mm minimum overlap. Rotate crowned joists CROWN UP — gravity pulls them straight once loaded.', watchFor: 'A joist laid crown-down will sit crown-down forever, giving a permanent dip in the floor above it.' },
        { title: 'Fix joists to bearer', body: 'Skew-nail with 2× 90 mm nails per bearing point, or use joist hangers where the joist doesn\'t sit directly on the bearer top. Hangers get 35×3.15 joist-hanger nails, not framing nails.', watchFor: 'Substituting framing nails in a joist hanger fails the connection — the hanger nail is specifically shorter and thicker to develop the rated capacity.' },
        { title: 'Block between joists at midspan', body: 'Solid blocking (dwang, same section as the joist) between joists at midspan for any joist over 2.4 m. Skew-nail from both sides.', watchFor: 'Blocking stops joists twisting under load. Skipping it lets the floor bounce even with correctly-sized joists.' },
        { title: 'Lay flooring T&G with glue + screws', body: 'Bead PU adhesive along each joist top before laying the sheet. Push T&G joins tight, screw at 300 mm c/c along joists and 200 mm at sheet edges. Stagger sheet ends across at least two bearers.', watchFor: 'Leave a 3 mm expansion gap at the perimeter — flooring swells once the roof goes on and the moisture level rises.' },
      ],
    },
    au: {
      tools: ['30 m + 8 m tape', 'Laser or dumpy + staff', 'Spirit level (1.8 m+)', 'String line', 'Drop saw or circular saw', 'Hammer or nail gun', 'Cordless drill / impact driver', 'Chalk line', 'Framing square'],
      materials: ['Bearers: 100×75 or 125×75 F17 hardwood or MGP12 pine (per AS 1684.2 span tables) — H2-blue in termite zones', 'Joists: 140×45 or 190×45 MGP10/MGP12 pine (per AS 1684.2)', 'Joist hangers or triple-grip connectors', '90×3.15 flat-head bright framing nails, 100 mm Type 17 screws to piers', 'Flooring: 19 mm yellow-tongue T&G structural particleboard', 'Flooring adhesive (PU) + 50 mm particleboard screws'],
      steps: [
        { title: 'Confirm sizes + spacing from the plan', body: 'AS 1684.2 span tables give bearer + joist sizes for standard timber-framed floors. Typical is 140×45 joists at 450 c/c across F17 bearers at 1800 c/c. Engineered joists (LVL, I-joist) override — follow the manufacturer spec.', watchFor: 'Timber grade matters. MGP10 and MGP12 have different span capacities; using MGP10 where MGP12 was spec\'d under-sizes the floor.' },
        { title: 'Position + level bearers on the piers', body: 'Sit each bearer on the pier bracket. Shoot every bearer with the laser to datum + FFL offset. Fix through the bracket per AS 1684.2 fastening tables. Adjust with hardwood packers if a pier is low.', watchFor: 'In termite-management zones, timber packers can compromise the barrier. Use metal shim packers or approved treated packers only.' },
        { title: 'Set out joist positions on the bearers', body: 'Mark 450 c/c (or 600 per plan) on bearer top with pencil. Mark end joists first, then evenly space the middles.', watchFor: 'Match joist positions under load-bearing walls above — the wall load must land on a joist, not span between two.' },
        { title: 'Lay joists across bearers', body: 'Place joists across bearers, single-span or lap-joined over a bearer with 300 mm minimum overlap. Rotate crowned joists CROWN UP.', watchFor: 'A joist laid crown-down stays crown-down, giving a permanent dip in the floor above.' },
        { title: 'Fix joists to bearer', body: 'Skew-nail with 2× 90 mm nails per bearing point, or use joist hangers / triple-grip connectors where the joist doesn\'t sit directly on the bearer top. Hangers get joist-hanger nails, not framing nails.', watchFor: 'Substituting framing nails in a hanger fails the connection. Buy the manufacturer\'s spec\'d nail.' },
        { title: 'Block between joists at midspan', body: 'Solid blocking (same section as joist) at midspan for spans over 2.4 m. Skew-nail from both sides.', watchFor: 'Blocking stops joists twisting under load. Skip it and the floor bounces even with correctly-sized joists.' },
        { title: 'Lay flooring T&G with glue + screws', body: 'Bead PU adhesive along each joist top before laying the sheet. Push T&G tight, screw at 300 mm c/c along joists, 200 mm at edges. Stagger sheet ends across at least two bearers.', watchFor: 'Leave a 3 mm expansion gap at perimeter — yellow-tongue swells once the roof goes on.' },
      ],
    },
  },
  {
    id: 'frame-external-wall',
    category: 'framing',
    label: 'Frame an external stud wall',
    summary: 'Load-bearing wall with openings, lintels, bracing, wrap.',
    nz: {
      tools: ['Tape', 'Chalk line', 'Pencil', 'Combination square', 'Spirit level (1.8 m+)', 'Circular / drop saw', 'Hammer or nail gun', 'Cordless drill', 'Plumb bob', 'String line', 'Staple gun (for wrap)'],
      materials: ['Studs, plates, nogs: 90×45 SG8 kiln-dried radiata', 'Lintels: 190×45 (or larger) LVL13 or similar per NZS 3604 §8.5 tables', 'Trimmer + jack studs at each opening (doubled per plan)', '90×3.15 flat-head bright framing nails', 'Brace panels: 12 mm plywood, or engineered brace units per NZS 3604 §5.4', 'Wall wrap: E2/AS1-compliant house wrap (Thermakraft, Watergate, Tyvek)', 'Proprietary wrap tape for joins', 'Bottom-plate fixings: 100 mm bugle screws to timber, Dynabolts to slab'],
      steps: [
        { title: 'Read the framing plan + bracing schedule', body: 'Get wall dimensions, opening positions, lintel sizes, and brace panel positions from the bracing schedule. NZS 3604 §5 requires the BU (Bracing Units) demand to be met — the schedule tells you which panels go where.', watchFor: 'Substituting brace panels or moving them to "make it easier" invalidates the bracing calc. If the schedule calls for a specific panel in that wall, don\'t change it.' },
        { title: 'Cut plates + set out', body: 'Chalk the floor, cut top + bottom plates to length, stack and mark stud + trimmer + jack positions on both at once. External load-bearing walls typically 400 or 600 c/c per plan.', watchFor: 'Mark brace panel extents on the plates in a different colour so you don\'t forget to fit them before the wall goes up.' },
        { title: 'Cut lintels, studs, trimmers, jacks', body: 'Lintel length = opening width + 2× bearing (typically 100 mm each end). Trimmer = full-height stud each side of opening; jack = short stud from bottom plate to lintel underside.', watchFor: 'LVL lintel orientation matters — usually has a marked "top". Fit upside-down and you halve the bending capacity.' },
        { title: 'Assemble flat on the slab / floor', body: 'Lay bottom plate down, studs on their marks, trimmers + jacks + lintels at openings, top plate at the far end. Nail through the plates into stud ends — 2× 90 mm nails per end. Diagonal-check to square.', watchFor: 'Nail from plate INTO stud end. End-nailing into end-grain pulls out; face-nailing through plate develops full withdrawal strength.' },
        { title: 'Fit brace panels while flat', body: 'Screw or nail plywood brace panels to studs + plates per plan. Standard 4/8 nail pattern (perimeter + intermediate) per NZS 3604 §5.4. Do it while the wall is on the floor — much easier than working overhead.', watchFor: 'Skipping a nail on a brace panel drops its bracing capacity. Count nails on each panel before you stand the wall.' },
        { title: 'Stand + brace temporarily', body: 'Walk the wall up — one person can manage a standard external stud wall up to ~3 m; grab a hand for anything longer, heavier, or with a brace panel + LVL lintel already in it. Prop with off-cut diagonals from top corners to floor.', watchFor: 'An external wall with brace panels is 30–50% heavier than a bare frame. Read the wall before deciding solo vs paired.' },
        { title: 'Plumb, straighten, fix down', body: 'Level on end studs (in-and-out + left-right). Sight top plate for straightness. Fix bottom plate: slab = Dynabolts at 900 c/c; timber floor = 100 mm bugle screws into joists.', watchFor: 'Out-of-plumb walls telegraph through gib and cladding. Get every wall within 3 mm over 2.4 m before permanent bracing goes on.' },
        { title: 'Fix wall wrap over the frame', body: 'Roll wrap horizontally across the wall, starting at the bottom, lapping upper courses over lower by 150 mm minimum. Staple to studs at ~300 mm c/c. Tape all joins with proprietary wrap tape.', watchFor: 'E2/AS1 requires specific opening detail: sill flashing tape goes UNDER wrap, jamb tape OVER wrap, head flashing on TOP. Wrong sequence = water gets behind cladding.' },
      ],
    },
    au: {
      tools: ['Tape', 'Chalk line', 'Pencil', 'Combination square', 'Spirit level (1.8 m+)', 'Circular / drop saw', 'Hammer or nail gun', 'Cordless drill', 'Plumb bob', 'String line', 'Staple gun (for wrap)'],
      materials: ['Studs, plates, noggins: 90×45 MGP10 pine — H2-blue treated in termite zones', 'Lintels: 190×45 (or larger) LVL13 or similar per AS 1684.2 lintel tables', 'Trimmer + jack studs at each opening (doubled per plan)', '90×3.15 flat-head bright framing nails', 'Brace panels: 12 mm plywood, or engineered brace panels per AS 1684.2', 'Wall wrap: pliable membrane per AS 4200 (Enviroseal, Thermakraft, Tyvek)', 'Proprietary flashing tape for joins', 'Bottom-plate fixings: 100 mm Type 17 to timber, Dynabolts to slab'],
      steps: [
        { title: 'Read the framing plan + bracing schedule', body: 'Get wall dimensions, opening positions, lintel sizes, and brace panel positions. AS 1684.2 requires the bracing demand (kN or kN/m) to be met per wind classification (N1–N6 non-cyclonic, C1–C4 cyclonic).', watchFor: 'Moving brace panels invalidates the bracing design. Follow the schedule as drawn.' },
        { title: 'Cut plates + set out', body: 'Chalk floor, cut top + bottom plates, stack and mark stud + trimmer + jack positions on both at once. External load-bearing walls typically 450 or 600 c/c per plan.', watchFor: 'Mark brace panel extents in a different colour so you don\'t forget to fit them before standing.' },
        { title: 'Cut lintels, studs, trimmers, jacks', body: 'Lintel length = opening width + 2× bearing (typically 100 mm each end). Trimmer = full-height stud each side; jack = short stud from bottom plate to lintel underside.', watchFor: 'LVL orientation matters — usually a marked "top". Upside-down halves the bending capacity.' },
        { title: 'Assemble flat on the slab / floor', body: 'Lay bottom plate, studs on marks, trimmers + jacks + lintels at openings, top plate at the far end. Nail through plates into stud ends — 2× 90 mm nails per end. Diagonal-check to square.', watchFor: 'Nail from plate INTO stud end. End-grain nailing pulls out; face-nailing develops full withdrawal.' },
        { title: 'Fit brace panels while flat', body: 'Screw or nail plywood brace panels to studs + plates per plan. Standard 4/8 nail pattern per AS 1684.2. Do it while flat, not overhead.', watchFor: 'Skipping a nail drops brace capacity. Count nails on each panel before standing.' },
        { title: 'Stand + brace temporarily', body: 'Walk the wall up — one person can manage a standard external stud wall up to ~3 m; grab a hand for anything longer, heavier, or with brace panel + LVL lintel in it. Prop with diagonal off-cuts to floor.', watchFor: 'External wall with brace panels is 30–50% heavier than bare frame. Read the wall before deciding solo vs paired.' },
        { title: 'Plumb, straighten, fix down', body: 'Level on end studs (both faces). Sight top plate for straightness. Fix bottom plate: slab = Dynabolts at 900 c/c; timber floor = 100 mm Type 17 into joists.', watchFor: 'Out-of-plumb walls telegraph through plasterboard and cladding. Within 3 mm over 2.4 m before permanent bracing.' },
        { title: 'Fix wall wrap over the frame', body: 'Roll wrap horizontally across the wall, starting at the bottom, lapping upper courses over lower by 150 mm minimum. Staple at ~300 mm c/c. Tape all joins.', watchFor: 'NCC Vol 2 3.5 requires specific opening detail: sill tape UNDER wrap, jamb tape OVER wrap, head flashing on TOP. Wrong sequence = water behind cladding.' },
      ],
    },
  },
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
          body: 'Solo works for a standard 2.4 m internal wall up to ~4 m long — walk the top plate up while the bottom pivots on the snap-line. As soon as it\'s up, run off-cut diagonal braces from the top corners down to fixed points (the floor, existing framing, or a plate you\'ve tacked down). Don\'t let go until at least two braces are on.',
          watchFor: 'Grab a hand for anything longer than 4 m, taller than 2.7 m, or if the wall\'s carrying a lot of nogs / lintels. The wall is heavier than it looks the first time you lift one.',
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
          body: 'Solo works for a standard 2.4 m internal wall up to ~4 m long — walk the top plate up while the bottom pivots on the snap-line. As soon as it\'s up, run diagonal off-cut braces from the top corners down to fixed points (floor, existing framing, tacked-down plate). Two braces minimum before letting go.',
          watchFor: 'Grab a hand for anything longer than 4 m, taller than 2.7 m, or heavily loaded with nogs / lintels. The wall\'s heavier than it looks the first time.',
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
  {
    id: 'install-lintel-beam',
    category: 'framing',
    label: 'Install a lintel or support beam',
    summary: 'Bearing points, lift, fix, verify load path.',
    nz: {
      tools: ['Tape', 'Spirit level', 'Drill/driver', 'Hammer / nail gun', 'Drop or circular saw', 'Ratchet strap or come-along (for heavy beams)', 'Temporary props (2–3)', 'Plumb bob'],
      materials: ['Beam / lintel: LVL13/15, engineered timber, or steel per plan', 'Bearing packers + full-height jack studs each end', 'Beam brackets (Simpson, Pryda, or spec\'d)', '100 mm bugle screws + 90 mm framing nails', 'Timber for temporary props (100×50)'],
      steps: [
        { title: 'Read the beam schedule', body: 'Get section, span, bearing length required (typically 100–200 mm each end), hold-down / uplift straps, and fixings. NZS 3604 §8.5 covers lintels for standard cases; anything outside those tables is engineered.', watchFor: 'If the plan calls a specific product ("hyJOIST 90×240 LVL13"), do NOT substitute a different LVL grade without engineer sign-off — LVL strengths vary significantly grade to grade.' },
        { title: 'Confirm bearing points', body: 'Beam ends must land on full-height jack studs or a doubled-up bearing stud, not on a trimmer alone. Cross-check the framing plan matches what\'s built.', watchFor: 'Under-supported beam ends are the #1 structural failure in DIY framing. The full load path from beam → jack → bottom plate → foundation has to be continuous.' },
        { title: 'Cut the beam to length', body: 'Length = clear opening width + 2× bearing length. Mark orientation ("top") if LVL. Cut with a sharp blade — LVL splinters if cut with a blunt one.', watchFor: 'A wobbly cut on an LVL end means it won\'t bear flat on the jack stud. Take the time to cut square.' },
        { title: 'Prop + lift into position', body: 'Set temporary props at each end under where the beam will land, at the correct height (usually flush with top plate or a set distance below). A 3 m LVL you can walk up solo; anything from 4 m and up is easier with a hand — the awkwardness matters more than the weight.', watchFor: 'LVLs are heavy AND unwieldy — long span means one end drops before the other is landed. Two people once the length gets away from you.' },
        { title: 'Fix ends to bearing studs', body: 'Beam brackets, nail-plate connectors, or through-bolts per plan. Use manufacturer-spec\'d nails / bolts — substitutes fail the connection rating.', watchFor: 'Beam brackets have specific nail-hole patterns and quantities. All specified holes must have a nail; skipping "just a couple" fails the rated load.' },
        { title: 'Install uplift straps + lateral restraint', body: 'Fit hold-down straps per wind zone (NZS 3604 §5 or engineer). Straps tie beam → jack stud → bottom plate → foundation to resist uplift.', watchFor: 'In High + Extra High wind zones, missing straps let the roof fly off in cyclone-strength gusts. Not optional.' },
        { title: 'Complete framing above + verify load path', body: 'Trimmer studs from beam top to top plate, cripple studs at spacing, sill trimmer for window openings. Sight the whole load path from beam down to foundation — no gaps, no floating bits.', watchFor: 'A beam with a floating jack stud (not landing on a solid bearing point below) is decorative, not structural. Chase every load path to the ground.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'Drill/driver', 'Hammer / nail gun', 'Drop or circular saw', 'Ratchet strap or come-along', 'Temporary props (2–3)', 'Plumb bob'],
      materials: ['Beam / lintel: LVL13/15, engineered timber, or steel per plan', 'Bearing packers + full-height jack studs each end', 'Beam brackets (Simpson, Pryda, or spec\'d)', '100 mm Type 17 screws + 90 mm framing nails', 'Timber for temporary props (100×50)'],
      steps: [
        { title: 'Read the beam schedule', body: 'Get section, span, bearing length (typically 100–200 mm each end), hold-down straps, and fixings. AS 1684.2 Section 6 covers standard lintels; anything outside those tables is engineered.', watchFor: 'If the plan calls a specific product ("hyJOIST 90×240 LVL13"), don\'t substitute grades without engineer sign-off — LVL strengths vary significantly.' },
        { title: 'Confirm bearing points', body: 'Beam ends land on full-height jack studs or doubled bearing studs, not on a trimmer alone. Cross-check the framing plan matches what\'s built.', watchFor: 'Under-supported ends = the #1 structural failure. The path beam → jack → bottom plate → foundation must be continuous.' },
        { title: 'Cut the beam to length', body: 'Length = clear opening + 2× bearing. Mark orientation ("top") if LVL. Sharp blade — LVL splinters with a blunt one.', watchFor: 'A wobbly cut means the beam end won\'t bear flat. Cut square.' },
        { title: 'Prop + lift into position', body: 'Set temporary props at each end under where the beam lands, at correct height. A 3 m LVL you can walk up solo; from 4 m up is easier with a hand — awkwardness matters more than weight.', watchFor: 'LVLs are heavy AND unwieldy — long span means one end drops before the other is landed. Two people once the length gets away from you.' },
        { title: 'Fix ends to bearing studs', body: 'Brackets, nail-plate connectors, or through-bolts per plan. Manufacturer-spec\'d nails / bolts only.', watchFor: 'Brackets have specific nail-hole patterns. All specified holes must have a nail; skipping fails the rated load.' },
        { title: 'Install uplift straps + lateral restraint', body: 'Fit hold-down straps per wind classification (AS 1684.2 tables). Straps tie beam → jack stud → bottom plate → foundation to resist uplift.', watchFor: 'In N4+ and cyclonic zones, missing straps = roof departs in cyclone gusts. Not optional.' },
        { title: 'Complete framing above + verify load path', body: 'Trimmer studs beam top to top plate, cripple studs at spacing, sill trimmer for windows. Sight the whole load path down to foundation.', watchFor: 'A beam with a floating jack stud is decorative, not structural. Chase every load path to the ground.' },
      ],
    },
  },
  {
    id: 'stand-brace-walls',
    category: 'framing',
    label: 'Stand + brace framed walls',
    summary: 'Lift, prop, plumb, straighten, permanent brace.',
    nz: {
      tools: ['Sledge', 'Hammer or nail gun', 'Cordless drill', 'Spirit level (1.8 m+)', 'Tape', 'String line'],
      materials: ['Diagonal timber braces: 90×45 or 100×50 off-cuts, ~2.5 m long', '90×3.15 framing nails', '100 mm bugle screws for permanent bracing', 'Brace units: 12 mm ply panels or engineered steel braces per NZS 3604 §5.4'],
      steps: [
        { title: 'Assess the wall before you lift', body: 'Length, weight (brace panels + lintels add real mass), wind exposure. Standard internal or short external wall = solo lift. Long or heavily-loaded external wall = two people. A 6 m external with brace panel + LVL lintel is a solid 150 kg — plan for two.', watchFor: 'Read the wall before deciding. Lifting a heavier wall than you should on your own is how backs go.' },
        { title: 'Walk the wall up', body: 'Bottom plate against the snap-line, base pivots as you walk the top plate upright. Continuous motion — don\'t stop halfway with the wall half-raised.', watchFor: 'On a long heavy wall with two people, put the extra body at whichever end will pivot last. Communicate before lifting.' },
        { title: 'Prop immediately, two braces minimum', body: 'Screw or nail 90×45 diagonal off-cuts from top corners down to fixed points (floor, existing framing, adjacent wall). Don\'t let go until at least two braces are on.', watchFor: 'Wind gusts topple half-standing walls. If a gust comes through mid-standing, drop what you\'re doing and hold — a wall that falls flat means re-framing every stud.' },
        { title: 'Plumb both ends', body: 'Spirit level on end stud, check both faces (in-and-out AND left-right). Adjust the props until plumb, then re-nail brace to hold.', watchFor: 'Short spirit levels lie on tall studs. Use a 1.8 m minimum, or check at top, middle, and bottom of the same stud.' },
        { title: 'Straighten the top plate', body: 'Sight down the top plate for straightness, or run a string line. Push in or pull out with a brace prop until dead-straight; nail the prop off to hold.', watchFor: 'A bowed top plate telegraphs through the ceiling and every course of cladding. Get it dead straight now, not after linings.' },
        { title: 'Fix the bottom plate down', body: 'Slab: pre-drill + Dynabolts at 900 mm c/c minimum, tighter around openings. Timber floor: 100 mm bugle screws or twist-shank nails into the joist below.', watchFor: 'Screws into flooring ply with no joist under will pull. Chase the joist line and hit it.' },
        { title: 'Install permanent bracing + cross-tie corners', body: 'Fit brace panels, straps, or plywood per plan (usually done pre-standing). Nail double-plate joins at corners, install any strap ties.', watchFor: 'A wall standing on only temporary bracing at end-of-day is a next-morning collapse hazard if wind picks up. Get permanent bracing in before you knock off.' },
      ],
    },
    au: {
      tools: ['Sledge', 'Hammer or nail gun', 'Cordless drill', 'Spirit level (1.8 m+)', 'Tape', 'String line'],
      materials: ['Diagonal timber braces: 90×45 or 100×50 off-cuts, ~2.5 m long', '90×3.15 framing nails', '100 mm Type 17 screws for permanent bracing', 'Brace units: 12 mm ply panels or engineered steel braces per AS 1684.2'],
      steps: [
        { title: 'Assess the wall before you lift', body: 'Length, weight (brace panels + lintels add mass), wind exposure. Standard internal or short external = solo lift. Long or heavily-loaded external = two. A 6 m external with brace panel + LVL lintel is 150+ kg — plan for two.', watchFor: 'Read the wall before deciding. Lifting a heavier wall than you should solo is how backs go.' },
        { title: 'Walk the wall up', body: 'Bottom plate against the snap-line, base pivots as you walk the top plate upright. Continuous motion — don\'t stop halfway.', watchFor: 'On a long heavy wall with two people, put the extra body at whichever end pivots last. Communicate before lifting.' },
        { title: 'Prop immediately, two braces minimum', body: '90×45 diagonal off-cuts from top corners to fixed points. Don\'t let go until at least two braces on.', watchFor: 'Wind gusts topple half-standing walls. If a gust hits mid-standing, hold — a flat-fall means re-framing.' },
        { title: 'Plumb both ends', body: 'Spirit level on end stud, both faces (in-and-out + left-right). Adjust props until plumb; re-nail brace to hold.', watchFor: 'Short levels lie on tall studs. Use 1.8 m minimum or spot-check at top, middle, bottom.' },
        { title: 'Straighten the top plate', body: 'Sight down the top plate, or run a string line. Push/pull with a brace prop until dead-straight; nail off.', watchFor: 'A bowed top plate telegraphs through ceiling and cladding. Straighten now.' },
        { title: 'Fix the bottom plate down', body: 'Slab: pre-drill + Dynabolts at 900 c/c minimum, tighter at openings. Timber floor: 100 mm Type 17 into the joist below.', watchFor: 'Screws through flooring with no joist under will pull. Chase and hit the joist.' },
        { title: 'Install permanent bracing + cross-tie corners', body: 'Fit brace panels, straps, plywood per plan. Nail double-plate joins at corners, install strap ties per wind classification.', watchFor: 'A wall on temporary bracing at end-of-day is a next-morning collapse hazard if wind picks up. Permanent bracing in before knock-off.' },
      ],
    },
  },
  {
    id: 'frame-stair-opening',
    category: 'framing',
    label: 'Frame a stair opening / attic hatch',
    summary: 'Trimmers, headers, hangers, stringer support.',
    nz: {
      tools: ['Tape', 'Drop / circular saw', 'Hammer or nail gun', 'Cordless drill', 'Spirit level', 'Framing square'],
      materials: ['Trimmer joists: same size as regular joists (140×45 or 190×45 SG8 H1.2)', 'Header joists (short, between trimmers)', 'Joist hangers (Simpson, Pryda)', '35×3.15 galv joist-hanger nails (not framing nails)', 'Blocking off-cuts'],
      steps: [
        { title: 'Read the plan', body: 'Stair openings are typically 900–1000 wide × 3000+ long for a straight stringer. Attic hatches usually 900×550. Confirm trimmer positions + stringer support.', watchFor: 'Opening width must accommodate the stringer + handrail clearance. Under-sized = stair won\'t fit.' },
        { title: 'Cut regular joists back for the opening', body: 'Mark where trimmer + header joists will land. Cut existing joists back to clear the opening + leave bearing on the header line.', watchFor: 'Don\'t cut a joist that carries a load-bearing wall or a beam above without engineer sign-off — you\'re removing the load path.' },
        { title: 'Double up the trimmer joists', body: 'Trimmers run parallel to the opening long axis, one each side. Nail two joists together with 90 mm nails at ~300 mm c/c, staggered top and bottom.', watchFor: 'Trimmers carry the load of shortened joists PLUS the stair load. Doubling is mandatory, not optional.' },
        { title: 'Cut headers to fit between trimmers', body: 'Headers = short cross-joists between the trimmers, top and bottom of the opening. Cut tight — no gaps.', watchFor: 'A sloppy header cut relies on the hanger to hold; a tight fit shares load and prevents movement.' },
        { title: 'Fix headers with joist hangers', body: 'Simpson or Pryda hanger, nailed with 35×3.15 galv joist-hanger nails. Every hole in the hanger gets a nail.', watchFor: 'Framing nails in a hanger under-strength the connection by 50%. Buy the correct nail — hanger nails are shorter + thicker.' },
        { title: 'Add roll-blocking to trimmers', body: 'Solid off-cut between the trimmer and the next parallel joist, at midspan and at both ends. Stops the trimmer from rolling under stair load.', watchFor: 'Trimmers without roll-blocking flex sideways when someone runs up the stairs. Feels bouncy and reads as poor workmanship.' },
        { title: 'Verify opening is square', body: 'Measure diagonals of the opening. Corner-to-corner distances must match. Any wall / stringer landing on a trimmer top gets a hanger or bracket.', watchFor: 'An out-of-square opening means the stringer won\'t sit flat on the header. Fix now, not when the stair arrives.' },
      ],
    },
    au: {
      tools: ['Tape', 'Drop / circular saw', 'Hammer or nail gun', 'Cordless drill', 'Spirit level', 'Framing square'],
      materials: ['Trimmer joists: same size as regular joists (140×45 or 190×45 MGP10)', 'Header joists (short, between trimmers)', 'Joist hangers (Simpson, Pryda, triple-grip)', '35×3.15 galv joist-hanger nails (not framing nails)', 'Blocking off-cuts'],
      steps: [
        { title: 'Read the plan', body: 'Stair openings typically 900–1000 × 3000+ for a straight stringer. Attic hatches usually 900×550. Confirm trimmer positions + stringer support.', watchFor: 'Opening width must fit stringer + handrail clearance. Under-sized = stair won\'t fit.' },
        { title: 'Cut regular joists back for the opening', body: 'Mark where trimmers + headers will land. Cut existing joists back to clear + leave bearing on the header line.', watchFor: 'Don\'t cut a joist under a load-bearing wall without engineer sign-off — you\'re removing the load path.' },
        { title: 'Double up the trimmer joists', body: 'Trimmers run parallel to opening long axis, one each side. Nail two joists together with 90 mm nails at ~300 mm c/c, staggered.', watchFor: 'Trimmers carry shortened-joist load + stair load. Doubling is mandatory.' },
        { title: 'Cut headers to fit between trimmers', body: 'Headers = short cross-joists between trimmers, top + bottom of opening. Cut tight.', watchFor: 'Sloppy fit relies on the hanger alone; tight fit shares load and prevents movement.' },
        { title: 'Fix headers with joist hangers', body: 'Simpson / Pryda / triple-grip, nailed with joist-hanger nails. Every hole gets a nail.', watchFor: 'Framing nails in a hanger under-strength by 50%. Hanger nails are shorter + thicker.' },
        { title: 'Add roll-blocking to trimmers', body: 'Solid off-cut between the trimmer and next parallel joist, at midspan + both ends. Stops trimmer rolling under stair load.', watchFor: 'Trimmers without roll-blocking flex sideways under load. Bouncy = poor workmanship read.' },
        { title: 'Verify opening is square', body: 'Measure diagonals — must match. Stringer landing on a trimmer top gets a hanger or bracket.', watchFor: 'Out-of-square opening = stringer won\'t sit flat on the header. Fix now, not when stair arrives.' },
      ],
    },
  },
  {
    id: 'install-ceiling-joists',
    category: 'framing',
    label: 'Install ceiling joists',
    summary: 'Layout, skew-nail, midspan strong-back, uplift strap.',
    nz: {
      tools: ['Tape', 'Drop / circular saw', 'Hammer or nail gun', 'Cordless drill', 'Spirit level', 'String line', 'Ladder / trestle'],
      materials: ['Ceiling joists: 140×45 or 190×45 SG8 H1.2 (per NZS 3604 §10.2 span tables)', 'Strong-back timber (for long spans): 90×45 or 140×45 laid flat', '90×3.15 flat-head bright framing nails', 'Uplift straps (nail-on) per NZS 3604 §10.3 wind zone tables', 'Skew-nailing or joist hangers per detail'],
      steps: [
        { title: 'Get joist size + spacing from the plan', body: 'NZS 3604 §10.2 has span tables for standard ceiling loads. Typical: 140×45 at 400 c/c for a 4 m span. Bigger for storage-loaded ceilings or where joists carry roof structure.', watchFor: 'Ceiling joist size can be driven by ROOF LOAD, not just ceiling load. Trussed roofs offload; rafter roofs put the tie load into the ceiling joists.' },
        { title: 'Mark joist positions on top plates', body: 'Match spacing to wall studs where possible so uplift straps run in a straight line stud → plate → joist. Mark at both ends of the run.', watchFor: 'Joists that don\'t align with studs below still work structurally, but the strap tie-down path becomes offset — check the strap detail allows it.' },
        { title: 'Cut joists to length', body: 'Length = span + bearing (typically 45 mm minimum bearing each end). If a joist has to run wall-to-wall and lap on an internal wall, cut for the lap.', watchFor: 'Rotate crowned joists CROWN UP — same rule as floor joists. A crown-down joist gives a permanent dip in the ceiling below.' },
        { title: 'Position + skew-nail to top plate', body: 'Lay joists over top plates, skew-nail each end with 2× 90 mm nails per bearing. At an internal wall lap, use 3× nails through the lap.', watchFor: 'Skew-nailing too close to the joist end splits the timber. Angle 60° from vertical, start 25 mm back from the end.' },
        { title: 'Fit a strong-back at midspan (long spans)', body: 'For spans over 3.6 m, lay a strong-back (joist-sized member on flat) across the top of the ceiling joists at midspan. Skew-nail to each joist. Stiffens the whole plane and stops individual joists twisting.', watchFor: 'Skipping the strong-back on a long-span ceiling gives a bouncy ceiling and visible joist telegraph after linings go on.' },
        { title: 'Nog between joists for lateral stability', body: 'Solid off-cuts between joists at midspan, skew-nailed both sides. Stops joists rolling.', watchFor: 'Ceiling joists carrying a rafter tie load NEED the nogs — without them the joists can twist under the tension.' },
        { title: 'Install uplift straps per wind zone', body: 'NZS 3604 §10.3 tables give strap type and nailing per wind zone (Low → Extra High). Strap ties joist → top plate → stud. Nails per manufacturer spec.', watchFor: 'Missing straps in High + Extra High wind zones = roof lifts off in a storm. Not optional.' },
      ],
    },
    au: {
      tools: ['Tape', 'Drop / circular saw', 'Hammer or nail gun', 'Cordless drill', 'Spirit level', 'String line', 'Ladder / trestle'],
      materials: ['Ceiling joists: 140×45 or 190×45 MGP10 (per AS 1684.2 span tables)', 'Strong-back timber (for long spans)', '90×3.15 flat-head bright framing nails', 'Cyclone / wind straps per AS 1684.2 wind classification', 'Skew-nailing or joist hangers per detail'],
      steps: [
        { title: 'Get joist size + spacing from the plan', body: 'AS 1684.2 span tables give ceiling joist sizes. Typical: 140×45 at 450 c/c for a 4 m span. Bigger for storage-loaded or where joists carry rafter tie load.', watchFor: 'Joist size can be driven by ROOF LOAD, not just ceiling. Trussed roofs offload; rafter roofs put tie load into ceiling joists.' },
        { title: 'Mark joist positions on top plates', body: 'Match spacing to wall studs where possible so tie-down straps run stud → plate → joist. Mark both ends of the run.', watchFor: 'Non-aligned joists still work structurally but the tie-down path offsets — check the strap detail allows it.' },
        { title: 'Cut joists to length', body: 'Length = span + bearing (45 mm min each end). Lap on internal walls if wall-to-wall run needs a join.', watchFor: 'Crown UP — crown-down gives a permanent dip below.' },
        { title: 'Position + skew-nail to top plate', body: 'Skew-nail each end with 2× 90 mm nails per bearing. Lap on internal wall: 3× nails through lap.', watchFor: 'Skew-nailing too close to joist end splits the timber. Angle 60° from vertical, 25 mm back from end.' },
        { title: 'Fit a strong-back at midspan (long spans)', body: 'Spans over 3.6 m: joist-sized member on flat across the top of the ceiling joists at midspan. Skew-nail to each joist.', watchFor: 'Skipping strong-back = bouncy ceiling + visible joist telegraph after plasterboard.' },
        { title: 'Nog between joists for lateral stability', body: 'Solid off-cuts between joists at midspan, skew-nailed both sides. Stops joists rolling.', watchFor: 'Joists carrying rafter-tie load NEED nogs — without them the joists twist under the tension.' },
        { title: 'Install cyclone / wind straps', body: 'AS 1684.2 tables give strap type and nailing per wind classification (N1–N6, C1–C4). Strap ties joist → top plate → stud.', watchFor: 'Missing straps in N4+ and cyclonic zones = roof departs in a storm. Not optional.' },
      ],
    },
  },
  {
    id: 'cut-install-rafters-gable',
    category: 'framing',
    label: 'Cut + install rafters on a gable roof',
    summary: 'Template rafter, ridge board, birdsmouth, tie, tie-down.',
    nz: {
      tools: ['Tape', 'Drop / circular saw', 'Bevel or framing square', 'Spirit level', 'Chalk line', 'Hammer or nail gun', 'Plumb bob', 'Rafter template', 'Ladder / trestle / scaffold'],
      materials: ['Rafters: 190×45 or 240×45 SG8 H1.2 (per NZS 3604 §10.4 rafter tables)', 'Ridge board: same depth as rafters × 25 or 45 mm thick', '100 mm framing nails', 'Collar ties or ceiling joists (roof tie)', 'Rafter tie-down straps per wind zone (NZS 3604 §10.3)'],
      steps: [
        { title: 'Read the roof plan', body: 'Get pitch, span (wall-to-wall), overhang length, and ridge dimensions. Confirm rafter size from NZS 3604 §10.4 rafter tables against the span + pitch.', watchFor: 'Pitch is critical to every cut. Note whether stated in degrees or as ratio (rise:run) and convert if needed. Rise / run miscalculations = every cut wrong.' },
        { title: 'Set out ONE rafter as the template', body: 'On the ground, mark plumb cut (ridge end), birdsmouth (seat on top plate), and plumb + level tail cut (for eave fascia). Cut this one carefully.', watchFor: 'The birdsmouth must leave at least 2/3 of the rafter depth ABOVE the plate. Over-cutting the birdsmouth weakens the rafter significantly and fails inspection.' },
        { title: 'Test-fit the template rafter', body: 'Position it against a temporary ridge and a top plate. Confirm birdsmouth sits flat on plate, ridge cut is plumb, tail sits at correct overhang.', watchFor: 'A template that fits at one end of the building may not fit at the other if the walls aren\'t straight. Test at both ends before cutting the batch.' },
        { title: 'Cut all rafters from the template', body: 'Bundle rafters together and cut in one session for consistency. Do them all in one go — an interrupted cutting session risks the second batch not matching the first.', watchFor: 'Marking each rafter from the template introduces error. Use the template as a physical marker (trace or clamp) rather than measuring each time.' },
        { title: 'Position ridge board + prop', body: 'Set the ridge board along the roof centreline, prop with temporary posts to design ridge height. Chalk a straight line to sight the ridge against.', watchFor: 'A crooked ridge = crooked roof. Straighten the ridge before you nail more than the first two rafter pairs.' },
        { title: 'Fix opposing rafter pairs at ridge', body: 'Nail one rafter to the ridge, then the opposing rafter to meet it. 3× 100 mm nails at ridge, 2× skew-nails through birdsmouth into top plate. Work from one end to the other.', watchFor: 'Nail one side then the other — nailing both sides of a rafter pair simultaneously bows the ridge board.' },
        { title: 'Install collar ties or confirm ceiling joists tie', body: 'NZS 3604 requires a roof tie at every opposing rafter pair for pitches below 45°. Ceiling joists spanning the same direction as the rafters can BE the tie; if they don\'t, install collar ties.', watchFor: 'Without a tie, rafter thrust pushes the walls apart at the top plate. Progressive damage over years, visible as spreading walls.' },
        { title: 'Install rafter tie-down straps', body: 'Fix strap to rafter side + around top plate + down to stud below. Nails per manufacturer + wind zone. NZS 3604 §10.3 tables.', watchFor: 'Substituting a shorter strap or fewer nails downgrades the connection. Follow the strap spec exactly.' },
        { title: 'Sight the finished roof', body: 'Ridge straight, rafters plumb (sight from below), overhang consistent all round. Small tweaks with a mallet; big issues get called out now.', watchFor: 'Waves in the ridge or inconsistent overhangs will telegraph through cladding and become visible from the street. Get it right pre-roofing.' },
      ],
    },
    au: {
      tools: ['Tape', 'Drop / circular saw', 'Bevel or framing square', 'Spirit level', 'Chalk line', 'Hammer or nail gun', 'Plumb bob', 'Rafter template', 'Ladder / trestle / scaffold'],
      materials: ['Rafters: 190×45 or 240×45 MGP10 (per AS 1684.2 rafter tables)', 'Ridge board: same depth as rafters × 25 or 45 mm thick', '100 mm framing nails', 'Collar ties or ceiling joists (roof tie)', 'Cyclone / wind straps per AS 1684.2'],
      steps: [
        { title: 'Read the roof plan', body: 'Get pitch, span, overhang, ridge dimensions. Confirm rafter size from AS 1684.2 rafter tables against span + pitch.', watchFor: 'Pitch is critical to every cut. Degrees vs rise:run — convert if needed. Miscalc = every cut wrong.' },
        { title: 'Set out ONE rafter as the template', body: 'On the ground, mark plumb cut (ridge end), birdsmouth (seat on top plate), plumb + level tail cut.', watchFor: 'Birdsmouth must leave at least 2/3 of rafter depth ABOVE plate. Over-cut weakens the rafter and fails inspection.' },
        { title: 'Test-fit the template', body: 'Position against a temporary ridge + top plate. Confirm birdsmouth sits flat, ridge is plumb, tail at correct overhang.', watchFor: 'Template fits one end but not the other if walls aren\'t straight. Test both ends before batch-cutting.' },
        { title: 'Cut all rafters from the template', body: 'Bundle and cut in one session for consistency. Use template as physical marker (trace/clamp), not measurement each time.', watchFor: 'Measuring each rafter introduces error. Trace off the template.' },
        { title: 'Position ridge board + prop', body: 'Set ridge along centreline, prop with temporary posts to design height. Chalk a straight sight-line.', watchFor: 'Crooked ridge = crooked roof. Straighten before nailing more than two pairs.' },
        { title: 'Fix opposing rafter pairs at ridge', body: 'Nail one side, then opposing side to meet. 3× 100 mm at ridge, 2× skew-nails through birdsmouth into top plate. Work one end to the other.', watchFor: 'Nail one side then the other — simultaneous both sides bows the ridge board.' },
        { title: 'Install collar ties or confirm ceiling joists tie', body: 'AS 1684.2 requires a roof tie at every opposing pair for pitches below 45°. Ceiling joists spanning same direction can BE the tie; if not, install collar ties.', watchFor: 'No tie = rafter thrust pushes walls apart. Progressive damage over years.' },
        { title: 'Install cyclone straps + tie-downs', body: 'Strap to rafter side + around top plate + to stud below. Nails per manufacturer + wind classification. AS 1684.2 tables.', watchFor: 'Shorter strap or fewer nails downgrades the connection. Follow the spec exactly.' },
        { title: 'Sight the finished roof', body: 'Ridge straight, rafters plumb (sight from below), overhang consistent all round. Tweak with a mallet; big issues called out now.', watchFor: 'Waves telegraph through cladding and become visible from street. Fix pre-roofing.' },
      ],
    },
  },
  {
    id: 'install-trusses',
    category: 'framing',
    label: 'Set out and stand roof trusses',
    summary: 'Layout, crane / lift, plumb, permanent brace, tie-down.',
    nz: {
      tools: ['Tape', 'Spirit level', 'String line', 'Hammer or nail gun', 'Cordless drill', 'Temporary bracing off-cuts', 'Ladder / scaffold', 'Crane or hi-ab (if trusses are heavy or span long)'],
      materials: ['Trusses (pre-fabricated by manufacturer per truss schedule)', 'Truss connectors: Simpson H-clips, Pryda triple-grip, or spec\'d bracket', '90×3.15 nails (or manufacturer-spec\'d nails for connectors)', 'Temporary bracing: 90×45 off-cuts, ~3 m long', 'Permanent bracing: as per truss engineer\'s layout drawing', 'Cyclone / wind straps per NZS 3604 wind zone'],
      steps: [
        { title: 'Read the truss layout from the manufacturer', body: 'Get truss positions, orientations, girder trusses (support hip-jack trusses), and special connectors. Truss schedule is engineered as a SYSTEM.', watchFor: 'Removing, shortening, or moving any truss without engineer sign-off invalidates the whole design. If you need to modify a truss on site, stop and call the truss company.' },
        { title: 'Mark truss positions on the top plates', body: 'Number each mark to match the truss labels on the layout drawing. Get spacing exactly right — trusses are engineered for a specific c/c.', watchFor: 'Truss spacing errors compound across the roof. Measure from a datum end, don\'t chain off the last mark.' },
        { title: 'Lift the first (gable-end) truss into position', body: 'Brace vertically with off-cuts to floor + adjacent walls before letting go. This first truss is the reference for every subsequent one.', watchFor: 'Trusses are top-heavy and want to tip. First-truss failure = broken truss members = order a replacement + delay. Take your time.' },
        { title: 'Stand each subsequent truss on its mark', body: 'Position on the mark, nail heel of truss to top plate with H-clip or triple-grip + spec\'d nails. Every connector hole gets a nail.', watchFor: 'Substituting fewer nails or a different fastener drops the connection rating below the engineer\'s design.' },
        { title: 'Temporary-brace between trusses as you go', body: 'Diagonal 90×45 off-cuts between adjacent trusses (top chord to next top chord) to hold plumb + spaced correctly. Add ties as you install each truss.', watchFor: 'A row of un-braced trusses will fall like dominoes if one goes over. Keep bracing on continuously through the installation.' },
        { title: 'Install permanent bracing per the layout', body: 'Longitudinal bracing to top chord, bottom chord, and web bracing where the truss engineer calls it out. Nail off per manufacturer spec.', watchFor: 'Skipping "just one" permanent brace can trigger progressive collapse under wind load. Truss engineer\'s bracing plan is not optional.' },
        { title: 'Cyclone / wind straps + tie-downs', body: 'Fit hold-down straps per NZS 3604 wind zone (Low → Extra High). Strap ties truss heel → top plate → stud → foundation. Nails per manufacturer.', watchFor: 'Missing straps in High + Extra High wind zones = roof lifts off in a storm. Full tie-down chain from truss to foundation, no gaps.' },
        { title: 'Straighten top chord line', body: 'Sight along the ridge (top of top chord); adjust temporary bracing to bring in-line before setting permanent bracing.', watchFor: 'A wavy top chord line = wavy ridge line = visibly crooked roof from the street. Straighten before permanent bracing locks it in.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'String line', 'Hammer or nail gun', 'Cordless drill', 'Temporary bracing off-cuts', 'Ladder / scaffold', 'Crane or hi-ab (heavy/long trusses)'],
      materials: ['Trusses (pre-fabricated per truss schedule)', 'Truss connectors: Simpson H-clips, Pryda triple-grip', '90×3.15 nails (or manufacturer-spec\'d)', 'Temporary bracing: 90×45 off-cuts, ~3 m', 'Permanent bracing: per truss engineer\'s layout', 'Cyclone / wind straps per AS 1684.2 wind classification'],
      steps: [
        { title: 'Read the truss layout from the manufacturer', body: 'Get truss positions, orientations, girder trusses, special connectors. The truss schedule is engineered as a SYSTEM.', watchFor: 'Removing, shortening, or moving any truss without engineer sign-off invalidates the whole design. Modify on site = stop + call truss company.' },
        { title: 'Mark truss positions on top plates', body: 'Number marks to match truss labels. Spacing exact — trusses engineered for specific c/c.', watchFor: 'Errors compound. Measure from a datum end, don\'t chain off the last mark.' },
        { title: 'Lift the first (gable-end) truss', body: 'Brace vertically with off-cuts before letting go. Reference for every subsequent truss.', watchFor: 'Top-heavy — first-truss failure = broken members = replacement order. Take your time.' },
        { title: 'Stand each subsequent truss on its mark', body: 'Position on mark, nail heel to top plate with H-clip or triple-grip + spec\'d nails. Every connector hole gets a nail.', watchFor: 'Fewer nails or wrong fastener drops connection rating below engineer\'s design.' },
        { title: 'Temporary-brace between trusses', body: 'Diagonal 90×45 off-cuts between adjacent trusses to hold plumb + spacing. Add ties as you install each truss.', watchFor: 'Un-braced row falls like dominoes if one goes. Continuous bracing through install.' },
        { title: 'Install permanent bracing per the layout', body: 'Longitudinal bracing to top chord, bottom chord, and web bracing per truss engineer. Nail off per manufacturer.', watchFor: 'Skipping bracing = progressive collapse risk under wind. Bracing plan is not optional.' },
        { title: 'Cyclone straps + tie-downs', body: 'Hold-down straps per AS 1684.2 wind classification (N1–N6, C1–C4). Strap ties truss heel → top plate → stud → foundation.', watchFor: 'Missing straps in N4+ / cyclonic zones = roof departs in a storm. Full chain, no gaps.' },
        { title: 'Straighten top chord line', body: 'Sight along ridge; adjust temporary bracing to align before setting permanent bracing.', watchFor: 'Wavy top chord = wavy ridge = crooked-looking roof. Straighten before permanent bracing locks it.' },
      ],
    },
  },
  {
    id: 'install-roof-battens',
    category: 'framing',
    label: 'Install roof battens / purlins',
    summary: 'Underlay first, then battens at manufacturer spacing.',
    nz: {
      tools: ['Tape', 'Chalk line', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Spirit level', 'String line', 'Story rod'],
      materials: ['Battens: 70×45 SG8 H3.2 (typical for long-run steel)', '100 mm bugle screws or 90×3.15 hot-dipped galv nails', 'Roofing underlay (breather-type, self-supporting): Vapor Barrier, Sisalation, or similar per E2/AS1', 'Underlay staples or clout nails', 'Edge closure / end caps per roofing spec'],
      steps: [
        { title: 'Confirm batten spacing from roofing spec', body: 'Spacing depends on the specific profile + BMT (base metal thickness) + pitch + wind zone. Read the roofing manufacturer\'s span table for the profile on your job. Tile spec is different again — usually 335–380 mm gauge depending on tile.', watchFor: 'Roofing manufacturers void warranty if batten spacing exceeds their spec. Print the spec sheet and keep on site — don\'t guess a "typical" spacing.' },
        { title: 'Lay roofing underlay across rafters', body: 'Run underlay perpendicular to rafters, starting at the eave, upward. Overlap runs by 150 mm minimum; tape the joins if the spec requires. Staple or clout to rafter tops.', watchFor: 'Wrong-side-up underlay stops the moisture-shedding function. Look for the printed "This side up" markings before rolling out.' },
        { title: 'Position first batten at eave line', body: 'Aligned with the fascia line. Screw or nail through underlay into rafter / truss top chord with 100 mm bugle screws or 90×3.15 galv nails.', watchFor: 'The eave batten is often the visible reference for straight fascia. If it\'s crooked, the whole roof reads crooked. Sight it in with a string line.' },
        { title: 'Snap chalk lines up the roof at batten spacing', body: 'Use a story rod (a straight-edged stick marked at the batten spacing) for consistency. Snap up both sides of the roof so battens end up parallel.', watchFor: 'Inconsistent spacing means the roofing sheet fasteners land in air on some rows. Measure and mark carefully — don\'t eyeball.' },
        { title: 'Fix each batten to every rafter it crosses', body: '2× 100 mm bugle screws per rafter crossing (or spec\'d nails). Screws first-choice for future removability; nails faster but harder to strip if roof gets re-clad.', watchFor: 'A batten with only 1 screw per rafter crossing will lift under wind uplift. Do both screws — five extra seconds per crossing, thousands of dollars saved in re-work.' },
        { title: 'Stagger any batten joins over a rafter', body: 'Batten joins land ON a rafter (never mid-span). Overlap by 25 mm minimum, screw both battens to the shared rafter.', watchFor: 'A mid-span batten join fails as soon as the roofer walks it. Always join over a rafter.' },
        { title: 'Confirm batten hold-down per wind zone', body: 'NZS 3604 wind zone Extra High may require bracket connections at some rafter crossings, not just screws. Check the wind-zone requirements before fixing.', watchFor: 'In coastal Extra High wind zones, standard screwed connections may not meet uplift. If the plan calls out brackets, use them.' },
        { title: 'Sight the whole roof before roofer arrives', body: 'All battens straight, spacing correct, no bows. Fix any wobble now — it telegraphs through the roofing sheet as visible ripples once installed.', watchFor: 'A wobble in the batten becomes a wobble in the roof forever. Two minutes with a string line pre-roofer saves a call-back post-roofer.' },
      ],
    },
    au: {
      tools: ['Tape', 'Chalk line', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Spirit level', 'String line', 'Story rod'],
      materials: ['Battens: 70×45 F14 hardwood or 70×45 MGP12 pine (H3 exterior)', '100 mm Type 17 screws or 90×3.15 hot-dipped galv nails', 'Roofing underlay (foil-faced sarking or breather): per AS 4200', 'Underlay staples or clout nails', 'Edge closure per roofing spec'],
      steps: [
        { title: 'Confirm batten spacing from roofing spec', body: 'Spacing depends on the specific profile + BMT + pitch + wind classification. Read the roofing manufacturer\'s span table for the profile on your job. Tile spec is different — gauge per tile profile.', watchFor: 'Roofing manufacturers void warranty if spacing exceeds spec. Print + keep on site — don\'t guess a "typical" number.' },
        { title: 'Lay roofing underlay across rafters', body: 'Run underlay perpendicular to rafters from eave upward. Overlap runs 150 mm min; tape joins per spec. Staple or clout to rafter tops.', watchFor: 'Wrong-side-up sarking loses the reflective / moisture function. Check the "This side up" printing before rolling.' },
        { title: 'Position first batten at eave line', body: 'Aligned with fascia line. Screw or nail through underlay into rafter / truss top chord with 100 mm Type 17 or 90×3.15 galv nails.', watchFor: 'Eave batten is the visible reference for straight fascia. String-line it in.' },
        { title: 'Snap chalk lines up the roof', body: 'Story rod marked at batten spacing for consistency. Snap both sides so battens end up parallel.', watchFor: 'Inconsistent spacing = roofing screws land in air on some rows. Measure and mark, don\'t eyeball.' },
        { title: 'Fix each batten to every rafter it crosses', body: '2× 100 mm Type 17 per crossing (or spec\'d nails). Screws for future removability; nails faster but harder to strip.', watchFor: 'One screw per crossing lifts under wind uplift. Do both — 5 extra seconds per crossing, thousands saved in re-work.' },
        { title: 'Stagger batten joins over a rafter', body: 'Joins land ON a rafter (never mid-span). Overlap 25 mm min, screw both battens to shared rafter.', watchFor: 'Mid-span joins fail as soon as the roofer walks it. Always join over a rafter.' },
        { title: 'Confirm hold-down per wind classification', body: 'AS 1684.2 wind classifications N4+ and cyclonic (C1–C4) may require bracket connections at some rafter crossings, not just screws.', watchFor: 'Coastal N4+ and cyclonic zones may not meet uplift with standard screws. Follow the plan\'s hold-down detail.' },
        { title: 'Sight the whole roof before roofer arrives', body: 'All battens straight, spacing correct, no bows. Fix wobbles now — they telegraph through the roofing sheet as visible ripples.', watchFor: 'Batten wobble = permanent roof wobble. Two minutes with a string line saves a call-back.' },
      ],
    },
  },

  // ─── Roofing & cladding — get the building weather-tight ─────────────────
  {
    id: 'install-fascia-spouting',
    category: 'roofing-cladding',
    label: 'Install fascia + spouting (gutter)',
    summary: 'Fascia to rafter tails, brackets, fall to outlet, downpipes.',
    nz: {
      tools: ['Tape', 'Chalk line', 'Drop / metal saw', 'Tin snips', 'Cordless drill / impact driver', 'Hammer', 'Ladder / trestle', 'Sealant gun'],
      materials: ['Fascia: 190×25 or 240×25 H3.2 pre-primed pine, OR Colorcote-coated colorsteel fascia', 'Spouting: Marley PVC continuous / Marley continuous quad / colorsteel continuous', 'Spouting brackets @ 800 mm max c/c', 'Outlets, stopends, downpipe adaptors, expansion joints', '65 mm bugle screws / clout nails / manufacturer-spec\'d fascia clips', 'Neutral-cure sealant', 'Downpipes + brackets, stormwater connection'],
      steps: [
        { title: 'String-line the fascia line first', body: 'Pull a string from one end of the roof to the other, along the outside face of the rafter tails, at fascia-top height. Sight for straightness — pack out any short tails, or trim proud tails, so the fascia lands on a straight line.', watchFor: 'A wavy fascia is the first thing anyone notices from the street. Get the tails straight before nailing a single fascia board.' },
        { title: 'Cut fascia + mitre corners', body: 'Cut fascia to length between corners. Mitre external corners at 45° (or use a corner box if profile allows). Prime any cut ends of timber fascia before fixing.', watchFor: 'A gapped mitre corner reads as sloppy work forever. Test-fit before nailing.' },
        { title: 'Fix fascia to rafter tails', body: 'Screw or clout-nail into every rafter tail. Timber fascia: 2× 65 mm bugle screws or 90 mm hot-dipped galv nails per tail. Colorsteel fascia: manufacturer\'s spec clips + screws.', watchFor: 'One fixing per tail lets the fascia bow between rafters. Two fixings per tail — top + bottom.' },
        { title: 'Set spouting fall + fix brackets', body: 'Mark the high end + low end of the spouting run on the fascia. Fall = 1 in 200 (5 mm per metre). Fix brackets at 800 mm max c/c (Marley spec) along the marked slope, at the correct offset below fascia top.', watchFor: 'A spouting run without any fall ponds water. A run with too much fall (over 1 in 100) looks visibly tilted from below.' },
        { title: 'Fit outlets + stopends', body: 'Locate outlets over stormwater downpipes. Cut a hole in the spouting at each outlet, glue in outlet fitting per manufacturer. Fit stopends at each end (glued for PVC, riveted + sealed for colorsteel).', watchFor: 'Outlet-to-downpipe alignment matters. If the downpipe is 100 mm off the outlet, water hits the outside of the pipe and splashes back.' },
        { title: 'Snap spouting into brackets', body: 'Push the front edge of spouting up into brackets first, then rotate back edge in. Continuous PVC: expansion joint every 6 m per manufacturer.', watchFor: 'Continuous spouting expands + contracts significantly in sun. Skipping expansion joints causes buckling and pops seals.' },
        { title: 'Install downpipes + connect to stormwater', body: 'Downpipe from outlet down to stormwater inlet (gully or pipe). Fix brackets to wall at 1.5 m c/c. Test with water — a bucket poured into the spouting should exit the downpipe cleanly.', watchFor: 'A downpipe that discharges onto the ground beside the wall is a moisture problem waiting. Connect to stormwater or into a dispersal system per council spec.' },
      ],
    },
    au: {
      tools: ['Tape', 'Chalk line', 'Drop / metal saw', 'Tin snips', 'Cordless drill / impact driver', 'Hammer', 'Ladder / trestle', 'Sealant gun'],
      materials: ['Fascia: 190×25 or 240×25 H3-treated pine, OR COLORBOND-coated steel fascia', 'Gutter: PVC (quad, half-round), or COLORBOND (Zincalume) continuous', 'Gutter brackets @ 900 mm max c/c per most manufacturers', 'Outlets, stopends, downpipe adaptors, expansion joints', '65 mm Type 17 screws / clout nails / spec\'d clips', 'Neutral-cure sealant', 'Downpipes + brackets, stormwater connection per council'],
      steps: [
        { title: 'String-line the fascia line first', body: 'Pull a string along the outside face of rafter tails at fascia-top height. Sight for straightness — pack short tails, trim proud tails, so fascia lands on a straight line.', watchFor: 'Wavy fascia = first thing anyone notices from the street. Straighten tails before nailing any fascia.' },
        { title: 'Cut fascia + mitre corners', body: 'Cut fascia to length between corners. Mitre external corners at 45° (or use a corner box). Prime any cut ends of timber fascia.', watchFor: 'Gapped mitre reads sloppy forever. Test-fit before nailing.' },
        { title: 'Fix fascia to rafter tails', body: 'Screw / clout-nail into every rafter tail. Timber fascia: 2× 65 mm Type 17s or 90 mm galv nails per tail. COLORBOND fascia: spec\'d clips + screws.', watchFor: 'One fixing per tail lets fascia bow between rafters. Two — top + bottom.' },
        { title: 'Set gutter fall + fix brackets', body: 'Mark high + low end of gutter run on the fascia. Fall = 1 in 200 (5 mm/m). Fix brackets at 900 mm max c/c along the sloped line, at correct offset below fascia top.', watchFor: 'No-fall runs pond water. Too much fall (over 1 in 100) reads visibly tilted from below.' },
        { title: 'Fit outlets + stopends', body: 'Locate outlets over stormwater downpipes. Cut hole in gutter, glue outlet fitting per manufacturer. Stopends each end (glued PVC, riveted + sealed COLORBOND).', watchFor: 'Outlet-to-downpipe misalignment: water hits outside of pipe and splashes back.' },
        { title: 'Snap gutter into brackets', body: 'Push front edge up into brackets first, rotate back edge in. Continuous PVC / COLORBOND: expansion joint every 6 m per spec.', watchFor: 'Continuous gutter expands significantly in sun. Skipping expansion joints buckles and pops seals.' },
        { title: 'Install downpipes + connect to stormwater', body: 'Downpipe from outlet to stormwater inlet. Brackets to wall at 1.5 m c/c. Water-test with a bucket poured into the gutter.', watchFor: 'Downpipe discharging onto ground beside the wall is a moisture problem waiting. Connect to stormwater or dispersal system per council spec.' },
      ],
    },
  },
  {
    id: 'install-metal-roof',
    category: 'roofing-cladding',
    label: 'Install a long-run metal roof',
    summary: 'Sheets from eave up, screws, ridge + barge + apron flashings.',
    nz: {
      tools: ['Tin snips', 'Cordless drill / impact driver', 'Hammer', 'Chalk line', 'Tape', 'Ladder + edge protection / harness', 'Sealant gun', 'Rivet gun'],
      materials: ['Roofing sheet: Colorsteel Endura / MAXX / Magnaflow, profile per plan (Corrugate, Trapezoidal, Trimdek, Standing Seam)', 'Roofing screws: Type 17 hex-head with EPDM washer, colour-matched, 65 mm typical (through crown or valley per profile spec)', 'Ridge cap, barge cap, apron flashings (colour-matched Colorsteel)', 'Foam closures at ridge + eave', 'Rivets or self-drilling screws for flashing joints', 'Neutral-cure sealant, colour-matched'],
      steps: [
        { title: 'Verify underlay + battens ready for roofing', body: 'Check underlay is laid + lapped correctly, no tears. Confirm batten spacing matches the specific profile\'s span table (varies by profile, BMT, pitch, and wind zone).', watchFor: 'Roofing manufacturer voids warranty if batten spacing exceeds spec. Have the printed spec on site — don\'t rely on a "typical" number.' },
        { title: 'Position first sheet at eave', body: 'Square first sheet to the fascia line. Overhang past fascia line by 50 mm (varies with profile). If a valley or hip is on the same side, cut-fit at that end first.', watchFor: 'A crooked first sheet cascades across the roof. Get it square before screwing.' },
        { title: 'Fix through crown (or valley per spec)', body: 'Roofing screws at every second batten crossing on the field of the sheet; every batten crossing at eave, ridge, and both edges. Screw location (crown vs valley) is per profile — check spec.', watchFor: 'Over-tightening crushes the washer + kinks the sheet. Snug just enough that the EPDM washer squeezes 1/3 flat, no more.' },
        { title: 'Lay subsequent sheets side-lap', body: 'Side-lap direction should be AWAY from prevailing wind (upwind sheet on top of downwind sheet). Lap width per profile — usually one full pan.', watchFor: 'Reversed side-lap = wind drives rain UNDER the lap. Check the wind rose for the site before starting.' },
        { title: 'Work up the roof, full rows first', body: 'Fit full sheets on the low rows and full ones going up. Save cut-in sheets at hips / valleys / penetrations for last.', watchFor: 'Cut sheets are fiddly. Doing them last means you can focus effort where it matters, not slow down the main pack.' },
        { title: 'Fit ridge, barge, apron flashings', body: 'Ridge cap over foam closure, screwed through both sides into the top rib of the sheet. Barge cap along gables. Apron flashing where roof meets a wall.', watchFor: 'Missed foam closure = birds and vermin nest in the roof. Cheap product, huge grief if skipped.' },
        { title: 'Seal + rivet flashing joints', body: 'Any flashing-to-flashing joint gets a rivet + sealant. Any exposed screw head (usually just flashings) gets a sealant dot.', watchFor: 'Silicone-only joints without rivets pull apart in wind. Rivet then seal, not one or the other.' },
        { title: 'Check hold-down per wind zone', body: 'NZS 3604 wind zone Extra High needs extra screws on the ends of every sheet. Confirm the schedule + count fastenings.', watchFor: 'Coastal Extra High wind zones peel roofs off if under-fastened. Count screws sheet-by-sheet in these zones.' },
      ],
    },
    au: {
      tools: ['Tin snips', 'Cordless drill / impact driver', 'Hammer', 'Chalk line', 'Tape', 'Ladder + edge protection / harness', 'Sealant gun', 'Rivet gun'],
      materials: ['Roofing sheet: BlueScope COLORBOND (painted) or Zincalume (unpainted), profile per plan (Corrugated, Trimdek, Klip-Lok, Standing Seam)', 'Roofing screws: Type 17 hex-head with EPDM washer, colour-matched (through crown or valley per profile)', 'Ridge cap, barge cap, apron flashings (colour-matched)', 'Foam closures at ridge + eave', 'Rivets or self-drilling screws for flashing joints', 'Neutral-cure sealant, colour-matched'],
      steps: [
        { title: 'Verify underlay + battens ready for roofing', body: 'Check underlay is laid + lapped, no tears. Confirm batten spacing matches roofing profile spec per AS 1562.1 + manufacturer.', watchFor: 'Warranty voids if spacing exceeds spec. Have printed spec on site.' },
        { title: 'Position first sheet at eave', body: 'Square first sheet to fascia line. Overhang past fascia by 50 mm (varies with profile). Cut-fit at valley / hip end first if present.', watchFor: 'Crooked first sheet cascades across roof. Square before screwing.' },
        { title: 'Fix through crown (or valley per spec)', body: 'Roofing screws at every second batten crossing on the field; every crossing at eave, ridge, edges. Location per profile — check spec.', watchFor: 'Over-tight crushes washer + kinks sheet. Snug so EPDM squeezes 1/3 flat, no more.' },
        { title: 'Lay subsequent sheets side-lap', body: 'Side-lap direction AWAY from prevailing wind (upwind sheet on top of downwind). Lap width per profile — usually one full pan.', watchFor: 'Reversed side-lap = wind drives rain under lap. Check wind rose before starting.' },
        { title: 'Work up the roof, full rows first', body: 'Full sheets on the low rows and up. Cut-in sheets at hips / valleys / penetrations last.', watchFor: 'Cut sheets are fiddly. Last position means you can focus effort where it matters.' },
        { title: 'Fit ridge, barge, apron flashings', body: 'Ridge cap over foam closure, screwed both sides into top rib. Barge cap along gables. Apron where roof meets wall.', watchFor: 'Missed foam closure = birds + vermin nest inside. Cheap product, huge grief if skipped.' },
        { title: 'Seal + rivet flashing joints', body: 'Flashing-to-flashing joints: rivet + sealant. Exposed screw heads (mostly flashings): sealant dot.', watchFor: 'Silicone-only without rivets pulls apart in wind. Rivet then seal.' },
        { title: 'Check hold-down per wind classification', body: 'AS 1562.1 + AS 1170.2 wind loads. N4+ and cyclonic (C1–C4) need extra screws at sheet ends + all edges.', watchFor: 'Coastal cyclonic zones peel roofs off if under-fastened. Count screws sheet-by-sheet in these zones.' },
      ],
    },
  },
  {
    id: 'install-tile-roof',
    category: 'roofing-cladding',
    label: 'Install a tile roof',
    summary: 'Batten spacing to tile spec, courses up, ridge + hip caps.',
    nz: {
      tools: ['Tape', 'Chalk line', 'Wet saw or angle grinder with diamond blade', 'Hammer', 'Cordless drill', 'Ladder + edge protection', 'Trowel (if mortar-bedded ridge)'],
      materials: ['Roof tiles: concrete (Monier, Bristile) or clay (Marley, Redland), profile per plan', 'Tile nails: hot-dipped galv 50×3.15 or manufacturer-spec\'d clip', 'Hip + ridge tiles (matching profile)', 'Valley trays (colorsteel or metal-lined)', 'Ridge / hip fixing: mortar bed OR dry-fix ridge system (Marley DryVent)', 'Sarking / underlay (breather type)', 'Anti-ponding board at eave'],
      steps: [
        { title: 'Confirm batten spacing matches tile', body: 'Every tile profile has its own batten gauge — concrete Monier is typically 335 mm, some clay tiles are 380 mm. Confirm from the tile spec sheet before ordering battens.', watchFor: 'Wrong batten gauge = whole roof of exposed courses that don\'t align. Order battens after confirming tile profile, not before.' },
        { title: 'Install anti-ponding board at eave', body: 'The bottom row of tiles overhangs the underlay a little; anti-ponding board sits under the first tile to prevent water pooling on the underlay behind. Fix along eave line, level.', watchFor: 'Skipping the anti-ponding board = puddle behind first course = underlay rots out early.' },
        { title: 'Position first course of tiles', body: 'Start at one end at eave. Overhang fascia by 40–50 mm (check spec). Check level — the tile bottom edge must sit dead level along the row.', watchFor: 'A crooked first course means every course above is crooked. Use a long spirit level.' },
        { title: 'Lay tiles up the roof', body: 'Stagger course joints so each tile centres over the join of the course below (broken-bond pattern). Push each tile up until it hooks over the batten and sits on the tile below.', watchFor: 'Tiles laid without broken bond concentrate water down consistent lines. Broken bond distributes load and water shed.' },
        { title: 'Nail or clip tiles per spec', body: 'Concrete tiles: typically nail every 4th tile in Low wind zones; every tile in High + Extra High. Clay: often clipped. Check the tile spec against NZS 3604 wind zones.', watchFor: 'Under-nailing in a high wind zone = tiles pop off in the first big storm. Follow the wind-zone schedule.' },
        { title: 'Cut tiles at hips + valleys', body: 'Mark the cut line where tiles meet the hip or valley. Wet saw or angle grinder with a diamond blade. Wear PPE — cutting concrete tiles throws silica dust.', watchFor: 'Silica dust is a real occupational hazard. Wear an FFP3 mask + eye protection; wet-cut where possible.' },
        { title: 'Fit valley trays + ridge / hip caps', body: 'Valley trays sit UNDER tiles at internal roof intersections. Ridge + hip caps sit ON TOP, either mortar-bedded (traditional) or dry-fix (modern, more common now).', watchFor: 'Mortar-bedded ridges crack over time as roof moves. Dry-fix systems are more expensive but avoid the callback.' },
      ],
    },
    au: {
      tools: ['Tape', 'Chalk line', 'Wet saw or angle grinder with diamond blade', 'Hammer', 'Cordless drill', 'Ladder + edge protection', 'Trowel (mortar-bedded ridge)'],
      materials: ['Roof tiles: concrete (Boral, Monier CSR) or clay (Bristile, La Escandella), profile per plan', 'Tile nails: hot-dipped galv 50×3.15 or spec\'d clip', 'Hip + ridge tiles (matching profile)', 'Valley trays (COLORBOND or metal-lined)', 'Ridge / hip fixing: mortar bed OR dry-fix system', 'Sarking / underlay per AS 4200', 'Anti-ponding board at eave'],
      steps: [
        { title: 'Confirm batten spacing matches tile', body: 'Every tile has its own batten gauge — Boral concrete typically 335 mm, some clay 380 mm. Confirm from tile spec before ordering battens.', watchFor: 'Wrong gauge = whole roof of misaligned courses. Confirm tile before battens.' },
        { title: 'Install anti-ponding board at eave', body: 'Bottom tile row overhangs underlay; anti-ponding board sits under first tile to prevent water pooling on underlay behind.', watchFor: 'Skipping = puddle behind first course = underlay rots.' },
        { title: 'Position first course', body: 'Start one end at eave. Overhang fascia 40–50 mm (spec). Dead level along the row.', watchFor: 'Crooked first course cascades. Long spirit level.' },
        { title: 'Lay tiles up the roof', body: 'Broken-bond pattern — each tile centres over the join below. Push each up until it hooks over batten and sits on tile below.', watchFor: 'Non-broken-bond concentrates water down consistent lines. Broken bond distributes water shed.' },
        { title: 'Nail or clip tiles per spec + wind class', body: 'AS 2050 covers tile roof installation. Concrete tiles: nail every 4th in N1–N3, every tile in N4+ and cyclonic. Clay: often clipped. Check schedule.', watchFor: 'Under-nailed roof in cyclonic zone = tiles fly off first big storm. Follow the wind-class schedule.' },
        { title: 'Cut tiles at hips + valleys', body: 'Mark cut where tiles meet hip or valley. Wet saw or angle grinder with diamond blade. PPE for silica.', watchFor: 'Silica is regulated occupational hazard. FFP3 mask + eye pro; wet-cut where possible.' },
        { title: 'Fit valley trays + ridge / hip caps', body: 'Valley trays UNDER tiles at internal intersections. Ridge + hip caps ON TOP, mortar-bedded or dry-fix.', watchFor: 'Mortar-bedded ridges crack as roof moves. Dry-fix is dearer but avoids the callback.' },
      ],
    },
  },
  {
    id: 'install-soffit',
    category: 'roofing-cladding',
    label: 'Install soffit lining',
    summary: 'Bearer to wall, cut sheets, fix to bearer + fascia, vent.',
    nz: {
      tools: ['Tape', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Staple gun', 'Chalk line', 'Utility knife', 'Ladder / trestle'],
      materials: ['Soffit lining: HardieSoffit (fibre-cement, pre-primed), or plywood (marine or exterior), or PVC', 'Soffit bearer: 40×20 or 90×45 H3.2 pine, screwed to wall studs', 'Fixings: 30 mm bugle screws or stainless steel staples for FC / ply', 'Sealant (paintable acrylic) for joins', 'Soffit vents (round or slot type) if roof needs ventilation'],
      steps: [
        { title: 'Set out the bearer along the wall', body: 'Snap a chalk line on the wall at soffit height (measured down from fascia level minus soffit thickness). Fix soffit bearer along that line into wall studs with 65 mm bugle screws.', watchFor: 'Bearer height is critical — if it\'s off, the soffit tilts and any join gaps. Level the bearer along its full run.' },
        { title: 'Confirm soffit width', body: 'Measure from wall face to inside of fascia. That\'s your soffit sheet width. If unsupported span is > 450 mm, add an intermediate bearer or rafter tail bird\'s-mouth support.', watchFor: 'Long unsupported spans sag over time. Add intermediate support for anything over 600 mm.' },
        { title: 'Cut sheets to width', body: 'Rip HardieSoffit or plywood on the drop saw or circular saw. Wear PPE for FC — silica dust. Cut lengths to run along the eave.', watchFor: 'FC dust is regulated occupational hazard in NZ (WorkSafe). Wet-cut or vac-attach; FFP3 mask.' },
        { title: 'Fix sheets to bearer + fascia', body: 'Push sheet up between bearer and fascia. Fix into bearer with 30 mm bugle screws or staples at 200 mm c/c. Fix into fascia with same spacing.', watchFor: 'FC sheet edges are brittle. Pre-drill if fixing close to edge (within 15 mm) to avoid cracking.' },
        { title: 'Join sheet ends over a bearer', body: 'Any sheet-to-sheet join must land ON a bearer or rafter tail — never mid-span. Seal the join with paintable acrylic sealant.', watchFor: 'A mid-span join telegraphs a visible bump forever. Line up joins over supports only.' },
        { title: 'Cut in soffit vents', body: 'If the roof needs ventilation (most NZ roofs do — E3 requires airflow into skillion / cathedral roofs), cut round or slot vents through the soffit at spacing per manufacturer.', watchFor: 'Un-vented sarking roofs cook in summer + condense in winter. If E3 requires vents, don\'t skip them.' },
        { title: 'Seal edges + prep for paint', body: 'Sealant along the wall edge + fascia edge to close any gap. Prime any exposed cut edges. Painting is a separate job for the painter.', watchFor: 'Unsealed edges let water into the framing above. Seal every join before knock-off.' },
      ],
    },
    au: {
      tools: ['Tape', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Staple gun', 'Chalk line', 'Utility knife', 'Ladder / trestle'],
      materials: ['Soffit lining: HardieSoffit (fibre-cement), plywood (marine / exterior), or PVC', 'Soffit bearer: 40×20 or 90×45 H3-treated pine, screwed to wall studs', 'Fixings: 30 mm Type 17 or stainless staples for FC / ply', 'Sealant (paintable acrylic) for joins', 'Soffit vents (per NCC requirements + wind class)'],
      steps: [
        { title: 'Set out the bearer along the wall', body: 'Chalk line on wall at soffit height (fascia level minus soffit thickness). Fix bearer along that line into wall studs with 65 mm Type 17s.', watchFor: 'Bearer height critical — off = soffit tilts + joins gap. Level the bearer along its run.' },
        { title: 'Confirm soffit width', body: 'Measure wall face to inside of fascia. That\'s your sheet width. Unsupported span > 450 mm needs intermediate support.', watchFor: 'Long unsupported spans sag. Intermediate support over 600 mm.' },
        { title: 'Cut sheets to width', body: 'Rip HardieSoffit or ply on drop / circular saw. PPE for FC — silica dust. Cut lengths to run along eave.', watchFor: 'FC dust is regulated (SafeWork). Wet-cut or vac-attach; FFP3 mask.' },
        { title: 'Fix sheets to bearer + fascia', body: 'Push sheet up between bearer + fascia. Type 17s or staples at 200 mm c/c into bearer + fascia.', watchFor: 'FC edges brittle. Pre-drill within 15 mm of edge to avoid cracking.' },
        { title: 'Join sheet ends over a bearer', body: 'Sheet-to-sheet joins land ON a bearer or rafter tail — never mid-span. Seal join with paintable acrylic.', watchFor: 'Mid-span join telegraphs a permanent bump. Join over supports only.' },
        { title: 'Cut in soffit vents', body: 'Roof ventilation per NCC — sarked / cathedral roofs typically need airflow. Cut round or slot vents through soffit per manufacturer spacing.', watchFor: 'Un-vented sarking roofs cook in summer + condense in winter. If NCC requires vents, don\'t skip.' },
        { title: 'Seal edges + prep for paint', body: 'Sealant along wall + fascia edges. Prime exposed cut edges. Painting is a separate job.', watchFor: 'Unsealed edges let water into framing above. Seal every join before knock-off.' },
      ],
    },
  },
  {
    id: 'install-cavity-battens',
    category: 'roofing-cladding',
    label: 'Install cavity battens',
    summary: 'Vermin mesh, vertical battens, cavity closer top + bottom.',
    nz: {
      tools: ['Tape', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Utility knife', 'Sealant gun', 'String line'],
      materials: ['Battens: 20 mm × 45 mm H3.2 kiln-dried pine (per E2/AS1 cavity depth)', '75 mm bugle screws (through batten + wrap into stud)', 'Vermin mesh (galv or SS, ~5 mm mesh) at cavity base', 'Insect screen / cavity closer at top of cavity', 'Neutral-cure sealant'],
      steps: [
        { title: 'Confirm cavity depth requirement', body: 'E2/AS1 requires a drained + ventilated cavity for absorbent claddings (weatherboards, most fibre-cement, natural stone). Cavity depth 20 mm is the standard NZ minimum.', watchFor: 'Direct-fix (no cavity) is only allowed for specific claddings + only in some risk zones. Check the E2 risk matrix — assuming direct-fix is OK where cavity is required is a common consent-failure.' },
        { title: 'Fit vermin mesh at cavity base', body: 'Roll or push vermin mesh into the space where the bottom of the cavity will be, over the bottom plate + wrap. Fold up 25 mm each side. Mesh stops rodents + insects entering the cavity.', watchFor: 'Uncovered cavity base = mice + wasps nest in the wall. Not optional in a full-cavity system.' },
        { title: 'Mark stud positions on the wrap', body: 'Battens fix to studs, not to the wrap itself. Snap a chalk line down each stud line, or mark with pencil, so you know where to fix.', watchFor: 'Missing the stud = screw only grips the wrap, and the batten pulls off the first time the cladder leans on it.' },
        { title: 'Cut + fix battens vertically', body: 'Cut 20 mm × 45 mm H3.2 pine battens to wall height. Position over each stud line, screw through into stud with 75 mm bugle screws at 300 mm c/c.', watchFor: 'Batten fixings should be long enough to grip a good depth of stud through the wrap — 75 mm minimum.' },
        { title: 'String-line for straightness', body: 'Once all battens are up, pull a string along top + bottom to check straightness. Pack out any low batten with off-cut shims + screw off.', watchFor: 'Bowed battens telegraph through the cladding as a visible wave. Get straight before cladder starts.' },
        { title: 'Fit horizontal top cavity closer', body: 'At top of wall (below soffit) fit a proprietary cavity closer or a horizontal batten with insect screen. Provides ventilation exit for the cavity.', watchFor: 'A cavity without a top-of-wall vent doesn\'t breathe — moisture stays in and rots the framing. Ventilate top + bottom.' },
        { title: 'Trim + seal around openings', body: 'Cavity closers or trim strips around windows + doors — proprietary product from cladding supplier. Seal any exposed batten cut ends.', watchFor: 'A cavity that terminates in a raw opening leaks air + collects water. Close it off with the manufacturer\'s detail.' },
      ],
    },
    au: {
      tools: ['Tape', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Utility knife', 'Sealant gun', 'String line'],
      materials: ['Battens: 20 mm × 45 mm H3-treated pine (some states + wind classes 40 mm)', '75 mm Type 17 screws (through batten + wrap into stud)', 'Vermin mesh (galv or SS, ~5 mm mesh) at cavity base', 'Insect screen / cavity closer at top', 'Neutral-cure sealant'],
      steps: [
        { title: 'Confirm cavity depth + requirement', body: 'NCC Vol 2 3.5 covers weatherproofing; some cladding systems (weatherboards over sarking, most FC systems) require cavity for drainage. Depth 20 mm min, more in high-exposure climate zones.', watchFor: 'Direct-fix vs cavity is cladding-specific. Check the cladding manufacturer\'s install guide — assuming direct-fix where cavity is spec\'d fails the compliance.' },
        { title: 'Fit vermin mesh at cavity base', body: 'Roll or push vermin mesh into space over bottom plate + wrap. Fold up 25 mm each side. Stops rodents + insects entering cavity.', watchFor: 'Uncovered cavity base = mice + wasps + termite pathway. Not optional.' },
        { title: 'Mark stud positions on the wrap', body: 'Battens fix to studs, not wrap. Chalk down each stud line, or pencil-mark, so you know where to fix.', watchFor: 'Missing the stud = screw grips only wrap, batten pulls off when cladder leans on it.' },
        { title: 'Cut + fix battens vertically', body: 'Cut 20×45 H3 pine to wall height. Position over each stud line, screw through with 75 mm Type 17s at 300 mm c/c.', watchFor: 'Fixings must grip good stud depth through wrap — 75 mm min.' },
        { title: 'String-line for straightness', body: 'Once all battens up, pull string top + bottom to check straightness. Pack low battens with shims + screw off.', watchFor: 'Bowed battens telegraph through cladding as visible waves. Straight before cladder starts.' },
        { title: 'Fit horizontal top cavity closer', body: 'At top of wall (below soffit) fit proprietary cavity closer or horizontal batten with insect screen. Ventilation exit for cavity.', watchFor: 'Cavity without top vent doesn\'t breathe — moisture stays in and rots framing. Ventilate top + bottom.' },
        { title: 'Trim + seal around openings', body: 'Cavity closers / trim strips around windows + doors — proprietary from cladding supplier. Seal exposed cut ends.', watchFor: 'Cavity terminating in a raw opening leaks air + collects water. Close off with manufacturer detail.' },
      ],
    },
  },
  {
    id: 'install-weatherboards',
    category: 'roofing-cladding',
    label: 'Install weatherboard cladding',
    summary: 'Story rod, starter strip, first board, up the wall, corners.',
    nz: {
      tools: ['Chalk line', 'Drop / block saw', 'Hammer', 'Cordless drill', 'Tape', 'Spirit level', 'Mitre saw', 'Sealant gun', 'Story rod', 'Nail punch'],
      materials: ['Weatherboards: Bevel-back, rusticated, or shiplap H3.2 dressed pine (or Palliside / Titan pre-primed)', 'Starter strip / cill trim (matches profile)', 'Corner mould or scriber board', 'Nails: 60 mm hot-dipped galv jolt-head, or stainless steel for coastal', 'Primer / undercoat for cut ends', 'Paintable acrylic sealant', 'Head + sill flashings (colour-matched, ordered with joinery)'],
      steps: [
        { title: 'Set out with a story rod', body: 'Make a story rod (a straight timber marked with each board course from eave down to sill height). The rod is your reference for every wall — every board lines up with rod marks.', watchFor: 'Setting out by measuring each course cumulatively drifts. Use one story rod everywhere so courses land at the same height on every wall.' },
        { title: 'Fix starter strip at wall base', body: 'Starter strip (a tapered strip matching the board thickness) fixes at the bottom of the wall, over the cavity closer. Level it dead — first board picks up this level.', watchFor: 'A crooked starter strip = every course above crooked. Level with a long spirit level or laser.' },
        { title: 'Prime all cut ends', body: 'Every cut end of every board gets a coat of primer before fixing. Cut ends absorb water fastest — unprimed = rot within 5 years.', watchFor: 'Skipping primer on cut ends is one of the top-3 causes of premature rot in weatherboard walls.' },
        { title: 'Lay first board along starter', body: 'Push first board tight against starter, level along top edge. Check with string line for straightness along the run.', watchFor: 'First board out of level compounds up the wall. Take the time to level.' },
        { title: 'Blind-nail per profile', body: 'Bevel-back: nail high on the board so next board covers the nail. Rusticated: nail through the tongue so next board hides it. Shiplap: nail through the lap. Nail into studs, not just cavity battens.', watchFor: 'Face-nailing (visible nails on the board face) is only correct for some profiles. Check the profile spec — face-nailed where blind-nailed is spec\'d looks amateur.' },
        { title: 'Cut in around openings', body: 'Boards under a sill: cut with a scribed profile to fit under sill flashing. Boards over a head flashing: undercut so head flashing tucks under the board. Cut around the opening jamb-to-jamb.', watchFor: 'Boards over head flashings without the head flashing tucking UNDER the board = water gets behind the flashing. Check the E2/AS1 detail sheet.' },
        { title: 'Fit corner mould + scriber', body: 'External corners: corner mould (a two-piece box) fixed over the corner. Internal corners: scriber board runs vertically. Set out on ground first, fit as boards approach the corner.', watchFor: 'Corner detail depends on architect + region. External weatherboard corners without a corner mould look unfinished; some architects prefer mitred corners — check the plan.' },
      ],
    },
    au: {
      tools: ['Chalk line', 'Drop / block saw', 'Hammer', 'Cordless drill', 'Tape', 'Spirit level', 'Mitre saw', 'Sealant gun', 'Story rod', 'Nail punch'],
      materials: ['Weatherboards: H3-treated pine (bevel, rusticated, shiplap), or Weathertex, or cedar profiles', 'Starter strip / cill trim (matches profile)', 'Corner mould or scriber board', 'Nails: 60 mm hot-dipped galv jolt-head, or stainless for coastal (BAL / marine zones)', 'Primer / undercoat for cut ends', 'Paintable acrylic sealant', 'Head + sill flashings (colour-matched)'],
      steps: [
        { title: 'Set out with a story rod', body: 'Make a story rod marked with each course from eave to sill. Rod is reference for every wall — courses line up on marks everywhere.', watchFor: 'Cumulative-measuring each course drifts. Use one rod everywhere so courses land at same height on every wall.' },
        { title: 'Fix starter strip at wall base', body: 'Tapered starter strip matching board thickness, fixed at base of wall over cavity closer. Level dead — first board picks up this level.', watchFor: 'Crooked starter = every course above crooked. Long level or laser.' },
        { title: 'Prime all cut ends', body: 'Every cut end of every board gets primer before fixing. Cut ends absorb water fastest — unprimed = rot in 5 years.', watchFor: 'Skipping cut-end primer = top-3 cause of premature weatherboard rot.' },
        { title: 'Lay first board along starter', body: 'Push first board tight against starter, level along top edge. String line for straightness along the run.', watchFor: 'First board out of level compounds up the wall. Take time to level.' },
        { title: 'Blind-nail per profile', body: 'Bevel-back: nail high, next board covers. Rusticated: nail through tongue. Shiplap: nail through lap. Nail into studs, not just cavity battens.', watchFor: 'Face-nailing (visible nails) only correct for some profiles. Check spec — face where blind is spec\'d looks amateur.' },
        { title: 'Cut in around openings', body: 'Under sill: scribe to fit under sill flashing. Over head flashing: undercut so flashing tucks under the board. Cut jamb-to-jamb.', watchFor: 'Head flashings not tucking UNDER the board = water gets behind. Check NCC Vol 2 3.5 detail.' },
        { title: 'Fit corner mould + scriber', body: 'External corners: mould box over the corner. Internal: scriber board vertical. Set out first, fit as boards approach.', watchFor: 'External weatherboard corners without a mould look unfinished; some architects want mitred. Check plan.' },
      ],
    },
  },
  {
    id: 'install-fc-cladding',
    category: 'roofing-cladding',
    label: 'Install fibre-cement sheet cladding',
    summary: 'Read install guide, sheet layout, cut with PPE, fix + join.',
    nz: {
      tools: ['Fibre-cement shears or scoring knife', 'Circular saw with diamond blade + vac attachment', 'Chalk line', 'Cordless drill / impact driver', 'Tape', 'Sealant gun', 'PPE: FFP3 mask, safety glasses, gloves'],
      materials: ['Fibre-cement sheet: James Hardie Linea, HardiePanel, HardiePlank, or HardieFlex (per plan)', 'Cavity battens (already installed — see prior job)', 'Fixings: colour-matched screws or nails per Hardie spec (varies by product)', 'Sealant + flashing tape', 'Vertical jointer strip or corner box (per detail)', 'Head + sill flashings (colour-matched)'],
      steps: [
        { title: 'Read the James Hardie install guide', body: 'Every Hardie product has its own guide — Linea, HardiePanel, HardieFlex all install differently. Print the guide for the specific product on your job and keep it on site.', watchFor: 'Warranty depends on installation per manufacturer\'s guide. Any variation = warranty void. Read the guide, don\'t assume.' },
        { title: 'Set out sheet layout', body: 'Start layout from a corner or a feature (window, door). Ideally, cuts on the ends of walls, full sheets in the middle. Mark stud positions on cavity battens so screws land in structure.', watchFor: 'Random layout with cuts scattered across the wall looks amateur. Plan for full sheets in main visible zones.' },
        { title: 'Cut sheets with PPE', body: 'FC shears for straight cuts; circular saw with a Hardie-approved diamond blade + vac attachment for long cuts. WEAR FFP3 mask + safety glasses — silica dust is a regulated occupational hazard.', watchFor: 'Cutting FC without dust control on a job site is a WorkSafe / SafeWork prosecution risk. Vac-attach or wet-cut, mask on.' },
        { title: 'Fix sheets to cavity battens', body: 'Screw or nail through the sheet into the cavity batten (which is fixed to the stud) with the manufacturer-spec\'d fastener. Spacing typically 200 mm at perimeter, 300 mm in the field.', watchFor: 'Under-fixing = sheet flaps in wind. Over-driving fasteners crushes the sheet face and shows through the paint. Snug is the goal.' },
        { title: 'Handle vertical joins per system', body: 'Some Hardie systems use a proprietary jointer strip (recessed join); others sealant-bed the vertical join between sheets over a cavity batten. Choose per the install guide.', watchFor: 'Face-butted joins without sealant crack + move + let water in. Use jointer strip or sealant per manufacturer.' },
        { title: 'Cut in around openings', body: 'Under sill: cut fits UNDER sill flashing. Over head flashing: sheet undercut so head flashing tucks under. Around jambs: sealant fill or trim strip per detail.', watchFor: 'Wrong flashing sequence = water behind cladding. Head under sheet, sheet under sill flashing above.' },
        { title: 'Fit corner mould / box + trim', body: 'External corners: proprietary corner box (colour-matched aluminium) or sheet mitre + sealant. Internal: sealant + scriber. Set out corners before fitting.', watchFor: 'Field-mitred FC corners open up over time. Corner box is more expensive but doesn\'t crack.' },
        { title: 'Prime cut edges + prep for paint', body: 'Prime any cut / exposed edge before painting. Painter finishes with the spec\'d exterior paint system.', watchFor: 'Unprimed cut edges soak water even after painting. Prime before painter arrives.' },
      ],
    },
    au: {
      tools: ['Fibre-cement shears or scoring knife', 'Circular saw with diamond blade + vac attachment', 'Chalk line', 'Cordless drill / impact driver', 'Tape', 'Sealant gun', 'PPE: FFP3 mask, safety glasses, gloves'],
      materials: ['Fibre-cement sheet: James Hardie Linea, HardiePanel, EasyLap, Scyon (per plan)', 'Cavity battens (already installed)', 'Fixings: colour-matched per Hardie spec', 'Sealant + flashing tape', 'Vertical jointer strip or corner box', 'Head + sill flashings (colour-matched)'],
      steps: [
        { title: 'Read the James Hardie install guide', body: 'Every Hardie product has its own guide — Linea, EasyLap, Scyon all install differently. Print the guide for the specific product on your job.', watchFor: 'Warranty depends on install per manufacturer. Variation = warranty void. Read, don\'t assume.' },
        { title: 'Set out sheet layout', body: 'Start from corner or feature. Cuts at wall ends, full sheets in the middle. Mark stud positions on cavity battens.', watchFor: 'Random cuts across the wall look amateur. Plan full sheets in main visible zones.' },
        { title: 'Cut sheets with PPE', body: 'FC shears for straight cuts; circular saw + Hardie-approved diamond blade + vac attachment for long cuts. FFP3 mask + eye pro. Silica is a regulated occupational hazard.', watchFor: 'Cutting FC without dust control = SafeWork prosecution risk. Vac-attach or wet-cut, mask on.' },
        { title: 'Fix sheets to cavity battens', body: 'Screw / nail through sheet into batten (fixed to stud) with Hardie-spec\'d fastener. Typically 200 mm perimeter, 300 mm field.', watchFor: 'Under-fixed = sheet flaps in wind. Over-driven fasteners crush the face and show through paint. Snug is the goal.' },
        { title: 'Handle vertical joins per system', body: 'Some systems use proprietary jointer (recessed); others sealant-bed vertical join over a cavity batten. Per install guide.', watchFor: 'Face-butted without sealant cracks + lets water in. Jointer or sealant per manufacturer.' },
        { title: 'Cut in around openings', body: 'Under sill: cut fits UNDER sill flashing. Over head: sheet undercut so head flashing tucks under. Around jambs: sealant or trim strip.', watchFor: 'Wrong flashing sequence = water behind cladding. Head under sheet, sheet under sill above.' },
        { title: 'Fit corner mould / box + trim', body: 'External corners: proprietary box (colour-matched aluminium) or sheet mitre + sealant. Internal: sealant + scriber. Set out first.', watchFor: 'Field-mitred FC corners open over time. Corner box is dearer but doesn\'t crack.' },
        { title: 'Prime cut edges + prep for paint', body: 'Prime any cut / exposed edge before painting. Painter finishes with spec\'d exterior paint.', watchFor: 'Unprimed cut edges soak water even after painting. Prime before painter arrives.' },
      ],
    },
  },

  // ─── Doors & windows — installed once building is weather-tight ──────────
  {
    id: 'install-window',
    category: 'doors-windows',
    label: 'Install a window',
    summary: 'Sill flashing, tape sequence, pack + plumb, screw off.',
    nz: {
      tools: ['Tape', 'Spirit level (short + long)', 'Cordless drill / impact driver', 'Drop / circular saw', 'Sealant gun', 'Staple gun', 'Utility knife', 'Hammer', 'Ladder / trestle'],
      materials: ['Window unit (aluminium joinery: APL group — Vantage / Metro / Altherm)', 'Timber or plastic packers', 'Sill flashing (extruded metal, colour-matched)', 'Sill flashing tape (butyl, 300 mm wide typical)', 'Jamb + head flashing tape', 'Neutral-cure sealant (Bostik or Sika)', '65 mm bugle screws through window flange'],
      steps: [
        { title: 'Read the plan + confirm rough opening', body: 'Get window unit size, opening height + width from plan. Rough opening = window frame size + 15–20 mm clearance each side + 20 mm packing at sill for adjustment.', watchFor: 'Ordering windows without confirming actual rough opening (post-framing) causes weeks of delay. Measure once framing is up, not off drawings.' },
        { title: 'Fit sill flashing under wrap', body: 'Slot the extruded metal sill flashing into the sill of the framing opening. Slopes AWAY from house at 15° min. Turn ends up 25 mm at each jamb. E2/AS1 requires this on any window in an absorbent cladding or cavity system.', watchFor: 'Sill flashing fitted flat or reversed puts water back into the sill framing. Slope OUT — every time.' },
        { title: 'Apply sill flashing tape', body: 'Butyl or self-adhesive flashing tape over the sill flashing, extending up each jamb at least 250 mm. Bond the tape by hand-rolling it — no air pockets.', watchFor: 'Cold weather (<10 °C) stops butyl tape adhering. Warm the surface with a heat gun or postpone.' },
        { title: 'Position window in opening', body: 'Lift into opening, sit on sill packers to bring to correct RL. Pack jambs so window flange sits proud of framing face by 3–5 mm (allows for cladding thickness). Plumb + level in both directions.', watchFor: 'Windows out of level bind on the sash rails. Get level within 2 mm before screwing off.' },
        { title: 'Screw window flange to framing', body: 'Screw through window flange into stud/head/sill at 300 mm c/c. Start at one bottom corner, move around to opposite corner (checking plumb + level as you go).', watchFor: 'Overtightening warps the flange and cracks the seal. Snug — not gorilla-tight.' },
        { title: 'Tape jamb + head flashings over flange', body: 'Jamb tape goes OVER the window flange + up onto the wrap. Head tape goes ON TOP OF the jamb tape at corners (weather-lap direction — water sheds down and out).', watchFor: 'Getting the tape sequence wrong (head-under-jamb or jamb-under-sill) creates a funnel that channels water INTO the cavity. Sill first, jambs next, head last.' },
        { title: 'Check operation + weatherseals', body: 'Slide / open every sash — should glide, latch cleanly, and seal against the frame weatherstrip. Adjust rollers if binding.', watchFor: 'A sash that binds now will get worse as the frame settles. Fix it before you finish the day, not after linings go on.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (short + long)', 'Cordless drill / impact driver', 'Drop / circular saw', 'Sealant gun', 'Staple gun', 'Utility knife', 'Hammer', 'Ladder / trestle'],
      materials: ['Window unit (aluminium joinery: A&L / Trend / Rylock / Stegbar) — BAL-rated in bushfire zones', 'Timber or plastic packers', 'Sill flashing (extruded, colour-matched)', 'Sill flashing tape (butyl, 300 mm wide typical)', 'Jamb + head flashing tape', 'Neutral-cure sealant', '65 mm Type 17 screws through window flange'],
      steps: [
        { title: 'Read the plan + confirm rough opening', body: 'Get window unit size, opening dims from plan. Rough opening = frame size + 15–20 mm each side + 20 mm packing at sill. AS 2047 governs window installation; NCC Vol 2 3.5 covers weatherproofing.', watchFor: 'In BAL zones (BAL 12.5 and up), the window unit itself must be BAL-rated — check the compliance sticker matches the permit before installing.' },
        { title: 'Fit sill flashing under wrap', body: 'Extruded metal sill flashing slotted into the framing sill, sloped AWAY from house at 15° min. Ends turned up 25 mm at jambs.', watchFor: 'Sill flashing fitted flat or reversed puts water back into the sill framing. Slope OUT.' },
        { title: 'Apply sill flashing tape', body: 'Butyl or self-adhesive flashing tape over sill flashing, up each jamb at least 250 mm. Hand-roll to bond.', watchFor: 'Cold weather (<10 °C) stops butyl adhering. Warm with heat gun or postpone.' },
        { title: 'Position window in opening', body: 'Lift in, sit on sill packers to correct RL. Pack jambs so flange sits 3–5 mm proud of framing face. Plumb + level both directions.', watchFor: 'Out-of-level windows bind on the sash rails. Level within 2 mm before screwing.' },
        { title: 'Screw window flange to framing', body: 'Type 17s through flange into stud/head/sill at 300 mm c/c. Start bottom corner, work around to opposite corner, checking plumb + level.', watchFor: 'Overtightening warps flange and cracks the seal. Snug, not gorilla-tight.' },
        { title: 'Tape jamb + head flashings over flange', body: 'Jamb tape OVER flange + onto wrap. Head tape ON TOP OF jamb tape at corners — water sheds down and out.', watchFor: 'Wrong tape sequence creates a funnel INTO the cavity. Sill first, jambs next, head last.' },
        { title: 'Check operation + weatherseals', body: 'Slide / open every sash — must glide, latch cleanly, seal against weatherstrip. Adjust rollers if binding.', watchFor: 'A sash that binds now gets worse as the frame settles. Fix before end of day.' },
      ],
    },
  },
  {
    id: 'install-external-door',
    category: 'doors-windows',
    label: 'Install an external door',
    summary: 'Threshold, weatherseal, plumb jamb, latch + lock.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Chisel', 'Hammer', 'Drop saw', 'Sealant gun', 'Utility knife', 'Screwdriver', 'Hole saw kit (54 mm + 25 mm for lockset)'],
      materials: ['External door slab (solid core, exterior-grade) or pre-hung set', 'Door jamb + head (H3.2 or dry-treated pine, weatherproofed)', 'Threshold / sill (aluminium extruded, weatherstrip-ready)', 'Weatherseal strip (compression seal for jambs + head)', 'Packers', '75 mm bugle screws through jamb', 'Sealant (neutral-cure)', 'Lockset (Yale, Lockwood, or spec\'d)', 'Butt hinges (3 per door, 100 × 75 × 3 mm heavy-duty)'],
      steps: [
        { title: 'Confirm opening + door dimensions', body: 'Rough opening = jamb width + door width + 15 mm clearance each side. Head height = door + jamb + 10 mm clearance. Confirm threshold detail matches what\'s spec\'d.', watchFor: 'External openings often need reinforced jamb studs. Check the framing plan — under-sized studs to a heavy exterior door will bow.' },
        { title: 'Fit threshold + flashing tape', body: 'Slot aluminium threshold into sill. Apply butyl flashing tape over threshold onto sill framing + up each jamb 250 mm. E2/AS1 requires continuous flashing at any external door.', watchFor: 'Wooden thresholds under-flashed rot within 5 years. Use extruded aluminium with a factory weatherseal channel.' },
        { title: 'Position pre-hung jamb (or build jamb in situ)', body: 'Sit pre-hung frame in opening on threshold. Pack under sill and jambs. If building jamb in situ: fix head first, jamb sides second, threshold last. Check jamb width matches door + 5 mm gap total.', watchFor: 'A pre-hung external door + frame is 30+ kg. Solo works but awkward to hold vertical + push into a snug opening — a hand keeps it from tipping.' },
        { title: 'Plumb hinge-side jamb + fix', body: 'Long spirit level on hinge-side jamb. Pack + plumb both faces. Fix through jamb into stud with 75 mm bugle screws — one screw behind each hinge, one at top, one at bottom, one at latch strike height.', watchFor: 'Plumb ONE face at a time, both must be plumb. A jamb plumb in one plane and tilted in the other means the door sags to one side when opened.' },
        { title: 'Hang door + check swing', body: 'If pre-hung, door is already on. If not: fit 3× 100 mm butt hinges (top, middle, bottom), lift door onto hinge pins. Test swing — should not bind on jamb, threshold, or head.', watchFor: 'Bind on the latch side = jamb not plumb OR door not squared to jamb. Adjust packers before permanently screwing.' },
        { title: 'Fix latch-side jamb + install strike', body: 'Close door + pack latch-side jamb to a consistent 3 mm gap along the full length. Fix through packers with 75 mm bugle screws. Fit strike plate into jamb — chisel out, screw off.', watchFor: 'Inconsistent latch-side gap = door won\'t latch cleanly. 3 mm dead all the way top-to-bottom.' },
        { title: 'Install lockset + deadbolt', body: 'Mark and bore for tubular latch (54 mm face bore + 25 mm edge bore). Fit latch + strike, then handle set. If deadbolt, second bore at head-height.', watchFor: 'Miscalculated bore centres = latch doesn\'t catch in the strike. Measure from door edge to bore centre (backset — usually 60 or 70 mm), not the strike hole.' },
        { title: 'Seal perimeter + fit weatherstripping', body: 'Sealant bead around external face of jamb + head (not sill — sill is threshold). Fit compression weatherstrip into jamb weatherstrip channel.', watchFor: 'Air-tightness of the door is what stops draughts + water infiltration. Weatherstrip that doesn\'t compress = leaky door.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Chisel', 'Hammer', 'Drop saw', 'Sealant gun', 'Utility knife', 'Screwdriver', 'Hole saw kit (54 mm + 25 mm for lockset)'],
      materials: ['External door slab (solid core, exterior-grade — BAL-rated in bushfire zones) or pre-hung set', 'Door jamb + head (H3-treated pine or weatherproofed hardwood)', 'Threshold / sill (aluminium extruded)', 'Weatherseal strip', 'Packers', '75 mm Type 17 screws through jamb', 'Sealant (neutral-cure)', 'Lockset (Lockwood, Yale, or spec\'d — some states have min security ratings)', 'Butt hinges (3 per door, 100 × 75 × 3 mm heavy-duty)'],
      steps: [
        { title: 'Confirm opening + door dimensions', body: 'Rough opening = jamb width + door width + 15 mm clearance each side. Head height = door + jamb + 10 mm. In BAL zones, confirm door slab is BAL-rated (solid timber or metal, no glazing above BAL 29 for most doors).', watchFor: 'External openings often need reinforced jamb studs. Check framing plan — under-sized studs bow under a heavy exterior door.' },
        { title: 'Fit threshold + flashing tape', body: 'Slot aluminium threshold into sill. Butyl flashing tape over threshold onto sill framing + up each jamb 250 mm. NCC Vol 2 3.5 requires continuous flashing at external doors.', watchFor: 'Wooden thresholds without proper flashing rot within 5 years. Extruded aluminium with factory weatherseal channel.' },
        { title: 'Position pre-hung jamb (or build in situ)', body: 'Sit pre-hung frame in opening on threshold. Pack under sill + jambs. If building in situ: head first, jamb sides second, threshold last. Jamb width = door + 5 mm total gap.', watchFor: 'Pre-hung external door + frame is 30+ kg. Solo works but awkward — a hand keeps it from tipping into a snug opening.' },
        { title: 'Plumb hinge-side jamb + fix', body: 'Long spirit level on hinge-side jamb. Pack + plumb both faces. Fix through jamb into stud with 75 mm Type 17s — one behind each hinge, top, bottom, latch strike height.', watchFor: 'Plumb ONE face at a time — both faces must be plumb. Plumb one plane + tilted other = door sags to one side.' },
        { title: 'Hang door + check swing', body: 'If pre-hung, door is on. If not: fit 3× butt hinges, lift onto pins. Test swing — no bind on jamb, threshold, or head.', watchFor: 'Latch-side bind = jamb not plumb OR door not squared. Adjust packers before permanent screwing.' },
        { title: 'Fix latch-side jamb + strike', body: 'Close door + pack latch-side jamb to 3 mm gap all the way. Fix through packers. Chisel strike into jamb, screw off.', watchFor: 'Inconsistent gap = won\'t latch cleanly. 3 mm dead top to bottom.' },
        { title: 'Install lockset + deadbolt', body: 'Bore for tubular latch (54 mm face + 25 mm edge). Fit latch + strike + handle set. Deadbolt at head height if spec\'d.', watchFor: 'Miscalculated bore = latch doesn\'t catch strike. Measure edge to bore centre (backset — 60 or 70 mm), not strike hole.' },
        { title: 'Seal perimeter + fit weatherstripping', body: 'Sealant bead around external jamb + head. Compression weatherstrip into channel.', watchFor: 'Air-tightness stops draughts + water. Uncompressed weatherstrip = leaky door.' },
      ],
    },
  },
  {
    id: 'hang-internal-door',
    category: 'doors-windows',
    label: 'Hang an internal pre-hung door',
    summary: 'Frame into opening, plumb, screw, check swing.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Chisel', 'Hammer', 'Handsaw or drop saw', 'Utility knife'],
      materials: ['Pre-hung internal door (hollow-core or solid, jamb + head pre-assembled)', 'Timber packers (thin cedar or hardwood)', '75 mm bugle screws (jamb to stud)', 'Architrave stock (fit after wall linings)'],
      steps: [
        { title: 'Check opening size against jamb', body: 'Rough opening = jamb width + 10 mm clearance total (5 mm each side). Head height = jamb height + 10 mm.', watchFor: 'Over-sized opening + jamb too small = long packers needed on both sides. Under-size = jamb won\'t fit. Measure both before ordering.' },
        { title: 'Position pre-hung frame in opening', body: 'Lift frame into opening, sit on floor. If flooring is already down, the frame sits on the floor; if not, sit on 15 mm packers so the jamb ends up ~15 mm above floor for carpet clearance.', watchFor: 'Solo works for a standard hollow-core pre-hung. Grab a hand for solid-core or wide double sets — a dropped frame chips the jamb corners.' },
        { title: 'Pack hinge-side jamb + plumb', body: 'Slide packers between jamb and stud, behind each hinge + at top + at bottom. Long spirit level on the hinge-side jamb — plumb BOTH faces. Adjust packers until plumb.', watchFor: 'Plumb hinge-side FIRST. Latch-side gets adjusted to the door once hinge-side is set.' },
        { title: 'Fix hinge-side jamb', body: 'Through packers into stud with 75 mm bugle screws — one behind each hinge, one at top, one at bottom. Recheck plumb after each screw.', watchFor: 'Overdriving screws pulls the jamb toward the stud and bows the packer. Snug, not driven.' },
        { title: 'Check door swings freely', body: 'Test the door — should swing smoothly, not bind on jamb, sag open or closed, or catch on the floor. If it binds, hinge-side isn\'t plumb.', watchFor: 'A door that swings open or closed by itself = jamb tilted forward or back. Re-plumb before fixing latch side.' },
        { title: 'Pack + fix latch-side jamb', body: 'Close door. Pack latch-side jamb to a consistent 3 mm gap all the way top to bottom. Fix through packers with 75 mm bugle screws — one at top, middle, and latch strike height.', watchFor: 'Inconsistent latch gap looks amateur and can catch the door. 3 mm dead all the way.' },
        { title: 'Cut packers flush + tidy', body: 'Utility knife along the wall face to snap off protruding packers. Vacuum any debris. Architraves fit after the wall linings are done.', watchFor: 'Leaving packers proud stops the architrave sitting flush. Trim before you leave the room.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Chisel', 'Hammer', 'Handsaw or drop saw', 'Utility knife'],
      materials: ['Pre-hung internal door (hollow-core or solid, jamb + head pre-assembled)', 'Timber packers', '75 mm Type 17 screws', 'Architrave stock (fit after linings)'],
      steps: [
        { title: 'Check opening size against jamb', body: 'Rough opening = jamb width + 10 mm total (5 mm each side). Head height = jamb + 10 mm.', watchFor: 'Over-sized = long packers both sides. Under-size = won\'t fit. Measure both before ordering.' },
        { title: 'Position pre-hung frame in opening', body: 'Lift into opening, sit on floor. If flooring not yet down, sit on 15 mm packers for carpet clearance.', watchFor: 'Solo works for a standard hollow-core pre-hung. Grab a hand for solid-core or wide double sets — a dropped frame chips jamb corners.' },
        { title: 'Pack hinge-side jamb + plumb', body: 'Packers behind each hinge + top + bottom. Long spirit level on hinge-side jamb — plumb BOTH faces.', watchFor: 'Plumb hinge-side FIRST. Latch-side adjusts to door once hinge-side is set.' },
        { title: 'Fix hinge-side jamb', body: 'Through packers with 75 mm Type 17s — behind each hinge, top, bottom. Recheck plumb after each screw.', watchFor: 'Overdriving pulls jamb toward stud and bows the packer. Snug, not driven.' },
        { title: 'Check door swings freely', body: 'Test door — smooth swing, no bind, no self-close, no floor catch. If binds, hinge-side isn\'t plumb.', watchFor: 'Door swings open/closed by itself = jamb tilted forward or back. Re-plumb before latch side.' },
        { title: 'Pack + fix latch-side jamb', body: 'Close door. Pack latch-side to 3 mm consistent gap top to bottom. Fix with 75 mm Type 17s at top, middle, latch height.', watchFor: 'Inconsistent gap looks amateur + can catch. 3 mm dead all the way.' },
        { title: 'Cut packers flush + tidy', body: 'Utility knife along wall face to snap off protruding packers. Vacuum debris. Architraves after linings.', watchFor: 'Packers proud stop architrave sitting flush. Trim before leaving room.' },
      ],
    },
  },
  {
    id: 'install-bifold',
    category: 'doors-windows',
    label: 'Install a bifold door',
    summary: 'Head track, panels, roller adjust, lock hardware.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Drop saw', 'Chisel', 'Hammer', 'Sealant gun', 'Ladder / trestle', 'Torque driver (for roller adjustment)'],
      materials: ['Bifold door set (LG, Cellini, Centor, or spec\'d)', 'Head track (aluminium, engineered to carry panel weight)', 'Bottom guide or floor pivot (depends on top-hung vs bottom-hung)', 'Roller / pivot hardware (supplied with set)', 'Locks + handles (usually European-cylinder mortice lock at meeting stile)', 'Weatherseals (for external bifolds)', '75 mm bugle screws or through-bolts (to lintel above)'],
      steps: [
        { title: 'Read the manufacturer install guide', body: 'Every bifold system is different — LG, Cellini, and Centor all use different roller heights, track profiles, and adjustment mechanisms. Read the specific guide for the set you\'re installing before you touch it.', watchFor: 'Guessing off memory from a previous bifold install is how you fit a panel upside down. Take 15 min with the guide first.' },
        { title: 'Confirm the lintel can carry the load', body: 'External patio bifolds hang from the head track — a 4-panel 3.6 m bifold set weighs 80–120 kg. Confirm lintel size matches the load per NZS 3604 §8.5 or engineer.', watchFor: 'A standard NZS 3604 lintel is often UNDER-sized for a bifold opening. If the plan calls for an engineered lintel, don\'t substitute.' },
        { title: 'Verify opening is square + plumb', body: 'Measure diagonals — must match to within 3 mm. Plumb both jambs. Level head + threshold. Bifold hardware has minimal adjustment; the opening has to be right.', watchFor: 'A twisted opening = bifold panels won\'t close flat and won\'t seal at the weatherstrip. Get the opening right before ordering.' },
        { title: 'Fix head track', body: 'Level head track along its full length (use packers if needed). Screw through the track into the lintel with 75 mm bugle screws at spacing spec\'d by the manufacturer (typically 300–400 mm).', watchFor: 'Under-fixing the head track = track pulls down under panel weight and bifold binds. Follow the fixing schedule exactly.' },
        { title: 'Fix bottom track / guide', body: 'Bottom-rolling bifolds: full-length bottom track, level, fixed through into threshold or floor. Top-hung bifolds: floor pivot at each end + bottom guide only at meeting stile.', watchFor: 'Bottom-track systems have a drainage detail — DPC or drainage weep holes. Skip these and water ponds in the track.' },
        { title: 'Hang panels + hook to track', body: 'Panels usually hinged together in pairs. Lift the first pair, hook the roller into the head track, drop into the bottom track / pivot. Move to next pair.', watchFor: 'Bifold panels are 20–40 kg each and want to swing while you\'re lifting. Two people, and have someone hold the panels closed while you position the roller.' },
        { title: 'Adjust rollers for panel alignment', body: 'Every roller has a height adjustment (usually a hex screw). Level each panel with a spirit level along top + bottom edges. Adjust until all panels close flat with even gaps between.', watchFor: 'Rushed roller adjustment = uneven gaps between panels + weatherstrip binding on one side. Take the time to level each panel.' },
        { title: 'Fit locks, handles, weatherseals', body: 'Meeting-stile mortice lock cut into the correct panel per the door schedule. Weatherseal compression strip along jambs + head + between panels. Test locking + opening full range.', watchFor: 'External bifolds without weatherseals leak air + water at every panel join. Fit them; the door is not weather-tight without.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Drop saw', 'Chisel', 'Hammer', 'Sealant gun', 'Ladder / trestle', 'Torque driver'],
      materials: ['Bifold door set (LG, Centor, Cavity Sliders, or spec\'d)', 'Head track (aluminium, engineered)', 'Bottom guide or floor pivot', 'Roller / pivot hardware (supplied)', 'Locks + handles (Euro-cylinder mortice at meeting stile)', 'Weatherseals (external)', '75 mm Type 17 or through-bolts to lintel'],
      steps: [
        { title: 'Read the manufacturer install guide', body: 'Every system differs — LG, Centor, Cavity Sliders all use different roller heights + adjustments. Read the specific guide before you start.', watchFor: 'Guessing off memory = upside-down panel. 15 min with the guide first.' },
        { title: 'Confirm lintel can carry the load', body: 'External patio bifolds — a 4-panel 3.6 m set weighs 80–120 kg. Confirm lintel size per AS 1684.2 tables or engineer. In BAL zones, glazing must be BAL-rated.', watchFor: 'Standard AS 1684 lintel is often UNDER-sized for bifold openings. If plan spec\'d an engineered lintel, don\'t substitute.' },
        { title: 'Verify opening is square + plumb', body: 'Diagonals match to 3 mm. Both jambs plumb. Head + threshold level. Bifolds have minimal adjustment — opening must be right.', watchFor: 'Twisted opening = panels don\'t close flat + weatherstrip fails. Get opening right pre-order.' },
        { title: 'Fix head track', body: 'Level head track full length (packers if needed). Screw through into lintel with 75 mm Type 17s at manufacturer spacing (300–400 mm).', watchFor: 'Under-fixed head track pulls down under panel weight, bifold binds. Follow fixing schedule.' },
        { title: 'Fix bottom track / guide', body: 'Bottom-roller bifolds: full-length track, level, fixed into threshold. Top-hung: floor pivot each end + bottom guide at meeting stile only.', watchFor: 'Bottom-track systems need drainage weeps or DPC. Skip = water ponds in the track.' },
        { title: 'Hang panels', body: 'Panels usually hinged in pairs. Lift, hook roller into head track, drop into bottom track / pivot. Two people minimum.', watchFor: '20–40 kg per panel + they swing during lift. Someone holds panels closed while you position the roller.' },
        { title: 'Adjust rollers for panel alignment', body: 'Each roller has height adjustment (hex screw usually). Level each panel top + bottom. Adjust until all close flat with even gaps.', watchFor: 'Rushed adjustment = uneven gaps + weatherstrip binding. Take time to level each panel.' },
        { title: 'Fit locks, handles, weatherseals', body: 'Meeting-stile mortice lock in correct panel per schedule. Compression weatherseal along jambs + head + panel joints. Test lock + full range.', watchFor: 'External bifolds without weatherseals leak at every join. Fit them.' },
      ],
    },
  },
  {
    id: 'install-sliding-door',
    category: 'doors-windows',
    label: 'Install a sliding aluminium door',
    summary: 'Frame, threshold level, panels, roller adjust, interlock.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Sealant gun', 'Utility knife', 'Rubber mallet', 'Screwdriver (for roller adjust)'],
      materials: ['Sliding door unit (aluminium, 2- or 3-panel with fixed side/s)', 'Sill flashing (extruded metal, colour-matched)', 'Sill flashing tape (butyl)', 'Jamb + head flashing tape', 'Packers', 'Sealant (neutral-cure)', '75 mm bugle screws through frame flange', 'Handle + lock hardware (supplied)'],
      steps: [
        { title: 'Read the plan + manufacturer guide', body: 'Sliding door orientations (which panel slides, which is fixed) vary. Confirm the layout on the plan matches the ordered unit before fitting.', watchFor: 'A "reverse-hand" mistake — the sliding panel on the wrong side — means removing the whole unit and re-ordering. Confirm before installing.' },
        { title: 'Verify rough opening', body: 'Frame external dim + 15 mm clearance each side. Diagonals must match to within 3 mm. Threshold must be dead level along the full length.', watchFor: 'A sliding door threshold that isn\'t level along the run = door rolls uphill in one direction. Every metre out matters.' },
        { title: 'Fit sill flashing + tape', body: 'Extruded metal sill flashing into sill, sloped OUT 15°+. Butyl flashing tape over flashing + up each jamb 250 mm. Same detail as a window.', watchFor: 'Sliding doors have big thresholds that collect water. Get the flashing right or the frame rusts.' },
        { title: 'Position frame in opening', body: 'Lift frame into opening — a 3-panel slider frame is 40–60 kg. Sit on sill packers. Plumb jambs, level head, level threshold in both directions.', watchFor: 'Frames flex during install — hold with props while you plumb. A twisted frame = panels won\'t seal.' },
        { title: 'Screw frame flange to framing', body: 'Type 17s through flange into stud/head/sill at 300 mm c/c. Start at bottom corner, work around checking plumb + level.', watchFor: 'Overdriving warps the flange and cracks the seal. Snug — the frame should sit flat against the packers, not pulled tight.' },
        { title: 'Install fixed panel/s + sliding panel', body: 'Fixed panels sit into the head + sill tracks first, secured with fixing brackets. Sliding panel lifts INTO the head track, then DROPS into the sill track (bottom-rolling) or hangs (top-hung).', watchFor: 'Trying to install the sliding panel by lifting into the sill track first won\'t work — the panel has to go into the head track first, then drop.' },
        { title: 'Adjust rollers + interlock', body: 'Each roller (usually 2 per sliding panel) has an adjustment screw. Level the panel top edge, then adjust the interlock jamb closure so the sliding + fixed interlock meets fully.', watchFor: 'Sliding panels that don\'t interlock fully leak air + water at the meeting stile. Adjust until the interlock meets full-height with no gap.' },
        { title: 'Tape head + jamb flashings + fit weatherseals', body: 'Head + jamb flashing tape over the frame flange + onto wrap (weather-lap direction). Fit the compression weatherseal into the frame channels.', watchFor: 'Missing head flashing tape is one of the top-3 sources of leaks in sliding doors. Head goes ON TOP OF jambs — check the water-shed direction.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Sealant gun', 'Utility knife', 'Rubber mallet', 'Screwdriver (roller adjust)'],
      materials: ['Sliding door unit (aluminium, 2- or 3-panel) — BAL-rated in bushfire zones', 'Sill flashing (extruded, colour-matched)', 'Sill flashing tape (butyl)', 'Jamb + head flashing tape', 'Packers', 'Sealant (neutral-cure)', '75 mm Type 17 through frame flange', 'Handle + lock hardware (supplied)'],
      steps: [
        { title: 'Read the plan + manufacturer guide', body: 'Sliding orientations (which panel slides) vary — confirm plan matches ordered unit before fitting.', watchFor: '"Reverse-hand" mistake = sliding panel on wrong side = remove + re-order. Confirm before install.' },
        { title: 'Verify rough opening', body: 'Frame external + 15 mm clearance each side. Diagonals match to 3 mm. Threshold dead level along full length.', watchFor: 'Un-level threshold = door rolls uphill one way. Every mm out matters.' },
        { title: 'Fit sill flashing + tape', body: 'Extruded metal sill flashing, sloped OUT 15°+. Butyl flashing tape over flashing + up jambs 250 mm.', watchFor: 'Sliding door thresholds collect water. Get flashing right or the frame rusts.' },
        { title: 'Position frame in opening', body: 'Lift into opening (3-panel frame is 40–60 kg). Sit on sill packers. Plumb jambs, level head + threshold both directions.', watchFor: 'Frames flex during install — prop while plumbing. Twisted frame = panels don\'t seal.' },
        { title: 'Screw frame flange to framing', body: 'Type 17s through flange at 300 mm c/c. Start bottom corner, work around checking plumb + level.', watchFor: 'Overdriving warps flange + cracks seal. Snug, not pulled tight.' },
        { title: 'Install fixed panels + sliding panel', body: 'Fixed panels into head + sill tracks first with brackets. Sliding panel INTO head track first, then DROPS into sill (bottom-rolling) or hangs (top-hung).', watchFor: 'Trying to install sliding panel by lifting into sill first won\'t work — head track first, then drop.' },
        { title: 'Adjust rollers + interlock', body: 'Each roller has adjustment screw. Level panel top edge, adjust interlock jamb closure so sliding + fixed interlock meets fully.', watchFor: 'Un-fully-interlocked panels leak air + water at meeting stile. Full-height meet, no gap.' },
        { title: 'Tape head + jamb flashings + weatherseals', body: 'Head + jamb flashing tape over frame flange onto wrap (weather-lap direction). Compression weatherseal into frame channels.', watchFor: 'Missing head flashing tape = top-3 leak source in sliding doors. Head goes ON TOP OF jambs — check water-shed direction.' },
      ],
    },
  },

  // ─── Wet areas — install-side work (waterproofing is a licensed trade) ──
  {
    id: 'install-shower-base',
    category: 'wet-areas',
    label: 'Install a shower base',
    summary: 'Pre-formed tray, align to waste, bed level, secure to frame.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Silicone gun', 'Hammer', 'Utility knife', 'Hole saw (for waste)', 'Spanner set'],
      materials: ['Pre-formed shower base (acrylic Marbletrend / Athena, or ceramic)', 'Bedding: sand-cement mix or PU-foam bedding compound (per manufacturer)', 'Fixing screws through the base flange to studs (if design allows)', 'Silicone (neutral-cure)', 'Waste connection kit (from plumber\'s rough-in)'],
      steps: [
        { title: 'Confirm base fits the framed opening', body: 'Measure the shower opening (stud face to stud face, both directions). Confirm the base size matches, allowing for wall lining thickness (10 mm gib + 10 mm tile bed each side is typical).', watchFor: 'Ordering a shower base without confirming actual framed opening is how you find the base doesn\'t fit on install day. Measure once framing is up.' },
        { title: 'Verify plumber has roughed-in the waste', body: 'The shower waste position + height must match the base\'s waste position. Cross-check with the plumber before dropping the base in — moving the waste post-install is a $$$ callout.', watchFor: 'A base positioned for a waste that\'s 50 mm off = re-route the waste, or return the base. Coordinate with the plumber before ordering.' },
        { title: 'Prep + prime the sub-floor', body: 'Sub-floor must be flat + level. If particleboard flooring, seal any cut edges. Some manufacturers require a primer coat before bedding compound goes down.', watchFor: 'Unprepped sub-floor + bedding compound = poor bond + squeaky base. Check the manufacturer\'s prep requirements.' },
        { title: 'Bed the base', body: 'Sand-cement bedding (spread to the base footprint depth) OR PU-foam bedding (foam applied in a pattern per manufacturer). Purpose is to fully support the base to prevent flex + creaking.', watchFor: 'Skipping the bedding + relying only on flange fixings = base creaks + cracks over time. Bedding is not optional on acrylic bases.' },
        { title: 'Lower + level the base', body: 'Set base down on bedding, align waste with plumbing. Level with a long spirit level in both directions. Falls to waste are BUILT INTO the base — you set the base level, the base does the fall.', watchFor: 'Levelling to the fall (tilting the base) creates a double-fall + water pools at the base edge. Base = level; internal fall does the drain.' },
        { title: 'Fix flange to studs (if design allows)', body: 'Some bases have a fixing flange around the top edge — screw into studs at spacing per manufacturer. Others rely purely on bedding. Follow the install guide.', watchFor: 'Over-tightening the flange bows the base at the fixing points. Snug — just enough that the flange is caught.' },
        { title: 'Protect base before waterproofer arrives', body: 'Cover the base with cardboard or the manufacturer\'s protective film. Waterproofer + tiler come next, before anyone stands in it.', watchFor: 'A gouged base = replacement. Cover it. The 10-min tape-and-cardboard job saves a $600 base.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Silicone gun', 'Hammer', 'Utility knife', 'Hole saw (for waste)', 'Spanner set'],
      materials: ['Pre-formed shower base (acrylic — Marbletrend, Adesso, Fienza)', 'Bedding: sand-cement mix or PU-foam (per manufacturer)', 'Fixing screws through flange to studs (if design allows)', 'Silicone (neutral-cure)', 'Waste connection kit (plumber rough-in)'],
      steps: [
        { title: 'Confirm base fits the framed opening', body: 'Measure shower opening stud-to-stud both directions. Base size must match, allowing for wall lining + tile bed (10 mm plasterboard + 10 mm tile each side typical).', watchFor: 'Ordering without confirming actual framed opening = base doesn\'t fit on install day. Measure once framed.' },
        { title: 'Verify plumber has roughed-in the waste', body: 'Shower waste position + height must match base\'s waste. Cross-check with plumber before dropping base in.', watchFor: 'Base positioned for a waste 50 mm off = re-route waste or return base. Coordinate before ordering.' },
        { title: 'Prep + prime the sub-floor', body: 'Sub-floor flat + level. Yellow-tongue flooring: seal any cut edges. Some manufacturers require primer coat before bedding.', watchFor: 'Unprepped sub-floor + bedding = poor bond + squeaky base. Check prep requirements.' },
        { title: 'Bed the base', body: 'Sand-cement (spread to base footprint depth) OR PU-foam (per manufacturer pattern). Fully supports base + prevents flex.', watchFor: 'Skipping bedding + relying on flange fixings alone = creaks + cracks over time. Not optional on acrylic.' },
        { title: 'Lower + level the base', body: 'Set on bedding, align waste with plumbing. Level in both directions. Falls to waste are BUILT INTO the base — base level, internal fall does the drain.', watchFor: 'Tilting the base creates a double-fall + water pools at edge. Base = level.' },
        { title: 'Fix flange to studs (if design allows)', body: 'Some bases have a fixing flange — screw into studs at spec spacing. Others rely on bedding only. Follow install guide.', watchFor: 'Over-tightening bows base at fixings. Snug — just enough that flange is caught.' },
        { title: 'Protect base before waterproofer arrives', body: 'Cover with cardboard or manufacturer\'s protective film. Waterproofer + tiler are next.', watchFor: 'Gouged base = replacement. 10-min tape-and-cardboard saves a $600 base.' },
      ],
    },
  },
  {
    id: 'install-shower-liner',
    category: 'wet-areas',
    label: 'Install a shower liner',
    summary: 'Pre-formed acrylic panels: dry-fit, cut for taps, adhesive, silicone.',
    nz: {
      tools: ['Tape', 'Spirit level', 'Marker pen', 'Cordless drill / impact driver', 'Jigsaw or fine-tooth handsaw', 'Hole saw (54 mm for mixer, 32 mm for shower rose)', 'Silicone gun', 'Utility knife', 'Sandpaper (fine)'],
      materials: ['Shower liner kit (3-piece: back + 2 sides, or moulded 1-piece — Marbletrend / Athena / Newline)', 'Construction adhesive (Selleys Liquid Nails Wet Area, or Sika Sikaflex 11FC)', 'Silicone (neutral-cure, colour-matched to liner)', 'Corner trims / cap strips (supplied with kit)', 'Masking tape'],
      steps: [
        { title: 'Confirm walls are lined + waterproofed', body: 'Shower recess walls should be gib (Standard or Aqualine) or Villaboard + waterproofed by a licensed waterproofer before the liner goes on. Liner is a decorative + secondary weather seal — NOT primary waterproofing.', watchFor: 'Skipping waterproofing under a liner = wall framing rots when the silicone seal eventually fails. Waterproofing is licensed work; get the certificate.' },
        { title: 'Dry-fit the liner panels', body: 'Lift panels into position — back panel first, then sides. Check the panels meet at corners with a consistent 2–3 mm gap for silicone, and sit hard against the shower base rim.', watchFor: 'Shower recesses are rarely dead square. If a corner\'s out by more than 5 mm, either scribe the liner edge or plan for a wider silicone bead. Test-fit before adhesive.' },
        { title: 'Mark + cut tap + shower-rose holes', body: 'Turn panel around, measure from the base + adjacent wall to mark the tap centreline. Drill from the FRONT (visible) face with a hole saw to avoid chipping the finished face.', watchFor: 'Marking + drilling from the back is a common apprentice mistake — hole saws blow out the visible face. Score with a utility knife first if worried about chipping.' },
        { title: 'Apply adhesive per manufacturer', body: 'Squiggle-bead adhesive on the panel back — typically horizontal squiggles 200 mm apart, plus a solid perimeter bead 25 mm in from every edge. Don\'t over-apply; excess squeezes out at joints.', watchFor: 'Adhesive too close to the edge oozes out when panel is pressed. 25 mm setback from edges gives the silicone a clean zone to sit in.' },
        { title: 'Position + press panels', body: 'Back panel first — align to base + centre horizontally. Press across the whole face, work air out from centre outward. Then side panels — same process, aligning against back panel + base.', watchFor: 'Panels slide once adhesive is on. Masking tape a temporary hold at the top until adhesive grabs (usually 15–30 min).' },
        { title: 'Silicone all joints + penetrations', body: 'Vertical joins between panels, horizontal join to shower base, around tap + rose penetrations. Neutral-cure silicone in the panel colour. Tool the bead with a wet finger for a clean concave finish.', watchFor: 'The silicone is the primary weather seal from here on. Any pinhole or gap = water gets behind the liner. Take time, tool every join clean.' },
        { title: 'Fit corner + edge trims', body: 'Kit-supplied trim strips (usually colour-matched aluminium) fit at exposed vertical edges + top of liner. Fix with adhesive + hidden pins.', watchFor: 'Un-trimmed liner edges look unfinished + get bumped / chipped. Fit the trims — they\'re in the kit for a reason.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'Marker pen', 'Cordless drill / impact driver', 'Jigsaw or fine-tooth handsaw', 'Hole saw (54 mm mixer, 32 mm rose)', 'Silicone gun', 'Utility knife', 'Sandpaper (fine)'],
      materials: ['Shower liner kit (3-piece or moulded 1-piece — Marbletrend, Estilo, Highgrove)', 'Construction adhesive (Selleys Liquid Nails Wet Area, or Sika Sikaflex 11FC)', 'Silicone (neutral-cure, colour-matched)', 'Corner trims / cap strips (kit)', 'Masking tape'],
      steps: [
        { title: 'Confirm walls are lined + waterproofed', body: 'Recess walls should be plasterboard (Standard, Wet-Area, or Villaboard) + waterproofed by a licensed waterproofer per AS 3740 before liner. Liner is decorative + secondary — NOT primary waterproofing.', watchFor: 'Skipping waterproofing = wall framing rots when silicone eventually fails. Waterproofing is licensed work in AU; get the compliance certificate.' },
        { title: 'Dry-fit the liner panels', body: 'Back panel first, then sides. Check corners meet with 2–3 mm gap for silicone; sit hard against base rim.', watchFor: 'Recesses rarely dead square. Corner out by >5 mm: scribe the edge or plan a wider silicone bead. Test-fit before adhesive.' },
        { title: 'Mark + cut tap + rose holes', body: 'Turn panel around, measure from base + adjacent wall for tap centreline. Drill from the FRONT face with a hole saw to avoid chipping.', watchFor: 'Drilling from back = blown-out visible face. Score with utility knife first if worried.' },
        { title: 'Apply adhesive per manufacturer', body: 'Squiggle-bead on panel back — horizontal squiggles at 200 mm, plus perimeter bead 25 mm from edges. Don\'t over-apply — excess squeezes out at joints.', watchFor: 'Adhesive too close to edge oozes at panel press. 25 mm setback gives silicone a clean zone.' },
        { title: 'Position + press panels', body: 'Back panel first — align to base, centre horizontally. Press whole face, work air out from centre. Sides next — align to back + base.', watchFor: 'Panels slide once adhesive is on. Masking tape as temporary hold at top until adhesive grabs (15–30 min).' },
        { title: 'Silicone all joints + penetrations', body: 'Vertical joins between panels, horizontal join to base, around taps + rose. Neutral-cure silicone in panel colour. Tool with wet finger for clean concave finish.', watchFor: 'Silicone is primary weather seal from here. Any pinhole = water behind liner. Take time, tool clean.' },
        { title: 'Fit corner + edge trims', body: 'Kit trims (colour-matched aluminium) at exposed vertical edges + top of liner. Adhesive + hidden pins.', watchFor: 'Un-trimmed edges look unfinished + get bumped / chipped. Fit the trims.' },
      ],
    },
  },
  {
    id: 'tile-wall',
    category: 'wet-areas',
    label: 'Tile a wall (setout + laying)',
    summary: 'Layout, reference lines, adhesive, cut, grout, silicone.',
    nz: {
      tools: ['Notched trowel (6 mm or 10 mm)', 'Spirit level', 'Wet saw or manual tile cutter', 'Nippers (for curved cuts)', 'Rubber grout float', 'Sponge + buckets', 'Tile spacers', 'Mixing paddle + drill', 'Silicone gun', 'PPE: safety glasses'],
      materials: ['Wall tiles (ceramic or porcelain, per spec)', 'Flexible tile adhesive (Sika, Mapei, Ardex — wet-area rated)', 'Tile spacers (2 mm or 3 mm typical)', 'Grout (matching or contrast, unsanded for narrow joints, sanded for wider)', 'Silicone (mould-resistant, matching grout colour) for internal corners', 'Edge trim (Schluter) or bullnose tiles'],
      steps: [
        { title: 'Confirm the wall is ready to tile', body: 'Waterproofer\'s work must be signed off + cured (typically 24–48 hrs after final coat). The surface should be primed for tile adhesive per the tile-adhesive manufacturer.', watchFor: 'Tiling over uncured waterproofing pulls the membrane away when the adhesive shrinks. Check with the waterproofer before starting.' },
        { title: 'Set out the tile layout', body: 'Start from a feature (shower niche, mixer position, or centreline of a wall) and work outwards. Plan the cuts to land at inside corners or the least-visible ends.', watchFor: 'Random layout = 20 mm slivers of cut tile at one end. A story rod (marked with tile heights + grout joints) makes setout predictable.' },
        { title: 'Snap reference lines', body: 'Horizontal reference line at second-course height (not at floor — floor may not be level). Vertical line plumbed at layout centreline. Work tiles from these lines outward.', watchFor: 'Referencing off a floor or corner that isn\'t level or plumb means every course out of true. Reference off snapped lines.' },
        { title: 'Mix adhesive to consistency', body: 'Follow the bag — usually water first, then powder. Mix to a peanut-butter consistency; stand for slaking time, remix. Only mix what you\'ll use in 20–30 min (open time).', watchFor: 'Adhesive too wet slumps on the wall + tiles slide. Too dry doesn\'t bond. Follow the bag exactly.' },
        { title: 'Trowel + set tiles', body: 'Notched trowel on the wall (not the tile) at 45°. Press tile firmly, slight twist to seat. Insert spacers between tiles. Level along the reference lines as you go.', watchFor: 'Buttering tiles instead of the wall creates air pockets under the tile that later crack under load. Trowel the wall.' },
        { title: 'Cut tiles at edges + fittings', body: 'Wet saw for long cuts + straight edges; manual score-and-snap for smaller trims; nippers for curved cuts around waste + tap fittings. Wear safety glasses.', watchFor: 'Cutting porcelain with a manual cutter can chip the edge. Use a wet saw for anything visible or where a clean edge matters.' },
        { title: 'Grout + seal after adhesive cures', body: '24 hrs after tiling, remove spacers, mix grout, work into joints with a rubber float diagonally. Sponge off haze after 15–30 min. Silicone all internal corners + wall-to-base joints.', watchFor: 'Grouting corners = grout cracks as tiles move. Silicone corners = flexible + no crack. Never grout an internal corner.' },
      ],
    },
    au: {
      tools: ['Notched trowel (6 mm or 10 mm)', 'Spirit level', 'Wet saw or manual tile cutter', 'Nippers', 'Rubber grout float', 'Sponge + buckets', 'Tile spacers', 'Mixing paddle + drill', 'Silicone gun', 'PPE: safety glasses'],
      materials: ['Wall tiles (ceramic or porcelain, per spec)', 'Flexible tile adhesive (Davco, Mapei, Ardex — AS 4992 wet-area rated)', 'Tile spacers (2 mm or 3 mm)', 'Grout (matching / contrast, unsanded for narrow, sanded for wider)', 'Silicone (mould-resistant, matching grout) for internal corners', 'Edge trim (Schluter) or bullnose tiles'],
      steps: [
        { title: 'Confirm the wall is ready to tile', body: 'Waterproofer\'s work signed off + cured (typically 24–48 hrs after final coat) per AS 3740. Surface primed for tile adhesive.', watchFor: 'Tiling over uncured waterproofing pulls membrane away when adhesive shrinks. Check with waterproofer.' },
        { title: 'Set out the tile layout', body: 'Start from feature (shower niche, mixer position, centreline) and work outwards. Cuts land at inside corners or least-visible ends.', watchFor: 'Random layout = 20 mm slivers at one end. A story rod makes setout predictable.' },
        { title: 'Snap reference lines', body: 'Horizontal reference at second-course height (not at floor — may not be level). Vertical line plumbed at centreline. Tiles work from these lines outward.', watchFor: 'Referencing off a non-level floor or non-plumb corner = every course out. Reference off snapped lines.' },
        { title: 'Mix adhesive to consistency', body: 'Follow bag — water first, then powder. Peanut-butter consistency; slaking time, remix. Only mix 20–30 min\'s work (open time).', watchFor: 'Too wet slumps + tiles slide. Too dry doesn\'t bond. Follow bag exactly.' },
        { title: 'Trowel + set tiles', body: 'Notched trowel on wall (not tile) at 45°. Press tile firmly, slight twist. Spacers between. Level along reference lines.', watchFor: 'Buttering tiles creates air pockets that crack under load. Trowel the wall.' },
        { title: 'Cut tiles at edges + fittings', body: 'Wet saw for long / straight cuts; manual score-and-snap for smaller; nippers for curves around waste + taps. Eye pro.', watchFor: 'Manual cutter on porcelain can chip edge. Wet saw for anything visible or clean-edge critical.' },
        { title: 'Grout + seal after adhesive cures', body: '24 hrs after tiling, remove spacers, mix grout, work into joints with rubber float diagonally. Sponge haze after 15–30 min. Silicone all internal corners + wall-to-base.', watchFor: 'Grouting corners = cracks as tiles move. Silicone corners = flexible + no crack. Never grout an internal corner.' },
      ],
    },
  },
  {
    id: 'tile-floor',
    category: 'wet-areas',
    label: 'Tile a floor',
    summary: 'Confirm falls, dry-lay, back-butter big tiles, grout perimeter.',
    nz: {
      tools: ['Notched trowel (10 mm typical for floor)', 'Spirit level (long) + straight-edge', 'Wet saw or manual tile cutter', 'Nippers', 'Rubber grout float', 'Sponge + buckets', 'Tile spacers', 'Mixing paddle + drill', 'Silicone gun', 'Kneeling pad', 'PPE'],
      materials: ['Floor tiles (porcelain or ceramic, non-slip R10+ for wet areas)', 'Flexible tile adhesive (Sika, Mapei, Ardex — wet-area rated)', 'Tile spacers (3 mm or 5 mm typical for floor)', 'Grout (sanded for floor joints)', 'Silicone (mould-resistant) for perimeter + wall-to-floor', 'Threshold / transition strip if needed'],
      steps: [
        { title: 'Confirm floor prep + falls', body: 'Waterproofer\'s membrane cured + signed off. Falls to floor waste MUST already be there — a screed or self-levelling compound with fall (1:80 minimum for shower, 1:100 elsewhere in wet areas per E3).', watchFor: 'Trying to create fall in the tile bed alone is wrong. Fall is in the screed / substrate; tiles follow it. Adding fall in adhesive = uneven tile heights.' },
        { title: 'Dry-lay to check layout + falls', body: 'Dry-lay a run of tiles from one wall through to the waste. Check that the falls work with your tile sizes — big-format tiles may span across a fall + not follow it, causing puddles.', watchFor: 'Large-format tiles (>600 mm) don\'t follow tight falls. Use smaller tiles in and around the shower for a proper fall to the waste.' },
        { title: 'Set out from door or high point', body: 'Start layout so the door threshold or the main entry has full tiles, and cuts land at the shower step or back wall (less visible).', watchFor: 'Cut tiles at the doorway are the first thing anyone sees walking in. Setout starts from the entry, always.' },
        { title: 'Mix adhesive + back-butter big tiles', body: 'Mix per bag. Trowel adhesive on the floor with notched trowel. Tiles >300 mm: back-butter the tile too, so full contact under the whole tile.', watchFor: 'Big tiles without back-buttering = hollow spots + eventual cracks under foot traffic. Back-butter anything over 300 mm.' },
        { title: 'Lay tiles + check flat', body: 'Press each tile into adhesive with a slight twist to seat. Spacers between. Sight a straight-edge across every 3–4 tiles to check no lippage (edge height difference).', watchFor: 'Lippage > 1 mm reads as poor workmanship + traps water in the joint. Adjust bed thickness as you go.' },
        { title: 'Cut around waste + edges', body: 'Waste flange: wet-saw a circular cut, use nippers to trim to shape. Edges: cut on wet saw for clean line.', watchFor: 'A waste cut that\'s ragged shows through the waste grate. Take time to cut clean.' },
        { title: 'Grout after 24 hrs + silicone perimeter', body: 'Remove spacers, mix sanded grout, work into joints with float diagonally. Sponge haze off. Silicone the wall-to-floor perimeter + expansion joints.', watchFor: 'Grouting the wall-to-floor join = crack as building settles. Silicone that join always.' },
      ],
    },
    au: {
      tools: ['Notched trowel (10 mm typical)', 'Spirit level (long) + straight-edge', 'Wet saw or manual tile cutter', 'Nippers', 'Rubber grout float', 'Sponge + buckets', 'Tile spacers', 'Mixing paddle + drill', 'Silicone gun', 'Kneeling pad', 'PPE'],
      materials: ['Floor tiles (porcelain or ceramic, non-slip R10+ for wet areas per AS 4586)', 'Flexible tile adhesive (Davco, Mapei, Ardex — AS 4992 wet-area rated)', 'Tile spacers (3 mm or 5 mm floor)', 'Grout (sanded floor joints)', 'Silicone (mould-resistant) for perimeter + wall-to-floor', 'Threshold / transition strip'],
      steps: [
        { title: 'Confirm floor prep + falls', body: 'Waterproofer\'s membrane cured + signed off per AS 3740. Falls to waste MUST already be in the screed / self-leveller (1:80 min for shower, 1:100 elsewhere).', watchFor: 'Fall must be in substrate, not tile bed. Adding fall in adhesive = uneven tile heights.' },
        { title: 'Dry-lay to check layout + falls', body: 'Dry-lay a run from wall through to waste. Check big-format tiles can follow the fall without ponding.', watchFor: 'Large-format (>600 mm) tiles don\'t follow tight falls. Smaller tiles in shower for proper fall.' },
        { title: 'Set out from door or high point', body: 'Start layout so door threshold has full tiles, cuts at shower step or back wall (less visible).', watchFor: 'Cuts at doorway are the first thing anyone sees. Setout from entry, always.' },
        { title: 'Mix adhesive + back-butter big tiles', body: 'Mix per bag. Notched trowel on floor. Tiles >300 mm: back-butter for full contact.', watchFor: 'Big tiles without back-buttering = hollow spots + cracks. Back-butter over 300 mm.' },
        { title: 'Lay tiles + check flat', body: 'Press with slight twist to seat. Spacers between. Straight-edge every 3–4 tiles to check lippage.', watchFor: 'Lippage >1 mm reads as poor + traps water. Adjust bed as you go.' },
        { title: 'Cut around waste + edges', body: 'Waste flange: wet-saw circular, nippers to shape. Edges: wet saw for clean line.', watchFor: 'Ragged waste cut shows through grate. Cut clean.' },
        { title: 'Grout after 24 hrs + silicone perimeter', body: 'Remove spacers, mix sanded grout, work into joints with float diagonally. Sponge haze. Silicone wall-to-floor + expansion joints.', watchFor: 'Grouting wall-to-floor = crack as building settles. Silicone always.' },
      ],
    },
  },
  {
    id: 'fit-bathroom-vanity',
    category: 'wet-areas',
    label: 'Fit a bathroom vanity',
    summary: 'Level, wall-fix into studs, scribe, seal top, hand over to plumber.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Stud finder', 'Cordless drill / impact driver', 'Sealant gun', 'Scribe / pencil', 'Handsaw or drop saw (for scribing)', 'Utility knife'],
      materials: ['Vanity unit (pre-assembled cabinet + benchtop)', '65 mm bugle screws for wall-fixing (into studs)', 'Silicone (neutral-cure, matching splashback if any)', 'Packers / shims for levelling', 'Basin waste + trap (plumber\'s kit)'],
      steps: [
        { title: 'Confirm vanity height + plumbing rough-in', body: 'Standard bench-top height is 900 mm to top. Check the plumber has roughed-in the waste + hot/cold at the correct height for the vanity model. Cross-check drain fits behind vanity carcass.', watchFor: 'A waste roughed-in for a floor-standing vanity but the vanity ordered is wall-hung = re-plumb. Coordinate before delivery.' },
        { title: 'Locate + mark wall fixings', body: 'Find studs in the wall behind vanity position with stud finder. Mark fixing points on vanity back panel to line up with studs.', watchFor: 'Vanities screwed only into gib will pull off with any downward force. Every fix must land in a stud, or block behind the wall linings.' },
        { title: 'Position vanity + level top', body: 'Slide vanity into position. Use packers under low corners to bring the top edge dead level in both directions. Long spirit level on the top.', watchFor: 'A vanity that\'s out of level shows immediately when the basin gets water in it — water pools at one end. Level within 1 mm.' },
        { title: 'Fix through the back into studs', body: '65 mm bugle screws through the vanity back rail into studs. Two or three fixings per vanity depending on width. Recheck level after fixing.', watchFor: 'Fixing before levelling locks in any error. Level first, then screw.' },
        { title: 'Scribe end panels to wall (if uneven)', body: 'If the wall isn\'t flat where the vanity ends, use a scribe / pencil to mark the wall profile onto the vanity end panel. Cut with handsaw or jigsaw.', watchFor: 'Leaving a gap between vanity end + wall reads as poor fit + gets grime. Scribe for a tight finish.' },
        { title: 'Seal top edge + wall junction', body: 'Bead of silicone along the top of the vanity where it meets the wall (or splashback). Also around any exposed sides where it meets floor / walls.', watchFor: 'Un-sealed joins let water into the cabinet + cause swelling / mould. Silicone every wet-side edge.' },
        { title: 'Hand over to plumber for basin + taps', body: 'Basin installation, waste connection, and tap-set are the plumber\'s job. Confirm they have access to the waste rough-in through the cabinet.', watchFor: 'Cabinet backs sometimes need a service cut-out for waste + water pipes. Check whether the manufacturer pre-cuts, or you need to.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Stud finder', 'Cordless drill / impact driver', 'Sealant gun', 'Scribe / pencil', 'Handsaw or drop saw', 'Utility knife'],
      materials: ['Vanity unit (pre-assembled)', '65 mm Type 17 screws for wall-fixing (into studs)', 'Silicone (neutral-cure, matching splashback)', 'Packers / shims', 'Basin waste + trap (plumber)'],
      steps: [
        { title: 'Confirm vanity height + plumbing rough-in', body: 'Standard bench height 900 mm to top. Plumber\'s waste + hot/cold rough-in at correct height for vanity model. Drain fits behind carcass.', watchFor: 'Waste roughed-in for floor-standing but vanity is wall-hung = re-plumb. Coordinate before delivery.' },
        { title: 'Locate + mark wall fixings', body: 'Find studs with stud finder. Mark fixing points on vanity back to line up with studs.', watchFor: 'Screwed only into plasterboard = pulls off. Every fix into stud, or block behind linings.' },
        { title: 'Position vanity + level top', body: 'Slide into position. Packers under low corners to bring top dead level both directions. Long spirit level on top.', watchFor: 'Out of level = water pools at one end of basin. Level within 1 mm.' },
        { title: 'Fix through back into studs', body: '65 mm Type 17s through vanity back rail into studs. 2–3 fixings depending on width. Recheck level after fixing.', watchFor: 'Fixing before levelling locks in error. Level first, screw second.' },
        { title: 'Scribe end panels to wall', body: 'Wall not flat where vanity ends: scribe wall profile onto end panel. Cut with handsaw / jigsaw.', watchFor: 'Gap between vanity + wall = poor fit + grime. Scribe for tight finish.' },
        { title: 'Seal top edge + wall junction', body: 'Silicone along top where vanity meets wall / splashback. Around exposed sides + floor / walls.', watchFor: 'Un-sealed joins let water into cabinet + cause swelling / mould. Silicone every wet-side edge.' },
        { title: 'Hand over to plumber for basin + taps', body: 'Basin, waste connection, tap-set = plumber. Confirm access to waste rough-in through cabinet.', watchFor: 'Cabinet backs may need service cut-out. Check if manufacturer pre-cuts or you need to.' },
      ],
    },
  },
  {
    id: 'fit-bath',
    category: 'wet-areas',
    label: 'Fit a bath',
    summary: 'Frame, dry-fit, level, connect waste, tile-in or skirt.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Hammer', 'Handsaw or drop saw', 'Sealant gun', 'Spanner set', 'Utility knife'],
      materials: ['Bath (acrylic — Mondella, Athena — or steel enamel)', 'Bath frame / cradle (usually pre-built by manufacturer, or timber cradle on site)', 'Timber blocking (90×45 SG8 H1.2) for bearing support', 'Bath waste + overflow kit (from plumber)', 'Silicone (neutral-cure)', 'Bath skirt / apron panel (some baths come with one, others tiled-in)'],
      steps: [
        { title: 'Confirm framing supports the bath', body: 'Baths sit on the sub-floor + bear on the walls at ends / rim. Confirm the framing under the bath position has bearers or blocking to catch the load (a full bath of water is 200+ kg).', watchFor: 'A bath dropped onto a floor without bearing support flexes + eventually cracks the tiling. Add timber blocking under the bath position at framing stage.' },
        { title: 'Dry-fit bath in position', body: 'Lift bath into place, check clearance to walls (typically 5–10 mm each side), align with plumbing rough-in for waste + overflow. Confirm which end is the tap end.', watchFor: 'Acrylic bath (25–40 kg) solo works. Steel enamel (60 kg+) needs two. Either way, watch fingers between bath rim + wall.' },
        { title: 'Install bath frame / cradle', body: 'Pre-built frame (comes with bath): assemble per manufacturer, position, level, screw to sub-floor. Site-built cradle: 90×45 blocking to catch the underside + ends, screwed to studs + floor.', watchFor: 'Skip the frame + rely on the walls alone = bath flexes under weight. Every bath needs support under, not just at the rim.' },
        { title: 'Lower bath onto frame + level', body: 'Set bath into position on frame. Level ACROSS the bath (width) — the fall to waste is BUILT INTO the bath, not added. Check length is level or has a very slight fall to waste (1–2 mm).', watchFor: 'Levelling to a false fall (tilting the bath) creates a puddle at the flat end. Bath = level cross-ways; length has the built-in drainage.' },
        { title: 'Plumber connects waste + overflow', body: 'Plumber\'s job — bath waste kit connects to trap + waste pipe below the floor. Bath goes IN before waste is connected; access is often via a bath-side panel.', watchFor: 'A concreted-in bath with no access panel = every future waste blockage is a wall demo. Provide access.' },
        { title: 'Bed bath rim (if manufacturer requires)', body: 'Some acrylic baths need a sand or foam bed under the base to fully support. Others (steel enamel) sit on the frame + walls. Check the install guide.', watchFor: 'Un-bedded acrylic bath flexes underfoot + eventually cracks. Bed if required.' },
        { title: 'Fit skirt / apron OR tile-in', body: 'Bath skirt: fit the moulded panel around the bath. Tiled-in: build a timber frame around the bath sides, gib + waterproof + tile.', watchFor: 'Tiled-in baths need an access panel at the waste end. Solid-tiled with no access = wall demo for any future service.' },
        { title: 'Silicone perimeter to wall + floor', body: 'Silicone bead around all edges where the bath meets walls and floor. Neutral-cure, mould-resistant.', watchFor: 'Painting or grouting the perimeter instead of silicone = cracks as the bath moves under weight. Silicone flexes.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Hammer', 'Handsaw or drop saw', 'Sealant gun', 'Spanner set', 'Utility knife'],
      materials: ['Bath (acrylic — Caroma, Decina — or steel enamel)', 'Bath frame / cradle (pre-built or site timber)', 'Timber blocking (90×45 MGP10) for bearing support', 'Bath waste + overflow kit (plumber)', 'Silicone (neutral-cure)', 'Bath skirt / apron (or tiled-in)'],
      steps: [
        { title: 'Confirm framing supports the bath', body: 'Baths bear on sub-floor + walls at ends / rim. Framing under bath position needs bearers / blocking (full bath is 200+ kg).', watchFor: 'Bath on unsupported floor flexes + cracks tiling over time. Blocking under bath at framing stage.' },
        { title: 'Dry-fit bath in position', body: 'Lift in, check clearance (5–10 mm each side), align with waste + overflow. Confirm tap end.', watchFor: 'Acrylic bath (25–40 kg) solo works. Steel enamel (60 kg+) needs two. Either way, watch fingers between rim + wall.' },
        { title: 'Install bath frame / cradle', body: 'Pre-built frame: assemble per manufacturer, level, screw to sub-floor. Site-built: 90×45 MGP10 blocking to catch underside + ends, screwed to studs + floor.', watchFor: 'Skip the frame + rely on walls = bath flexes under weight. Support under, not just rim.' },
        { title: 'Lower bath onto frame + level', body: 'Set on frame. Level ACROSS (width) — fall to waste is BUILT INTO the bath. Length: level or slight fall to waste (1–2 mm).', watchFor: 'Tilting the bath = puddle at flat end. Level cross-ways; length has built-in drainage.' },
        { title: 'Plumber connects waste + overflow', body: 'Plumber\'s job — waste kit connects to trap + waste pipe below floor. Bath goes IN before waste is connected; access via bath-side panel.', watchFor: 'Concreted-in bath with no access = every future blockage is a wall demo. Provide access.' },
        { title: 'Bed bath rim if manufacturer requires', body: 'Some acrylic baths need sand or foam bed under base for support. Steel enamel usually sits on frame + walls only. Install guide.', watchFor: 'Un-bedded acrylic flexes + cracks. Bed if required.' },
        { title: 'Fit skirt / apron OR tile-in', body: 'Bath skirt: moulded panel around sides. Tiled-in: timber frame + plasterboard / villaboard + waterproof + tile.', watchFor: 'Tiled-in baths need waste-end access panel. Solid-tiled with no access = wall demo for services.' },
        { title: 'Silicone perimeter to wall + floor', body: 'Silicone bead around all bath-to-wall and bath-to-floor edges. Neutral-cure, mould-resistant.', watchFor: 'Grouting perimeter = cracks as bath moves. Silicone flexes.' },
      ],
    },
  },

  // ─── Interior finishing — after wet areas, in fit-out order ──────────────
  {
    id: 'fix-plasterboard',
    category: 'interior-finishing',
    label: 'Fix plasterboard to walls + ceiling',
    summary: 'Ceiling first, walls top-down, screws off, edges taped.',
    nz: {
      tools: ['Tape', 'Chalk line', 'Utility knife + straight-edge', 'Cordless drill / driver', 'Keyhole / drywall saw', 'T-brace or ceiling lifter', 'Ladder / trestle', 'Sanding sponge'],
      materials: ['GIB Standard 10 mm (wall) / 13 mm (ceiling); GIB Aqualine or Villaboard in wet zones; GIB Braceline where bracing scheduled', '32 mm GIB Grabber drywall screws (or Type 25)', 'GIB Handi-Bond adhesive dabs (wall stud fixings)', 'Corner bead: metal or paper-tape (installed at stopping)'],
      steps: [
        { title: 'Confirm framing is ready', body: 'Walk the frame — all nogs in, no protruding fixings, no bowed studs. Any wall carrying horizontal sheet joints needs a nog at the join line (usually 1200 mm from floor for a horizontal sheet).', watchFor: 'A missing nog at a horizontal join = the join will crack the first time someone leans on the wall. Fix at framing stage, not stopping stage.' },
        { title: 'Measure + cut sheets', body: 'Score paper face with utility knife against a straight-edge, snap over, cut the back paper. Score once cleanly, snap decisively — repeated scoring fluffs the edge.', watchFor: 'Ragged snapped edges make wide joints that are hard to stop. One clean score + a sharp snap gives a paint-ready edge.' },
        { title: 'Lift + fix ceilings first', body: 'Use a T-brace or hire a ceiling lifter. Position sheets perpendicular to joists (edges land on joists). Screw at 200 mm c/c along edges, 300 mm c/c in the field.', watchFor: 'Ceilings fixed after walls means the wall sheets don\'t catch the ceiling edge, leaving a crack line. Ceilings first, always.' },
        { title: 'Fix wall sheets top-down', body: 'Top sheet first, pressed hard against ceiling. Bottom sheet after, leaving 5–10 mm gap at floor for expansion + skirting hide.', watchFor: 'Wall sheets fixed bottom-up leave the ceiling-line joint at eye level. Top-down puts the hidden joint at the floor.' },
        { title: 'Cut around openings + services', body: 'Measure from adjacent sheet + framing to mark power point, switch, and window / door openings. Cut with a keyhole saw or router.', watchFor: 'Cutting around a power point AFTER the sheet is fixed = a lot of pain. Mark + pre-cut before lifting the sheet.' },
        { title: 'Screw off without breaking the paper face', body: 'Drill / driver with a drywall bit set to dimple the paper — screw head just below face, no paper tear. Overdriven screws break the paper + the fixing is worthless.', watchFor: 'A blown-out screw needs to come out + a new one 25 mm away. If you\'re getting more than 1 or 2 blow-outs per sheet, adjust the driver clutch.' },
        { title: 'Butt joins over a nog, not mid-span', body: 'Any sheet-to-sheet horizontal joint must land on a nog. Cut sheets to fit around openings so vertical joints don\'t land at a door / window jamb.', watchFor: 'Vertical joint at a door jamb = crack propagates from the corner of the door within a year. Always break the joint away from the opening.' },
      ],
    },
    au: {
      tools: ['Tape', 'Chalk line', 'Utility knife + straight-edge', 'Cordless drill / driver', 'Keyhole / drywall saw', 'T-brace or ceiling lifter', 'Ladder / trestle', 'Sanding sponge'],
      materials: ['Gyprock Standard 10 mm (wall) / 13 mm (ceiling); Gyprock Aquachek or Villaboard in wet areas; braced panels per bracing schedule', '32 mm Type 25 drywall screws', 'Gyprock Wall Adhesive dabs (wall stud fixings)', 'Corner bead: metal or paper-tape (installed at setting)'],
      steps: [
        { title: 'Confirm framing is ready', body: 'Walk the frame — all noggins in, no protruding fixings, no bowed studs. Horizontal sheet joins need a noggin at the join line (typically 1350 mm from floor for a vertical stack).', watchFor: 'Missing noggin at horizontal join = crack first time someone leans on the wall. Fix at framing stage.' },
        { title: 'Measure + cut sheets', body: 'Score paper face with utility knife against straight-edge, snap over, cut back paper. Score once cleanly, snap decisively.', watchFor: 'Ragged edges make wide joints that are hard to set. Clean score + sharp snap gives a paint-ready edge.' },
        { title: 'Lift + fix ceilings first', body: 'T-brace or ceiling lifter. Sheets perpendicular to joists (edges land on joists). Screw at 200 mm c/c edges, 300 mm c/c field.', watchFor: 'Ceilings after walls = wall sheets don\'t catch ceiling edge, leaving a crack. Ceilings first.' },
        { title: 'Fix wall sheets top-down', body: 'Top sheet first, pressed hard against ceiling. Bottom sheet after, 5–10 mm gap at floor for expansion + skirting hide.', watchFor: 'Bottom-up puts the visible joint at eye level. Top-down puts the hidden joint at the floor.' },
        { title: 'Cut around openings + services', body: 'Measure from adjacent sheet + framing to mark power points, switches, openings. Cut with keyhole saw or router.', watchFor: 'Cutting AFTER the sheet is fixed = pain. Pre-cut before lifting.' },
        { title: 'Screw off without breaking the face', body: 'Drywall bit set to dimple paper — head just below face, no tear. Overdriven screws break the paper + fixing is worthless.', watchFor: 'A blown-out screw = new one 25 mm away. More than 1–2 per sheet, adjust driver clutch.' },
        { title: 'Butt joins over a noggin, not mid-span', body: 'Sheet-to-sheet horizontal joins land on a noggin. Cut around openings so vertical joins don\'t land at a jamb.', watchFor: 'Vertical joint at door jamb = crack from door corner within a year. Break the joint away from the opening.' },
      ],
    },
  },
  {
    id: 'stop-plasterboard',
    category: 'interior-finishing',
    label: 'Stop + set plasterboard joints',
    summary: 'Fill, tape, cover, sand — three coats, feather each wider.',
    nz: {
      tools: ['150 mm + 250 mm + 300 mm jointing knives', 'Corner tool (internal)', 'Mixing bucket + paddle', 'Sanding pole + sanding block', 'Ladder / trestle', 'Wet sponge (for cleanup)', 'PPE: dust mask, safety glasses'],
      materials: ['GIB Trade Set (pre-mix or bag) — Level 4 finish standard', 'GIB Cove Adhesive (for setting cornices)', 'GIB Paper Tape (or fibre mesh for corners in some cases)', 'Metal external corner bead OR paper-faced corner tape', 'Fine sanding sponge (P150 + P220)'],
      steps: [
        { title: 'Confirm sheets are fixed + screws set', body: 'Walk every wall + ceiling — no proud screw heads, no missed fixings. Any protrusion telegraphs through the stopping.', watchFor: 'Setting over a proud screw = a lump forever. Fix the screw depth before you mix a bucket.' },
        { title: 'Coat 1: fill + embed tape', body: 'Trowel Trade Set into the recessed joint with the 150 mm knife, filling flush. Bed paper tape into the wet plaster, wipe off excess with the knife at a shallow angle. Do all joints in one sitting so they cure together.', watchFor: 'Air bubbles under the tape appear as blisters after painting. Bed the tape hard + wipe firmly to squeeze all air out.' },
        { title: 'Coat 2: wider skim over the tape', body: 'After Coat 1 has cured (usually 24 hrs), knife a wider coat with the 250 mm knife, feathered each side of the joint. Fill any low spots + cover the tape completely.', watchFor: 'Coat 2 should be smooth + feathered. Ridges + tool marks will show through paint.' },
        { title: 'Coat 3: final feather + skim', body: 'After Coat 2 cures, apply Coat 3 with the 300 mm knife, feathering out even wider (300 mm each side of joint). Should be nearly invisible when dry.', watchFor: 'Three coats is Level 4 finish (paint-ready under normal light). For critical light, add a Level 5 skim coat over the whole wall.' },
        { title: 'Corner treatment (internal + external)', body: 'Internal corners: paper tape folded on the crease, bedded with the corner tool. External corners: metal or paper-faced corner bead, screwed or bedded, then coated over.', watchFor: 'Unbedded internal corners crack every time. Corner-tool bed the tape + coat over — never leave a raw folded tape.' },
        { title: 'Cover screw heads (3 coats each)', body: 'Every screw dimple gets 3 coats of Trade Set — first fill, second wider, third feather. Same schedule as the joints.', watchFor: 'One-coat screw heads show as dots through paint. Three coats or the paint job shows every dot.' },
        { title: 'Sand between coats + final', body: 'Light sand between coats to knock off ridges. Final sand with a P220 sponge — feel for any lumps by hand, not just eye. Wear a mask.', watchFor: 'Over-sanding into the joint area reveals the tape underneath — paper shows through paint. Sand light, feel, stop.' },
      ],
    },
    au: {
      tools: ['150 mm + 250 mm + 300 mm jointing knives', 'Corner tool (internal)', 'Mixing bucket + paddle', 'Sanding pole + sanding block', 'Ladder / trestle', 'Wet sponge', 'PPE: dust mask, safety glasses'],
      materials: ['CSR Total Joint Cement (pre-mix) or Gyprock Base Coat + Top Coat — Level 4 finish standard', 'Gyprock Cornice Cement for cornices', 'Gyprock Paper Tape (or fibre mesh in corners)', 'Metal external corner bead OR paper-faced corner tape', 'Fine sanding sponge (P150 + P220)'],
      steps: [
        { title: 'Confirm sheets fixed + screws set', body: 'Walk every wall + ceiling — no proud screws, no missed fixings. Any protrusion telegraphs through setting.', watchFor: 'Setting over a proud screw = lump forever. Fix screw depth before mixing.' },
        { title: 'Coat 1: fill + embed tape', body: 'Trowel jointing cement into recessed joint with 150 mm knife, flush. Bed paper tape into wet cement, wipe off excess with knife at shallow angle. All joints in one session.', watchFor: 'Air bubbles under tape = blisters after painting. Bed hard, wipe firmly.' },
        { title: 'Coat 2: wider skim over tape', body: 'After Coat 1 cures (usually 24 hrs), knife wider coat with 250 mm knife, feathered each side. Fill low spots + cover tape completely.', watchFor: 'Coat 2 must be smooth + feathered. Ridges + tool marks show through paint.' },
        { title: 'Coat 3: final feather + skim', body: 'After Coat 2 cures, apply Coat 3 with 300 mm knife, feather even wider (300 mm each side of joint). Nearly invisible when dry.', watchFor: 'Three coats = Level 4 finish (paint-ready in normal light). Critical light needs Level 5 full-wall skim.' },
        { title: 'Corner treatment (internal + external)', body: 'Internal: paper tape folded on the crease, bedded with corner tool. External: metal or paper-faced bead, screwed or bedded, then coated over.', watchFor: 'Unbedded internal corners crack every time. Corner-tool bed the tape + coat over — never leave raw folded tape.' },
        { title: 'Cover screw heads (3 coats each)', body: 'Every screw dimple gets 3 coats — fill, wider, feather. Same schedule as joints.', watchFor: 'One-coat screw heads show as dots through paint. Three coats or paint reveals every dot.' },
        { title: 'Sand between coats + final', body: 'Light sand between coats to knock off ridges. Final with P220 sponge — feel for lumps by hand, not just eye. Mask on.', watchFor: 'Over-sanding into joint reveals tape underneath — paper shows through paint. Sand light, feel, stop.' },
      ],
    },
  },
  {
    id: 'install-skirting',
    category: 'interior-finishing',
    label: 'Install skirting',
    summary: 'Cope internals, mitre externals, glue + pin, fill + sand.',
    nz: {
      tools: ['Compound mitre saw', 'Coping saw or oscillating multi-tool', 'Tape', 'Combination square', 'Spirit level (short)', 'Cordless brad nailer (18 ga)', 'Hammer', 'Pin punch', 'Utility knife', 'Sanding block', 'Sealant gun'],
      materials: ['Skirting profile: 90×12 or 140×18 MDF (pre-primed) or radiata pine — profile per architect (bullnose, colonial, square-edge)', '45 mm brad nails (18 ga)', 'Wood glue (PVA) for mitres', 'Paintable acrylic sealant (Gap Filler) for wall gap', 'Wood filler for nail holes'],
      steps: [
        { title: 'Measure walls + calculate stock', body: 'Measure each wall separately, add 300 mm to each length for waste + mitre offsets. Order 15% extra for the whole job.', watchFor: 'Ordering to exact wall lengths = running short mid-install because of a bad cut. 15% waste is standard.' },
        { title: 'Set out first (longest) wall', body: 'Start with the longest wall — cut ends square (butt to butt at each end where it meets adjacent walls). Later walls will scribe / mitre TO this first piece.', watchFor: 'Starting on a short wall leaves you with cuts on every long wall. Longest first minimises visible joints.' },
        { title: 'Cut internal corners with a cope', body: 'Cut the second piece 45° AT the corner to expose the profile shape. Then cut along the exposed profile line with a coping saw or multi-tool, undercutting slightly. Copes fit tight even if the wall corner is out.', watchFor: 'Mitring internal corners (both sides 45°) means any wall movement opens the joint. Cope holds tight for the life of the house.' },
        { title: 'Mitre external corners at 45°', body: 'Both pieces cut at 45° meeting on the outside corner. Glue the mitre joint with PVA before pinning to hold it closed.', watchFor: 'External mitres open up over time if not glued. PVA in the joint + pin from both sides locks it shut.' },
        { title: 'Fix skirting to bottom plate', body: '18 ga brad nailer, 45 mm brads at ~400 mm c/c, angled slightly down through skirting into bottom plate. On concrete floors, glue to wall + brad into studs only.', watchFor: 'Nailing into gib alone = pull-off. Always into bottom plate / stud below the gib. Feel for the plate before pinning.' },
        { title: 'Butt joins on a stud (mid-wall)', body: 'On very long walls where the skirting comes in two pieces, join on a stud with 45° scarf cuts (not 90° butt). Scarf is invisible after fill + paint; butt shows a line.', watchFor: 'Scarf cuts overlap, so the join stays tight even with timber movement. Butt joins gap open as soon as the room dries out.' },
        { title: 'Fill nail holes + sand', body: 'Punch every pin below the surface. Fill with wood filler or Gap Filler, sand smooth once cured. Painter finishes.', watchFor: 'Un-punched pins show as dots through paint. Punch every one, fill flush, sand smooth.' },
        { title: 'Sealant along top edge', body: 'Bead of paintable acrylic sealant along the top of the skirting where it meets the wall. Tools with a wet finger.', watchFor: 'A visible gap between skirting + wall reads as sloppy work. Sealant hides small wall imperfections + gets painted over.' },
      ],
    },
    au: {
      tools: ['Compound mitre saw', 'Coping saw or oscillating multi-tool', 'Tape', 'Combination square', 'Spirit level (short)', 'Cordless brad nailer (18 ga)', 'Hammer', 'Pin punch', 'Utility knife', 'Sanding block', 'Sealant gun'],
      materials: ['Skirting profile: 90×12 or 140×18 MDF (pre-primed) or pine — profile per architect (splayed, colonial, square-edge, half-splay)', '45 mm brad nails (18 ga)', 'Wood glue (PVA) for mitres', 'Paintable acrylic sealant for wall gap', 'Wood filler for nail holes'],
      steps: [
        { title: 'Measure walls + calculate stock', body: 'Measure each wall separately, add 300 mm waste + mitre offsets. Order 15% extra.', watchFor: 'Ordering exact = running short mid-install from bad cuts. 15% waste is standard.' },
        { title: 'Set out first (longest) wall', body: 'Longest wall first — cut ends square (butt to butt where it meets adjacent walls). Later walls scribe / mitre TO this first piece.', watchFor: 'Starting on a short wall = cuts on every long wall. Longest first minimises visible joints.' },
        { title: 'Cut internal corners with a cope', body: 'Cut second piece 45° at the corner to expose profile, then coping saw along the profile line, slight undercut. Copes fit tight even if the corner is out.', watchFor: 'Mitring internal corners = joint opens with wall movement. Cope holds tight for life.' },
        { title: 'Mitre external corners at 45°', body: 'Both pieces 45° meeting on the outside corner. PVA in the mitre before pinning.', watchFor: 'External mitres open over time without glue. PVA + pin both sides locks it.' },
        { title: 'Fix skirting to bottom plate', body: '18 ga brad nailer, 45 mm brads at 400 mm c/c, angled down through skirting into bottom plate. Concrete floors: glue to wall + brad into studs only.', watchFor: 'Nailing into plasterboard alone = pull-off. Always into bottom plate / stud below.' },
        { title: 'Butt joins on a stud (mid-wall)', body: 'Long walls needing two lengths: 45° scarf cuts on a stud (not 90° butt). Scarf invisible after fill + paint; butt shows a line.', watchFor: 'Scarfs overlap, joint stays tight with timber movement. Butts gap open as the room dries.' },
        { title: 'Fill nail holes + sand', body: 'Punch every pin below surface. Fill with wood filler, sand smooth. Painter finishes.', watchFor: 'Un-punched pins show as dots through paint. Punch every one, fill flush, sand smooth.' },
        { title: 'Sealant along top edge', body: 'Paintable acrylic sealant along skirting top where it meets wall. Tool with wet finger.', watchFor: 'Visible gap = sloppy work. Sealant hides small wall imperfections + gets painted over.' },
      ],
    },
  },
  {
    id: 'install-architrave',
    category: 'interior-finishing',
    label: 'Install architrave + door reveals',
    summary: 'Fit reveals first, mitre + fix architrave, punch + fill.',
    nz: {
      tools: ['Compound mitre saw', 'Tape', 'Combination square', 'Cordless brad nailer (18 ga)', 'Hammer', 'Pin punch', 'Spirit level (short)', 'Utility knife', 'Sanding block', 'Sealant gun'],
      materials: ['Architrave profile: 60×18 or 90×18 pre-primed MDF or pine — matching the skirting style', 'Door reveal timber: 90×20 or match jamb depth', '45 mm brad nails', 'PVA for mitres', 'Wood filler + paintable acrylic sealant'],
      steps: [
        { title: 'Fit door reveals FIRST', body: 'Reveals are the strips of timber that sit inside the jamb, level with the finished wall lining face. Cut to length between jamb head + floor. Fix with 45 mm brads into jamb.', watchFor: 'Architrave without reveals = shadow gap between architrave and lining, which architrave can\'t hide. Reveals + architrave together do the finish.' },
        { title: 'Mark the reveal margin', body: 'Standard reveal is 3–5 mm of jamb showing at the door edge before the architrave starts. Mark this margin on the jamb top + both sides with a pencil.', watchFor: 'No margin = architrave overhangs the jamb + door hinges catch. 3–5 mm reveal is the standard reveal margin.' },
        { title: 'Cut architrave head + jambs', body: 'Head piece cut at 45° each end (mitred). Jamb pieces cut at 45° at the top only, square-cut at the floor. Cut all three pieces before fixing any.', watchFor: 'Cutting the top of the jamb architrave first and then trying to mitre-fit the head to it means the head length changes with any error in the jamb cut. Cut all three, then dry-fit.' },
        { title: 'Fix head piece first', body: 'Pin the head to the top of the jamb with 45 mm brads through the architrave face into the reveal + jamb. Two brads at each end (into the jamb + reveal), plus one in the middle.', watchFor: 'Pinning into gib alone = architrave pulls off. Aim into the jamb + reveal timber.' },
        { title: 'Fit jamb pieces + mitres', body: 'Lift each jamb architrave up to meet the head at the mitre — dry-fit first, adjust cut if needed. Glue mitres with PVA before pinning. Pin down the jamb architrave at 400 mm c/c.', watchFor: 'A mitre that doesn\'t close cleanly = visible gap after paint. Undercut the mitre slightly if the wall is out, so the front face of the mitre closes even if the back doesn\'t.' },
        { title: 'Punch pins + fill', body: 'Punch every pin 2 mm below surface. Fill with wood filler or Gap Filler, sand flush once cured.', watchFor: 'Un-punched pins in architrave show badly with side light. Punch, fill, sand.' },
        { title: 'Sealant along wall edge', body: 'Bead of paintable acrylic sealant between architrave outside edge and wall lining. Tool with a wet finger.', watchFor: 'Gaps between architrave + wall read amateur, especially on internal walls where corners aren\'t perfect. Sealant hides.' },
      ],
    },
    au: {
      tools: ['Compound mitre saw', 'Tape', 'Combination square', 'Cordless brad nailer (18 ga)', 'Hammer', 'Pin punch', 'Spirit level (short)', 'Utility knife', 'Sanding block', 'Sealant gun'],
      materials: ['Architrave profile: 60×18 or 90×18 pre-primed MDF or pine — matching skirting', 'Door reveal timber: 90×20 or match jamb depth', '45 mm brad nails', 'PVA for mitres', 'Wood filler + paintable acrylic sealant'],
      steps: [
        { title: 'Fit door reveals FIRST', body: 'Reveals are strips of timber inside the jamb, level with finished wall lining face. Cut to length between jamb head + floor. Fix with brads into jamb.', watchFor: 'Architrave without reveals = shadow gap between architrave + lining. Reveals + architrave together do the finish.' },
        { title: 'Mark the reveal margin', body: 'Standard reveal is 3–5 mm of jamb showing at door edge before architrave starts. Mark on jamb top + sides.', watchFor: 'No margin = architrave overhangs jamb + door hinges catch. 3–5 mm is standard.' },
        { title: 'Cut architrave head + jambs', body: 'Head cut at 45° each end. Jambs cut 45° at top only, square at floor. Cut all three before fixing any.', watchFor: 'Cutting jamb first + mitring head to it = head length changes with any jamb error. Cut all three, dry-fit.' },
        { title: 'Fix head piece first', body: 'Pin head to top of jamb with brads through architrave face into reveal + jamb. Two brads each end + one middle.', watchFor: 'Pinning into plasterboard alone = pulls off. Aim into jamb + reveal.' },
        { title: 'Fit jamb pieces + mitres', body: 'Lift each jamb architrave up to meet head at mitre — dry-fit, adjust cut. PVA before pinning. Pin down at 400 mm c/c.', watchFor: 'Un-closed mitre = visible gap after paint. Undercut slightly if wall is out, so the front face closes even if back doesn\'t.' },
        { title: 'Punch pins + fill', body: 'Punch every pin 2 mm below surface. Fill, sand flush.', watchFor: 'Un-punched pins show badly with side light. Punch, fill, sand.' },
        { title: 'Sealant along wall edge', body: 'Paintable acrylic sealant between architrave outside edge + wall lining. Tool with wet finger.', watchFor: 'Gaps read amateur. Sealant hides.' },
      ],
    },
  },
  {
    id: 'install-splashback',
    category: 'interior-finishing',
    label: 'Install a splashback (tiled or panel)',
    summary: 'Set out feature, dry-fit, adhesive, silicone perimeter.',
    nz: {
      tools: ['Tape', 'Spirit level', 'Notched trowel (for tile) OR utility knife (for panel)', 'Cordless drill / driver', 'Wet saw or tile cutter (tile splashback)', 'Silicone gun', 'Sponge + buckets', 'Marker pen'],
      materials: ['Tiled splashback: mosaic sheets or subway tiles + adhesive + spacers + grout', 'Panel splashback: acrylic (Marbletrend Splashback), toughened glass (pre-cut to size), stainless steel, or laminate (Formica / Laminex)', 'Panel adhesive (Selleys Liquid Nails Wet Area, or heat-resistant behind cooktop)', 'Silicone (mould-resistant, matching)', 'Edge trim / cap strips'],
      steps: [
        { title: 'Confirm cabinets + bench are in', body: 'Splashback sits between bench top + underside of overhead cabinets (or to ceiling if no overheads). Bench height + cabinet position must be finalised before ordering / cutting.', watchFor: 'Ordering a splashback panel before final bench height means the panel comes back the wrong size. Measure post-install.' },
        { title: 'Set out from the cooktop or feature', body: 'Cooktop centreline is the visual anchor — start layout there so any cuts land at the edges. For a tiled splashback, plan cut tiles at the ends, full tiles across the cooktop.', watchFor: 'Random layout = a 20 mm sliver of tile beside the cooktop, which reads badly. Feature the cooktop with a full tile pattern.' },
        { title: 'Snap a horizontal reference', body: 'Chalk a level line 100–150 mm above the bench (the bottom of the splashback). Reference every tile / panel edge from this line, not off the bench (which may not be dead level).', watchFor: 'Setting off an un-level bench cascades unevenness up the wall. Snap a level reference line first.' },
        { title: 'Cut around outlets + taps', body: 'Mark power point + tap positions on the tile / panel from the wall behind. Cut with the appropriate tool — hole saw for round taps, jigsaw + fine blade for square outlets.', watchFor: 'Measure from adjacent power points three times before cutting — a mis-cut hole in a $600 glass panel is a total replacement.' },
        { title: 'Apply adhesive + press', body: 'Tiled: notched trowel on wall, tile-and-spacer up. Panel: bead adhesive on the panel back per manufacturer (usually squiggle + perimeter), press hard to wall, hold with masking tape till adhesive grabs.', watchFor: 'Panel adhesives have specific bead patterns. Follow the manufacturer\'s diagram — random blobs give patchy bond + visible outgassing marks.' },
        { title: 'Grout (tiled) OR silicone perimeter (panel)', body: 'Tiled: after 24 hrs, grout joints + sponge off haze. Panel: silicone around all edges + at any join (panel-to-panel, panel-to-bench, panel-to-cabinet).', watchFor: 'A splashback without silicone at the bench junction lets water down behind the cabinets. Silicone every edge that meets water risk.' },
        { title: 'Fit edge trim if exposed', body: 'Exposed vertical edges (return to a fridge cavity, end of a run) need edge trim (colour-matched aluminium) or a mitred / bullnose edge. Set out before fitting.', watchFor: 'Un-trimmed panel edges chip + reveal the substrate. Trim always at exposed edges.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'Notched trowel (tile) OR utility knife (panel)', 'Cordless drill / driver', 'Wet saw or tile cutter', 'Silicone gun', 'Sponge + buckets', 'Marker pen'],
      materials: ['Tiled splashback: mosaic or subway tiles + adhesive + spacers + grout', 'Panel splashback: acrylic (Innovera, iSplash), toughened glass (pre-cut), stainless steel, or laminate (Laminex / Formica)', 'Panel adhesive (Selleys Liquid Nails Wet Area — heat-resistant behind cooktop)', 'Silicone (mould-resistant, matching)', 'Edge trim / cap strips'],
      steps: [
        { title: 'Confirm cabinets + bench are in', body: 'Splashback sits between bench + underside of overheads (or to ceiling). Bench height + cabinet position final before ordering / cutting.', watchFor: 'Ordering before final bench height = wrong-size panel. Measure post-install.' },
        { title: 'Set out from cooktop or feature', body: 'Cooktop centreline is the visual anchor. Cuts at the ends, full tiles across cooktop.', watchFor: 'Random layout = 20 mm sliver beside cooktop, reads badly. Feature the cooktop with full pattern.' },
        { title: 'Snap a horizontal reference', body: 'Chalk level line 100–150 mm above bench (bottom of splashback). Reference every edge from this line, not bench.', watchFor: 'Un-level bench cascades unevenness up wall. Snap level line first.' },
        { title: 'Cut around outlets + taps', body: 'Mark power point + tap positions from the wall behind. Hole saw for round, jigsaw + fine blade for square.', watchFor: 'Measure three times before cutting a $600 glass panel. Mis-cut = total replacement.' },
        { title: 'Apply adhesive + press', body: 'Tiled: notched trowel on wall, tile-and-spacer up. Panel: bead adhesive on back per manufacturer (squiggle + perimeter), press to wall, masking tape hold till grab.', watchFor: 'Panel adhesives have specific bead patterns. Follow diagram — random blobs = patchy bond + outgassing marks.' },
        { title: 'Grout (tiled) OR silicone perimeter (panel)', body: 'Tiled: 24 hrs, grout + sponge. Panel: silicone all edges + panel-to-bench + panel-to-cabinet.', watchFor: 'Splashback without silicone at bench = water behind cabinets. Silicone every edge with water risk.' },
        { title: 'Fit edge trim if exposed', body: 'Exposed vertical edges (return to fridge cavity, end of run) need trim (colour-matched aluminium) or mitre / bullnose. Set out before fitting.', watchFor: 'Un-trimmed edges chip + reveal substrate. Trim at exposed edges.' },
      ],
    },
  },
  {
    id: 'install-cabinets',
    category: 'interior-finishing',
    label: 'Install cabinets (kitchen or laundry)',
    summary: 'Overhead first, base level on legs, screw to studs + together.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Stud finder', 'F-clamps', 'Marker pen', 'Trestle or stand', 'Packers / shims'],
      materials: ['Cabinet carcasses (flat-pack or pre-assembled — Melamine / MDF / ply)', '65–75 mm bugle screws (cabinets to wall studs)', '35 mm cabinet-to-cabinet screws (through side panels)', 'Adjustable levelling legs (base cabinets) + kickboard clip system', 'Kickboard (matching cabinet finish)', 'Filler panels (matching)', 'Cabinet-hanging brackets (overheads: usually EasyGates or similar rail system)'],
      steps: [
        { title: 'Confirm services are roughed-in', body: 'Plumber\'s hot / cold + waste for sink, electrical for oven + rangehood + power points, gas for cooktop — all must be positioned per the cabinet layout drawing before cabinets go in.', watchFor: 'Cabinets fitted around wrongly-positioned services = re-cut cabinet backs (visible + weak) or re-plumb (expensive). Coordinate before install day.' },
        { title: 'Mark cabinet positions on wall + floor', body: 'From the layout drawing, mark base cabinet perimeter on the floor + overhead cabinet perimeter on the wall. Note stud positions relative to fixings.', watchFor: 'Fitting cabinets without marking = drift as the run goes on. A 5 mm drift per cabinet compounds to 30+ mm over a 6-cabinet run.' },
        { title: 'Install overhead cabinets first', body: 'Fit a hanging rail (EasyGates / similar) along the wall at the correct height. Hook each overhead onto the rail — the rail catches the weight, so solo lift + fix is fine. Fix through the back rail into stud with 65 mm bugle screws, adjust the rail levellers, done.', watchFor: 'Fitting overheads AFTER base cabinets = restricted access + can\'t lift the cabinet high enough. Overheads first, always.' },
        { title: 'Level base cabinets on legs', body: 'Adjust each cabinet\'s levelling legs (4 per cabinet, hex-key adjust) so cabinet top is level in both directions + tops all match across the run. Use a long spirit level to sight across cabinets.', watchFor: 'Un-level base cabinets = un-level bench top = a nightmare for the stone benchtop fabricator. Level tops within 1 mm across the whole run.' },
        { title: 'Screw base cabinets together', body: 'Clamp adjacent cabinets face-flush at the front, then screw through side panels with 35 mm cabinet screws (3 per pair: top, middle, bottom). Cabinets act as one unit once screwed.', watchFor: 'Face frames not flush = a visible step between cabinets. Clamp faces flush BEFORE screwing.' },
        { title: 'Fix base cabinets to wall', body: 'Through the cabinet back rail into wall studs with 65 mm bugle screws (2 per cabinet minimum). Straps or blocking behind if a stud doesn\'t line up.', watchFor: 'Base cabinets not fixed to the wall drift forward under sink use + open drawers slam back. Always wall-fix.' },
        { title: 'Fit kickboards, fillers, cornices', body: 'Kickboard clips onto adjustable legs, cut to length between end panels. Filler panels at end returns (fridge cavity, walls). Cornice / pelmet along top of overheads if design calls.', watchFor: 'Un-fitted kickboards leave a visible gap under cabinets + collect dust + water. Every base cabinet run gets kickboards.' },
        { title: 'Hand over to stone benchtop fabricator', body: 'Bench-top is a separate day — the fabricator templates the cabinet top surface after cabinets are installed + level. Confirm cabinet-to-cabinet joints are locked, no movement.', watchFor: 'A stone bench-top templated onto un-locked cabinets moves after install + the joint cracks. Templating requires cabinets in final position.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Stud finder', 'F-clamps', 'Marker pen', 'Trestle or stand', 'Packers / shims'],
      materials: ['Cabinet carcasses (flat-pack or pre-assembled — Melamine / MDF / ply)', '65–75 mm Type 17 screws (cabinets to wall studs)', '35 mm cabinet-to-cabinet screws', 'Adjustable levelling legs + kickboard clip system', 'Kickboard (matching finish)', 'Filler panels (matching)', 'Cabinet-hanging brackets (overheads)'],
      steps: [
        { title: 'Confirm services are roughed-in', body: 'Plumber\'s hot / cold + waste for sink, electrician for oven + rangehood + power, gas for cooktop — all positioned per cabinet layout before cabinets go in.', watchFor: 'Cabinets around wrongly-positioned services = re-cut backs (visible + weak) or re-plumb. Coordinate before install day.' },
        { title: 'Mark cabinet positions on wall + floor', body: 'From the layout drawing, mark base cabinet perimeter on floor + overhead perimeter on wall. Note stud positions relative to fixings.', watchFor: 'Un-marked = drift as run goes on. 5 mm drift per cabinet compounds to 30+ mm over 6 cabinets.' },
        { title: 'Install overhead cabinets first', body: 'Fit hanging rail along wall at correct height. Hook each overhead onto the rail — rail catches the weight so solo lift + fix is fine. Fix through back rail into stud with 65 mm Type 17s, adjust rail levellers, done.', watchFor: 'Overheads after base = restricted access + can\'t lift high enough. Overheads first.' },
        { title: 'Level base cabinets on legs', body: 'Adjust levelling legs (4 per cabinet, hex-key) so cabinet top is level both directions + tops match across the run. Long spirit level to sight across cabinets.', watchFor: 'Un-level bases = un-level bench = nightmare for stone fabricator. Level tops within 1 mm across the whole run.' },
        { title: 'Screw base cabinets together', body: 'Clamp adjacent cabinets face-flush at front, screw through side panels with 35 mm screws (3 per pair). Cabinets act as one unit once screwed.', watchFor: 'Face frames not flush = visible step. Clamp faces flush BEFORE screwing.' },
        { title: 'Fix base cabinets to wall', body: 'Through cabinet back rail into wall studs with 65 mm Type 17s (2 per cabinet min). Straps / blocking behind if a stud doesn\'t line up.', watchFor: 'Un-wall-fixed base cabinets drift forward under sink use + open drawers slam back. Always wall-fix.' },
        { title: 'Fit kickboards, fillers, cornices', body: 'Kickboard clips onto legs, cut to length between end panels. Filler panels at end returns. Cornice / pelmet along top of overheads if design calls.', watchFor: 'Un-fitted kickboards = visible gap + collects dust / water. Every base cabinet run gets kickboards.' },
        { title: 'Hand over to stone benchtop fabricator', body: 'Benchtop is separate — fabricator templates the cabinet top after install + level. Confirm cabinet-to-cabinet joints locked, no movement.', watchFor: 'Stone templated onto un-locked cabinets moves + joint cracks. Templating requires final position.' },
      ],
    },
  },

  // ─── Decking & outdoor — usually last on a new build ─────────────────────
  {
    id: 'build-deck',
    category: 'decking-outdoor',
    label: 'Build a deck (posts → bearers → joists → boards)',
    summary: 'End-to-end sub-frame + board fix, from setout to finished surface.',
    nz: {
      tools: ['30 m tape', 'Laser or dumpy + staff', 'Spirit level (long)', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Decking gap tool', 'Chalk line'],
      materials: ['Posts: 125×125 or 100×100 H5 CCA-treated pine', 'Post brackets: Lumberlok or Trigo galvanised post anchors', 'Bearers: 190×45 or 240×45 H3.2 pine', 'Joists: 140×45 H3.2 pine, hangers where needed', 'Deck boards: 140×32 H3.2 pine, kwila, vitex, or Modwood composite', 'Fixings: M12 galv coach bolts (bearer to post); 65 mm SS or hi-tensile deck screws (boards to joists); joist-hanger nails', 'Concrete: 20 MPa (Placemakers or Firth pre-mix bag)', 'Fascia + skirt board (same as deck board)'],
      steps: [
        { title: 'Set out post positions', body: 'From the house wall (or profile boards), string-line the deck perimeter. Mark post positions at spacing per bearer size — typically 1.4–2.4 m for 190×45 bearer. Corner posts first, then intermediates.', watchFor: 'Post spacing drives bearer size + joist span. NZS 3604 §6.3 tables cover it; over-spacing posts means over-sized bearers or a bouncy deck.' },
        { title: 'Dig + concrete post footings', body: 'Post-hole borer to 600 mm depth (or per plan / soil condition). Pour 20 MPa concrete around the post-anchor bracket, plumb the bracket while wet. Let cure 24 hrs minimum before loading.', watchFor: 'Setting anchor brackets in wet concrete is much easier than trying to hit exact position later. Plumb the bracket while the mix is still workable.' },
        { title: 'Cut posts to length', body: 'From the laser, shoot each anchor bracket top and calculate post length to hit finished bearer top. Cut all posts at once, chamfer the top for water shed.', watchFor: 'Cutting posts too short = pack + shim (weak). Too long = mid-height cut once bearer is on (fiddly). Measure carefully off the laser.' },
        { title: 'Fix bearers to posts', body: 'Sit bearer on top of post, level. Fix with M12 galv coach bolts through bearer + post (2 per connection) or use Lumberlok post-cap brackets. Long bearers may need laminated 2×190×45 for strength.', watchFor: 'Bearer joins on a post — never mid-span. If a bearer needs joining, lap over the post with 300 mm minimum overlap.' },
        { title: 'Lay joists over bearers', body: 'Joist spacing per board thickness — 400 c/c for 32 mm boards, 450 c/c for 40 mm. Skew-nail 2× 90 mm nails per bearing point, or joist hangers where joist doesn\'t sit directly on bearer.', watchFor: 'Rotate crowned joists CROWN UP. A crown-down joist gives a permanent dip in the deck surface above.' },
        { title: 'Block between joists at midspan', body: 'Solid off-cuts between joists at midspan, skew-nailed both sides. Stops joists rolling + gives a nail line for board joins if needed.', watchFor: 'Un-blocked joists twist under foot traffic + the deck feels bouncy. Not optional on spans over 2.4 m.' },
        { title: 'Fit fascia + skirt boards', body: 'Fascia board around the deck perimeter, screwed to joist / bearer ends. Skirt boards close in the underside (up to ground level). Leave 25 mm ventilation gap at bottom.', watchFor: 'Fascia + skirt without a vent gap = under-deck sub-floor rots. E2/AS1 requires sub-floor ventilation, even for decks.' },
        { title: 'Lay deck boards with a gap tool', body: 'Start against the house or square edge. Use a gap tool (or 5 mm packer) for consistent spacing. Fix 2× SS or hi-tensile deck screws per joist crossing, 15 mm from each edge.', watchFor: 'Screws too close to the board edge (< 15 mm) split the board on drive-in. Pre-drill boards with a countersink pilot if using hardwood.' },
        { title: 'Trim + finish edges', body: 'Snap a chalk line along the deck edge, run a circular saw for a straight cut. Ease board edges with a router or sandpaper if bare timber. Apply timber stain / oil per manufacturer.', watchFor: 'End-grain on cut boards sucks water fastest. Prime or oil cut ends before the deck sees rain.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Laser or dumpy + staff', 'Spirit level (long)', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Decking gap tool', 'Chalk line'],
      materials: ['Posts: 125×125 or 100×100 H5 CCA-treated pine', 'Post brackets: Pryda, Multinail, or Bowmac galvanised post anchors', 'Bearers: 190×45 F17 hardwood or MGP12 pine (H3-treated)', 'Joists: 140×45 F17 hardwood or MGP12, hangers where needed', 'Deck boards: 140×19 or 140×32 Merbau, Spotted Gum, treated pine, or composite (Modwood, Ekodeck)', 'Fixings: M12 galv coach bolts (bearer to post); 65 mm SS deck screws (Merbau needs SS); joist-hanger nails', 'Concrete: N20 pre-mix', 'Fascia + skirt board'],
      steps: [
        { title: 'Set out post positions', body: 'From house wall (or profile boards), string-line deck perimeter. Post spacing per bearer size — typically 1.4–2.4 m for 190×45. Corner posts first, then intermediates.', watchFor: 'Post spacing drives bearer size + joist span. AS 1684.2 tables cover it. Over-spacing = over-sized bearers or bouncy deck.' },
        { title: 'Dig + concrete post footings', body: 'Post-hole borer to 600 mm depth (or per plan / soil class). N20 concrete around post-anchor bracket, plumb bracket while wet. 24 hrs cure before loading.', watchFor: 'Setting anchor in wet concrete beats trying to hit exact position later. Plumb bracket while mix is workable.' },
        { title: 'Cut posts to length', body: 'From laser, shoot each bracket top + calculate post length to hit finished bearer top. Cut all at once, chamfer top for water shed.', watchFor: 'Too short = pack + shim (weak). Too long = mid-height cut once bearer is on (fiddly). Measure carefully off laser.' },
        { title: 'Fix bearers to posts', body: 'Sit bearer on top of post, level. M12 galv coach bolts through bearer + post (2 per connection) or Pryda post-cap brackets. Long bearers may need laminated 2×190×45.', watchFor: 'Bearer joins on a post — never mid-span. Lap over post with 300 mm min overlap if joining.' },
        { title: 'Lay joists over bearers', body: 'Joist spacing per board thickness — 400 c/c for 32 mm, 450 c/c for 40 mm. Skew-nail 2× 90 mm per bearing, or joist hangers where joist doesn\'t sit on bearer.', watchFor: 'Crown UP. Crown-down joist gives permanent dip in deck.' },
        { title: 'Block between joists at midspan', body: 'Solid off-cuts between joists at midspan, skew-nailed both sides. Stops rolling + gives nail line for board joins.', watchFor: 'Un-blocked joists twist under foot traffic + deck feels bouncy. Not optional on spans > 2.4 m.' },
        { title: 'Fit fascia + skirt boards', body: 'Fascia around deck perimeter, screwed to joist / bearer ends. Skirt boards close in underside (to ground). 25 mm ventilation gap at bottom.', watchFor: 'No vent gap = under-deck sub-floor rots. NCC requires sub-floor ventilation, even for decks. In termite zones, keep skirt clear of timber-to-ground contact.' },
        { title: 'Lay deck boards with a gap tool', body: 'Start against house or square edge. Gap tool (or 5 mm packer) for consistent spacing. 2× SS deck screws per joist crossing, 15 mm from each edge. Hardwoods (Merbau, Spotted Gum) need SS or hot-dip galv only.', watchFor: 'Screws < 15 mm from board edge split the board. Pre-drill with countersink pilot in hardwood.' },
        { title: 'Trim + finish edges', body: 'Chalk line along deck edge, circular saw for straight cut. Ease board edges with router or sandpaper if bare. Apply timber oil per manufacturer.', watchFor: 'End-grain on cut boards sucks water fastest. Prime or oil cut ends before rain hits.' },
      ],
    },
  },
  {
    id: 'build-pergola',
    category: 'decking-outdoor',
    label: 'Build a pergola or verandah',
    summary: 'Posts + beams + rafters + roof — an outdoor room.',
    nz: {
      tools: ['30 m tape', 'Laser or dumpy + staff', 'Spirit level (long)', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Ladder / trestle'],
      materials: ['Posts: 125×125 or 150×150 H5 CCA-treated pine', 'Post brackets: Lumberlok / Trigo galv anchors', 'Beams / rafters: 240×45 or 290×45 H3.2 pine (or laminated LVL for long spans)', 'Purlins / battens: 90×45 H3.2 pine', 'Fixings: M12 galv coach bolts, joist hangers, 100 mm bugle screws', 'Concrete: 20 MPa', 'Roof cover: polycarbonate sheet (Sunlite / Suntuf), colorsteel, timber slats, or shade sail'],
      steps: [
        { title: 'Confirm structure + wind zone', body: 'Pergolas over 20 m² floor area or attached to the house usually need consent. NZS 3604 §2.5 wind zone (Low / Medium / High / Very High / Extra High) drives post + beam sizes. Check with council before starting.', watchFor: 'Pergolas as covered outdoor spaces are "buildings" under the Building Act. Un-consented builds get red-stickered + demolished. Consent first.' },
        { title: 'Set out post positions', body: 'From house wall or profile boards, string-line perimeter. Post spacing per beam size — 2.4–3.6 m typical for 240×45 beam. Mark all positions before digging.', watchFor: 'Post spacing over 3.6 m needs a much bigger beam (or a laminated one). Match spacing to what the plan calls out.' },
        { title: 'Dig + concrete footings', body: 'Post-hole borer to 600–900 mm (deeper for tall pergolas + high wind zones). 20 MPa concrete around post-anchor bracket, plumb while wet.', watchFor: 'Pergolas catch a lot of wind. Under-depth footings + tall structure = uplift + toppling in a storm. Match depth to plan / wind zone.' },
        { title: 'Cut + stand posts, brace temporarily', body: 'Cut posts to finished height (measure from anchor top). Stand each post, brace to nearby fixed points until beams are on.', watchFor: 'Posts are top-heavy without beams. Two braces per post minimum (in different directions) until permanent structure locks them.' },
        { title: 'Fix head beams to posts', body: 'Lift beam onto post tops. Fix with M12 coach bolts through beam + post (2 per connection) or Lumberlok post-cap brackets. Long beams may need laminating on site.', watchFor: 'Beam-to-post connection carries roof + wind uplift load. Follow the fixing schedule; a beam sitting on a post with two nails will pull off in a gust.' },
        { title: 'Fit rafters + purlins', body: 'Rafters across beams at 600 c/c typical. Fix with joist hangers or skew-nails + strap. Purlins across rafters per roof-cover spacing (300–900 mm depending on cover material).', watchFor: 'Rafter-to-beam connection needs uplift capacity. Use hangers with an uplift rating, not just skew-nails.' },
        { title: 'Fix roof cover', body: 'Polycarb: pre-drill oversize holes, fix with roofing screws + EPDM washers. Colorsteel: same as a metal roof — long-run sheets on battens. Timber slats or shade sail: fix per design.', watchFor: 'Polycarb expands + contracts a lot in temperature. Pre-drilled oversize holes let it move; screwed tight = cracked sheets.' },
        { title: 'Fit trim + flashings', body: 'End caps on polycarb, apron flashings against house wall if attached. Fascia trim along roof perimeter for a finished look.', watchFor: 'Un-capped polycarb ends fill with dust + spiders. Cap always.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Laser or dumpy + staff', 'Spirit level (long)', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Ladder / trestle'],
      materials: ['Posts: 125×125 or 150×150 H5 CCA-treated pine', 'Post brackets: Pryda, Multinail, or Bowmac galv anchors', 'Beams / rafters: 240×45 or 290×45 F17 hardwood or MGP12 pine (or LVL)', 'Purlins / battens: 90×45 H3-treated pine', 'Fixings: M12 galv coach bolts, joist hangers, 100 mm Type 17 screws', 'Concrete: N20', 'Roof cover: polycarb (Suntuf, Ampelite), COLORBOND, timber slats, shade sail'],
      steps: [
        { title: 'Confirm structure + wind class', body: 'Pergolas often need council permit — thresholds vary by state (typically over 10–20 m² or attached to house). AS 1684.2 wind classification drives post + beam sizes. Check before building.', watchFor: 'Un-permitted structures get pulled up on sale (building inspection). Permit first.' },
        { title: 'Set out post positions', body: 'From house wall or profile boards, string-line perimeter. Post spacing per beam size — 2.4–3.6 m typical for 240×45 beam.', watchFor: 'Spacing > 3.6 m needs a much bigger or laminated beam. Match to plan.' },
        { title: 'Dig + concrete footings', body: 'Post-hole borer to 600–900 mm (deeper for tall pergolas + high wind class). N20 concrete around post-anchor bracket, plumb while wet.', watchFor: 'Pergolas catch wind. Under-depth footings + tall structure = uplift + toppling in a storm. Match to plan / wind class. In cyclonic zones the schedule is much tighter.' },
        { title: 'Cut + stand posts, brace temporarily', body: 'Cut posts to finished height (from anchor top). Stand each, brace to nearby fixed points until beams are on.', watchFor: 'Posts top-heavy without beams. Two braces per post minimum, different directions.' },
        { title: 'Fix head beams to posts', body: 'Beam onto post tops. M12 coach bolts through beam + post (2 per connection) or Pryda post-cap brackets. Long beams: laminate on site.', watchFor: 'Beam-to-post connection carries roof + wind uplift. Follow fixing schedule; two nails won\'t hold in a gust.' },
        { title: 'Fit rafters + purlins', body: 'Rafters across beams at 600 c/c typical. Joist hangers or skew-nails + strap. Purlins across rafters per roof-cover spacing.', watchFor: 'Rafter-to-beam needs uplift capacity. Hangers with uplift rating, not just skew-nails.' },
        { title: 'Fix roof cover', body: 'Polycarb: pre-drill oversize holes, roofing screws + EPDM washers. COLORBOND: same as metal roof — long-run sheets on battens. Slats / shade sail: per design.', watchFor: 'Polycarb expands + contracts. Pre-drilled oversize holes let it move; tight-screwed = cracked sheets.' },
        { title: 'Fit trim + flashings', body: 'End caps on polycarb, apron flashings against house wall if attached. Fascia trim along roof perimeter.', watchFor: 'Un-capped polycarb ends fill with dust + spiders. Cap always.' },
      ],
    },
  },
  {
    id: 'build-external-stairs',
    category: 'decking-outdoor',
    label: 'Build external timber stairs',
    summary: 'Rise / run, stringers, treads, handrails + balustrade.',
    nz: {
      tools: ['Tape', 'Framing square', 'Spirit level', 'Drop / circular saw', 'Jigsaw', 'Cordless drill / impact driver', 'Hammer', 'Spade (for landing pad)', 'Sledge'],
      materials: ['Stringers: 240×45 or 290×45 H3.2 pine (cut from a solid board or bought as pre-cut)', 'Treads: 2× 140×32 H3.2 pine (per tread) or 235×32 single board', 'Risers (optional): 140×19 H3.2', 'Handrail: 90×45 or 90×70 H3.2, min 900 mm above tread nosing (NZBC D1)', 'Balusters: 90×19 H3.2 or aluminium, max 100 mm gap (NZBC D1)', 'Fixings: 100 mm bugle screws + M12 galv bolts', 'Concrete for base pad if resting on ground'],
      steps: [
        { title: 'Measure total rise + calculate steps', body: 'Total rise = finished deck FFL to finished ground level. Number of steps = total rise ÷ target riser height (170–190 mm ideal). Adjust riser height so it divides evenly. Going = 250–280 mm target.', watchFor: 'NZBC D1 max riser 190 mm, min going 280 mm for private stairs. Steps that vary in rise or going are a trip hazard + fail inspection.' },
        { title: 'Cut stringers with a framing square', body: 'Use a framing square to mark rise + run on the stringer edge, step by step. Cut with a circular saw + finish corners with a jigsaw. Cut both stringers together for consistency.', watchFor: 'A stringer with a 5 mm difference in one step will make that step feel wrong to walk on. Match both stringers exactly.' },
        { title: 'Fix stringer top to deck', body: 'Bolt stringer tops to deck framing (bearer or joist) with M12 galv bolts, or use Lumberlok stringer brackets. Confirm the top step aligns with finished deck surface.', watchFor: 'A top step that\'s different from the rest = walker mis-steps + falls. First step down from a deck must match the general riser height.' },
        { title: 'Pour a concrete pad at the base', body: 'Ground under bottom stringer needs a solid base — pour a small concrete pad (400 × 400 × 100 min) if landing on ground. Stringer bottom sits on the pad with a metal bracket to keep it dry.', watchFor: 'Stringers directly on ground rot within a few years. Concrete pad + metal bracket = decades of life.' },
        { title: 'Cut + fix treads', body: 'Treads bear on stringer notches. Fix with 2× 100 mm bugle screws per stringer, pre-drilled to prevent split. Use two 140 mm boards per tread with a 5–10 mm gap for drainage.', watchFor: 'Single wide boards without a drainage gap pool water + rot from below. Two boards + a gap sheds water.' },
        { title: 'Fit risers (optional)', body: 'Risers close in the vertical gap between treads. Cut to fit under the tread above, fix through stringer face. Some designs skip risers (open-tread stairs) for a lighter look.', watchFor: 'Open-tread stairs are cheaper but children\'s feet can catch. Check if the design requires risers per the client\'s brief.' },
        { title: 'Install handrail + balustrade', body: 'Handrail min 900 mm above tread nosing (NZBC D1). For stairs over 1 m drop, balustrade required with max 100 mm gap between balusters. Fix handrail posts to stringer sides with M12 bolts.', watchFor: 'Baluster gap over 100 mm fails inspection + is a child-safety issue. Check every gap with a 100 mm block.' },
        { title: 'Prime cut ends + apply finish', body: 'Every cut end of every timber piece gets primer / oil before assembly. Once built, oil or paint the whole assembly per client spec.', watchFor: 'Un-sealed cut ends soak water and rot from the inside. Prime cut ends BEFORE assembly, not after.' },
      ],
    },
    au: {
      tools: ['Tape', 'Framing square', 'Spirit level', 'Drop / circular saw', 'Jigsaw', 'Cordless drill / impact driver', 'Hammer', 'Spade (for landing pad)', 'Sledge'],
      materials: ['Stringers: 240×45 or 290×45 F17 hardwood or MGP12 pine (H3-treated)', 'Treads: 2× 140×32 hardwood / treated pine per tread or 235×32 single board', 'Risers (optional): 140×19', 'Handrail: 90×45 or 90×70, min 865 mm above tread nosing (NCC Vol 2 3.9.2)', 'Balusters: 90×19 or aluminium, max 125 mm gap (some states 100 mm — check)', 'Fixings: 100 mm Type 17 + M12 galv bolts', 'Concrete for base pad'],
      steps: [
        { title: 'Measure total rise + calculate steps', body: 'Total rise = deck FFL to ground FFL. Steps = total rise ÷ target riser (170–190 mm ideal). Adjust riser so it divides evenly. Going (tread depth) 250–280 mm target.', watchFor: 'BCA / NCC Vol 2 3.9.2 max riser 190 mm, min going 240 mm for private stairs. Steps that vary in rise / going = trip hazard + fail inspection.' },
        { title: 'Cut stringers with a framing square', body: 'Framing square to mark rise + run on stringer edge, step by step. Circular saw + finish corners with jigsaw. Cut both stringers together for consistency.', watchFor: 'A stringer with 5 mm step-difference feels wrong to walk on. Match both exactly.' },
        { title: 'Fix stringer top to deck', body: 'Bolt tops to deck framing (bearer / joist) with M12 galv bolts or Pryda stringer brackets. Top step aligns with finished deck surface.', watchFor: 'Top step different from rest = walker mis-steps. First step down from deck matches general riser height.' },
        { title: 'Pour a concrete pad at the base', body: 'Solid base under bottom stringer — small concrete pad (400 × 400 × 100 min) if landing on ground. Stringer sits on pad with metal bracket to keep dry. In termite zones, keep timber off ground.', watchFor: 'Stringers on ground rot in a few years. Concrete + metal bracket = decades of life. Termite zones: no timber-to-ground contact.' },
        { title: 'Cut + fix treads', body: 'Treads bear on stringer notches. 2× 100 mm Type 17s per stringer, pre-drilled to prevent split. Two 140 mm boards per tread with 5–10 mm drainage gap.', watchFor: 'Single wide boards without gap pool water + rot from below. Two boards + gap sheds water.' },
        { title: 'Fit risers (optional)', body: 'Risers close vertical gap between treads. Cut to fit under tread above, fix through stringer face. Open-tread stairs (no risers) skipped for lighter look.', watchFor: 'Open-tread cheaper but children\'s feet can catch. Check design.' },
        { title: 'Install handrail + balustrade', body: 'Handrail min 865 mm above tread nosing on stairs (NCC Vol 2 3.9.2). Landings + balconies need 1000 mm. Stairs > 1 m drop = balustrade required, max 125 mm baluster gap (100 mm in some states, e.g. NSW). Fix handrail posts to stringer with M12 bolts.', watchFor: 'Baluster gap over 125 mm fails inspection + is a child-safety issue. Check gap with block.' },
        { title: 'Prime cut ends + apply finish', body: 'Every cut end gets primer / oil before assembly. Once built, oil or paint per client spec.', watchFor: 'Un-sealed cut ends soak water + rot from inside. Prime BEFORE assembly.' },
      ],
    },
  },
  {
    id: 'build-retaining-wall',
    category: 'decking-outdoor',
    label: 'Build a timber retaining wall',
    summary: 'Posts + rails + drainage + backfill (under consent threshold).',
    nz: {
      tools: ['Tape', 'Spirit level', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Shovel'],
      materials: ['Posts: 125×125 or 150×150 H5 CCA-treated pine (deeper section for taller walls)', 'Rails / lags: 200×50 H4-treated pine (for horizontal boards) OR 100×50 H4 (for vertical infill)', 'Drainage aggregate: GAP 20 or scoria (behind wall)', 'Novacoil / drain pipe: 100 mm, along wall base', 'Geo-textile fabric (bidim or Ecogrid): between wall + backfill', 'Fixings: 100 mm bugle screws, 200 mm galv coach bolts for posts', 'Concrete: 20 MPa (for post footings)', 'Capping timber (optional): 200×50 H4'],
      steps: [
        { title: 'Confirm wall height + consent status', body: 'Retaining walls under 1.5 m exposed height (measured from downhill side) don\'t need consent under Schedule 1 of the Building Act — but check any council overlay. Walls near boundaries, drainage courses, or loading are engineered.', watchFor: 'Un-consented walls over 1.5 m are a $30k+ demolition + re-build order from council. Check consent status BEFORE digging.' },
        { title: 'Rule of thumb: 1/3 in ground', body: 'For a wall retaining 1.2 m exposed height, posts should be 400 mm minimum in the ground. Deeper on soft ground, or if under load (e.g. driveway retention). Confirm from engineer if uncertain.', watchFor: 'Under-depth posts topple when the backfill saturates + puts hydrostatic load on the wall. Depth is critical.' },
        { title: 'Set out post positions + dig', body: 'Post spacing 1.2–1.8 m depending on rail size. String-line for straightness. Bore each hole with a post-hole borer to design depth.', watchFor: 'Post spacing over 1.8 m needs a much bigger rail (200×75 or similar) — under-sized rails bow under load.' },
        { title: 'Concrete posts in position', body: '20 MPa concrete around each post, plumb the post while wet. Slope the top of the concrete outward for water shed. 24 hrs cure before loading.', watchFor: 'Posts set out of plumb can\'t be fixed later without pulling out the whole footing. Plumb every post + check with a level as you go.' },
        { title: 'Fix rails horizontally between posts', body: '200×50 H4 rails, one above the other, screwed to post faces with 100 mm bugle screws (2 per rail per post). Start at the bottom, work up.', watchFor: 'Rails on the wrong side of the posts (uphill side instead of downhill) puts the load in the wrong direction. Rails go on the DOWNHILL face, holding back the fill.' },
        { title: 'Line the wall with geo-textile', body: 'Geo-textile fabric between rails + backfill. Purpose is to stop fine soil washing through gaps in the rails while allowing water to drain through.', watchFor: 'Un-textiled walls silt up the drainage aggregate + fail. Geo-textile is essential.' },
        { title: 'Install drainage pipe + backfill with aggregate', body: 'Novacoil pipe along the base of the wall behind the rails, wrapped in filter cloth, sloped to a discharge point. Backfill with clean drainage aggregate (GAP 20 or scoria), compacted in 300 mm lifts.', watchFor: 'No drainage pipe = water builds up behind wall = wall tilts + fails. Drainage is not optional.' },
        { title: 'Fit capping timber (optional)', body: 'Capping board (200×50) along the top of posts + rails for a finished look + keeps water off end grain. Mitre or butt corners.', watchFor: 'Un-capped post tops soak water + rot from the top. Cap always.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Shovel'],
      materials: ['Posts: 125×125 or 150×150 H5 CCA-treated pine', 'Rails / sleepers: 200×50 hardwood sleepers or H4-treated pine', 'Drainage aggregate: 20 mm crushed rock or scoria', 'Ag pipe: 100 mm slotted, along wall base', 'Geo-textile fabric (bidim)', 'Fixings: 100 mm Type 17 + 200 mm galv coach bolts', 'Concrete: N20', 'Capping timber (optional): 200×50'],
      steps: [
        { title: 'Confirm wall height + council permit', body: 'Walls under 1 m generally don\'t need permit (varies by state — NSW, VIC, QLD all different). Walls over 1 m or near boundaries almost always need engineering + permit. Check council BEFORE digging.', watchFor: 'Un-permitted retaining walls get pulled up on sale (building inspection). Permit + engineering if over 1 m or loaded.' },
        { title: 'Rule of thumb: 1/3 in ground', body: 'For 1.2 m exposed, posts 400 mm min in ground. Deeper on soft / reactive ground (Class M / H / E per AS 2870), or if loaded. Engineer confirms if uncertain.', watchFor: 'Under-depth posts topple when backfill saturates + puts hydrostatic load. Depth critical.' },
        { title: 'Set out post positions + dig', body: 'Post spacing 1.2–1.8 m depending on rail size. String-line for straightness. Post-hole borer to design depth.', watchFor: 'Spacing > 1.8 m needs much bigger rail. Under-sized rails bow.' },
        { title: 'Concrete posts in position', body: 'N20 concrete around each post, plumb while wet. Slope concrete top outward for water shed. 24 hrs cure before loading.', watchFor: 'Out-of-plumb posts can\'t be fixed without pulling the footing. Plumb + check with level.' },
        { title: 'Fix rails horizontally between posts', body: 'Sleepers or 200×50 H4 rails, one above the other, screwed to post faces with 100 mm Type 17s (2 per rail per post). Start bottom, work up.', watchFor: 'Rails on the uphill face of posts = load in wrong direction. Rails on DOWNHILL face, holding back the fill.' },
        { title: 'Line the wall with geo-textile', body: 'Bidim between rails + backfill. Stops fine soil washing through gaps in rails while allowing water to drain.', watchFor: 'Un-textiled walls silt up drainage + fail. Essential.' },
        { title: 'Install ag pipe + backfill with aggregate', body: 'Slotted ag pipe along base behind rails, wrapped in bidim, sloped to discharge. Backfill with 20 mm crushed rock, compacted in 300 mm lifts.', watchFor: 'No drainage = water builds up = wall tilts + fails. Drainage not optional.' },
        { title: 'Fit capping timber (optional)', body: 'Capping (200×50) along top of posts + rails for finish + keeps water off end grain. Mitre or butt corners.', watchFor: 'Un-capped post tops rot from the top. Cap always.' },
      ],
    },
  },
  {
    id: 'build-paling-fence',
    category: 'decking-outdoor',
    label: 'Build a paling fence',
    summary: 'Posts, rails, palings — 1.8 m standard boundary fence.',
    nz: {
      tools: ['Tape', 'Spirit level', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Hammer'],
      materials: ['Posts: 100×100 H5 CCA-treated pine, 2.4 m long (600 in ground + 1800 above)', 'Rails: 100×50 or 75×50 H3.2 pine, 2 rails for < 1.5 m fence, 3 rails for 1.8 m', 'Palings: 100×12 or 100×19 H3.2 pine, 1.8 m long', 'Fixings: 100 mm bugle screws for rails, 50 mm galv jolt-head nails for palings, 25 mm brad nails for capping', 'Concrete: 20 MPa', 'Capping (optional): 100×25 H3.2 along fence top'],
      steps: [
        { title: 'Set out post positions', body: 'Post spacing 2.4 m maximum (paling length). String-line the fence line from a corner post + set intermediate positions from that line.', watchFor: 'Fences that run along the boundary need to be ON the boundary (or 100 mm inside, negotiated with neighbour). Fencing over the boundary is a legal issue.' },
        { title: 'Dig + concrete corner posts first', body: 'Dig corner + gate posts first, concrete in, plumb dead. Corner posts are the reference for the whole fence.', watchFor: 'Setting intermediate posts before corners means you drift off line. Corners first, always.' },
        { title: 'Dig + concrete intermediate posts', body: 'From the corner posts, string-line the fence face. Dig intermediate posts to depth (600 mm min), position against string, concrete in. Plumb + check post face aligns with string.', watchFor: 'A single post out of line by 20 mm reads as a wave along the fence. String-line every post.' },
        { title: 'Cut posts to height', body: 'Once concrete is cured (24 hrs), cut post tops to a consistent height above ground. For a 1.8 m fence, post top = 1800 mm above ground (or slightly higher for capping).', watchFor: 'Cutting posts before concrete cures moves them out of plumb. Wait 24 hrs.' },
        { title: 'Fix rails between posts', body: 'Bottom rail 150 mm above ground, middle rail 900 mm, top rail 100 mm below post top (for a 1.8 m fence). Screw to post face with 100 mm bugle screws (2 per rail per post).', watchFor: 'Rail heights matter — palings need to be fixed to a rail at top + bottom + middle to prevent flex.' },
        { title: 'Fix palings to rails', body: 'Start at a corner. First paling flush with corner post, level vertical. 2 nails per rail per paling. Gap between palings 5 mm typical (or tight for privacy fence).', watchFor: 'Palings that aren\'t plumb telegraph across the fence as a lean. Plumb first paling with a level, then space consistently.' },
        { title: 'Fit capping (optional)', body: 'Capping board (100×25 H3.2) along the top of palings for a finished look + keeps water off paling end grain. Butt joints on posts, or scarf-cut for a cleaner join.', watchFor: 'Un-capped fences soak water into paling top grain + rot from the top. Cap = decades longer life.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Hammer'],
      materials: ['Posts: 100×100 H5 CCA-treated pine, 2.4 m long', 'Rails: 100×50 or 75×50 H3-treated pine, 2 rails < 1.5 m, 3 rails for 1.8 m', 'Palings: 100×12 or 100×19 H3-treated pine, 1.8 m long', 'Fixings: 100 mm Type 17 for rails, 50 mm galv jolt-head nails for palings', 'Concrete: N20', 'Capping (optional): 100×25 H3-treated'],
      steps: [
        { title: 'Set out post positions', body: 'Post spacing 2.4 m max (paling length). String-line from a corner post + set intermediates from that line.', watchFor: 'Boundary fences must be ON the boundary (or 100 mm inside, negotiated with neighbour). Over-boundary = legal issue. Dividing Fences Acts vary by state — check yours.' },
        { title: 'Dig + concrete corner posts first', body: 'Corner + gate posts dug + concreted first, plumb dead. Corners are the reference for the whole fence.', watchFor: 'Intermediates before corners = drift off line. Corners first.' },
        { title: 'Dig + concrete intermediate posts', body: 'String-line fence face off corner posts. Dig intermediates to depth (600 mm min), position against string, concrete in. Plumb + check face aligns with string.', watchFor: 'A post out of line 20 mm reads as a wave. String-line every post.' },
        { title: 'Cut posts to height', body: 'Once concrete cured (24 hrs), cut tops to consistent height. 1.8 m fence: post top = 1800 mm above ground (or higher for capping).', watchFor: 'Cutting before cure moves posts out of plumb. Wait 24 hrs.' },
        { title: 'Fix rails between posts', body: 'Bottom rail 150 mm above ground, middle 900 mm, top 100 mm below post top (1.8 m fence). 100 mm Type 17s (2 per rail per post).', watchFor: 'Rail heights matter — palings need top + bottom + middle rail fix to prevent flex.' },
        { title: 'Fix palings to rails', body: 'Start at corner. First paling flush with post, level vertical. 2 nails per rail per paling. Gap 5 mm typical (tight for privacy).', watchFor: 'Palings not plumb telegraph as a lean across the fence. Plumb first paling with a level, space consistently.' },
        { title: 'Fit capping (optional)', body: 'Capping (100×25) along top of palings for finish + keeps water off top grain. Butt on posts or scarf-cut for cleaner join.', watchFor: 'Un-capped fences soak water into top grain + rot from top. Cap = decades more life.' },
      ],
    },
  },
  {
    id: 'install-gate',
    category: 'decking-outdoor',
    label: 'Install a gate in a fence',
    summary: 'Build frame, brace, fit palings, hang on heavy-duty hinges.',
    nz: {
      tools: ['Tape', 'Framing square', 'Spirit level', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Clamps', 'Chisel', 'File'],
      materials: ['Frame timber: 100×50 or 90×45 H3.2 pine (or matching fence rail size)', 'Diagonal brace: 100×25 or 100×50 H3.2', 'Palings: match the fence palings', 'Hinges: heavy-duty T-hinges or strap hinges (galv, 300 mm min for a full-height gate)', 'Latch: gravity latch, drop bolt, or lockable latch', 'Fixings: 65 mm galv screws for frame + hinges, 50 mm jolt-head nails for palings', 'Hinge screws: 40 mm heavy-duty (supplied with hinges)'],
      steps: [
        { title: 'Measure the gate opening', body: 'From inside face of hinge post to inside face of latch post. Subtract 25 mm total clearance (10 mm hinge side, 15 mm latch side) — that\'s your gate width.', watchFor: 'A gate cut to exact opening size will jam as soon as timber expands in wet weather. 25 mm total clearance minimum.' },
        { title: 'Confirm hinge + latch posts are solid', body: 'Gate posts take much more load than fence posts (hanging + swinging weight). Confirm the concrete footing is 900+ mm deep + the post size is 100×100 min. Reinforce if needed.', watchFor: 'A wobbly gate post ruins the gate quickly. If the fence post is under-sized, install a new dedicated gate post before hanging.' },
        { title: 'Build the gate frame', body: 'Four sides: top rail, bottom rail, hinge stile, latch stile. Butt-joint or half-lap the corners, glue + screw. Frame width = gate width; height = gate height per plan.', watchFor: 'A gate with only 3 sides (missing the latch stile) will sag + not close. Full 4-sided frame every time.' },
        { title: 'Add diagonal brace (critical)', body: 'Diagonal brace runs from the BOTTOM CORNER OF THE HINGE SIDE up to the TOP CORNER OF THE LATCH SIDE. This puts the brace in compression, preventing gate sag.', watchFor: 'Brace running the WRONG way (top hinge to bottom latch) puts it in tension + the gate sags anyway. Bottom hinge to top latch, always.' },
        { title: 'Fit paling infill to match fence', body: 'Nail palings to the frame face with the same nailing pattern + gap as the fence itself. Palings usually overhang top + bottom to hide the frame.', watchFor: 'A gate that looks obviously different from the fence beside it reads as an add-on. Match fence detail exactly.' },
        { title: 'Fit hinges to gate + hang', body: 'Screw heavy-duty T-hinges or strap hinges to the hinge stile (top + bottom), then lift gate into position + screw hinges to the hinge post. Get help lifting — full-height gates are heavy.', watchFor: 'Small hinges on a heavy gate pull out within a year. Full-height gate = 300 mm strap hinges min, 400 mm better.' },
        { title: 'Fit latch + test swing', body: 'Position gravity latch or drop bolt at handle height (~1000 mm) on latch stile. Test the gate swings + latches cleanly, closes flush without binding.', watchFor: 'A latch that misses the strike by 5 mm won\'t close reliably. Adjust hinge post or latch position until strike aligns.' },
        { title: 'Weather-proof the top edge', body: 'Cap the top of the gate with a matching capping strip, or bevel-cut the top of the palings to shed water. Un-capped gate tops rot fastest.', watchFor: 'End-grain on the top of the palings + frame soaks water. Cap or bevel — un-treated flat tops rot fast.' },
      ],
    },
    au: {
      tools: ['Tape', 'Framing square', 'Spirit level', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Clamps', 'Chisel', 'File'],
      materials: ['Frame timber: 100×50 or 90×45 H3-treated pine (or match fence rail size)', 'Diagonal brace: 100×25 or 100×50 H3', 'Palings: match fence', 'Hinges: heavy-duty T-hinges or strap hinges (galv, 300 mm min for full-height gate)', 'Latch: gravity latch, drop bolt, lockable latch', 'Fixings: 65 mm galv screws + 50 mm jolt-head nails for palings', 'Hinge screws: 40 mm heavy-duty (supplied)'],
      steps: [
        { title: 'Measure the gate opening', body: 'Inside face of hinge post to inside face of latch post. Subtract 25 mm total clearance (10 hinge, 15 latch) = gate width.', watchFor: 'Cut-to-opening gate jams when timber expands. 25 mm total clearance minimum.' },
        { title: 'Confirm hinge + latch posts are solid', body: 'Gate posts take much more load than fence posts. Concrete footing 900+ mm deep, post size 100×100 min. Reinforce if needed.', watchFor: 'Wobbly gate post ruins the gate. Under-sized fence post: install new dedicated gate post before hanging.' },
        { title: 'Build the gate frame', body: 'Four sides: top rail, bottom rail, hinge stile, latch stile. Butt or half-lap corners, glue + screw.', watchFor: '3-sided gate (no latch stile) sags + won\'t close. Full 4-sided frame every time.' },
        { title: 'Add diagonal brace (critical)', body: 'Diagonal from BOTTOM CORNER OF HINGE SIDE up to TOP CORNER OF LATCH SIDE. Brace in compression prevents gate sag.', watchFor: 'Wrong-way brace (top hinge to bottom latch) puts it in tension + gate sags. Bottom hinge to top latch, always.' },
        { title: 'Fit paling infill to match fence', body: 'Nail palings to frame face with same pattern + gap as the fence. Palings overhang top + bottom to hide frame.', watchFor: 'Gate that looks different from fence beside it reads as add-on. Match fence detail exactly.' },
        { title: 'Fit hinges to gate + hang', body: 'Heavy-duty T-hinges / strap hinges to hinge stile (top + bottom), lift gate + screw to hinge post. Get help — full-height gates are heavy.', watchFor: 'Small hinges on heavy gate pull out within a year. Full-height = 300 mm strap hinges min, 400 mm better.' },
        { title: 'Fit latch + test swing', body: 'Gravity latch or drop bolt at handle height (~1000 mm) on latch stile. Test swing + latch closes flush without binding.', watchFor: 'Latch missing strike by 5 mm won\'t close reliably. Adjust hinge post or latch until strike aligns.' },
        { title: 'Weather-proof the top edge', body: 'Cap gate top with matching capping, or bevel-cut paling tops to shed water. Un-capped rots fastest.', watchFor: 'End-grain on tops soaks water. Cap or bevel — flat tops rot fast.' },
      ],
    },
  },

  // ─── Renovation — off the linear build path ──────────────────────────────
  {
    id: 'identify-load-bearing',
    category: 'renovation',
    label: 'Identify a load-bearing wall',
    summary: 'Plan check, joist direction, load path — when to call an engineer.',
    nz: {
      tools: ['Tape', 'Torch', 'Ladder or trestle', 'Stud finder', 'Camera / phone', 'Original plans (if available)'],
      materials: [],
      steps: [
        { title: 'Get the original plans if they exist', body: 'For any post-1990s house, foundation + framing plans are usually held by council (LIM report). The framing plan shows load paths — load-bearing walls, beams, and trimmers marked out. Save a lot of guesswork.', watchFor: 'Older houses (pre-1980) often have no drawings. In that case, work from physical evidence — but a LIM report is worth requesting anyway.' },
        { title: 'Look at joist direction from above', body: 'In the roof space or under the floor, look which way the joists run. A wall running PARALLEL to the joists usually is NOT load-bearing. A wall running PERPENDICULAR (joists sit on top of it) usually IS load-bearing.', watchFor: 'This is a "usually" — some parallel walls do carry load (e.g. supporting a hanging beam or roof point). Physical inspection is a first guess, not a final answer.' },
        { title: 'Look for a stacked wall directly above', body: 'A wall directly above the wall you\'re considering is a strong load-bearing signal — it\'s transferring upstairs floor / roof load down. Check both the storey above (if there is one) and the roof structure.', watchFor: 'Roof structure over a wall — a truss girder or a hanging beam landing on it — makes the wall load-bearing even if there\'s no wall directly above.' },
        { title: 'Check wall thickness + framing size', body: 'Standard non-load-bearing internal walls in NZ are usually 90×45 studs at 600 c/c. Load-bearing walls are more often 400 c/c, and lintels over openings tend to be much deeper. If the framing looks heavier than a typical partition, treat as load-bearing.', watchFor: 'Framing size is a hint, not proof. Some older houses over-built partition walls. Combine with joist direction + stacked wall evidence.' },
        { title: 'Look at what happens above openings', body: 'Load-bearing walls have a proper lintel above every door / window (usually a beam of some sort). Non-load-bearing walls often just have a header stud. If you see a lintel, it\'s carrying a load — the wall is bearing.', watchFor: 'Some lintels are hidden inside a false top plate. Don\'t rule out a wall as non-load-bearing just because you can\'t see a lintel from below.' },
        { title: 'Trust nothing — get an engineer', body: 'If there is ANY doubt, and you\'re about to cut or remove the wall, call a chartered engineer. A site visit + report is $500–1500 — cheaper than the alternative if you get it wrong.', watchFor: 'A load-bearing wall removed without a lintel design is a life-safety issue. Sagging floors + ceiling cracks are the first sign; catastrophic failure is possible. Never guess on this.' },
      ],
    },
    au: {
      tools: ['Tape', 'Torch', 'Ladder or trestle', 'Stud finder', 'Camera / phone', 'Original plans (if available)'],
      materials: [],
      steps: [
        { title: 'Get the original plans if they exist', body: 'Post-1990s houses usually have foundation + framing plans held by council. The framing plan shows load paths — load-bearing walls, beams, trimmers marked out.', watchFor: 'Older houses (pre-1980) often have no drawings. Work from physical evidence, but council records are worth checking.' },
        { title: 'Look at joist direction from above', body: 'In the roof space or under the floor, look at joist direction. A wall PARALLEL to joists usually is NOT load-bearing. A wall PERPENDICULAR (joists sit on it) usually IS load-bearing.', watchFor: '"Usually" — some parallel walls do carry load. Physical inspection is a first guess, not final answer.' },
        { title: 'Look for a stacked wall directly above', body: 'A wall directly above is a strong load-bearing signal — transferring upstairs / roof load down. Check the storey above (if any) and the roof structure.', watchFor: 'Roof over a wall — a truss girder or hanging beam landing on it — makes it load-bearing even without a wall above.' },
        { title: 'Check wall thickness + framing size', body: 'Standard non-load-bearing internal walls in AU are usually 90×45 or 90×35 MGP10 studs at 600 c/c. Load-bearing walls more often 450 c/c with deeper lintels. Heavier framing = treat as load-bearing.', watchFor: 'Framing size is a hint, not proof. Combine with joist direction + stacked wall.' },
        { title: 'Look at what happens above openings', body: 'Load-bearing walls have a proper lintel above every opening (a real beam). Non-load-bearing walls often just have a header stud. Lintel present = wall is bearing.', watchFor: 'Some lintels hidden inside false top plate. Don\'t rule out just because no lintel visible from below.' },
        { title: 'Trust nothing — get an engineer', body: 'ANY doubt + you\'re about to cut / remove the wall = call a structural engineer. Site visit + report is $500–1500 — cheaper than the alternative.', watchFor: 'Load-bearing wall removed without lintel design = life-safety issue. Sagging floors + ceiling cracks are first sign; catastrophic failure possible. Never guess on this.' },
      ],
    },
  },
  {
    id: 'cut-doorway-in-existing-wall',
    category: 'renovation',
    label: 'Cut a doorway into an existing wall',
    summary: 'Verify not load-bearing, locate services, cut linings, frame opening.',
    nz: {
      tools: ['Tape', 'Spirit level', 'Stud finder', 'Reciprocating saw', 'Keyhole saw', 'Cordless drill / impact driver', 'Hammer', 'Drop / circular saw', 'Multi-detector (finds pipes + wires)', 'Drop-cloth + PPE (dust mask)'],
      materials: ['New studs, plates, trimmers, jack studs (90×45 SG8 to match existing)', 'Lintel (even non-load-bearing walls) — 90×45 or 190×45 depending on span', '90×3.15 flat-head framing nails', 'Gib patch material for lining repair', 'Adjustable pre-hung door (fit later)'],
      steps: [
        { title: 'Confirm wall is non-load-bearing', body: 'Follow the identify-load-bearing job. If ANY doubt = engineer. Never assume — a load-bearing wall opened without a designed lintel drops the ceiling.', watchFor: 'A load-bearing wall CAN have a doorway cut, but the lintel must be engineered + full-height jack studs installed. Not a DIY call.' },
        { title: 'Locate services inside the wall', body: 'Multi-detector (like a Bosch GMS 120) over the entire opening area to find electrical cables, water pipes, waste stacks. Cross-check with the house\'s as-built services plan, or trace from the nearest switchboard / stop-tap. Any service = re-route by a licensed sparky / plumber BEFORE cutting.', watchFor: 'Reciprocating saw through a live cable = ACC claim + house without power. Through a water pipe = flooded floor. Detect + trace first.' },
        { title: 'Mark the opening on the wall', body: 'Opening width = door width + 60–80 mm for jambs + tolerance. Height = door + jamb + 15 mm. Mark on both faces of the wall, plumb + level.', watchFor: 'Rough opening tolerance too tight = pre-hung frame doesn\'t fit. 5 mm each side clearance minimum.' },
        { title: 'Cut the wall linings both sides', body: 'Score the gib along the cut lines with a utility knife. Reciprocating saw or keyhole saw through the sheet — cut just inside your marked line so you can trim later. Both faces of the wall.', watchFor: 'Cutting past the marked line means you\'re into linings you don\'t need to replace. Cut inside the line, trim to fit.' },
        { title: 'Cut studs within the opening', body: 'Reciprocating saw through each stud within the opening perimeter. Cut top + bottom of each stud so you can remove them cleanly. Leave the last piece of each stud on the top plate + bottom plate for now.', watchFor: 'Cutting a stud that turns out to carry a hidden load = the ceiling drops. Confirm load-bearing status BEFORE cutting any stud.' },
        { title: 'Install trimmer studs each side', body: 'Full-height trimmer (doubled) each side of the opening, running from floor to ceiling. Fix through into bottom plate + top plate with 90 mm nails.', watchFor: 'Single trimmers on a wide opening deflect + the lintel sags. Double up.' },
        { title: 'Install lintel + jack studs', body: 'Lintel across the opening between trimmers. Even non-load-bearing walls need a lintel to stop the top plate deflecting when it\'s cut. Jack studs from lintel underside to top plate (short cripples).', watchFor: 'Skipping the lintel because "it\'s not load-bearing" = top plate sags in a year. Always fit a lintel.' },
        { title: 'Patch the wall lining + prepare for door', body: 'Cut gib patches to fit the exposed framing around the opening. Fix with drywall screws, tape + stop the joints (see the stop-plasterboard job). Frame ready for a pre-hung door.', watchFor: 'A rough opening + patched linings is one stage — the actual door install is a separate job. Follow the hang-internal-pre-hung-door job.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'Stud finder', 'Reciprocating saw', 'Keyhole saw', 'Cordless drill / impact driver', 'Hammer', 'Drop / circular saw', 'Multi-detector', 'Drop-cloth + PPE'],
      materials: ['New studs, plates, trimmers, jack studs (90×45 MGP10)', 'Lintel — 90×45 or 190×45 depending on span', '90×3.15 flat-head framing nails', 'Plasterboard patch material', 'Adjustable pre-hung door (fit later)'],
      steps: [
        { title: 'Confirm wall is non-load-bearing', body: 'Follow the identify-load-bearing job. ANY doubt = engineer. Never assume — load-bearing wall opened without a designed lintel drops the ceiling.', watchFor: 'Load-bearing wall CAN have a doorway cut, but with engineered lintel + full-height jack studs. Not a DIY call.' },
        { title: 'Locate services inside the wall', body: 'Multi-detector over the entire opening area — electrical, water, waste. Cross-check against the house\'s as-built services plan (or trace back from the nearest switchboard / stop-tap). Any service = re-route by licensed sparky / plumber BEFORE cutting.', watchFor: 'Reciprocating saw through a cable = WorkCover claim + no power. Through a pipe = flooded floor. Detect + trace first.' },
        { title: 'Mark the opening on the wall', body: 'Opening width = door width + 60–80 mm for jambs + tolerance. Height = door + jamb + 15 mm. Both faces, plumb + level.', watchFor: 'Rough opening too tight = pre-hung frame doesn\'t fit. 5 mm each side minimum.' },
        { title: 'Cut the wall linings both sides', body: 'Score the plasterboard with utility knife. Reciprocating saw or keyhole saw through the sheet — cut just inside marked line so you can trim later. Both faces.', watchFor: 'Cutting past the line = extra linings to replace. Cut inside line, trim to fit.' },
        { title: 'Cut studs within the opening', body: 'Reciprocating saw through each stud within perimeter. Cut top + bottom cleanly. Leave the last piece of each stud on top + bottom plate for now.', watchFor: 'Cutting a stud that carries a hidden load = ceiling drops. Confirm load-bearing BEFORE cutting.' },
        { title: 'Install trimmer studs each side', body: 'Full-height trimmer (doubled) each side of opening, floor to ceiling. Fix through into bottom + top plate with 90 mm nails.', watchFor: 'Single trimmers on wide openings deflect + lintel sags. Double up.' },
        { title: 'Install lintel + jack studs', body: 'Lintel across opening between trimmers. Even non-load-bearing walls need a lintel to stop top plate deflecting. Jack studs from lintel underside to top plate.', watchFor: 'Skipping the lintel = top plate sags in a year. Always fit.' },
        { title: 'Patch the wall lining + prepare for door', body: 'Cut plasterboard patches to fit exposed framing around opening. Fix with drywall screws, tape + set (see stop-plasterboard job). Frame ready for pre-hung door.', watchFor: 'Rough opening + patched linings is one stage — actual door install is separate. Follow the hang-internal-pre-hung-door job.' },
      ],
    },
  },
  {
    id: 'replace-weatherboard',
    category: 'renovation',
    label: 'Replace a rotten weatherboard',
    summary: 'Assess extent, cut out, treat framing, splice + prime + paint.',
    nz: {
      tools: ['Utility knife', 'Small handsaw or oscillating multi-tool', 'Chisel', 'Pry bar / flat bar', 'Cordless drill / impact driver', 'Nail punch', 'Tape', 'Spirit level', 'Screwdriver (for probing rot)'],
      materials: ['Replacement weatherboard — MATCH existing profile + timber species', 'Nails: 60 mm hot-dipped galv jolt-head (or stainless in coastal / marine)', 'Wood preservative + primer for cut ends', 'Paintable acrylic sealant', 'Building wrap patch (if wrap behind is damaged)', 'Head flashing tape (if splicing at a horizontal join)'],
      steps: [
        { title: 'Assess the rot extent', body: 'Probe the board with a sharp screwdriver — soft, spongy areas are rotten. Push adjacent boards too, and check the framing behind by peeling the board back if possible. Rot often spreads further than the visible damage.', watchFor: 'Cutting out only the visible rot leaves you doing the same job again in 12 months. Trace the rot to the last solid timber, cut 100 mm past that.' },
        { title: 'Mark cut lines on studs', body: 'Cut lines land on studs (find them behind the boards). This means the replacement board can be nailed to a stud at each end, not left flapping mid-span.', watchFor: 'Cuts mid-span between studs leave the new board unsupported at the join. Locate studs first, cut over them.' },
        { title: 'Protect adjacent boards', body: 'Tape cardboard or corflute over adjacent weatherboards before cutting — the multi-tool + prying can damage neighbours.', watchFor: 'Damaging the neighbour board turns a one-board repair into a three-board repair. Protect first.' },
        { title: 'Cut out the rotten section', body: 'Multi-tool or fine-tooth saw for the cut. Cut through the exposed face of the board only — the board above overlaps and hides the cut, so it must be cut too if the rot extends behind. Take your time; don\'t cut into the wrap behind.', watchFor: 'Cutting through the wall wrap = re-tape or patch it. Keep the blade depth just past the board thickness.' },
        { title: 'Pull nails + remove the piece', body: 'Once cut, pry the board section forward gently. Punch nails through from behind if the head has broken off, or grip with pincers.', watchFor: 'Levering with a big pry bar cracks the boards you\'re trying to save. Small flat bar + patience.' },
        { title: 'Check + treat the framing', body: 'Inspect the studs + wrap behind. Soft framing = repair (splice in new stud material, or brace). Damaged wrap = patch with new wrap + tape all edges.', watchFor: 'Replacing a board without repairing rotten framing behind = the new board rots at the same rate. Fix the cause, not the symptom.' },
        { title: 'Cut + prime the replacement board', body: 'Cut to length. Coat both ends + the back with wood preservative + primer BEFORE fixing — cut ends soak water fastest and rot from there.', watchFor: 'Un-primed cut ends = new rot within 5 years. Prime is not optional.' },
        { title: 'Fit + fix the new board', body: 'Slide the new board up under the board above (weatherboards overlap top-to-bottom), align with the row. Nail into studs at each end + any middle stud. Same nailing pattern as the existing.', watchFor: 'Face-nailing where boards should be blind-nailed reads as a repair. Match the fixing pattern of the surrounding.' },
        { title: 'Fill, seal, prime + paint', body: 'Fill nail holes, sealant any gaps at the ends where boards meet adjacent boards. Prime the whole board face, then finish paint to match.', watchFor: 'Un-painted repair board stands out. Match paint colour by taking a chip to the paint shop for match.' },
      ],
    },
    au: {
      tools: ['Utility knife', 'Small handsaw or oscillating multi-tool', 'Chisel', 'Pry bar / flat bar', 'Cordless drill / impact driver', 'Nail punch', 'Tape', 'Spirit level', 'Screwdriver (for probing rot)'],
      materials: ['Replacement weatherboard — MATCH existing profile + species', 'Nails: 60 mm hot-dipped galv jolt-head (stainless for coastal / marine)', 'Wood preservative + primer for cut ends', 'Paintable acrylic sealant', 'Building wrap patch (if wrap damaged)', 'Head flashing tape (splicing at horizontal join)'],
      steps: [
        { title: 'Assess the rot extent', body: 'Probe board with sharp screwdriver — soft, spongy = rotten. Push adjacent boards, check framing behind. Rot spreads further than visible.', watchFor: 'Cutting only visible rot = same job in 12 months. Trace to last solid timber, cut 100 mm past.' },
        { title: 'Mark cut lines on studs', body: 'Cut lines land on studs so replacement board can be nailed at each end, not left flapping.', watchFor: 'Mid-span cuts leave the new board unsupported. Locate studs first, cut over them.' },
        { title: 'Protect adjacent boards', body: 'Tape cardboard or corflute over adjacent boards before cutting — multi-tool + prying damages neighbours.', watchFor: 'Damaging a neighbour turns one-board repair into three-board. Protect first.' },
        { title: 'Cut out the rotten section', body: 'Multi-tool or fine-tooth saw. Cut through exposed face only — board above overlaps and hides the cut. Don\'t cut into wrap behind.', watchFor: 'Cutting through wrap = patch + tape. Blade depth just past board thickness.' },
        { title: 'Pull nails + remove the piece', body: 'Pry section forward gently. Punch nails through from behind if head is broken, or grip with pincers.', watchFor: 'Big pry bar cracks the boards you\'re trying to save. Small flat bar + patience.' },
        { title: 'Check + treat the framing', body: 'Inspect studs + wrap behind. Soft framing = repair. Damaged wrap = patch new wrap + tape edges. In termite zones, check for termite mudding while you\'re in there.', watchFor: 'Replacing board without repairing framing = new board rots at same rate. Fix the cause.' },
        { title: 'Cut + prime the replacement board', body: 'Cut to length. Coat both ends + back with wood preservative + primer BEFORE fixing — cut ends soak water fastest.', watchFor: 'Un-primed cut ends = new rot in 5 years. Not optional.' },
        { title: 'Fit + fix the new board', body: 'Slide new board up under the board above, align with row. Nail into studs at each end + any middle stud. Same pattern as existing.', watchFor: 'Face-nailing where blind-nailing was used reads as a repair. Match fixing pattern.' },
        { title: 'Fill, seal, prime + paint', body: 'Fill nail holes, sealant any gaps at ends. Prime whole board face, finish paint to match.', watchFor: 'Un-painted repair stands out. Match colour with a chip to the paint shop.' },
      ],
    },
  },
  {
    id: 'patch-plasterboard-hole',
    category: 'renovation',
    label: 'Patch a hole in plasterboard',
    summary: 'Square the hole, backing strips, cut patch, tape + 3 coats.',
    nz: {
      tools: ['Utility knife', 'Straight-edge / ruler', 'Keyhole saw or drywall saw', 'Cordless drill / driver', 'Jointing knife (150 mm + 250 mm)', 'Sanding block or sponge', 'Mixing bucket + paddle'],
      materials: ['Scrap gib for patch + backing strips', '32 mm drywall screws', 'GIB Trade Set (or ready-mix)', 'Paper joint tape', 'Fine sanding sponge (P150 + P220)'],
      steps: [
        { title: 'Cut a neat rectangle around the damage', body: 'Rectangular / square holes are FAR easier to patch than irregular ones. Use utility knife + straight-edge to mark, cut with a keyhole saw. Make the hole big enough to catch solid gib on all four sides.', watchFor: 'Trying to patch an irregular hole = the patch never fits. Take an extra 30 seconds to square it up.' },
        { title: 'Cut backing strips from scrap gib', body: 'Cut 2–4 strips of scrap gib, each ~30 mm wide + 50 mm longer than the hole dimensions. These are backing strips (also called "cleats") that reach behind the existing gib and give the patch something to screw to.', watchFor: 'For holes wider than 100 mm, use backing strips top + bottom + both sides. Small holes can get away with 2 strips.' },
        { title: 'Fix backing strips through existing gib', body: 'Slip each backing strip through the hole, position it behind the existing gib. Screw through the FACE of the existing gib into the strip with drywall screws (2–3 per strip). Screw heads dimple into the paper face.', watchFor: 'Backing strips positioned so screws land on the strip, not on air. Hold the strip firmly against the back of the existing gib while you drive the first screw.' },
        { title: 'Cut the patch to fit', body: 'Measure the hole, cut a piece of scrap gib to fit exactly — same thickness as the existing wall (10 mm or 13 mm). Score + snap for a clean edge.', watchFor: 'Under-sized patch = big joint to hide. Over-sized = won\'t fit. Measure twice, cut once.' },
        { title: 'Screw the patch to the backing strips', body: 'Fit the patch into the hole, screw through the patch into the backing strips (2 screws per strip minimum). Screw heads flush with the paper face — not proud, not blown-out.', watchFor: 'Patch that sits proud of the surrounding wall = a bump that shows through paint. Sits recessed = a dip. Same face level as existing.' },
        { title: 'Tape all four edges', body: 'Butter jointing compound over the join with a 150 mm knife. Embed paper joint tape into the wet compound over each of the four join lines. Wipe off excess with the knife at a shallow angle.', watchFor: 'Air bubbles under tape appear as blisters after paint. Bed the tape hard + wipe firmly.' },
        { title: 'Set with three coats, feathering wider', body: 'Coat 1 fills the tape. Coat 2 (24 hrs later) wider skim with 250 mm knife. Coat 3 final feather. Sand light between coats + final sand with P220.', watchFor: 'Rushing the coats = visible ridges + tape lines under paint. Let each coat cure before the next.' },
      ],
    },
    au: {
      tools: ['Utility knife', 'Straight-edge / ruler', 'Keyhole saw or drywall saw', 'Cordless drill / driver', 'Jointing knife (150 mm + 250 mm)', 'Sanding block or sponge', 'Mixing bucket + paddle'],
      materials: ['Scrap plasterboard for patch + backing strips', '32 mm drywall screws', 'CSR Total Joint Cement or ready-mix', 'Paper joint tape', 'Fine sanding sponge (P150 + P220)'],
      steps: [
        { title: 'Cut a neat rectangle around the damage', body: 'Rectangular holes are FAR easier to patch than irregular. Utility knife + straight-edge to mark, keyhole saw to cut. Big enough to catch solid plasterboard on all four sides.', watchFor: 'Irregular hole = patch never fits. Extra 30 seconds to square it up.' },
        { title: 'Cut backing strips from scrap plasterboard', body: 'Cut 2–4 strips of scrap, ~30 mm wide + 50 mm longer than hole dimensions. Backing strips reach behind existing plasterboard + give the patch something to screw to.', watchFor: 'Holes wider than 100 mm need strips on all four sides. Small holes can get away with 2 strips.' },
        { title: 'Fix backing strips through existing plasterboard', body: 'Slip each backing strip through the hole, hold behind existing plasterboard. Screw through the FACE of existing into the strip with drywall screws (2–3 per strip). Heads dimple into paper.', watchFor: 'Strips positioned so screws land on strip, not air. Hold strip firmly against the back while driving the first screw.' },
        { title: 'Cut the patch to fit', body: 'Measure hole, cut piece of scrap to fit exactly — same thickness as wall (10 mm / 13 mm). Score + snap.', watchFor: 'Under-sized = big joint to hide. Over-sized = won\'t fit. Measure twice, cut once.' },
        { title: 'Screw the patch to the backing strips', body: 'Fit patch into hole, screw into backing strips (2 per strip min). Heads flush with paper — not proud, not blown-out.', watchFor: 'Patch proud = bump under paint. Recessed = dip. Same face level as existing.' },
        { title: 'Tape all four edges', body: 'Butter jointing cement over joins with 150 mm knife. Embed paper joint tape into wet cement over each of the four join lines. Wipe off excess at shallow angle.', watchFor: 'Air bubbles under tape = blisters after paint. Bed hard, wipe firmly.' },
        { title: 'Set with three coats, feathering wider', body: 'Coat 1 fills tape. Coat 2 (24 hrs) wider skim with 250 mm knife. Coat 3 final feather. Light sand between + final P220.', watchFor: 'Rushing = visible ridges + tape lines under paint. Let each coat cure.' },
      ],
    },
  },
  {
    id: 'replace-window-in-existing-wall',
    category: 'renovation',
    label: 'Replace a window in an existing wall',
    summary: 'Remove architrave + cladding, unfix old, install new, re-flash.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Reciprocating saw', 'Utility knife', 'Pry bar / flat bar', 'Sealant gun', 'Multi-tool', 'Staple gun', 'Ladder / trestle', 'PPE'],
      materials: ['New window unit (measured to fit existing opening, or new opening framing planned)', 'Sill flashing (extruded metal, colour-matched)', 'Sill flashing tape (butyl, 300 mm wide)', 'Jamb + head flashing tape', 'Building wrap patch (for repair of existing wrap)', '65 mm bugle screws through window flange', 'Neutral-cure sealant', 'Timber packers'],
      steps: [
        { title: 'Measure the existing opening + confirm new window fits', body: 'Measure stud-to-stud + head-to-sill of the framed opening. New window should be 10–15 mm smaller each side. If ordering a bigger window = opening modification (extra job).', watchFor: 'Ordering a window without confirming the ROUGH opening (not the current window unit size) is a common cause of week-long delays. Measure the frame, not the visible window.' },
        { title: 'Remove internal architrave + reveals', body: 'Pry off internal architrave carefully — often reusable. Remove reveal timber. This exposes the internal edge of the window frame + the wall lining edge.', watchFor: 'Prying architrave with force cracks it. Slide a putty knife behind first to break the paint seal, then pry gently.' },
        { title: 'Remove external cladding around window', body: 'Weatherboards: remove enough boards around the window to expose the entire window frame + 100 mm of wrap around it. FC or brick: cut back with appropriate saw / grinder. Keep boards if reusable.', watchFor: 'External cladding removal is the biggest damage risk in a window replacement. Take extra time, pry with a flat bar, cushion with cardboard.' },
        { title: 'Cut old flashings + tapes', body: 'Slice through any flashing tape around the window with a utility knife. Remove sill flashing, head flashing, and any building wrap tape around the perimeter.', watchFor: 'Tearing wrap in the process = patch it before install. Cut cleanly with a knife rather than tearing.' },
        { title: 'Unscrew + remove old window', body: 'Remove screws / nails around window flange. Have someone support the window while you undo the last few fixings. Lift the window out from the outside — it\'s heavy.', watchFor: 'A window without support drops when the last fixings come out. Two people, one supporting from outside, one removing fixings.' },
        { title: 'Inspect + repair the framing', body: 'Check the sill, jambs, head for rot or damage. Any soft timber = cut out + splice in new. Any damaged wrap = patch with new wrap + tape.', watchFor: 'Fitting a new window over rotten framing = same rot in 2 years. Fix the framing before the new window goes in.' },
        { title: 'Install new window per the install-window job', body: 'Follow the standard window install: sill flashing, sill tape, position + pack + plumb + screw off, then jamb + head flashing tape over flange onto wrap. See the install-window job for full sequence.', watchFor: 'The install sequence for a replacement is identical to a new-build install. Reference that job for detail.' },
        { title: 'Refit external cladding + head flashing', body: 'Refit weatherboards or FC sheets around the window, keeping the tape / flashing sequence correct (head flashing on top). New building wrap patched + tape-lapped over the window head tape.', watchFor: 'Head flashing MUST tuck UNDER the wrap above + OVER the top of the window. Wrong sequence = water into wall cavity.' },
        { title: 'Refit reveals + architrave', body: 'Cut new reveal timber to sit between the jamb + wall lining. Refit architrave. Fill nail holes, sand, prime, paint.', watchFor: 'Reveals that don\'t sit flush with the wall lining leave an ugly shadow gap that architrave can\'t hide. Get the reveal thickness right.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Reciprocating saw', 'Utility knife', 'Pry bar / flat bar', 'Sealant gun', 'Multi-tool', 'Staple gun', 'Ladder / trestle', 'PPE'],
      materials: ['New window unit (measured to fit existing opening — BAL-rated in bushfire zones)', 'Sill flashing (extruded, colour-matched)', 'Sill flashing tape (butyl, 300 mm wide)', 'Jamb + head flashing tape', 'Building wrap patch', '65 mm Type 17 screws through window flange', 'Neutral-cure sealant', 'Timber packers'],
      steps: [
        { title: 'Measure the existing opening + confirm new window fits', body: 'Measure stud-to-stud + head-to-sill of framed opening. New window should be 10–15 mm smaller each side. Bigger window = opening modification (extra job). In BAL zones, confirm new unit is BAL-rated.', watchFor: 'Ordering without confirming ROUGH opening (not current window unit) = week-long delays. Measure the frame, not the visible window.' },
        { title: 'Remove internal architrave + reveals', body: 'Pry off internal architrave carefully — often reusable. Remove reveal timber. Exposes internal edge of window frame + lining edge.', watchFor: 'Prying with force cracks architrave. Putty knife behind first to break paint seal, then pry gently.' },
        { title: 'Remove external cladding around window', body: 'Weatherboards: remove enough boards to expose entire frame + 100 mm of wrap. FC or brick: cut back with appropriate saw / grinder. Keep boards if reusable.', watchFor: 'External cladding is biggest damage risk. Extra time, flat bar, cushion with cardboard.' },
        { title: 'Cut old flashings + tapes', body: 'Slice through flashing tape around window with utility knife. Remove sill flashing, head flashing, any wrap tape around perimeter.', watchFor: 'Tearing wrap = patch it before install. Cut cleanly rather than tearing.' },
        { title: 'Unscrew + remove old window', body: 'Remove screws / nails around flange. Support the window while undoing last fixings. Lift out from outside — heavy.', watchFor: 'Window without support drops when last fixings come out. Two people, one supporting outside.' },
        { title: 'Inspect + repair the framing', body: 'Check sill, jambs, head for rot or damage. Soft timber = cut + splice in new. Damaged wrap = patch + tape. In termite zones, inspect for termite activity while wall is open.', watchFor: 'Fitting new window over rotten framing = same rot in 2 years. Fix framing first.' },
        { title: 'Install new window per the install-window job', body: 'Follow standard install: sill flashing, sill tape, position + pack + plumb + screw off, then jamb + head flashing tape over flange onto wrap. See install-window job for full sequence.', watchFor: 'Install sequence for replacement = identical to new-build. Reference that job for detail.' },
        { title: 'Refit external cladding + head flashing', body: 'Refit weatherboards / FC sheets around window, keeping tape / flashing sequence correct (head flashing on top). Wrap patched + tape-lapped over head tape.', watchFor: 'Head flashing MUST tuck UNDER wrap above + OVER top of window. Wrong sequence = water into cavity.' },
        { title: 'Refit reveals + architrave', body: 'Cut new reveal timber between jamb + lining. Refit architrave. Fill nail holes, sand, prime, paint.', watchFor: 'Reveals not flush with lining = shadow gap that architrave can\'t hide. Get reveal thickness right.' },
      ],
    },
  },
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
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Sequencer" />

      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: '0 4px 8px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
          Step-by-step guides for common jobs, written for {settings.region} practice.
        </p>

        {CATEGORIES.map(cat => {
          const catJobs = JOBS.filter(j => j.category === cat.key);
          const open = openCategory === cat.key;
          return (
            <div key={cat.key} style={{ ...cardStyle, overflow: 'hidden' }}>
              <button
                onClick={() => setOpenCategory(open ? null : cat.key)}
                aria-expanded={open}
                style={{
                  width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                  display: 'grid', gridTemplateColumns: '16px 1fr 16px', alignItems: 'center', gap: 12,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span aria-hidden />
                <div style={{
                  fontSize: 15, fontWeight: 500, color: 'var(--color-text)',
                  letterSpacing: '-0.2px', textAlign: 'center',
                }}>{cat.label}</div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
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
