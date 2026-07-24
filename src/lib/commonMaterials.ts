// A representative set of common AU/NZ residential construction materials, spanning the job types
// Setout's calculators cover (decking, framing, roofing, fencing, concrete, stairs, cladding).
// Used to pre-seed the shared price cache with real, web-search-confirmed prices in one batch, so
// common items already have a real price the first time they show up in anyone's quote instead of
// triggering an individual lookup.
export const COMMON_MATERIALS: { item: string; unit: string }[] = [
  // Timber — decking/framing
  { item: '140x45 H3 treated pine', unit: 'lineal metre' },
  { item: '190x45 H3 treated pine', unit: 'lineal metre' },
  { item: '90x90 H4 treated pine post', unit: 'each' },
  { item: '125x125 H4 treated pine post', unit: 'each' },
  { item: '90x22 treated pine decking board', unit: 'lineal metre' },
  { item: 'composite decking board', unit: 'lineal metre' },
  { item: 'MGP10 90x45 structural pine framing timber', unit: 'lineal metre' },
  { item: 'MGP10 70x35 structural pine framing timber', unit: 'lineal metre' },
  // Fencing
  { item: '150x12 treated pine fence paling', unit: 'each' },
  { item: 'timber fence rail 75x50', unit: 'lineal metre' },
  { item: 'gate hinge set', unit: 'each' },
  { item: 'gate latch', unit: 'each' },
  // Concrete
  { item: '20kg concrete premix bag', unit: 'bag' },
  { item: 'ready mix concrete', unit: 'm3' },
  { item: 'reinforcing mesh SL72', unit: 'sheet' },
  // Fixings
  { item: '65mm bugle head batten screws', unit: 'box' },
  { item: '90mm galvanised coach screws', unit: 'box' },
  { item: 'joist hanger bracket', unit: 'each' },
  { item: 'M12 galvanised coach bolt', unit: 'each' },
  // Roofing
  { item: 'colorbond corrugated roofing sheet', unit: 'lineal metre' },
  { item: 'colorbond ridge capping', unit: 'lineal metre' },
  { item: 'roofing screws', unit: 'box' },
  { item: 'quad gutter colorbond', unit: 'lineal metre' },
  { item: 'aluminium flashing', unit: 'lineal metre' },
  // Cladding/sheet goods
  { item: '10mm fibre cement sheet', unit: 'sheet' },
  { item: 'weatherboard cladding', unit: 'lineal metre' },
  { item: '10mm plasterboard sheet', unit: 'sheet' },
  // Stairs/balustrade
  { item: 'aluminium balustrade post', unit: 'each' },
  { item: 'timber handrail', unit: 'lineal metre' },
  // Insulation, sealants, finishing
  { item: 'R2.5 wall insulation batts', unit: 'm2' },
  { item: 'exterior silicone sealant', unit: 'each' },
  { item: 'expanding gap filler foam', unit: 'each' },
  { item: 'exterior paint 10L', unit: 'each' },
];
