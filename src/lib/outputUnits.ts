// Units for saved-calc outputs, so the History detail can show "4285 mm"
// instead of a bare "4285". Units are calculator-specific — `rise` is mm in
// Stairs but m in Roof — so the map is keyed by calculatorId first, then falls
// back to suffix inference, then to no unit (counts, booleans).

type PerCalcUnits = Record<string, Record<string, string>>;

// Explicit units for keys where the suffix doesn't encode it (mostly the
// mm-vs-m dimension calls). Keys not listed here fall through to suffix rules.
const OUTPUT_UNITS: PerCalcUnits = {
  stairs: {
    riserHeight: 'mm', treadDepth: 'mm', treadBoardDepth: 'mm', stringerLength: 'mm',
    stringerAngle: '°', walklineSum: 'mm', stringerDrop: 'mm', totalRise: 'mm', totalRun: 'mm',
  },
  roof: {
    span: 'm', run: 'm', rise: 'm', ridgeHeight: 'm', rafterLength: 'm', lineRafterLength: 'm',
    totalRafterLength: 'm', pitchDegrees: '°', plumbCutAngle: '°', seatCutAngle: '°',
    birdsmouthPlumbDepth: 'mm', remainingDepth: 'mm', ridgeShortening: 'mm',
  },
  decking: {
    boardLinealMetres: 'lm', joistLinealMetres: 'lm', bearerLinealMetres: 'lm', totalLinealMetres: 'lm',
  },
  excavation: {
    bankVolume: 'm³', looseVolume: 'm³', swellAdded: 'm³', avgDepth: 'm',
    length: 'm', width: 'm', depthNear: 'm', depthFar: 'm',
  },
  gradient: { percentage: '%', angle: '°', rise: 'mm', risePerMetre: 'mm/m' },
  roofing: { slopeAreaM2: 'm²' },
  concrete: {
    exactVolume: 'm³', orderVolume: 'm³', litres: 'L', weightTonnes: 't', volumePerHole: 'm³',
    postVolumePerHole: 'm³', totalVolume: 'm³', wetVolume: 'm³', dryVolume: 'm³', waterLitres: 'L',
  },
  fencing: { railLinealM: 'lm' },
  baluster: { actualGap: 'mm', totalBalusterWidth: 'mm', totalLength: 'mm', balusterWidth: 'mm' },
  framing: { topPlateLineal: 'lm', bottomPlateLineal: 'lm', totalLinealMetres: 'lm' },
  cladding: {
    faceCover: 'mm', topBoardRip: 'mm', totalLm: 'lm', wastePercent: '%',
    firstMark: 'mm', lastMark: 'mm', boardWidth: 'mm', desiredLap: 'mm',
  },
  raked: {
    lowStudHeight: 'mm', highStudHeight: 'mm', rakePlateLength: 'mm', bottomPlateLineal: 'lm',
    totalStudLineal: 'lm', totalLinealMetres: 'lm', pitchAngle: '°', rakePlateVertical: 'mm', studCutExtra: 'mm',
  },
  setout: { diagonal: 'mm', error: 'mm' },
  cutlist: { totalWaste: 'mm', wastePercent: '%', totalCutLength: 'mm' },
  equalspacing: { actualGap: 'mm', centreSpacing: 'mm' },
};

// Suffix rules, checked in order (longer/more-specific first so `M` doesn't
// steal `Mm`/`M2`/`M3`). Reliable across every calculator.
function unitFromSuffix(key: string): string {
  if (/Mm$/.test(key)) return 'mm';
  if (/M2$/.test(key)) return 'm²';
  if (/M3$/.test(key)) return 'm³';
  if (/Kg$/.test(key)) return 'kg';
  if (/(Degrees|Angle)$/.test(key)) return '°';
  if (/Percent$/.test(key)) return '%';
  if (/(LinealMetres|Lineal|Lm)$/.test(key)) return 'lm';
  if (/Litres$/.test(key)) return 'L';
  if (/M$/.test(key)) return 'm';
  return '';
}

export function unitFor(calculatorId: string, key: string): string {
  const explicit = OUTPUT_UNITS[calculatorId]?.[key];
  if (explicit !== undefined) return explicit;
  return unitFromSuffix(key);
}

// "4285" + "mm" -> "4285mm"; "35" + "°" -> "35°"; bare when no unit.
export function formatOutputValue(calculatorId: string, key: string, value: unknown): string {
  const v = String(value);
  const unit = unitFor(calculatorId, key);
  return unit ? `${v}${unit}` : v;
}

// "totalRafterLength" -> "Total rafter length"; strips a trailing unit suffix
// so the label doesn't repeat the unit already on the value.
export function prettifyOutputLabel(key: string): string {
  const stripped = key.replace(/(Mm|M2|M3|Kg|Lm|M)$/, '');
  const spaced = stripped
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
