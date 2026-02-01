import { mmToPx, pxToMm, pixelsPerMm } from '../unit-converter';

describe('UnitConverter', () => {
  describe('mmToPx', () => {
    it('should convert millimeters to pixels at 96 DPI', () => {
      expect(mmToPx(10)).toBeCloseTo(37.795, 3); // 10mm * 96/25.4 ≈ 37.795px
      expect(mmToPx(0)).toBe(0);
      expect(mmToPx(25.4)).toBeCloseTo(96, 0); // 1 inch = 96px at 96 DPI
    });

    it('should handle custom DPI', () => {
      expect(mmToPx(10, 72)).toBeCloseTo(28.346, 3); // 10mm * 72/25.4 ≈ 28.346px
    });

    it('should handle scale factor', () => {
      expect(mmToPx(10, 96, 2)).toBeCloseTo(75.59, 2); // 10mm * 96/25.4 * 2 ≈ 75.59px
    });
  });

  describe('pxToMm', () => {
    it('should convert pixels to millimeters at 96 DPI', () => {
      expect(pxToMm(37.795)).toBeCloseTo(10, 1); // 37.795px / (96/25.4) ≈ 10mm
      expect(pxToMm(0)).toBe(0);
      expect(pxToMm(96)).toBeCloseTo(25.4, 1); // 96px = 1 inch = 25.4mm
    });

    it('should handle custom DPI', () => {
      expect(pxToMm(28.346, 72)).toBeCloseTo(10, 1); // 28.346px / (72/25.4) ≈ 10mm
    });

    it('should handle scale factor', () => {
      expect(pxToMm(75.59, 96, 2)).toBeCloseTo(10, 1); // 75.59px / (96/25.4 * 2) ≈ 10mm
    });
  });

  describe('pixelsPerMm', () => {
    it('should calculate pixels per millimeter', () => {
      expect(pixelsPerMm()).toBeCloseTo(3.7795, 4); // 96 / 25.4 ≈ 3.7795
      expect(pixelsPerMm(72)).toBeCloseTo(2.8346, 4); // 72 / 25.4 ≈ 2.8346
      expect(pixelsPerMm(96, 2)).toBeCloseTo(7.559, 3); // (96 * 2) / 25.4 ≈ 7.559
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain precision in mm ↔ px conversions', () => {
      const originalMm = 15.5;
      const px = mmToPx(originalMm);
      const backToMm = pxToMm(px);
      expect(backToMm).toBeCloseTo(originalMm, 2);
    });
  });
});