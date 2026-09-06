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
      materials: ['Boxing timber: 200×50 or 300×50 H3.2 pine (perimeter)', 'Stakes: 50×50 H4 pointed pine, 600 long, one every 600–900 mm', '75 mm bugle screws (formwork to stakes)', '90 mm framing nails or duplex nails (bracing)', 'Timber off-cuts for bracing', 'Boxing release / diesel-brush (optional)'],
      steps: [
        { title: 'Snap the slab perimeter onto the sub-base', body: 'From the profile board strings, transfer the outside face of the slab to the ground. Mark corners with pegs, run a string between them to guide the boxing.', watchFor: 'The boxing sits AT the outside face — don\'t position it beyond the string, or you\'ll pour a bigger slab than the plans call for.' },
        { title: 'Cut boxing to the slab dimensions', body: 'Cut 200×50 (for 150 slab + edge thickening) or 300×50 (for deeper edge beams) to the wall lengths. Cut mitres or butt-joins for corners — mitres seal better but butt-joins are fine for temporary work.', watchFor: 'Boxing height = slab thickness + any turn-up above final ground level. Getting it wrong here means the slab pours to the wrong FFL.' },
        { title: 'Drive stakes on the outside every 600–900 mm', body: 'Sledge H4 stakes into the ground on the OUTSIDE of the boxing line, spaced 600–900 mm apart. Extra stakes at corners, at any joins, and either side of edge-beam step-downs.', watchFor: 'Stakes hold back a lot of wet-concrete pressure. Space them tighter (500 mm) on any run where the slab is deeper than 200 mm, or the boxing will bow out during pour.' },
        { title: 'Fix boxing to stakes at FFL', body: 'Shoot the top of the boxing to the FFL RL using the laser. Screw or nail the boxing to each stake with bugle screws — better than nails for stripping later. Check level along the top with a long spirit level every couple of metres.', watchFor: 'A dip in the top of the boxing = a dip in the finished slab. Sight along the top after fixing; anything that reads out, undo the screw and reset.' },
        { title: 'Brace externally + corners', body: 'Add diagonal timber braces from the top of the boxing back to a peg driven further out (or nailed to an adjacent stake). Every 2–3 m, plus at every corner. Corners get a double brace.', watchFor: 'Corners blow out first. If a corner isn\'t braced solid, the wet concrete will push it open 20–30 mm and you\'ll have a bulge in your slab edge.' },
        { title: 'Check diagonals, straightness, and level', body: 'Measure the diagonals of the slab — must match. Sight down every edge for straightness — kink any bowed boards with a wedge / stake. Laser-check the top RL at every corner + middle of every long run.', watchFor: 'Once you tick this off, the boxing is signed off for pour. Any tweak after mesh is in the way is 3× harder — get it right now.' },
        { title: 'Seal joins + apply release', body: 'Silicone or expanding foam over any gap between boxing pieces at corners / joins — otherwise concrete cream leaks out and you get a rough edge. Brush diesel or a proper release agent on the inside face of the boxing so it strips cleanly.', watchFor: 'Don\'t use engine oil as release — it stains the concrete and the client will notice. Diesel evaporates; proprietary release is cleanest.' },
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
        { title: 'Seal joins + apply release', body: 'Silicone or expanding foam over any gap at corners / joins — otherwise cream leaks out and the edge is rough. Brush a proprietary formwork release on the inside face so it strips cleanly.', watchFor: 'Don\'t use engine oil as release — it stains the finished concrete. Diesel evaporates but leaves residue; use a proper release agent for a visible edge.' },
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
      materials: ['DPM: 0.2 mm (200 μm) polyethylene sheet, branded for underslab use (per NCC Vol 2 3.4.1)', 'Sand: 25–50 mm blinding layer over compacted crushed rock', 'DPM joining tape (wide, self-adhesive)', 'Sealant for penetrations (butyl or proprietary)', 'Termite management collar for each penetration (Type A physical or Part A chemical, per AS 3660)'],
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
        { title: 'Lay mesh sheets over chairs', body: 'Position first sheet aligned with the slab edge, keeping 30 mm cover from the boxing (use edge cover blocks). Lay subsequent sheets, lapping by at least 225 mm (2 full mesh squares) per NZS 3109.', watchFor: 'Two full squares lap is the standard. Anything less and the crack-control at the join fails — inspector will call it out.' },
        { title: 'Tie laps with wire', body: 'At every lap, twist a piece of tie wire around the two crossing bars — one tie every 300 mm along the lap length. Bar-tying pliers make this quick.', watchFor: 'Untied laps shift during the pour when the concrete pump kicks the mesh around. Tie them all, even if it\'s tedious.' },
        { title: 'Place edge beam + starter bars', body: 'Cut deformed bars to length for edge-beam reinforcement (usually 2× D12 or D16 top and bottom in the thickened edge). Position and tie to the mesh. Set starter bars for walls / columns above, projecting the required length above slab top.', watchFor: 'Starter bar positions are critical — they must land inside the wall thickness above. Measure carefully off the framing plan, not just eyeball off the mesh.' },
        { title: 'Check cover before pour', body: 'Cover to top of slab = distance from top of mesh to finished slab surface. NZS 3109 typical is 30 mm min, engineer may spec 40. Cover to edge (side of slab to nearest bar) is similar. Walk the slab, measure at multiple points, adjust chairs if wrong.', watchFor: 'Steel too close to surface = spalling and rust when the slab weathers. Steel too deep = no structural benefit. Cover check pre-pour is engineer-required on any inspected job.' },
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
      tools: ['Wheelbarrows', 'Concrete rake / lute', 'Screed board (2× your slab width)', 'Bull float + handle', 'Concrete vibrator (poker)', 'Steel trowel or power float', 'Edging tool', 'PPE: gumboots, gloves, safety glasses'],
      materials: ['Concrete: 25 or 30 MPa (per engineer\'s spec), 80–100 slump for hand-placed slabs', 'Curing compound (sprayed) or polythene for wet-covering', 'Bond breaker for control joints (if cutting)'],
      steps: [
        { title: 'Order concrete correctly', body: 'Volume = slab area × thickness + 10% waste. Grade per engineer (25 MPa typical for residential slab). Slump per placement (80 for pump, 100 for wheelbarrow). Book the truck 24 hrs ahead, confirm pump arrangement.', watchFor: 'Under-order by 5% and you\'re short at the end; over-order by 20% and you\'re paying for waste. 10% buffer is the sweet spot.' },
        { title: 'Prep the site pre-truck', body: 'Set screed rails at FFL height across the slab (top of the boxing acts as the perimeter rail; drive intermediate stakes with a short pipe on top set to FFL for the middle). Hose, tools, PPE, wheelbarrows, bull float all ready before the truck arrives.', watchFor: 'A truck sitting on site waiting for you to set up is charging waiting time. Have everything ready before you ring "on your way".' },
        { title: 'Truck arrives — check the docket', body: 'Docket shows batch time, MPa, slump, additives. Confirm it matches the order. If slump is way out (too wet or too dry), get the driver to add water on-site (if permitted) or reject the load.', watchFor: 'Concrete life is 90 min from batch. If the truck was delayed and the batch is 100+ minutes old, reject it — the concrete will be lumpy and won\'t place well.' },
        { title: 'Discharge + rake to depth', body: 'Discharge into formwork in strips, working from one end. Rake / lute the concrete to roughly FFL. Vibrate with a poker every 300–500 mm — especially at edges, corners, around pipes, and along edge-beam thickenings.', watchFor: 'Over-vibration segregates the mix (aggregate sinks, cream floats). Poker in and out in one motion, not left in one spot for 30 seconds.' },
        { title: 'Screed to level with a board', body: 'Two people, one at each end of a long straight screed board. Rest board on the perimeter boxing + intermediate rails. Draw the board back and forth in a sawing motion as you move down the slab. Fill low spots ahead of the board.', watchFor: 'A screed board that\'s too short will dip in the middle. Board length = 1.5× the widest span between rails minimum.' },
        { title: 'Bull float once bleed water is gone', body: 'After screeding, wait for surface bleed water to disappear (10–30 min depending on temp). Then run the bull float across the slab — flatten ridges, close pores, get a uniform surface. One pass, don\'t over-work.', watchFor: 'Bull-floating while bleed water is still there traps water under the surface and causes surface delamination. Wait until the sheen has gone matte.' },
        { title: 'Steel trowel or power float finish', body: 'Once the slab has stiffened enough that you can stand on it and leave only a 3–5 mm footprint (usually 2–4 hrs from pour), start trowelling. Two passes: first for smoothing, second for a tight burnished finish.', watchFor: 'Trowelling too early opens up the surface; too late and the trowel just skips over hard concrete. Feel for the right window — the surface should be firm but responsive.' },
        { title: 'Apply curing compound + protect', body: 'Once trowelled, spray a curing compound over the whole slab (or cover with wet hessian / polythene sheet for 7 days). Prevents rapid moisture loss which causes surface crazing.', watchFor: 'Rain on fresh concrete washes the cream off the surface = weak dusty finish. Cover with poly if rain is forecast within 6 hours.' },
      ],
    },
    au: {
      tools: ['Wheelbarrows', 'Concrete rake / lute', 'Screed board (2× your slab width)', 'Bull float + handle', 'Concrete vibrator (poker)', 'Steel trowel or power float', 'Edging tool', 'PPE: gumboots, gloves, safety glasses'],
      materials: ['Concrete: N25 or N32 (per engineer + AS 2870 site class), 80–100 slump for hand-placed', 'Curing compound or polythene for wet-covering', 'Bond breaker for control joints'],
      steps: [
        { title: 'Order concrete correctly', body: 'Volume = slab area × thickness + 10% waste. Grade per engineer (N25 typical residential; N32 for high-exposure or reactive sites). Slump per placement (80 pump, 100 wheelbarrow). Book truck 24 hrs ahead, confirm pump.', watchFor: 'Under-order 5% = short at the end; over 20% = paying for waste. 10% buffer is standard.' },
        { title: 'Prep the site pre-truck', body: 'Set screed rails at FFL (top of boxing = perimeter rail; intermediate stakes with pipe on top set to FFL for the middle). Hose, tools, PPE, wheelbarrows, bull float ready before truck arrives.', watchFor: 'A truck waiting on site is charging waiting time. Have everything ready before you ring "on your way".' },
        { title: 'Truck arrives — check the docket', body: 'Docket shows batch time, MPa, slump, additives. Confirm against order. If slump is out, get driver to add water (if permitted) or reject.', watchFor: 'Concrete life is 90 min from batch under AS 1379. Batch over 100 min = reject — won\'t place well and will fail QA.' },
        { title: 'Discharge + rake to depth', body: 'Discharge into formwork in strips from one end. Rake to roughly FFL. Vibrate with poker every 300–500 mm, especially at edges, corners, around pipes and edge-beam thickenings.', watchFor: 'Over-vibration segregates the mix. Poker in and out in one motion, not held in one spot.' },
        { title: 'Screed to level with a board', body: 'Two people at each end of a straight screed board. Rest on perimeter boxing + intermediate rails. Saw the board back-and-forth as you move down the slab. Fill low spots ahead of the board.', watchFor: 'Screed board too short dips in the middle. Length = 1.5× widest span between rails min.' },
        { title: 'Bull float once bleed water is gone', body: 'After screeding, wait for bleed water to disappear (10–30 min depending on temp). Then bull-float — one pass, flatten ridges, close pores. Don\'t over-work.', watchFor: 'Floating while bleed water is present traps water and causes surface delamination. Wait for the sheen to go matte.' },
        { title: 'Steel trowel or power float finish', body: 'Once you can stand on the slab with only a 3–5 mm footprint (2–4 hrs from pour), start trowelling. Two passes: smoothing then burnishing.', watchFor: 'Too early = open surface. Too late = trowel skips. Feel for the window — firm but responsive.' },
        { title: 'Apply curing compound + protect', body: 'Spray curing compound over the finished surface, or cover with wet hessian / poly for 7 days. Prevents rapid moisture loss + surface crazing. In hot conditions (>28 °C) start covering immediately after finishing.', watchFor: 'Rain on fresh concrete washes cream off = weak dusty finish. Cover with poly if rain forecast within 6 hours.' },
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
