export type Region = 'AU' | 'NZ';

export const COMPLIANCE_NOTES: Record<string, Record<Region, string>> = {
  decking: {
    AU: 'Joist and bearer spacings based on AS 1684 — Residential Timber Framing. Verify against your timber species and span tables.',
    NZ: 'Joist and bearer spacings based on NZS 3604 — Timber-framed buildings. Verify against your timber species and span tables.',
  },
  framing: {
    AU: 'Stud spacings based on AS 1684 — Residential Timber Framing. Verify against your timber species and local council requirements.',
    NZ: 'Stud spacings based on NZS 3604 — Timber-framed buildings. Verify against your timber species and local authority requirements.',
  },
  stairs: {
    AU: 'Riser and tread limits per AS 1657. Verify against your specific application — residential, public access, or external.',
    NZ: 'Riser and tread limits per NZS 3604. Verify against your specific application — residential, public access, or external.',
  },
  roof: {
    AU: 'Assumes a symmetrical gable roof. Verify rafter sizing against AS 1684 span tables for your timber species and wind/snow region.',
    NZ: 'Assumes a symmetrical gable roof. Verify rafter sizing against NZS 3604 span tables for your timber species and wind/snow zone.',
  },
  balusters: {
    AU: '125mm max gap per AS 1657. Some councils and body corporates require tighter gaps for pool fencing or commercial use.',
    NZ: '100mm max gap per NZS 3604. Pool fencing and commercial applications may have additional requirements.',
  },
  concrete: {
    AU: 'Mix design and placement per AS 3600 and AS 1379. For structural elements (footings, slabs on grade), verify with an engineer. Minimum 20 MPa for residential footings.',
    NZ: 'Mix design and placement per NZS 3109. For structural elements verify with an engineer. Minimum 17.5 MPa for non-structural residential use.',
  },
  raked: {
    AU: 'Raked wall framing per AS 1684. Verify stud sizes and spacing against span tables for your timber species, wall height, and wind classification.',
    NZ: 'Raked wall framing per NZS 3604. Verify stud sizes against span tables for your timber species, wall height, and wind zone.',
  },
  cladding: {
    AU: 'Cladding installation per AS 1684 and manufacturer specifications. Lap and fixing requirements vary by product and exposure zone — verify against your cladding product data sheet.',
    NZ: 'Cladding installation per NZS 3604 and manufacturer specifications. Lap and fixing requirements vary by product and wind/moisture zone — verify against your cladding product data sheet.',
  },
  setout: {
    AU: 'General squareness tolerance for residential construction is ±3mm in 3m. Verify with your engineer or project specification for structural elements.',
    NZ: 'General squareness tolerance for residential construction is ±3mm in 3m. Verify with your engineer or project specification for structural elements.',
  },
  codecheck: {
    AU: 'Answers are AI-generated and reference AS 1684, NCC Volume 2, AS 1657, and AS 3600. Always verify against current standards and consult a licensed engineer or building certifier for structural or complex compliance decisions.',
    NZ: 'Answers are AI-generated and reference NZS 3604, NZBC, NZS 3109, and E2/AS1. Always verify against current standards and consult a licensed engineer or Licensed Building Practitioner (LBP) for structural or complex compliance decisions.',
  },
};

export interface StairLimits {
  riserMin: number;
  riserMax: number;
  treadMin: number;
  treadMax: number;
  standard: string;
}

export const STAIR_LIMITS: Record<Region, StairLimits> = {
  AU: { riserMin: 115, riserMax: 225, treadMin: 240, treadMax: 355, standard: 'AS 1657' },
  NZ: { riserMin: 150, riserMax: 220, treadMin: 220, treadMax: 355, standard: 'NZS 3604' },
};

export const BALUSTER_MAX_GAP: Record<Region, number> = {
  AU: 125,
  NZ: 100,
};
