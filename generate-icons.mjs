import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="68%">
      <stop offset="0%" stop-color="#faf7f3"/>
      <stop offset="100%" stop-color="#e4dbd0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)"/>

  <!-- Helmet dome (semi-ellipse) -->
  <path d="M 188 624 A 324 410 0 0 1 836 624 Z" fill="#FF5A1F"/>

  <!-- Left half of dome slightly darker for 3D ridge effect -->
  <path d="M 512 214 A 324 410 0 0 0 188 624 L 512 624 Z" fill="#E84E18"/>

  <!-- Center ridge line -->
  <rect x="509" y="214" width="6" height="410" fill="#C94015"/>

  <!-- Thin cream gap between dome and brim -->
  <rect x="183" y="619" width="658" height="11" fill="#faf7f3"/>

  <!-- Brim -->
  <rect x="148" y="630" width="728" height="76" rx="38" fill="#FF5A1F"/>
</svg>`;

const buf = Buffer.from(svg);

await sharp(buf).resize(512, 512).png().toFile('public/icon-512.png');
console.log('✓ icon-512.png');

await sharp(buf).resize(192, 192).png().toFile('public/icon-192.png');
console.log('✓ icon-192.png');

await sharp(buf).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('✓ apple-touch-icon.png');

console.log('Done.');
