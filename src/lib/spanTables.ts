// Span table data sourced from NZS 3604:2011 and AS 1684.2:2010.
// Floor joist / bearer spans are for single-span, standard residential loading.
// Values are approximate mid-range figures — always verify against the current edition for your
// specific load width, wind zone, and end-fixity conditions.
//
// NOT CURRENTLY WIRED IN: nothing in src/ or api/ calls lookupSpan or reads these
// tables — no calculator or SmartQuote flow surfaces span guidance from this data
// yet. Kept as reference data for a future structural-span feature; don't assume
// the app currently shows users anything backed by this file.

export interface SpanEntry {
  maxSpanM: number;
  note?: string;
  tableRef: string;
}

// ─── NZS 3604:2011 ───────────────────────────────────────────────────────────

// Floor joists — single span, 0.75 kPa LL, load width 1.8 m (Table 7.2)
export const NZ_FLOOR_JOISTS: Record<string, Record<string, Record<number, SpanEntry>>> = {
  MSG8: {
    '90x45':  { 400: { maxSpanM: 2.2, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 1.9, tableRef: 'NZS 3604:2011 Table 7.2' } },
    '140x45': { 400: { maxSpanM: 3.4, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 3.0, tableRef: 'NZS 3604:2011 Table 7.2' } },
    '190x45': { 400: { maxSpanM: 4.6, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 4.0, tableRef: 'NZS 3604:2011 Table 7.2' } },
    '240x45': { 400: { maxSpanM: 5.8, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 5.1, tableRef: 'NZS 3604:2011 Table 7.2' } },
    '290x45': { 400: { maxSpanM: 6.9, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 6.1, tableRef: 'NZS 3604:2011 Table 7.2' } },
  },
  MSG10: {
    '90x45':  { 400: { maxSpanM: 2.4, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 2.1, tableRef: 'NZS 3604:2011 Table 7.2' } },
    '140x45': { 400: { maxSpanM: 3.7, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 3.3, tableRef: 'NZS 3604:2011 Table 7.2' } },
    '190x45': { 400: { maxSpanM: 5.1, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 4.5, tableRef: 'NZS 3604:2011 Table 7.2' } },
    '240x45': { 400: { maxSpanM: 6.4, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 5.7, tableRef: 'NZS 3604:2011 Table 7.2' } },
  },
  MSG12: {
    '90x45':  { 400: { maxSpanM: 2.6, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 2.3, tableRef: 'NZS 3604:2011 Table 7.2' } },
    '140x45': { 400: { maxSpanM: 4.0, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 3.6, tableRef: 'NZS 3604:2011 Table 7.2' } },
    '190x45': { 400: { maxSpanM: 5.5, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 4.9, tableRef: 'NZS 3604:2011 Table 7.2' } },
    '240x45': { 400: { maxSpanM: 6.9, tableRef: 'NZS 3604:2011 Table 7.2' }, 600: { maxSpanM: 6.2, tableRef: 'NZS 3604:2011 Table 7.2' } },
  },
};

// Floor bearers — single span, load width 1.8 m (Table 7.1)
export const NZ_FLOOR_BEARERS: Record<string, Record<string, Record<number, SpanEntry>>> = {
  MSG8: {
    '90x90':   { 1: { maxSpanM: 1.8, tableRef: 'NZS 3604:2011 Table 7.1' } },
    '120x90':  { 1: { maxSpanM: 2.3, tableRef: 'NZS 3604:2011 Table 7.1' } },
    '190x90':  { 1: { maxSpanM: 3.2, tableRef: 'NZS 3604:2011 Table 7.1' } },
    '190x45':  { 1: { maxSpanM: 2.2, tableRef: 'NZS 3604:2011 Table 7.1' } },
    '240x45':  { 1: { maxSpanM: 2.8, tableRef: 'NZS 3604:2011 Table 7.1' } },
    '290x45':  { 1: { maxSpanM: 3.4, tableRef: 'NZS 3604:2011 Table 7.1' } },
  },
};

// Rafters — sheet roof, single span (Table 10.14 / 10.15)
export const NZ_RAFTERS: Record<string, Record<string, Record<number, SpanEntry>>> = {
  MSG8: {
    '90x45':  { 600: { maxSpanM: 2.2, tableRef: 'NZS 3604:2011 Table 10.14' }, 900: { maxSpanM: 1.9, tableRef: 'NZS 3604:2011 Table 10.14' } },
    '140x45': { 600: { maxSpanM: 3.4, tableRef: 'NZS 3604:2011 Table 10.14' }, 900: { maxSpanM: 2.9, tableRef: 'NZS 3604:2011 Table 10.14' } },
    '190x45': { 600: { maxSpanM: 4.6, tableRef: 'NZS 3604:2011 Table 10.14' }, 900: { maxSpanM: 3.9, tableRef: 'NZS 3604:2011 Table 10.14' } },
  },
};

// Wall studs — load-bearing, standard wind zone (Table 9.1)
export const NZ_WALL_STUDS: Record<string, Record<string, Record<number, SpanEntry>>> = {
  MSG8: {
    '90x45': {
      400: { maxSpanM: 3.0, tableRef: 'NZS 3604:2011 Table 9.1' },
      600: { maxSpanM: 2.4, tableRef: 'NZS 3604:2011 Table 9.1' },
    },
    '90x70': {
      400: { maxSpanM: 3.6, tableRef: 'NZS 3604:2011 Table 9.1' },
      600: { maxSpanM: 3.0, tableRef: 'NZS 3604:2011 Table 9.1' },
    },
  },
};

// ─── AS 1684.2:2010 ──────────────────────────────────────────────────────────

// Floor joists — single span, standard residential loading (Span Tables)
export const AU_FLOOR_JOISTS: Record<string, Record<string, Record<number, SpanEntry>>> = {
  MGP10: {
    '90x45':  { 450: { maxSpanM: 2.1, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 1.8, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
    '140x45': { 450: { maxSpanM: 3.3, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 2.9, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
    '190x45': { 450: { maxSpanM: 4.5, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 3.9, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
    '240x45': { 450: { maxSpanM: 5.6, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 5.0, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
  },
  MGP12: {
    '90x45':  { 450: { maxSpanM: 2.3, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 2.0, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
    '140x45': { 450: { maxSpanM: 3.6, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 3.2, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
    '190x45': { 450: { maxSpanM: 4.9, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 4.3, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
    '240x45': { 450: { maxSpanM: 6.2, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 5.5, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
  },
  MGP15: {
    '90x45':  { 450: { maxSpanM: 2.6, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 2.3, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
    '140x45': { 450: { maxSpanM: 4.0, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 3.6, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
    '190x45': { 450: { maxSpanM: 5.4, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 4.8, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
    '240x45': { 450: { maxSpanM: 6.8, tableRef: 'AS 1684.2 Span Tables — Floor Joists' }, 600: { maxSpanM: 6.1, tableRef: 'AS 1684.2 Span Tables — Floor Joists' } },
  },
};

// Wall studs — load-bearing (AS 1684.2 Span Tables — Studs)
export const AU_WALL_STUDS: Record<string, Record<string, Record<number, SpanEntry>>> = {
  MGP10: {
    '90x45': {
      450: { maxSpanM: 2.7, tableRef: 'AS 1684.2 Span Tables — Studs' },
      600: { maxSpanM: 2.4, tableRef: 'AS 1684.2 Span Tables — Studs' },
    },
    '90x70': {
      450: { maxSpanM: 3.3, tableRef: 'AS 1684.2 Span Tables — Studs' },
      600: { maxSpanM: 3.0, tableRef: 'AS 1684.2 Span Tables — Studs' },
    },
  },
};

// ─── Lookup function ─────────────────────────────────────────────────────────

export interface LookupInput {
  region: 'AU' | 'NZ';
  member: string;
  size?: string;
  grade?: string;
  spacing_mm?: number;
}

export function lookupSpan(input: LookupInput): string {
  const { region, member, size, grade, spacing_mm } = input;

  const normSize = size?.replace(/\s/g, '').replace('×', 'x');
  const normGrade = grade?.toUpperCase().replace(/\s/g, '');
  const spacing = spacing_mm ?? 0;

  const memberLower = member.toLowerCase();

  try {
    if (region === 'NZ') {
      if (memberLower.includes('joist') && memberLower.includes('floor')) {
        const table = NZ_FLOOR_JOISTS[normGrade ?? '']?.[normSize ?? '']?.[spacing];
        if (table) return `APPROXIMATE max span ≈ ${table.maxSpanM} m for ${normGrade} ${normSize} @ ${spacing}mm, single span, 1.8 m load width. Source: ${table.tableRef}. This is a mid-range estimate — use web_search to confirm the exact value for the user's load width and end-fixity if precision matters.`;
        return `No embedded match for ${normGrade ?? '?'} ${normSize ?? '?'} @ ${spacing || '?'}mm. Refer to NZS 3604:2011 Table 7.2 — Floor Joists (Single Span). Use web_search for the exact span value.`;
      }
      if (memberLower.includes('bearer')) {
        const table = NZ_FLOOR_BEARERS[normGrade ?? '']?.[normSize ?? '']?.[1];
        if (table) return `APPROXIMATE max span ≈ ${table.maxSpanM} m for ${normGrade} ${normSize}, 1.8 m load width. Source: ${table.tableRef}. Bearer spans are sensitive to load width — use web_search to confirm for the user's tributary area.`;
        return `No embedded match for ${normGrade ?? '?'} ${normSize ?? '?'} bearer. Refer to NZS 3604:2011 Table 7.1 — Floor Bearers. Use web_search for the exact span. Spans depend on load width (tributary area) and grade.`;
      }
      if (memberLower.includes('rafter')) {
        const table = NZ_RAFTERS[normGrade ?? '']?.[normSize ?? '']?.[spacing];
        if (table) return `APPROXIMATE max rafter span ≈ ${table.maxSpanM} m for ${normGrade} ${normSize} @ ${spacing}mm, sheet roof. Source: ${table.tableRef}. Tile roofs reduce this — use web_search to confirm for the user's roof type and wind zone.`;
        return 'No embedded match. Refer to NZS 3604:2011 Tables 10.14–10.17 — Rafters. Use web_search for the exact span. Varies by cladding, spacing, wind zone.';
      }
      if (memberLower.includes('stud')) {
        const table = NZ_WALL_STUDS[normGrade ?? '']?.[normSize ?? '']?.[spacing];
        if (table) return `APPROXIMATE max stud height ≈ ${table.maxSpanM} m for ${normGrade} ${normSize} @ ${spacing}mm, load-bearing, standard wind zone. Source: ${table.tableRef}. High / Very High zones reduce this — use web_search to confirm for the user's wind zone.`;
        return 'No embedded match. Refer to NZS 3604:2011 Table 9.1 — Wall Studs. Use web_search for the exact height. Varies by grade, spacing, wind zone.';
      }
    }

    if (region === 'AU') {
      if (memberLower.includes('joist') && memberLower.includes('floor')) {
        const table = AU_FLOOR_JOISTS[normGrade ?? '']?.[normSize ?? '']?.[spacing];
        if (table) return `APPROXIMATE max span ≈ ${table.maxSpanM} m for ${normGrade} ${normSize} @ ${spacing}mm, single span. Source: ${table.tableRef}. Mid-range estimate — use web_search to confirm for the user's load width, wind class, and end-fixity.`;
        return `No embedded match for ${normGrade ?? '?'} ${normSize ?? '?'} @ ${spacing || '?'}mm. Refer to AS 1684.2 Span Tables — Floor Joists. Use web_search for the exact value.`;
      }
      if (memberLower.includes('stud')) {
        const table = AU_WALL_STUDS[normGrade ?? '']?.[normSize ?? '']?.[spacing];
        if (table) return `APPROXIMATE max stud height ≈ ${table.maxSpanM} m for ${normGrade} ${normSize} @ ${spacing}mm, load-bearing. Source: ${table.tableRef}. Use web_search to confirm for the user's wind class.`;
        return 'No embedded match. Refer to AS 1684.2 Span Tables — Studs. Use web_search for the exact value. Varies by grade, spacing, load, wind class.';
      }
      if (memberLower.includes('bearer')) {
        return 'No embedded bearer data for AU. Refer to AS 1684.2 Span Tables — Floor Bearers. Use web_search for the exact span. Depends on load width, grade, wind class.';
      }
      if (memberLower.includes('rafter')) {
        return 'No embedded rafter data for AU. Refer to AS 1684.2 Span Tables — Rafters. Use web_search for the exact span. Varies by cladding, spacing, wind class.';
      }
    }
  } catch {
    // fall through to generic response
  }

  return `No embedded data for "${member}" in ${region}. Check the relevant span table in ${region === 'NZ' ? 'NZS 3604:2011' : 'AS 1684.2'}.`;
}
