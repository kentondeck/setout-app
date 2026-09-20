import type { Region } from '../types';

// Tax year boundaries for filtering receipts before handing them to an
// accountant. NZ runs 1 April → 31 March; AU runs 1 July → 30 June.
//
// A "tax year" is named by the calendar year it ENDS in — e.g. the NZ
// tax year ending 31 March 2027 spans 1 April 2026 → 31 March 2027 and is
// labelled "2026/27" (which is how IRD and every tradie's accountant refers
// to it).

export interface TaxYearRange {
  key: string;         // e.g. "2026/27" — stable id for filter state
  label: string;       // e.g. "This tax year (2026/27)"
  shortLabel: string;  // e.g. "2026/27" — for a compact chip
  from: Date;          // inclusive start (00:00 local on the start day)
  to: Date;            // exclusive end (00:00 local on the day AFTER 31 Mar / 30 Jun)
}

interface Boundary {
  startMonth: number; // 0-indexed (Jan = 0)
  startDay: number;
}

const BOUNDARIES: Record<Region, Boundary> = {
  NZ: { startMonth: 3, startDay: 1 }, // 1 April
  AU: { startMonth: 6, startDay: 1 }, // 1 July
};

function yearKey(region: Region, endYear: number): string {
  // Both regions use "YYYY/YY" — first year = start year, second = end year (last two digits)
  const startYear = endYear - 1;
  const suffix = String(endYear).slice(-2);
  return `${startYear}/${suffix}`;
  void region;
}

function rangeForEndYear(region: Region, endYear: number, prefix: string): TaxYearRange {
  const { startMonth, startDay } = BOUNDARIES[region];
  const from = new Date(endYear - 1, startMonth, startDay, 0, 0, 0, 0);
  // Exclusive end = first day of the NEXT tax year, so `ts < to` is a clean check.
  const to = new Date(endYear, startMonth, startDay, 0, 0, 0, 0);
  const key = yearKey(region, endYear);
  return {
    key,
    label: prefix ? `${prefix} (${key})` : key,
    shortLabel: key,
    from,
    to,
  };
}

// Returns the tax year whose range contains `now`. If we're between 1 Jan
// and (region's start day) - 1 of a given calendar year, we're still in the
// tax year that ends in this calendar year. Otherwise we're in the tax year
// that ends next calendar year.
export function currentTaxYear(region: Region, now: Date = new Date()): TaxYearRange {
  const { startMonth, startDay } = BOUNDARIES[region];
  const y = now.getFullYear();
  const startOfThisCalendarYearsTaxYear = new Date(y, startMonth, startDay, 0, 0, 0, 0);
  const endYear = now.getTime() >= startOfThisCalendarYearsTaxYear.getTime() ? y + 1 : y;
  return rangeForEndYear(region, endYear, 'This tax year');
}

export function previousTaxYear(region: Region, now: Date = new Date()): TaxYearRange {
  const current = currentTaxYear(region, now);
  // "End year" of current is embedded in `to` — take it and go back one.
  const endYear = current.to.getFullYear() - 1;
  return rangeForEndYear(region, endYear, 'Last tax year');
}
