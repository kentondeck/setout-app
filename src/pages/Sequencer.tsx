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
  | 'services'
  | 'painting'
  | 'flooring'
  | 'handover'
  | 'renovation';

// Category is kept as job metadata (secondary tag for future filters);
// the UI renders by phase now, so no Category const / interface here.

// Build phases in the order a new-build actually gets constructed.
// The Sequencer renders phases first; jobs are pulled out per phase.
type PhaseKey =
  | 'pre-start'
  | 'site-prep'
  | 'setout'
  | 'underground'
  | 'foundations'
  | 'sub-floor'
  | 'framing'
  | 'weather-tight'
  | 'rough-in'
  | 'linings'
  | 'wet-finish'
  | 'second-fix-carp'
  | 'second-fix-trades'
  | 'painting'
  | 'flooring'
  | 'snag'
  | 'external'
  | 'renovation';

interface Phase {
  key: PhaseKey;
  label: string;
  detail: string;
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
  phase: PhaseKey;
  label: string;
  summary: string;
  au?: JobDetail;
  nz?: JobDetail;
}

// ─── Phases ──────────────────────────────────────────────────────────────────
// Ordered by the actual sequence a new-build goes together on site. The
// Sequencer opens on this list — tap a phase to see every job in it,
// including the trades that overlap in that phase.

const PHASES: Phase[] = [
  { key: 'pre-start',         label: 'Pre-start',                   detail: 'Consent / permit, insurances, service disconnects, kick-off with subs.' },
  { key: 'site-prep',         label: 'Site prep',                   detail: 'Clearance, demo, silt / sediment control, hoardings, site facilities.' },
  { key: 'setout',            label: 'Setout',                      detail: 'Surveyor marks, profile boards, datum, snap lines on the slab.' },
  { key: 'underground',       label: 'Underground services',        detail: 'Waste + stormwater, water supply, mains conduit — before slab pour.' },
  { key: 'foundations',       label: 'Foundations',                 detail: 'Excavate, DPM, mesh + starter bars, formwork, pour + cure.' },
  { key: 'sub-floor',         label: 'Sub-floor',                   detail: 'Piles / piers, bearers, joists, flooring sheet (timber floor only).' },
  { key: 'framing',           label: 'Framing & structure',         detail: 'Wall frames, braces, ceiling joists, trusses or cut rafters.' },
  { key: 'weather-tight',     label: 'Roof + cladding',             detail: 'Underlay, roof, wrap, windows, ext doors, cladding.' },
  { key: 'rough-in',          label: 'Services rough-in',           detail: 'Plumbing, electrical, gas, aircon, insulation — walls still open.' },
  { key: 'linings',           label: 'Linings & waterproofing',     detail: 'Plasterboard fix + stop, wet-area lining, waterproofing to wet areas.' },
  { key: 'wet-finish',        label: 'Wet-area finishing',          detail: 'Shower liner or tiles, floor tiles, grout, silicone perimeter.' },
  { key: 'second-fix-carp',   label: '2nd-fix carpentry',           detail: 'Skirtings, architraves, internal doors + locksets, cabinets, splashback.' },
  { key: 'second-fix-trades', label: '2nd-fix trades',              detail: 'Taps, WC, vanity basin, GPOs, switches, light fittings, aircon fit-off.' },
  { key: 'painting',          label: 'Painting',                    detail: 'Prep + prime, undercoats, topcoats to walls / ceilings + timber trim.' },
  { key: 'flooring',          label: 'Flooring',                    detail: 'Carpet, vinyl, timber floor, dry-area tile.' },
  { key: 'snag',              label: 'Snag + handover',             detail: 'Snag list, adjust hardware, hand over to client.' },
  { key: 'external',          label: 'External works',              detail: 'Deck, pergola, driveway, path, fence, gate, retaining, landscape.' },
  { key: 'renovation',        label: 'Renovation-specific',         detail: 'Jobs that only apply to work on an existing building.' },
];

// ─── Jobs ────────────────────────────────────────────────────────────────────
// Only jobs with `steps` are viewable; the rest render as "coming soon"
// placeholders so the library reads as intentional & growing, not empty.

const JOBS: Job[] = [
  // ─── Pre-start — paperwork + programme before boots on site ──────────────
  {
    id: 'pre-start-checklist',
    category: 'site-setout',
    phase: 'pre-start',
    label: 'Pre-start checklist',
    summary: 'Consent / permit issued, insurances current, service disconnects booked, sub programme locked in.',
    nz: {
      tools: ['Copy of consent + approved plans', 'Contract + variations log', 'Notepad + phone'],
      materials: ['Site diary / notebook', 'Printed copies of consent conditions'],
      steps: [
        { title: 'Confirm building consent is issued + any conditions clear', body: 'Consent number in hand, all conditions read line by line. Note any pre-construction conditions (geotech report, engineer inspection schedule, tree protection) — those must be satisfied before the first shovel.', watchFor: 'Starting work under a consent that has unresolved conditions is a stop-work waiting to happen. Read every condition, tick each off.' },
        { title: 'Check contract works + public liability insurance', body: 'Confirm your CoW policy covers the full contract value + any client-supplied materials. Public liability at the level your contract / client requires. Certificate of currency saved with the job file.', watchFor: 'An expired policy on the day something happens = personal exposure. Cross-check the expiry date matches the programme end date.' },
        { title: 'Book service disconnects (reno only)', body: 'If reno / demo work, book power, water, gas, comms disconnects 2+ weeks ahead. Distributor / retailer schedules can push you a week if you leave it late.', watchFor: 'A live power line during demo is a fatality risk + a WorkSafe notifiable event. Booked + confirmed disconnected before any tool touches the wall.' },
        { title: 'Lock in sub programme + kick-off meeting', body: 'Ring every sub with their week-of-start date + duration. Hold a kick-off (in person if possible) to walk the site, confirm access, hand out plans + the programme.', watchFor: 'Subs that show up without seeing the site under-quote or arrive missing gear. A 20-min kick-off walk saves days of re-work.' },
        { title: 'Notify the neighbours', body: 'Drop a letter or knock: dates you\'ll be on site, working hours, contact number for issues, and a heads-up about noisy days (concrete pour, roof cladding, jackhammer). Photograph any existing damage on shared fences / paths / driveways before machinery arrives.', watchFor: 'The first complaint call goes to council if the neighbour doesn\'t know who you are. Being introduced up-front usually turns complaints into a phone call to you instead.' },
        { title: 'Set up the site file', body: 'One place (folder + phone) with consent, plans, engineer reports, product data sheets, sub contact list, insurances, safety plan. Keep a copy in the site box + one at the office.', watchFor: 'The BCA inspector will ask for consent + plans on any inspection. Fumbling for them delays the inspection and looks unprofessional.' },
      ],
    },
    au: {
      tools: ['Copy of building permit + approved plans', 'Contract + variations log', 'Notepad + phone'],
      materials: ['Site diary / notebook', 'Printed copies of permit conditions'],
      steps: [
        { title: 'Confirm building permit is issued + all conditions clear', body: 'Permit number in hand, all conditions read line by line. Pre-construction conditions (soil report, engineer inspection schedule, bushfire attack level, tree protection zone) must be satisfied before the first shovel.', watchFor: 'Starting under a permit with unresolved conditions is a stop-work order waiting to happen. Read every condition + tick each off.' },
        { title: 'Check contract works + public liability insurance', body: 'CoW policy covers full contract value + any client-supplied materials. Public liability at the level your contract / builder\'s licence requires. Certificate of currency saved with the job file.', watchFor: 'Expired policy on the day something happens = personal exposure. Cross-check expiry vs programme end.' },
        { title: 'Book service disconnects (reno only)', body: 'Reno / demo: book power, water, gas, comms disconnects 2+ weeks ahead. Distributor / retailer scheduling can push a week if left late.', watchFor: 'Live power during demo = fatality risk + SafeWork notifiable event. Booked + confirmed off before any tool touches the wall.' },
        { title: 'Lock in sub programme + kick-off meeting', body: 'Every sub with their week-of-start date + duration confirmed. Kick-off (in person) to walk the site, confirm access, hand out plans + programme.', watchFor: 'Subs that arrive without seeing the site under-quote or turn up missing gear. A 20-min walk saves days of re-work.' },
        { title: 'Notify the neighbours', body: 'Letter or door-knock: dates on site, working hours, contact number, heads-up on noisy days (pour, cladding, jackhammer). Photograph existing damage on shared fences / paths / driveways before machinery arrives.', watchFor: 'The first complaint goes to council if the neighbour doesn\'t know who you are. Introduction up-front turns most complaints into a phone call to you.' },
        { title: 'Set up the site file', body: 'One place (folder + phone) with permit, plans, engineer reports, product data sheets, sub contact list, insurances, SWMS + safety plan. Copy in the site box + one at the office.', watchFor: 'The surveyor / certifier asks for permit + plans on any inspection. Fumbling for them delays inspection + reads unprofessional.' },
      ],
    },
  },

  // ─── Site prep — clear + protect the site before setout ─────────────────
  {
    id: 'demolish-existing-structure',
    category: 'site-setout',
    phase: 'site-prep',
    label: 'Demolish an existing structure',
    summary: 'Disconnect services, strip re-usable materials, protect neighbours, sort waste.',
    nz: {
      tools: ['Excavator (sized to suit the job)', 'Sledge hammer', 'Crowbar', 'Angle grinder', 'Recip saw', 'Chainsaw (framing timber)', 'PPE: hard hat, glasses, gloves, dust mask, hi-vis, steel caps'],
      materials: ['Bins: mixed / clean fill / metal / timber (sort earns money back)', 'Dust suppression water', 'Barrier mesh + star pickets', 'Signage: "Demolition in progress — no unauthorised entry"'],
      steps: [
        { title: 'Confirm services are disconnected + capped', body: 'Power, water, gas, phone / comms — all disconnected + capped at the boundary by the retailer / distributor. Get the confirmation slips in hand before anything touches the building.', watchFor: 'A "turned off" service is NOT disconnected. Distributor sign-off is the only proof — no slip, no start.' },
        { title: 'Check for asbestos + hazardous materials', body: 'Older buildings can contain asbestos in Superline / Fibrolite cladding, textured ceilings, vinyl backing, eaves. Book a licensed surveyor to sample any suspect materials — age alone doesn\'t rule it out. Removal is a licensed trade.', watchFor: 'Demoing asbestos-containing material unlicensed is a WorkSafe prosecution + a heavy fine. If in doubt, test.' },
        { title: 'Strip re-usable materials first', body: 'Before the machine goes in: pull doors, windows, joinery, roofing iron, native timber, copper pipe. Second-hand market pays for these + reduces landfill.', watchFor: 'Once the excavator swings, you\'ve lost the resale value. Strip first, machine second.' },
        { title: 'Fence + signage', body: 'Perimeter barrier mesh on star pickets around the demo footprint + a clear buffer zone. "Demolition in progress" signage at every access point.', watchFor: 'Kids + neighbours will walk into an unsecured demo site the moment your back is turned. Fence before you break the first pane.' },
        { title: 'Wet down + demolish', body: 'Water the structure as the machine bites — knocks dust out of the air. Work top-down: roof, then walls, then slab. Load bins as you go; don\'t stockpile.', watchFor: 'Dry demo generates a dust plume that reads for blocks. One hose on the pile the whole time keeps neighbours happy + your PPE working.' },
        { title: 'Grub out + level site', body: 'Excavator to remove foundations, slab, buried tanks, tree stumps. Rough-level the site ready for setout.', watchFor: 'Leaving old foundations in the ground = re-digging them out during trench excavation. Grub thoroughly now.' },
      ],
    },
    au: {
      tools: ['Excavator (sized to suit the job)', 'Sledge hammer', 'Crowbar', 'Angle grinder', 'Recip saw', 'Chainsaw (framing timber)', 'PPE: hard hat, glasses, gloves, P2 dust mask, hi-vis, steel caps'],
      materials: ['Bins: mixed / clean fill / metal / timber (sorting earns money back)', 'Dust suppression water', 'Barrier mesh + star pickets', 'Signage: "Demolition in progress — no unauthorised entry"'],
      steps: [
        { title: 'Confirm services are disconnected + capped', body: 'Power, water, gas, phone / NBN — all disconnected + capped at the boundary by the retailer / distributor. Confirmation slips in hand before anything touches the building.', watchFor: 'A "turned off" service is NOT disconnected. Distributor sign-off is the only proof — no slip, no start.' },
        { title: 'Check for asbestos + hazardous materials', body: 'Older buildings can contain asbestos in fibre cement cladding, vinyl backing, textured ceilings, eaves. Book a licensed surveyor to sample any suspect materials — age alone doesn\'t rule it out. Removal is a licensed trade under state WHS regs.', watchFor: 'Demoing ACM unlicensed = SafeWork prosecution + heavy fine. If in doubt, test.' },
        { title: 'Strip re-usable materials first', body: 'Before the machine goes in: doors, windows, joinery, roofing sheet, hardwood, copper. Reuse yards pay + reduces tip fees.', watchFor: 'Once the excavator swings, you\'ve lost resale value. Strip first, machine second.' },
        { title: 'Fence + signage', body: 'Perimeter barrier mesh on star pickets around the demo footprint + a buffer zone. "Demolition in progress" signage at every access point per state WHS Regs.', watchFor: 'Kids + neighbours will walk into an unsecured demo site. Fence before you break the first pane.' },
        { title: 'Wet down + demolish', body: 'Water the structure as the machine bites — knocks dust out of the air. Work top-down: roof, then walls, then slab. Load bins as you go, no stockpiling.', watchFor: 'Dry demo generates a dust plume for blocks. One hose on the pile keeps neighbours + PPE working.' },
        { title: 'Grub out + level site', body: 'Excavator removes foundations, slab, buried tanks, tree stumps. Rough-level ready for setout.', watchFor: 'Old foundations left in-ground = re-digging during trench excavation. Grub thoroughly.' },
      ],
    },
  },
  {
    id: 'install-silt-sediment-control',
    category: 'site-setout',
    phase: 'site-prep',
    label: 'Install silt / sediment control',
    summary: 'Silt fence, wheel wash, catch pit protection — before any earthworks.',
    nz: {
      tools: ['Sledge hammer', 'Post rammer', 'Spade', 'Utility knife', 'Cordless drill / driver', 'Tape', 'Wheelbarrow'],
      materials: ['Silt fence fabric (geo-textile — Terram or similar)', 'Waratah steel pickets, 1.5 m, at 2 m c/c', '75 mm cable ties (fence to pickets)', 'Sandbags or aggregate for base', 'Catch pit filter socks or wooden hoardings'],
      steps: [
        { title: 'Confirm council + regional council requirements', body: 'Sediment control is required by most regional council plans + is often a consent condition. Check the erosion + sediment control plan (ESCP) if the consent has one — it dictates fence position, catch pit protection, and stabilised entry.', watchFor: 'A missing sediment plan on a job that needs one = abatement notice from the regional council. Ring them if unsure.' },
        { title: 'Mark the fence line on the low side of the site', body: 'Sediment runs downhill. Fence goes across the flow path on the DOWN-slope side of any disturbed ground, curving up at each end to hold water back rather than let it escape sideways.', watchFor: 'A straight fence across the slope with the ends level with the middle just lets water run around each end. Curve the ends uphill.' },
        { title: 'Drive pickets + trench in the bottom edge', body: 'Waratahs at 2 m c/c along the marked line. Dig a 200 mm deep trench along the fence line; fold the bottom 200 mm of fabric into the trench, backfill + compact so silty water can\'t undermine.', watchFor: 'A silt fence sitting ON the ground with no toe-in = silty water flows straight under. The trench is not optional.' },
        { title: 'Cable-tie fabric to pickets on the UP-slope side', body: 'Fabric on the up-slope face of the pickets so it\'s pushed INTO the pickets by water pressure, not pulled away from them. Cable ties every 300 mm.', watchFor: 'Fabric on the wrong side of the picket pops off in the first heavy rain. Up-slope side, always.' },
        { title: 'Protect catch pits + install stabilised entry', body: 'Every stormwater catch pit inside the sediment fence line gets a filter sock or timber hoarding around the grate. Site entry: 5+ m of coarse aggregate (GAP 65 or similar) at least 200 mm deep so trucks knock mud off tyres before they hit the road.', watchFor: 'Mud tracked onto the public road is a council pull-up. Stabilised entry + a broom kept at the gate stops it before it starts.' },
        { title: 'Inspect after every rain event + top-up', body: 'Silt fences clog + tear. After any decent rain, walk the fence, clear silt build-up on the up-slope side, patch tears, top up trench where it\'s undermined.', watchFor: 'A blocked silt fence that overtops loses more sediment than no fence at all. Clear it out; don\'t let silt build to the top.' },
      ],
    },
    au: {
      tools: ['Sledge hammer', 'Post rammer', 'Spade', 'Utility knife', 'Cordless drill / driver', 'Tape', 'Wheelbarrow'],
      materials: ['Silt fence fabric (geo-textile — bidim or similar)', 'Steel pickets, 1.5 m, at 2 m c/c', '75 mm cable ties (fence to pickets)', 'Sandbags or aggregate for base', 'Catch pit filter socks or timber hoardings'],
      steps: [
        { title: 'Confirm council + EPA requirements', body: 'Sediment control is a common permit condition + state EPA requirement (each state has its own — NSW EPA Blue Book, VIC EPA, QLD EHP, etc.). Check permit for an erosion + sediment control plan (ESCP).', watchFor: 'Missing ESCP on a job that needs one = fine from council or EPA. Ring council if unsure.' },
        { title: 'Mark the fence line on the low side of the site', body: 'Sediment runs downhill. Fence across the flow path on the DOWN-slope side of any disturbed ground, curving up at each end to hold water back rather than let it escape sideways.', watchFor: 'Straight fence across slope with level ends = water runs around. Curve ends uphill.' },
        { title: 'Drive pickets + trench in the bottom edge', body: 'Pickets at 2 m c/c along the marked line. Dig a 200 mm deep trench along the fence line; fold the bottom 200 mm of fabric into the trench, backfill + compact so silty water can\'t undermine.', watchFor: 'Silt fence sitting ON the ground = silty water flows under. Trench is not optional.' },
        { title: 'Cable-tie fabric to pickets on the UP-slope side', body: 'Fabric on the up-slope face of the pickets so water pressure pushes it INTO the pickets. Cable ties every 300 mm.', watchFor: 'Fabric on the wrong side pops off in the first heavy rain. Up-slope side, always.' },
        { title: 'Protect stormwater inlets + install stabilised entry', body: 'Every stormwater pit inside the fence line gets a filter sock or timber hoarding around the grate. Site entry: 5+ m of coarse aggregate (20–40 mm) at least 200 mm deep so trucks knock mud off tyres before hitting the road.', watchFor: 'Mud on the public road is a council pull-up. Stabilised entry + a broom at the gate stops it.' },
        { title: 'Inspect after every rain event + top-up', body: 'Silt fences clog + tear. After decent rain, walk the fence, clear silt build-up on the up-slope side, patch tears, top up trench where undermined.', watchFor: 'A blocked fence that overtops loses more sediment than no fence at all. Clear it out.' },
      ],
    },
  },
  {
    id: 'set-up-site-facilities',
    category: 'site-setout',
    phase: 'site-prep',
    label: 'Set up site facilities',
    summary: 'Toilet, bin, water tap, first-aid, hoardings, signage, temporary power.',
    nz: {
      tools: ['Cordless drill / driver', 'Sledge hammer', 'Utility knife', 'Cable ties', 'Padlocks'],
      materials: ['Portaloo (hired, weekly clean)', 'Skip / bin (hired, 3–6 m³ typical)', 'Temporary water standpipe or fitted tap', '32 A temporary power box + RCD (electrician-installed)', 'Barrier mesh + star pickets or timber hoardings', 'Site signage: contractor name, contact, consent number', 'First-aid kit + eyewash', 'Fire extinguisher (dry powder)'],
      steps: [
        { title: 'Position the toilet + bin near the site entry', body: 'Portaloo near the entry so the truck can service it without driving on site. Bin close to the work area but not blocking access. Both need a stable, level base — sand/gravel pad is fine.', watchFor: 'A portaloo down the back of a section that the truck can\'t reach = uncleaned toilet = complaints. Position for the service truck first.' },
        { title: 'Install temporary power (electrician)', body: 'Book a licensed electrician to install a temporary supply from the network connection or a nearby permanent outlet. Must be RCD-protected + weatherproof. Board fixed to a solid post, not just leaning.', watchFor: 'DIY temp power = illegal + a WorkSafe issue. Electrician only.' },
        { title: 'Get water on site', body: 'Either use the permanent water meter (once connected) + fit a tap, or run a temporary hose off the neighbour\'s tap by agreement. Standpipe hire from council is another option for developed sites.', watchFor: 'No water on site = no dust suppression + no clean-up. Sort this in the first week.' },
        { title: 'Fence + signage', body: 'Perimeter barrier mesh (or timber hoardings for street-facing sites) around the work area. Signs at entries: contractor name, contact number, consent number, "No unauthorised entry", after-hours contact.', watchFor: 'Signage is often a consent condition. Check the conditions sheet + comply — not just because it looks pro, but because council will check.' },
        { title: 'First-aid + fire extinguisher', body: 'Kit stocked + accessible. Fire extinguisher (dry powder, 4.5 kg min) near the work area. Both signed as location markers.', watchFor: 'An empty first-aid kit is worse than none — nobody thinks to check. Assign one person to maintain it weekly.' },
        { title: 'Site induction for every worker', body: 'Every sub who steps on site gets a 5-min induction: where facilities are, emergency contact, evacuation point, hazards, PPE required. Sign them in.', watchFor: 'An un-inducted worker + an incident = liability on the head contractor. Sign-in book is your legal defence.' },
      ],
    },
    au: {
      tools: ['Cordless drill / driver', 'Sledge hammer', 'Utility knife', 'Cable ties', 'Padlocks'],
      materials: ['Portaloo (hired, weekly clean)', 'Skip / bin (hired, 3–6 m³ typical)', 'Temporary water standpipe or fitted tap', '32 A temporary switchboard + RCD (electrician-installed)', 'Barrier mesh + star pickets or timber hoardings', 'Site signage: contractor name, contact, permit number', 'First-aid kit + eyewash', 'Fire extinguisher (dry powder)'],
      steps: [
        { title: 'Position the toilet + bin near the site entry', body: 'Portaloo near the entry so the service truck can reach it without driving on site. Bin close to work but not blocking access. Both on a stable, level pad.', watchFor: 'A portaloo down the back that the truck can\'t reach = uncleaned = complaints. Position for the service truck first.' },
        { title: 'Install temporary power (licensed electrician)', body: 'Book a licensed electrician for temporary supply from network or nearby permanent outlet. RCD-protected + weatherproof, fixed to a solid post per AS/NZS 3012.', watchFor: 'DIY temp power = illegal + SafeWork issue. Electrician only.' },
        { title: 'Get water on site', body: 'Use the permanent water meter (once connected) + fit a tap, or run a temporary hose off the neighbour\'s tap by agreement. Council standpipe hire is another option for developed sites.', watchFor: 'No water = no dust suppression + no clean-up. Sort in the first week.' },
        { title: 'Fence + signage', body: 'Perimeter barrier mesh (or timber hoardings for street-facing sites). Signs at entries: contractor name, contact, permit number, "No unauthorised entry", after-hours contact.', watchFor: 'Signage is often a permit condition. Check + comply — council will inspect.' },
        { title: 'First-aid + fire extinguisher', body: 'Kit stocked + accessible. Fire extinguisher (dry powder, 4.5 kg min) near work area. Both signed as location markers.', watchFor: 'Empty first-aid kit is worse than none — no one thinks to check. Assign one person weekly.' },
        { title: 'Site induction for every worker', body: 'Every sub gets a 5-min induction: facility locations, emergency contact, evacuation point, hazards, PPE required. Sign them in per WHS Regs.', watchFor: 'Un-inducted worker + incident = head-contractor liability. Sign-in book is your legal defence.' },
      ],
    },
  },
  {
    id: 'install-tree-protection',
    category: 'site-setout',
    phase: 'site-prep',
    label: 'Install tree protection',
    summary: 'Protective fencing around retained trees per arborist / consent condition.',
    nz: {
      tools: ['Sledge hammer', 'Cordless drill / driver', 'Tape', 'Cable ties'],
      materials: ['Barrier mesh (orange or hi-vis)', 'Star pickets, 1.5 m', 'Mulch (100 mm deep over TPZ)', 'Signage: "Tree Protection Zone — no entry"'],
      steps: [
        { title: 'Read the arborist report + consent conditions', body: 'Protected trees are usually listed by species + diameter (DBH — diameter at breast height). Consent will specify a Tree Protection Zone (TPZ) — typically 12× DBH radius, but the arborist can specify tighter. Fence goes on that TPZ line.', watchFor: 'Damage to a protected tree = infringement + potential enforcement action from council. Read the exact TPZ figure — don\'t assume.' },
        { title: 'Mark the TPZ on the ground', body: 'From the trunk, measure the TPZ radius with a tape + drop a fluoro mark every 2 m around the circle. On sloping ground, measure horizontally.', watchFor: 'Measuring TPZ up the slope makes the zone shorter than it should be. Always horizontal.' },
        { title: 'Drive pickets + hang barrier mesh', body: 'Star pickets at 2 m c/c around the TPZ line. Cable-tie orange mesh to the pickets — full height, not just at the top.', watchFor: 'Half-height mesh gets stepped over by tradies with materials. Full-height barrier reads as "do not enter" — half-height reads as "convenient shortcut".' },
        { title: 'Mulch inside the TPZ', body: '100 mm of arborist mulch inside the fence. Protects root zone from compaction, moisture loss, and any accidental foot traffic if someone does step over.', watchFor: 'Mulch touching the trunk causes rot. Keep it 100 mm clear of the trunk itself.' },
        { title: 'Signage + brief every sub', body: 'Signs: "Tree Protection Zone — no entry, no storage, no fill, no washout". At the site induction, point out the TPZ and confirm the boundary.', watchFor: 'A tradie tipping paint wash or concrete slurry inside the TPZ kills the tree. Verbal reminder at induction + signage catches most.' },
        { title: 'Regular check + document', body: 'Weekly photo of the fence intact + no incursion. If any work needs to happen inside the TPZ, arborist supervises + signs off — no exceptions.', watchFor: 'Photos are your defence if a damage claim comes later. Weekly, timestamped, saved with the job.' },
      ],
    },
    au: {
      tools: ['Sledge hammer', 'Cordless drill / driver', 'Tape', 'Cable ties'],
      materials: ['Barrier mesh (orange or hi-vis)', 'Star pickets, 1.5 m', 'Mulch (100 mm over TPZ)', 'Signage: "Tree Protection Zone — no entry"'],
      steps: [
        { title: 'Read the arborist report + permit conditions', body: 'Protected trees (heritage, significant, or council overlay) listed by species + diameter (DBH). TPZ per AS 4970 is typically 12× DBH radius, arborist can specify tighter. Fence goes on that line.', watchFor: 'Damage to a protected tree = fine + potential enforcement. Read the exact TPZ figure.' },
        { title: 'Mark the TPZ on the ground', body: 'From the trunk, measure the TPZ radius with a tape + drop a fluoro mark every 2 m around the circle. On sloping ground, measure horizontally per AS 4970.', watchFor: 'Measuring up the slope makes the zone shorter than it should be. Always horizontal.' },
        { title: 'Drive pickets + hang barrier mesh', body: 'Star pickets at 2 m c/c around the TPZ line. Cable-tie orange mesh full-height, not just top.', watchFor: 'Half-height mesh gets stepped over. Full-height reads "do not enter".' },
        { title: 'Mulch inside the TPZ', body: '100 mm of arborist mulch inside the fence. Protects root zone from compaction, moisture loss, accidental traffic.', watchFor: 'Mulch touching the trunk causes rot. Keep 100 mm clear of trunk.' },
        { title: 'Signage + brief every sub', body: 'Signs: "Tree Protection Zone — no entry, no storage, no fill, no washout". Point out the TPZ at site induction, confirm the boundary.', watchFor: 'A tradie tipping paint wash or concrete slurry inside the TPZ kills the tree. Verbal + signage catches most.' },
        { title: 'Regular check + document', body: 'Weekly photo of intact fence + no incursion. Any work inside the TPZ = arborist supervises + signs off, no exceptions.', watchFor: 'Photos are your defence if a damage claim comes later. Weekly, timestamped, saved with the job.' },
      ],
    },
  },

  // ─── Site setout — first thing on a bare section ─────────────────────────
  {
    id: 'profile-boards',
    category: 'site-setout',
    phase: 'setout',
    label: 'Set up profile boards + peg the corners',
    summary: 'Datum peg, level rails, string lines, drop corner pegs.',
    nz: {
      tools: ['30 m tape', 'Rotary laser or dumpy level + staff', 'Spirit level', 'Sledge hammer', 'Claw hammer', 'Handsaw or drop saw', 'Plumb bob', 'Chalk line', 'Marker pen'],
      materials: ['Stakes: 50×50 H4 pointed pine, ~1.2 m (2 per corner)', 'Rails: 100×25 H3.2 pine, ~1.2 m (1 per corner)', '75×3.75 flat-head galv nails', 'Builder\'s string line (nylon)', 'Marker pegs (40×40×450 H4) for corners', 'Fluoro spray'],
      steps: [
        { title: 'Locate the surveyor\'s marks', body: 'Modern jobs — the surveyor comes out first with the plans + total station / GPS and marks each building corner (or key gridline) directly on the ground with a peg + nail, or spray. Walk the site, find every mark, cross-check the positions read sensibly against the plan (front / side / rear look right for the section). If the surveyor has only marked the boundary + given you offsets in writing, measure inward from each boundary peg by the stated offset and drop your own corner pegs.', watchFor: 'A missing or bumped surveyor peg is a five-figure fix. If a mark looks off, or one\'s missing, ring the surveyor back before profiles go in — never guess a corner off the fence line.' },
        { title: 'Establish your datum', body: 'Transfer a height reference onto site from a permanent mark — a footpath kerb, LINZ benchmark, or a nail in a neighbour\'s driveway that won\'t move. Drive a solid datum peg somewhere it won\'t be disturbed and record its RL.', watchFor: 'The datum runs the whole project. If it moves, every level after it is wrong. Fence it off or paint it hi-vis.' },
        { title: 'Position profile stakes clear of the corners', body: 'Drive two stakes per corner, ~1.5 m clear of the actual building corner, roughly on the extended line of each wall. Keeps them out of the way of the digger and formwork.', watchFor: 'If stakes are too close, the excavator will knock them out on day one. Give yourself elbow room.' },
        { title: 'Nail level rails at datum height', body: 'Set the laser (or dumpy) up on the datum and shoot each stake pair. Nail a timber rail across each pair at exact datum height + your chosen offset (e.g. datum + 900 mm = future FFL). Keep the two opposing rails on each axis the SAME height as each other — but set one axis (e.g. the two long-wall rails) slightly higher or lower than the other axis (the two short-wall rails). That way, when you pull strings between opposite rails, the two strings pass over / under each other at the corners without ever touching.', watchFor: 'Get every pair matched to itself. Sight along the run before pulling strings — if one rail in a pair looks off its mate, re-shoot. If both axes end up at the same height, the strings clash at every corner and neither reads true.' },
        { title: 'Pull string lines between opposite rails', body: 'Mark the setout line on each rail with a nail — usually the outside face of the slab or footing (or a gridline if the plan dimensions to grid). Run string between opposite nails — the string is now your setout line, floating at datum height above the ground. Read the plan\'s dimension reference before you drive the first nail.', watchFor: 'Nylon builder\'s string sags. Tension it hard, and use masonry line for spans over 15 m.' },
        { title: 'Square the strings', body: '3-4-5 method: mark 3 m on one string, 4 m on the perpendicular; the diagonal must be exactly 5 m. Or measure both diagonals of the rectangle — they match when it\'s square.', watchFor: 'Squaring off a short leg (3 m diagonal check) is less accurate than off a long one. Scale up — 6-8-10, or 9-12-15 — for a big footprint.' },
        { title: 'Peg the corners with a plumb bob', body: 'Where two strings cross, drop a plumb bob to the ground and drive a marker peg dead under it. Nail into the top of the peg — that nail head is your true corner.', watchFor: 'Wind blows plumb bobs sideways. Do it early morning, or shelter it with a bucket.' },
        { title: 'Label + protect the profiles', body: 'Number each profile (P1, P2…), mark the wall line and stake orientation on the rail with permanent marker. Take wide-angle photos before the digger turns up.', watchFor: 'If a profile gets bumped, you can re-establish it from the marks + photos. Without them, you\'re resetting from scratch.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Rotary laser or dumpy level + staff', 'Spirit level', 'Sledge hammer', 'Claw hammer', 'Handsaw or drop saw', 'Plumb bob', 'Chalk line', 'Marker pen'],
      materials: ['Stakes: 50×50 H4 pointed pine, ~1.2 m (2 per corner)', 'Rails: 100×25 H3-treated pine, ~1.2 m (1 per corner)', '75×3.75 flat-head galv nails', 'Builder\'s string line (nylon)', 'Marker pegs (50×50×450 H4) for corners', 'Fluoro spray'],
      steps: [
        { title: 'Locate the surveyor\'s marks', body: 'Modern jobs — the surveyor comes out first with the plans + total station / GPS and marks each building corner (or key gridline) directly on the ground with a peg + nail, or spray. Walk the site, find every mark, cross-check the positions read sensibly against the plan (front / side / rear look right for the block). If the surveyor has only marked the boundary + given you offsets in writing, measure inward from each survey peg by the stated offset and drop your own corner pegs.', watchFor: 'A missing or bumped surveyor peg is a five-figure fix. If a mark looks off, or one\'s missing, ring the surveyor back before profiles go in — never guess a corner off the fence line.' },
        { title: 'Establish your datum', body: 'Transfer a height reference onto site from a permanent mark — kerb crossover, PSM (Permanent Survey Mark) if one\'s nearby, or a nail in a neighbour\'s driveway. Drive a solid datum peg somewhere it won\'t move and record its RL against your permit\'s FFL.', watchFor: 'The datum runs the whole project. If it moves, every level after it is wrong. Fence it off or paint it hi-vis.' },
        { title: 'Position profile stakes clear of the corners', body: 'Drive two stakes per corner, ~1.5 m clear of the actual building corner, roughly on the extended line of each wall. Keeps them clear of the excavator and formwork.', watchFor: 'If stakes are too close, the excavator will knock them on day one. Give yourself elbow room.' },
        { title: 'Nail level rails at datum height', body: 'Set the laser (or dumpy) up on the datum and shoot each stake pair. Nail a timber rail across each pair at datum + your chosen offset (e.g. datum + 900 mm = future FFL). Keep the two opposing rails on each axis the SAME height as each other — but set one axis (e.g. the two long-wall rails) slightly higher or lower than the other axis (the two short-wall rails). That way, when you pull strings between opposite rails, the two strings pass over / under each other at the corners without ever touching.', watchFor: 'Get every pair matched to itself. Sight along the run before pulling strings — if one rail in a pair looks off its mate, re-shoot. If both axes end up at the same height, the strings clash at every corner and neither reads true.' },
        { title: 'Pull string lines between opposite rails', body: 'Mark the setout line on each rail with a nail — usually the outside face of the slab or footing (or a gridline if the plan dimensions to grid). Run string between opposite nails — the string is your setout line, floating at datum height above the ground. Read the plan\'s dimension reference before you drive the first nail.', watchFor: 'Nylon builder\'s string sags. Tension it hard, and use masonry line for spans over 15 m.' },
        { title: 'Square the strings', body: '3-4-5 method: mark 3 m on one string, 4 m on the perpendicular; the diagonal must be exactly 5 m. Or measure both diagonals of the rectangle — they match when it\'s square.', watchFor: 'Scale the check to suit the footprint. On a big slab, use 6-8-10 or 9-12-15 for far better accuracy than 3-4-5.' },
        { title: 'Peg the corners with a plumb bob', body: 'Where two strings cross, drop a plumb bob to the ground and drive a marker peg dead under it. Nail into the top of the peg — that nail head is your true corner.', watchFor: 'Wind blows plumb bobs sideways. Do it early morning, or shelter it with a bucket.' },
        { title: 'Label + protect the profiles', body: 'Number each profile (P1, P2…), mark the wall line and stake orientation on the rail with permanent marker. Take wide-angle photos before machinery arrives.', watchFor: 'If a profile gets bumped, you can re-establish it from the marks + photos. Without them, you\'re resetting from scratch.' },
      ],
    },
  },
  {
    id: 'setout-slab',
    category: 'site-setout',
    phase: 'setout',
    label: 'Set out a slab per the plan',
    summary: 'Pull dimensions, string the perimeter, square + verify, peg corners.',
    nz: {
      tools: ['30 m tape', 'Rotary laser or dumpy', 'Spirit level', 'Sledge + claw hammer', 'Handsaw', 'Plumb bob', 'Chalk line', 'Calculator'],
      materials: ['Profile stakes + rails (see the profile-boards job)', 'Builder\'s string, marker pegs, fluoro spray', 'Permanent marker'],
      steps: [
        { title: 'Pull the slab dimensions off the plan', body: 'Get overall length + width and any offsets or step-downs. Confirm what the plan dimensions to — outside face of the slab (most common), gridline, or wall centreline. Cross-check against the engineer\'s slab drawing for edge beams + thickenings.', watchFor: 'If in doubt about the dimension reference, ask before you drive a peg. A wrong assumption cascades through the whole build.' },
        { title: 'Set profile boards + strings for the perimeter', body: 'Follow the profile-boards job — profiles clear of every corner, level rails at datum, strings pulled between opposite rails at your slab\'s outside face (or whatever reference the plan dimensions to).', watchFor: 'On anything more complex than a rectangle (an L, T, garage bump-out), work rectangle-by-rectangle from a shared string line rather than trying to square the whole thing at once.' },
        { title: 'Square the strings', body: '3-4-5 method: mark 3 m on one string, 4 m on the perpendicular; the diagonal must be exactly 5 m. Or measure both diagonals of the bounding rectangle — they match when it\'s square. Scale up on bigger footprints (6-8-10, or 9-12-15).', watchFor: 'A 3-4-5 check off a short leg is less accurate than a longer triangle. Use the biggest one your setout allows.' },
        { title: 'Verify every wall + diagonals', body: 'Measure every external wall length against the plan. Measure both overall diagonals of the bounding rectangle. Anything > 10 mm off, redo it.', watchFor: 'It\'s much cheaper to correct now than after the digger has trenched the wrong shape.' },
        { title: 'Peg the corners + label', body: 'Plumb-bob every string intersection down to a marker peg. Nail into the peg top — that nail head is your true corner. Label each corner (C1, C2…) with permanent marker + a photo. Note the future FFL RL on each rail so the concreter can shoot heights straight off the profile.', watchFor: 'Any inside / reflex corner (where two walls meet at more than 180°) is the most-checked point on site. Peg it heavy and paint it hi-vis.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Rotary laser or dumpy', 'Spirit level', 'Sledge + claw hammer', 'Handsaw', 'Plumb bob', 'Chalk line', 'Calculator'],
      materials: ['Profile stakes + rails (see the profile-boards job)', 'Builder\'s string, marker pegs, fluoro spray', 'Permanent marker'],
      steps: [
        { title: 'Pull the slab dimensions off the plan', body: 'Get overall length + width and any offsets or step-downs. Confirm what the plan dimensions to — outside face of the slab (most common), gridline, or wall centreline. Cross-check against the engineer\'s slab drawing for edge beams + thickenings (AS 2870 site class drives the design).', watchFor: 'If in doubt about the dimension reference, ask before you drive a peg. A wrong assumption cascades through the whole build.' },
        { title: 'Set profile boards + strings for the perimeter', body: 'Follow the profile-boards job — profiles clear of every corner, level rails at datum, strings between opposite rails at your slab\'s outside face (or whatever reference the plan dimensions to).', watchFor: 'On anything more complex than a rectangle (L, T, garage bump-out), work rectangle-by-rectangle from a shared string line rather than trying to square the whole thing at once.' },
        { title: 'Square the strings', body: '3-4-5 method: mark 3 m on one string, 4 m on the perpendicular; the diagonal must be exactly 5 m. Or measure both diagonals of the bounding rectangle — they match when it\'s square. Scale up on bigger footprints (6-8-10 or 9-12-15).', watchFor: 'A 3-4-5 check off a short leg is less accurate than a longer triangle. Use the biggest one your setout allows.' },
        { title: 'Verify every wall + diagonals', body: 'Measure every external wall length against the plan. Measure both overall diagonals of the bounding rectangle. Anything > 10 mm off, redo it.', watchFor: 'Cheaper to correct now than after the excavator has trenched the wrong shape.' },
        { title: 'Peg the corners + label', body: 'Plumb-bob every string intersection down to a marker peg. Nail into the peg top — that nail head is your true corner. Label C1, C2… with permanent marker + a photo. Note the FFL RL on each rail so the concreter can shoot heights straight off the profile.', watchFor: 'Any inside / reflex corner is the most-checked point on site. Peg it heavy and paint it hi-vis.' },
      ],
    },
  },
  {
    id: 'setout-piles',
    category: 'site-setout',
    phase: 'setout',
    label: 'Set out for piles or pier pads',
    summary: 'Grid positions from profile boards, depth to good ground.',
    nz: {
      tools: ['30 m + 5 m tape', 'Dumpy or laser + staff', 'Plumb bob', 'Sledge + claw hammer', 'Marker pen', 'Spray can'],
      materials: ['Marker pegs (40×40×600 H4) — one per pile', 'Fluoro spray or flagging tape', 'Foundation plan + pile schedule (engineer\'s)'],
      steps: [
        { title: 'Read the pile schedule + foundation plan', body: 'Pull the engineer\'s pile positions, diameters, depths, and any raft / driven / bored pile call-outs. Note piles that carry point loads (beam ends, wall corners) — those are the ones you cannot move.', watchFor: 'NZS 3604 5 allows a lot of pile layouts, but if the engineer has specified a schedule you follow it exactly. Any change needs their sign-off.' },
        { title: 'Set up profile boards on the perimeter', body: 'Establish profiles + strings around the building footprint (per the profile-boards job). Piles will be measured off those strings, so they need to be dead accurate before you start.', watchFor: 'On sloping ground, transfer the string height off the datum so all piles reference the same RL.' },
        { title: 'Mark pile positions on the strings', body: 'From a corner, measure the pile spacing along each string and hang a peg or bright tape at each pile centreline. Do all one direction, then all the other, so you get a grid of intersections in the air.', watchFor: 'Piles under beams need to line up under the beam line, not the wall centreline. Read the plan carefully — they\'re not always the same.' },
        { title: 'Plumb each intersection to a marker peg', body: 'Drop the plumb bob at every string intersection and drive a marker peg dead under it. Nail into the peg top, spray a bright dot around it. That\'s your dig target for the auger.', watchFor: 'A plumb bob wanders in any breeze. Do it first thing in the morning while the air\'s still, or run a spirit level down a straightedge off the string if it\'s blowing.' },
        { title: 'Confirm depth-to-good-ground per pile', body: 'The engineer\'s pile depth is a starting point — actual depth is often set on the day by the driller / auger operator when they hit competent ground. Have the geotech / engineer\'s inspection number handy.', watchFor: 'If the driller stops short of the specified depth because "it feels solid", that\'s not your call — get the engineer to confirm.' },
        { title: 'Set pile-top RL marks (or shoot on the day)', body: 'Two options: transfer FFL RL onto a batter stake next to each pile ahead of the pour, OR just shoot each pile top with the laser on the day as the concreter screeds. Batter stakes are worth it if the pour is early morning or by a different crew; laser-on-the-day is fine if you\'re there.', watchFor: 'If in doubt, err slightly low — a low pile packs up easily with a hardwood shim; a high pile has to be ground down.' },
      ],
    },
    au: {
      tools: ['30 m + 5 m tape', 'Dumpy or laser + staff', 'Plumb bob', 'Sledge + claw hammer', 'Marker pen', 'Spray can'],
      materials: ['Marker pegs (50×50×600 H4) — one per pile', 'Fluoro spray or flagging tape', 'Engineer\'s footing plan + pile schedule'],
      steps: [
        { title: 'Read the pile schedule + footing plan', body: 'Pull the engineer\'s pile / pier positions, diameters, depths, and any bored / screw / driven call-outs. Reference the site classification (M, H1, H2, E, P per AS 2870) — that drives the design depth.', watchFor: 'On a reactive-clay site (H1/H2/E) the engineer usually specifies depth to founding layer, not a fixed number. Follow the drilling log, not a metre mark.' },
        { title: 'Set up profile boards on the perimeter', body: 'Establish profiles + strings around the building footprint (per the profile-boards job). Piers get measured off those strings, so they must be accurate before you drop a single peg.', watchFor: 'On sloping ground, transfer the string height off the datum so all piers reference the same RL.' },
        { title: 'Mark pier positions on the strings', body: 'From a corner, measure the pier spacing along each string and hang a peg or bright tape at each pier centreline. Do all one direction, then all the other — you\'ll have a grid of intersections in the air.', watchFor: 'Piers under bearers need to line up under the bearer line, not the wall centreline. Read the plan carefully.' },
        { title: 'Plumb each intersection to a marker peg', body: 'Drop the plumb bob at every string intersection and drive a marker peg dead under it. Nail the peg top, spray a bright dot around it — that\'s the drill target for the auger operator.', watchFor: 'A plumb bob wanders in any breeze. Do it first thing in the morning while the air\'s still, or run a spirit level down a straightedge off the string if it\'s blowing.' },
        { title: 'Verify depth to founding layer per pier', body: 'On a Class H, E, or P site the design depth may be nominal — the operator confirms when they hit competent material. Have the engineer\'s inspection contact ready before the drill starts.', watchFor: 'If the driller stops short because "it feels solid", it\'s not your call. Engineer confirms every hole on reactive-soil sites.' },
        { title: 'Set pier-top RL marks (or shoot on the day)', body: 'Two options: transfer FFL RL onto a batter stake next to each pier ahead of the pour, OR just shoot each pier top with the laser on the day as the concreter screeds. Batter stakes are worth it if the pour is early morning or by a different crew; laser-on-the-day is fine if you\'re there.', watchFor: 'If in doubt, err slightly low — a low pier packs up easily with a hardwood shim; a high pier has to be ground down.' },
      ],
    },
  },
  {
    id: 'snap-wall-lines',
    category: 'site-setout',
    phase: 'setout',
    label: 'Snap wall lines on a fresh slab',
    summary: 'Chalk out bottom-plate positions before framing starts.',
    nz: {
      tools: ['30 m tape', 'Chalk line (blue chalk for permanent, red for temporary)', 'Marker pen or crayon', 'Combination square', 'Broom', 'Spirit level'],
      materials: ['Chalk refill', 'Framing plan'],
      steps: [
        { title: 'Sweep the slab clean', body: 'Chalk lines are useless on a dusty or wet slab. Sweep the whole area, especially where lines will run. If the slab has any curing compound residue, scrub it — chalk won\'t bite through it.', watchFor: 'Red chalk barely shows on a wet or green slab. Wait until the surface is dry to the touch, or use blue.' },
        { title: 'Re-establish reference sides off your originals', body: 'Pick two adjacent external walls that are dead-square to each other — usually the ones you set up first from profile boards. Work BACK off your original references (profile marks, boundary pegs, or corner pegs) — never off the outside face of the slab, because a poured slab has +/- 5–10 mm tolerance and the slab is a result of your setout, not the truth of it.', watchFor: 'Snapping off the slab face carries any slab error forward into every wall + into the framing. Always trust the original setout references.' },
        { title: 'Mark bottom-plate faces, not centrelines', body: 'For a 90 mm frame, snap the outside face of the plate. Some crews snap both faces (a 90 mm gap between two parallel lines) so studs sit visually inside the tramlines.', watchFor: 'Don\'t snap wall centrelines. Framers will end up guessing which side of the line the plate sits — always mark the face.' },
        { title: 'Snap internal walls off the externals', body: 'Measure from an established external wall to each internal wall, snap the face. Number or label each wall on the slab with a crayon (W1, W2…) that matches the framing plan.', watchFor: 'Double-check any wall that carries a door — snap the opening positions too, so the framer doesn\'t have to figure it out later.' },
        { title: 'Mark studs at wall junctions + openings', body: 'Where an internal wall lands on an external, mark the corner stud position. At each door / window, mark the trimmer + jack positions so the framer knows the stud line at a glance.', watchFor: 'Missing junction marks are the #1 cause of a framer stopping to grab you for a decision. A five-minute crayon session saves a half-hour phone call later.' },
        { title: 'Check every internal dimension one more time', body: 'Walk the slab with the framing plan. Measure every room from opposite walls; compare to plan. Any wall off by more than 5 mm gets re-snapped now, not after the plates are down.', watchFor: 'A 10 mm error grows fast — by the time the door lining goes in, it\'s a 20 mm gap on one side and 0 mm on the other.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Chalk line (blue for permanent, red for temporary)', 'Marker pen or crayon', 'Combination square', 'Broom', 'Spirit level'],
      materials: ['Chalk refill', 'Framing plan'],
      steps: [
        { title: 'Sweep the slab clean', body: 'Chalk lines are useless on a dusty or wet slab. Sweep the whole area, especially where lines will run. Curing compound residue kills chalk — scrub it off if present.', watchFor: 'Red chalk barely shows on a green slab. Wait until the surface is dry to the touch, or use blue.' },
        { title: 'Re-establish reference sides off your originals', body: 'Pick two adjacent external walls that are dead-square to each other. Work BACK off your original references (profile marks, boundary pegs, or corner pegs) — never off the outside face of the slab, because a poured slab has +/- 5–10 mm tolerance and the slab is a result of your setout, not the truth of it.', watchFor: 'Snapping off the slab face carries any slab error forward into every wall + into the framing. Always trust the original setout references.' },
        { title: 'Mark bottom-plate faces, not centrelines', body: 'For a 90 mm frame, snap the outside face of the plate. Some crews snap both faces (90 mm apart) so studs sit visually inside the tramlines.', watchFor: 'Don\'t snap centrelines. Framers guess which side the plate sits — always mark the face.' },
        { title: 'Snap internal walls off the externals', body: 'Measure from an established external wall to each internal wall, snap the face. Label each wall with a crayon (W1, W2…) matching the framing plan.', watchFor: 'On a wall that carries a door, snap the opening positions too so the framer doesn\'t have to work it out.' },
        { title: 'Mark studs at wall junctions + openings', body: 'Where an internal wall lands on an external, mark the corner stud. At each door / window, mark trimmer + jack positions so the framer sees the stud line at a glance.', watchFor: 'Missing junction marks are the #1 reason a framer stops to grab you. A five-minute crayon session saves a half-hour phone call.' },
        { title: 'Check every internal dimension', body: 'Walk the slab with the framing plan. Measure every room from opposite walls; compare to plan. Any wall off by more than 5 mm gets re-snapped before plates are fixed.', watchFor: 'A 10 mm error grows fast — by the time architraves go on, it\'s a 20 mm margin one side and 0 mm the other.' },
      ],
    },
  },
  {
    id: 'setout-driveway-falls',
    category: 'site-setout',
    phase: 'external',
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

  // ─── Underground services — before slab pour ─────────────────────────────
  {
    id: 'install-underslab-drainage',
    category: 'services',
    phase: 'underground',
    label: 'Install under-slab drainage',
    summary: 'Licensed trade only. Waste + stormwater pipework to design falls before hardfill.',
    nz: {
      tools: ['Long-handled shovel', 'Spade', 'Laser or dumpy + staff', 'Tape', 'Handsaw or PVC pipe cutter', 'Sledge hammer', 'Rag + solvent brush'],
      materials: ['PVC waste pipe: 100 mm to sewer, 65 mm branches, 40 mm basin / shower', 'PVC solvent cement + primer', 'Bends, junctions, inspection eyes per plan', 'Stormwater pipe: 100 or 150 mm as spec\'d', 'Bedding + haunching sand', 'Marker tape (yellow for wastewater, orange for electrical)'],
      steps: [
        { title: 'Licensed drainlayer only — confirm scope + plan', body: 'This is restricted work under the Plumbers, Gasfitters, and Drainlayers Act — a licensed drainlayer (or supervised trainee under one) must do it. As the builder, your job is to coordinate: get the drainage plan, confirm gully positions, IO / inspection eye locations, connection point to street sewer + stormwater, and the design falls (per plan + G13/AS1). Hand it over to the drainlayer.', watchFor: 'Un-licensed drainage work is illegal + won\'t pass council inspection. Any deviation from the plan needs sign-off from the design engineer + drainlayer.' },
        { title: 'Trench + set falls', body: 'Trench between the connection point and each internal position. Use the laser to set trench floor to the design fall — steeper is fine, flatter is not. Bed 50 mm sand under pipe.', watchFor: 'A dead-flat run = the drain never self-cleans. Follow the fall spec — 1 in 60 is the sweet spot for waste.' },
        { title: 'Cut + solvent-weld the runs', body: 'Cut pipe square, deburr, brush primer on both surfaces + solvent cement. Push together + hold for 30 sec. Falls maintained through every fitting.', watchFor: 'A dry-fitted pipe forgotten before pour = leak or blowout at pressure test. Solvent-weld every joint before backfill.' },
        { title: 'Set gully + IO heights', body: 'Every internal gully rises through the slab. Cap the riser above finished slab level (per drainlayer / plan) so the concreter can pour + trim to height. IOs land at finished floor or in a gully box outside.', watchFor: 'Riser too short = drain buried in the slab; too tall = trip hazard until it\'s cut. Confirm the leave height with the drainlayer before capping.' },
        { title: 'Drainlayer inspection + pressure / water test', body: 'On any consented job the licensed drainlayer arranges a council or IQP inspection of the under-slab drainage — water-tested or air-tested per G13/AS1 + the drainlayer\'s method. Signed off + photographed BEFORE hardfill goes over.', watchFor: 'Pouring over unsigned-off drainage is a stop-work. The inspection is mandatory. Book it into the programme.' },
        { title: 'Backfill + mark on plan', body: 'Backfill with sand or clean fine hardfill, compact in layers. Lay marker tape above pipe (colour + depth per drainlayer / regional council spec). Photograph the layout + save with the job so future work can find it.', watchFor: 'A slab poured over drainage with no as-built photos = every future service change is a guess. Take the photos — they\'re a 5-minute job that saves days later.' },
      ],
    },
    au: {
      tools: ['Long-handled shovel', 'Spade', 'Laser or dumpy + staff', 'Tape', 'Handsaw or PVC pipe cutter', 'Sledge hammer', 'Rag + solvent brush'],
      materials: ['PVC waste pipe: 100 mm to sewer, 65 mm branches, 40 mm basin / shower', 'PVC solvent cement + primer per AS/NZS 3879', 'Bends, junctions, inspection openings per plan', 'Stormwater pipe: 100 or 150 mm as spec\'d', 'Bedding + haunching sand', 'Marker tape (yellow / orange per state)'],
      steps: [
        { title: 'Licensed drainlayer only — confirm scope + plan', body: 'Drainage is licensed work under state regs — a licensed drainlayer must do it. As the builder, your job is coordination: get the drainage plan, confirm gully + IO positions, connection points to sewer + stormwater, and design falls (per plan + AS/NZS 3500.2). Hand it over to the drainlayer.', watchFor: 'Un-licensed drainage work is illegal + won\'t pass inspection. Any deviation from the plan needs sign-off from the design engineer + drainlayer.' },
        { title: 'Trench + set falls', body: 'Trench from connection to each internal position. Laser to set trench floor to design fall — steeper fine, flatter not. Bed 50 mm sand under pipe.', watchFor: 'Dead-flat run = drain never self-cleans. Follow the fall spec — 1:60 is the sweet spot for waste.' },
        { title: 'Cut + solvent-weld the runs', body: 'Cut square, deburr, prime + solvent cement both surfaces. Push together + hold 30 sec. Falls maintained through every fitting.', watchFor: 'A dry-fitted pipe forgotten before pour = leak at pressure test. Solvent-weld every joint before backfill.' },
        { title: 'Set gully + IO heights', body: 'Every internal gully rises through the slab. Cap riser above finished slab level (per drainlayer / plan) so concreter can pour + trim to height. IOs land at finished floor or in a gully box outside.', watchFor: 'Riser too short = drain buried in slab; too tall = trip hazard. Confirm the leave height with the drainlayer before capping.' },
        { title: 'Drainlayer inspection + hydrostatic test', body: 'Licensed drainlayer arranges a council or private-certifier inspection — hydrostatic or air-tested per AS/NZS 3500.2 + the drainlayer\'s method. Signed off + photographed BEFORE hardfill goes over.', watchFor: 'Pouring over unsigned drainage is a stop-work. Inspection is mandatory. Book it into the programme.' },
        { title: 'Backfill + mark on plan', body: 'Backfill sand or clean fine hardfill, compact in layers. Lay marker tape above pipe (colour + depth per drainlayer / state spec). Photograph the layout + save with the job.', watchFor: 'A slab poured over drainage with no as-built photos = every future service change is a guess. Take the photos.' },
      ],
    },
  },
  {
    id: 'run-mains-electrical-conduit',
    category: 'services',
    phase: 'underground',
    label: 'Run mains conduit under the slab',
    summary: 'Licensed electrician only. Main switchboard feed + comms conduits stubbed up before pour.',
    nz: {
      tools: ['Long-handled shovel', 'Spade', 'Hacksaw or PVC pipe cutter', 'Draw wire / fish tape', 'Sledge hammer', 'Tape', 'Marker pen'],
      materials: ['Orange conduit for mains supply (size per electrician / lines company)', 'White / grey conduit for comms', 'Sweep bends (not tight elbows — cable pulls easier)', 'Solvent cement', 'Draw wire (3 mm nylon)', 'Marker tape: orange for electrical', 'Cap for stubs sticking out of slab'],
      steps: [
        { title: 'Licensed electrician only — coordinate route + connection', body: 'Mains + all electrical work is restricted to registered electricians under the Electricity Act. As the builder, your job is coordination: the electrician confirms mains route from the network connection point (pit, pole, or ICP) to the meter board + main switchboard position, and the lines company confirms which side of the boundary they connect. Note any spare / comms conduits.', watchFor: 'DIY electrical work is illegal + voids insurance. Running mains without checking the connection point = digging up a driveway 6 months later. Get the network confirmation drawing.' },
        { title: 'Trench mains route', body: 'Sweep the trench from connection point into the building at the depth spec\'d by the electrician / lines company (per AS/NZS 3000). Straight runs beat tight bends.', watchFor: 'Depth too shallow = future digging strike. Under-depth = electrician re-does the trench.' },
        { title: 'Lay conduit with sweep bends only', body: 'Orange conduit through the trench, up through the slab in the meter / MSB position. Use sweep bends (long-radius), never tight 90s — cable pulls MUCH easier and doesn\'t nick the insulation.', watchFor: 'A tight 90 in the mains conduit = electrician has to hand-feed 25 mm² cable through it, or replace the conduit. Sweep bends every time.' },
        { title: 'Pull a draw wire through every conduit', body: 'Nylon draw wire through each conduit BEFORE it\'s buried. Cable pulls are much easier with a wire already in place; add a 500 mm loop coiled at each end.', watchFor: 'No draw wire = electrician on their hands and knees fish-taping through a buried conduit later. 30 seconds now.' },
        { title: 'Stub up in the correct room + cap', body: 'Conduit rises through the slab at the marked MSB position. Cap the stub 50–100 mm above finished slab level with a plumber\'s cap so it doesn\'t fill with concrete slurry during the pour.', watchFor: 'Un-capped conduit fills with cement + is unusable. Cap every stub before the concrete truck arrives.' },
        { title: 'Mark position + backfill', body: 'Fluoro mark the stub position on adjacent formwork or slab boxing. Backfill trench with sand, lay orange marker tape 300 mm above conduit, backfill the rest with dig spoil.', watchFor: 'Un-marked stubs get lost in slab clean-up. The mark tells the electrician + concreter where to be careful.' },
      ],
    },
    au: {
      tools: ['Long-handled shovel', 'Spade', 'Hacksaw or PVC pipe cutter', 'Draw wire / fish tape', 'Sledge hammer', 'Tape', 'Marker pen'],
      materials: ['Orange conduit for mains supply (size per electrician / DNSP)', 'White / grey conduit for comms', 'Sweep bends (not tight elbows)', 'Solvent cement', 'Draw wire (3 mm nylon)', 'Marker tape: orange for electrical', 'Cap for stubs sticking out of slab'],
      steps: [
        { title: 'Licensed electrician only — coordinate route + connection', body: 'Mains + all electrical work is restricted to licensed electricians under state Electricity Safety regs. As the builder, coordinate: electrician confirms mains route from connection point (pit or pole) to the meter + main switchboard position; DNSP confirms boundary connection. Note comms conduits (NBN, Foxtel, etc).', watchFor: 'DIY electrical work is illegal + voids insurance. Running mains without checking the connection point = digging up a driveway 6 months later. Get the DNSP confirmation drawing.' },
        { title: 'Trench mains route', body: 'Sweep the trench from connection to the building at the depth spec\'d by the electrician / DNSP (per AS/NZS 3000). Straight runs beat tight bends.', watchFor: 'Under-depth = future dig-strike or the electrician re-doing the trench.' },
        { title: 'Lay conduit with sweep bends only', body: 'Orange conduit through trench, up through slab at meter / MSB position. Use sweep bends (long-radius), never tight 90s — cable pulls much easier + doesn\'t nick insulation.', watchFor: 'Tight 90 in mains conduit = electrician hand-feeds 25 mm² cable or replaces the conduit. Sweep bends every time.' },
        { title: 'Pull a draw wire through every conduit', body: 'Nylon draw wire through each conduit BEFORE burial. Cable pulls are much easier with wire in place; leave a 500 mm loop coiled each end.', watchFor: 'No draw wire = electrician fish-taping through a buried conduit later. 30 seconds now.' },
        { title: 'Stub up in the correct room + cap', body: 'Conduit rises through slab at the MSB position. Cap stub 50–100 mm above finished slab with a plumber\'s cap so it doesn\'t fill with slurry during pour.', watchFor: 'Un-capped conduit fills with cement + is unusable. Cap every stub before the truck arrives.' },
        { title: 'Mark position + backfill', body: 'Fluoro mark the stub position on adjacent formwork. Backfill trench with sand, orange marker tape 300 mm above conduit, backfill the rest with dig spoil.', watchFor: 'Un-marked stubs get lost in slab clean-up. The mark tells the electrician + concreter where to be careful.' },
      ],
    },
  },
  {
    id: 'connect-water-supply',
    category: 'services',
    phase: 'underground',
    label: 'Connect water supply from the water meter',
    summary: 'Licensed plumber only. Main to the slab entry point, pressure test, thermal + UV cover on any exposed pipe.',
    nz: {
      tools: ['Long-handled shovel', 'Spade', 'Pipe cutter', 'Adjustable spanner', 'PTFE tape', 'Pressure test gauge (0–1.5 MPa)'],
      materials: ['Blue MDPE 25 mm water main (or 32 mm for larger houses)', 'Compression fittings (Philmac or Plasson)', 'Backflow preventer at boundary (if council requires)', 'Isolation valve at building entry', 'Sand for bedding', 'Blue marker tape', 'Thermal + UV cover for any above-ground section (foam sleeve + PVC wrap)'],
      steps: [
        { title: 'Licensed plumber only — confirm scope + connection', body: 'Water supply connection is restricted work under the Plumbers, Gasfitters, and Drainlayers Act — a licensed plumber must do it. As the builder, coordinate: confirm the water meter is installed at the boundary + turned on, and the plumber has arranged the connection permit + backflow requirement with council.', watchFor: 'DIY plumbing on the water main is illegal + won\'t pass inspection. Backflow prevention (where required) is not optional.' },
        { title: 'Trench from meter to slab entry', body: 'Trench from the water meter to the building entry point at the depth spec\'d by the plumber (deeper in frost-prone areas). Lay sand bedding. Straight run beats zig-zag — reduces friction losses at the tap.', watchFor: 'Shallow water pipe freezes in cold snaps. Confirm depth spec with the plumber before backfilling.' },
        { title: 'Lay + compression-fit MDPE', body: 'Blue MDPE 25 mm the full run, no joins in the trench if possible (one continuous roll). At each end, compression fitting to the meter + to a copper riser at the slab entry.', watchFor: 'Joins buried in the trench = a leak nobody finds for months + a flooded slab. Continuous run, joins only at above-ground ends.' },
        { title: 'Install isolation valve at building entry', body: 'Ball valve or gate valve at the point where the main enters the building (or slab), accessible from ground level. Isolates the house from the mains for future work.', watchFor: 'No isolation valve = whole-street shutdown for any tap repair. Fit the valve, label it clearly.' },
        { title: 'Pressure-test the run', body: 'Plumber caps the house end, pressurises to their test pressure with a test gauge, and holds for the required time (per AS/NZS 3500.1 + council spec). Zero pressure drop = pass. Any drop = find the leak before backfilling.', watchFor: 'Skipping the pressure test = a leak in a buried pipe you find after concrete goes over. Test EVERY join before backfill.' },
        { title: 'Backfill + insulate any exposed section', body: 'Backfill sand around pipe, blue marker tape 300 mm above, backfill dig spoil the rest. Any section that comes above ground (before entering the wall) gets foam insulation + a PVC wrap for UV + frost.', watchFor: 'Un-insulated exposed pipe splits in the first hard frost. Foam + PVC wrap is a 10-min job that prevents a burst pipe.' },
      ],
    },
    au: {
      tools: ['Long-handled shovel', 'Spade', 'Pipe cutter', 'Adjustable spanner', 'PTFE tape', 'Pressure test gauge (0–1.5 MPa)'],
      materials: ['Blue MDPE 25 mm water main (or 32 mm for larger houses)', 'Compression fittings (Philmac or Plasson)', 'Backflow preventer at boundary per water authority', 'Isolation valve at building entry', 'Sand for bedding', 'Blue marker tape', 'Thermal + UV cover for any above-ground section'],
      steps: [
        { title: 'Licensed plumber only — confirm scope + connection', body: 'Water supply connection is licensed work under state plumbing regs — a licensed plumber must do it. As the builder, coordinate: water meter installed at boundary + turned on, plumber has arranged the connection permit with the water authority (Sydney Water, Yarra Valley Water, SA Water, etc.) + backflow prevention per AS/NZS 3500.1.', watchFor: 'DIY plumbing on the water main is illegal + won\'t pass inspection. Backflow prevention is not optional.' },
        { title: 'Trench from meter to slab entry', body: 'Trench from meter to building entry at the depth spec\'d by the plumber (state water-authority requirements vary). Sand bedding. Straight run beats zig-zag — reduces friction loss at the tap.', watchFor: 'Confirm depth spec with the plumber; state / water-authority requirements differ.' },
        { title: 'Lay + compression-fit MDPE', body: 'Blue MDPE 25 mm the full run, ideally no joins in trench (one continuous roll). Compression fittings each end — meter + copper riser at slab entry.', watchFor: 'Joins buried in trench = undetected leak + flooded slab. Continuous run, joins only above-ground.' },
        { title: 'Install isolation valve at building entry', body: 'Ball or gate valve at the entry point, accessible from ground level. Isolates house from meter for future work.', watchFor: 'No isolation valve = whole-property shutdown for any tap repair. Fit + label clearly.' },
        { title: 'Pressure-test the run', body: 'Plumber caps the house end, pressurises to their test pressure, and holds for the required time (per AS/NZS 3500.1 + water-authority spec). Zero drop = pass. Any drop = find leak before backfill.', watchFor: 'Skipping pressure test = leak in buried pipe found after slab goes over. Test EVERY join.' },
        { title: 'Backfill + insulate any exposed section', body: 'Sand around pipe, blue marker tape 300 mm above, dig spoil the rest. Any above-ground section gets foam + UV-rated PVC wrap.', watchFor: 'Un-insulated exposed pipe splits in the first hard frost or degrades in UV within a season. 10-min job.' },
      ],
    },
  },

  // ─── Concrete & foundations ──────────────────────────────────────────────
  {
    id: 'excavate-strip-footing',
    category: 'concrete-foundations',
    phase: 'foundations',
    label: 'Excavate for a strip footing',
    summary: 'Trench line, depth to good ground, base level.',
    nz: {
      tools: ['30 m tape', 'Laser or dumpy level + staff', 'Spirit level', 'Long-handled shovel', 'Square-mouth spade', 'Wheelbarrow', 'Sledge hammer', 'Marker pen'],
      materials: ['Fluoro spray or lime line', 'Marker pegs (40×40×450)', 'Timber scraps for founding tests (if hand-digging)'],
      steps: [
        { title: 'Read footing size + depth off the plan', body: 'Get the trench width, depth, and any step-downs from the engineer\'s foundation plan. Standard NZS 3604 5 footings are 300×200 for a single-storey light-frame, deeper for two-storey or bad ground.', watchFor: 'A specific engineer\'s footing overrides NZS 3604 defaults. If the plan says 400 deep, that\'s 400 — don\'t assume 200 will do.' },
        { title: 'Mark the trench line on ground', body: 'From the profile board strings, transfer the outside face of the footing to the ground with fluoro spray. Add a second line for the inside face (footing width offset). Fluoro both lines the full run.', watchFor: 'Spray a line that\'s slightly wider than the footing (~50 mm each side) so the digger operator has room to work without dropping the bucket exactly on the mark.' },
        { title: 'Excavate to depth', body: 'Mini-digger for anything over ~5 m of trench; shovel + spade by hand for smaller work. Dig in one pass — trying to "level up later" from a rough dig wastes time.', watchFor: 'Call before you dig. Underground services (water, sewer, electrical, comms) are not always where the plan says.' },
        { title: 'Level the base', body: 'Set the laser on the datum and shoot the bottom of the trench at each end and every 2–3 m along. Trim high spots with a spade; fill any low spots with compacted crushed hardfill, not loose soil.', watchFor: 'A soft or uneven base under a footing = differential settlement = cracks in the wall above. Don\'t skip this step.' },
        { title: 'Check for good ground', body: 'The trench base must be firm, competent material — not topsoil, fill, or soft / wet ground. Soft or spongy ground is not bearing — dig deeper until you hit competent material. On uncertain sites (fill, wet clay, peat), get the engineer or geotech to inspect before you pour.', watchFor: 'NZ has a lot of surface fill from old sites and reclamation. If the base feels spongy or you find debris, stop and get someone to look at it.' },
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
        { title: 'Check for competent founding + termite prep', body: 'The trench base must be firm, competent material — not topsoil, fill, or soft / wet ground. Soft ground means dig deeper to competent material, or get the engineer to confirm the founding. In termite-management zones, the engineer\'s design may require the trench base to allow a Type A physical barrier or chemical treatment — coordinate with the barrier installer before pouring.', watchFor: 'On Class E / P sites, engineer\'s inspection of the trench base is mandatory before pour. Book it before you\'re ready to pour, not on the day.' },
        { title: 'Clean out the trench', body: 'Shovel out collapsed material, crumbs, or pooled water. The trench must be clean and dry at pour time.', watchFor: 'Water in the base dilutes the concrete and weakens the footing. Pump out or postpone if it\'s wet.' },
      ],
    },
  },
  {
    id: 'formwork-slab',
    category: 'concrete-foundations',
    phase: 'foundations',
    label: 'Build formwork for a slab',
    summary: 'Boxing, stakes, bracing, set to FFL.',
    nz: {
      tools: ['Drop saw or handsaw', 'Cordless drill / impact driver', 'Sledge hammer', 'Hammer', 'Laser or dumpy + staff', 'Spirit level (1.8 m+)', 'String line', 'Tape', 'Combination square'],
      materials: ['Boxing timber: 200×50 or 300×50 H3.2 pine (perimeter)', 'Stakes: 50×50 H4 pointed pine, 600 long, one every 600–900 mm', '75 mm bugle screws (formwork to stakes)', '90 mm framing nails or duplex nails (bracing)', 'Timber off-cuts for bracing', 'Formwork release oil (Sika Formshield or similar) — do NOT use diesel or engine oil'],
      steps: [
        { title: 'Snap the slab perimeter onto the sub-base', body: 'From the profile board strings, transfer the outside face of the slab to the ground. Mark corners with pegs, run a string between them to guide the boxing.', watchFor: 'The boxing sits AT the outside face — don\'t position it beyond the string, or you\'ll pour a bigger slab than the plans call for.' },
        { title: 'Cut boxing to the slab dimensions', body: 'Cut 200×50 (for 150 slab + edge thickening) or 300×50 (for deeper edge beams) to the wall lengths. Butt-join corners — overlap one board past the return and drive a stake tight against the join so the cream can\'t force it open.', watchFor: 'Boxing height = slab thickness + any turn-up above final ground level. Getting it wrong here means the slab pours to the wrong FFL.' },
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
        { title: 'Cut boxing to the slab dimensions', body: 'Cut 200×50 (150 slab + edge thickening) or 300×50 (deeper edge beams) to the wall lengths. Butt-join corners — overlap one board past the return and drive a stake tight against the join so the cream can\'t force it open.', watchFor: 'Boxing height = slab thickness + turn-up above ground level. Wrong here = wrong FFL, wrong everything above.' },
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
    phase: 'foundations',
    label: 'Lay a DPM under a slab',
    summary: 'Sand blinding, roll, lap + tape, seal penetrations.',
    nz: {
      tools: ['Utility knife', 'Broom', 'Rake', 'Tape', 'Marker pen'],
      materials: ['DPM: 250 μm polythene sheet (per NZS 3604 / NZBC E2)', 'Sand: 25–50 mm blinding layer over compacted hardfill', 'DPM joining tape (wide, self-adhesive)', 'Sealant for penetrations (butyl or proprietary)'],
      steps: [
        { title: 'Compact + level the sub-base', body: 'Sub-base should already be crushed hardfill (GAP 40 or similar), compacted with a plate compactor or roller. Rake it level and remove any sharp rocks that would puncture the DPM.', watchFor: 'A single sharp stone can rip a DPM sheet and let ground moisture through into the slab. Rake carefully.' },
        { title: 'Spread a sand blinding layer', body: '25–50 mm of clean sand raked flat over the compacted hardfill. Purpose is to protect the DPM from puncture and give an even surface for the polythene to sit on.', watchFor: 'On tight sites, some builders skip the sand and lay DPM straight on hardfill. NZS 3604 7 requires a smooth base — if the hardfill is fine and even, you can, but a sand blinding is cheap insurance.' },
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
    phase: 'foundations',
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
        { title: 'Check cover before pour', body: 'Cover to top of slab = distance from top of mesh to finished slab surface. The required cover depends on the exposure classification, so check the engineer\'s spec — but 50 mm from the slab edge to the nearest steel is a typical figure. Walk the slab, measure at multiple points, adjust chairs if wrong.', watchFor: 'Steel too close to surface = spalling and rust when the slab weathers. Steel too deep = no structural benefit. Cover check pre-pour is engineer-required on any inspected job.' },
        { title: 'Get pre-pour sign-off', body: 'Before the truck arrives, get the engineer or council inspector to look at the steel + formwork if that\'s a condition of the consent. Some councils require it, some don\'t — check the consent conditions.', watchFor: 'Pouring without a required inspection is grounds for a NOT — Notice to Fix. Cheaper to wait a day than tear out.' },
      ],
    },
    au: {
      tools: ['Bolt cutters (mesh)', 'Rebar cutter or angle grinder (bars)', 'Bar-tying pliers', 'Tape', 'Marker pen', 'Cover meter (if available)'],
      materials: ['Mesh: SL62 / SL72 / SL82 (per engineer\'s schedule + AS 2870 site class)', 'Bar chairs: 40–50 mm plastic or wire, ~1 m spacing', 'Tie wire (annealed, black)', 'Starter bars (N12 or N16 typically) per plan', 'Cover blocks for edge steel'],
      steps: [
        { title: 'Read the engineer\'s steel schedule', body: 'Get mesh grade, chair height, lap length, edge-beam reinforcement, starter bars. Slab reinforcement follows the engineer\'s design per AS 2870 for the site class — Class M gets standard; Class H1/H2/E gets more.', watchFor: 'Substituting mesh (e.g. SL62 for spec\'d SL72) is a common shortcut that changes the crack-control performance. Engineer\'s spec is not a suggestion.' },
        { title: 'Position bar chairs', body: 'Lay chairs on the DPM at approx 1 m centres, tighter under expected load points. Chair height = cover to top required minus mesh diameter — typically 40 mm top + 40 mm bottom on a 100–150 slab.', watchFor: 'Chairs with narrow bases punch through the DPM. Use wide-base chairs or sit them on DPM off-cuts as protectors.' },
        { title: 'Lay mesh sheets over chairs', body: 'Position first sheet aligned with slab edge, 50 mm cover from boxing to steel (use edge cover blocks). Subsequent sheets lap by at least one full mesh square per AS 3600.', watchFor: 'Undersized lap is a common defect — inspector will make you cut and re-lay. Do it right first time.' },
        { title: 'Tie laps with wire', body: 'At every lap, tie wire around crossing bars — one tie every 300 mm along the lap length. Bar-tying pliers make it quick.', watchFor: 'Untied laps shift during pour when the pump kicks the mesh around. Tie them all.' },
        { title: 'Place edge beam + starter bars', body: 'Cut N12 or N16 deformed bars for edge-beam reinforcement (usually 2 top, 2 bottom in the thickened edge). Position and tie. Set starter bars for walls / columns above, projecting the required length.', watchFor: 'Starter bar positions must land inside the wall / column thickness above. Measure carefully off the framing plan.' },
        { title: 'Check cover before pour', body: 'Cover to top = distance from top of mesh to finished slab surface. Cover depends on the exposure classification, so check the engineer\'s spec — but 50 mm from the slab edge to the nearest steel is typical. Walk the slab, measure, adjust chairs.', watchFor: 'Insufficient cover = spalling and rebar corrosion long-term. Excess cover = no structural benefit. Cover check pre-pour is standard on any inspected job.' },
        { title: 'Get pre-pour sign-off', body: 'Before the truck arrives, get the engineer or building surveyor to look at the steel + formwork + termite provisions if that\'s a permit condition. Certifier\'s inspection is common at this stage.', watchFor: 'Pouring without a mandatory inspection is grounds for a rectification notice. Cheaper to wait a day than tear out a slab.' },
      ],
    },
  },
  {
    id: 'pour-screed-slab',
    category: 'concrete-foundations',
    phase: 'foundations',
    label: 'Pour and screed a slab',
    summary: 'Order, discharge, vibrate, screed, float, cure.',
    nz: {
      tools: ['Wheelbarrows', 'Concrete rake / lute', 'Aluminium screed (magnesium bull screed for larger slabs)', 'Bull float + handle', 'Concrete vibrator (poker)', 'Steel trowel or power float', 'Edging tool', 'PPE: gumboots, gloves, safety glasses'],
      materials: ['Concrete: 20 MPa (NZS 3604 standard house slab) or 25 MPa (engineered) per plan, 80–100 slump for hand-placed slabs', 'Curing compound (sprayed) or polythene for wet-covering', 'Bond breaker for control joints (if cutting)'],
      steps: [
        { title: 'Order concrete correctly', body: 'Feed the slab dimensions + thickness into the Setout Concrete calculator to get the volume with waste factored in. Grade per plan — 20 MPa for a standard NZS 3604 house slab, 25+ MPa for engineered. Slump per placement (80 for pump, 100 for wheelbarrow). Book the truck 24 hrs ahead, confirm pump arrangement.', watchFor: 'Under-order by 5% and you\'re short at the end; over-order by 20% and you\'re paying for waste. 10% buffer is the sweet spot.' },
        { title: 'Prep the site pre-truck', body: 'Set screed rails at FFL height across the slab (top of the boxing acts as the perimeter rail; drive intermediate stakes with a short pipe on top set to FFL for the middle). Hose, tools, PPE, wheelbarrows, bull float all ready before the truck arrives.', watchFor: 'A truck sitting on site waiting for you to set up is charging waiting time. Have everything ready before you ring "on your way".' },
        { title: 'Truck arrives — check the docket', body: 'Docket shows batch time, MPa, slump, additives. Confirm it matches the order. Do a slump test if you\'re not sure — sort anything way out before discharge.', watchFor: 'Concrete life is 90 min from batch. Check the batch time on the docket — if it\'s pushing that limit, check the concrete before you start placing.' },
        { title: 'Discharge + rake to depth', body: 'Discharge into formwork in strips, working from one end. Rake / lute the concrete to roughly FFL. Vibrate with a poker every 300–500 mm — especially at edges, corners, around pipes, and along edge-beam thickenings.', watchFor: 'Over-vibration segregates the mix (aggregate sinks, cream floats). Poker in and out in one motion, not left in one spot for 30 seconds.' },
        { title: 'Screed to level', body: 'One person, aluminium screed rested on the perimeter boxing and internal height pegs or laser. Draw the screed back in a sawing motion as you step down the slab. Fill low spots ahead of the screed as you go.', watchFor: 'Keep the screed in contact with both references the whole way across — the moment you lift it, you leave concrete high and it shows in the finish. Feed enough mix ahead so it always has a bow wave to cut through.' },
        { title: 'Bull float once bleed water is gone', body: 'After screeding, wait for surface bleed water to disappear (10–30 min depending on temp). Then run the bull float across the slab — flatten ridges, close pores, get a uniform surface. One pass, don\'t over-work.', watchFor: 'Bull-floating while bleed water is still there traps water under the surface and causes surface delamination. Wait until the sheen has gone matte.' },
        { title: 'Steel trowel or power float finish', body: 'Once the slab has stiffened enough that you can stand on it and leave only a 3–5 mm footprint (usually 2–4 hrs from pour), start trowelling. Two passes: first for smoothing, second for a tight burnished finish.', watchFor: 'Trowelling too early opens up the surface; too late and the trowel just skips over hard concrete. Feel for the right window — the surface should be firm but responsive.' },
        { title: 'Apply curing compound + protect', body: 'Once trowelled, spray a curing compound over the whole slab (or cover with wet hessian / polythene for 3–5 days for residential; longer in dry or hot weather). Prevents rapid moisture loss which causes surface crazing.', watchFor: 'Rain on fresh concrete washes the cream off the surface = weak dusty finish. Cover with poly if rain is forecast within 6 hours.' },
      ],
    },
    au: {
      tools: ['Wheelbarrows', 'Concrete rake / lute', 'Aluminium screed (magnesium bull screed for larger slabs)', 'Bull float + handle', 'Concrete vibrator (poker)', 'Steel trowel or power float', 'Edging tool', 'PPE: gumboots, gloves, safety glasses'],
      materials: ['Concrete: N25 or N32 (per engineer + AS 2870 site class), 80–100 slump for hand-placed', 'Curing compound or polythene for wet-covering', 'Bond breaker for control joints'],
      steps: [
        { title: 'Order concrete correctly', body: 'Feed the slab dimensions + thickness into the Setout Concrete calculator to get the volume with waste factored in. Grade per engineer (N25 typical residential; N32 for high-exposure or reactive sites). Slump per placement (80 pump, 100 wheelbarrow). Book truck 24 hrs ahead, confirm pump.', watchFor: 'Under-order 5% = short at the end; over 20% = paying for waste. 10% buffer is standard.' },
        { title: 'Prep the site pre-truck', body: 'Set screed rails at FFL (top of boxing = perimeter rail; intermediate stakes with pipe on top set to FFL for the middle). Hose, tools, PPE, wheelbarrows, bull float ready before truck arrives.', watchFor: 'A truck waiting on site is charging waiting time. Have everything ready before you ring "on your way".' },
        { title: 'Truck arrives — check the docket', body: 'Docket shows batch time, MPa, slump, additives. Confirm against order. Do a slump test if you\'re not sure — sort anything way out before discharge.', watchFor: 'Concrete life is 90 min from batch under AS 1379. Check batch time on the docket — if it\'s pushing that limit, check the concrete before you start placing.' },
        { title: 'Discharge + rake to depth', body: 'Discharge into formwork in strips from one end. Rake to roughly FFL. Vibrate with poker every 300–500 mm, especially at edges, corners, around pipes and edge-beam thickenings.', watchFor: 'Over-vibration segregates the mix. Poker in and out in one motion, not held in one spot.' },
        { title: 'Screed to level', body: 'One person, aluminium screed rested on perimeter boxing and internal height pegs or laser. Draw the screed back in a sawing motion as you step down the slab. Fill low spots ahead as you go.', watchFor: 'Keep the screed in contact with both references the whole way across — the moment you lift it, you leave concrete high and it shows in the finish. Feed enough mix ahead so it always has a bow wave to cut through.' },
        { title: 'Bull float once bleed water is gone', body: 'After screeding, wait for bleed water to disappear (10–30 min depending on temp). Then bull-float — one pass, flatten ridges, close pores. Don\'t over-work.', watchFor: 'Floating while bleed water is present traps water and causes surface delamination. Wait for the sheen to go matte.' },
        { title: 'Steel trowel or power float finish', body: 'Once you can stand on the slab with only a 3–5 mm footprint (2–4 hrs from pour), start trowelling. Two passes: smoothing then burnishing.', watchFor: 'Too early = open surface. Too late = trowel skips. Feel for the window — firm but responsive.' },
        { title: 'Apply curing compound + protect', body: 'Spray curing compound over the finished surface, or cover with wet hessian / poly for 3–5 days for residential (longer in hot / dry weather). Prevents rapid moisture loss + surface crazing. In hot conditions (>28 °C) start covering immediately after finishing.', watchFor: 'Rain on fresh concrete washes cream off = weak dusty finish. Cover with poly if rain forecast within 6 hours.' },
      ],
    },
  },
  {
    id: 'install-bored-pile',
    category: 'concrete-foundations',
    phase: 'foundations',
    label: 'Install a bored-pier / concrete pile foundation',
    summary: 'Auger, cage, formwork tube, pour, anchor bolts.',
    nz: {
      tools: ['Hand auger or hydraulic post-hole borer', 'Sledge + claw hammer', 'Shovel', 'Spirit level', 'Laser or dumpy + staff', 'Wheelbarrow', 'Concrete vibrator (poker) or rod', 'Trowel'],
      materials: ['Reinforcing cage or bars (per engineer)', 'Sonotube / cardboard formwork (if above ground)', 'Concrete: 20 or 25 MPa (per engineer)', 'Bolts / bracket embedment per engineer', 'Timber for temporary bracing of tubes'],
      steps: [
        { title: 'Set out pile positions', body: 'Off profile boards, drop marker pegs at every pile position (see the set-out-for-piles job). Confirm depth requirements from the engineer\'s foundation plan and NZS 3604 5 if you\'re using standard details.', watchFor: 'Standard NZS 3604 piles have a defined pile spacing + hole diameter. If your plan calls for anything non-standard (deeper, wider, cage-reinforced), it\'s an engineer-designed pile and the spec is not negotiable.' },
        { title: 'Auger each hole to design depth', body: 'Hydraulic post-hole borer for anything over 8–10 holes; hand auger for smaller jobs. Bore straight down, plumbing the borer at each hole. Keep spoil clear of the working area.', watchFor: 'On sloping ground, augering perpendicular to the slope gives you a slanted hole. Always plumb the borer vertically, not to the slope.' },
        { title: 'Inspect founding + confirm depth', body: 'When you hit design depth, prod the base with a rod. If it\'s solid, good. If soft, keep going until you hit competent ground. On engineer-designed piles, the engineer inspects; on NZS 3604 piles, you sign off.', watchFor: 'NZ soils vary hugely. If you\'ve got a bore-log from a geotech report, cross-reference — if your hole is way shallower or deeper than the log expected, flag it.' },
        { title: 'Lower reinforcing cage or bars (if required)', body: 'For engineer-designed piles, lower the pre-fabricated cage down the hole. Use bar chairs or hangers to keep the cage centred in the hole and off the base by 50 mm. Confirm projection above the hole for tying into the foundation above.', watchFor: 'A cage sitting on the base has no cover to the bottom — steel corrodes and the pile fails. Always centre with chairs or hangers.' },
        { title: 'Position formwork tube (if above ground)', body: 'For piles that project above ground level (deck piles, subfloor piles), slide a cardboard sonotube down over the hole, plumb it, brace to nearby pegs. Tube outside diameter should match hole diameter or slightly wider.', watchFor: 'Poorly-braced sonotubes tilt during pour. Brace to at least two adjacent stakes each direction, and check plumb once the concrete starts going in.' },
        { title: 'Pour concrete + vibrate', body: 'Feed pile diameter + depth × pile count into the Setout Concrete calculator for total volume. Wheelbarrow or chute concrete into each hole. Fill in one pass, don\'t stop halfway (creates a cold joint = weak pile). Vibrate with a poker or push a rebar / rod up-and-down to compact and remove air.', watchFor: 'Free-falling concrete more than 2 m segregates. On deep piles, use a tremie tube or lower the barrow chute into the hole.' },
        { title: 'Set anchor bolts / brackets before it sets', body: 'For subfloor piles carrying a bearer, push a hot-dipped galv anchor bolt / holding-down bolt down into the wet concrete to the depth spec\'d by the engineer / manufacturer. For adjustable pile-cap brackets, embed the bracket base while wet.', watchFor: 'Setting the bolt after the concrete has stiffened creates a loose bolt that won\'t hold pull-out load. Do it within 30 min of pour, before initial set.' },
        { title: 'Screed the top + cure', body: 'Once anchor bolts are in and concrete is at pile-top level, trowel the top smooth. Wet-cover or apply curing compound. Check the engineer\'s spec or the mix ticket for when it can carry load — depends on the MPa, weather, and design load.', watchFor: 'Piles poured in direct sun without cure will crack. Even a bit of shade cloth over the pile tops is better than nothing.' },
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
        { title: 'Pour concrete + vibrate', body: 'Feed pier diameter + depth × pier count into the Setout Concrete calculator for total volume. Wheelbarrow or chute into each hole. Fill in one pass — no stopping halfway (cold joint = weak pier). Vibrate with poker or push rod up-and-down.', watchFor: 'Free-falling concrete over 2 m segregates. On deep piers, use a tremie or lower the barrow chute into the hole.' },
        { title: 'Set anchor bolts / brackets while wet', body: 'For subfloor piers carrying bearers, push a hot-dipped galv anchor bolt into wet concrete to spec\'d depth. For adjustable pile-cap brackets, embed the base while wet.', watchFor: 'Bolts set after initial set won\'t hold pull-out load. Within 30 min of pour.' },
        { title: 'Screed top + cure', body: 'Trowel pier top smooth once bolts are in. Curing compound or wet-cover. Check the engineer\'s spec or mix ticket for when it can carry load — depends on the MPa, weather, and design load. In hot climates (>30 °C) protect from direct sun for the first 4 hrs.', watchFor: 'Piers in direct summer sun without cure will crack. Shade cloth over pier tops for the first day is worth it.' },
      ],
    },
  },

  // ─── Framing & structure ─────────────────────────────────────────────────
  {
    id: 'lay-subfloor',
    category: 'framing',
    phase: 'sub-floor',
    label: 'Lay a sub-floor (bearers → joists → floor sheet)',
    summary: 'Bearers on piles, joists across, T&G sheet screwed down.',
    nz: {
      tools: ['30 m + 8 m tape', 'Laser or dumpy + staff', 'Spirit level (1.8 m+)', 'String line', 'Drop saw or circular saw', 'Hammer or nail gun', 'Cordless drill / impact driver', 'Chalk line', 'Framing square'],
      materials: ['Bearers: 100×75 or 125×100 SG8 H4 (per NZS 3604 6 span tables)', 'Joists: 140×45 or 190×45 SG8 H1.2 (per NZS 3604 7 span tables)', 'Joist hangers where joists lap or land on internal walls', '90×3.15 flat-head bright framing nails, 100 mm bugle screws to piles', 'Flooring: 20 mm T&G structural particleboard (or 17–19 mm structural ply)', 'Flooring adhesive (PU) + 50 mm particleboard screws'],
      steps: [
        { title: 'Confirm sizes + spacing from the plan', body: 'NZS 3604 6/7 span tables give bearer + joist sizes for standard light-timber-framed floors. Typical is 140×45 joists at 450 c/c across 100×75 bearers at 1400 c/c (400 c/c for tiles / heavy loads). Engineered joists (I-joists, LVL) override the standard tables — follow the plans.', watchFor: 'Standard tables only apply within their limits. Longer spans, heavier loads, or engineered joists = follow the specific design, not the default.' },
        { title: 'Position + level bearers on the piles', body: 'Work pile cut height down from FFL: FFL − floor sheet − joist − bearer = pile top. Cut piles to that level with the laser off datum. Bearer sits directly on top (brackets only if the plan calls for them). Skew-nail bearer to pile per NZS 3604 5. Hardwood packers if a pile ends up low.', watchFor: 'Bearers that aren\'t dead level throw off every joist above them. Sight along after fixing; anything > 3 mm out gets re-shot.' },
        { title: 'Set out joist positions on the bearers', body: 'From one end, set out off the plan and keep every centre consistent across the run.', watchFor: 'Joist positions must match the plan — the plan sets the c/c and the location of every joist for a reason.' },
        { title: 'Lay joists across bearers', body: 'Place joists across bearers, single-span end-to-end or lap-joined over a bearer — both ends bearing on the bearer top. Rotate bowed joists BOW UP so the bow cancels the deflection under load.', watchFor: 'A joist laid bow-down will sit bow-down forever, giving a permanent dip in the floor above it.' },
        { title: 'Fix joists to bearer', body: 'Skew-nail with 2× 90 mm nails per bearing point, or use joist hangers where the joist doesn\'t sit directly on the bearer top. Hangers get 35×3.15 joist-hanger nails, not framing nails.', watchFor: 'Substituting framing nails in a joist hanger fails the connection — the hanger nail is specifically shorter and thicker to develop the rated capacity.' },
        { title: 'Block between joists at midspan', body: 'Solid blocking (dwang, same section as the joist) between joists at midspan for any joist over 2.4 m. Skew-nail from both sides.', watchFor: 'Blocking stops joists twisting under load. Skipping it lets the floor bounce even with correctly-sized joists.' },
        { title: 'Lay flooring T&G with glue + screws', body: 'Bead PU adhesive along each joist top before laying the sheet. Push T&G joins tight with a block + sledgehammer against the outside edge. Fix to the manufacturer\'s requirements and stagger sheets.', watchFor: 'Leave a 3 mm expansion gap at the perimeter — flooring swells once the roof goes on and the moisture level rises.' },
      ],
    },
    au: {
      tools: ['30 m + 8 m tape', 'Laser or dumpy + staff', 'Spirit level (1.8 m+)', 'String line', 'Drop saw or circular saw', 'Hammer or nail gun', 'Cordless drill / impact driver', 'Chalk line', 'Framing square'],
      materials: ['Bearers: 100×75 or 125×75 F17 hardwood or MGP12 pine (per AS 1684.2 span tables) — H2-blue in termite zones', 'Joists: 140×45 or 190×45 MGP10/MGP12 pine (per AS 1684.2)', 'Joist hangers or triple-grip connectors', '90×3.15 flat-head bright framing nails, 100 mm Type 17 screws to piers', 'Flooring: 19 mm yellow-tongue T&G structural particleboard', 'Flooring adhesive (PU) + 50 mm particleboard screws'],
      steps: [
        { title: 'Confirm sizes + spacing from the plan', body: 'AS 1684.2 span tables give bearer + joist sizes for standard timber-framed floors. Typical is 140×45 joists at 450 c/c across F17 bearers at 1800 c/c. Engineered joists (LVL, I-joist) override — follow the plans.', watchFor: 'Timber grade matters. MGP10 and MGP12 have different span capacities; using MGP10 where MGP12 was spec\'d under-sizes the floor.' },
        { title: 'Position + level bearers on the piers', body: 'Work pier cut height down from FFL: FFL − floor sheet − joist − bearer = pier top. Cut piers to that level with the laser off datum. Bearer sits directly on top (brackets only if the plan calls for them). Fix bearer to pier per AS 1684.2. Hardwood packers if a pier ends up low.', watchFor: 'In termite-management zones, timber packers can compromise the barrier. Use metal shim packers or approved treated packers only.' },
        { title: 'Set out joist positions on the bearers', body: 'From one end, set out off the plan and keep every centre consistent across the run.', watchFor: 'Joist positions must match the plan — the plan sets the c/c and the location of every joist for a reason.' },
        { title: 'Lay joists across bearers', body: 'Place joists across bearers, single-span or lap-joined over a bearer — both ends bearing on the bearer top. Rotate bowed joists BOW UP so the bow cancels the deflection under load.', watchFor: 'A joist laid bow-down stays bow-down, giving a permanent dip in the floor above.' },
        { title: 'Fix joists to bearer', body: 'Skew-nail with 2× 90 mm nails per bearing point, or use joist hangers / triple-grip connectors where the joist doesn\'t sit directly on the bearer top. Hangers get joist-hanger nails, not framing nails.', watchFor: 'Substituting framing nails in a hanger fails the connection. Buy the manufacturer\'s spec\'d nail.' },
        { title: 'Block between joists at midspan', body: 'Solid blocking (same section as joist) at midspan for spans over 2.4 m. Skew-nail from both sides.', watchFor: 'Blocking stops joists twisting under load. Skip it and the floor bounces even with correctly-sized joists.' },
        { title: 'Lay flooring T&G with glue + screws', body: 'Bead PU adhesive along each joist top before laying the sheet. Push T&G joins tight with a block + sledgehammer against the outside edge. Fix to the manufacturer\'s requirements and stagger sheets.', watchFor: 'Leave a 3 mm expansion gap at perimeter — yellow-tongue swells once the roof goes on.' },
      ],
    },
  },
  {
    id: 'frame-walls',
    category: 'framing',
    phase: 'framing',
    label: 'Frame walls (external + internal)',
    summary: 'Two paths: pre-nail frames delivered from the factory, or build on site off the plan.',
    nz: {
      tools: ['Tape', 'Chalk line', 'Pencil', 'Combination square', 'Spirit level (1.8 m+)', 'Circular / drop saw', 'Hammer or nail gun', 'Cordless drill / impact driver', 'Plumb bob', 'String line', 'Staple gun (for wrap)', 'Off-cut diagonals for bracing'],
      materials: ['Studs, plates, nogs: 90×45 SG8 kiln-dried radiata', 'Lintels: 190×45 (or larger) LVL13 per NZS 3604 8.5 tables', 'Trimmer + jack studs at each opening (doubled per plan)', '90×3.15 flat-head bright framing nails (or 75×3.06 gun nails)', 'Brace panels: 12 mm plywood, or engineered brace units per NZS 3604 5.4', 'Wall wrap (external walls): E2/AS1-compliant house wrap (Thermakraft, Watergate, Tyvek)', 'Flashing tape for opening jambs / heads (external walls only)', 'Bottom-plate fixings: 100 mm bugle screws to timber, Dynabolts to slab'],
      steps: [
        { title: 'Read the framing plan + bracing schedule', body: 'Wall dimensions, opening positions, lintel sizes, brace panel positions. NZS 3604 5 requires the BU (Bracing Units) demand to be met — the schedule tells you which panel goes where. Note which walls are external (load-bearing + get wrapped) vs internal (may or may not be load-bearing).', watchFor: 'Substituting or moving brace panels invalidates the bracing calc. If the schedule calls a specific panel in that wall, don\'t change it.' },
        { title: 'Option A — Pre-nail frames delivered', body: 'Most standard NZ builds use pre-nail: the plans go to a frame + truss yard (PlaceMakers, Carters, ITM), they build every wall in a jig + deliver on a hiab truck labelled per plan. On delivery: check labels match the plan, walk each frame + confirm openings + lintel positions, count them off before signing the delivery docket. Stack in reverse-lift order (last-stood at the bottom) close to where each wall lands.', watchFor: 'Frames dumped in a muddy paddock end up bowed by the time you stand them. Get a flat, dry area sorted before the truck arrives.' },
        { title: 'Option B — Build on site off the plan', body: 'Chalk the wall line on the slab / floor. Cut top + bottom plates together to the wall length, stack + mark stud + trimmer + jack positions on both at once (400 or 600 c/c external load-bearing, 600 c/c non-loadbearing internal per NZS 3604 8). Cut studs to length (wall height − plate thicknesses — cut one first + dry-fit before the rest). Cut lintels to opening width + bearing each end (bears on the jack studs — 45 mm per jack, 90 mm for a doubled jack; confirm with plan). Mark LVL orientation ("top"). Lay flat: bottom plate, studs on marks, trimmers + jacks + lintels at openings, top plate at the far end. Nail through plates INTO stud ends — 2× 90 mm nails per end. Diagonal-check to square before you lift. Fit nogs while the frame is still flat — rows at 800 and 1600 mm from the bottom plate, stops the studs twisting. Leave out the end nogs (the ones between the last two studs each end); if they\'re in when you lift, they can bow the end studs out. Fit the end nogs once the wall is up + plumb.', watchFor: 'Nail from the plate into the stud end (face-nail), never end-nail into end-grain — pull-out fails and inspectors flag it. LVL upside-down halves the bending capacity — check the "top" mark.' },
        { title: 'Mark brace panel positions on the frame', body: 'Chalk / pencil the panel extents on the studs + plates in a different colour so you (or the next person) can\'t miss them. Panels themselves are fixed AFTER the wall is stood + plumb — see the install-brace-panels job for fixing patterns.', watchFor: 'A wall standing without its brace panels is held only by the temporary props. Get panels on before end of day, or you\'re gambling on the wind.' },
        { title: 'Stand + brace temporarily', body: 'Walk the wall up — bottom plate pivots on the snap-line. Solo for a standard 2.4 m internal wall up to ~4 m long, or a bare external wall to ~3 m; grab a hand for anything longer, taller, or with brace panels + LVL lintels already in (30–50% heavier). Prop with 90×45 diagonal off-cuts from top corners to fixed points (floor, existing framing, tacked plate) — two braces on before you let go.', watchFor: 'Wind gusts topple half-standing walls. If a gust hits mid-standing, hold — a wall that falls flat means re-framing every stud.' },
        { title: 'Plumb, straighten, fix down', body: 'Spirit level on both end studs — check both faces (in-and-out AND left-right). Sight the top plate for straightness (or run a string line); push in / out with brace props until dead-straight. Fix the bottom plate: slab = Dynabolts at 900 c/c; timber floor = 100 mm bugle screws down through the plate into joists (hit the joist, not the ply).', watchFor: 'Out-of-plumb walls telegraph through gib and cladding. Get every wall within 3 mm over 2.4 m before permanent bracing. Random screws through ply with no joist under = pulls out first time someone leans on the wall.' },
        { title: 'Fix wall wrap over the frame (external walls only)', body: 'Roll wrap horizontally across external walls starting at the bottom, lapping upper courses over lower by 150 mm minimum. Staple to studs at ~300 mm c/c. The 150 mm lap sheds water on its own — no tape on the lap. Internal walls don\'t get wrapped.', watchFor: 'Openings are treated AFTER the wrap is on: cut the opening, then sill flashing tape + jamb tape both go OVER the wrap and fold into the rebate. Metal head flashing goes on last with head-flashing tape sealing its top edge onto the wrap. Get the sequence wrong = water gets behind cladding.' },
      ],
    },
    au: {
      tools: ['Tape', 'Chalk line', 'Pencil', 'Combination square', 'Spirit level (1.8 m+)', 'Circular / drop saw', 'Hammer or nail gun', 'Cordless drill / impact driver', 'Plumb bob', 'String line', 'Staple gun (for wrap)', 'Off-cut diagonals for bracing'],
      materials: ['Studs, plates, noggins: 70×35 MGP10 pine — H2-blue treated in termite zones (upsize to 90×35 / 90×45 for load-bearing external walls per AS 1684.2)', 'Lintels: 190×45 (or larger) LVL13 per AS 1684.2 tables', 'Trimmer + jack studs at each opening (doubled per plan)', '90×3.15 flat-head bright framing nails (or 75×3.05 gun nails)', 'Brace panels: 12 mm plywood, or engineered brace panels per AS 1684.2', 'Wall wrap (external walls): pliable membrane per AS 4200 (Enviroseal, Thermakraft, Tyvek)', 'Flashing tape for opening jambs / heads (external walls only)', 'Bottom-plate fixings: 100 mm Type 17 to timber, Dynabolts / ChemSet to slab'],
      steps: [
        { title: 'Read the framing plan + bracing schedule', body: 'Wall dimensions, opening positions, lintel sizes, brace panel positions. AS 1684.2 requires the bracing demand (kN or kN/m) to be met per wind classification (N1–N6 non-cyclonic, C1–C4 cyclonic). Note which walls are external (load-bearing + wrapped) vs internal (may or may not be load-bearing).', watchFor: 'Moving brace panels invalidates the bracing design. Follow the schedule as drawn.' },
        { title: 'Option A — Pre-nail frames delivered', body: 'Most AU project builds use pre-nail: plans go to a frame + truss yard (Pryda, Multinail, or a local fabricator), they build every wall in a jig + deliver on a truck labelled per plan. On delivery: check labels match the plan, walk each frame + confirm openings + lintel positions, count them off before signing the docket. Stack reverse-lift (last-stood at the bottom) near each wall\'s landing point.', watchFor: 'Frames dumped in a muddy paddock end up bowed by the time you stand them. Get a flat, dry area sorted before the truck arrives.' },
        { title: 'Option B — Build on site off the plan', body: 'Chalk the wall line on slab / floor. Cut top + bottom plates together to the wall length, stack + mark stud + trimmer + jack positions on both at once (450 or 600 c/c external load-bearing, 600 c/c non-loadbearing internal per AS 1684.2). Cut studs to length (wall height − plate thicknesses — cut one first + dry-fit). Cut lintels to opening width + bearing each end (bears on the jack studs — 45 mm per jack, 90 mm for a doubled jack; confirm with plan). Mark LVL orientation ("top"). Lay flat: bottom plate, studs on marks, trimmers + jacks + lintels at openings, top plate at the far end. Nail through plates INTO stud ends — 2 nails per end. Diagonal-check to square before lifting. Fit noggins while the frame is still flat — fix at desired height, stops the studs twisting. Leave out the end noggins (the ones between the last two studs each end); if they\'re in when you lift, they can bow the end studs out. Fit the end noggins once the wall is up + plumb.', watchFor: 'Nail from plate into stud end (face-nail), never end-nail into end-grain — pull-out fails + certifier flags it. LVL upside-down halves the bending capacity — check the "top" mark.' },
        { title: 'Mark brace panel positions on the frame', body: 'Chalk / pencil the panel extents on the studs + plates in a different colour so no one misses them. Panels are fixed AFTER the wall is stood + plumb — see the install-brace-panels job.', watchFor: 'A wall standing without brace panels is held only by temporary props. Get panels on before end of day.' },
        { title: 'Stand + brace temporarily', body: 'Walk the wall up — bottom plate pivots on the snap-line. Solo for a standard 2.4 m internal wall to ~4 m long or bare external to ~3 m; grab a hand for longer, taller, or with brace panels + LVL lintels in (30–50% heavier). Prop with 70×35 diagonal off-cuts from top corners to fixed points (floor, existing framing, tacked plate) — two braces on before letting go.', watchFor: 'Wind gusts topple half-standing walls. If a gust hits mid-standing, hold — a flat-fall means re-framing every stud.' },
        { title: 'Plumb, straighten, fix down', body: 'Spirit level on both end studs — both faces (in-and-out + left-right). Sight top plate for straightness or run a string line; push in / out with brace props until dead-straight. Fix bottom plate: slab = spec\'d anchors (Dynabolts / ChemSet) at spacing per the plan / manufacturer; timber floor = 100 mm Type 17 into joists (hit joist, not flooring).', watchFor: 'Out-of-plumb telegraphs through plasterboard + cladding. Within 3 mm over 2.4 m before permanent bracing. Termite zones: don\'t breach the barrier at the slab join with un-flashed penetrations — check barrier manufacturer\'s spec.' },
        { title: 'Fix wall wrap over the frame (external walls only)', body: 'Roll wrap horizontally across external walls from bottom up, lapping upper courses over lower by 150 mm min. Staple at ~300 mm c/c. The 150 mm lap sheds water on its own — no tape on the lap. Internal walls don\'t get wrapped.', watchFor: 'Openings are treated AFTER the wrap is on: cut the opening, then sill flashing tape + jamb tape both go OVER the wrap and fold into the rebate. Metal head flashing goes on last with head-flashing tape sealing its top edge onto the wrap. Get the sequence wrong = water behind cladding.' },
      ],
    },
  },
  {
    id: 'install-lintel-beam',
    category: 'framing',
    phase: 'framing',
    label: 'Install a lintel or support beam',
    summary: 'Bearing points, lift, fix, verify load path.',
    nz: {
      tools: ['Tape', 'Spirit level', 'Drill/driver', 'Hammer / nail gun', 'Drop or circular saw', 'Ratchet strap or come-along (for heavy beams)', 'Temporary props (2–3)', 'Plumb bob'],
      materials: ['Beam / lintel: LVL13/15, engineered timber, or steel per plan', 'Bearing packers + full-height jack studs each end', 'Beam brackets (Simpson, Pryda, or spec\'d)', '100 mm bugle screws + 90 mm framing nails', 'Timber for temporary props (100×50)'],
      steps: [
        { title: 'Read the beam schedule', body: 'Get section, span, bearing length required (typically 100–200 mm each end), hold-down / uplift straps, and fixings. NZS 3604 8.5 covers lintels for standard cases; anything outside those tables is engineered.', watchFor: 'If the plan calls a specific product ("hyJOIST 90×240 LVL13"), do NOT substitute a different LVL grade without engineer sign-off — LVL strengths vary significantly grade to grade.' },
        { title: 'Confirm bearing points', body: 'Beam ends must land on full-height jack studs or a doubled-up bearing stud, not on a trimmer alone. Cross-check the framing plan matches what\'s built.', watchFor: 'Under-supported beam ends are the #1 structural failure in DIY framing. The full load path from beam → jack → bottom plate → foundation has to be continuous.' },
        { title: 'Cut the beam to length', body: 'Length = clear opening width + 2× bearing length. Mark orientation ("top") if LVL. Cut with a sharp blade — LVL splinters if cut with a blunt one.', watchFor: 'A wobbly cut on an LVL end means it won\'t bear flat on the jack stud. Take the time to cut square.' },
        { title: 'Prop + lift into position', body: 'Set temporary props at each end under where the beam will land, at the correct height (usually flush with top plate or a set distance below). A 3 m LVL you can walk up solo; anything from 4 m and up is easier with a hand — the awkwardness matters more than the weight.', watchFor: 'LVLs are heavy AND unwieldy — long span means one end drops before the other is landed. Two people once the length gets away from you.' },
        { title: 'Fix ends to bearing studs', body: 'Beam brackets, nail-plate connectors, or through-bolts per plan. Use manufacturer-spec\'d nails / bolts — substitutes fail the connection rating.', watchFor: 'Beam brackets have specific nail-hole patterns and quantities. All specified holes must have a nail; skipping "just a couple" fails the rated load.' },
        { title: 'Install uplift straps + lateral restraint', body: 'Fit hold-down straps per wind zone (NZS 3604 5 or engineer). Straps tie beam → jack stud → bottom plate → foundation to resist uplift.', watchFor: 'In High + Extra High wind zones, missing straps let the roof fly off in cyclone-strength gusts. Not optional.' },
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
    phase: 'framing',
    label: 'Stand + brace framed walls',
    summary: 'Lift, prop, plumb, straighten, permanent brace.',
    nz: {
      tools: ['Sledge', 'Hammer or nail gun', 'Cordless drill', 'Spirit level (1.8 m+)', 'Tape', 'String line'],
      materials: ['Diagonal timber braces: 90×45 or 100×50 off-cuts, ~2.5 m long', '90×3.15 framing nails', '100 mm bugle screws for permanent bracing', 'Brace units: 12 mm ply panels or engineered steel braces per NZS 3604 5.4'],
      steps: [
        { title: 'Assess the wall before you lift', body: 'Length, weight (brace panels + lintels add real mass), wind exposure. Standard internal or short external wall = solo lift. Long or heavily-loaded external wall = two people. A 6 m external with brace panel + LVL lintel is a solid 150 kg — plan for two.', watchFor: 'Read the wall before deciding. Lifting a heavier wall than you should on your own is how backs go.' },
        { title: 'Walk the wall up', body: 'Bottom plate against the snap-line, base pivots as you walk the top plate upright. Continuous motion — don\'t stop halfway with the wall half-raised.', watchFor: 'On a long heavy wall with two people, put the extra body at whichever end will pivot last. Communicate before lifting.' },
        { title: 'Prop immediately, two braces minimum', body: 'Screw or nail 90×45 diagonal off-cuts from top corners down to fixed points (floor, existing framing, adjacent wall). Don\'t let go until at least two braces are on.', watchFor: 'Wind gusts topple half-standing walls. If a gust comes through mid-standing, drop what you\'re doing and hold — a wall that falls flat means re-framing every stud.' },
        { title: 'Plumb both ends', body: 'Spirit level on end stud, check both faces (in-and-out AND left-right). Adjust the props until plumb, then re-nail brace to hold.', watchFor: 'Short spirit levels lie on tall studs. Use a 1.8 m minimum, or check at top, middle, and bottom of the same stud.' },
        { title: 'Straighten the top plate', body: 'Sight down the top plate for straightness, or run a string line. Push in or pull out with a brace prop until dead-straight; nail the prop off to hold.', watchFor: 'A bowed top plate telegraphs through the ceiling and every course of cladding. Get it dead straight now, not after linings.' },
        { title: 'Fix the bottom plate down', body: 'Slab: pre-drill + spec\'d anchors (Dynabolts / ChemSet) at spacing per the plan / manufacturer, tighter around openings. Timber floor: 100 mm bugle screws or twist-shank nails into the joist below.', watchFor: 'Screws into flooring ply with no joist under will pull. Chase the joist line and hit it.' },
        { title: 'Install permanent bracing + cross-tie corners', body: 'Fit brace panels, straps, or plywood per plan — panels go on after the wall is stood + plumb (see the install-brace-panels job for the fixing pattern). Nail double-plate joins at corners, install any strap ties.', watchFor: 'A wall standing on only temporary bracing at end-of-day is a next-morning collapse hazard if wind picks up. Get permanent bracing in before you knock off.' },
      ],
    },
    au: {
      tools: ['Sledge', 'Hammer or nail gun', 'Cordless drill', 'Spirit level (1.8 m+)', 'Tape', 'String line'],
      materials: ['Diagonal timber braces: 70×35 off-cuts, ~2.5 m long', '90×3.15 framing nails', '100 mm Type 17 screws for permanent bracing', 'Brace units: 12 mm ply panels or engineered steel braces per AS 1684.2'],
      steps: [
        { title: 'Assess the wall before you lift', body: 'Length, weight (brace panels + lintels add mass), wind exposure. Standard internal or short external = solo lift. Long or heavily-loaded external = two. A 6 m external with brace panel + LVL lintel is 150+ kg — plan for two.', watchFor: 'Read the wall before deciding. Lifting a heavier wall than you should solo is how backs go.' },
        { title: 'Walk the wall up', body: 'Bottom plate against the snap-line, base pivots as you walk the top plate upright. Continuous motion — don\'t stop halfway.', watchFor: 'On a long heavy wall with two people, put the extra body at whichever end pivots last. Communicate before lifting.' },
        { title: 'Prop immediately, two braces minimum', body: '70×35 diagonal off-cuts from top corners to fixed points. Don\'t let go until at least two braces on.', watchFor: 'Wind gusts topple half-standing walls. If a gust hits mid-standing, hold — a flat-fall means re-framing.' },
        { title: 'Plumb both ends', body: 'Spirit level on end stud, both faces (in-and-out + left-right). Adjust props until plumb; re-nail brace to hold.', watchFor: 'Short levels lie on tall studs. Use 1.8 m minimum or spot-check at top, middle, bottom.' },
        { title: 'Straighten the top plate', body: 'Sight down the top plate, or run a string line. Push/pull with a brace prop until dead-straight; nail off.', watchFor: 'A bowed top plate telegraphs through ceiling and cladding. Straighten now.' },
        { title: 'Fix the bottom plate down', body: 'Slab: pre-drill + spec\'d anchors (Dynabolts / ChemSet) at spacing per the plan / manufacturer, tighter at openings. Timber floor: 100 mm Type 17 into the joist below.', watchFor: 'Screws through flooring with no joist under will pull. Chase and hit the joist.' },
        { title: 'Install permanent bracing + cross-tie corners', body: 'Fit brace panels, straps, plywood per plan. Nail double-plate joins at corners, install strap ties per wind classification.', watchFor: 'A wall on temporary bracing at end-of-day is a next-morning collapse hazard if wind picks up. Permanent bracing in before knock-off.' },
      ],
    },
  },
  {
    id: 'install-brace-panels',
    category: 'framing',
    phase: 'framing',
    label: 'Install brace panels',
    summary: 'Fixing patterns for brace panels in place.',
    au: {
      tools: ['Tape', 'Chalk line / pencil', 'Circular saw', 'Cordless drill / driver', 'Hammer or nail gun', 'Ladder / trestle'],
      materials: ['12 mm F8 structural plywood (H3-treated for external / cavity)', '30×2.5 or 50×3.15 flat-head galv nails (or 50 mm ring-shank)', 'Alternative: engineered brace panels (Bracewell, Multinail Sheet Brace, etc.)', 'Bracing schedule (kN or kN/m per wall) from the plan'],
      steps: [
        { title: 'Read the bracing schedule', body: 'AS 1684.2 requires the bracing capacity (kN or kN/m per wind classification) to be met wall-by-wall. Schedule tells you panel type + position + count. Confirm each panel matches what\'s called out.', watchFor: 'Swapping in a lighter panel drops the kN rating. Bracing calc has to balance — under-spec\'d panels fail the design.' },
        { title: 'Cut the panel to fit', body: 'Panel spans between top + bottom plate, edge on a stud each side. Cut with a circular saw. Full sheet where possible — small offcut infills lose bracing capacity per AS 1684.2.', watchFor: 'Panels less than 300 mm wide don\'t count in most bracing systems. Check the panel spec\'s minimum dimensions.' },
        { title: 'Position + tack in place', body: 'Lift into position against the stood + plumb wall. Tack a couple of nails to hold — enough to free your hands, not enough to lock alignment yet. Push panel hard against every stud + plate.', watchFor: 'Panel with a gap behind a stud won\'t transfer load. Push hard to close gaps before nailing off.' },
        { title: 'Nail off: 50 mm from edge, 150 c/c perimeter, 300 c/c intermediate', body: 'Per AS 1684.2 exterior structural ply pattern: 30×2.5 or 50×3.15 galv flat-head. Start 50 mm from the panel edge on all sides, then 150 mm c/c around the whole perimeter (top plate, bottom plate, both edge studs). Field fixings 300 mm c/c on intermediate studs the panel crosses.', watchFor: 'Nails too close to edge (< 12 mm) split the ply. Nails too far apart on the perimeter drops rating in a linear way — 200 mm c/c is not "close enough".' },
        { title: 'Check the panel before moving on', body: 'Walk the panel + confirm every fixing is in per the pattern before knock-off or before linings go up. Easier to catch a missed nail now than after the wall is closed in.', watchFor: 'Under-fixed brace panels = rectification order = pull linings + re-nail. Two minutes checking now saves half a day of rework.' },
        { title: 'Photograph each panel', body: 'Wide shot showing the whole panel + nailing pattern before it\'s covered. Label the wall + panel type in the shot. Log them against the job in Setout (Jobs → Photos) so they\'re all in one place when the inspector asks.', watchFor: 'A folder of unlabelled brace-panel photos is nearly useless. Use the comment on each photo in Setout to note the wall ID + panel ref — so you can still tell them apart in 6 months.' },
      ],
    },
  },
  {
    id: 'frame-stair-opening',
    category: 'framing',
    phase: 'framing',
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
    phase: 'framing',
    label: 'Install ceiling joists',
    summary: 'Layout, skew-nail, midspan strong-back, hold-down bracket.',
    nz: {
      tools: ['Tape', 'Drop / circular saw', 'Hammer or nail gun', 'Cordless drill', 'Spirit level', 'String line', 'Ladder / trestle'],
      materials: ['Ceiling joists: 140×45 or 190×45 SG8 H1.2 (per NZS 3604 10.2 span tables)', 'Strong-back timber (for long spans): 90×45 or 140×45 laid flat', '90×3.15 flat-head bright framing nails', 'Hold-down brackets (Pryda Framing Anchor, Multinail Twin Grip, or Bowmac) per NZS 3604 10.3 wind zone tables', 'Skew-nailing or joist hangers per detail'],
      steps: [
        { title: 'Get joist size + spacing from the plan', body: 'NZS 3604 10.2 has span tables for standard ceiling loads. Typical: 140×45 at 400 c/c for a 4 m span. Bigger for storage-loaded ceilings or where joists carry roof structure.', watchFor: 'Ceiling joist size can be driven by ROOF LOAD, not just ceiling load. Trussed roofs offload; rafter roofs put the tie load into the ceiling joists.' },
        { title: 'Mark joist positions on top plates', body: 'Match spacing to wall studs where possible so hold-down brackets run in a straight line stud → plate → joist. Mark at both ends of the run.', watchFor: 'Joists that don\'t align with studs below still work structurally, but the bracket tie-down path becomes offset — check the bracket detail allows it.' },
        { title: 'Cut joists to length', body: 'Length = span + bearing (typically 45 mm minimum bearing each end). If a joist has to run wall-to-wall and lap on an internal wall, cut for the lap.', watchFor: 'Rotate bowed joists BOW UP — same rule as floor joists. A bow-down joist gives a permanent dip in the ceiling below.' },
        { title: 'Position + skew-nail to top plate', body: 'Lay joists over top plates, skew-nail each end with 2× 90 mm nails per bearing. At an internal wall lap, use 3× nails through the lap.', watchFor: 'Skew-nailing too close to the joist end splits the timber. Angle 60° from vertical, start 25 mm back from the end.' },
        { title: 'Fit a strong-back at midspan (long spans)', body: 'For spans over 3.6 m, lay a strong-back (joist-sized member on flat) across the top of the ceiling joists at midspan. Skew-nail to each joist. Stiffens the whole plane and stops individual joists twisting.', watchFor: 'Skipping the strong-back on a long-span ceiling gives a bouncy ceiling and visible joist telegraph after linings go on.' },
        { title: 'Nog between joists for lateral stability', body: 'Solid off-cuts between joists at midspan, skew-nailed both sides. Stops joists rolling.', watchFor: 'Ceiling joists carrying a rafter tie load NEED the nogs — without them the joists can twist under the tension.' },
        { title: 'Install hold-down brackets per wind zone', body: 'NZS 3604 10.3 tables give bracket type + nailing per wind zone (Low → Extra High). Bracket ties joist → top plate → stud. Nails per manufacturer spec.', watchFor: 'Missing brackets in High + Extra High wind zones = roof lifts off in a storm. Not optional.' },
      ],
    },
    au: {
      tools: ['Tape', 'Drop / circular saw', 'Hammer or nail gun', 'Cordless drill', 'Spirit level', 'String line', 'Ladder / trestle'],
      materials: ['Ceiling joists: 140×45 or 190×45 MGP10 (per AS 1684.2 span tables)', 'Strong-back timber (for long spans)', '90×3.15 flat-head bright framing nails', 'Cyclone / wind straps per AS 1684.2 wind classification', 'Skew-nailing or joist hangers per detail'],
      steps: [
        { title: 'Get joist size + spacing from the plan', body: 'AS 1684.2 span tables give ceiling joist sizes. Typical: 140×45 at 450 c/c for a 4 m span. Bigger for storage-loaded or where joists carry rafter tie load.', watchFor: 'Joist size can be driven by ROOF LOAD, not just ceiling. Trussed roofs offload; rafter roofs put tie load into ceiling joists.' },
        { title: 'Mark joist positions on top plates', body: 'Match spacing to wall studs where possible so tie-down straps run stud → plate → joist. Mark both ends of the run.', watchFor: 'Non-aligned joists still work structurally but the tie-down path offsets — check the strap detail allows it.' },
        { title: 'Cut joists to length', body: 'Length = span + bearing (45 mm min each end). Lap on internal walls if wall-to-wall run needs a join.', watchFor: 'Bow UP — bow-down gives a permanent dip below.' },
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
    phase: 'framing',
    label: 'Cut + install rafters on a gable roof',
    summary: 'Template rafter, ridge board, birdsmouth, tie, tie-down.',
    nz: {
      tools: ['Tape', 'Drop / circular saw', 'Bevel or framing square', 'Spirit level', 'Chalk line', 'Hammer or nail gun', 'Plumb bob', 'Rafter template', 'Ladder / trestle / scaffold'],
      materials: ['Rafters: 190×45 or 240×45 SG8 H1.2 (per NZS 3604 10.4 rafter tables)', 'Ridge board: same depth as rafters × 25 or 45 mm thick', '90×3.15 flat-head bright framing nails', 'Collar ties or ceiling joists (roof tie)', 'Hold-down brackets (Pryda Framing Anchor, Multinail Twin Grip, or Bowmac) per NZS 3604 10.3 wind zone tables'],
      steps: [
        { title: 'Read the roof plan', body: 'Get pitch, span (wall-to-wall), overhang length, ridge dimensions, and rafter size / spacing straight off the plan. If the plan doesn\'t call the rafter, cross-check the span + pitch against NZS 3604 10.4 rafter tables.', watchFor: 'Pitch is critical to every cut. Note whether stated in degrees or as ratio (rise:run) and convert if needed. Rise / run miscalculations = every cut wrong.' },
        { title: 'Set out ONE rafter as the template', body: 'On the ground, mark plumb cut (ridge end) + birdsmouth (seat on top plate). Leave the tail long — don\'t cut it yet. The tail gets string-lined + cut after the rafters are fixed so the fascia line ends up dead straight.', watchFor: 'The birdsmouth must leave at least 2/3 of the rafter depth ABOVE the plate. Over-cutting the birdsmouth weakens the rafter significantly and fails inspection.' },
        { title: 'Test-fit the template rafter', body: 'Position it against a temporary ridge and a top plate. Confirm birdsmouth sits flat on plate + ridge cut is plumb. Tail hangs past the fascia line — you\'ll trim it later.', watchFor: 'A template that fits at one end of the building may not fit at the other if the walls aren\'t straight. Test at both ends before cutting the batch.' },
        { title: 'Cut all rafters from the template', body: 'Bundle rafters together and cut in one session for consistency. Do them all in one go — an interrupted cutting session risks the second batch not matching the first.', watchFor: 'Marking each rafter from the template introduces error. Use the template as a physical marker (trace or clamp) rather than measuring each time.' },
        { title: 'Position ridge board + prop', body: 'Set the ridge board along the roof centreline, prop with temporary posts to design ridge height. Chalk a straight line to sight the ridge against.', watchFor: 'A crooked ridge = crooked roof. Straighten the ridge before you nail more than the first two rafter pairs.' },
        { title: 'Fix opposing rafter pairs at ridge', body: 'Nail one rafter to the ridge, then the opposing rafter to meet it. 3× 90×3.15 nails at ridge, 2× skew-nails through birdsmouth into top plate. Work from one end to the other.', watchFor: 'Nail one side then the other — nailing both sides of a rafter pair simultaneously bows the ridge board.' },
        { title: 'Install collar ties or confirm ceiling joists tie', body: 'NZS 3604 requires a roof tie at every opposing rafter pair for pitches below 45°. Ceiling joists spanning the same direction as the rafters can BE the tie; if they don\'t, install collar ties.', watchFor: 'Without a tie, rafter thrust pushes the walls apart at the top plate. Progressive damage over years, visible as spreading walls.' },
        { title: 'Install rafter hold-down brackets', body: 'Fix bracket to rafter side + into top plate. Bracket ties rafter → top plate → stud below. Nails per manufacturer + wind zone. NZS 3604 10.3 tables.', watchFor: 'Substituting a smaller bracket or fewer nails downgrades the connection. Follow the bracket spec exactly.' },
        { title: 'String-line the rafter tails + cut', body: 'With every rafter fixed, run a string between the two end rafters at the fascia line position. Mark each intermediate rafter tail against the string. Cut all tails to the mark — plumb + level cut for the fascia to sit against. Now you\'ve got a dead-straight fascia line even if the rafters themselves came out with slight length variation.', watchFor: 'Cutting rafter tails BEFORE they\'re fixed = every length variation shows up in the fascia line. String-line + cut in place is the only way to get a straight fascia off a batch of rafters.' },
        { title: 'Sight the finished roof', body: 'Ridge straight, rafters plumb (sight from below), overhang consistent all round. Anything visibly out gets pulled + refixed before roofing goes on.', watchFor: 'Waves in the ridge or inconsistent overhangs will telegraph through cladding and become visible from the street. Get it right pre-roofing.' },
      ],
    },
    au: {
      tools: ['Tape', 'Drop / circular saw', 'Bevel or framing square', 'Spirit level', 'Chalk line', 'Hammer or nail gun', 'Plumb bob', 'Rafter template', 'Ladder / trestle / scaffold'],
      materials: ['Rafters: 190×45 or 240×45 MGP10 (per AS 1684.2 rafter tables)', 'Ridge board: same depth as rafters × 25 or 45 mm thick', '100 mm framing nails', 'Collar ties or ceiling joists (roof tie)', 'Cyclone / wind straps per AS 1684.2'],
      steps: [
        { title: 'Read the roof plan', body: 'Get pitch, span, overhang, ridge dimensions. Confirm rafter size from AS 1684.2 rafter tables against span + pitch.', watchFor: 'Pitch is critical to every cut. Degrees vs rise:run — convert if needed. Miscalc = every cut wrong.' },
        { title: 'Set out ONE rafter as the template', body: 'On the ground, mark plumb cut (ridge end) + birdsmouth (seat on top plate). Leave the tail long — don\'t cut it yet. Tails get string-lined + cut after the rafters are fixed so the fascia line ends up dead straight.', watchFor: 'Birdsmouth must leave at least 2/3 of rafter depth ABOVE plate. Over-cut weakens the rafter and fails inspection.' },
        { title: 'Test-fit the template', body: 'Position against a temporary ridge + top plate. Confirm birdsmouth sits flat + ridge is plumb. Tail hangs past the fascia line — you\'ll trim it later.', watchFor: 'Template fits one end but not the other if walls aren\'t straight. Test both ends before batch-cutting.' },
        { title: 'Cut all rafters from the template', body: 'Bundle and cut in one session for consistency. Use template as physical marker (trace/clamp), not measurement each time.', watchFor: 'Measuring each rafter introduces error. Trace off the template.' },
        { title: 'Position ridge board + prop', body: 'Set ridge along centreline, prop with temporary posts to design height. Chalk a straight sight-line.', watchFor: 'Crooked ridge = crooked roof. Straighten before nailing more than two pairs.' },
        { title: 'Fix opposing rafter pairs at ridge', body: 'Nail one side, then opposing side to meet. 3× 100 mm at ridge, 2× skew-nails through birdsmouth into top plate. Work one end to the other.', watchFor: 'Nail one side then the other — simultaneous both sides bows the ridge board.' },
        { title: 'Install collar ties or confirm ceiling joists tie', body: 'AS 1684.2 requires a roof tie at every opposing pair for pitches below 45°. Ceiling joists spanning same direction can BE the tie; if not, install collar ties.', watchFor: 'No tie = rafter thrust pushes walls apart. Progressive damage over years.' },
        { title: 'Install cyclone straps + tie-downs', body: 'Strap to rafter side + around top plate + to stud below. Nails per manufacturer + wind classification. AS 1684.2 tables.', watchFor: 'Shorter strap or fewer nails downgrades the connection. Follow the spec exactly.' },
        { title: 'String-line the rafter tails + cut', body: 'With every rafter fixed, run a string between the two end rafters at the fascia line position. Mark each intermediate rafter tail against the string. Cut all tails to the mark — plumb + level cut for the fascia to sit against. Dead-straight fascia line even if the rafters themselves came out with slight length variation.', watchFor: 'Cutting rafter tails BEFORE they\'re fixed = every length variation shows up in the fascia line. String-line + cut in place is the only way to get a straight fascia off a batch of rafters.' },
        { title: 'Sight the finished roof', body: 'Ridge straight, rafters plumb (sight from below), overhang consistent all round. Anything visibly out gets pulled + refixed before roofing goes on.', watchFor: 'Waves telegraph through cladding and become visible from street. Fix pre-roofing.' },
      ],
    },
  },
  {
    id: 'install-trusses',
    category: 'framing',
    phase: 'framing',
    label: 'Set out and stand roof trusses',
    summary: 'Layout, crane / lift, plumb, permanent brace, tie-down.',
    nz: {
      tools: ['Tape', 'Spirit level', 'String line', 'Hammer or nail gun', 'Cordless drill', 'Temporary bracing off-cuts', 'Ladder / scaffold', 'Crane or hi-ab (if trusses are heavy or span long)'],
      materials: ['Trusses (pre-fabricated by manufacturer per truss schedule)', 'Hold-down brackets (Pryda Framing Anchor, Multinail Twin Grip, or Bowmac) per NZS 3604 wind zone', '90×3.15 nails (or manufacturer-spec\'d nails for brackets)', 'Temporary bracing: 90×45 off-cuts, ~3 m long', 'Permanent bracing: as per truss engineer\'s layout drawing'],
      steps: [
        { title: 'Read the truss layout from the manufacturer', body: 'Get truss positions, orientations, girder trusses (support hip-jack trusses), and special connectors. Truss schedule is engineered as a SYSTEM.', watchFor: 'Removing, shortening, or moving any truss without engineer sign-off invalidates the whole design. If you need to modify a truss on site, stop and call the truss company.' },
        { title: 'Mark truss positions on the top plates', body: 'Number each mark to match the truss labels on the layout drawing. Get spacing exactly right — trusses are engineered for a specific c/c.', watchFor: 'Truss spacing errors compound across the roof. Measure from a datum end, don\'t chain off the last mark.' },
        { title: 'Stand both gable-end trusses first', body: 'Lift the truss at each end of the run, plumb them, and temporary-brace vertically off the floor + adjacent walls so they can\'t move. These two trusses set the reference for every internal one.', watchFor: 'Trusses are top-heavy and want to tip. Get both ends dead plumb + fully braced before running any string — everything after keys off these two.' },
        { title: 'Stringline between the gable peaks', body: 'Run a stringline from the peak of one gable-end truss to the peak of the other. Reference line for a straight ridge — every intermediate truss lifts up to this line.', watchFor: 'Wind or a sagging line throws the whole ridge. Check the pull before you start lifting internals.' },
        { title: 'Lift the internal trusses to the line + shoot down', body: 'Stand each internal truss on its mark, bring the peak up to just touching the line (not pushing it up), and shoot the heel down with a couple of framing nails into the top plate — enough to hold it in place. Work down the run truss by truss. Temporary-brace diagonally between trusses (top chord to top chord) as you go so nothing can fall.', watchFor: 'Peaks pushing the line up = ridge bowed high; short of the line = ridge dipped. Adjust before nailing. A row of un-braced trusses will fall like dominoes if one goes — keep diagonal bracing running continuously.' },
        { title: 'Install permanent bracing per the layout', body: 'Longitudinal bracing to top chord, bottom chord, and web bracing where the truss engineer calls it out. Nail off per manufacturer spec.', watchFor: 'Skipping "just one" permanent brace can trigger progressive collapse under wind load. Truss engineer\'s bracing plan is not optional.' },
        { title: 'Come back and fit hold-down brackets at every truss', body: 'Once the ridge is straight, trusses are plumb, and permanent bracing is on, come back down the roof and fit a hold-down bracket (Pryda Framing Anchor, Multinail Twin Grip, or Bowmac) at every truss heel per NZS 3604 10.3 wind zone tables — one bracket per truss is standard. Full nailing pattern in every bracket hole. In Extra High wind zones or engineered exceptions, the plan may call for brackets on both sides or additional strap ties to close the tie-down chain to the foundation — follow the schedule.', watchFor: 'Missing brackets in High + Extra High wind zones = roof lifts off in a storm. One bracket per truss is the standard connection; doubling up is engineer-called, not a default.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'String line', 'Hammer or nail gun', 'Cordless drill', 'Temporary bracing off-cuts', 'Ladder / scaffold', 'Crane or hi-ab (heavy/long trusses)'],
      materials: ['Trusses (pre-fabricated per truss schedule)', 'Truss connectors: Simpson H-clips, Pryda triple-grip', '90×3.15 nails (or manufacturer-spec\'d)', 'Temporary bracing: 70×35 off-cuts, ~3 m', 'Permanent bracing: per truss engineer\'s layout', 'Cyclone / wind straps per AS 1684.2 wind classification'],
      steps: [
        { title: 'Read the truss layout from the manufacturer', body: 'Get truss positions, orientations, girder trusses, special connectors. The truss schedule is engineered as a SYSTEM.', watchFor: 'Removing, shortening, or moving any truss without engineer sign-off invalidates the whole design. Modify on site = stop + call truss company.' },
        { title: 'Mark truss positions on top plates', body: 'Number marks to match truss labels. Spacing exact — trusses engineered for specific c/c.', watchFor: 'Errors compound. Measure from a datum end, don\'t chain off the last mark.' },
        { title: 'Stand both gable-end trusses first', body: 'Lift the truss at each end of the run, plumb them, and temporary-brace vertically off the floor + adjacent walls so they can\'t move. These two trusses set the reference for every internal one.', watchFor: 'Trusses are top-heavy and want to tip. Get both ends dead plumb + fully braced before running any string — everything after keys off these two.' },
        { title: 'Stringline between the gable peaks', body: 'Run a stringline from the peak of one gable-end truss to the peak of the other. Reference line for a straight ridge — every intermediate truss lifts up to this line.', watchFor: 'Wind or a sagging line throws the whole ridge. Check the pull before you start lifting internals.' },
        { title: 'Lift the internal trusses to the line + shoot down', body: 'Stand each internal truss on its mark, bring the peak up to just touching the line (not pushing it up), and shoot the heel down with a couple of framing nails into the top plate — enough to hold it in place. Work down the run truss by truss. Temporary-brace diagonally between trusses (top chord to top chord) as you go so nothing can fall.', watchFor: 'Peaks pushing the line up = ridge bowed high; short of the line = ridge dipped. Adjust before nailing. Un-braced row falls like dominoes if one goes — continuous bracing through install.' },
        { title: 'Install permanent bracing per the layout', body: 'Longitudinal bracing to top chord, bottom chord, and web bracing per truss engineer. Nail off per manufacturer.', watchFor: 'Skipping bracing = progressive collapse risk under wind. Bracing plan is not optional.' },
        { title: 'Come back and fit cyclone straps + tie-downs', body: 'Once the ridge is straight, trusses are plumb, and permanent bracing is on, come back down the roof and fit hold-down straps at every truss per AS 1684.2 wind classification (N1–N6, C1–C4). Strap ties truss heel → top plate → stud → foundation.', watchFor: 'Missing straps in N4+ / cyclonic zones = roof departs in a storm. Full chain, no gaps.' },
      ],
    },
  },
  {
    id: 'install-fascia-spouting',
    category: 'roofing-cladding',
    phase: 'weather-tight',
    label: 'Install fascia + spouting (gutter)',
    summary: 'Fascia to rafter tails, brackets, fall to outlet, downpipes.',
    nz: {
      tools: ['Tape', 'Chalk line', 'Drop / metal saw', 'Tin snips', 'Cordless drill / impact driver', 'Hammer', 'Ladder / trestle', 'Sealant gun'],
      materials: ['Fascia: 190×25 or 240×25 H3.2 pre-primed pine, OR Colorcote-coated colorsteel fascia', 'Spouting: Marley PVC continuous / Marley continuous quad / colorsteel continuous', 'Spouting brackets (spacing per manufacturer)', 'Outlets, stopends, downpipe adaptors, expansion joints', '65 mm bugle screws / clout nails / manufacturer-spec\'d fascia clips', 'Neutral-cure sealant', 'Downpipes + brackets, stormwater connection'],
      steps: [
        { title: 'String-line the fascia line first', body: 'Pull a string from one end of the roof to the other, along the outside face of the rafter tails, at fascia-top height. Sight for straightness — pack out any short tails, or trim proud tails, so the fascia lands on a straight line.', watchFor: 'A wavy fascia is the first thing anyone notices from the street. Get the tails straight before nailing a single fascia board.' },
        { title: 'Cut fascia + mitre corners', body: 'Cut fascia to length between corners. Mitre external corners at 45° (or use a corner box if profile allows) — unless the barge board runs past to cover the gutter ends, in which case butt-cut the fascia so the barge caps it. Prime any cut ends of timber fascia before fixing.', watchFor: 'A gapped mitre corner reads as sloppy work forever. Test-fit before nailing.' },
        { title: 'Fix fascia to rafter tails', body: 'Timber fascia: 2× countersunk screws per rafter tail (top + bottom), pre-drilled + countersunk so the heads sit below the surface for filling before paint. Colorsteel fascia: manufacturer\'s spec clips + screws.', watchFor: 'One fixing per tail lets the fascia bow between rafters. Two fixings per tail — top + bottom.' },
        { title: 'Set spouting fall + fix brackets', body: 'Mark the high end + low end of the spouting run on the fascia. Fall + bracket spacing per manufacturer\'s install guide. Fix brackets along the marked slope at the correct offset below fascia top.', watchFor: 'A spouting run without any fall ponds water. A run with too much fall looks visibly tilted from below.' },
        { title: 'Fit outlets + stopends', body: 'Locate outlets over stormwater downpipes. Cut a hole in the spouting at each outlet, glue in outlet fitting per manufacturer. Fit stopends at each end (glued for PVC, riveted + sealed for colorsteel).', watchFor: 'Outlets are the leakiest joint on the gutter. Bed the outlet in sealant + glue per manufacturer, don\'t rely on the fit alone.' },
        { title: 'Snap spouting into brackets', body: 'Push the front edge of spouting up into brackets first, then rotate back edge in. Continuous PVC: expansion joint every 6 m per manufacturer.', watchFor: 'Continuous spouting expands + contracts significantly in sun. Skipping expansion joints causes buckling and pops seals.' },
        { title: 'Install downpipes + connect to stormwater', body: 'Downpipe from outlet down to stormwater inlet (gully or pipe). Fix brackets to wall at 1.5 m c/c. Test with water — a bucket poured into the spouting should exit the downpipe cleanly.', watchFor: 'A downpipe that discharges onto the ground beside the wall is a moisture problem waiting. Connect to stormwater or into a dispersal system per council spec.' },
      ],
    },
  },
  {
    id: 'install-roof-battens',
    category: 'framing',
    phase: 'weather-tight',
    label: 'Install timber roof battens / purlins',
    summary: 'Battens / purlins fixed to rafters at manufacturer spacing.',
    nz: {
      tools: ['Tape', 'Chalk line', 'Drop / circular saw', 'Cordless drill / impact driver', 'Nail gun', 'Hammer', 'Spirit level', 'String line'],
      materials: ['Battens: 70×45 SG8 H3.2 (typical for metal roof)', 'Purlin screws (hex-head Type 17)', 'Edge closure / end caps per roofing spec'],
      steps: [
        { title: 'Confirm batten spacing from the plan', body: 'Check the plan first — batten spacing is usually spec\'d there. If it\'s not on the plan, fall back to the roofing manufacturer\'s span table for your specific profile + BMT (base metal thickness) + pitch + wind zone. Tile spec is different again — usually 335–380 mm gauge depending on tile.', watchFor: 'Roofing manufacturers void warranty if batten spacing exceeds their spec. If you\'re working off the manufacturer table, print the spec sheet and keep it on site — don\'t guess a "typical" spacing.' },
        { title: 'Position first batten at eave line', body: 'Aligned with the fascia line. Fix into rafter / truss top chord with purlin screws.', watchFor: 'The eave batten is often the visible reference for straight fascia. If it\'s crooked, the whole roof reads crooked. Sight it in with a string line.' },
        { title: 'Mark batten centres up the roof', body: 'Working off the eave line, measure up the rafter and mark each batten centre at the spacing you set in step 2. Do it on both ends of the roof (and a middle rafter on wide roofs) so you can snap a chalk line across for every batten and end up dead parallel.', watchFor: 'Inconsistent spacing means the roofing sheet fasteners land in air on some rows. Measure and mark carefully — don\'t eyeball.' },
        { title: 'Fix each batten to every rafter it crosses', body: 'Fixing type and number per rafter crossing varies by plan / wind zone — could be one nail + one screw, or two purlin screws. Check the plan (or manufacturer spec for the batten system) for the required fixing pattern before starting.', watchFor: 'Under-fixed battens lift under wind uplift. Don\'t assume — read the spec and count fixings per crossing.' },
        { title: 'Join battens at a rafter — run one over, block the other', body: 'Run one batten fully across the top of the rafter. Tack a short block of batten offcut to the SIDE of the rafter, and land the next batten\'s end on that block. Screw both the continuous batten and the block-supported end into the rafter. Way stronger than butting two ends over the rafter face.', watchFor: 'A mid-span batten join fails as soon as the roofer walks it. Always join at a rafter and always run one batten fully across.' },
        { title: 'Confirm batten hold-down per wind zone', body: 'NZS 3604 wind zone Extra High may require bracket connections at some rafter crossings, not just screws. Check the wind-zone requirements before fixing.', watchFor: 'In coastal Extra High wind zones, standard screwed connections may not meet uplift. If the plan calls out brackets, use them.' },
        { title: 'Sight the whole roof before roofer arrives', body: 'All battens straight, spacing correct, no bows. Fix any wobble now — it telegraphs through the roofing sheet as visible ripples once installed.', watchFor: 'A wobble in the batten becomes a wobble in the roof forever. Two minutes with a string line pre-roofer saves a call-back post-roofer.' },
      ],
    },
    au: {
      tools: ['Tape', 'Chalk line', 'Drop / circular saw', 'Cordless drill / impact driver', 'Nail gun', 'Hammer', 'Spirit level', 'String line'],
      materials: ['Battens: 70×45 F14 hardwood or 70×45 MGP12 pine (H3 exterior)', 'Fixings per plan / manufacturer spec', 'Edge closure per roofing spec'],
      steps: [
        { title: 'Confirm batten spacing from the plan', body: 'Check the plan first — batten spacing is usually spec\'d there. If it\'s not on the plan, fall back to the roofing manufacturer\'s span table for your profile + BMT + pitch + wind classification. Tile spec is different — gauge per tile profile.', watchFor: 'Roofing manufacturers void warranty if spacing exceeds spec. If working off the manufacturer table, print + keep on site — don\'t guess a "typical" number.' },
        { title: 'Position first batten at eave line', body: 'Aligned with fascia line. Fix into rafter / truss top chord per plan / manufacturer spec.', watchFor: 'Eave batten is the visible reference for straight fascia. String-line it in.' },
        { title: 'Mark batten centres up the roof', body: 'Working off the eave line, measure up the rafter and mark each batten centre at the spacing you set in step 1. Do it on both ends of the roof (and a middle rafter on wide roofs) so you can snap a chalk line across for every batten and end up dead parallel.', watchFor: 'Inconsistent spacing = roofing screws land in air on some rows. Measure and mark carefully — don\'t eyeball.' },
        { title: 'Fix each batten to every rafter it crosses', body: 'Fixing type and number per rafter crossing varies by plan / wind classification. Check the plan (or manufacturer spec for the batten system) for the required fixing pattern before starting.', watchFor: 'Under-fixed battens lift under wind uplift. Don\'t assume — read the spec and count fixings per crossing.' },
        { title: 'Join battens at a rafter — run one over, block the other', body: 'Run one batten fully across the top of the rafter. Tack a short block of batten offcut to the SIDE of the rafter, and land the next batten\'s end on that block. Screw both the continuous batten and the block-supported end into the rafter. Way stronger than butting two ends over the rafter face.', watchFor: 'A mid-span join fails as soon as the roofer walks it. Always join at a rafter and always run one batten fully across.' },
        { title: 'Confirm hold-down per wind classification', body: 'AS 1684.2 wind classifications N4+ and cyclonic (C1–C4) may require bracket connections at some rafter crossings, not just screws.', watchFor: 'Coastal N4+ and cyclonic zones may not meet uplift with standard screws. Follow the plan\'s hold-down detail.' },
        { title: 'Sight the whole roof before roofer arrives', body: 'All battens straight, spacing correct, no bows. Fix wobbles now — they telegraph through the roofing sheet as visible ripples.', watchFor: 'Batten wobble = permanent roof wobble. Two minutes with a string line saves a call-back.' },
      ],
    },
  },

  // ─── Roofing & cladding — get the building weather-tight ─────────────────
  {
    id: 'install-metal-roof',
    category: 'roofing-cladding',
    phase: 'weather-tight',
    label: 'Install a metal roof',
    summary: 'Underlay over battens, then sheets from eave up, screws, ridge + barge + apron flashings.',
    nz: {
      tools: ['Tin snips', 'Cordless drill / impact driver', 'Hammer', 'Chalk line', 'Tape', 'Ladder + edge protection / harness', 'Sealant gun', 'Rivet gun', 'Staple gun (for underlay)'],
      materials: ['Roofing underlay (breather-type, self-supporting): Vapor Barrier, Sisalation, or similar per E2/AS1', 'Underlay staples or clout nails', 'Roofing sheet: Colorsteel Endura / MAXX / Magnaflow, profile per plan (Corrugate, Trapezoidal, Trimdek, Standing Seam)', 'Roofing screws: Type 17 hex-head with EPDM washer, colour-matched (through crown or valley per profile spec)', 'Ridge cap, barge cap, apron flashings (colour-matched Colorsteel)', 'Foam closures at ridge + eave', 'Rivets or self-drilling screws for flashing joints', 'Neutral-cure sealant, colour-matched'],
      steps: [
        { title: 'Confirm battens ready for roofing', body: 'Walk the roof — every batten straight, spacing correct, no bows, no missed fixings. Batten spacing must match the specific roofing profile\'s span table (varies by profile, BMT, pitch, and wind zone).', watchFor: 'Roofing manufacturer voids warranty if batten spacing exceeds spec. Have the printed spec on site — don\'t rely on a "typical" number.' },
        { title: 'Lay roofing underlay over the battens', body: 'Underlay goes OVER the battens, not under. Roll perpendicular to the battens, starting at the eave, working upward. Overlap runs (lap direction + width per manufacturer). Fix per underlay spec. Roofing sheets will screw through the underlay into the batten below.', watchFor: 'Wrong-side-up underlay stops the moisture-shedding function. Look for the printed "This side up" marking before rolling out.' },
        { title: 'Position first sheet at eave', body: 'Run a string line along the eave, offset from the bottom edge of where the sheet will sit — that\'s your alignment reference for every sheet across the roof. Square the first sheet to the string. Overhang past fascia line per manufacturer. If a valley or hip is on the same side, cut-fit at that end first.', watchFor: 'A crooked first sheet cascades across the roof. Get it square to the string before screwing.' },
        { title: 'Fix with roofing screws to spec', body: 'For roofing, screws almost always go through the crown (high rib) — that keeps the fixing above the water line. Through-valley fixings are for wall cladding, not roof. Fixing pattern (which crossings get a screw, and how many per sheet at eave / ridge / edges) varies by profile, wind zone, and manufacturer — check the roofing spec + plan for your job before starting.', watchFor: 'Over-tightening crushes the washer + kinks the sheet. Snug just enough that the EPDM washer squeezes 1/3 flat, no more.' },
        { title: 'Lay subsequent sheets side-lap', body: 'Side-lap direction should be AWAY from prevailing wind (upwind sheet on top of downwind sheet). Lap width per profile — usually one full pan.', watchFor: 'Reversed side-lap = wind drives rain UNDER the lap. Check the wind rose for the site before starting.' },
        { title: 'Work up the roof, full rows first', body: 'Fit full sheets on the low rows and full ones going up. Save cut-in sheets at hips / valleys / penetrations for last.', watchFor: 'Cut sheets are fiddly. Doing them last means you can focus effort where it matters, not slow down the main pack.' },
        { title: 'Fit ridge, barge, apron flashings', body: 'Ridge cap over foam closure, screwed through both sides into the top rib of the sheet. Barge cap along gables. Apron flashing where roof meets a wall.', watchFor: 'Missed foam closure = birds and vermin nest in the roof. Cheap product, huge grief if skipped.' },
        { title: 'Seal + rivet flashing joints', body: 'Any flashing-to-flashing joint gets a rivet + sealant. Any exposed screw head (usually just flashings) gets a sealant dot.', watchFor: 'Silicone-only joints without rivets pull apart in wind. Rivet then seal, not one or the other.' },
        { title: 'Check hold-down per wind zone', body: 'NZS 3604 wind zone Extra High needs extra screws on the ends of every sheet. Confirm the schedule + count fastenings.', watchFor: 'Coastal Extra High wind zones peel roofs off if under-fastened. Count screws sheet-by-sheet in these zones.' },
      ],
    },
    au: {
      tools: ['Tin snips', 'Cordless drill / impact driver', 'Hammer', 'Chalk line', 'Tape', 'Ladder + edge protection / harness', 'Sealant gun', 'Rivet gun', 'Staple gun (for underlay)'],
      materials: ['Roofing underlay (foil-faced sarking or breather): per AS 4200', 'Underlay staples or clout nails', 'Roofing sheet: BlueScope COLORBOND (painted) or Zincalume (unpainted), profile per plan (Corrugated, Trimdek, Klip-Lok, Standing Seam)', 'Roofing screws: Type 17 hex-head with EPDM washer, colour-matched (through crown or valley per profile)', 'Ridge cap, barge cap, apron flashings (colour-matched)', 'Foam closures at ridge + eave', 'Rivets or self-drilling screws for flashing joints', 'Neutral-cure sealant, colour-matched'],
      steps: [
        { title: 'Confirm battens ready for roofing', body: 'Walk the roof — every batten straight, spacing correct, no bows, no missed fixings. Batten spacing must match roofing profile spec per AS 1562.1 + manufacturer.', watchFor: 'Warranty voids if spacing exceeds spec. Have printed spec on site.' },
        { title: 'Lay roofing underlay over the battens', body: 'Underlay goes OVER the battens, not under. Roll perpendicular to the battens from eave upward. Overlap runs (lap direction + width per manufacturer). Fix per underlay spec. Roofing sheets will screw through the underlay into the batten below.', watchFor: 'Wrong-side-up sarking loses the reflective / moisture function. Check the "This side up" printing before rolling.' },
        { title: 'Position first sheet at eave', body: 'Run a string line along the eave, offset from the bottom edge of where the sheet will sit — that\'s your alignment reference for every sheet across the roof. Square the first sheet to the string. Overhang past fascia per manufacturer. Cut-fit at valley / hip end first if present.', watchFor: 'Crooked first sheet cascades across roof. Square to the string before screwing.' },
        { title: 'Fix with roofing screws to spec', body: 'For roofing, screws almost always go through the crown (high rib) — keeps the fixing above the water line. Through-valley fixings are for wall cladding, not roof. Fixing pattern (which crossings get a screw, and how many per sheet at eave / ridge / edges) varies by profile, wind class, and manufacturer — check the roofing spec + plan for your job before starting.', watchFor: 'Over-tight crushes washer + kinks sheet. Snug so EPDM squeezes 1/3 flat, no more.' },
        { title: 'Lay subsequent sheets side-lap', body: 'Side-lap direction AWAY from prevailing wind (upwind sheet on top of downwind). Lap width per profile — usually one full pan.', watchFor: 'Reversed side-lap = wind drives rain under lap. Check wind rose before starting.' },
        { title: 'Work up the roof, full rows first', body: 'Full sheets on the low rows and up. Cut-in sheets at hips / valleys / penetrations last.', watchFor: 'Cut sheets are fiddly. Last position means you can focus effort where it matters.' },
        { title: 'Fit ridge, barge, apron flashings', body: 'Ridge cap over foam closure, screwed both sides into top rib. Barge cap along gables. Apron where roof meets wall.', watchFor: 'Missed foam closure = birds + vermin nest inside. Cheap product, huge grief if skipped.' },
        { title: 'Seal + rivet flashing joints', body: 'Flashing-to-flashing joints: rivet + sealant. Exposed screw heads (mostly flashings): sealant dot.', watchFor: 'Silicone-only without rivets pulls apart in wind. Rivet then seal.' },
        { title: 'Check hold-down per wind classification', body: 'AS 1562.1 + AS 1170.2 wind loads. N4+ and cyclonic (C1–C4) need extra screws at sheet ends + all edges.', watchFor: 'Coastal cyclonic zones peel roofs off if under-fastened. Count screws sheet-by-sheet in these zones.' },
      ],
    },
  },
  {
    id: 'install-soffit',
    category: 'roofing-cladding',
    phase: 'weather-tight',
    label: 'Install soffit lining',
    summary: 'Ribbon plate to wall, cut sheets, fix to ribbon plate + fascia, vent.',
    nz: {
      tools: ['Tape', 'Circular saw', 'Fibre-cement shears', 'Cordless drill / impact driver', 'Hammer', 'Staple gun', 'Chalk line', 'Utility knife', 'Ladder / trestle'],
      materials: ['Soffit lining: HardieSoffit (fibre-cement, pre-primed), or plywood (marine or exterior), or PVC', 'Ribbon plate: 40×20 or 90×45 H3.2 pine, screwed to wall studs', 'Fixings: FC nails for HardieSoffit (per Hardie spec); other linings per manufacturer spec', 'Sealant (paintable acrylic) for joins', 'Soffit vents (round or slot type) if roof needs ventilation'],
      steps: [
        { title: 'Set out the ribbon plate along the wall', body: 'Transfer the fascia level across to the wall at both ends of the run, then chalk a line between the two marks. Fix the ribbon plate along that chalk line into wall studs with 100 mm bugle screws.', watchFor: 'If the ends aren\'t level to each other, the soffit tilts. Sight along after fixing.' },
        { title: 'Confirm soffit width', body: 'Measure from wall face to inside of fascia. That\'s your soffit sheet width. If unsupported span is > 450 mm, add intermediate support (rafter tail block or intermediate ribbon).', watchFor: 'Long unsupported spans sag over time. Add intermediate support for anything over 600 mm.' },
        { title: 'Cut sheets to width', body: 'Rip HardieSoffit or plywood with a circular saw or fibre-cement shears. Wear PPE for FC — silica dust. Cut lengths to run along the eave.', watchFor: 'FC dust is regulated occupational hazard in NZ (WorkSafe). Wet-cut or vac-attach; FFP3 mask.' },
        { title: 'Fix sheets to ribbon plate + fascia', body: 'Push the sheet up hard into the fascia groove — no gap along that edge — then run the other edge onto the ribbon plate. HardieSoffit (fibre-cement) is usually nailed with galv FC nails per Hardie spec; other soffit materials (ply, PVC, cedar lining) follow the manufacturer\'s fixing spec.', watchFor: 'Any gap between the sheet and the fascia groove shows up as a black line from below and lets wind + vermin in. Push it hard before fixing. Overdriven FC nails crack the sheet + create a moisture path — nail heads sit flush or slightly proud, never sunk below the surface.' },
        { title: 'Cut in soffit vents', body: 'If the roof needs ventilation (most NZ roofs do — E3 requires airflow into skillion / cathedral roofs), cut round or slot vents through the soffit at spacing per manufacturer.', watchFor: 'Un-vented sarking roofs cook in summer + condense in winter. If E3 requires vents, don\'t skip them.' },
      ],
    },
    au: {
      tools: ['Tape', 'Circular saw', 'Fibre-cement shears', 'Cordless drill / impact driver', 'Hammer', 'Staple gun', 'Chalk line', 'Utility knife', 'Ladder / trestle'],
      materials: ['Soffit lining: HardieSoffit (fibre-cement), plywood (marine / exterior), or PVC', 'Ribbon plate: 40×20 or 90×45 H3-treated pine, screwed to wall studs', 'Fixings: FC nails for HardieSoffit (per Hardie spec); other linings per manufacturer spec', 'Sealant (paintable acrylic) for joins', 'Soffit vents (per NCC requirements + wind class)'],
      steps: [
        { title: 'Set out the ribbon plate along the wall', body: 'Transfer the fascia level across to the wall at both ends of the run, then chalk a line between the two marks. Fix the ribbon plate along that chalk line into wall studs with 100 mm Type 17s.', watchFor: 'If the ends aren\'t level to each other, the soffit tilts. Sight along after fixing.' },
        { title: 'Confirm soffit width', body: 'Measure wall face to inside of fascia. That\'s your sheet width. Unsupported span > 450 mm needs intermediate support.', watchFor: 'Long unsupported spans sag. Intermediate support over 600 mm.' },
        { title: 'Cut sheets to width', body: 'Rip HardieSoffit or ply with a circular saw or fibre-cement shears. PPE for FC — silica dust. Cut lengths to run along eave.', watchFor: 'FC dust is regulated (SafeWork). Wet-cut or vac-attach; FFP3 mask.' },
        { title: 'Fix sheets to ribbon plate + fascia', body: 'Push the sheet up hard into the fascia groove — no gap along that edge — then run the other edge onto the ribbon plate. HardieSoffit (fibre-cement) is usually nailed with galv FC nails per Hardie spec; other soffit materials (ply, PVC, cedar lining) follow the manufacturer\'s fixing spec.', watchFor: 'Any gap between the sheet and the fascia groove shows up as a black line from below and lets wind + vermin in. Push it hard before fixing. Overdriven FC nails crack the sheet + create a moisture path — nail heads sit flush or slightly proud, never sunk below the surface.' },
        { title: 'Cut in soffit vents', body: 'Roof ventilation per NCC — sarked / cathedral roofs typically need airflow. Cut round or slot vents through soffit per manufacturer spacing.', watchFor: 'Un-vented sarking roofs cook in summer + condense in winter. If NCC requires vents, don\'t skip.' },
      ],
    },
  },
  {
    id: 'install-window',
    category: 'doors-windows',
    phase: 'weather-tight',
    label: 'Install a window',
    summary: 'Sill flashing, tape sequence, pack + plumb, screw off.',
    nz: {
      tools: ['Tape', 'Spirit level (short + long)', 'Cordless drill / impact driver', 'Drop / circular saw', 'Sealant gun', 'Staple gun', 'Utility knife', 'Hammer', 'Ladder / trestle'],
      materials: ['Window unit (aluminium joinery: APL group — Vantage / Metro / Altherm)', 'Timber or plastic packers', 'Sill flashing (extruded metal, colour-matched)', 'Sill flashing tape (butyl, 300 mm wide typical)', 'Head flashing tape', 'WANZ support bar (or manufacturer-equivalent sill support)', 'Neutral-cure sealant (Bostik or Sika)', 'Countersunk screws through window jamb (per manufacturer)'],
      steps: [
        { title: 'Check opening measurements before install', body: 'Before you lift the window in, measure the actual rough opening (height + width at top, middle, and bottom) and cross-check against the window unit size. Rough opening should be window frame + 10–20 mm clearance each side + a bit of packing at sill for adjustment. If the framing is out, sort that first — don\'t try to make a wrong opening work with packers.', watchFor: 'A window forced into an out-of-square opening leaks, binds, and can\'t be plumbed. Verify the opening every time — framing shifts between order and install.' },
        { title: 'Apply sill + head flashing tapes to the opening', body: 'Butyl flashing tape across the sill (up each jamb 150 mm) and at each top corner (down and out 150 mm from the corner onto the wrap). Hand-roll to bond.', watchFor: 'Cold weather (<10 °C) stops butyl tape adhering. Warm the surface with a heat gun or postpone.' },
        { title: 'Position window in opening', body: 'Lift into opening, sit on sill packers to bring to correct RL. Set the window into the opening so the interior face of the jamb sits proud of the framing by the wall-lining thickness (usually 10 mm gib) — that gives the gib a flush finish against the jamb. Plumb + level in both directions.', watchFor: 'Windows out of level bind on the sash rails. Get level within 2 mm before screwing off.' },
        { title: 'Screw the window into the framing', body: 'Countersunk screws through the jamb into stud / head / sill — pre-drilled and countersunk so the heads sit below the surface for filling before paint. Fix at the manufacturer\'s spec\'d centres (typically 450–600 mm c/c). Start at one bottom corner, work around to the opposite corner, checking plumb + level as you go.', watchFor: 'Overtightening warps the jamb + cracks the seal. Snug — not gorilla-tight.' },
        { title: 'Fit the WANZ support bar under the sill', body: 'Slide the WANZ bar (or manufacturer-equivalent sill support) in under the window sill and fix off to the framing. The bar transfers the window\'s weight to the structural framing so the load doesn\'t sit on packers long-term. Some installers pre-fit the bar and lower the window onto it — either sequence works as long as the bar is in before the window is loaded.', watchFor: 'Leaving the window on packers alone = packers compress + the sill drops over time, cracking the seal and jamming sashes. WANZ bar (or equivalent) is required by E2/AS1 and most manufacturer install specs.' },
        { title: 'Tape over the metal head flashing', body: 'After the metal head flashing is over the top of the window, run a strip of flashing tape along its top edge onto the wall wrap. Different tape and different job to the head flashing tape you put on in step 2 — this one seals the top edge of the metal flashing to the wrap so water sheds over the flashing, not behind it.', watchFor: 'Untaped metal head flashing = water tracks down the wrap and behind the flashing. Tape the top edge.' },
        { title: 'Check operation + weatherseals', body: 'Slide / open every sash — should glide, latch cleanly, and seal against the frame weatherstrip. Adjust rollers if binding.', watchFor: 'A sash that binds now will get worse as the frame settles. Fix it before you finish the day, not after linings go on.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (short + long)', 'Cordless drill / impact driver', 'Drop / circular saw', 'Sealant gun', 'Staple gun', 'Utility knife', 'Hammer', 'Ladder / trestle'],
      materials: ['Window unit (aluminium joinery: A&L / Trend / Rylock / Stegbar) — BAL-rated in bushfire zones', 'Timber or plastic packers', 'Sill flashing (extruded, colour-matched)', 'Sill flashing tape (butyl, 300 mm wide typical)', 'Head flashing tape', 'Neutral-cure sealant', 'Countersunk screws through window jamb (per manufacturer)'],
      steps: [
        { title: 'Check opening measurements before install', body: 'Before you lift the window in, measure the actual rough opening (height + width at top, middle, and bottom) and cross-check against the window unit size. Rough opening = frame + 10–20 mm each side + a bit of packing at sill. If the framing is out, sort that first — don\'t try to make a wrong opening work with packers. In BAL zones (BAL 12.5 and up), also verify the window unit\'s BAL rating matches the permit.', watchFor: 'A window forced into an out-of-square opening leaks, binds, and can\'t be plumbed. Verify the opening every time — framing shifts between order and install.' },
        { title: 'Apply sill + head flashing tapes to the opening', body: 'Butyl flashing tape across the sill (up each jamb 150 mm) and at each top corner (down and out 150 mm from the corner onto the wrap). Hand-roll to bond.', watchFor: 'Cold weather (<10 °C) stops butyl adhering. Warm with heat gun or postpone.' },
        { title: 'Position window in opening', body: 'Lift into opening, sit on sill packers to correct RL. Set the window into the opening so the interior face of the jamb sits proud of the framing by the wall-lining thickness (usually 10 mm plasterboard) — that gives the plasterboard a flush finish against the reveal. Plumb + level both directions.', watchFor: 'Out-of-level windows bind on the sash rails. Level within 2 mm before screwing.' },
        { title: 'Screw the window into the framing', body: 'Countersunk screws through the jamb into stud / head / sill — pre-drilled and countersunk so heads sit below the surface for filling before paint. Manufacturer\'s spec\'d centres (typically 450–600 mm c/c). Start bottom corner, work around to opposite corner, checking plumb + level.', watchFor: 'Overtightening warps jamb + cracks the seal. Snug, not gorilla-tight.' },
        { title: 'Tape over the metal head flashing', body: 'After the metal head flashing is over the top of the window, run a strip of flashing tape along its top edge onto the wall wrap. Different tape and different job to the head flashing tape you put on in step 2 — this one seals the top edge of the metal flashing to the wrap so water sheds over the flashing, not behind it.', watchFor: 'Untaped metal head flashing = water tracks down the wrap and behind the flashing. Tape the top edge.' },
        { title: 'Check operation + weatherseals', body: 'Slide / open every sash — must glide, latch cleanly, seal against weatherstrip. Adjust rollers if binding.', watchFor: 'A sash that binds now gets worse as the frame settles. Fix before end of day.' },
      ],
    },
  },
  {
    id: 'install-external-door',
    category: 'doors-windows',
    phase: 'weather-tight',
    label: 'Install an external door',
    summary: 'Threshold, weatherseal, plumb jamb, latch + lock.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Chisel', 'Hammer', 'Drop saw', 'Sealant gun', 'Utility knife', 'Screwdriver', 'Hole saw kit (54 mm + 25 mm for lockset)'],
      materials: ['External door slab (solid core, exterior-grade) or pre-hung set', 'Door jamb + head (H3.2 or dry-treated pine, weatherproofed)', 'Threshold / sill (aluminium extruded, weatherstrip-ready)', 'Weatherseal strip (compression seal for jambs + head)', 'Packers', 'Countersunk screws through jamb (heads filled before paint)', 'Sealant (neutral-cure)', 'Butt hinges (3 per door, 100 × 75 × 3 mm heavy-duty)'],
      steps: [
        { title: 'Confirm opening + door dimensions', body: 'Rough opening = jamb width + door width + 15 mm clearance each side. Head height = door + jamb + 10 mm clearance. Confirm threshold detail matches what\'s spec\'d.', watchFor: 'External openings often need reinforced jamb studs. Check the framing plan — under-sized studs to a heavy exterior door will bow.' },
        { title: 'Position pre-hung jamb (or build jamb + lift in)', body: 'Sit pre-hung frame in opening on threshold. Pack under sill and jambs. If building the jamb yourself: assemble it flat on the floor (head + jamb sides + threshold squared up), then stand it upright — sit both jamb legs on the ground and put a spirit level on the head. If the head isn\'t level, trim the high jamb leg until it is. Then lift the finished frame into the opening — way easier to keep square on the ground than piecing it together in the hole. Check jamb width matches door + 5 mm gap total before you lift.', watchFor: 'A pre-hung external door + frame is 30+ kg. Solo works but awkward to hold vertical + push into a snug opening — a hand keeps it from tipping.' },
        { title: 'Plumb hinge-side jamb + fix', body: 'Long spirit level on hinge-side jamb. Pack + plumb both faces. Fix through jamb into stud with countersunk screws (pre-drilled, heads sunk below the surface for filling before paint) at desired centres — usually 400–600 mm — avoiding the strike-height area, which gets cut out later.', watchFor: 'Plumb ONE face at a time, both must be plumb. A jamb plumb in one plane and tilted in the other means the door sags to one side when opened.' },
        { title: 'Hang door + check swing', body: 'If pre-hung, door is already on. If not: fit 3× 100 mm butt hinges (top, middle, bottom), lift door onto hinge pins. Test swing — should not bind on jamb, threshold, or head.', watchFor: 'Bind on the latch side = jamb not plumb OR door not squared to jamb. Adjust packers before permanently screwing.' },
        { title: 'Fix latch-side jamb + strike', body: 'Close door + pack latch-side jamb to a consistent 3 mm gap along the full length. Fix through packers with countersunk screws. Fit strike plate into jamb — chisel out, screw off.', watchFor: 'Inconsistent latch-side gap = door won\'t latch cleanly. 3 mm dead all the way top-to-bottom.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Chisel', 'Hammer', 'Drop saw', 'Sealant gun', 'Utility knife', 'Screwdriver', 'Hole saw kit (54 mm + 25 mm for lockset)'],
      materials: ['External door slab (solid core, exterior-grade — BAL-rated in bushfire zones) or pre-hung set', 'Door jamb + head (H3-treated pine or weatherproofed hardwood)', 'Threshold / sill (aluminium extruded)', 'Weatherseal strip', 'Packers', 'Countersunk screws through jamb (heads filled before paint)', 'Sealant (neutral-cure)', 'Butt hinges (3 per door, 100 × 75 × 3 mm heavy-duty)'],
      steps: [
        { title: 'Confirm opening + door dimensions', body: 'Rough opening = jamb width + door width + 15 mm clearance each side. Head height = door + jamb + 10 mm. In BAL zones, confirm door slab is BAL-rated (solid timber or metal, no glazing above BAL 29 for most doors).', watchFor: 'External openings often need reinforced jamb studs. Check framing plan — under-sized studs bow under a heavy exterior door.' },
        { title: 'Position pre-hung jamb (or build jamb + lift in)', body: 'Sit pre-hung frame in opening on threshold. Pack under sill + jambs. If building the jamb yourself: assemble it flat on the floor (head + jamb sides + threshold squared up), then stand it upright — sit both jamb legs on the ground and put a spirit level on the head. If the head isn\'t level, trim the high jamb leg until it is. Then lift the finished frame into the opening — way easier to keep square on the ground than piecing it together in the hole. Check jamb width = door + 5 mm total gap before you lift.', watchFor: 'Pre-hung external door + frame is 30+ kg. Solo works but awkward — a hand keeps it from tipping into a snug opening.' },
        { title: 'Plumb hinge-side jamb + fix', body: 'Long spirit level on hinge-side jamb. Pack + plumb both faces. Fix through jamb into stud with countersunk screws (pre-drilled, heads sunk below the surface for filling before paint) at desired centres — usually 400–600 mm — avoiding the strike-height area, which gets cut out later.', watchFor: 'Plumb ONE face at a time — both faces must be plumb. Plumb one plane + tilted other = door sags to one side.' },
        { title: 'Hang door + check swing', body: 'If pre-hung, door is on. If not: fit 3× butt hinges, lift onto pins. Test swing — no bind on jamb, threshold, or head.', watchFor: 'Latch-side bind = jamb not plumb OR door not squared. Adjust packers before permanent screwing.' },
        { title: 'Fix latch-side jamb + strike', body: 'Close door + pack latch-side jamb to 3 mm gap all the way. Fix through packers with countersunk screws. Chisel strike into jamb, screw off.', watchFor: 'Inconsistent gap = won\'t latch cleanly. 3 mm dead top to bottom.' },
      ],
    },
  },
  {
    id: 'install-bifold',
    category: 'doors-windows',
    phase: 'weather-tight',
    label: 'Install a bifold door',
    summary: 'Head track, panels, roller adjust, lock hardware.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Drop saw', 'Chisel', 'Hammer', 'Sealant gun', 'Ladder / trestle', 'Torque driver (for roller adjustment)'],
      materials: ['Bifold door set (LG, Cellini, Centor, or spec\'d)', 'Head track (aluminium, engineered to carry panel weight)', 'Bottom guide or floor pivot (depends on top-hung vs bottom-hung)', 'Roller / pivot hardware (supplied with set)', 'Locks + handles (usually European-cylinder mortice lock at meeting stile)', 'Weatherseals (for external bifolds)', 'Head-track fixings per the bifold manufacturer (screws or through-bolts to lintel above)'],
      steps: [
        { title: 'Read the manufacturer install guide', body: 'Every bifold system is different — LG, Cellini, and Centor all use different roller heights, track profiles, and adjustment mechanisms. Read the specific guide for the set you\'re installing before you touch it.', watchFor: 'Guessing off memory from a previous bifold install is how you fit a panel upside down. Take 15 min with the guide first.' },
        { title: 'Confirm the lintel can carry the load', body: 'External patio bifolds hang from the head track — a 4-panel 3.6 m bifold set weighs 80–120 kg. Confirm lintel size matches the load per NZS 3604 8.5 or engineer.', watchFor: 'A standard NZS 3604 lintel is often UNDER-sized for a bifold opening. If the plan calls for an engineered lintel, don\'t substitute.' },
        { title: 'Verify opening is square + plumb', body: 'Measure diagonals — must match to within 3 mm. Plumb both jambs. Level head + threshold. Bifold hardware has minimal adjustment; the opening has to be right.', watchFor: 'A twisted opening = bifold panels won\'t close flat and won\'t seal at the weatherstrip. Get the opening right before ordering.' },
        { title: 'Fix head track', body: 'Level head track along its full length (use packers if needed). Fix through into the lintel using the fixings the manufacturer recommends, at spacing spec\'d by the manufacturer (typically 300–400 mm).', watchFor: 'Under-fixing the head track = track pulls down under panel weight and bifold binds. Follow the fixing schedule exactly.' },
        { title: 'Fix bottom track / guide', body: 'Bottom-rolling bifolds: full-length bottom track, level, fixed through into threshold or floor. Top-hung bifolds: floor pivot at each end + bottom guide only at meeting stile.', watchFor: 'Bottom-track systems have a drainage detail — DPC or drainage weep holes. Skip these and water ponds in the track.' },
        { title: 'Hang panels + hook to track', body: 'Panels usually hinged together in pairs. Lift the first pair, hook the roller into the head track, drop into the bottom track / pivot. Move to next pair.', watchFor: 'Bifold panels are 20–40 kg each and want to swing while you\'re lifting. Two people, and have someone hold the panels closed while you position the roller.' },
        { title: 'Adjust rollers for panel alignment', body: 'Every roller has a height adjustment (usually a hex screw). Level each panel with a spirit level along top + bottom edges. Adjust until all panels close flat with even gaps between.', watchFor: 'Rushed roller adjustment = uneven gaps between panels + weatherstrip binding on one side. Take the time to level each panel.' },
        { title: 'Fit locks, handles, weatherseals', body: 'Meeting-stile mortice lock cut into the correct panel per the door schedule. Weatherseal compression strip along jambs + head + between panels. Test locking + opening full range.', watchFor: 'External bifolds without weatherseals leak air + water at every panel join. Fit them; the door is not weather-tight without.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Drop saw', 'Chisel', 'Hammer', 'Sealant gun', 'Ladder / trestle', 'Torque driver'],
      materials: ['Bifold door set (LG, Centor, Cavity Sliders, or spec\'d)', 'Head track (aluminium, engineered)', 'Bottom guide or floor pivot', 'Roller / pivot hardware (supplied)', 'Locks + handles (Euro-cylinder mortice at meeting stile)', 'Weatherseals (external)', 'Head-track fixings per the bifold manufacturer (screws or through-bolts to lintel)'],
      steps: [
        { title: 'Read the manufacturer install guide', body: 'Every system differs — LG, Centor, Cavity Sliders all use different roller heights + adjustments. Read the specific guide before you start.', watchFor: 'Guessing off memory = upside-down panel. 15 min with the guide first.' },
        { title: 'Confirm lintel can carry the load', body: 'External patio bifolds — a 4-panel 3.6 m set weighs 80–120 kg. Confirm lintel size per AS 1684.2 tables or engineer. In BAL zones, glazing must be BAL-rated.', watchFor: 'Standard AS 1684 lintel is often UNDER-sized for bifold openings. If plan spec\'d an engineered lintel, don\'t substitute.' },
        { title: 'Verify opening is square + plumb', body: 'Diagonals match to 3 mm. Both jambs plumb. Head + threshold level. Bifolds have minimal adjustment — opening must be right.', watchFor: 'Twisted opening = panels don\'t close flat + weatherstrip fails. Get opening right pre-order.' },
        { title: 'Fix head track', body: 'Level head track full length (packers if needed). Fix through into the lintel using the fixings the manufacturer recommends, at spec\'d spacing (typically 300–400 mm).', watchFor: 'Under-fixed head track pulls down under panel weight, bifold binds. Follow fixing schedule.' },
        { title: 'Fix bottom track / guide', body: 'Bottom-roller bifolds: full-length track, level, fixed into threshold. Top-hung: floor pivot each end + bottom guide at meeting stile only.', watchFor: 'Bottom-track systems need drainage weeps or DPC. Skip = water ponds in the track.' },
        { title: 'Hang panels', body: 'Panels usually hinged in pairs. Lift, hook roller into head track, drop into bottom track / pivot. Two people minimum.', watchFor: '20–40 kg per panel + they swing during lift. Someone holds panels closed while you position the roller.' },
        { title: 'Adjust rollers for panel alignment', body: 'Each roller has height adjustment (hex screw usually). Level each panel top + bottom. Adjust until all close flat with even gaps.', watchFor: 'Rushed adjustment = uneven gaps + weatherstrip binding. Take time to level each panel.' },
        { title: 'Fit locks, handles, weatherseals', body: 'Meeting-stile mortice lock in correct panel per schedule. Compression weatherseal along jambs + head + panel joints. Test lock + full range.', watchFor: 'External bifolds without weatherseals leak at every join. Fit them.' },
      ],
    },
  },
  {
    id: 'install-cavity-battens',
    category: 'roofing-cladding',
    phase: 'weather-tight',
    label: 'Install cavity battens',
    summary: 'Vermin strip / cavity closer, vertical battens, cavity closer top + bottom.',
    nz: {
      tools: ['Tape', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Utility knife', 'Sealant gun', 'Straight edge'],
      materials: ['Battens: 20 mm × 45 mm H3.2 kiln-dried pine (per E2/AS1 cavity depth)', 'Fastenings per the cladding manufacturer\'s spec (through batten + wrap into stud)', 'Vermin strip / cavity closer at cavity base', 'Neutral-cure sealant'],
      steps: [
        { title: 'Confirm cavity depth requirement', body: 'E2/AS1 requires a drained + ventilated cavity for absorbent claddings (weatherboards, most fibre-cement, natural stone). Cavity depth 20 mm is the standard NZ minimum.', watchFor: 'Direct-fix (no cavity) is only allowed for specific claddings + only in some risk zones. Check the E2 risk matrix — assuming direct-fix is OK where cavity is required is a common consent-failure.' },
        { title: 'Fit vermin strip / cavity closer at cavity base', body: 'Fix the vermin strip / cavity closer along the bottom of the cavity, over the bottom plate + wrap. Closes the cavity at the base while still allowing drainage + airflow, and stops rodents + insects getting into the cavity.', watchFor: 'Uncovered cavity base = mice + wasps nest in the wall. Use the closer that matches your cladding system — some suppliers spec a specific product.' },
        { title: 'Fix battens to studs', body: 'Battens fix to studs, not to the wrap itself. Ensure you\'re nailing into a stud every time.', watchFor: 'Missing the stud = nail only grips the wrap, and the batten pulls off the first time the cladder leans on it.' },
        { title: 'Cut + fix battens vertically', body: 'Cut 20 mm × 45 mm H3.2 pine battens to wall height. Position over each stud line, fix through into the stud at 300 mm c/c — fastener per the cladding manufacturer\'s spec.', watchFor: 'Fastenings should grip a good depth of stud through the wrap — the manufacturer\'s spec accounts for this.' },
        { title: 'Check batten straightness', body: 'Once all battens are up, run a straight edge over them to pick up any high or low spots. Pack out any low batten with off-cut shims + fix off, and plane down any high spots so the cladding lands on a flat plane.', watchFor: 'Bowed battens telegraph through the cladding as a visible wave. Get straight before cladder starts.' },
        { title: 'Trim + seal around openings', body: 'Cavity closers or trim strips around windows + doors — proprietary product from cladding supplier. Seal any exposed batten cut ends.', watchFor: 'A cavity that terminates in a raw opening leaks air + collects water. Close it off with the manufacturer\'s detail.' },
      ],
    },
    au: {
      tools: ['Tape', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Utility knife', 'Sealant gun', 'Straight edge'],
      materials: ['Battens: 20 mm × 45 mm H3-treated pine (some states + wind classes 40 mm)', 'Fastenings per the cladding manufacturer\'s spec (through batten + wrap into stud)', 'Vermin strip / cavity closer at cavity base', 'Neutral-cure sealant'],
      steps: [
        { title: 'Confirm cavity depth + requirement', body: 'NCC Vol 2 3.5 covers weatherproofing; some cladding systems (weatherboards over sarking, most FC systems) require cavity for drainage. Depth 20 mm min, more in high-exposure climate zones.', watchFor: 'Direct-fix vs cavity is cladding-specific. Check the cladding manufacturer\'s install guide — assuming direct-fix where cavity is spec\'d fails the compliance.' },
        { title: 'Fit vermin strip / cavity closer at cavity base', body: 'Fix the vermin strip / cavity closer along the bottom of the cavity, over the bottom plate + wrap. Closes the cavity at the base while still allowing drainage + airflow, and stops rodents + insects getting into the cavity.', watchFor: 'Uncovered cavity base = mice + wasps + termite pathway. Use the closer that matches your cladding system — some suppliers spec a specific product.' },
        { title: 'Fix battens to studs', body: 'Battens fix to studs, not wrap. Ensure you\'re nailing into a stud every time.', watchFor: 'Missing the stud = nail grips only wrap, batten pulls off when cladder leans on it.' },
        { title: 'Cut + fix battens vertically', body: 'Cut 20×45 H3 pine to wall height. Position over each stud line, fix through into the stud at 300 mm c/c — fastener per the cladding manufacturer\'s spec.', watchFor: 'Fastenings should grip a good depth of stud through the wrap — the manufacturer\'s spec accounts for this.' },
        { title: 'Check batten straightness', body: 'Once all battens are up, run a straight edge over them to pick up high or low spots. Pack out any low batten with shims + fix off, and plane down any high spots so the cladding lands on a flat plane.', watchFor: 'Bowed battens telegraph through cladding as visible waves. Straight before cladder starts.' },
        { title: 'Trim + seal around openings', body: 'Cavity closers / trim strips around windows + doors — proprietary from cladding supplier. Seal exposed cut ends.', watchFor: 'Cavity terminating in a raw opening leaks air + collects water. Close off with manufacturer detail.' },
      ],
    },
  },
  {
    id: 'install-weatherboards',
    category: 'roofing-cladding',
    phase: 'weather-tight',
    label: 'Install weatherboard cladding',
    summary: 'Story rod, first board, up the wall, corners.',
    nz: {
      tools: ['Chalk line', 'Drop / block saw', 'Hammer', 'Cordless drill', 'Tape', 'Spirit level', 'Mitre saw', 'Sealant gun', 'Story rod', 'Nail punch'],
      materials: ['Weatherboards: Bevel-back, rusticated, or shiplap H3.2 dressed pine (or Palliside / Titan pre-primed)', 'Corner mould or scriber board', 'Nails: 60 mm hot-dipped galv jolt-head, or stainless steel for coastal', 'Primer / undercoat for cut ends', 'Paintable acrylic sealant', 'Head + sill flashings (colour-matched, ordered with joinery)'],
      steps: [
        { title: 'Confirm corners are fixed plumb + straight before starting', body: 'If the profile calls for the internal + external corners to go on first (corner mould / scriber boards fixed before the boards run into them), get all of them up, plumb, and straight before you start any weatherboard runs. Boards butt straight into the fixed corner — if the corner isn\'t plumb, every board on that wall reads out.', watchFor: 'Some profiles fit corners AFTER the boards (mould covers the butt-cut ends). Check the profile detail first — this step only applies if corners go on first.' },
        { title: 'Set out with a story rod', body: 'Make a story rod (a straight timber marked with each board course from eave down to sill height). The rod is your reference for every wall — every board lines up with rod marks.', watchFor: 'Setting out by measuring each course cumulatively drifts. Use one story rod everywhere so courses land at the same height on every wall.' },
        { title: 'Prime all cut ends', body: 'Every cut end of every board gets a coat of primer before fixing. Cut ends absorb water fastest — unprimed = rot within 5 years.', watchFor: 'Skipping primer on cut ends is one of the top-3 causes of premature rot in weatherboard walls.' },
        { title: 'Lay first board at wall base', body: 'Set the first board at the base of the wall to the height off the story rod, level along the top edge. Check with a string line for straightness along the run.', watchFor: 'First board out of level compounds up the wall. Take the time to level.' },
        { title: 'Blind-nail per profile', body: 'Bevel-back: nail high on the board so next board covers the nail. Rusticated: nail through the tongue so next board hides it. Shiplap: nail through the lap. Nail into studs, not just cavity battens.', watchFor: 'Face-nailing (visible nails on the board face) is only correct for some profiles. Check the profile spec — face-nailed where blind-nailed is spec\'d looks amateur.' },
        { title: 'Cut in around openings', body: 'Boards under a sill: cut with a scribed profile to fit under sill flashing. Boards over a head flashing: undercut so head flashing tucks under the board. Cut around the opening jamb-to-jamb.', watchFor: 'Boards over head flashings without the head flashing tucking UNDER the board = water gets behind the flashing. Check the E2/AS1 detail sheet.' },
        { title: 'Fit corner mould + scriber', body: 'External corners: corner mould (a two-piece box) fixed over the corner. Internal corners: scriber board runs vertically. Set out on ground first, fit as boards approach the corner.', watchFor: 'Corner detail depends on architect + region. External weatherboard corners without a corner mould look unfinished; some architects prefer mitred corners — check the plan.' },
      ],
    },
    au: {
      tools: ['Chalk line', 'Drop / block saw', 'Hammer', 'Cordless drill', 'Tape', 'Spirit level', 'Mitre saw', 'Sealant gun', 'Story rod', 'Nail punch'],
      materials: ['Weatherboards: H3-treated pine (bevel, rusticated, shiplap), or Weathertex, or cedar profiles', 'Corner mould or scriber board', 'Nails: 60 mm hot-dipped galv jolt-head, or stainless for coastal (BAL / marine zones)', 'Primer / undercoat for cut ends', 'Paintable acrylic sealant', 'Head + sill flashings (colour-matched)'],
      steps: [
        { title: 'Confirm corners are fixed plumb + straight before starting', body: 'If the profile calls for internal + external corners to go on first (corner mould / scriber boards fixed before the boards run into them), get all of them up, plumb, and straight before starting any weatherboard runs. Boards butt straight into the fixed corner — if the corner isn\'t plumb, every board on that wall reads out.', watchFor: 'Some profiles fit corners AFTER the boards (mould covers butt-cut ends). Check the profile detail first — this step only applies if corners go on first.' },
        { title: 'Set out with a story rod', body: 'Make a story rod marked with each course from eave to sill. Rod is reference for every wall — courses line up on marks everywhere.', watchFor: 'Cumulative-measuring each course drifts. Use one rod everywhere so courses land at same height on every wall.' },
        { title: 'Prime all cut ends', body: 'Every cut end of every board gets primer before fixing. Cut ends absorb water fastest — unprimed = rot in 5 years.', watchFor: 'Skipping cut-end primer = top-3 cause of premature weatherboard rot.' },
        { title: 'Lay first board at wall base', body: 'Set the first board at the base of the wall to the height off the story rod, level along the top edge. String line for straightness along the run.', watchFor: 'First board out of level compounds up the wall. Take time to level.' },
        { title: 'Blind-nail per profile', body: 'Bevel-back: nail high, next board covers. Rusticated: nail through tongue. Shiplap: nail through lap. Nail into studs, not just cavity battens.', watchFor: 'Face-nailing (visible nails) only correct for some profiles. Check spec — face where blind is spec\'d looks amateur.' },
        { title: 'Cut in around openings', body: 'Under sill: scribe to fit under sill flashing. Over head flashing: undercut so flashing tucks under the board. Cut jamb-to-jamb.', watchFor: 'Head flashings not tucking UNDER the board = water gets behind. Check NCC Vol 2 3.5 detail.' },
        { title: 'Fit corner mould + scriber', body: 'External corners: mould box over the corner. Internal: scriber board vertical. Set out first, fit as boards approach.', watchFor: 'External weatherboard corners without a mould look unfinished; some architects want mitred. Check plan.' },
      ],
    },
  },
  {
    id: 'cut-fit-scribers',
    category: 'roofing-cladding',
    phase: 'weather-tight',
    label: 'Cut + fit scribers',
    summary: 'Scribed internal corner boards + profile-cut weatherboard ends.',
    nz: {
      tools: ['Table saw', 'Jigsaw (fine blade)', 'Tape', 'Combination square', 'Spirit level', 'Pencil', 'Scribing block (cut to desired offset)', 'Sanding block'],
      materials: ['Scriber timber: H3.2 dressed pine or matching cedar (typically 90×25 or per detail)', '60 mm galv jolt-head nails or brad nails', 'Primer for all sides + cut ends', 'Paintable acrylic sealant'],
      steps: [
        { title: 'Confirm the scriber detail from the plan', body: 'Usually a vertical scriber board closes an internal weatherboard corner, or seals cladding against a projection (fireplace, wall step). Check whether the plan wants the scriber proud of, flush with, or behind the cladding face.', watchFor: 'Different architects detail scribers differently. Confirm the detail before you cut — a re-cut scriber wastes an hour and a good length of timber.' },
        { title: 'Cut the scriber long', body: 'Cut the scriber ~100 mm longer than the finished length — leave it long while you scribe + fit, then cut to final length at the end once you know exactly where it lands. Cut square + clean.', watchFor: 'Prime all four faces + cut ends BEFORE fitting. Unprimed cut ends are the #1 rot cause on weatherboard corner details.' },
        { title: 'Set the scriber plumb in the corner', body: 'Position hard into the internal corner, plumb both faces with a spirit level, tack in place with a couple of brads to hold while you scribe.', watchFor: 'A scriber that\'s out of plumb throws every weatherboard end that butts against it. Plumb first, mark second.' },
        { title: 'Mark the profile with a scribing block', body: 'Cut a small block of timber to the width you want to take off the scriber (i.e. the gap you\'re closing). Run the block down the reference surface with a pencil held against the far face of the block — the pencil traces the reference profile onto the scriber, offset by the block width.', watchFor: 'Tilting the block through the pass = distorted line. Keep the block square to the reference surface all the way down.' },
        { title: 'Cut the profile', body: 'Rip most of the waste off with the table saw, cutting freehand carefully along the pencil line. Finish the profile detail with a jigsaw + fine-tooth blade. Undercut the back edge slightly so the front face of the join closes even if the wall is a bit out.', watchFor: 'Without an undercut the back edge can hit first and the front face gaps. Slight undercut always.' },
        { title: 'Test-fit + recut', body: 'Offer the scriber back into the corner. Any high spots that stop the front face closing? Mark them, take it back to the table saw and recut. Repeat until the front face sits tight against the weatherboards.', watchFor: 'Cutting too far leaves the scriber loose. Take small passes and re-check often.' },
        { title: 'Fix + seal', body: 'Fix off with 60 mm galv jolt-heads or brads through the scriber into stud / structure behind. Bead of paintable acrylic sealant along the join if there\'s any hairline gap — hidden under paint.', watchFor: 'Nailing only into cladding (not through into stud) = scriber pulls off when the weatherboards move. Aim for the stud line behind.' },
      ],
    },
    au: {
      tools: ['Table saw', 'Jigsaw (fine blade)', 'Tape', 'Combination square', 'Spirit level', 'Pencil', 'Scribing block (cut to desired offset)', 'Sanding block'],
      materials: ['Scriber timber: H3-treated pine or matching cedar / hardwood (typically 90×25 or per detail)', '60 mm galv jolt-head nails or brad nails', 'Primer for all sides + cut ends', 'Paintable acrylic sealant'],
      steps: [
        { title: 'Confirm the scriber detail from the plan', body: 'Usually a vertical scriber board closes an internal weatherboard corner, or seals cladding against a projection. Check whether the plan wants the scriber proud of, flush with, or behind the cladding face.', watchFor: 'Different architects detail scribers differently. Confirm the detail before you cut — a re-cut wastes an hour and a length of timber.' },
        { title: 'Cut the scriber long', body: 'Cut the scriber ~100 mm longer than the finished length — leave it long while you scribe + fit, then cut to final length at the end once you know exactly where it lands. Cut square + clean.', watchFor: 'Prime all four faces + cut ends BEFORE fitting. Unprimed cut ends are the #1 rot cause on weatherboard corner details.' },
        { title: 'Set the scriber plumb in the corner', body: 'Position hard into the internal corner, plumb both faces with a spirit level, tack in place with brads to hold while you scribe.', watchFor: 'A scriber out of plumb throws every weatherboard end that butts against it. Plumb first, mark second.' },
        { title: 'Mark the profile with a scribing block', body: 'Cut a small block of timber to the width you want to take off the scriber (i.e. the gap you\'re closing). Run the block down the reference surface with a pencil held against the far face of the block — the pencil traces the reference profile onto the scriber, offset by the block width.', watchFor: 'Tilting the block through the pass = distorted line. Keep the block square to the reference surface all the way down.' },
        { title: 'Cut the profile', body: 'Rip most of the waste off with the table saw, cutting freehand carefully along the pencil line. Finish the profile detail with a jigsaw + fine-tooth blade. Undercut the back edge slightly so the front face of the join closes even if the wall is a bit out.', watchFor: 'Without an undercut the back edge can hit first and the front face gaps. Slight undercut always.' },
        { title: 'Test-fit + recut', body: 'Offer the scriber back into the corner. Mark high spots that stop the front face closing, take it back to the table saw and recut. Repeat until the front face sits tight.', watchFor: 'Cutting too far leaves the scriber loose. Small passes, re-check often.' },
        { title: 'Fix + seal', body: 'Fix off with 60 mm galv jolt-heads or brads through the scriber into stud / structure behind. Paintable acrylic sealant along the join if there\'s any hairline gap.', watchFor: 'Nailing only into cladding = scriber pulls off when the weatherboards move. Aim for the stud line behind.' },
      ],
    },
  },
  {
    id: 'install-fc-cladding',
    category: 'roofing-cladding',
    phase: 'weather-tight',
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

  // ─── Doors — second-fix carpentry (internal + slab hangs, locksets) ─────
  {
    id: 'hang-internal-door',
    category: 'doors-windows',
    phase: 'second-fix-carp',
    label: 'Hang an internal pre-hung door',
    summary: 'Frame into opening, plumb, screw, check swing.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Oscillating multi-tool', 'Chisel', 'Hammer', 'Handsaw or drop saw', 'Utility knife'],
      materials: ['Pre-hung internal door (hollow-core or solid, jamb + head pre-assembled)', 'Timber packers (thin cedar or hardwood)', 'Countersunk screws (jamb to stud, heads filled before paint)', 'Architrave stock (fit after wall linings)'],
      steps: [
        { title: 'Check opening size against jamb', body: 'Rough opening = jamb width + 10 mm clearance total (5 mm each side). Head height = jamb height + 10 mm.', watchFor: 'Over-sized opening + jamb too small = long packers needed on both sides. Under-size = jamb won\'t fit. Measure both before ordering.' },
        { title: 'Position pre-hung frame in opening', body: 'Lift frame into opening, sit on floor. If flooring is already down, the frame sits on the floor; if not, sit on 15 mm packers so the jamb ends up ~15 mm above floor for carpet clearance.', watchFor: 'Solo works for a standard hollow-core pre-hung. Grab a hand for solid-core or wide double sets — a dropped frame chips the jamb corners.' },
        { title: 'Pack hinge-side jamb + plumb', body: 'Slide packers between jamb and stud, behind each hinge + at top + at bottom. Long spirit level on the hinge-side jamb — plumb BOTH faces. Adjust packers until plumb.', watchFor: 'Plumb hinge-side FIRST. Latch-side gets adjusted to the door once hinge-side is set.' },
        { title: 'Fix hinge-side jamb', body: 'Through packers into stud with countersunk screws (pre-drilled, heads sunk for filling) — one behind each hinge, one at top, one at bottom. Recheck plumb after each screw.', watchFor: 'Overdriving screws pulls the jamb toward the stud and bows the packer. Snug, not driven.' },
        { title: 'Check door swings freely', body: 'Test the door — should swing smoothly, not bind on jamb, sag open or closed, or catch on the floor. If it binds, hinge-side isn\'t plumb.', watchFor: 'A door that swings open or closed by itself = jamb tilted forward or back. Re-plumb before fixing latch side.' },
        { title: 'Pack + fix latch-side jamb', body: 'Close door. Pack latch-side jamb to a consistent 3 mm gap all the way top to bottom. Fix through packers with countersunk screws — one at top, one at bottom, one in the middle (avoid the strike area — that gets chiselled out later).', watchFor: 'Inconsistent gap looks amateur and can catch the door. 3 mm dead all the way.' },
        { title: 'Cut packers flush + tidy', body: 'Oscillating multi-tool along the wall face to trim protruding packers flush with the jamb. Vacuum any debris. Architraves fit after the wall linings are done.', watchFor: 'Leaving packers proud can interfere with the gib install. Trim before you leave the room.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Oscillating multi-tool', 'Chisel', 'Hammer', 'Handsaw or drop saw', 'Utility knife'],
      materials: ['Pre-hung internal door (hollow-core or solid, jamb + head pre-assembled)', 'Timber packers', 'Countersunk screws (heads filled before paint)', 'Architrave stock (fit after linings)'],
      steps: [
        { title: 'Check opening size against jamb', body: 'Rough opening = jamb width + 10 mm total (5 mm each side). Head height = jamb + 10 mm.', watchFor: 'Over-sized = long packers both sides. Under-size = won\'t fit. Measure both before ordering.' },
        { title: 'Position pre-hung frame in opening', body: 'Lift into opening, sit on floor. If flooring not yet down, sit on 15 mm packers for carpet clearance.', watchFor: 'Solo works for a standard hollow-core pre-hung. Grab a hand for solid-core or wide double sets — a dropped frame chips jamb corners.' },
        { title: 'Pack hinge-side jamb + plumb', body: 'Packers behind each hinge + top + bottom. Long spirit level on hinge-side jamb — plumb BOTH faces.', watchFor: 'Plumb hinge-side FIRST. Latch-side adjusts to door once hinge-side is set.' },
        { title: 'Fix hinge-side jamb', body: 'Through packers with countersunk screws (pre-drilled, heads sunk for filling) — behind each hinge, top, bottom. Recheck plumb after each screw.', watchFor: 'Overdriving pulls jamb toward stud and bows the packer. Snug, not driven.' },
        { title: 'Check door swings freely', body: 'Test door — smooth swing, no bind, no self-close, no floor catch. If binds, hinge-side isn\'t plumb.', watchFor: 'Door swings open/closed by itself = jamb tilted forward or back. Re-plumb before latch side.' },
        { title: 'Pack + fix latch-side jamb', body: 'Close door. Pack latch-side to 3 mm consistent gap top to bottom. Fix with countersunk screws — one top, one bottom, one middle (avoid the strike area — gets chiselled out later).', watchFor: 'Inconsistent gap looks amateur + can catch. 3 mm dead all the way.' },
        { title: 'Cut packers flush + tidy', body: 'Oscillating multi-tool along wall face to trim protruding packers flush with the jamb. Vacuum debris. Architraves after linings.', watchFor: 'Packers proud can interfere with the plasterboard install. Trim before leaving room.' },
      ],
    },
  },
  {
    id: 'fit-lockset',
    category: 'doors-windows',
    phase: 'second-fix-carp',
    label: 'Fit a lockset',
    summary: 'Bore for tubular latch, fit latch + strike + handle set (optional deadbolt).',
    nz: {
      tools: ['Tape', 'Pencil', 'Combination square', 'Hole saw kit (54 mm face + 25 mm edge, or per lockset spec)', 'Cordless drill / impact driver', 'Chisel', 'Hammer', 'Screwdriver'],
      materials: ['Lockset (Yale, Lockwood, or spec\'d)', 'Deadbolt (optional, per plan)', 'Strike plate + fixings (supplied with lockset)'],
      steps: [
        { title: 'Read the lockset spec + measure backset', body: 'Every lockset has its own backset (distance from door edge to bore centre — typically 60 or 70 mm). Read the packaging, don\'t guess.', watchFor: 'Wrong backset = latch bore doesn\'t line up with strike, and there\'s no fixing it without a new door. Confirm before the hole saw goes in.' },
        { title: 'Mark the bore centres', body: 'From the top of the door, measure down to standard handle height (typically 1000 mm to centre for residential). Mark the bore centre on the face + on the edge using a combination square to keep them aligned. If a deadbolt, mark a second position ~150 mm above at head height.', watchFor: 'A crooked line between face bore + edge bore = misaligned latch. Use a square, not eyeballing.' },
        { title: 'Bore the face + edge holes', body: 'Face bore first with the 54 mm hole saw — stop as soon as the pilot bit breaks through the far side, then finish the bore from the other face to avoid tear-out. Edge bore with the 25 mm hole saw straight through to meet the face bore.', watchFor: 'Boring straight through in one pass tears out the exit face — always finish from the second side.' },
        { title: 'Fit the latch + mortise the face plate', body: 'Slide the latch into the edge bore. Trace the latch face plate onto the door edge, remove the latch, chisel the mortise so the face plate sits flush. Refit the latch + screw off.', watchFor: 'A face plate that sits proud stops the door closing tight against the strike. Chisel deep enough that it\'s flush.' },
        { title: 'Fit + align the strike plate', body: 'Close the door slowly and mark where the latch bolt hits the jamb. Chisel a mortise for the strike plate + bolt cavity, fit + screw off. Test the door latches cleanly.', watchFor: 'Strike bolt cavity too shallow = latch doesn\'t retract properly + door doesn\'t close. Chisel out the full bolt travel.' },
        { title: 'Fit handle set + deadbolt (if fitted)', body: 'Handle spindle through the latch, screw handles either side. If a deadbolt is spec\'d, repeat the boring + strike process at head height. Test lock + unlock full cycle from both sides.', watchFor: 'Handles that spin freely = spindle wrong length. Handles that bind = over-tightened. Adjust before you leave the door.' },
      ],
    },
    au: {
      tools: ['Tape', 'Pencil', 'Combination square', 'Hole saw kit (54 mm face + 25 mm edge, or per lockset spec)', 'Cordless drill / impact driver', 'Chisel', 'Hammer', 'Screwdriver'],
      materials: ['Lockset (Lockwood, Yale, or spec\'d — some states have min security ratings)', 'Deadbolt (optional, per plan)', 'Strike plate + fixings (supplied with lockset)'],
      steps: [
        { title: 'Read the lockset spec + measure backset', body: 'Every lockset has its own backset (distance from door edge to bore centre — typically 60 or 70 mm). Read the packaging, don\'t guess.', watchFor: 'Wrong backset = latch bore doesn\'t line up with strike. Confirm before hole saw goes in.' },
        { title: 'Mark the bore centres', body: 'From top of door, measure down to standard handle height (typically 1000 mm to centre). Mark bore centre on face + edge using a combination square to keep them aligned. Deadbolt: second position ~150 mm above at head height.', watchFor: 'Crooked line between face + edge bore = misaligned latch. Use a square.' },
        { title: 'Bore the face + edge holes', body: 'Face bore first with 54 mm hole saw — stop as soon as pilot bit breaks through, then finish from the other face to avoid tear-out. Edge bore with 25 mm hole saw straight through to meet the face bore.', watchFor: 'Boring straight through in one pass tears out the exit face — finish from the second side.' },
        { title: 'Fit the latch + mortise the face plate', body: 'Slide latch into edge bore. Trace face plate onto edge, remove latch, chisel mortise so plate sits flush. Refit + screw off.', watchFor: 'Face plate proud = door doesn\'t close tight against strike. Chisel flush.' },
        { title: 'Fit + align the strike plate', body: 'Close door slowly + mark where latch bolt hits the jamb. Chisel a mortise for the strike plate + bolt cavity, fit + screw off. Test the door latches cleanly.', watchFor: 'Bolt cavity too shallow = latch doesn\'t retract properly + door doesn\'t close. Full bolt travel.' },
        { title: 'Fit handle set + deadbolt (if fitted)', body: 'Handle spindle through latch, screw handles either side. Deadbolt spec\'d: repeat bore + strike at head height. Test lock + unlock full cycle both sides.', watchFor: 'Handles spinning = wrong-length spindle. Handles binding = over-tightened. Adjust before you leave the door.' },
      ],
    },
  },

  // ─── Services rough-in — walls open, before linings go on ────────────────
  {
    id: 'plumbing-rough-in',
    category: 'services',
    phase: 'rough-in',
    label: 'Plumbing rough-in',
    summary: 'Licensed plumber only. Hot / cold pipe, waste + vent, tap + waste bodies fixed to framing at correct heights.',
    nz: {
      tools: ['(Licensed plumber brings own tools)'],
      materials: ['(Licensed plumber supplies pipe, fittings, tap + waste bodies)'],
      steps: [
        { title: 'Confirm a licensed plumber is booked', body: 'Plumbing rough-in must be done by a plumber licensed with the Plumbers, Gasfitters + Drainlayers Board. Book them in ahead of the framing complete date so linings aren\'t held up.', watchFor: 'Any DIY plumbing behind linings fails council sign-off. If it\'s not done by a licensee, it doesn\'t go behind a wall.' },
        { title: 'Walk the site with them + hand over plans', body: 'Plumber needs the plans (fixture positions, kitchen + bathroom layouts) and access to the frame while walls are open. Confirm fixture heights + waste positions before they start piping.', watchFor: 'Miscommunicated fixture positions = pipes in the wrong stud bay + gib gets cut open. Cross-check the plan on site with the plumber before they start.' },
        { title: 'Sign off + keep the paperwork', body: 'Once rough-in is done, plumber issues a Producer Statement / Certificate of Compliance for their work. Keep it for the CCC (Code Compliance Certificate) application at the end of the build.', watchFor: 'No paperwork = no CCC at the end. Chase the certificate the day the work is done, not months later.' },
      ],
    },
    au: {
      tools: ['(Licensed plumber brings own tools)'],
      materials: ['(Licensed plumber supplies pipe, fittings, tap + waste bodies)'],
      steps: [
        { title: 'Confirm a licensed plumber is booked', body: 'Plumbing rough-in must be done by a plumber licensed in your state (VBA / QBCC / NSW Fair Trading / etc.). Book ahead of the framing complete date so linings aren\'t held up.', watchFor: 'Any DIY plumbing behind linings fails building surveyor sign-off. If it\'s not done by a licensee, it doesn\'t go behind a wall.' },
        { title: 'Walk the site with them + hand over plans', body: 'Plumber needs the plans (fixture positions, kitchen + bathroom layouts) and access while walls are open. Confirm fixture heights + waste positions before they start.', watchFor: 'Miscommunicated positions = pipes in the wrong bay + linings get cut open. Cross-check the plan on site before they start.' },
        { title: 'Sign off + keep the paperwork', body: 'Plumber issues a Compliance Certificate (per AS/NZS 3500) for their work. Keep it for the final Occupancy Certificate / building surveyor sign-off.', watchFor: 'No paperwork = no final sign-off. Chase the certificate the day the work is done.' },
      ],
    },
  },
  {
    id: 'electrical-rough-in',
    category: 'services',
    phase: 'rough-in',
    label: 'Electrical rough-in',
    summary: 'Licensed electrician only. Cable pulls to powerpoints, switches, lights + data / TV outlets; boxes fixed to studs.',
    nz: {
      tools: ['(Licensed electrician brings own tools)'],
      materials: ['(Licensed electrician supplies cable, boxes, mounting brackets)'],
      steps: [
        { title: 'Confirm a licensed electrician is booked', body: 'Electrical rough-in must be done by a registered electrician (Electrical Workers Registration Board). Book in ahead of framing complete so linings aren\'t held up.', watchFor: 'Any DIY electrical work behind linings fails inspection + can\'t be signed off. Not just illegal — un-insurable if there\'s a fire later.' },
        { title: 'Walk the plan with them on site', body: 'Confirm every powerpoint, switch, light, data + TV outlet position on site before cables get pulled. Heights (powerpoint 300 mm to centre, switch 1100 mm typical) unless plan says otherwise. Mark on studs with pencil so nothing gets missed.', watchFor: 'Cables run to the wrong stud bay = holes cut in the gib later. Sort every position with the electrician BEFORE they pull cable.' },
        { title: 'Sign off + keep the paperwork', body: 'Electrician issues an Electrical Certificate of Compliance (ECoC) for their work. Keep it for the CCC application at the end of the build.', watchFor: 'No ECoC = no CCC. Chase it the day the work\'s done.' },
      ],
    },
    au: {
      tools: ['(Licensed electrician brings own tools)'],
      materials: ['(Licensed electrician supplies cable, boxes, mounting brackets)'],
      steps: [
        { title: 'Confirm a licensed electrician is booked', body: 'Electrical rough-in must be done by an electrician licensed in your state. Book ahead of framing complete so linings aren\'t held up.', watchFor: 'Any DIY electrical behind linings fails inspection + is un-insurable if it later causes a fire. Not just illegal.' },
        { title: 'Walk the plan with them on site', body: 'Confirm every powerpoint, switch, light, data + TV outlet position on site before cables get pulled. Heights (powerpoint 300 mm to centre, switch 1100 mm typical) unless plan says otherwise. Mark on studs so nothing\'s missed.', watchFor: 'Cables in the wrong bay = holes cut in the linings later. Sort every position with the sparky BEFORE cable goes in.' },
        { title: 'Sign off + keep the paperwork', body: 'Electrician issues a Certificate of Electrical Safety (CES / equivalent per state) for their work. Keep it for the final building surveyor sign-off.', watchFor: 'No certificate = no final sign-off. Chase it the day the work\'s done.' },
      ],
    },
  },
  {
    id: 'gas-rough-in',
    category: 'services',
    phase: 'rough-in',
    label: 'Gas rough-in',
    summary: 'Licensed gasfitter only. Gas pipe from meter to hob / hot-water / heater outlet, capped for pressure test.',
    nz: {
      tools: ['(Licensed gasfitter brings own tools)'],
      materials: ['(Licensed gasfitter supplies gas pipe + fittings)'],
      steps: [
        { title: 'Confirm a licensed gasfitter is booked', body: 'Gas rough-in must be done by a gasfitter licensed with the Plumbers, Gasfitters + Drainlayers Board. Coordinate with the plumber\'s schedule — often the same firm covers both.', watchFor: 'DIY gas work is illegal + kills people. Licensed only, no exceptions.' },
        { title: 'Confirm outlet positions with the plans', body: 'Walk the site with the gasfitter — hob position, hot-water unit location, gas heater outlet all confirmed against the plan before pipe goes in.', watchFor: 'Gas pipe in the wrong bay = re-route job (expensive + intrusive). Confirm positions once, before the pipe run starts.' },
        { title: 'Pressure test + sign off', body: 'Gasfitter pressure-tests the run before it\'s capped for linings. They issue a Gasfitting Certificate of Compliance for their work — keep it for the CCC application.', watchFor: 'A gas run that leaks after linings = walls opened up to find it. The pressure test at rough-in stage is your only chance to catch it cheaply.' },
      ],
    },
    au: {
      tools: ['(Licensed gasfitter brings own tools)'],
      materials: ['(Licensed gasfitter supplies gas pipe + fittings)'],
      steps: [
        { title: 'Confirm a licensed gasfitter is booked', body: 'Gas rough-in must be done by a gasfitter licensed in your state. Often the same firm as the plumber — coordinate schedules.', watchFor: 'DIY gas work is illegal + kills people. Licensed only, no exceptions.' },
        { title: 'Confirm outlet positions with the plans', body: 'Walk the site with the gasfitter — hob position, hot-water unit, gas heater outlet all confirmed against the plan before pipe goes in.', watchFor: 'Gas pipe in the wrong bay = re-route job. Confirm positions once, before pipe run starts.' },
        { title: 'Pressure test + sign off', body: 'Gasfitter pressure-tests the run before it\'s capped for linings. They issue a Compliance Certificate (per AS/NZS 5601) — keep it for the final building surveyor sign-off.', watchFor: 'A gas run that leaks post-linings = walls opened to find it. Pressure test at rough-in is your only cheap chance.' },
      ],
    },
  },
  {
    id: 'hvac-duct-rough-in',
    category: 'services',
    phase: 'rough-in',
    label: 'Aircon duct + head-unit rough-in',
    summary: 'Licensed refrigeration / aircon installer. Ducts through ceiling space, indoor head brackets, condensate drain roughed.',
    nz: {
      tools: ['(Licensed aircon installer brings own tools)'],
      materials: ['(Aircon installer supplies duct, indoor head brackets, refrigerant pipe, condensate drain)'],
      steps: [
        { title: 'Confirm a licensed aircon installer is booked', body: 'Refrigerant handling requires an Approved Filler certificate (EPA). Book the aircon installer during framing so ducts + refrigerant pipe can be run before linings + insulation go in.', watchFor: 'Trying to fit ducts through a lined ceiling = ripping linings out. Schedule during rough-in, not after.' },
        { title: 'Confirm head-unit positions + condensate drain runs', body: 'Head unit brackets fixed to studs / joists at spec\'d heights. Condensate drain runs need fall + a discharge point (usually an eave or gully trap). Sort with the installer before pipe/duct runs.', watchFor: 'Condensate drains that don\'t fall pond in the ceiling + drip through the linings months later. Get the fall right at rough-in.' },
        { title: 'Sign off + keep the paperwork', body: 'Aircon installer issues certification for the refrigerant + electrical connections. Keep the paperwork for the CCC application.', watchFor: 'A missing aircon compliance certificate holds up the CCC. Chase it once the work\'s done.' },
      ],
    },
    au: {
      tools: ['(Licensed aircon installer brings own tools)'],
      materials: ['(Aircon installer supplies duct, indoor head brackets, refrigerant pipe, condensate drain)'],
      steps: [
        { title: 'Confirm a licensed aircon installer is booked', body: 'Refrigerant handling requires an ARC-licensed installer (Australian Refrigeration Council). Book during framing so ducts + refrigerant pipe run before linings + insulation.', watchFor: 'Ducts through lined ceilings = ripping linings out. Schedule during rough-in.' },
        { title: 'Confirm head-unit positions + condensate drain runs', body: 'Head unit brackets fixed to studs / joists at spec\'d heights. Condensate drain runs need fall + a discharge point (eave, gully trap, or approved drain). Sort with installer before pipe/duct runs.', watchFor: 'Drains that don\'t fall pond in the ceiling + drip through linings months later. Fall right at rough-in.' },
        { title: 'Sign off + keep the paperwork', body: 'Aircon installer issues compliance paperwork for refrigerant + electrical work. Keep it for the final building surveyor sign-off.', watchFor: 'Missing paperwork holds up final sign-off. Chase it once the work\'s done.' },
      ],
    },
  },
  {
    id: 'install-insulation',
    category: 'framing',
    phase: 'rough-in',
    label: 'Install insulation',
    summary: 'Wall batts between studs, ceiling batts over joists.',
    nz: {
      tools: ['Utility knife or insulation saw', 'Straight edge', 'Tape', 'PPE: FFP2 mask, gloves, long sleeves', 'Ladder / trestle for ceiling batts'],
      materials: ['Wall batts: fibreglass or polyester (Pink Batts, Autex, Terra Lana), R-value per H1 schedule method or plan', 'Ceiling batts: same range, higher R-value (typically R3.6–R6.6 depending on climate zone)', 'Insulation tape (for holding loose batts across studs if needed)'],
      steps: [
        { title: 'Confirm R-values from the plan / H1 schedule', body: 'H1 (energy efficiency) sets minimum R-values by climate zone — walls, ceilings, and floor. Read the R-values off the plan or the H1 schedule for your zone before ordering.', watchFor: 'Wrong R-values = fails CCC. H1 requirements were increased in 2022/23 — don\'t assume older-project figures still apply.' },
        { title: 'Fit wall batts snug between studs', body: 'Cut batts to fit stud bay height + friction-fit between studs. Fill full depth of the stud, no gaps or compression. Cut around wiring / pipes — don\'t squash batts around cable, split the batt and pass it either side. If insulation strapping tape is necessary, install it across the stud faces to hold the batts in place until linings go on.', watchFor: 'Gaps + squashed batts drop the R-value significantly. A "close enough" install can halve the insulation performance.' },
        { title: 'Fit ceiling batts over the joists', body: 'Roll or lay batts across ceiling joists per manufacturer install. Butt joints tight, no gaps. Around downlights, use the clearance the light\'s IC rating allows (IC-rated = full cover; non-IC = 200 mm gap around).', watchFor: 'Non-IC downlights covered by insulation = fire risk. Check the downlight rating before covering.' },
      ],
    },
    au: {
      tools: ['Utility knife or insulation saw', 'Staple gun (for reflective foil / sarking if used)', 'Straight edge', 'Tape', 'PPE: P2 mask, gloves, long sleeves', 'Ladder / trestle for ceiling batts'],
      materials: ['Wall batts: fibreglass, polyester, or rockwool (Bradford, Knauf, Fletcher), R-value per NCC Vol 2 or plan', 'Ceiling batts: same range, higher R-value per climate zone', 'Reflective foil / sarking if spec\'d', 'Foil tape for joins'],
      steps: [
        { title: 'Confirm R-values from the plan / NCC schedule', body: 'NCC Vol 2 3.12 sets minimum R-values by climate zone (Zone 1 tropical → Zone 8 alpine). Read the R-values off the plan or the schedule for your zone before ordering.', watchFor: 'Wrong R-values fail the energy assessment. Climate zone drives everything — don\'t assume figures from another zone apply.' },
        { title: 'Fit wall batts snug between studs', body: 'Cut batts to fit stud bay + friction-fit between studs. Fill full depth of stud, no gaps or compression. Around wiring / pipes: split the batt, pass either side — don\'t squash it.', watchFor: 'Gaps + compressed batts drop R-value significantly. "Close enough" can halve insulation performance.' },
        { title: 'Fit ceiling batts over the joists', body: 'Roll or lay batts across ceiling joists. Butt joints tight, no gaps. Around downlights, use clearance per the light\'s IC rating (IC-rated = full cover; non-IC = 200 mm gap around).', watchFor: 'Non-IC downlights covered = fire risk. Check the downlight rating before covering.' },
        { title: 'Fit reflective foil / sarking if spec\'d', body: 'Warm climate zones often spec reflective foil sarking behind cladding or under roofing. Fit shiny side down / out, tape all joins + penetrations per manufacturer.', watchFor: 'Foil wrong-side out loses the reflective effect entirely. Check the "this side out" print.' },
      ],
    },
  },
  {
    id: 'pre-line-checklist',
    category: 'services',
    phase: 'rough-in',
    label: 'Pre-line inspection checklist',
    summary: 'Walk the frame with services + insulation done — sign-off before plasterboard.',
    nz: {
      tools: ['Pen + paper (or Setout jobs list)', 'Torch', 'Camera / phone', 'Tape'],
      materials: ['(No materials — inspection only)'],
      steps: [
        { title: 'Confirm every trade has signed off their rough-in', body: 'Plumber, electrician, gasfitter, aircon — each with their compliance paperwork. Any outstanding = don\'t close up walls yet.', watchFor: 'Closing up before sign-off means opening back up when the inspector wants to see something. Chase the paperwork first.' },
        { title: 'Book the pre-line inspection with council', body: 'Council inspector needs to see framing, services, insulation, and any structural connections before linings go on. Some councils are 2–3 weeks lead time — book early.', watchFor: 'Skipping the pre-line inspection = failed CCC + rip linings out to prove compliance. Not optional.' },
        { title: 'Walk the frame + fix defects before inspection', body: 'Sight along every stud + plate — anything bowed, twisted, or over-notched by services gets fixed. Check nogs, fixings, brace panels, blocking for later fixings (towel rails, TV brackets, cabinets).', watchFor: 'Later-fixing blocking is the #1 forget — every time you find yourself trying to fix into a stud you can\'t find, remember this step.' },
        { title: 'Photograph everything before lining', body: 'Take photos of every wall (all four walls of every room) with services + insulation visible. Save the photos to Setout against the job with any notes / comments (services routes, blocking positions, anything worth flagging for later) — invaluable for locating hidden services in future maintenance.', watchFor: 'A photo now saves an hour of guess-drilling in 3 years time. Do it.' },
      ],
    },
    au: {
      tools: ['Pen + paper (or Setout jobs list)', 'Torch', 'Camera / phone', 'Tape'],
      materials: ['(No materials — inspection only)'],
      steps: [
        { title: 'Confirm every trade has signed off their rough-in', body: 'Plumber, electrician, gasfitter, aircon — each with compliance paperwork. Any outstanding = don\'t close up.', watchFor: 'Closing up before sign-off = opening back up when the inspector wants to see something. Paperwork first.' },
        { title: 'Book the frame / pre-line inspection with the building surveyor', body: 'Private or council building surveyor needs to see framing, services, insulation, and structural connections before linings. Lead time varies — book early.', watchFor: 'Skipping frame inspection = failed occupancy sign-off + rip linings to prove compliance. Not optional.' },
        { title: 'Walk the frame + fix defects before inspection', body: 'Sight every stud + plate — bowed, twisted, or over-notched by services gets fixed. Check nogs, fixings, brace panels, blocking for later fixings (towel rails, TV brackets, cabinets).', watchFor: 'Later-fixing blocking is the #1 forget. Every time you\'re fishing for a stud that isn\'t there, remember this step.' },
        { title: 'Photograph everything before lining', body: 'Photo every wall (all four walls of every room) with services + insulation visible. Save the photos to Setout against the job with any notes / comments (services routes, blocking positions, anything worth flagging for later) — invaluable for hidden services in future maintenance.', watchFor: 'A photo now saves an hour of guess-drilling in 3 years time. Do it.' },
      ],
    },
  },

  // ─── Wet areas — install-side work (waterproofing is a licensed trade) ──
  {
    id: 'install-shower-base',
    category: 'wet-areas',
    phase: 'linings',
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
      ],
    },
  },
  {
    id: 'install-shower-liner',
    category: 'wet-areas',
    phase: 'wet-finish',
    label: 'Install a shower liner',
    summary: 'Pre-formed acrylic panels: dry-fit, cut for taps, adhesive, silicone.',
    nz: {
      tools: ['Tape', 'Spirit level', 'Marker pen', 'Cordless drill / impact driver', 'Jigsaw or fine-tooth handsaw', 'Hole saw (54 mm for mixer, 32 mm for shower rose)', 'Silicone gun', 'Silicone smoothing tool', 'Utility knife', 'Sandpaper (fine)'],
      materials: ['Shower liner kit (3-piece: back + 2 sides, or moulded 1-piece — Marbletrend / Athena / Newline)', 'Construction adhesive (Selleys Liquid Nails Wet Area, or Sika Sikaflex 11FC)', 'Silicone (neutral-cure, colour-matched to liner)', 'Corner trims / cap strips (supplied with kit)', 'Masking tape'],
      steps: [
        { title: 'Confirm walls are lined + waterproofed', body: 'Shower recess walls should be GIB Aqualine (wet-area lining) + waterproofed by a licensed waterproofer before the liner goes on. Liner sheds the water day-to-day; waterproofing is the backup if the silicone fails.', watchFor: 'Skipping waterproofing under a liner = wall framing rots if the silicone seal fails. Waterproofing is licensed work; get the certificate.' },
        { title: 'Dry-fit the liner panels', body: 'Lift panels into position — back panel first, then sides. Check the panels meet at corners with a consistent 2–3 mm gap for silicone, and sit hard against the shower base rim.', watchFor: 'Shower recesses are rarely dead square. If a corner\'s out by more than 5 mm, either scribe the liner edge or plan for a wider silicone bead. Test-fit before adhesive.' },
        { title: 'Mark + cut tap + shower-rose holes', body: 'Turn panel around, measure from the base + adjacent wall to mark the tap centreline. Drill from the FRONT (visible) face with a hole saw to avoid chipping the finished face.', watchFor: 'Marking + drilling from the back is a common apprentice mistake — hole saws blow out the visible face. Score with a utility knife first if worried about chipping.' },
        { title: 'Apply adhesive per manufacturer', body: 'Squiggle-bead adhesive on the panel back — typically horizontal squiggles 200 mm apart, plus a solid perimeter bead 25 mm in from every edge. Don\'t over-apply; excess squeezes out at joints.', watchFor: 'Adhesive too close to the edge oozes out when panel is pressed. 25 mm setback from edges gives the silicone a clean zone to sit in.' },
        { title: 'Position + press panels', body: 'Back panel first — align to base + centre horizontally. Press across the whole face, work air out from centre outward. Then side panels — same process, aligning against back panel + base.', watchFor: 'Panels slide once adhesive is on. Masking tape a temporary hold at the top until adhesive grabs (usually 15–30 min).' },
        { title: 'Silicone all joints + penetrations', body: 'Vertical joins between panels, horizontal join to shower base, around tap + rose penetrations. Neutral-cure silicone in the panel colour. Tool the bead with a silicone tool (or wet finger dipped in soapy water) for a clean concave finish.', watchFor: 'Skin oils from a bare finger feed mould growth in the bead. Use a silicone tool or soapy-water finger. Any pinhole or gap = water gets behind the liner — take time, tool every join clean.' },
        { title: 'Fit corner + edge trims', body: 'Kit-supplied trim strips (usually colour-matched aluminium) fit at exposed vertical edges + top of liner. Fix with adhesive + hidden pins.', watchFor: 'Un-trimmed liner edges look unfinished + get bumped / chipped. Fit the trims — they\'re in the kit for a reason.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'Marker pen', 'Cordless drill / impact driver', 'Jigsaw or fine-tooth handsaw', 'Hole saw (54 mm mixer, 32 mm rose)', 'Silicone gun', 'Silicone smoothing tool', 'Utility knife', 'Sandpaper (fine)'],
      materials: ['Shower liner kit (3-piece or moulded 1-piece — Marbletrend, Estilo, Highgrove)', 'Construction adhesive (Selleys Liquid Nails Wet Area, or Sika Sikaflex 11FC)', 'Silicone (neutral-cure, colour-matched)', 'Corner trims / cap strips (kit)', 'Masking tape'],
      steps: [
        { title: 'Confirm walls are lined + waterproofed', body: 'Recess walls should be Wet-Area plasterboard or Villaboard + waterproofed by a licensed waterproofer per AS 3740 before liner. Liner sheds the water day-to-day; waterproofing is the backup if the silicone fails.', watchFor: 'Skipping waterproofing = wall framing rots if the silicone seal fails. Waterproofing is licensed work in AU; get the compliance certificate.' },
        { title: 'Dry-fit the liner panels', body: 'Back panel first, then sides. Check corners meet with 2–3 mm gap for silicone; sit hard against base rim.', watchFor: 'Recesses rarely dead square. Corner out by >5 mm: scribe the edge or plan a wider silicone bead. Test-fit before adhesive.' },
        { title: 'Mark + cut tap + rose holes', body: 'Turn panel around, measure from base + adjacent wall for tap centreline. Drill from the FRONT face with a hole saw to avoid chipping.', watchFor: 'Drilling from back = blown-out visible face. Score with utility knife first if worried.' },
        { title: 'Apply adhesive per manufacturer', body: 'Squiggle-bead on panel back — horizontal squiggles at 200 mm, plus perimeter bead 25 mm from edges. Don\'t over-apply — excess squeezes out at joints.', watchFor: 'Adhesive too close to edge oozes at panel press. 25 mm setback gives silicone a clean zone.' },
        { title: 'Position + press panels', body: 'Back panel first — align to base, centre horizontally. Press whole face, work air out from centre. Sides next — align to back + base.', watchFor: 'Panels slide once adhesive is on. Masking tape as temporary hold at top until adhesive grabs (15–30 min).' },
        { title: 'Silicone all joints + penetrations', body: 'Vertical joins between panels, horizontal join to base, around taps + rose. Neutral-cure silicone in panel colour. Tool with a silicone tool (or wet finger dipped in soapy water) for clean concave finish.', watchFor: 'Skin oils from a bare finger feed mould growth. Use a silicone tool or soapy-water finger. Any pinhole = water behind liner. Take time, tool clean.' },
        { title: 'Fit corner + edge trims', body: 'Kit trims (colour-matched aluminium) at exposed vertical edges + top of liner. Adhesive + hidden pins.', watchFor: 'Un-trimmed edges look unfinished + get bumped / chipped. Fit the trims.' },
      ],
    },
  },
  {
    id: 'tile-wall',
    category: 'wet-areas',
    phase: 'wet-finish',
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
    phase: 'wet-finish',
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
        { title: 'Cut around waste + edges', body: 'Tiles butt AGAINST the waste flange, not under it — grate sits on top. Wet-saw a circular cut on each tile to match the flange, nippers to trim to shape. Edges: cut on wet saw for clean line.', watchFor: 'A ragged cut shows around the grate. Take time to cut clean so the flange sits flush against the tile edge.' },
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
        { title: 'Cut around waste + edges', body: 'Tiles butt AGAINST the waste flange, not under it — grate sits on top. Wet-saw a circular cut to match the flange, nippers to shape. Edges: wet saw for clean line.', watchFor: 'Ragged cut shows around the grate. Cut clean so flange sits flush against tile edge.' },
        { title: 'Grout after 24 hrs + silicone perimeter', body: 'Remove spacers, mix sanded grout, work into joints with float diagonally. Sponge haze. Silicone wall-to-floor + expansion joints.', watchFor: 'Grouting wall-to-floor = crack as building settles. Silicone always.' },
      ],
    },
  },
  {
    id: 'fit-bathroom-vanity',
    category: 'wet-areas',
    phase: 'second-fix-trades',
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
        { title: 'Seal top edge + wall junction', body: 'Silicone along top where vanity meets wall / splashback. Around exposed sides + floor / walls.', watchFor: 'Un-sealed joins let water into cabinet + cause swelling / mould. Silicone every wet-side edge.' },
        { title: 'Hand over to plumber for basin + taps', body: 'Basin, waste connection, tap-set = plumber. Confirm access to waste rough-in through cabinet.', watchFor: 'Cabinet backs may need service cut-out. Check if manufacturer pre-cuts or you need to.' },
      ],
    },
  },
  {
    id: 'fit-bath',
    category: 'wet-areas',
    phase: 'linings',
    label: 'Fit a bath',
    summary: 'Frame, dry-fit, level, connect waste, tile-in or skirt.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Hammer', 'Handsaw or drop saw', 'Sealant gun', 'Spanner set', 'Utility knife'],
      materials: ['Bath (acrylic — Mondella, Athena — or steel enamel)', 'Bath frame / cradle (usually pre-built by manufacturer, or timber cradle on site)', 'Timber blocking (90×45 SG8 H1.2) for bearing support', 'Bath waste + overflow kit (from plumber)', 'Silicone (neutral-cure)', 'Bath skirt / apron panel (some baths come with one, others tiled-in)'],
      steps: [
        { title: 'Confirm framing supports the bath', body: 'Baths sit on the sub-floor + bear on the walls at ends / rim. Confirm the framing under the bath position has bearers or blocking to catch the load (a full bath of water is 200+ kg).', watchFor: 'A bath dropped onto a floor without bearing support flexes + eventually cracks the tiling. Add timber blocking under the bath position at framing stage.' },
        { title: 'Dry-fit bath in position', body: 'Two people to lift the bath into place. Check clearance to walls (typically 5–10 mm each side), align with plumbing rough-in for waste + overflow. Confirm which end is the tap end.', watchFor: 'Baths are awkward to manoeuvre into a framed recess even when they\'re light — always two people. Watch fingers between bath rim + wall.' },
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
        { title: 'Dry-fit bath in position', body: 'Two people to lift the bath in. Check clearance (5–10 mm each side), align with waste + overflow. Confirm tap end.', watchFor: 'Baths are awkward to manoeuvre into a framed recess even when light — always two people. Watch fingers between rim + wall.' },
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
    phase: 'linings',
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
    phase: 'linings',
    label: 'Stop + set plasterboard joints',
    summary: 'Fill, tape, cover, sand — three coats, feather each wider.',
    nz: {
      tools: ['150 mm + 250 mm + 300 mm jointing knives', 'Corner tool (internal)', 'Mixing bucket + paddle', 'Sanding pole + sanding block', 'Ladder / trestle', 'Wet sponge (for cleanup)', 'PPE: dust mask, safety glasses'],
      materials: ['GIB Trade Set (pre-mix or bag) — Level 4 finish standard', 'GIB Cove Adhesive (for setting cornices)', 'GIB Paper Tape (or fibre mesh for corners in some cases)', 'Metal external corner bead OR paper-faced corner tape', 'Fine sanding sponge (P150 + P220)'],
      steps: [
        { title: 'Confirm sheets are fixed + screws set', body: 'Walk every wall + ceiling — no proud screw heads, no missed fixings. Any protrusion telegraphs through the stopping.', watchFor: 'Setting over a proud screw = a lump forever. Fix the screw depth before you mix a bucket.' },
        { title: 'Fit cornices', body: 'Cornices go on before the wall joints are coated. Mix GIB Cove Adhesive to spec, run a bead along the top of the wall + underside of the ceiling, press the cornice into place, and clean off squeeze-out with a damp brush. Mitre external corners; scribe or mitre internals to whatever suits.', watchFor: 'Cove adhesive skins quickly — mix only what you can fit in 20 min. Any gaps between the cornice and the substrate get filled with the joint coats later, but keep them tight up front.' },
        { title: 'Fix external corner beads', body: 'Metal (or paper-faced) corner beads on every external corner. Mechanical fix first — screws or clinch-on tool per bead type — dead straight, no waves. These get coated over with the wall joints in the next steps.', watchFor: 'A bead that\'s not straight telegraphs through the coats as a bent corner forever. Sight down every bead after fixing.' },
        { title: 'Coat 1: fill joints + bed tape (including internal corners)', body: 'Trowel Trade Set into the recessed joint with the 150 mm knife, filling flush. Bed paper tape into the wet plaster, wipe off excess with the knife at a shallow angle. Internal corners get done in the same coat — fold the tape on the crease, bed with the corner tool. External beads get their first fill coat now too. Do all joints, corners, and screw dimples in one sitting so they cure together.', watchFor: 'Air bubbles under the tape appear as blisters after painting. Bed the tape hard + wipe firmly to squeeze all air out. Unbedded internal corners crack every time — always tape + bed.' },
        { title: 'Coat 2: wider skim over the tape', body: 'After Coat 1 has cured (usually 24 hrs), knock any high spots off with the knife or a damp sponge — no full sanding between coats (scuffs the sheet paper). Then knife a wider coat with the 250 mm knife, feathered each side of the joint. Fill any low spots + cover the tape completely. External corners + screw dimples get their second coat now too.', watchFor: 'Coat 2 should be smooth + feathered. Ridges + tool marks will show through paint.' },
        { title: 'Coat 3: final feather + skim', body: 'After Coat 2 cures, knock high spots off again — no full sanding yet. Then apply Coat 3 with the 300 mm knife, feathering out even wider (300 mm each side of joint). External corners + screw dimples get their finishing coat. Should be nearly invisible when dry.', watchFor: 'Three coats is Level 4 finish (paint-ready under normal light). For critical light, add a Level 5 skim coat over the whole wall.' },
        { title: 'Final sand', body: 'Sand the whole lot with a P220 sanding sponge or pole. Feel for any lumps by hand, not just eye. Wear a mask — jointing dust is fine.', watchFor: 'Over-sanding into the joint area reveals the tape underneath — paper shows through paint. Sand light, feel, stop.' },
      ],
    },
    au: {
      tools: ['150 mm + 250 mm + 300 mm jointing knives', 'Corner tool (internal)', 'Mixing bucket + paddle', 'Sanding pole + sanding block', 'Ladder / trestle', 'Wet sponge', 'PPE: dust mask, safety glasses'],
      materials: ['CSR Total Joint Cement (pre-mix) or Gyprock Base Coat + Top Coat — Level 4 finish standard', 'Gyprock Cornice Cement for cornices', 'Gyprock Paper Tape (or fibre mesh in corners)', 'Metal external corner bead OR paper-faced corner tape', 'Fine sanding sponge (P150 + P220)'],
      steps: [
        { title: 'Confirm sheets fixed + screws set', body: 'Walk every wall + ceiling — no proud screws, no missed fixings. Any protrusion telegraphs through setting.', watchFor: 'Setting over a proud screw = lump forever. Fix screw depth before mixing.' },
        { title: 'Fit cornices', body: 'Cornices go on before wall joints are coated. Mix Cornice Cement to spec, run a bead along the top of the wall + underside of the ceiling, press cornice into place, clean squeeze-out with a damp brush. Mitre externals; scribe or mitre internals.', watchFor: 'Cornice cement skins fast — mix only what you\'ll use in 20 min. Any gaps between cornice + substrate get filled with joint coats later, but keep them tight up front.' },
        { title: 'Fix external corner beads', body: 'Metal (or paper-faced) corner beads on every external corner. Mechanical fix first — screws or clinch-on tool per bead type — dead straight, no waves. Coated over with the wall joints in the next steps.', watchFor: 'A bent bead telegraphs through the coats forever. Sight down every bead after fixing.' },
        { title: 'Coat 1: fill joints + bed tape (including internal corners)', body: 'Trowel jointing cement into recessed joint with 150 mm knife, flush. Bed paper tape into wet cement, wipe off excess with knife at shallow angle. Internal corners get done in the same coat — fold tape on the crease, bed with corner tool. External beads get their first fill coat now too. All joints, corners, and screw dimples in one session so they cure together.', watchFor: 'Air bubbles under tape = blisters after painting. Bed hard, wipe firmly. Unbedded internal corners crack every time — always tape + bed.' },
        { title: 'Coat 2: wider skim over tape', body: 'After Coat 1 cures (usually 24 hrs), knock any high spots off with the knife or damp sponge — no full sanding between coats (scuffs the sheet paper). Then knife a wider coat with 250 mm knife, feathered each side of joint. Fill low spots + cover tape completely. External corners + screw dimples get their second coat now too.', watchFor: 'Coat 2 must be smooth + feathered. Ridges + tool marks show through paint.' },
        { title: 'Coat 3: final feather + skim', body: 'After Coat 2 cures, knock high spots off again — no full sanding yet. Then Coat 3 with the 300 mm knife, feather even wider (300 mm each side of joint). External corners + screw dimples get their finishing coat. Nearly invisible when dry.', watchFor: 'Three coats = Level 4 finish (paint-ready in normal light). Critical light needs Level 5 full-wall skim.' },
        { title: 'Final sand', body: 'Sand the whole lot with a P220 sponge or pole. Feel for lumps by hand, not just eye. Mask on — jointing dust is fine.', watchFor: 'Over-sanding into joint reveals tape underneath — paper shows through paint. Sand light, feel, stop.' },
      ],
    },
  },
  {
    id: 'install-skirting',
    category: 'interior-finishing',
    phase: 'second-fix-carp',
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
        { title: 'Butt joins on a stud (mid-wall)', body: 'On very long walls where the skirting comes in two pieces, join on a stud with a scarf cut (45° or 30°) — not a 90° butt. Scarf is invisible after fill + paint; butt shows a line.', watchFor: 'Scarf cuts overlap, so the join stays tight even with timber movement. Butt joins gap open as soon as the room dries out.' },
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
        { title: 'Butt joins on a stud (mid-wall)', body: 'Long walls needing two lengths: scarf cut (45° or 30°) on a stud, not a 90° butt. Scarf invisible after fill + paint; butt shows a line.', watchFor: 'Scarfs overlap, joint stays tight with timber movement. Butts gap open as the room dries.' },
        { title: 'Fill nail holes + sand', body: 'Punch every pin below surface. Fill with wood filler, sand smooth. Painter finishes.', watchFor: 'Un-punched pins show as dots through paint. Punch every one, fill flush, sand smooth.' },
        { title: 'Sealant along top edge', body: 'Paintable acrylic sealant along skirting top where it meets wall. Tool with wet finger.', watchFor: 'Visible gap = sloppy work. Sealant hides small wall imperfections + gets painted over.' },
      ],
    },
  },
  {
    id: 'install-architrave',
    category: 'interior-finishing',
    phase: 'second-fix-carp',
    label: 'Install architrave',
    summary: 'Mitre + fix architrave to jambs, punch + fill.',
    nz: {
      tools: ['Compound mitre saw', 'Tape', 'Combination square', 'Cordless brad nailer (18 ga)', 'Hammer', 'Pin punch', 'Spirit level (short)', 'Utility knife', 'Sanding block', 'Sealant gun'],
      materials: ['Architrave profile: 60×18 or 90×18 pre-primed MDF or pine — matching the skirting style', '45 mm brad nails', 'PVA for mitres', 'Wood filler + paintable acrylic sealant'],
      steps: [
        { title: 'Check jamb sits flush with lining', body: 'Run a hand around every jamb — edge should be flush with the lining face on both sides. Any jamb that\'s proud or shy needs fixing before architrave goes on.', watchFor: 'A shy jamb leaves a shadow gap under the architrave; a proud jamb rocks the architrave off the wall. Sort it now, not after.' },
        { title: 'Mark the architrave setback', body: 'Standard setback is 3–5 mm of jamb showing at the door edge before the architrave starts. Mark this margin on the jamb top + both sides with a pencil.', watchFor: 'No setback = architrave overhangs the jamb + door hinges catch. 3–5 mm is the standard.' },
        { title: 'Cut + fix jamb pieces first', body: 'Cut both jamb architraves — 45° at top, square-cut at floor. Use an architrave offcut with a 45° cut on it as a positioning block: hold it against the setback marks at the head so you can land each jamb mitre exactly on the intersection before pinning. Pin at ~400 mm c/c into the jamb timber.', watchFor: 'Eyeballing where the mitre lands = mitres out at the top. The 45° offcut block gets the mitre point sitting on the setback lines every time.' },
        { title: 'Mark + cut the head', body: 'With both jambs fixed, either dry-hold the head timber across the top and mark where each jamb mitre meets it, or measure the distance between the top of the two jamb mitres and cut to length. Either way, 45° at each end to those marks — length is off the actual fixed jambs, no cumulative measuring error.', watchFor: 'Pre-cutting the head to a measured length before the jambs are fixed leaves you re-cutting when the walls aren\'t quite square. Mark off the real thing.' },
        { title: 'Fix head + close mitres', body: 'PVA on both mitres, offer the head up, close mitres from the outside face inward. Pin head into the jamb timber — two brads each end + one middle. Wipe glue squeeze immediately.', watchFor: 'A mitre that doesn\'t close cleanly = visible gap after paint. Undercut slightly if the wall is out, so the front face closes even if the back doesn\'t.' },
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
    phase: 'second-fix-carp',
    label: 'Install a splashback (tiled or panel)',
    summary: 'Set out feature, dry-fit, adhesive, silicone perimeter.',
    nz: {
      tools: ['Tape', 'Spirit level', 'Notched trowel (for tile) OR utility knife (for panel)', 'Cordless drill / driver', 'Wet saw or tile cutter (tile splashback)', 'Silicone gun', 'Sponge + buckets', 'Marker pen'],
      materials: ['Tiled splashback: mosaic sheets or subway tiles + adhesive + spacers + grout', 'Panel splashback: acrylic (Marbletrend Splashback), toughened glass (pre-cut to size), stainless steel, or laminate (Formica / Laminex)', 'Panel adhesive (Selleys Liquid Nails Wet Area, or heat-resistant behind cooktop)', 'Silicone (mould-resistant, matching)', 'Edge trim / cap strips'],
      steps: [
        { title: 'Confirm cabinets + bench are in', body: 'Splashback sits between bench top + underside of overhead cabinets (or up to the desired height). Bench height + cabinet position must be finalised before ordering / cutting.', watchFor: 'Ordering a splashback panel before final bench height means the panel comes back the wrong size. Measure post-install.' },
        { title: 'Set out from the cooktop or feature', body: 'Cooktop centreline is the visual anchor — start layout there so any cuts land at the edges. For a tiled splashback, plan cut tiles at the ends, full tiles across the cooktop.', watchFor: 'Random layout = a 20 mm sliver of tile beside the cooktop, which reads badly. Feature the cooktop with a full tile pattern.' },
        { title: 'Snap a horizontal reference', body: 'Chalk a level line 100–150 mm above the bench (the bottom of the splashback). Reference every tile / panel edge from this line, not off the bench (which may not be dead level).', watchFor: 'Setting off an un-level bench cascades unevenness up the wall. Snap a level reference line first.' },
        { title: 'Cut around outlets + taps', body: 'Mark power point + tap positions on the tile / panel from the wall behind. Tile: wet saw for straight cuts, diamond hole saw for taps, nippers to tidy. Acrylic / laminate panel: jigsaw with fine blade for square cuts, hole saw for taps. Glass panels come pre-cut from the supplier — no site cuts.', watchFor: 'Mark from the same fixed reference (bench edge or setback line) you used to size the panel, not off the last outlet. Cumulative measuring errors here show up as a hole in the wrong spot.' },
        { title: 'Apply adhesive + press', body: 'Tiled: notched trowel on wall, tile-and-spacer up. Panel: bead adhesive on the panel back per manufacturer (usually squiggle + perimeter), press hard to wall, hold with masking tape till adhesive grabs.', watchFor: 'Panel adhesives have specific bead patterns. Follow the manufacturer\'s diagram — random blobs give patchy bond + visible outgassing marks.' },
        { title: 'Grout (tiled) OR silicone perimeter (panel)', body: 'Tiled: after 24 hrs, grout joints + sponge off haze. Panel: silicone around all edges + at any join (panel-to-panel, panel-to-bench, panel-to-cabinet).', watchFor: 'A splashback without silicone at the bench junction lets water down behind the cabinets. Silicone every edge that meets water risk.' },
        { title: 'Fit edge trim if exposed', body: 'Exposed vertical edges (return to a fridge cavity, end of a run) need edge trim (colour-matched aluminium) or a mitred / bullnose edge. Set out before fitting.', watchFor: 'Un-trimmed panel edges chip + reveal the substrate. Trim always at exposed edges.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'Notched trowel (tile) OR utility knife (panel)', 'Cordless drill / driver', 'Wet saw or tile cutter', 'Silicone gun', 'Sponge + buckets', 'Marker pen'],
      materials: ['Tiled splashback: mosaic or subway tiles + adhesive + spacers + grout', 'Panel splashback: acrylic (Innovera, iSplash), toughened glass (pre-cut), stainless steel, or laminate (Laminex / Formica)', 'Panel adhesive (Selleys Liquid Nails Wet Area — heat-resistant behind cooktop)', 'Silicone (mould-resistant, matching)', 'Edge trim / cap strips'],
      steps: [
        { title: 'Confirm cabinets + bench are in', body: 'Splashback sits between bench + underside of overheads (or up to the desired height). Bench height + cabinet position final before ordering / cutting.', watchFor: 'Ordering before final bench height = wrong-size panel. Measure post-install.' },
        { title: 'Set out from cooktop or feature', body: 'Cooktop centreline is the visual anchor. Cuts at the ends, full tiles across cooktop.', watchFor: 'Random layout = 20 mm sliver beside cooktop, reads badly. Feature the cooktop with full pattern.' },
        { title: 'Snap a horizontal reference', body: 'Chalk level line 100–150 mm above bench (bottom of splashback). Reference every edge from this line, not bench.', watchFor: 'Un-level bench cascades unevenness up wall. Snap level line first.' },
        { title: 'Cut around outlets + taps', body: 'Mark power point + tap positions from the wall behind. Tile: wet saw + diamond hole saw for taps, nippers to tidy. Acrylic / laminate panel: jigsaw with fine blade, hole saw for taps. Glass panels come pre-cut — no site cuts.', watchFor: 'Mark from the same fixed reference (bench edge or setback line) you used to size the panel, not off the last outlet. Cumulative errors = holes in the wrong spot.' },
        { title: 'Apply adhesive + press', body: 'Tiled: notched trowel on wall, tile-and-spacer up. Panel: bead adhesive on back per manufacturer (squiggle + perimeter), press to wall, masking tape hold till grab.', watchFor: 'Panel adhesives have specific bead patterns. Follow diagram — random blobs = patchy bond + outgassing marks.' },
        { title: 'Grout (tiled) OR silicone perimeter (panel)', body: 'Tiled: 24 hrs, grout + sponge. Panel: silicone all edges + panel-to-bench + panel-to-cabinet.', watchFor: 'Splashback without silicone at bench = water behind cabinets. Silicone every edge with water risk.' },
        { title: 'Fit edge trim if exposed', body: 'Exposed vertical edges (return to fridge cavity, end of run) need trim (colour-matched aluminium) or mitre / bullnose. Set out before fitting.', watchFor: 'Un-trimmed edges chip + reveal substrate. Trim at exposed edges.' },
      ],
    },
  },
  {
    id: 'install-cabinets',
    category: 'interior-finishing',
    phase: 'second-fix-trades',
    label: 'Install cabinets (kitchen or laundry)',
    summary: 'Overhead first, base level on legs, screw to studs + together.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Stud finder', 'F-clamps', 'Marker pen', 'Trestle or stand', 'Packers / shims'],
      materials: ['Cabinet carcasses (flat-pack or pre-assembled — Melamine / MDF / ply)', '65–75 mm bugle screws (cabinets to wall studs)', '35 mm cabinet-to-cabinet screws (through side panels)', 'Adjustable levelling legs (base cabinets) + kickboard clip system', 'Kickboard (matching cabinet finish)', 'Filler panels (matching)', 'Cabinet-hanging brackets (overheads: usually EasyGates or similar rail system)'],
      steps: [
        { title: 'Confirm services are roughed-in', body: 'Plumber\'s hot / cold + waste for sink, electrical for oven + rangehood + power points, gas for cooktop — all must be positioned per the cabinet layout drawing before cabinets go in.', watchFor: 'Cabinets fitted around wrongly-positioned services = re-cut cabinet backs (visible + weak) or re-plumb (expensive). Coordinate before install day.' },
        { title: 'Mark cabinet positions on wall + floor', body: 'From the layout drawing, mark base cabinet perimeter on the floor + overhead cabinet perimeter on the wall. Note stud positions relative to fixings.', watchFor: 'Fitting cabinets without marking = drift as the run goes on. A 5 mm drift per cabinet compounds to 30+ mm over a 6-cabinet run.' },
        { title: 'Install overhead cabinets first', body: 'Fit a hanging rail (EasyGates / similar) along the wall at the correct height. Hook each overhead onto the rail — the rail catches the weight, so solo lift + fix is fine. Fix through the back rail into stud with 65 mm bugle screws, adjust the rail levellers, done.', watchFor: 'Fitting overheads AFTER base cabinets = restricted access + can\'t lift the cabinet high enough. Overheads first, always.' },
        { title: 'Level base cabinets on legs', body: 'Adjust each cabinet\'s levelling legs (4 per cabinet) so cabinet top is level in both directions + tops all match across the run. Use a long spirit level or a laser to sight across cabinets.', watchFor: 'Un-level base cabinets = un-level bench top = a nightmare for whoever\'s fitting the top. Level tops within 1 mm across the whole run.' },
        { title: 'Screw base cabinets together', body: 'Clamp adjacent cabinets face-flush at the front, then screw through side panels with 35 mm cabinet screws (3 per pair: top, middle, bottom). Cabinets act as one unit once screwed.', watchFor: 'Face frames not flush = a visible step between cabinets. Clamp faces flush BEFORE screwing.' },
        { title: 'Fix base cabinets to wall', body: 'Through the cabinet back rail into wall studs with 65 mm bugle screws (2 per cabinet minimum). Straps or blocking behind if a stud doesn\'t line up.', watchFor: 'Base cabinets not fixed to the wall drift forward under sink use + open drawers slam back. Always wall-fix.' },
        { title: 'Fit kickboards, fillers, cornices', body: 'Kickboard clips onto adjustable legs, cut to length between end panels. Filler panels at end returns (fridge cavity, walls). Cornice / pelmet along top of overheads if design calls.', watchFor: 'Un-fitted kickboards leave a visible gap under cabinets + collect dust + water. Every base cabinet run gets kickboards.' },
        { title: 'Hand over for benchtop', body: 'Benchtop is a separate day — the fabricator or installer templates the cabinet tops after cabinets are in + level. Confirm cabinet-to-cabinet joints are locked, no movement.', watchFor: 'A benchtop templated onto un-locked cabinets moves after install + the joint cracks (stone) or the substrate flexes (laminate). Templating requires cabinets in final position.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Stud finder', 'F-clamps', 'Marker pen', 'Trestle or stand', 'Packers / shims'],
      materials: ['Cabinet carcasses (flat-pack or pre-assembled — Melamine / MDF / ply)', '65–75 mm Type 17 screws (cabinets to wall studs)', '35 mm cabinet-to-cabinet screws', 'Adjustable levelling legs + kickboard clip system', 'Kickboard (matching finish)', 'Filler panels (matching)', 'Cabinet-hanging brackets (overheads)'],
      steps: [
        { title: 'Confirm services are roughed-in', body: 'Plumber\'s hot / cold + waste for sink, electrician for oven + rangehood + power, gas for cooktop — all positioned per cabinet layout before cabinets go in.', watchFor: 'Cabinets around wrongly-positioned services = re-cut backs (visible + weak) or re-plumb. Coordinate before install day.' },
        { title: 'Mark cabinet positions on wall + floor', body: 'From the layout drawing, mark base cabinet perimeter on floor + overhead perimeter on wall. Note stud positions relative to fixings.', watchFor: 'Un-marked = drift as run goes on. 5 mm drift per cabinet compounds to 30+ mm over 6 cabinets.' },
        { title: 'Install overhead cabinets first', body: 'Fit hanging rail along wall at correct height. Hook each overhead onto the rail — rail catches the weight so solo lift + fix is fine. Fix through back rail into stud with 65 mm Type 17s, adjust rail levellers, done.', watchFor: 'Overheads after base = restricted access + can\'t lift high enough. Overheads first.' },
        { title: 'Level base cabinets on legs', body: 'Adjust levelling legs (4 per cabinet) so cabinet top is level both directions + tops match across the run. Long spirit level or laser to sight across cabinets.', watchFor: 'Un-level bases = un-level bench = nightmare for stone fabricator. Level tops within 1 mm across the whole run.' },
        { title: 'Screw base cabinets together', body: 'Clamp adjacent cabinets face-flush at front, screw through side panels with 35 mm screws (3 per pair). Cabinets act as one unit once screwed.', watchFor: 'Face frames not flush = visible step. Clamp faces flush BEFORE screwing.' },
        { title: 'Fix base cabinets to wall', body: 'Through cabinet back rail into wall studs with 65 mm Type 17s (2 per cabinet min). Straps / blocking behind if a stud doesn\'t line up.', watchFor: 'Un-wall-fixed base cabinets drift forward under sink use + open drawers slam back. Always wall-fix.' },
        { title: 'Fit kickboards, fillers, cornices', body: 'Kickboard clips onto legs, cut to length between end panels. Filler panels at end returns. Cornice / pelmet along top of overheads if design calls.', watchFor: 'Un-fitted kickboards = visible gap + collects dust / water. Every base cabinet run gets kickboards.' },
        { title: 'Hand over for benchtop', body: 'Benchtop is separate — fabricator or installer templates the cabinet tops after install + level. Confirm cabinet-to-cabinet joints locked, no movement.', watchFor: 'Benchtop templated onto un-locked cabinets moves + the joint cracks (stone) or the substrate flexes (laminate). Templating requires final position.' },
      ],
    },
  },

  // ─── Waterproofing — after linings, before wet-area finish ──────────────
  {
    id: 'waterproof-wet-area',
    category: 'wet-areas',
    phase: 'linings',
    label: 'Waterproof a wet area',
    summary: 'Licensed work: primer, bond-breaker at corners, two membrane coats, cure + certify.',
    nz: {
      tools: ['(Licensed waterproofer brings own tools)'],
      materials: ['(Licensed waterproofer supplies primer, membrane, bond-breaker tape, corner fillets)'],
      steps: [
        { title: 'Confirm a licensed waterproofer is booked', body: 'Waterproofing wet areas is Restricted Building Work under the Building Act — must be done by a Licensed Building Practitioner (LBP) with the waterproofing licence class, or a registered waterproofer. Book them in ahead of the tiler / liner install so the finish trades aren\'t held up.', watchFor: 'DIY waterproofing fails council sign-off + isn\'t insurable. Not a step to save money on — leaks show up 6–12 months later + strip a bathroom back to framing to fix.' },
        { title: 'Walk the site with them + confirm scope', body: 'Waterproofer needs the plans (wet area layout, shower recess, waste positions, splashback heights) and access once the walls are lined + shower base is in but before any tiling or liner. Confirm the E3/AS1 wet-area classification + membrane spec on site.', watchFor: 'Missed area = leak point. Cross-check every wet area (bathroom floor, shower walls to spec height, laundry, WC splash zones) with the waterproofer before they start.' },
        { title: 'Sign off + keep the paperwork', body: 'Waterproofer issues a Producer Statement / Waterproofing Warranty for their work. Keep it for the CCC (Code Compliance Certificate) application at the end of the build.', watchFor: 'No paperwork = no CCC + no insurance recourse if it later leaks. Chase the certificate the day the work is done.' },
      ],
    },
    au: {
      tools: ['(Licensed waterproofer brings own tools)'],
      materials: ['(Licensed waterproofer supplies primer, membrane, bond-breaker tape, corner fillets)'],
      steps: [
        { title: 'Confirm a licensed waterproofer is booked', body: 'Waterproofing wet areas must be done by a waterproofer licensed in your state (VBA / QBCC / NSW Fair Trading / etc.). Book ahead of the tiler / liner install so finish trades aren\'t held up.', watchFor: 'DIY waterproofing fails building surveyor sign-off + isn\'t insurable. Leaks show up 6–12 months later + strip a bathroom back to framing to fix.' },
        { title: 'Walk the site with them + confirm scope', body: 'Waterproofer needs the plans (wet area layout, shower recess, waste positions, splashback heights) and access once walls are lined + shower base is in but before any tiling. Confirm the AS 3740 wet-area classification + membrane spec on site.', watchFor: 'Missed area = leak point. Cross-check every wet area (bathroom floor, shower walls to spec height, laundry, WC splash zones) with the waterproofer before they start.' },
        { title: 'Sign off + keep the paperwork', body: 'Waterproofer issues a Compliance Certificate (per AS 3740) + waterproofing warranty for their work. Keep it for the final Occupancy Certificate / building surveyor sign-off.', watchFor: 'No paperwork = no final sign-off + no insurance recourse if it leaks later. Chase the certificate the day the work\'s done.' },
      ],
    },
  },

  // ─── 2nd-fix trades — fittings after painting is done ───────────────────
  {
    id: 'plumbing-second-fix',
    category: 'services',
    phase: 'second-fix-trades',
    label: 'Plumbing 2nd fix',
    summary: 'Licensed plumber only. All fixtures + fittings: taps, toilet, basin, kitchen sink, dishwasher connection, appliance plumbing.',
    nz: {
      tools: ['(Licensed plumber brings own tools)'],
      materials: ['(Licensed plumber supplies mixers, fittings, wastes, traps, connectors)'],
      steps: [
        { title: 'Confirm the plumber is booked + fixtures on site', body: 'A PGDB-licensed plumber fits off all fixtures — bathroom mixers, WC, basin, kitchen sink, dishwasher connection, laundry tub, appliance plumbing. Book them after painting is done but before benchtops if the sink goes through the top.', watchFor: 'Fixtures not on site = wasted trip. Have every mixer, waste kit, WC pan, and cistern on site before the plumber arrives.' },
        { title: 'Sign off + keep the paperwork', body: 'Plumber issues an updated Certificate of Compliance covering the second-fix work. Keep it with the rough-in cert for the CCC application.', watchFor: 'One certificate per job stage — chase the 2nd-fix cert the day the work\'s done, not months later.' },
      ],
    },
    au: {
      tools: ['(Licensed plumber brings own tools)'],
      materials: ['(Licensed plumber supplies mixers, fittings, wastes, traps, connectors)'],
      steps: [
        { title: 'Confirm the plumber is booked + fixtures on site', body: 'A state-licensed plumber fits off all fixtures — bathroom mixers, WC, basin, kitchen sink, dishwasher connection, laundry tub, appliance plumbing. Book them after painting is done but before benchtops if the sink goes through the top.', watchFor: 'Fixtures not on site = wasted trip. Have every mixer, waste kit, WC pan, and cistern on site before the plumber arrives.' },
        { title: 'Sign off + keep the paperwork', body: 'Plumber issues an updated Compliance Certificate (per AS/NZS 3500) covering the second-fix work. Keep it with the rough-in cert for the final surveyor sign-off.', watchFor: 'One certificate per job stage — chase the 2nd-fix cert the day the work\'s done.' },
      ],
    },
  },
  {
    id: 'electrical-second-fix',
    category: 'services',
    phase: 'second-fix-trades',
    label: 'Electrical + aircon 2nd fix',
    summary: 'Licensed electrician + aircon installer. All powerpoints, switches, light fittings, aircon head units + commissioning, appliance wiring.',
    nz: {
      tools: ['(Licensed electrician + aircon installer bring own tools)'],
      materials: ['(Trades supply face plates, light fittings, head units, registers)'],
      steps: [
        { title: 'Confirm sparky + aircon installer are booked + fittings on site', body: 'A registered electrician fits off all powerpoints, switches, light fittings, and appliance wiring. Aircon installer commissions head units + refrigerant charge. Book after painting is done. Fittings on site: face plates, light fittings, downlights, LED strips, head units.', watchFor: 'Missing light fittings on 2nd-fix day = sparky returns for a half-hour job = charge-out. Everything on site before they arrive.' },
        { title: 'Sign off + keep the paperwork', body: 'Electrician issues an updated Electrical Certificate of Compliance (ECoC) covering 2nd fix. Aircon installer issues their compliance paperwork. Both go with the rough-in certs for the CCC application.', watchFor: 'No 2nd-fix ECoC = no CCC. Chase paperwork same day.' },
      ],
    },
    au: {
      tools: ['(Licensed electrician + aircon installer bring own tools)'],
      materials: ['(Trades supply face plates, light fittings, head units, registers)'],
      steps: [
        { title: 'Confirm sparky + aircon installer are booked + fittings on site', body: 'A state-licensed electrician fits off all powerpoints, switches, light fittings, appliance wiring. ARC-licensed aircon installer commissions head units + refrigerant charge. Book after painting. Fittings on site: face plates, light fittings, downlights, LED strips, head units.', watchFor: 'Missing fittings on 2nd-fix day = trade returns for a half-hour job = charge-out. Everything on site before they arrive.' },
        { title: 'Sign off + keep the paperwork', body: 'Electrician issues a Certificate of Electrical Safety (CES / equivalent) covering 2nd fix. Aircon installer issues compliance paperwork. Both go with rough-in certs for final surveyor sign-off.', watchFor: 'No 2nd-fix CES = no final sign-off. Chase paperwork same day.' },
      ],
    },
  },
  {
    id: 'template-benchtop',
    category: 'interior-finishing',
    phase: 'second-fix-trades',
    label: 'Template benchtop',
    summary: 'Cabinetmaker / fabricator templates off installed cabinets — stone, laminate, or timber.',
    nz: {
      tools: ['(Fabricator brings own templating tools)'],
      materials: ['(No materials — templating only)'],
      steps: [
        { title: 'Confirm cabinets are locked in + level', body: 'Cabinets fixed together + wall-fixed, tops dead level across the run, no movement. Templater measures off the actual cabinets — any movement after templating = re-cut benchtop.', watchFor: 'Cabinets that shift between template + install = benchtop doesn\'t fit. Lock everything before the templater arrives.' },
        { title: 'Book the templater + confirm sink / cooktop cut-outs', body: 'Fabricator (stone / laminate / timber) needs the sink model + cooktop model on site (or dimensions confirmed) so the templater includes the cut-out details. Templating usually takes 30–60 min, benchtop returns 1–3 weeks depending on material.', watchFor: 'Templating without the sink model on site = generic cut-out that may not match. Have the actual sink + cooktop on site or the exact model number.' },
      ],
    },
    au: {
      tools: ['(Fabricator brings own templating tools)'],
      materials: ['(No materials — templating only)'],
      steps: [
        { title: 'Confirm cabinets are locked in + level', body: 'Cabinets fixed together + wall-fixed, tops dead level across the run, no movement. Templater measures off the actual cabinets — any movement after templating = re-cut benchtop.', watchFor: 'Cabinets that shift between template + install = benchtop doesn\'t fit. Lock everything before templater arrives.' },
        { title: 'Book the templater + confirm sink / cooktop cut-outs', body: 'Fabricator (stone / laminate / timber) needs sink + cooktop model on site (or dimensions confirmed) so templater includes cut-out detail. Templating 30–60 min, benchtop returns 1–3 weeks depending on material.', watchFor: 'Templating without the sink model = generic cut-out that may not match. Actual sink + cooktop or exact model on site.' },
      ],
    },
  },
  {
    id: 'install-benchtop',
    category: 'interior-finishing',
    phase: 'second-fix-trades',
    label: 'Install benchtop',
    summary: 'Cabinetmaker / fabricator returns to install cut-to-template benchtop + seal joins.',
    nz: {
      tools: ['(Fabricator brings own install tools)'],
      materials: ['(Fabricator supplies benchtop, adhesive, silicone, seam kit)'],
      steps: [
        { title: 'Prep the cabinets for delivery', body: 'Clear the run — kick sanders, off-cuts, tools off the tops. If sink cut-out is in the top, make sure the plumber\'s isolation valves are accessible + waste rough-in ready.', watchFor: 'Fabricator arrives to a cluttered run = install stalls while they wait. Have the run clear + accessible.' },
        { title: 'Fabricator installs + seals joins', body: 'Stone: silicone bed on cabinet tops, drop stone in, join with seam kit + colour-matched adhesive. Laminate: fixed with pan-head screws through cabinet top rails + silicone / seam trim at joins. Once in, the plumber comes back to fit the sink + waste.', watchFor: 'Stone joins that show as a visible line = colour-match wasn\'t done well. Standard for a good stone install is a nearly invisible seam — pull the fabricator up if it\'s obvious.' },
      ],
    },
    au: {
      tools: ['(Fabricator brings own install tools)'],
      materials: ['(Fabricator supplies benchtop, adhesive, silicone, seam kit)'],
      steps: [
        { title: 'Prep the cabinets for delivery', body: 'Clear the run — sanders, off-cuts, tools off tops. Sink cut-out through the top: plumber\'s isolation valves + waste rough-in accessible.', watchFor: 'Fabricator arrives to a cluttered run = install stalls. Clear + accessible.' },
        { title: 'Fabricator installs + seals joins', body: 'Stone: silicone bed on cabinet tops, drop stone in, join with seam kit + colour-matched adhesive. Laminate: pan-head screws through cabinet top rails + silicone / seam trim. Then plumber back for sink + waste.', watchFor: 'Stone joins showing as visible line = colour-match not done well. Standard = nearly invisible seam.' },
      ],
    },
  },
  {
    id: 'install-kitchen-appliances',
    category: 'services',
    phase: 'second-fix-trades',
    label: 'Install kitchen appliances',
    summary: 'Coordinate sparky + plumber. Built-in oven wired, cooktop drop-in, rangehood ducted, dishwasher plumbed + wired.',
    nz: {
      tools: ['Cordless drill / driver', 'Screwdriver', 'Spanner set', 'Tape'],
      materials: ['Appliances (oven, cooktop, rangehood, dishwasher — per client spec)', 'Ducting for rangehood (150 mm rigid, or per manufacturer)', 'Silicone (cooktop drop-in)', 'Anti-tip bracket kit (per appliance)'],
      steps: [
        { title: 'Book the right trade for each appliance', body: 'Built-in oven: sparky terminates the appliance connection. Cooktop (gas): gasfitter connects + tests. Cooktop (induction / electric): sparky. Dishwasher: plumber (waste + water supply) + sparky (power point). Rangehood: sparky + ducting run to outside.', watchFor: 'Appliances not on site = wasted trip. Have every appliance delivered + uncrated before the trade arrives.' },
        { title: 'Level, secure + commission each appliance', body: 'Oven slides into cabinet on runners, fixed with the appliance\'s own screws through the trim into cabinet sides. Cooktop drops into benchtop cut-out with silicone bead around the edge. Dishwasher levels on feet, anti-tip bracket into cabinet or wall. Rangehood fixed to underside of overhead + ducted out through the wall or ceiling. Trade tests full-cycle before leaving.', watchFor: 'Anti-tip brackets are code-required on freestanding ovens — kids climb on open oven doors + the whole thing tips. Not optional.' },
      ],
    },
    au: {
      tools: ['Cordless drill / driver', 'Screwdriver', 'Spanner set', 'Tape'],
      materials: ['Appliances (oven, cooktop, rangehood, dishwasher — per client spec)', 'Ducting for rangehood (150 mm rigid, or per manufacturer)', 'Silicone (cooktop drop-in)', 'Anti-tip bracket kit'],
      steps: [
        { title: 'Book the right trade for each appliance', body: 'Built-in oven: sparky terminates. Cooktop (gas): gasfitter connects + tests. Cooktop (induction / electric): sparky. Dishwasher: plumber (waste + water) + sparky (power). Rangehood: sparky + duct out.', watchFor: 'Appliances not on site = wasted trip. Have every appliance delivered + uncrated before the trade arrives.' },
        { title: 'Level, secure + commission each appliance', body: 'Oven slides into cabinet on runners, fixed with appliance screws through trim. Cooktop drops into benchtop cut-out with silicone bead. Dishwasher levels on feet, anti-tip bracket into cabinet or wall. Rangehood fixed to underside of overhead + ducted out. Trade tests full-cycle before leaving.', watchFor: 'Anti-tip brackets are AS 60335.2.6-required on freestanding ovens. Not optional.' },
      ],
    },
  },
  {
    id: 'fit-cabinet-kickboards-handles',
    category: 'interior-finishing',
    phase: 'second-fix-trades',
    label: 'Fit kickboards + handles',
    summary: 'Clip kickboards to levelling legs, fit handles, adjust soft-close for consistent gaps.',
    nz: {
      tools: ['Cordless drill / driver', 'Screwdriver', 'Tape', 'Combination square', 'Pencil', 'Utility knife'],
      materials: ['Kickboard (matching cabinet finish, cut to length)', 'Handles (spec\'d per client) + fixings', 'Kickboard clips (usually supplied with cabinet legs)'],
      steps: [
        { title: 'Cut + clip kickboards', body: 'Kickboards left off during install so bench height + services can be worked around. Cut kickboard to length between end panels (allow for corners + returns). Clip onto the levelling legs — no visible screws.', watchFor: 'Kickboard too long jams at the end panels + bows outward. Cut to 2 mm shorter than the actual measurement for a clean fit.' },
        { title: 'Fit handles + adjust soft-close', body: 'Handles fit through pre-drilled holes in doors + drawer fronts — check the design drawing for the position (horizontal vs vertical, offset from edge). Adjust each door + drawer\'s soft-close hinges so the gaps around the doors are consistent (3 mm typical).', watchFor: 'Inconsistent door gaps read as sloppy work. Adjust every hinge — the whole run should look uniform.' },
      ],
    },
    au: {
      tools: ['Cordless drill / driver', 'Screwdriver', 'Tape', 'Combination square', 'Pencil', 'Utility knife'],
      materials: ['Kickboard (matching finish, cut to length)', 'Handles (per client spec) + fixings', 'Kickboard clips (supplied with cabinet legs)'],
      steps: [
        { title: 'Cut + clip kickboards', body: 'Kickboards left off during install so bench height + services can be worked around. Cut kickboard to length between end panels (allow for corners + returns). Clip onto levelling legs — no visible screws.', watchFor: 'Too long = jams at end panels + bows. Cut 2 mm shorter than measurement for a clean fit.' },
        { title: 'Fit handles + adjust soft-close', body: 'Handles fit through pre-drilled holes in doors + drawer fronts — check the design drawing for position (horizontal vs vertical, offset from edge). Adjust each hinge\'s soft-close so gaps around doors are consistent (3 mm typical).', watchFor: 'Inconsistent gaps read as sloppy. Adjust every hinge — the whole run should look uniform.' },
      ],
    },
  },

  // ─── Painting — after all linings + trim, before flooring ───────────────
  {
    id: 'prep-prime-plasterboard',
    category: 'painting',
    phase: 'painting',
    label: 'Prep + prime plasterboard',
    summary: 'Dust off, sealer-primer to walls + ceilings for even topcoat absorption.',
    nz: {
      tools: ['Dust brush / broom', 'Vacuum', 'Drop sheets', 'Masking tape', 'Roller frame + sleeves (12 mm nap for sealer)', 'Cutting brush (50–63 mm)', 'Paint tray + liner', 'Extension pole', 'Ladder / trestle'],
      materials: ['Sealer-primer (Resene Sureseal / Broadwall Surface Prep / Dulux 1 Step)', 'Filler for touch-up (Gib Trade Set or Poly Filler)', 'Paintable acrylic sealant for gaps at trim junctions'],
      steps: [
        { title: 'Dust off + protect', body: 'Vacuum + sweep every wall + ceiling to remove sanding dust — sealer won\'t bond over dust. Drop sheets on floors, mask trim + door jambs with painter\'s tape.', watchFor: 'Skipped dust removal = sealer forms a skin over dust + flakes off in 6 months. Vacuum, don\'t just wipe.' },
        { title: 'Touch up any late-arrival dings', body: 'Walk every surface with the site lights on + fill any last-minute dings, screw pops, or missed spots with filler. Sand flush once dry. This is your last easy chance before topcoats.', watchFor: 'A ding that shows up under paint takes 3× the effort to fix later (fill, sand, spot-prime, spot-topcoat, and the patch usually shows). Get it now.' },
        { title: 'Roll sealer to walls + ceilings', body: 'Cut in with a brush at ceiling / cornice / corner / trim edges first. Then roll — one full coat, even coverage, no missed spots. Sealer soaks into the plasterboard face + evens absorption for the topcoat.', watchFor: 'Skipping sealer = topcoat absorbs unevenly into paper vs joints = "picture-framing" (a visible outline around every joint). Sealer is not optional on new Gib.' },
      ],
    },
    au: {
      tools: ['Dust brush / broom', 'Vacuum', 'Drop sheets', 'Masking tape', 'Roller frame + sleeves (12 mm nap)', 'Cutting brush (50–63 mm)', 'Paint tray + liner', 'Extension pole', 'Ladder / trestle'],
      materials: ['Sealer-primer (Dulux Prep 1-Step / Taubmans Prep-Rite / Wattyl Sealer Undercoat)', 'Filler for touch-up (CSR Total Joint or gyprock top coat)', 'Paintable acrylic sealant for gaps at trim junctions'],
      steps: [
        { title: 'Dust off + protect', body: 'Vacuum + sweep every wall + ceiling to remove sanding dust — sealer won\'t bond over dust. Drop sheets on floors, mask trim + reveals with painter\'s tape.', watchFor: 'Skipped dust removal = sealer skins over dust + flakes off in 6 months. Vacuum, don\'t just wipe.' },
        { title: 'Touch up any late-arrival dings', body: 'Walk every surface with site lights on + fill any last-minute dings, screw pops, or missed spots with filler. Sand flush once dry. Last easy chance before topcoats.', watchFor: 'A ding under paint takes 3× the effort to fix later (fill, sand, spot-prime, spot-topcoat, and the patch usually shows). Get it now.' },
        { title: 'Roll sealer to walls + ceilings', body: 'Cut in with a brush at ceiling / cornice / corner / trim edges first. Then roll — one full coat, even coverage, no missed spots. Sealer soaks into the plasterboard face + evens absorption for the topcoat.', watchFor: 'Skipping sealer = topcoat absorbs unevenly into paper vs joints = "picture-framing" (visible outline around every joint). Sealer is not optional on new plasterboard.' },
      ],
    },
  },
  {
    id: 'paint-walls-ceilings',
    category: 'painting',
    phase: 'painting',
    label: 'Paint walls + ceilings (2 topcoats)',
    summary: 'Cut in, roll two topcoats, sand light between coats.',
    nz: {
      tools: ['Roller frame + sleeves (10–12 mm nap for smooth surfaces)', 'Cutting brush (50–63 mm angled sash)', 'Paint tray + liner', 'Extension pole', 'Drop sheets', 'Masking tape', 'Ladder / trestle', 'Sanding sponge (P220–P320)', 'Lint-free cloth'],
      materials: ['Ceiling paint (Resene Ceiling Flat, Dulux Wash&Wear Ceiling — matte white typical)', 'Wall paint (Resene Zylone / SpaceCote Low Sheen / Dulux Wash&Wear Low Sheen — colour per client)', 'Paint stirrer'],
      steps: [
        { title: 'Ceilings first, then walls', body: 'Cut in ceiling perimeter with a brush, then roll ceiling with a full 10–12 mm sleeve on an extension pole. Two coats, letting each fully cure (usually 2 hrs). Then cut walls + roll walls in the same two-coat sequence. Ceilings first stops splatter marking finished walls.', watchFor: 'Walls before ceilings = you drip ceiling paint onto your finished wall + start over. Ceilings first, every time.' },
        { title: 'Light sand + wipe between coats', body: 'After Coat 1 is fully dry, run a fine sanding sponge (P220 or finer) lightly over the surface to knock off any nibs or dust bits. Wipe with a slightly damp lint-free cloth. Then apply Coat 2.', watchFor: 'Skipping the sand + wipe leaves nibs / dust locked into Coat 2 forever. Two minutes per wall saves the finish.' },
        { title: 'Check under critical light', body: 'When Coat 2 is dry, walk every wall + ceiling with the site lights on AND with the natural light (if you can). Any misses, thin spots, or lap marks get spot-fixed with a small roller before painter leaves.', watchFor: 'Lap marks + roller stops show badly in raking light — especially on ceilings in the morning / evening sun. Check while it\'s fresh, not after handover.' },
      ],
    },
    au: {
      tools: ['Roller frame + sleeves (10–12 mm nap)', 'Cutting brush (50–63 mm angled sash)', 'Paint tray + liner', 'Extension pole', 'Drop sheets', 'Masking tape', 'Ladder / trestle', 'Sanding sponge (P220–P320)', 'Lint-free cloth'],
      materials: ['Ceiling paint (Dulux Ceiling Flat, Taubmans Ceiling — matte white typical)', 'Wall paint (Dulux Wash&Wear Low Sheen / Taubmans Endure — colour per client)', 'Paint stirrer'],
      steps: [
        { title: 'Ceilings first, then walls', body: 'Cut in ceiling perimeter with a brush, then roll ceiling with a full 10–12 mm sleeve on an extension pole. Two coats, each fully cured (usually 2 hrs). Then cut walls + roll walls in the same two-coat sequence. Ceilings first stops splatter marking finished walls.', watchFor: 'Walls before ceilings = drip ceiling paint on your finished wall + start over. Ceilings first, every time.' },
        { title: 'Light sand + wipe between coats', body: 'After Coat 1 is fully dry, run a fine sanding sponge (P220 or finer) lightly over the surface to knock off nibs or dust bits. Wipe with a slightly damp lint-free cloth. Then Coat 2.', watchFor: 'Skipping the sand + wipe locks nibs / dust into Coat 2 forever. Two minutes per wall saves the finish.' },
        { title: 'Check under critical light', body: 'When Coat 2 is dry, walk every wall + ceiling with site lights on AND with natural light (if you can). Misses, thin spots, or lap marks get spot-fixed with a small roller before the painter leaves.', watchFor: 'Lap marks + roller stops show in raking light — especially ceilings in morning / evening sun. Check while it\'s fresh.' },
      ],
    },
  },
  {
    id: 'paint-timber-trim',
    category: 'painting',
    phase: 'painting',
    label: 'Paint timber trim + doors',
    summary: 'Undercoat + two enamel or acrylic topcoats to skirtings, architraves, doors.',
    nz: {
      tools: ['Cutting brush (38–50 mm angled sash)', 'Small roller sleeve (4 mm foam) for doors', 'Paint tray + liner', 'Masking tape', 'Sanding sponge (P220–P320)', 'Lint-free cloth', 'Filler + knife for nail-hole touch-up'],
      materials: ['Trim undercoat (Resene Quick Dry / Dulux 1 Step) — if trim is bare timber or MDF', 'Trim enamel (Resene Enamacryl / Lustacryl for water-based, or Dulux Aquanamel) — semi-gloss standard', 'Wood filler for nail holes', 'Paintable sealant for wall / trim gaps'],
      steps: [
        { title: 'Fill nail holes + sand', body: 'Pre-primed trim usually has punched-and-filled nail holes from the carpenter, but check every one. Fill any misses, sand flush + smooth once dry. Wipe with a lint-free cloth.', watchFor: 'Un-filled nail holes show as dots forever under semi-gloss trim paint. Every hole gets filled + sanded flush before undercoat.' },
        { title: 'Undercoat any bare timber or MDF', body: 'Pre-primed trim skips this — go straight to topcoats. Bare timber or MDF trim gets one undercoat coat, brushed on, sanded lightly after cure with a P220 sponge.', watchFor: 'Missing undercoat on bare MDF = topcoat soaks in unevenly + the finish looks patchy. Prime everything bare before topcoats.' },
        { title: 'Two topcoats — brush + light sand between', body: 'Brush enamel or acrylic trim paint onto skirting, architrave, door faces. Two coats, sand lightly between coats with a P320 sponge, wipe. On doors, small foam roller across the flat panels gives a smoother finish than a brush.', watchFor: 'Brush marks in semi-gloss trim look amateur. Load the brush properly + finish each stroke with a light, dry pass in the direction of the grain / long axis.' },
        { title: 'Seal wall / trim gap', body: 'Bead of paintable acrylic sealant along the top edge of skirting + outside edge of architrave where they meet the wall paint. Tool with a wet finger. Doesn\'t need painting over if sealant is colour-matched to wall paint.', watchFor: 'Gaps between trim + wall read as amateur work, even after paint. Seal every trim edge.' },
      ],
    },
    au: {
      tools: ['Cutting brush (38–50 mm angled sash)', 'Small roller sleeve (4 mm foam) for doors', 'Paint tray + liner', 'Masking tape', 'Sanding sponge (P220–P320)', 'Lint-free cloth', 'Filler + knife for nail-hole touch-up'],
      materials: ['Trim undercoat (Dulux Prep 1 Step / Taubmans Prep-Rite) — for bare timber or MDF', 'Trim enamel (Dulux Aquanamel Semi-Gloss / Taubmans Trim + Panel) — water-based standard', 'Wood filler for nail holes', 'Paintable sealant for wall / trim gaps'],
      steps: [
        { title: 'Fill nail holes + sand', body: 'Pre-primed trim usually has punched-and-filled nail holes from the carpenter, but check every one. Fill misses, sand flush once dry. Wipe with a lint-free cloth.', watchFor: 'Un-filled nail holes show as dots under semi-gloss trim paint. Every hole filled + sanded flush before undercoat.' },
        { title: 'Undercoat any bare timber or MDF', body: 'Pre-primed trim skips this — straight to topcoats. Bare timber or MDF gets one undercoat, brushed on, sanded lightly after cure with a P220 sponge.', watchFor: 'Missing undercoat on bare MDF = topcoat soaks in unevenly + patchy finish. Prime everything bare before topcoats.' },
        { title: 'Two topcoats — brush + light sand between', body: 'Brush enamel or acrylic trim paint on skirting, architrave, door faces. Two coats, light sand between with P320 sponge, wipe. On doors, small foam roller across flat panels gives a smoother finish than a brush.', watchFor: 'Brush marks in semi-gloss trim look amateur. Load brush properly + finish each stroke with a light dry pass in the direction of the grain / long axis.' },
        { title: 'Seal wall / trim gap', body: 'Paintable acrylic sealant along top of skirting + outside edge of architrave where they meet wall paint. Tool with a wet finger. Colour-matched sealant doesn\'t need painting over.', watchFor: 'Gaps between trim + wall read as amateur even after paint. Seal every trim edge.' },
      ],
    },
  },

  // ─── Flooring — carpet, vinyl, timber, laminate ─────────────────────────
  {
    id: 'lay-carpet',
    category: 'flooring',
    phase: 'flooring',
    label: 'Lay carpet + underlay',
    summary: 'Specialist carpet layer. Underlay, gripper rods around perimeter, stretch + trim carpet to walls.',
    nz: {
      tools: ['(Carpet layer brings own tools — knee kicker, power stretcher, seaming iron, gripper cutter)'],
      materials: ['(Carpet layer supplies underlay, gripper rod, seaming tape — client-selected carpet delivered to site)'],
      steps: [
        { title: 'Book the carpet layer + confirm site is ready', body: 'Rooms fully painted, skirtings on, all trades out. Sub-floor swept clean, any nails / staples flush. Ensure the room is clean and empty before the layer arrives.', watchFor: 'Carpet arriving to a room with tradies still finishing = carpet gets marked or delayed. Coordinate the layer for after everyone else is out.' },
        { title: 'Sign off + handover care instructions', body: 'Walk the finished job with the layer — check seams sit flat, stretch is even, no wrinkles. Any manufacturer care instructions get handed to client at final handover.', watchFor: 'A wrinkled or lifting seam picked up now = layer comes back to fix. A wrinkle noticed after handover = client callback. Check while the layer is still on site.' },
      ],
    },
    au: {
      tools: ['(Carpet layer brings own tools — knee kicker, power stretcher, seaming iron, gripper cutter)'],
      materials: ['(Carpet layer supplies underlay, gripper rod, seaming tape — client-selected carpet delivered to site)'],
      steps: [
        { title: 'Book the carpet layer + confirm site is ready', body: 'Rooms fully painted, skirtings on, trades out. Sub-floor swept, nails / staples flush. Ensure the room is clean and empty before the layer arrives.', watchFor: 'Carpet arriving to a room with tradies still finishing = marked or delayed carpet. Coordinate for after everyone else is out.' },
        { title: 'Sign off + handover care instructions', body: 'Walk the finished job with the layer — seams flat, stretch even, no wrinkles. Manufacturer care instructions handed to client at final handover.', watchFor: 'A wrinkled seam picked up now = layer comes back to fix. Noticed after handover = client callback. Check while layer is on site.' },
      ],
    },
  },
  {
    id: 'lay-vinyl-plank',
    category: 'flooring',
    phase: 'flooring',
    label: 'Lay vinyl plank flooring',
    summary: 'Prep sub-floor flat + dry, floating click-lock or glue-down, expansion gap at walls.',
    nz: {
      tools: ['Tape', 'Straight edge (long)', 'Tapping block + pull bar', 'Utility knife + scoring blade', 'Chalk line', 'Vacuum', 'Rubber mallet', 'Expansion spacers (size per manufacturer)', 'Jigsaw (for cuts around door jambs)', 'Handsaw for undercutting jambs (or oscillating multi-tool)'],
      materials: ['Vinyl plank (click-lock floating or glue-down — Karndean, Godfrey Hirst, Airstep) per client spec', 'Underlay (if not pre-attached — foam or IXPE 1.5 mm typical)', 'Perimeter scotia or quarter-round (if skirting is already on)', 'Adhesive (glue-down systems only)'],
      steps: [
        { title: 'Confirm sub-floor is flat + dry', body: 'Sub-floor must be flat to within 3 mm over 2 m (check with a straight edge). Any dips get self-levelled, any humps sanded. Moisture-test concrete sub-floor with a meter — vinyl over damp concrete lifts. Sweep + vacuum spotless before laying.', watchFor: 'Un-flat sub-floor telegraphs through vinyl as ridges + flex points. 3 mm over 2 m is the standard — measure, don\'t guess.' },
        { title: 'Lay underlay + set out first row', body: 'Roll underlay (if not pre-attached to the plank) — butt joins, don\'t overlap. Set out the first row against the longest straight wall with expansion spacers at the wall edge (size per the plank manufacturer — usually 5–8 mm for vinyl). Plan the last row width — don\'t end on a narrow sliver.', watchFor: 'No expansion gap = floor buckles in summer heat. Whatever size the manufacturer calls for, use it around every wall edge, hidden under scotia or skirting.' },
        { title: 'Click-lock + tap tight', body: 'Angle each plank into the previous row\'s tongue + drop flat. Use the tapping block + pull bar to close any joints that don\'t seat cleanly. Stagger end joints at least 300 mm between rows (random or 1/3 pattern per plank spec).', watchFor: 'Aligned end joints across rows look bad + weaken the floor. Stagger every row. Never hit a plank edge directly with the mallet — always through the tapping block.' },
        { title: 'Fit around door jambs + finish edges', body: 'Undercut door jambs (jamb saw or multi-tool) to a height matching the plank + underlay — plank slides UNDER the jamb for a clean line. Fit perimeter scotia or leave existing skirting to cover the expansion gap.', watchFor: 'Cutting the plank around the jamb (instead of undercutting the jamb) = fiddly cut + visible gap. Undercut the jamb once, slide plank under.' },
      ],
    },
    au: {
      tools: ['Tape', 'Straight edge (long)', 'Tapping block + pull bar', 'Utility knife + scoring blade', 'Chalk line', 'Vacuum', 'Rubber mallet', 'Expansion spacers (size per manufacturer)', 'Jigsaw', 'Handsaw or multi-tool for undercutting jambs'],
      materials: ['Vinyl plank (click-lock or glue-down — Karndean, Godfrey Hirst, Signature) per client spec', 'Underlay (if not pre-attached — foam or IXPE 1.5 mm typical)', 'Perimeter scotia or quarter-round (if skirting already on)', 'Adhesive (glue-down only)'],
      steps: [
        { title: 'Confirm sub-floor is flat + dry', body: 'Flat to within 3 mm over 2 m. Dips self-level, humps sand. Moisture-test concrete sub-floor — vinyl over damp concrete lifts. Sweep + vacuum spotless.', watchFor: 'Un-flat sub-floor telegraphs as ridges + flex. 3 mm over 2 m is standard — measure, don\'t guess.' },
        { title: 'Lay underlay + set out first row', body: 'Roll underlay (if not pre-attached) — butt joins, no overlap. First row against longest straight wall, expansion spacers at wall edge (size per plank manufacturer — usually 5–8 mm for vinyl). Plan last row width — no narrow slivers.', watchFor: 'No expansion gap = buckles in heat. Use the size the manufacturer calls for, hidden under scotia or skirting.' },
        { title: 'Click-lock + tap tight', body: 'Angle plank into previous row\'s tongue + drop flat. Tapping block + pull bar to close any loose joints. Stagger end joints 300 mm minimum (random or 1/3 pattern per plank spec).', watchFor: 'Aligned end joints look bad + weaken the floor. Stagger every row. Never mallet a plank edge directly — always through the tapping block.' },
        { title: 'Fit around door jambs + finish edges', body: 'Undercut door jambs (jamb saw or multi-tool) to plank + underlay height — plank slides UNDER the jamb for clean line. Perimeter scotia or existing skirting covers expansion gap.', watchFor: 'Cutting plank around jamb (not undercutting jamb) = fiddly cut + visible gap. Undercut once, slide under.' },
      ],
    },
  },
  {
    id: 'lay-timber-floor',
    category: 'flooring',
    phase: 'flooring',
    label: 'Lay timber / laminate flooring',
    summary: 'Specialist floor layer. Underlay, tongue-and-groove floating install or secret-nail to battens.',
    nz: {
      tools: ['(Specialist floor layer brings own tools — flooring nailer / stapler, moisture meter, sanding equipment for solid timber)'],
      materials: ['(Layer supplies underlay, adhesive or nails, finish — client-selected flooring delivered to site + acclimatised)'],
      steps: [
        { title: 'Confirm sub-floor is flat + dry + acclimatised', body: 'Sub-floor flat to spec (usually 3 mm over 2 m). Moisture content in the sub-floor + the flooring both tested + within spec before laying — solid timber especially is sensitive to moisture. Flooring delivered to site 5–7 days ahead to acclimatise to internal humidity.', watchFor: 'Laying timber over damp sub-floor OR without acclimatising = cupping, gapping, or crowning within a season. Both tests are non-negotiable.' },
        { title: 'Book the specialist layer', body: 'Solid timber, engineered timber, and floating laminate are all specialist installs — book a floor layer, not general labour. Confirm they include expansion-gap detail at walls, perimeter scotia if the skirting is already on, and undercut of door jambs.', watchFor: 'Not-a-specialist layer = poor stagger, no expansion gap, uneven end joints. Timber floors are permanent + expensive to redo — pay for the specialist.' },
        { title: 'Sign off with the layer on site', body: 'Walk the finished floor before the layer leaves — sight for lippage (adjacent plank height difference), even stagger, no gaps at end joints, perimeter expansion gap covered. Handover any care / warranty paperwork for client handover.', watchFor: 'Lippage or a gapped end joint picked up now = layer fixes on the day. Missed until later = expensive re-do.' },
      ],
    },
    au: {
      tools: ['(Specialist floor layer brings own tools — flooring nailer / stapler, moisture meter, sanding equipment for solid timber)'],
      materials: ['(Layer supplies underlay, adhesive or nails, finish — client-selected flooring delivered to site + acclimatised)'],
      steps: [
        { title: 'Confirm sub-floor is flat + dry + acclimatised', body: 'Sub-floor flat to spec (usually 3 mm over 2 m). Moisture content in sub-floor + flooring both tested + within spec before laying — solid timber is sensitive to moisture. Flooring on site 5–7 days ahead to acclimatise.', watchFor: 'Laying timber over damp sub-floor OR without acclimatising = cupping, gapping, or crowning in a season. Both tests non-negotiable.' },
        { title: 'Book the specialist layer', body: 'Solid timber, engineered timber, and floating laminate are specialist installs — book a floor layer. Confirm expansion-gap detail at walls, perimeter scotia if skirting is on, undercut of door jambs.', watchFor: 'Not-a-specialist layer = poor stagger, no expansion gap, uneven end joints. Timber floors are permanent + expensive — pay for the specialist.' },
        { title: 'Sign off with the layer on site', body: 'Walk the finished floor before layer leaves — sight for lippage, even stagger, no gaps at end joints, perimeter expansion gap covered. Care / warranty paperwork for client handover.', watchFor: 'Lippage or gapped end joint picked up now = layer fixes on the day. Missed = expensive re-do.' },
      ],
    },
  },

  // ─── Snag + handover — final walk-through ───────────────────────────────
  {
    id: 'pre-handover-snag',
    category: 'handover',
    phase: 'snag',
    label: 'Pre-handover snag list',
    summary: 'Room-by-room walk: adjust doors, fix marks, chase subs to close every item before handover.',
    nz: {
      tools: ['Pen + paper (or Setout jobs list)', 'Torch', 'Camera / phone', 'Blue painter\'s tape (for marking defects)', 'Basic tools for adjusting doors, hinges, cabinets'],
      materials: ['Touch-up paint (each colour used)', 'Filler + sandpaper for small marks', 'Silicone (colour-matched) for any missed sealant joints'],
      steps: [
        { title: 'Walk every room with the client\'s eye', body: 'Go room-by-room with the site lights on AND with natural light. Mark every defect with blue tape + photograph — paint drips, plaster nibs, sticky doors, uneven skirting, missing sealant, marked walls, wobbly handles, loose fittings. Every room, no shortcuts. Log each item in Setout against the job with the photo + a short description so nothing gets lost between rooms.', watchFor: 'A defect the client finds after handover = a callback + credibility hit. Find it first.' },
        { title: 'Split the list — self-fix vs sub-back', body: 'Sort the list into what you\'ll fix yourself (touch-up paint, door adjustments, silicone re-run) vs what needs a sub back (painter for a wall re-coat, tiler for a cracked tile, sparky for a loose fitting). Chase every sub for their return day upfront.', watchFor: 'Waiting till one sub is back to schedule the next = weeks of drift. Book all sub returns in parallel.' },
        { title: 'Close every item before handover', body: 'Work through the list — self-fix items done, subs back to close their items. Blue tape comes off as each item closes. Nothing gets handed over with tape still on.', watchFor: 'A single unresolved item at handover = client keeps a list in their head + finds three more. Close everything.' },
        { title: 'Final walk with the site lights + camera', body: 'One last walk once every item is closed. Photograph each room in its finished state. Save to the job file — proof of condition at handover.', watchFor: 'A dispute later about "was this damaged before handover?" — the photo file settles it. 10 min per house, invaluable.' },
      ],
    },
    au: {
      tools: ['Pen + paper (or Setout jobs list)', 'Torch', 'Camera / phone', 'Blue painter\'s tape (for marking defects)', 'Basic tools for adjusting doors, hinges, cabinets'],
      materials: ['Touch-up paint (each colour used)', 'Filler + sandpaper', 'Silicone (colour-matched)'],
      steps: [
        { title: 'Walk every room with the client\'s eye', body: 'Room-by-room with site lights on AND natural light. Every defect gets blue tape + photograph — paint drips, plaster nibs, sticky doors, uneven skirting, missing sealant, marked walls, wobbly handles, loose fittings. No shortcuts. Log each item in Setout against the job with the photo + a short description so nothing gets lost between rooms.', watchFor: 'Client finds it after handover = callback + credibility hit. Find it first.' },
        { title: 'Split the list — self-fix vs sub-back', body: 'Sort the list: self-fix (touch-up, door adjust, silicone) vs sub-back (painter wall re-coat, tiler cracked tile, sparky loose fitting). Chase every sub for return day upfront.', watchFor: 'Waiting for one sub to book the next = weeks of drift. All sub returns booked in parallel.' },
        { title: 'Close every item before handover', body: 'Work through the list — self-fix done, subs back to close their items. Blue tape off as each item closes. Nothing handed over with tape still on.', watchFor: 'Single unresolved item = client keeps a list in their head + finds three more. Close everything.' },
        { title: 'Final walk with site lights + camera', body: 'One last walk once everything is closed. Photograph each room finished. Save to job file — proof of condition at handover.', watchFor: 'Dispute later about pre-handover damage — photo file settles it. 10 min per house, invaluable.' },
      ],
    },
  },
  {
    id: 'client-handover',
    category: 'handover',
    phase: 'snag',
    label: 'Client handover',
    summary: 'Hand over keys, manuals, warranties, CCC / Occupancy Certificate + defect-liability terms.',
    nz: {
      tools: ['(No tools — meeting)'],
      materials: ['Handover pack: keys, appliance manuals, paint colour list, warranty certificates, compliance certificates (CCC, plumbing PS, electrical ECoC, waterproofing PS, gas cert, aircon cert), maintenance schedule'],
      steps: [
        { title: 'Assemble the handover pack', body: 'Physical folder OR digital handover pack — depending on client preference. Contents: CCC + all trade compliance certificates, all appliance manuals + warranty cards, paint colour + brand list per room, maintenance schedule (annual gutter clean, deck oil, filter changes), keys + alarm codes, contact list for warranty callouts.', watchFor: 'Missing a certificate at handover = looks unprofessional + delays the client\'s insurance / KiwiSaver first-home withdrawal / bank drawdown. Have every cert in hand before the handover meeting.' },
        { title: 'Walk the house with the client + demo the systems', body: 'Show the client how to operate every appliance, aircon head unit, hot water controller, alarm, garage door, gate. Show the water main + gas isolation, meter box, hot water cylinder. Let them try each thing so they know before you leave.', watchFor: 'Handing over keys + a folder without a walk-through = 20 callback calls in the first month asking basic operation questions. Ten minutes of demo saves hours later.' },
        { title: 'Explain the defect-liability period', body: 'Confirm the defect-liability period (typically 3 months for finishes, longer for structural per contract + Building Act 2004 implied warranties). Explain how the client raises a defect (email / phone), what\'s covered vs normal maintenance, and when to expect a response.', watchFor: 'Vague defect terms = client raises every scuff mark as a defect. Set clear expectations in writing at handover.' },
        { title: 'Hand over the keys + finalise', body: 'Keys handed over, sign a handover document confirming the client has received everything on the list. That document + the client\'s signature is your record that handover is complete + defect-liability starts from that date.', watchFor: 'No signed handover = a client claim years later that "you never handed over the manual for X." Sign the document.' },
      ],
    },
    au: {
      tools: ['(No tools — meeting)'],
      materials: ['Handover pack: keys, appliance manuals, paint colour list, warranty certificates, compliance certificates (Occupancy Certificate, plumbing, electrical, waterproofing, gas, aircon), maintenance schedule'],
      steps: [
        { title: 'Assemble the handover pack', body: 'Physical folder OR digital pack. Contents: Occupancy Certificate + all trade compliance certificates, all appliance manuals + warranty cards, paint colour + brand list per room, maintenance schedule (annual gutter clean, deck oil, filter changes), keys + alarm codes, contact list for warranty callouts.', watchFor: 'Missing certs = looks unprofessional + delays client\'s insurance / bank drawdown. Every cert in hand before handover.' },
        { title: 'Walk the house + demo the systems', body: 'Show client how to operate every appliance, aircon head unit, hot water controller, alarm, garage door, gate. Show water main + gas isolation, meter box, hot water unit. Let them try each thing before you leave.', watchFor: 'Keys + folder without walk-through = 20 callbacks in the first month. Ten minutes of demo saves hours.' },
        { title: 'Explain the defect-liability period', body: 'Confirm defect-liability period (typically 3 months for finishes, longer for structural per contract + Domestic Building Contracts Act / state equivalent). How to raise a defect (email / phone), what\'s covered vs normal maintenance, expected response time.', watchFor: 'Vague terms = client raises every scuff as a defect. Set clear expectations in writing.' },
        { title: 'Hand over the keys + finalise', body: 'Keys handed over, client signs a handover document confirming everything received. That document + signature = your record that handover is complete + defect-liability starts that date.', watchFor: 'No signed handover = client claim years later "you never handed over the manual for X." Sign the document.' },
      ],
    },
  },

  // ─── Decking & outdoor — usually last on a new build ─────────────────────
  {
    id: 'build-deck',
    category: 'decking-outdoor',
    phase: 'external',
    label: 'Build a deck (posts → bearers → joists → boards)',
    summary: 'End-to-end sub-frame + board fix, from setout to finished surface.',
    nz: {
      tools: ['30 m tape', 'Laser or dumpy + staff', 'Spirit level (long)', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Decking gap tool', 'Chalk line'],
      materials: ['Posts: 125×125 or 100×100 H5 treated pine (concreted direct into ground)', 'Bearers: 190×45 or 240×45 H3.2 pine', 'Joists: 140×45 H3.2 pine, hangers where needed', 'Deck boards: 140×32 H3.2 pine, kwila, vitex, or Modwood composite', 'Fixings: 90×3.15 galv nails or spec\'d fixing (e.g. Z-nails) for bearer-to-post skew; 65 mm SS or hi-tensile deck screws (boards to joists); joist-hanger nails', 'Concrete: 20 MPa pre-mix bag or truck', 'Perimeter + baseboards (same as deck board)'],
      steps: [
        { title: 'Set out post positions', body: 'From the house wall (or profile boards), string-line the deck perimeter. Mark post positions at spacing per bearer size — typically 1.4–2.4 m for 190×45 bearer. Corner posts first, then intermediates.', watchFor: 'Post spacing drives bearer size + joist span. NZS 3604 6.3 tables cover it; over-spacing posts means over-sized bearers or a bouncy deck.' },
        { title: 'Dig + concrete posts in', body: 'Post-hole borer to 600 mm depth (or per plan / soil condition). Stand each H5 post directly in the hole, plumb, brace, then pour 20 MPa concrete around it. Feed hole diameter + depth × post count into the Setout Concrete calculator for total volume so you order the right number of bags or truck. Let cure 24 hrs minimum before loading.', watchFor: 'Posts in ground MUST be H5 — anything less rots at the concrete line. Get each post plumb + braced BEFORE the concrete goes off; once it kicks, you\'re stuck with what you\'ve got.' },
        { title: 'Cut posts to length', body: 'Once concrete is set, shoot each post top with the laser + calculate post length to hit finished bearer top. Cut all posts at once, chamfer the top for water shed.', watchFor: 'Cutting posts too short = pack + shim (weak). Too long = the bearer follows the highest post + you get a bowed deck. Measure carefully off the laser.' },
        { title: 'Fix bearers to posts', body: 'Sit bearer directly on top of the post, level. Skew-nail through the bearer into the post with 90×3.15 galv nails (2 each side), or whatever fixing the plan spec\'s (e.g. Z-nails). High wind zones or tall decks: an M12 galv coach bolt down through the bearer into the post is often spec\'d for uplift — follow the plan.', watchFor: 'Bearer joins land on a post — never mid-span. Both bearer ends bear fully on the post top.' },
        { title: 'Lay joists over bearers', body: 'Joist spacing per board thickness — 450 mm c/c is typical, but check the max span with your decking material spec (varies by species, grade, and thickness). Skew-nail 2× 90 mm nails per bearing point, or joist hangers where joist doesn\'t sit directly on bearer.', watchFor: 'Rotate bowed joists BOW UP. A bow-down joist gives a permanent dip in the deck surface above.' },
        { title: 'Block between joists at midspan', body: 'Solid off-cuts between joists at midspan, skew-nailed both sides. Stops joists rolling.', watchFor: 'Un-blocked joists twist under foot traffic + the deck feels bouncy. Not optional on spans over 2.4 m.' },
        { title: 'Lay deck boards using margin boards', body: 'Start against the house or square edge. Calculate + lay out margin boards every 6 boards or so — spaced at the desired gap (usually ~5 mm) and fixed down first. Then wedge + fix the boards in between. Fix with 2× SS or hi-tensile deck screws per joist crossing, 12–20 mm in from each edge.', watchFor: 'Laying board-to-board with just a gap tool drifts over a long run — a bowed board throws every board after it. Margin boards give you a reset every few boards so drift + bow get absorbed in the wedge.' },
        { title: 'Trim + finish edges', body: 'Snap a chalk line along the deck edge, run a circular saw for a straight cut. Ease board edges with a router or sandpaper if bare timber. Apply timber stain / oil per manufacturer.', watchFor: 'End-grain on cut boards sucks water fastest. Prime or oil cut ends before the deck sees rain.' },
        { title: 'Fit perimeter + baseboards', body: 'Perimeter board around the outside of the deck, screwed into the boundary joist. Baseboards need vertical framing between the posts to fix to. Run boards with a 25 mm gap between each for ventilation.', watchFor: 'Baseboards butted tight = no airflow + under-deck sub-floor rots. E2/AS1 requires sub-floor ventilation, even for decks — 25 mm gap between every baseboard.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Laser or dumpy + staff', 'Spirit level (long)', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Decking gap tool', 'Chalk line'],
      materials: ['Post option A — Galvanised steel posts (RHS / SHS) cast directly into concrete footing: widely used across AU, termite-proof', 'Post option B — Timber post (125×125 or 100×100 H4 pine, or F17 hardwood like Blackbutt / Spotted Gum) on a galvanised stirrup (Pryda, Multinail, Bowmac, Simpson) so the post base sits ABOVE ground (AS 3660.1)', 'Post option C — H5 treated timber post concreted direct into ground: code-allowed but only common in low-termite states (VIC / TAS / rural SA); avoid in QLD / NT / coastal NSW', 'Bearers: 190×45 F17 hardwood or MGP12 pine (H3-treated)', 'Joists: 140×45 F17 hardwood or MGP12, hangers where needed', 'Deck boards: 140×19 or 140×32 Merbau, Spotted Gum, treated pine, or composite (Modwood, Ekodeck)', 'Fixings: M12 galv coach bolts through stirrup + timber post; 65 mm SS deck screws (Merbau + hardwoods need SS); joist-hanger nails', 'Concrete: N20 pre-mix (300 mm dia footings min, deeper for cyclone zones per AS 4055)', 'Perimeter + baseboards (same as deck board)'],
      steps: [
        { title: 'Set out post positions', body: 'From house wall (or profile boards), string-line deck perimeter. Post spacing per bearer size — typically 1.4–2.4 m for 190×45. Corner posts first, then intermediates.', watchFor: 'Post spacing drives bearer size + joist span. AS 1684.2 tables cover it. Over-spacing = over-sized bearers or bouncy deck.' },
        { title: 'Dig footings + set posts', body: 'Post-hole borer to 450–600 mm (deeper for cyclonic or reactive soil per AS 2870). Steel posts: stand in hole, plumb, brace, pour N20 around — or build the skeleton on top first and pour last. Timber-on-stirrup: set stirrup in wet concrete so the base sits 75–150 mm ABOVE ground (AS 3660.1). H5 timber in-ground is allowed by code but only common in low-termite states (VIC / TAS / rural SA); avoid in QLD / NT / coastal NSW. Feed hole diameter + depth × post count into the Setout Concrete calculator for total volume. 24 hrs cure.', watchFor: 'Steel or timber, get everything plumb + braced BEFORE the concrete goes off. In termite zones (most of AU), the post base should never touch soil — use a stirrup or a steel post.' },
        { title: 'Bolt posts to stirrups + cut to height (skip if steel)', body: 'Timber posts on stirrup: once the concrete is set, bolt each post to its stirrup at full length with M12 galv coach bolts through the pre-drilled holes. Then laser-shoot the post tops and cut them all to the finished bearer height in place, chamfer the tops for water shed. Steel posts are already at height from step 2 — skip this step.', watchFor: 'Cut every post top to the same laser line — the bearer follows the highest post, so one proud post bows the whole deck. One line, all tops.' },
        { title: 'Fix bearers to posts', body: 'Two options: sit the bearer on top of the post (level, skew-nail to hold), or bolt the bearer to the side of the post. Skew-nail to hold in place, then fix properly with the required hardware per the plan / manufacturer spec.', watchFor: 'Bearer joins land on a post — never mid-span. Skew-nails alone aren\'t the final fixing — they hold the bearer while you fit the spec\'d hardware.' },
        { title: 'Lay joists over bearers', body: 'Joist spacing per board thickness — 450 mm c/c is typical, but check the max span with your decking material spec (varies by species, grade, and thickness). Skew-nail to hold, then fix properly with the required hardware per the plan / manufacturer spec (joist hangers where the joist doesn\'t sit on the bearer).', watchFor: 'Rotate bowed joists BOW UP. A bow-down joist gives a permanent dip in the deck surface above.' },
        { title: 'Block between joists at midspan', body: 'Solid off-cuts between joists at midspan, skew-nailed both sides. Stops rolling.', watchFor: 'Un-blocked joists twist under foot traffic + deck feels bouncy. Not optional on spans > 2.4 m.' },
        { title: 'Lay deck boards using margin boards', body: 'Start against house or square edge. Calculate + lay out margin boards every 6 boards or so — spaced at the desired gap (usually ~5 mm) and fixed down first. Then wedge + fix the boards in between. Fix with 2× SS or hi-tensile deck screws per joist crossing, 12–20 mm in from each edge. Hardwoods (Merbau, Spotted Gum) need SS or hot-dip galv only.', watchFor: 'Laying board-to-board with just a gap tool drifts over a long run — a bowed board throws every board after it. Margin boards give you a reset every few boards so drift + bow get absorbed in the wedge. Pre-drill hardwood with a countersink pilot.' },
        { title: 'Trim + finish edges', body: 'Chalk line along deck edge, circular saw for straight cut. Ease board edges with router or sandpaper if bare. Apply timber oil per manufacturer.', watchFor: 'End-grain on cut boards sucks water fastest. Prime or oil cut ends before rain hits.' },
        { title: 'Fit perimeter + baseboards', body: 'Perimeter board around the outside of the deck, screwed into the boundary joist. Baseboards need vertical framing between the posts to fix to. Run boards with a 25 mm gap between each for ventilation. Termite zones: keep the bottom baseboard clear of ground — 75 mm min gap.', watchFor: 'Baseboards butted tight = no airflow + under-deck sub-floor rots. NCC requires sub-floor ventilation. In termite zones, timber-to-ground contact at the bottom baseboard is a bridge straight past your stirrups.' },
      ],
    },
  },
  {
    id: 'build-pergola',
    category: 'decking-outdoor',
    phase: 'external',
    label: 'Build a pergola or verandah',
    summary: 'Posts + beams + rafters + roof — an outdoor room.',
    nz: {
      tools: ['30 m tape', 'Laser or dumpy + staff', 'Spirit level (long)', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Ladder / trestle'],
      materials: ['Posts: 125×125 or 150×150 H5 treated pine (concreted direct into ground)', 'Beams / rafters: 240×45 or 290×45 H3.2 pine (or laminated LVL for long spans)', 'Purlins / battens: 90×45 H3.2 pine', 'Fixings: M12 galv coach bolts (posts / beams), joist hangers, purlin screws (hex-head Type 17) for purlin-to-rafter', 'Concrete: 20 MPa', 'Roof cover: polycarbonate sheet (Sunlite / Suntuf), colorsteel, timber slats, or shade sail'],
      steps: [
        { title: 'Confirm structure + wind zone', body: 'Pergolas over 20 m² floor area or attached to the house usually need consent. NZS 3604 2.5 wind zone (Low / Medium / High / Very High / Extra High) drives post + beam sizes. Check with council before starting.', watchFor: 'Pergolas as covered outdoor spaces are "buildings" under the Building Act. Un-consented builds get red-stickered + demolished. Consent first.' },
        { title: 'Set out post positions', body: 'From house wall or profile boards, string-line perimeter. Post spacing per beam size — 2.4–3.6 m typical for 240×45 beam. Mark all positions before digging.', watchFor: 'Post spacing over 3.6 m needs a much bigger beam (or a laminated one). Match spacing to what the plan calls out.' },
        { title: 'Dig holes, stand + brace posts, then concrete', body: 'Post-hole borer to 600–900 mm (deeper for tall pergolas + high wind zones). Stand each H5 post in the hole, plumb, brace to nearby fixed points, then pour 20 MPa concrete around it. Feed hole diameter + depth × post count into the Setout Concrete calculator for total volume. Let cure 24 hrs minimum before loading.', watchFor: 'Posts MUST be plumb + braced before the concrete goes off — once it kicks, you\'re stuck with what you\'ve got. Pergolas catch a lot of wind; under-depth footings + tall structure = uplift + toppling in a storm.' },
        { title: 'Cut posts to beam height', body: 'Once concrete is set, laser-shoot each post top + calculate cut to finished beam bearing height. Cut all at once, chamfer top for water shed. Keep braces on until beams are fixed.', watchFor: 'Posts are top-heavy without beams. Leave two braces per post (different directions) until permanent structure locks them.' },
        { title: 'Fix beams to posts', body: 'Lift beam onto post tops. Fix with M12 coach bolts through beam + post (2 per connection). Long beams may need laminating on site.', watchFor: 'Beam-to-post connection carries roof + wind uplift load. Follow the fixing schedule; a beam sitting on a post with two nails will pull off in a gust.' },
        { title: 'Fit rafters + purlins', body: 'Rafters across beams at 600 c/c typical, fixed to the beam with joist hangers (uplift-rated). Purlins across rafters per roof-cover spacing — every purlin-to-rafter crossing gets a purlin screw (hex-head Type 17). No bugles, no nails.', watchFor: 'Purlin screws hold under wind uplift; bugles pull through and nails work loose. If the plan spec\'s a different fastener (e.g. cyclone screws in high-wind zones), follow that — but never fall back to bugles or nails for purlin fixing.' },
        { title: 'Fix roof cover', body: 'Polycarb: pre-drill oversize holes, fix with roofing screws + EPDM washers. Colorsteel: same as a metal roof — sheets on battens. Timber slats or shade sail: fix per design.', watchFor: 'Polycarb expands + contracts a lot in temperature. Pre-drilled oversize holes let it move; screwed tight = cracked sheets.' },
        { title: 'Fit trim + flashings', body: 'End caps on polycarb, apron flashings against house wall if attached. Fascia trim along roof perimeter for a finished look.', watchFor: 'Un-capped polycarb ends fill with dust + spiders. Cap always.' },
      ],
    },
    au: {
      tools: ['30 m tape', 'Laser or dumpy + staff', 'Spirit level (long)', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Ladder / trestle'],
      materials: ['Posts: 125×125 or 150×150 pine', 'Post brackets: Pryda, Multinail, or Bowmac galv anchors', 'Beams / rafters: 240×45 or 290×45 F17 hardwood or MGP12 pine (or LVL)', 'Purlins / battens: 90×45 H3-treated pine', 'Fixings: M12 galv coach bolts (posts / beams), joist hangers, purlin fixings per plan / manufacturer spec', 'Concrete: N20', 'Roof cover: polycarb (Suntuf, Ampelite), COLORBOND, timber slats, shade sail'],
      steps: [
        { title: 'Confirm structure + wind class', body: 'Pergolas often need council permit — thresholds vary by state (typically over 10–20 m² or attached to house). AS 1684.2 wind classification drives post + beam sizes. Check before building.', watchFor: 'Un-permitted structures get pulled up on sale (building inspection). Permit first.' },
        { title: 'Set out post positions', body: 'From house wall or profile boards, string-line perimeter. Post spacing per beam size — 2.4–3.6 m typical for 240×45 beam.', watchFor: 'Spacing > 3.6 m needs a much bigger or laminated beam. Match to plan.' },
        { title: 'Dig + concrete footings', body: 'Post-hole borer to 600–900 mm (deeper for tall pergolas + high wind class). N20 concrete around post-anchor bracket, plumb while wet. Feed hole diameter + depth × post count into the Setout Concrete calculator for total volume.', watchFor: 'Pergolas catch wind. Under-depth footings + tall structure = uplift + toppling in a storm. Match to plan / wind class. In cyclonic zones the schedule is much tighter.' },
        { title: 'Stand + brace posts', body: 'Once footings have cured, stand each post on its anchor bracket and plumb it. Brace to nearby fixed points — two braces per post minimum, different directions. Leaving the posts long here lets you cut them to their finished heights next.', watchFor: 'Posts are top-heavy until the beams go on. Leave every brace in place until the head beams lock the posts — a post that shifts before then has to come off the bracket and be re-plumbed.' },
        { title: 'Cut posts to height', body: 'Mark each post to its desired height and cut. Chamfer the tops for water shed. Keep the braces on until the beams are fixed.', watchFor: 'Heights won\'t always be level across all posts — most pergola roofs fall for runoff, so cut to the plan\'s heights rather than one level line.' },
        { title: 'Fix beams to posts', body: 'Lift the beam onto the post tops and fix per the plan\'s connection detail — coach bolts or the bracket it calls for. Long beams: laminate on site.', watchFor: 'Beam-to-post connection carries roof + wind uplift. Follow the fixing schedule; two nails won\'t hold in a gust.' },
        { title: 'Fit rafters + purlins', body: 'Rafters across beams at 600 c/c typical, fixed with joist hangers (uplift-rated). Purlins across rafters per roof-cover spacing — fixings at every purlin-to-rafter crossing per plan / manufacturer spec.', watchFor: 'Under-fixed purlins lift under wind uplift. Follow the fixing schedule; in N4+/C1+ zones the schedule is much tighter.' },
        { title: 'Fix roof cover', body: 'Polycarb: pre-drill oversize holes, roofing screws + EPDM washers. COLORBOND: same as metal roof — sheets on battens. Slats / shade sail: per design.', watchFor: 'Polycarb expands + contracts. Pre-drilled oversize holes let it move; tight-screwed = cracked sheets.' },
        { title: 'Fit trim + flashings', body: 'End caps on polycarb, apron flashings against house wall if attached. Fascia trim along roof perimeter.', watchFor: 'Un-capped polycarb ends fill with dust + spiders. Cap always.' },
      ],
    },
  },
  {
    id: 'build-external-stairs',
    category: 'decking-outdoor',
    phase: 'external',
    label: 'Build external timber stairs',
    summary: 'Rise / run, stringers, treads, handrails + balustrade.',
    nz: {
      tools: ['Tape', 'Framing square', 'Spirit level', 'Drop / circular saw', 'Jigsaw', 'Cordless drill / impact driver', 'Hammer', 'Spade (for landing pad)', 'Sledge'],
      materials: ['Stringers: 240×45 or 290×45 H3.2 pine (cut from a solid board or bought as pre-cut)', 'Treads: 2× 140×32 H3.2 pine (per tread) or 235×32 single board', 'Risers (optional): 140×19 H3.2', 'Handrail: 90×45 or 90×70 H3.2, min 900 mm above tread nosing (NZBC D1)', 'Balusters: 90×19 H3.2 or aluminium, max 100 mm gap (NZBC D1)', 'Fixings: 100 mm bugle screws + M12 galv bolts', 'Concrete for base pad if resting on ground'],
      steps: [
        { title: 'Measure total rise + calculate steps', body: 'Total rise = finished deck FFL to finished ground level. Feed the total rise into the Setout Stairs calculator to get the number of steps, riser height, and going — it divides evenly and checks against NZBC D1 limits.', watchFor: 'Measure to FINISHED levels both ends, not the sub-floor or unlanded ground. Missing the deck board thickness or the concrete pad thickness at the base is the #1 way stairs end up with an odd top or bottom step.' },
        { title: 'Cut stringers with a framing square', body: 'Framing square with stair gauges set to rise + run — walk down the stringer marking each step. Cut the first stringer with a circular saw + finish inside corners with a jigsaw (don\'t over-run the cut). Use the first as a template to mark the second so both match.', watchFor: 'A stringer with a 5 mm difference in one step feels wrong to walk on. Template the second off the first — don\'t re-measure with the square and hope it matches.' },
        { title: 'Fix stringer top to deck', body: 'Bolt stringer tops through into deck framing (bearer or joist) with M12 galv bolts. Confirm the top step aligns with finished deck surface.', watchFor: 'Bolt into the joist or bearer, NOT the deck board alone (which will just pull through under load). Locate framing from underneath the deck, or drop a hole in a deck board to sight the joist below before drilling from above.' },
        { title: 'Concrete base for bottom of stringers', body: 'Bottom of stringer needs a solid, dry base. For low stairs to ground, pour a small concrete pad (around 400 × 400 × 100 min) and sit the stringer on a metal bracket. For taller stairs, concrete posts in like a deck and land the stringer bottom on the post tops instead — whichever way, timber never touches ground.', watchFor: 'Stringers directly on ground rot within a few years. Break the timber-to-ground contact with a pad + bracket, or a post — decades of life either way.' },
        { title: 'Cut + fix treads', body: 'Treads bear on stringer notches. Fix with 2× 100 mm bugle screws per stringer, pre-drilled to prevent split. Use two boards per tread with a 5–10 mm gap between for drainage.', watchFor: 'Single wide boards without a drainage gap pool water + rot from below. Two boards + a gap sheds water.' },
        { title: 'Fit risers (optional)', body: 'Risers close in the vertical gap between treads. Cut to fit under the tread above, fix through stringer face. Some designs skip risers (open-tread stairs) for a lighter look.', watchFor: 'Open-tread stairs are cheaper but children\'s feet can catch. Check if the design requires risers per the client\'s brief.' },
        { title: 'Install handrail + balustrade', body: 'Handrail min 900 mm above tread nosing (NZBC D1). For stairs over 1 m drop, balustrade required with max 100 mm gap between balusters. Fix handrail posts to stringer sides with M12 bolts.', watchFor: 'Baluster gap over 100 mm fails inspection + is a child-safety issue. Check every gap with a 100 mm block.' },
        { title: 'Prime cut ends + apply finish', body: 'Every cut end of every timber piece gets primer / oil before assembly. Once built, oil or paint the whole assembly per client spec.', watchFor: 'Un-sealed cut ends soak water and rot from the inside. Prime cut ends BEFORE assembly, not after.' },
      ],
    },
    au: {
      tools: ['Tape', 'Framing square', 'Spirit level', 'Drop / circular saw', 'Jigsaw', 'Cordless drill / impact driver', 'Hammer', 'Spade (for landing pad)', 'Sledge'],
      materials: ['Stringers: 240×45 or 290×45 F17 hardwood or MGP12 pine (H3-treated)', 'Treads: 2× 140×32 hardwood / treated pine per tread or 235×32 single board', 'Risers (optional): 140×19', 'Handrail: 90×45 or 90×70, min 865 mm above tread nosing (NCC Vol 2 3.9.2)', 'Balusters: 90×19 or aluminium, max 125 mm gap (some states 100 mm — check)', 'Fixings: 100 mm Type 17 + M12 galv bolts', 'Concrete for base pad'],
      steps: [
        { title: 'Measure total rise + calculate steps', body: 'Total rise = deck FFL to ground FFL. Feed the total rise into the Setout Stairs calculator to get number of steps, riser height, and going — it divides evenly and checks against NCC limits.', watchFor: 'Measure to FINISHED levels both ends, not the sub-floor or unlanded ground. Missing the deck board thickness or the concrete pad at the base is the #1 way stairs end up with an odd top or bottom step.' },
        { title: 'Cut stringers with a framing square', body: 'Framing square with stair gauges set to rise + run — walk down the stringer marking each step. Cut the first stringer with a circular saw + finish inside corners with a jigsaw (don\'t over-run the cut). Use the first as a template to mark the second so both match.', watchFor: 'A stringer with 5 mm step-difference feels wrong to walk on. Template the second off the first — don\'t re-measure with the square and hope it matches.' },
        { title: 'Fix stringer top to deck', body: 'Bolt tops through into deck framing (bearer or joist) with M12 galv bolts. Top step aligns with finished deck surface.', watchFor: 'Bolt into the joist or bearer, NOT the deck board alone (which will just pull through). Locate framing from underneath, or drop a hole in a deck board to sight the joist below before drilling from above.' },
        { title: 'Concrete base for bottom of stringers', body: 'Bottom of stringer needs a solid, dry base. For low stairs to ground, pour a small concrete pad (around 400 × 400 × 100 min) and sit stringer on a metal bracket. For taller stairs, concrete posts in and land the stringer on the post tops instead — either way, timber never touches ground. In termite zones, no exceptions.', watchFor: 'Stringers on ground rot in a few years. Break the contact with a pad + bracket, or a post — decades of life either way.' },
        { title: 'Cut + fix treads', body: 'Treads bear on stringer notches. 2× 100 mm Type 17s per stringer, pre-drilled to prevent split. Two boards per tread with 5–10 mm drainage gap between.', watchFor: 'Single wide boards without gap pool water + rot from below. Two boards + gap sheds water.' },
        { title: 'Fit risers (optional)', body: 'Risers close vertical gap between treads. Cut to fit under tread above, fix through stringer face. Open-tread stairs (no risers) skipped for lighter look.', watchFor: 'Open-tread cheaper but children\'s feet can catch. Check design.' },
        { title: 'Install handrail + balustrade', body: 'Handrail min 865 mm above tread nosing on stairs (NCC Vol 2 3.9.2). Landings + balconies need 1000 mm. Stairs > 1 m drop = balustrade required, max 125 mm baluster gap (100 mm in some states, e.g. NSW). Fix handrail posts to stringer with M12 bolts.', watchFor: 'Baluster gap over 125 mm fails inspection + is a child-safety issue. Check gap with block.' },
        { title: 'Prime cut ends + apply finish', body: 'Every cut end gets primer / oil before assembly. Once built, oil or paint per client spec.', watchFor: 'Un-sealed cut ends soak water + rot from inside. Prime BEFORE assembly.' },
      ],
    },
  },
  {
    id: 'build-retaining-wall',
    category: 'decking-outdoor',
    phase: 'external',
    label: 'Build a timber retaining wall',
    summary: 'Posts + rails + drainage + backfill (under consent threshold).',
    nz: {
      tools: ['Tape', 'Spirit level', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Shovel'],
      materials: ['Posts: 125×125 or 150×150 H5 treated pine (deeper section for taller walls)', 'Rails / lags: 200×50 H4-treated pine (for horizontal boards) OR 100×50 H4 (for vertical infill)', 'Drainage aggregate: GAP 20 or scoria (behind wall)', 'Novacoil / drain pipe: 100 mm, along wall base', 'Geo-textile fabric (bidim or Ecogrid): between wall + backfill', 'Fixings: 100 mm bugle screws, 200 mm galv coach bolts for posts', 'Concrete: 20 MPa (for post footings)', 'Capping timber (optional): 200×50 H4'],
      steps: [
        { title: 'Confirm wall height + consent status', body: 'Retaining walls under 1.5 m exposed height (measured from downhill side) don\'t need consent under Schedule 1 of the Building Act — but check any council overlay. Walls near boundaries, drainage courses, or loading are engineered.', watchFor: 'Un-consented walls over 1.5 m are a $30k+ demolition + re-build order from council. Check consent status BEFORE digging.' },
        { title: 'Rule of thumb: same in ground as exposed', body: 'For a standard cantilever pole retaining wall, embedment depth should match the exposed retained height — 1.2 m retained = 1.2 m in the ground (total post length 2.4 m). This is a rule of thumb only. An engineered wall will have a specific embedment on the drawings — follow that; don\'t default to 1:1 if the design says otherwise. Deeper for soft ground or loaded walls (driveway retention above).', watchFor: 'Under-depth posts topple when the backfill saturates + puts hydrostatic load on the wall. Depth is critical — this isn\'t a fence, don\'t use the 1/3 rule.' },
        { title: 'Set out post positions + dig', body: 'Post spacing 1.2–1.8 m depending on rail size. String-line for straightness. Bore each hole with a post-hole borer to design depth.', watchFor: 'Post spacing over 1.8 m needs a much bigger rail (200×75 or similar) — under-sized rails bow under load.' },
        { title: 'Concrete posts in position', body: '20 MPa concrete around each post, plumb the post while wet. Slope the top of the concrete outward for water shed. Feed hole diameter + depth × post count into the Setout Concrete calculator for total volume. 24 hrs cure before loading.', watchFor: 'Posts set out of plumb can\'t be fixed later without pulling out the whole footing. Plumb every post + check with a level as you go.' },
        { title: 'Fix rails horizontally between posts', body: '200×50 H4 rails, one above the other, screwed to post faces with 100 mm bugle screws (2 per rail per post). Rails go on the fill side of the posts — between the earth and the posts — so the earth pushes the rails INTO the posts. Start at the bottom, work up.', watchFor: 'Rails on the exposed side of the posts = earth pushes rails AWAY from posts + all the load goes into the screws. They pull out. Rails always sit between the fill and the posts.' },
        { title: 'Line the wall with geo-textile', body: 'Geo-textile fabric between rails + backfill. Purpose is to stop fine soil washing through gaps in the rails while allowing water to drain through.', watchFor: 'Un-textiled walls silt up the drainage aggregate + fail. Geo-textile is essential.' },
        { title: 'Install drainage pipe + backfill with aggregate', body: 'Novacoil pipe along the base of the wall behind the rails, wrapped in filter cloth, sloped to a discharge point. Backfill with clean drainage aggregate (GAP 20 or scoria), placed loose in ~300 mm lifts. The angular stone locks itself.', watchFor: 'No drainage pipe = water builds up behind wall = wall tilts + fails. Drainage is not optional. Leave the aggregate loose — compacting closes the voids that make it drain.' },
        { title: 'Fit capping timber (optional)', body: 'Capping board (200×50) along the top of posts + rails for a finished look + keeps water off end grain. Mitre or butt corners.', watchFor: 'Un-capped post tops soak water + rot from the top. Cap always.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Shovel'],
      materials: ['Posts: 125×125 or 150×150 H5 treated pine', 'Rails / sleepers: 200×50 hardwood sleepers or H4-treated pine', 'Drainage aggregate: 20 mm crushed rock or scoria', 'Ag pipe: 100 mm slotted, along wall base', 'Geo-textile fabric (bidim)', 'Fixings: 100 mm Type 17 + 200 mm galv coach bolts', 'Concrete: N20', 'Capping timber (optional): 200×50'],
      steps: [
        { title: 'Confirm wall height + council permit', body: 'Walls under 1 m generally don\'t need permit (varies by state — NSW, VIC, QLD all different). Walls over 1 m or near boundaries almost always need engineering + permit. Check council BEFORE digging.', watchFor: 'Un-permitted retaining walls get pulled up on sale (building inspection). Permit + engineering if over 1 m or loaded.' },
        { title: 'Rule of thumb: same in ground as exposed', body: 'For a standard cantilever pole retaining wall, embedment depth should match exposed retained height — 1.2 m retained = 1.2 m in ground (post total 2.4 m). This is a rule of thumb only — an engineered wall will have a specific embedment on the drawings, follow that. Deeper on soft / reactive ground (Class M / H / E per AS 2870), or if loaded.', watchFor: 'Under-depth posts topple when backfill saturates + puts hydrostatic load. Depth critical — this isn\'t a fence, don\'t use the 1/3 rule.' },
        { title: 'Set out post positions + dig', body: 'Post spacing 1.2–1.8 m depending on rail size. String-line for straightness. Post-hole borer to design depth.', watchFor: 'Spacing > 1.8 m needs much bigger rail. Under-sized rails bow.' },
        { title: 'Concrete posts in position', body: 'N20 concrete around each post, plumb while wet. Slope concrete top outward for water shed. Feed hole diameter + depth × post count into the Setout Concrete calculator for total volume. 24 hrs cure before loading.', watchFor: 'Out-of-plumb posts can\'t be fixed without pulling the footing. Plumb + check with level.' },
        { title: 'Fix rails horizontally between posts', body: 'Sleepers or 200×50 H4 rails, one above the other, screwed to post faces with 100 mm Type 17s (2 per rail per post). Rails go on the fill side of the posts — between earth and posts — so earth pushes the rails INTO the posts. Start bottom, work up.', watchFor: 'Rails on the exposed side of the posts = earth pushes rails AWAY from posts + all the load goes into the screws. They pull out. Rails always sit between the fill and the posts.' },
        { title: 'Line the wall with geo-textile', body: 'Bidim between rails + backfill. Stops fine soil washing through gaps in rails while allowing water to drain.', watchFor: 'Un-textiled walls silt up drainage + fail. Essential.' },
        { title: 'Install ag pipe + backfill with aggregate', body: 'Slotted ag pipe along base behind rails, wrapped in bidim, sloped to discharge. Backfill with 20 mm clean crushed rock, placed loose in ~300 mm lifts. Angular stone self-locks.', watchFor: 'No drainage = water builds up = wall tilts + fails. Drainage not optional. Leave the aggregate loose — compacting closes the voids that make it drain.' },
        { title: 'Fit capping timber (optional)', body: 'Capping (200×50) along top of posts + rails for finish + keeps water off end grain. Mitre or butt corners.', watchFor: 'Un-capped post tops rot from the top. Cap always.' },
      ],
    },
  },
  {
    id: 'build-paling-fence',
    category: 'decking-outdoor',
    phase: 'external',
    label: 'Build a paling fence',
    summary: 'Posts, rails, palings — 1.8 m standard boundary fence.',
    nz: {
      tools: ['Tape', 'Spirit level', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Hammer'],
      materials: ['Posts: 100×100 H5 treated pine, 2.4 m long (600 in ground + 1800 above)', 'Rails: 100×50 or 75×50 H3.2 pine, 2 rails for < 1.5 m fence, 3 rails for 1.8 m', 'Palings: 100×12 or 100×19 H3.2 pine, 1.8 m long', 'Fixings: 100 mm bugle screws for rails, 50 mm galv jolt-head nails for palings, 25 mm brad nails for capping', 'Concrete: 20 MPa', 'Capping (optional): 100×32 H3.2 along fence top (thicker / wider for longer life — 25 mm cups)'],
      steps: [
        { title: 'Set out post positions', body: 'Post spacing 2.4 m maximum (paling length). String-line the fence line from a corner post + set intermediate positions from that line.', watchFor: 'Fences that run along the boundary need to be ON the boundary (or 100 mm inside, negotiated with neighbour). Fencing over the boundary is a legal issue.' },
        { title: 'Dig holes + stand + brace all posts', body: 'Dig all post holes to depth (600 mm min). Stand corner + gate posts first, plumb + brace them — these are the reference. Run a string line off the corners at the fence face, then stand each intermediate post against the string, plumb + brace. Get the whole fence line right before any concrete goes in.', watchFor: 'A single post out of line by 20 mm reads as a wave along the fence. Bracing every post to the string BEFORE concrete lets you fix any drift while it\'s still fixable.' },
        { title: 'Concrete all posts in', body: 'Once every post is plumb + braced on the string line, pour 20 MPa concrete around each. Slope the top of the concrete outward at each post for water shed. Feed hole diameter + depth × post count into the Setout Concrete calculator for total volume. Leave braces on for 24 hrs cure before loading.', watchFor: 'Pulling a brace before concrete cures = post out of plumb + no way to fix it without pulling the whole footing. Leave braces on.' },
        { title: 'Cut posts to height', body: 'Once concrete is cured (24 hrs), cut post tops to a consistent height above ground. For a 1.8 m fence, post top = 1800 mm above ground (or slightly higher for capping).', watchFor: 'Cutting posts before concrete cures moves them out of plumb. Wait 24 hrs.' },
        { title: 'Fix rails between posts', body: 'Bottom rail 150 mm above ground, middle rail 900 mm, top rail 100 mm below post top (for a 1.8 m fence). Screw to post face with 100 mm bugle screws (2 per rail per post).', watchFor: 'Rail heights matter — palings need to be fixed to a rail at top + bottom + middle to prevent flex.' },
        { title: 'Fix palings to rails', body: 'Start at a corner. First paling flush with corner post, level vertical. 2 nails per rail per paling. Palings usually go up tight (no gap) — a gap only if the design specifies one.', watchFor: 'Palings that aren\'t plumb telegraph across the fence as a lean. Plumb first paling with a level, then keep spacing consistent all the way along.' },
        { title: 'Fit capping (optional)', body: 'Capping board (100×32 H3.2 minimum) along the top of palings for a finished look + keeps water off paling end grain. Butt joints on posts, or scarf-cut for a cleaner join. Wider / thicker capping (140×32 or 200×32) covers post tops too + lasts longer.', watchFor: 'Un-capped fences soak water into paling top grain + rot from the top. 25 mm capping cups + twists in weather — 32 mm min for a fence that stays flat.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'String line', 'Sledge + spade', 'Post-hole borer', 'Cordless drill / impact driver', 'Drop / circular saw', 'Concrete mixer or wheelbarrow', 'Hammer'],
      materials: ['Posts: 100×100 H5 treated pine, 2.4 m long', 'Rails: 100×50 or 75×50 H3-treated pine, 2 rails < 1.5 m, 3 rails for 1.8 m', 'Palings: 100×12 or 100×19 H3-treated pine, 1.8 m long', 'Fixings: 100 mm Type 17 for rails, 50 mm galv jolt-head nails for palings', 'Concrete: N20', 'Capping (optional): 100×32 H3-treated (thicker / wider for longer life — 25 mm cups)'],
      steps: [
        { title: 'Set out post positions', body: 'Post spacing 2.4 m max (paling length). String-line from a corner post + set intermediates from that line.', watchFor: 'Boundary fences must be ON the boundary (or 100 mm inside, negotiated with neighbour). Over-boundary = legal issue. Dividing Fences Acts vary by state — check yours.' },
        { title: 'Dig holes + stand + brace all posts', body: 'Dig all holes to depth (600 mm min). Stand corners + gate posts first — plumb + brace them as reference. String-line the fence face off corners, then stand each intermediate against the string, plumb + brace. Whole fence line right before any concrete goes in.', watchFor: 'A post out of line 20 mm reads as a wave. Bracing every post to the string BEFORE concrete lets you fix drift while it\'s still fixable.' },
        { title: 'Concrete all posts in', body: 'Once every post is plumb + braced on the string, pour N20 concrete around each. Slope concrete top outward at each post for water shed. Feed hole diameter + depth × post count into the Setout Concrete calculator for total volume. Leave braces on 24 hrs cure before loading.', watchFor: 'Pulling a brace before concrete cures = post out of plumb + no fix without pulling the footing. Leave braces on.' },
        { title: 'Cut posts to height', body: 'Once concrete cured (24 hrs), cut tops to consistent height. 1.8 m fence: post top = 1800 mm above ground (or higher for capping).', watchFor: 'Cutting before cure moves posts out of plumb. Wait 24 hrs.' },
        { title: 'Fix rails between posts', body: 'Bottom rail 150 mm above ground, middle 900 mm, top 100 mm below post top (1.8 m fence). 100 mm Type 17s (2 per rail per post).', watchFor: 'Rail heights matter — palings need top + bottom + middle rail fix to prevent flex.' },
        { title: 'Fix palings to rails', body: 'Start at corner. First paling flush with post, level vertical. 2 nails per rail per paling. Palings usually go up tight (no gap) — only if the design specifies a gap.', watchFor: 'Palings not plumb telegraph as a lean across the fence. Plumb first paling with a level, then keep spacing consistent all the way along.' },
        { title: 'Fit capping (optional)', body: 'Capping (100×32 min) along top of palings for finish + keeps water off top grain. Butt on posts or scarf-cut for cleaner join. Wider / thicker (140×32 or 200×32) covers post tops too + lasts longer.', watchFor: 'Un-capped fences soak water into top grain + rot from top. 25 mm cups + twists in weather — 32 mm min for a fence that stays flat.' },
      ],
    },
  },
  {
    id: 'install-gate',
    category: 'decking-outdoor',
    phase: 'external',
    label: 'Install a gate in a fence',
    summary: 'Build frame, brace, fit palings, hang on heavy-duty hinges.',
    nz: {
      tools: ['Tape', 'Framing square', 'Spirit level', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Clamps', 'Chisel', 'File'],
      materials: ['Frame timber: 100×50 or 90×45 H3.2 pine (or matching fence rail size)', 'Diagonal brace: 100×25 or 100×50 H3.2', 'Palings: match the fence palings', 'Hinges: heavy-duty T-hinges or strap hinges (galv, 150–250 mm for a standard paling gate; bigger for wide / heavy gates)', 'Latch: gravity latch, drop bolt, or lockable latch', 'Fixings: 65 mm galv screws for frame + hinges, 50 mm jolt-head nails for palings', 'Hinge screws: 40 mm heavy-duty (supplied with hinges)'],
      steps: [
        { title: 'Measure the gate opening', body: 'From inside face of hinge post to inside face of latch post. Subtract 25 mm total clearance (10 mm hinge side, 15 mm latch side) — that\'s your gate width.', watchFor: 'A gate cut to exact opening size will jam as soon as timber expands in wet weather. 25 mm total clearance minimum.' },
        { title: 'Confirm hinge + latch posts are solid', body: 'Gate posts take much more load than fence posts (hanging + swinging weight). Confirm the concrete footing is 900+ mm deep + the post size is 100×100 min. Reinforce if needed.', watchFor: 'A wobbly gate post ruins the gate quickly. If the fence post is under-sized, install a new dedicated gate post before hanging.' },
        { title: 'Build the gate frame', body: 'Four sides: top rail, bottom rail, hinge stile, latch stile. Butt-joint or half-lap the corners, glue + screw. Frame width = gate width; height = gate height per plan.', watchFor: 'A gate with only 3 sides (missing the latch stile) will sag + not close. Full 4-sided frame every time.' },
        { title: 'Add diagonal brace (critical)', body: 'Diagonal brace runs from the BOTTOM CORNER OF THE HINGE SIDE up to the TOP CORNER OF THE LATCH SIDE. This puts the brace in compression, preventing gate sag.', watchFor: 'Brace running the WRONG way (top hinge to bottom latch) puts it in tension + the gate sags anyway. Bottom hinge to top latch, always.' },
        { title: 'Fit infill to gate frame', body: 'Nail palings, slats, or feature panels to the frame face per the design. If matching the fence, use the same paling detail, spacing, and overhang. If it\'s a feature gate (slats, board-and-batten, panel), set out to the client\'s spec instead.', watchFor: 'A "match the fence" gate that\'s obviously different reads as an add-on. If it\'s deliberately different (feature gate), commit to the design — half-matched half-feature looks unresolved.' },
        { title: 'Fit hinges to gate + hang', body: 'Screw heavy-duty T-hinges or strap hinges to the hinge stile (top + bottom), then lift gate into position + screw hinges to the hinge post. Get help lifting — full-height gates are heavy.', watchFor: 'Small hinges on a heavy gate pull out within a year. 150–250 mm strap or T-hinges cover most residential paling gates; step up for wider or double-height gates.' },
        { title: 'Fit latch + test swing', body: 'Position gravity latch or drop bolt at handle height (~1000 mm) on latch stile. Test the gate swings + latches cleanly, closes flush without binding.', watchFor: 'Swing-test the gate BEFORE fitting the latch — if you install the latch first, then adjust the hinge post to fix a binding gate, the latch ends up 5 mm off. Swing right first, then mark and fix the latch.' },
        { title: 'Weather-proof the top edge', body: 'Cap the top of the gate with a matching capping strip, or bevel-cut the top of the palings to shed water. Un-capped gate tops rot fastest.', watchFor: 'Nail up into the cap from underneath — a nail through the top of the cap is a permanent water entry point.' },
      ],
    },
    au: {
      tools: ['Tape', 'Framing square', 'Spirit level', 'Drop / circular saw', 'Cordless drill / impact driver', 'Hammer', 'Clamps', 'Chisel', 'File'],
      materials: ['Frame timber: 100×50 or 90×45 H3-treated pine (or match fence rail size)', 'Diagonal brace: 100×25 or 100×50 H3', 'Palings: match fence', 'Hinges: heavy-duty T-hinges or strap hinges (galv, 150–250 mm for a standard paling gate; bigger for wide / heavy gates)', 'Latch: gravity latch, drop bolt, lockable latch', 'Fixings: 65 mm galv screws + 50 mm jolt-head nails for palings', 'Hinge screws: 40 mm heavy-duty (supplied)'],
      steps: [
        { title: 'Measure the gate opening', body: 'Inside face of hinge post to inside face of latch post. Subtract 25 mm total clearance (10 hinge, 15 latch) = gate width.', watchFor: 'Cut-to-opening gate jams when timber expands. 25 mm total clearance minimum.' },
        { title: 'Confirm hinge + latch posts are solid', body: 'Gate posts take much more load than fence posts. Concrete footing 900+ mm deep, post size 100×100 min. Reinforce if needed.', watchFor: 'Wobbly gate post ruins the gate. Under-sized fence post: install new dedicated gate post before hanging.' },
        { title: 'Build the gate frame', body: 'Four sides: top rail, bottom rail, hinge stile, latch stile. Butt or half-lap corners, glue + screw.', watchFor: '3-sided gate (no latch stile) sags + won\'t close. Full 4-sided frame every time.' },
        { title: 'Add diagonal brace (critical)', body: 'Diagonal from BOTTOM CORNER OF HINGE SIDE up to TOP CORNER OF LATCH SIDE. Brace in compression prevents gate sag.', watchFor: 'Wrong-way brace (top hinge to bottom latch) puts it in tension + gate sags. Bottom hinge to top latch, always.' },
        { title: 'Fit infill to gate frame', body: 'Nail palings, slats, or feature panels to frame face per design. Matching the fence: same paling detail, spacing, overhang. Feature gate (slats, board-and-batten, panel): set out to client spec instead.', watchFor: '"Match the fence" gate that\'s obviously different reads as add-on. Feature gate: commit to the design — half-matched half-feature looks unresolved.' },
        { title: 'Fit hinges to gate + hang', body: 'Heavy-duty T-hinges / strap hinges to hinge stile (top + bottom), lift gate + screw to hinge post. Get help — full-height gates are heavy.', watchFor: 'Small hinges on a heavy gate pull out within a year. 150–250 mm strap or T-hinges cover most residential paling gates; step up for wider or double-height gates.' },
        { title: 'Fit latch + test swing', body: 'Gravity latch or drop bolt at handle height (~1000 mm) on latch stile. Test swing + latch closes flush without binding.', watchFor: 'Swing-test BEFORE fitting the latch — install the latch first + then adjust the hinge post for a binding gate, and the latch ends up 5 mm off. Swing right first, then mark + fix the latch.' },
        { title: 'Weather-proof the top edge', body: 'Cap gate top with matching capping, or bevel-cut paling tops to shed water. Un-capped rots fastest.', watchFor: 'Nail up into the cap from underneath — a nail through the top of the cap is a permanent water entry point.' },
      ],
    },
  },

  // ─── Renovation — off the linear build path ──────────────────────────────
  {
    id: 'identify-load-bearing',
    category: 'renovation',
    phase: 'renovation',
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
        { title: 'Check wall thickness + framing size', body: 'Standard non-load-bearing internal walls in AU are usually 70×35 MGP10 studs at 600 c/c. Load-bearing walls step up to 90×35 / 90×45, often 450 c/c with deeper lintels. Heavier framing = treat as load-bearing.', watchFor: 'Framing size is a hint, not proof. Combine with joist direction + stacked wall.' },
        { title: 'Look at what happens above openings', body: 'Load-bearing walls have a proper lintel above every opening (a real beam). Non-load-bearing walls often just have a header stud. Lintel present = wall is bearing.', watchFor: 'Some lintels hidden inside false top plate. Don\'t rule out just because no lintel visible from below.' },
        { title: 'Trust nothing — get an engineer', body: 'ANY doubt + you\'re about to cut / remove the wall = call a structural engineer. Site visit + report is $500–1500 — cheaper than the alternative.', watchFor: 'Load-bearing wall removed without lintel design = life-safety issue. Sagging floors + ceiling cracks are first sign; catastrophic failure possible. Never guess on this.' },
      ],
    },
  },
  {
    id: 'cut-doorway-in-existing-wall',
    category: 'renovation',
    phase: 'renovation',
    label: 'Cut a doorway into an existing wall',
    summary: 'Verify not load-bearing, locate services, cut linings, frame opening.',
    nz: {
      tools: ['Tape', 'Spirit level', 'Stud finder', 'Reciprocating saw', 'Keyhole saw', 'Cordless drill / impact driver', 'Hammer', 'Drop / circular saw', 'Multi-detector (finds pipes + wires)', 'Drop-cloth + PPE (dust mask)'],
      materials: ['New studs, plates, trimmers, jack studs (90×45 SG8 to match existing)', 'Header (single 90×45 on flat) for non-load-bearing openings, or spec\'d lintel (90×45 up to 190×45+) for load-bearing', '90×3.15 flat-head framing nails', 'Gib patch material for lining repair', 'Adjustable pre-hung door (fit later)'],
      steps: [
        { title: 'Confirm wall is non-load-bearing', body: 'Follow the identify-load-bearing job. If ANY doubt = engineer. Never assume — a load-bearing wall opened without a designed lintel drops the ceiling.', watchFor: 'A load-bearing wall CAN have a doorway cut, but the lintel must be engineered + full-height jack studs installed. Not a DIY call.' },
        { title: 'Locate services inside the wall', body: 'Multi-detector (like a Bosch GMS 120) over the entire opening area to find electrical cables, water pipes, waste stacks. Cross-check with the house\'s as-built services plan, or trace from the nearest switchboard / stop-tap. Any service = re-route by a licensed sparky / plumber BEFORE cutting.', watchFor: 'Reciprocating saw through a live cable = ACC claim + house without power. Through a water pipe = flooded floor. Detect + trace first.' },
        { title: 'Mark the opening on the wall', body: 'Opening width = door width + 60–80 mm for jambs + tolerance. Height = door + jamb + 15 mm. Mark on both faces of the wall, plumb + level.', watchFor: 'Rough opening tolerance too tight = pre-hung frame doesn\'t fit. 5 mm each side clearance minimum.' },
        { title: 'Cut the wall linings both sides', body: 'Score the gib along the cut lines with a utility knife. Reciprocating saw or keyhole saw through the sheet — cut just inside your marked line so you can trim later. Both faces of the wall.', watchFor: 'Cutting past the marked line means you\'re into linings you don\'t need to replace. Cut inside the line, trim to fit.' },
        { title: 'Cut studs within the opening', body: 'Reciprocating saw through each stud within the opening perimeter. Cut top + bottom of each stud so you can remove them cleanly. Leave the last piece of each stud on the top plate + bottom plate for now.', watchFor: 'Cutting a stud that turns out to carry a hidden load = the ceiling drops. Confirm load-bearing status BEFORE cutting any stud.' },
        { title: 'Install trimmer studs each side', body: 'Full-height trimmer (doubled) each side of the opening, running from floor to ceiling. Fix through into bottom plate + top plate with 90 mm nails.', watchFor: 'Single trimmers on a wide opening deflect + the lintel sags. Double up.' },
        { title: 'Install header or lintel', body: 'Non-load-bearing opening: a header (single 90×45 on flat) fits between the trimmers up at the top plate — no jack studs needed. Load-bearing: fit the spec\'d lintel per the schedule.', watchFor: 'Wrong call on load-bearing status changes the whole opening. If there\'s any doubt the wall is load-bearing, don\'t downgrade to a header — get the load-bearing job checked first.' },
        { title: 'Check opening is ready for door', body: 'If the lining cuts landed cleanly on the trimmer face, no patching needed — the door jamb sits against the trimmer and the architrave covers the join. Only patch where a cut ran past the trimmer + left framing exposed.', watchFor: 'Cutting the lining wide of the trimmer creates a patch job that could\'ve been avoided. Cut on the trimmer line + the architrave hides everything.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level', 'Stud finder', 'Reciprocating saw', 'Keyhole saw', 'Cordless drill / impact driver', 'Hammer', 'Drop / circular saw', 'Multi-detector', 'Drop-cloth + PPE'],
      materials: ['New studs, plates, trimmers, jack studs (70×35 MGP10 to match existing — step up to 90×45 if existing is heavier)', 'Header (single stud-size on flat) for non-load-bearing openings, or spec\'d lintel (90×45 up to 190×45+) for load-bearing', '90×3.15 flat-head framing nails', 'Plasterboard patch material', 'Adjustable pre-hung door (fit later)'],
      steps: [
        { title: 'Confirm wall is non-load-bearing', body: 'Follow the identify-load-bearing job. ANY doubt = engineer. Never assume — load-bearing wall opened without a designed lintel drops the ceiling.', watchFor: 'Load-bearing wall CAN have a doorway cut, but with engineered lintel + full-height jack studs. Not a DIY call.' },
        { title: 'Locate services inside the wall', body: 'Multi-detector over the entire opening area — electrical, water, waste. Cross-check against the house\'s as-built services plan (or trace back from the nearest switchboard / stop-tap). Any service = re-route by licensed sparky / plumber BEFORE cutting.', watchFor: 'Reciprocating saw through a cable = WorkCover claim + no power. Through a pipe = flooded floor. Detect + trace first.' },
        { title: 'Mark the opening on the wall', body: 'Opening width = door width + 60–80 mm for jambs + tolerance. Height = door + jamb + 15 mm. Both faces, plumb + level.', watchFor: 'Rough opening too tight = pre-hung frame doesn\'t fit. 5 mm each side minimum.' },
        { title: 'Cut the wall linings both sides', body: 'Score the plasterboard with utility knife. Reciprocating saw or keyhole saw through the sheet — cut just inside marked line so you can trim later. Both faces.', watchFor: 'Cutting past the line = extra linings to replace. Cut inside line, trim to fit.' },
        { title: 'Cut studs within the opening', body: 'Reciprocating saw through each stud within perimeter. Cut top + bottom cleanly. Leave the last piece of each stud on top + bottom plate for now.', watchFor: 'Cutting a stud that carries a hidden load = ceiling drops. Confirm load-bearing BEFORE cutting.' },
        { title: 'Install trimmer studs each side', body: 'Full-height trimmer (doubled) each side of opening, floor to ceiling. Fix through into bottom + top plate with 90 mm nails.', watchFor: 'Single trimmers on wide openings deflect + lintel sags. Double up.' },
        { title: 'Install header or lintel', body: 'Non-load-bearing opening: a header (single stud-size piece on flat, matching the wall studs) fits between the trimmers up at the top plate — no jack studs needed. Load-bearing: fit the spec\'d lintel per schedule.', watchFor: 'Wrong call on load-bearing changes the whole opening. Any doubt = don\'t downgrade to a header. Confirm load-bearing status first.' },
        { title: 'Check opening is ready for door', body: 'If the lining cuts landed cleanly on the trimmer face, no patching needed — door jamb sits against the trimmer, architrave covers the join. Only patch where a cut ran past the trimmer + left framing exposed.', watchFor: 'Cutting wide of the trimmer creates patch work you could\'ve avoided. Cut on the trimmer line + architrave hides everything.' },
      ],
    },
  },
  {
    id: 'replace-weatherboard',
    category: 'renovation',
    phase: 'renovation',
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
    phase: 'renovation',
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
    phase: 'renovation',
    label: 'Replace a window in an existing wall',
    summary: 'Check fixing method, unfix old, install new, re-flash + refit trims.',
    nz: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Reciprocating saw', 'Utility knife', 'Pry bar / flat bar', 'Sealant gun', 'Multi-tool', 'Staple gun', 'Ladder / trestle', 'PPE'],
      materials: ['New window unit (measured to fit existing opening, or new opening framing planned)', 'Sill flashing (extruded metal, colour-matched)', 'Sill flashing tape (butyl, 300 mm wide)', 'Head flashing tape', 'Building wrap patch (for repair of existing wrap)', 'Countersunk screws through window jamb (per manufacturer)', 'Neutral-cure sealant', 'Timber packers'],
      steps: [
        { title: 'Measure the existing opening + confirm new window fits', body: 'Measure stud-to-stud + head-to-sill of the framed opening. New window should be 10–15 mm smaller each side. If ordering a bigger window = opening modification (extra job).', watchFor: 'Ordering a window without confirming the ROUGH opening (not the current window unit size) is a common cause of week-long delays. Measure the frame, not the visible window.' },
        { title: 'Remove internal architrave', body: 'Pry off internal architrave carefully — often reusable. This exposes the internal edge of the window frame + the wall lining edge.', watchFor: 'Prying architrave with force cracks it. Slide a putty knife behind first to break the paint seal, then pry gently.' },
        { title: 'Release the window from inside', body: 'With the architrave off, unscrew the jamb fixings from inside. The window slides straight out through the opening. No cladding removal needed just to get the window out.', watchFor: 'Cladding removal is only needed if you\'re also replacing head/sill flashings. Removing cladding when you don\'t have to is unnecessary damage risk — pull the window out first, decide about cladding after.' },
        { title: 'Cut old flashings + tapes', body: 'Slice through any flashing tape around the window with a utility knife. Remove sill flashing, head flashing, and any building wrap tape around the perimeter.', watchFor: 'Tearing wrap in the process = patch it before install. Cut cleanly with a knife rather than tearing.' },
        { title: 'Unscrew + remove old window', body: 'Remove screws / nails around window flange. Have someone support the window while you undo the last few fixings. Lift the window out from the outside — it\'s heavy.', watchFor: 'A window without support drops when the last fixings come out. Two people, one supporting from outside, one removing fixings.' },
        { title: 'Inspect + repair the framing', body: 'Check the sill, jambs, head for rot or damage. Any soft timber = cut out + splice in new. Any damaged wrap = patch with new wrap + tape.', watchFor: 'Fitting a new window over rotten framing = same rot in 2 years. Fix the framing before the new window goes in.' },
        { title: 'Install new window per the install-window job', body: 'Follow the standard window install: sill flashing, sill tape, position + pack + plumb + screw off, then jamb + head flashing tape over flange onto wrap. See the install-window job for full sequence.', watchFor: 'The install sequence for a replacement is identical to a new-build install. Reference that job for detail.' },
        { title: 'Refit external cladding + replace scribers', body: 'Refit weatherboards or FC sheets around the window if any were removed. The scribers around the window (the timber trims that sit against the cladding) need to be replaced — old scribers rarely come off cleanly and don\'t seal well the second time. Prime all sides + cut ends before fitting.', watchFor: 'Prime + seal the cut ends of any boards you\'re reusing before they go back on — the raw end grain soaks water and rots the board from the cut inward. 30 seconds of primer saves a re-do in a couple of years.' },
        { title: 'Refit architrave', body: 'Check the jamb edge sits flush with the wall lining face. Refit architrave. Fill nail holes, sand, prime, paint.', watchFor: 'A jamb sitting shy of the lining leaves a shadow gap under the architrave. Sort it before pinning the architrave, not after.' },
      ],
    },
    au: {
      tools: ['Tape', 'Spirit level (long)', 'Cordless drill / impact driver', 'Reciprocating saw', 'Utility knife', 'Pry bar / flat bar', 'Sealant gun', 'Multi-tool', 'Staple gun', 'Ladder / trestle', 'PPE'],
      materials: ['New window unit (measured to fit existing opening — BAL-rated in bushfire zones)', 'Sill flashing (extruded, colour-matched)', 'Sill flashing tape (butyl, 300 mm wide)', 'Head flashing tape', 'Building wrap patch', 'Countersunk screws through window jamb (per manufacturer)', 'Neutral-cure sealant', 'Timber packers'],
      steps: [
        { title: 'Measure the existing opening + confirm new window fits', body: 'Measure stud-to-stud + head-to-sill of framed opening. New window should be 10–15 mm smaller each side. Bigger window = opening modification (extra job). In BAL zones, confirm new unit is BAL-rated.', watchFor: 'Ordering without confirming ROUGH opening (not current window unit) = week-long delays. Measure the frame, not the visible window.' },
        { title: 'Remove internal architrave + reveals', body: 'Pry off internal architrave carefully — often reusable. Remove reveal timber. Exposes internal edge of window frame + lining edge.', watchFor: 'Prying with force cracks architrave. Putty knife behind first to break paint seal, then pry gently.' },
        { title: 'Release the window from inside', body: 'With the architrave + reveals off, unscrew the jamb fixings from inside. The window slides straight out through the opening. No cladding removal needed just to get the window out.', watchFor: 'Cladding removal is only needed if you\'re also replacing head / sill flashings. Removing cladding when you don\'t have to is unnecessary damage risk — pull the window out first, decide about cladding after.' },
        { title: 'Cut old flashings + tapes', body: 'Slice through flashing tape around window with utility knife. Remove sill flashing, head flashing, any wrap tape around perimeter.', watchFor: 'Tearing wrap = patch it before install. Cut cleanly rather than tearing.' },
        { title: 'Unscrew + remove old window', body: 'Remove screws / nails around flange. Support the window while undoing last fixings. Lift out from outside — heavy.', watchFor: 'Window without support drops when last fixings come out. Two people, one supporting outside.' },
        { title: 'Inspect + repair the framing', body: 'Check sill, jambs, head for rot or damage. Soft timber = cut + splice in new. Damaged wrap = patch + tape. In termite zones, inspect for termite activity while wall is open.', watchFor: 'Fitting new window over rotten framing = same rot in 2 years. Fix framing first.' },
        { title: 'Install new window per the install-window job', body: 'Follow standard install: sill flashing, sill tape, position + pack + plumb + screw off, then jamb + head flashing tape over flange onto wrap. See install-window job for full sequence.', watchFor: 'Install sequence for replacement = identical to new-build. Reference that job for detail.' },
        { title: 'Refit external cladding + replace scribers', body: 'Refit weatherboards / FC sheets around the window if any were removed. The scribers (external timber trims against the cladding) need to be replaced — old scribers rarely come off cleanly and don\'t seal well the second time. Prime all sides + cut ends before fitting.', watchFor: 'Prime + seal the cut ends of any boards you\'re reusing before they go back on — raw end grain soaks water and rots the board from the cut inward. 30 seconds of primer saves a re-do in a couple of years.' },
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
  const [openPhase, setOpenPhase] = useState<PhaseKey | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (i: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

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

          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            {activeDetail.steps.map((step, i) => {
              const isOpen = expandedSteps.has(i);
              return (
                <div key={i} style={{ borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border)' }}>
                  <button
                    onClick={() => toggleStep(i)}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%', padding: '12px 14px',
                      background: 'none', border: 'none',
                      display: 'grid', gridTemplateColumns: '28px 1fr 16px',
                      alignItems: 'center', gap: 12,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: 'var(--color-orange)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'SF Pro Rounded', 'Nunito', system-ui, -apple-system, sans-serif",
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.4px',
                    }}>{i + 1}</div>
                    <div style={{
                      fontSize: 14, fontWeight: 500, color: 'var(--color-text)',
                      letterSpacing: '-0.15px', lineHeight: 1.3,
                    }}>{step.title}</div>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 14px 14px 52px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{
                        margin: 0, fontSize: 13.5, color: 'var(--color-text)',
                        lineHeight: 1.55, letterSpacing: '-0.1px',
                      }}>{step.body}</p>
                      {step.watchFor && (
                        <p style={{
                          margin: 0, fontSize: 12.5, color: '#7a5b00', lineHeight: 1.5,
                          letterSpacing: '-0.05px',
                        }}>
                          <span style={{ fontWeight: 600 }}>⚠ Watch for: </span>{step.watchFor}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <SequencerDisclaimer />
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
          Build phases in order — tap a phase to see every job in it. Written for {settings.region} practice.
        </p>

        {PHASES.map((phase, phaseIdx) => {
          const otherRegionKey: 'au' | 'nz' = regionKey === 'nz' ? 'au' : 'nz';
          // Hide jobs that have ONLY the other region's block (regional exclusion).
          // Jobs with neither region block are true skeletons — still shown as "Coming".
          const phaseJobs = JOBS.filter(j =>
            j.phase === phase.key && !(j[otherRegionKey] && !j[regionKey])
          );
          if (phaseJobs.length === 0) return null;
          const open = openPhase === phase.key;
          return (
            <div key={phase.key} style={{ ...cardStyle, overflow: 'hidden' }}>
              <button
                onClick={() => setOpenPhase(open ? null : phase.key)}
                aria-expanded={open}
                style={{
                  width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                  display: 'grid', gridTemplateColumns: '32px 1fr 16px', alignItems: 'center', gap: 12,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--color-orange)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'SF Pro Rounded', 'Nunito', system-ui, -apple-system, sans-serif",
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 13, fontWeight: 700, letterSpacing: '-0.4px',
                }}>{phaseIdx + 1}</div>
                <div>
                  <div style={{
                    fontSize: 15, fontWeight: 500, color: 'var(--color-text)',
                    letterSpacing: '-0.2px',
                  }}>{phase.label}</div>
                  <div style={{
                    marginTop: 2, fontSize: 11.5, color: 'var(--color-muted)',
                    letterSpacing: '-0.1px', lineHeight: 1.4,
                  }}>{phase.detail}</div>
                </div>
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
                  {phaseJobs.map(job => {
                    const ready = !!job[regionKey];
                    return (
                      <button
                        key={job.id}
                        onClick={() => { if (ready) { setActiveJobId(job.id); setExpandedSteps(new Set()); } }}
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

        <SequencerDisclaimer />
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// General guidance disclaimer. Shown at the bottom of both the library view
// and every job-detail view. The content in this file is a builder's SOP,
// not certified construction advice — the plans, engineer, and local council
// override anything written here, and the user needs to see that spelled out
// wherever they're reading a step.
function SequencerDisclaimer() {
  return (
    <div style={{
      marginTop: 4,
      padding: '12px 14px',
      background: 'var(--color-card)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 'var(--radius-card)',
    }}>
      <p style={{
        margin: 0,
        fontSize: 11.5,
        color: 'var(--color-muted)',
        lineHeight: 1.55,
        letterSpacing: '-0.05px',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>General guidance only.</span>{' '}
        The sequencer captures common trade practice, not certified construction advice. Always follow
        your project's plans, engineer, and building consent — and check the current NZBC / NCC and
        manufacturer specs for anything you're not sure about. Setout accepts no liability for work
        undertaken from this content.
      </p>
    </div>
  );
}

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
