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
        { title: 'Locate every boundary peg on site', body: 'NZ boundary pegs are iron pins with a coloured plastic cap, or wooden pegs marked "IS". Sweep the whole perimeter — some are buried under grass, fill, or the old fence.', watchFor: 'If a peg is missing, disturbed, or you can\'t verify it, stop and get the surveyor back. Building off the wrong reference is a five-figure fix.' },
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
