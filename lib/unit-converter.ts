/**
 * Unit conversion utilities between millimeters and CSS pixels.
 * Default DPI is 96 (CSS reference), can be overridden for high-DPI renderings.
 */

/** Converts millimeters to CSS pixels. */
export function mmToPx(mm: number, dpi = 96, scale = 1) {
  const inches = mm / 25.4;
  return inches * dpi * scale;
}

/** Converts CSS pixels to millimeters. */
export function pxToMm(px: number, dpi = 96, scale = 1) {
  const inches = px / (dpi * scale);
  return inches * 25.4;
}

/** Returns the number of CSS pixels per millimeter at the given DPI/scale. */
export function pixelsPerMm(dpi = 96, scale = 1) {
  return (dpi * scale) / 25.4;
}

export default {
  mmToPx,
  pxToMm,
  pixelsPerMm,
};
