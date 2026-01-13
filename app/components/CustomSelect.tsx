import { useState, useEffect, useRef } from 'react';

interface Option {
    value: string;
    label: string;
    icon?: string;
    group?: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    icon?: React.ReactNode;
}

export default function CustomSelect({ value, onChange, options, placeholder = 'Bitte wählen', className = '', icon }: CustomSelectProps) {
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
                className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl py-3 pl-4 pr-10 text-left text-sm font-bold text-white focus:border-cyan-500 outline-none transition-all cursor-pointer flex items-center gap-2"
            >
                {icon}
                <span className={!selectedOption ? 'text-zinc-500' : ''}>
                    {selectedOption ? (selectedOption.icon ? `${selectedOption.icon} ${selectedOption.label}` : selectedOption.label) : placeholder}
                </span>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-zinc-500">
                     <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1 space-y-0.5">
                        {ungrouped.map((opt) => (
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
