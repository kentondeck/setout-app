export type CoastalZone = 'high' | 'medium' | 'none';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Simplified coastal reference points for AU and NZ.
// Accuracy: ±10–30km depending on density. Indicative only.
// Ordered roughly clockwise per region; NOT connected as polyline — haversine to nearest point.
const COASTAL_POINTS: Array<[number, number]> = [
  // --- AUSTRALIA ---
  // Western Australia — south
  [-34.4, 115.1], // Cape Leeuwin
  [-34.0, 115.4], // Gracetown
  [-33.6, 115.3], // Dunsborough
  [-33.3, 115.6], // Bunbury
  [-32.5, 115.8], // Mandurah
  [-31.9, 115.8], // Fremantle / Perth
  [-31.5, 115.7], // Scarborough
  [-31.0, 115.4], // Yanchep
  [-29.5, 115.0], // Jurien Bay
  [-28.8, 114.6], // Geraldton
  [-27.7, 114.2], // Kalbarri
  [-26.2, 113.8], // Shark Bay
  [-24.9, 113.7], // Carnarvon
  [-22.3, 114.1], // Exmouth
  [-21.5, 114.7], // Onslow
  [-20.7, 116.8], // Dampier
  [-20.3, 118.6], // Port Hedland
  [-19.0, 121.8], // Broome
  [-17.0, 122.2], // Derby
  [-15.5, 124.4], // Kimberley coast
  [-14.2, 126.6], // King Sound
  [-13.3, 129.0], // Joseph Bonaparte Gulf
  // Northern Territory
  [-12.5, 130.8], // Darwin
  [-11.4, 131.0], // Cox Peninsula
  [-11.9, 132.8], // Cobourg Peninsula
  // Gulf of Carpentaria
  [-11.7, 135.0], // Arnhem Land east
  [-12.3, 136.7], // Gulf NE
  [-13.5, 136.2], // Gulf east coast
  [-14.5, 135.8], // Gulf SE
  [-15.5, 135.5], // Gulf south
  [-15.9, 136.4], // Roper Bar coast
  [-15.2, 136.7], // Gulf mid
  [-14.0, 135.0], // Gulf NW
  [-13.0, 134.4], // Arnhem Land
  // Queensland
  [-10.7, 142.5], // Cape York
  [-13.8, 143.6], // Weipa area
  [-15.5, 145.2], // Cooktown
  [-16.9, 145.8], // Cairns
  [-17.5, 146.0], // Innisfail
  [-18.3, 146.2], // Tully coast
  [-19.3, 146.8], // Townsville
  [-19.8, 147.6], // Ayr
  [-20.0, 148.2], // Bowen
  [-21.1, 149.2], // Mackay
  [-22.4, 150.0], // Rockhampton coast
  [-23.8, 151.3], // Gladstone
  [-24.7, 152.2], // Bundaberg
  [-25.3, 152.7], // Hervey Bay
  [-25.9, 153.0], // Noosa
  [-26.7, 153.1], // Sunshine Coast / Maroochydore
  [-27.5, 153.0], // Brisbane / Redcliffe
  [-27.7, 153.4], // Gold Coast / Surfers
  [-28.2, 153.5], // Tweed Heads
  // New South Wales
  [-29.4, 153.4], // Byron Bay
  [-30.3, 153.1], // Coffs Harbour
  [-30.9, 153.0], // Grafton coast
  [-31.5, 152.9], // Port Macquarie
  [-32.2, 152.5], // Forster
  [-32.7, 152.2], // Newcastle south
  [-32.9, 151.8], // Newcastle
  [-33.1, 151.5], // Gosford
  [-33.4, 151.3], // Terrigal
  [-33.8, 151.3], // Manly / Northern Beaches
  [-33.9, 151.3], // Bondi
  [-33.9, 151.2], // Sydney CBD / Darling Harbour
  [-34.0, 151.1], // Cronulla
  [-34.4, 150.9], // Wollongong
  [-34.9, 150.7], // Nowra coast
  [-35.7, 150.2], // Batemans Bay
  [-36.2, 150.1], // Narooma
  [-36.9, 149.9], // Merimbula
  [-37.5, 149.8], // Mallacoota
  // Victoria
  [-38.7, 146.4], // Wilsons Promontory
  [-38.5, 145.5], // Phillip Island
  [-38.3, 145.1], // Frankston
  [-37.9, 145.0], // Brighton / Melbourne bay
  [-37.8, 144.9], // Melbourne / Williamstown
  [-38.2, 144.4], // Geelong
  [-38.7, 143.7], // Lorne / Great Ocean Rd
  [-38.7, 143.2], // Apollo Bay
  [-38.9, 143.5], // Cape Otway
  [-38.4, 142.5], // Warrnambool
  [-38.3, 141.6], // Portland
  // South Australia
  [-37.4, 140.3], // Mount Gambier coast
  [-35.7, 138.5], // Cape Jervis / Fleurieu
  [-35.1, 138.5], // Adelaide (Gulf St Vincent)
  [-34.7, 138.7], // Glenelg / Brighton SA
  [-34.0, 138.0], // Port Wakefield area
  [-33.7, 137.7], // Ardrossan
  [-33.3, 137.6], // Port Pirie
  [-32.8, 137.2], // Port Augusta head
  [-33.0, 136.5], // Whyalla
  [-33.5, 135.0], // Port Lincoln
  [-34.5, 135.3], // Port Lincoln south tip
  [-32.1, 133.7], // Ceduna
  [-31.6, 130.5], // Nullarbor coast
  // WA south coast
  [-33.8, 121.9], // Esperance
  [-34.4, 119.0], // Bremer Bay
  [-35.0, 117.9], // Albany
  [-34.4, 115.1], // Cape Leeuwin (close loop)

  // --- NEW ZEALAND ---
  // North Island — clockwise from north
  [-34.5, 172.8], // Kaitaia coast
  [-35.1, 173.3], // Whangarei heads
  [-35.7, 174.5], // Whangarei coast
  [-36.4, 174.7], // Auckland west (Waitakere)
  [-36.8, 174.8], // Auckland city
  [-36.8, 175.0], // Howick / Beachlands
  [-37.0, 175.8], // Thames / Coromandel
  [-37.5, 175.9], // Whitianga
  [-37.7, 176.2], // Tauranga
  [-37.8, 176.9], // Whakatane
  [-38.0, 177.4], // Opotiki
  [-38.6, 177.9], // Gisborne
  [-39.5, 176.9], // Napier
  [-39.7, 176.7], // Hastings coast
  [-40.4, 175.4], // Palmerston North / Foxton Beach
  [-40.6, 175.2], // Levin coast
  [-41.2, 174.9], // Wellington
  [-41.4, 174.8], // Lower Hutt coast
  [-41.2, 174.1], // Nelson coast east
  [-41.3, 173.3], // Nelson
  // South Island — clockwise from Nelson
  [-41.8, 171.5], // Westport area
  [-42.5, 171.2], // Greymouth
  [-43.0, 170.6], // Hokitika
  [-43.7, 169.5], // Haast
  [-44.7, 167.9], // Milford Sound
  [-46.1, 166.9], // Fiordland south
  [-46.4, 168.4], // Invercargill / Bluff
  [-46.2, 169.5], // The Catlins
  [-45.9, 170.5], // Dunedin
  [-45.1, 170.9], // Oamaru
  [-44.4, 171.3], // Timaru
  [-43.9, 172.0], // Ashburton coast
  [-43.5, 172.7], // Christchurch / New Brighton
  [-43.2, 173.0], // Kaikoura area south
  [-42.4, 173.7], // Kaikoura
  [-41.8, 174.0], // Picton area
  [-41.3, 173.9], // Marlborough Sounds
  [-41.3, 173.3], // Nelson (close loop)
];

export function detectCoastalZone(lat: number, lng: number): CoastalZone {
  let minDist = Infinity;
  for (const [clat, clng] of COASTAL_POINTS) {
    const d = haversineKm(lat, lng, clat, clng);
    if (d < minDist) minDist = d;
    if (minDist < 1) break; // early exit
  }
  if (minDist < 5) return 'high';
  if (minDist < 30) return 'medium';
  return 'none';
}
