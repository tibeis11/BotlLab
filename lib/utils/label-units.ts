// Constants for conversion
// 1 inch = 25.4 mm
// 96 DPI is the standard web screen resolution
const INCH_TO_MM = 25.4;
const WEB_DPI = 96; 

// Factors
const MM_TO_PX_FACTOR = WEB_DPI / INCH_TO_MM; // approx 3.7795
const PX_TO_MM_FACTOR = 1 / MM_TO_PX_FACTOR; // approx 0.2645

// Points (pt) are standard for fonts. 1 pt = 1/72 inch
const PT_TO_MM_FACTOR = INCH_TO_MM / 72; // approx 0.3527
const MM_TO_PT_FACTOR = 1 / PT_TO_MM_FACTOR; // approx 2.8346

/**
 * Converts Millimeters to CSS Pixels based on a scale factor (zoom).
 * Use this for rendering elements on the screen.
 */
export const mmToPx = (mm: number, scale: number = 1): number => {
  return mm * MM_TO_PX_FACTOR * scale;
};

/**
 * Converts CSS Pixels to Millimeters based on a scale factor (zoom).
 * Use this for handling drag events and saving back to the DB.
 */
export const pxToMm = (px: number, scale: number = 1): number => {
  return (px / scale) * PX_TO_MM_FACTOR;
};

/**
 * Converts Font Points (pt) to Millimeters.
 * Useful for PDF generation where some engines might expect mm.
 */
export const ptToMm = (pt: number): number => {
  return pt * PT_TO_MM_FACTOR;
};

/**
 * Converts Millimeters to Font Points (pt).
 * Useful for UI inputs where user expects size in 'pt' but we store everything in mm/pt logic.
 * Note: We usually store fontSize in 'pt' in the JSON, but this helps if we need conversion.
 */
export const mmToPt = (mm: number): number => {
  return mm * MM_TO_PT_FACTOR;
};

/**
 * Helper to get dimensions style object for React
 */
export const getElementStyle = (
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  rotation: number,
  zIndex: number,
  scale: number = 1
): React.CSSProperties => {
  return {
    position: 'absolute',
    left: `${mmToPx(x, scale)}px`,
    top: `${mmToPx(y, scale)}px`,
    width: `${mmToPx(width, scale)}px`,
    height: `${mmToPx(height, scale)}px`,
    transform: `rotate(${rotation}deg)`,
    zIndex: zIndex,
  };
};
