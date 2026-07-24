// A representative set of common AU/NZ residential construction materials. Used to pre-seed the
// price memory with real, web-search-confirmed prices in one batch, so common items already have
// a real price the first time they show up in a quote instead of triggering an individual lookup.
export const COMMON_MATERIALS: { item: string; unit: string }[] = [
  { item: '140x45 H3 treated pine', unit: 'lineal metre' },
  { item: '90x90 H4 treated pine post', unit: 'each' },
  { item: '125x125 H4 treated pine post', unit: 'each' },
  { item: '90x22 treated pine decking board', unit: 'lineal metre' },
  { item: '150x12 treated pine fence paling', unit: 'each' },
  { item: 'MGP10 90x45 structural pine framing timber', unit: 'lineal metre' },
  { item: '20kg concrete premix bag', unit: 'bag' },
  { item: '65mm bugle head batten screws', unit: 'box' },
  { item: '90mm galvanised coach screws', unit: 'box' },
  { item: 'joist hanger bracket', unit: 'each' },
  { item: 'M12 galvanised coach bolt', unit: 'each' },
  { item: 'colorbond corrugated roofing sheet', unit: 'lineal metre' },
  { item: 'quad gutter colorbond', unit: 'lineal metre' },
  { item: '10mm fibre cement sheet', unit: 'sheet' },
  { item: '10mm plasterboard sheet', unit: 'sheet' },
  { item: 'R2.5 wall insulation batts', unit: 'm2' },
  { item: 'aluminium flashing', unit: 'lineal metre' },
  { item: 'exterior silicone sealant', unit: 'each' },
  { item: 'expanding gap filler foam', unit: 'each' },
  { item: 'exterior paint 10L', unit: 'each' },
];
