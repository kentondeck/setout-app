// An SVG rasterised through <img> can't see the page's @font-face rules, so a
// saved diagram PNG silently falls back to a system font. Inlining the faces
// into the SVG itself keeps exports on-brand. Loaded lazily — the base64 font
// data only downloads the first time someone saves a diagram.
let cssPromise: Promise<string> | null = null;

function face(family: string, weight: number, dataUri: string) {
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url(${dataUri}) format('woff2');}`;
}

function loadFontCss(): Promise<string> {
  cssPromise ??= Promise.all([
    import('@fontsource/inter/files/inter-latin-400-normal.woff2?inline'),
    import('@fontsource/inter/files/inter-latin-500-normal.woff2?inline'),
    import('@fontsource/inter/files/inter-latin-600-normal.woff2?inline'),
    import('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?inline'),
  ]).then(([i400, i500, i600, mono400]) =>
    [
      face('Inter', 400, i400.default),
      face('Inter', 500, i500.default),
      face('Inter', 600, i600.default),
      face('JetBrains Mono', 400, mono400.default),
    ].join(''),
  );
  return cssPromise;
}

export async function embedSvgFonts(svg: SVGSVGElement): Promise<void> {
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = await loadFontCss();
  svg.insertBefore(style, svg.firstChild);
}
