import { useState, useEffect } from 'react';

export interface Malt {
    name: string;
    amount: string;
    unit: string;
    color_ebc?: string;
}

interface MaltListEditorProps {
    value: Malt[] | undefined;
    onChange: (value: Malt[]) => void;
}

export function MaltListEditor({ value, onChange }: MaltListEditorProps) {
    const [items, setItems] = useState<Malt[]>([]);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (initialized) return;
        
        if (Array.isArray(value)) {
            setItems(value);
        }
        setInitialized(true);
    }, [value, initialized]);

    const handleChange = (newItems: Malt[]) => {
        setItems(newItems);
        onChange(newItems);
    };

    const addRow = () => {
        handleChange([...items, { name: '', amount: '', unit: 'kg', color_ebc: '' }]);
    };

    const updateRow = (index: number, field: keyof Malt, val: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        handleChange(newItems);
    };

    const removeRow = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        handleChange(newItems);
    };

    return (
        <div>
             <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 block">Malz / Fermentables</label>
            </div>
            
            <div className="space-y-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                {items.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-sm text-zinc-600 mb-2">Kein Malz eingetragen.</p>
                        <button onClick={addRow} className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition">
                            + Malz hinzufügen
                        </button>
                    </div>
                )}
                
                {items.length > 0 && (
                    <div className="grid grid-cols-[70px_60px_1fr_60px_30px] gap-2 mb-2 text-[10px] uppercase font-bold text-zinc-600">
                        <div>Menge</div>
                        <div>Einh.</div>
                        <div>Name / Sorte</div>
                        <div title="Farbe in EBC">EBC</div>
                        <div></div>
                    </div>
                )}

                {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[70px_60px_1fr_60px_30px] gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                        <input 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none text-right placeholder:text-zinc-700"
                            placeholder="0"
                            value={item.amount}
                            onChange={(e) => updateRow(idx, 'amount', e.target.value)}
                        />
                         <input 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none placeholder:text-zinc-700"
                            placeholder="kg"
                            value={item.unit}
                            onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                        />
                        <input 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none placeholder:text-zinc-700"
                            placeholder="Name (z.B. Pilsner Malz)"
                            value={item.name}
                            onChange={(e) => updateRow(idx, 'name', e.target.value)}
                        />
                         <input 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none text-right placeholder:text-zinc-700"
                            placeholder="-"
                            value={item.color_ebc || ''}
                            onChange={(e) => updateRow(idx, 'color_ebc', e.target.value)}
                        />
                        <button 
                            onClick={() => removeRow(idx)}
                            className="text-zinc-600 hover:text-red-400 transition flex justify-center"
                            title="Entfernen"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    </div>
                ))}
                
                 {items.length > 0 && (
                    <button onClick={addRow} className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition border border-dashed border-zinc-800 mt-2">
                        + Weiteres Malz hinzufügen
                    </button>
                )}
            </div>
        </div>
    );
}
