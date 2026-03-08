'use client';

import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// UniversalSlider — Unified slider primitive (Phase 5.4)
//
// Replaces both FlavorGameSlider (BTB, 0–1 scale) and TasteSlider (ratings, 1–10)
// with a single consistent implementation.
//
// Features:
// - Custom track + thumb (no browser-default appearance)
// - Correct thumb positioning (no clip at edges)
// - isSet / touched visual state (grey when untouched)
// - Configurable color, labels, and scale
// ─────────────────────────────────────────────────────────────────────────────

interface UniversalSliderProps {
  /** Current value (undefined = not yet set) */
  value: number | undefined;
  /** Called with new value on change */
  onChange: (value: number) => void;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 1) */
  max?: number;
  /** Step size (default: 0.01) */
  step?: number;
  /** Hex color for the active track and thumb (default: brand via CSS) */
  color?: string;
  /** Label for the minimum end of the scale */
  minLabel?: string;
  /** Label for the maximum end of the scale */
  maxLabel?: string;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Display format for the current value (receives value, returns string) */
  formatValue?: (value: number) => string;
}

export default function UniversalSlider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  color,
  minLabel,
  maxLabel,
  disabled,
  formatValue,
}: UniversalSliderProps) {
  const isSet = value !== undefined;
  const displayValue = value ?? (min + max) / 2;
  const percent = ((displayValue - min) / (max - min)) * 100;

  const activeColor = isSet
    ? (color ?? 'var(--color-brand)')
    : 'rgba(161,161,170,0.4)';

  const displayText = isSet
    ? (formatValue ? formatValue(displayValue) : `${Math.round(percent)}%`)
    : '—';

  return (
    <div className="space-y-1">
      <div className="relative h-8 flex items-center">
        {/* Track background */}
        <div className="absolute w-full h-2 bg-surface-hover rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${percent}%`,
              backgroundColor: activeColor,
              opacity: 0.6,
            }}
          />
        </div>

        {/* Native range input (invisible, drives interaction) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-full absolute z-10 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {/* Custom thumb — uses calc to avoid clipping at 0% and 100%:
            At 0% → left: 0px, at 100% → left: calc(100% - 20px) */}
        <div
          className={`
            pointer-events-none absolute w-5 h-5 rounded-full shadow-md border-2 z-[5] transition-all duration-75
            flex items-center justify-center
            ${!isSet ? 'scale-75' : ''}
          `}
          style={{
            left: `calc(${percent}% - ${percent * 0.2}px)`,
            backgroundColor: activeColor,
            borderColor: isSet ? 'rgba(255,255,255,0.3)' : 'var(--color-border)',
          }}
        >
          {!isSet && <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />}
        </div>
      </div>

      {/* Min/Max labels */}
      {(minLabel || maxLabel) && (
        <div className="flex justify-between px-0.5">
          <span className={`text-[9px] uppercase font-bold tracking-wider ${isSet ? 'text-text-secondary' : 'text-text-disabled'}`}>
            {minLabel}
          </span>
          <span className={`text-[9px] uppercase font-bold tracking-wider ${isSet ? 'text-text-secondary' : 'text-text-disabled'}`}>
            {maxLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// Convenience: expose display text + isSet logic for parent components
export function useSliderDisplay(
  value: number | undefined,
  min: number,
  max: number,
  formatValue?: (value: number) => string,
) {
  const isSet = value !== undefined;
  const displayValue = value ?? (min + max) / 2;
  const percent = ((displayValue - min) / (max - min)) * 100;
  const displayText = isSet
    ? (formatValue ? formatValue(displayValue) : `${Math.round(percent)}%`)
    : '—';
  return { isSet, displayValue, percent, displayText };
}
