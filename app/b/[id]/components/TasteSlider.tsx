'use client';

import UniversalSlider from './UniversalSlider';

interface TasteSliderProps {
  id: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  value: number | undefined | null;
  onChange: (value: number) => void;
  description?: string;
}

export default function TasteSlider({
  id,
  label,
  minLabel,
  maxLabel,
  value,
  onChange,
  description,
}: TasteSliderProps) {
  const isSet = value !== undefined && value !== null;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={id} className="text-sm font-bold text-text-primary">{label}</label>
        <span className={`text-xs font-mono transition-colors ${isSet ? 'text-brand' : 'text-text-disabled'}`}>
          {isSet ? `${value}/10` : '–'}
        </span>
      </div>
      {description && (
        <p className="text-xs text-text-muted mb-3">{description}</p>
      )}

      <UniversalSlider
        value={isSet ? value : undefined}
        onChange={(v) => onChange(Math.round(v))}
        min={1}
        max={10}
        step={1}
        minLabel={minLabel}
        maxLabel={maxLabel}
      />
    </div>
  );
}
