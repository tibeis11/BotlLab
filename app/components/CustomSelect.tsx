import { useState, useEffect, useRef } from 'react';

interface Option {
    value: string;
    label: string;
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
}

export default function CustomSelect({ value, onChange, options, placeholder = 'Bitte wählen', className = '', icon, placement = 'bottom' }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

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

    return (
        <div className={`relative ${className} ${isOpen ? 'z-50' : 'z-0'}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-black border border-zinc-800 rounded-lg py-2.5 pl-3 pr-10 text-left text-sm text-white focus:border-zinc-500 outline-none transition-all cursor-pointer flex items-center gap-2"
            >
                {icon}
                <div className={`flex items-center gap-2 truncate ${!selectedOption ? 'text-zinc-500' : ''}`}>
                    {selectedOption ? (
                        <>
                           {selectedOption.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
                           <span className="truncate">{selectedOption.label}</span>
                        </>
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-zinc-500">
                     <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </button>

            {isOpen && (
                <div className={`absolute z-50 w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-100 ${
                    placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-1'
                }`}>
                    <div className="p-1 space-y-0.5">
                        {ungrouped.map((opt) => (
                             <button
                                type="button"
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition ${
                                    value === opt.value 
                                        ? 'bg-zinc-800 text-white' 
                                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                                }`}
                            >
                                {opt.icon && <span>{opt.icon}</span>}
                                {opt.label}
                                {value === opt.value && <span className="ml-auto text-white">✓</span>}
                            </button>
                        ))}

                        {Object.entries(groups).map(([groupName, groupOptions]) => (
                            <div key={groupName} className="mt-2">
                                <div className="px-3 py-1 text-[10px] uppercase font-black text-zinc-600 tracking-widest">{groupName}</div>
                                {groupOptions.map((opt) => (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${
                                            value === opt.value 
                                                ? 'bg-cyan-500/10 text-cyan-400' 
                                                : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                                        }`}
                                    >
                                        {opt.icon && <span>{opt.icon}</span>}
                                        {opt.label}
                                        {value === opt.value && <span className="ml-auto text-cyan-500">✓</span>}
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
