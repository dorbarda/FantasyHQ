/**
 * Contrast helpers.
 *
 * Team and owner identity colours are fixed brand values (the Spurs' primary
 * really is #000000), so they can't follow the theme. Where they're used as a
 * background we pick the text colour that reads on them; where they'd be used
 * as text on a themed surface, prefer a token instead.
 */

function channelLuminance(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance (WCAG) of a #rrggbb colour. */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length !== 6) return 0.5;
  const [r, g, b] = [0, 2, 4].map(i => channelLuminance(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)];
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Best foreground (near-white or near-black) for text sitting on `background`.
 * Used for initials inside team/owner colour chips.
 */
export function bestTextOn(background: string): string {
  const white = '#FFFFFF';
  const ink = '#0F172A';
  return contrastRatio(white, background) >= contrastRatio(ink, background) ? white : ink;
}
