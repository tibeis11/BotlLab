import { useState, useEffect, useRef } from 'react';

interface Option {
    value: string;
    label: string | React.ReactNode;
    icon?: React.ReactNode;
    group?: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    icon?: React.ReactNode;
    placement?: 'bottom' | 'top';
    variant?: 'surface' | 'background';
    size?: 'sm' | 'md' | 'lg'; // sm=compact rows, md=filter bar (default), lg=form fields (h-12)
}

export default function CustomSelect({ value, onChange, options, placeholder = 'Bitte wählen', className = '', icon, placement = 'bottom', variant = 'background', size = 'md' }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [calculatedPlacement, setCalculatedPlacement] = useState(placement);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        if (!isOpen) return;
        
        // Auto-detect direction
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // Assume dropdown max height is around 250px
            if (spaceBelow < 250 && spaceAbove > 250) {
                setCalculatedPlacement('top');
            } else {
                setCalculatedPlacement(placement);
            }
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, placement]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    // Group options if needed
    const groups: { [key: string]: Option[] } = {};
    const ungrouped: Option[] = [];

    options.forEach(opt => {
        if (opt.group) {
            if (!groups[opt.group]) groups[opt.group] = [];
            groups[opt.group].push(opt);
        } else {
            ungrouped.push(opt);
        }
    });

    const bgClass = variant === 'surface' ? 'bg-surface border-border' : 'bg-background border-border';
    const sizeClass =
        size === 'sm' ? 'py-2 px-2 text-xs' :
        size === 'lg' ? 'py-[14px] px-4 text-sm font-medium' :
        'py-[10px] px-3 text-xs font-semibold'; // md

    return (
        <div className={`relative ${className} ${isOpen ? 'z-50' : 'z-0'}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full ${bgClass} border rounded-xl ${sizeClass} text-left text-text-primary focus:border-brand-dim outline-none transition-all cursor-pointer flex items-center justify-between gap-2`}
            >
                <div className={`flex items-center gap-2 truncate ${!selectedOption && !value ? 'text-text-disabled' : ''} flex-1`}>
                    {icon}
                    {selectedOption ? (
                        <>
                           {selectedOption.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
                           <span className="truncate">{selectedOption.label}</span>
                        </>
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </div>
                <div className="flex items-center pointer-events-none text-text-disabled shrink-0 ml-1">
                     <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </button>

            {isOpen && (
                <div className={`absolute left-0 z-[60] min-w-full w-max bg-surface border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-100 ${
                    calculatedPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                }`}>
                    <div className="p-1 space-y-0.5">
                        {ungrouped.map((opt) => (
                             <button
                                type="button"
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition ${
                                    value === opt.value 
                                        ? 'bg-surface-hover text-text-primary font-medium' 
                                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                                }`}
                            >
                                {opt.icon && <span>{opt.icon}</span>}
                                {opt.label}
                                {value === opt.value && <span className="ml-auto text-brand">✓</span>}
                            </button>
                        ))}

                        {Object.entries(groups).map(([groupName, groupOptions]) => (
                            <div key={groupName} className="mt-2">
                                <div className="px-3 py-1 text-[10px] uppercase font-black text-text-disabled tracking-widest">{groupName}</div>
                                {groupOptions.map((opt) => (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${
                                            value === opt.value 
                                                ? 'bg-brand-bg text-brand' 
                                                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                                        }`}
                                    >
                                        {opt.icon && <span>{opt.icon}</span>}
                                        {opt.label}
                                        {value === opt.value && <span className="ml-auto text-brand">✓</span>}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
