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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     onChange(parseInt(e.target.value));
  };

  // If not set, we visually show 5 (center) but grayed out
  const displayValue = isSet ? value : 5;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-bold text-white">{label}</label>
        <span className={`text-xs font-mono transition-colors ${isSet ? 'text-cyan-400' : 'text-zinc-600'}`}>
          {isSet ? `${value}/10` : '–'}
        </span>
      </div>
      {description && (
        <p className="text-xs text-zinc-500 mb-3">{description}</p>
      )}
      
      <div className="relative h-6 flex items-center group">
         {/* Custom Track Background */}
         <div className="absolute w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
             {isSet && (
                 <div 
                    className="h-full bg-cyan-900 transition-all duration-100 ease-out" 
                    style={{ width: `${((displayValue - 1) / 9) * 100}%` }}
                 />
             )}
         </div>

         {/* Native Range Input with custom styling */}
         <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={displayValue}
            onChange={handleChange}
            className={`
                w-full absolute opacity-0 z-20 cursor-pointer h-full
            `}
            // We use a custom thumb visualization because styling range inputs across browsers consistently is pain
            // But for now, let's stick to standard input if possible, or overlay simple div thumb
         />

         {/* Custom Thumb (Pseudo-element replacement) */}
         <div 
            className={`
                pointer-events-none absolute w-5 h-5 rounded-full shadow-md border-2 z-10 transition-all duration-200
                flex items-center justify-center
                ${isSet 
                    ? 'bg-cyan-500 border-cyan-300 scale-100' 
                    : 'bg-zinc-700 border-zinc-600 scale-75'
                }
            `}
            style={{ 
                left: `calc(${(displayValue - 1) * (100 / 9)}% - 10px)` // Adjust placement math slightly for center alignment 
                // Better approximation for range input thumb centering:
                // left: calc(val% + (8px - val * 0.15px)) ... messy.
                // Simplified:
                // const percent = ((displayValue - 1) / 9) * 100;
             }} 
         >
             {!isSet && <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />}
         </div>
      </div>

      <div className="flex justify-between px-1 mt-2">
        <span className={`text-[10px] uppercase font-bold tracking-wider ${isSet ? 'text-zinc-400' : 'text-zinc-700'}`}>{minLabel}</span>
        <span className={`text-[10px] uppercase font-bold tracking-wider ${isSet ? 'text-zinc-400' : 'text-zinc-700'}`}>{maxLabel}</span>
      </div>
    </div>
  );
}
