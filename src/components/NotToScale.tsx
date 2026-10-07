// Small italic "not to scale" label for the bottom-right corner of a diagram.
// Sized off the SVG's viewBox width so it renders at a consistent on-screen
// size regardless of each diagram's coordinate system (they all render at
// width:100%). Drop it in just before a diagram's closing </svg>.
export function NotToScale({ w, h }: { w: number; h: number }) {
  const fs = Math.max(7, Math.round(w / 38));
  return (
    <text
      x={w - fs * 0.4}
      y={h - fs * 0.4}
      textAnchor="end"
      fontSize={fs}
      fontStyle="italic"
      fill="#b3b3b3"
      style={{ letterSpacing: '0.3px', userSelect: 'none', pointerEvents: 'none' }}
    >
      not to scale
    </text>
  );
}
