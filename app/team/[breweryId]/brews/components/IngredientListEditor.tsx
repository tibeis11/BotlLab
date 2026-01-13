import { useState, useEffect } from 'react';

export interface Ingredient {
    name: string;
    amount: string;
    unit: string;
}

interface IngredientListEditorProps {
    label: string;
    value: string | Ingredient[] | undefined;
    onChange: (value: Ingredient[]) => void;
}

const UNITS = ['g', 'kg', 'oz', 'lbs', 'ml', 'l', 'Stk', 'Pkt', '%'];

export function IngredientListEditor({ label, value, onChange }: IngredientListEditorProps) {
    const [items, setItems] = useState<Ingredient[]>([]);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (initialized) return; // Only convert once on mount to avoid overwriting edits if parent re-renders
        
        if (Array.isArray(value)) {
            setItems(value);
        } else if (typeof value === 'string' && value.trim() !== '') {
            // Naive migration: Split by comma
            const parts = value.split(',').map(s => s.trim()).filter(Boolean);
            const migrated = parts.map(p => ({ name: p, amount: '', unit: '' }));
            setItems(migrated);
            // We don't call onChange here to avoid auto-saving migrated data without user action, 
            // but the user sees it and can save.
        }
        setInitialized(true);
    }, [value, initialized]);

    const handleChange = (newItems: Ingredient[]) => {
        setItems(newItems);
        onChange(newItems);
    };

    const addRow = () => {
        handleChange([...items, { name: '', amount: '', unit: 'g' }]);
    };

    const updateRow = (index: number, field: keyof Ingredient, val: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        handleChange(newItems);
    };

    const removeRow = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        handleChange(newItems);
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter' && index === items.length - 1) {
            e.preventDefault();
            addRow();
        }
    };

    return (
        <div className="space-y-2">
             <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 block">{label}</label>
            </div>
            
            <div className="space-y-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                {items.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-sm text-zinc-600 mb-2">Keine Zutaten eingetragen.</p>
                        <button onClick={addRow} className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition">
                            + Erste Zutat hinzufügen
                        </button>
                    </div>
                )}
                
                {items.length > 0 && (
                    <div className="grid grid-cols-[80px_70px_1fr_30px] gap-2 mb-2 text-[10px] uppercase font-bold text-zinc-600 px-1">
                        <div>Menge</div>
                        <div>Einh.</div>
                        <div>Name</div>
                        <div></div>
                    </div>
                )}

                {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[80px_70px_1fr_30px] gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                        <input 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none text-right placeholder:text-zinc-700"
                            placeholder="0"
                            value={item.amount}
                            onChange={(e) => updateRow(idx, 'amount', e.target.value)}
                        />
                        <div className="relative">
                             <input 
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none placeholder:text-zinc-700"
                                placeholder="g"
                                value={item.unit}
                                list={`units-${label.replace(/\s/g, '')}-${idx}`}
                                onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                            />
                            <datalist id={`units-${label.replace(/\s/g, '')}-${idx}`}>
                                {UNITS.map(u => <option key={u} value={u} />)}
                            </datalist>
                        </div>
                        <input 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none placeholder:text-zinc-700"
                            placeholder="Zutat..."
                            value={item.name}
                            onChange={(e) => updateRow(idx, 'name', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            autoFocus={item.name === '' && idx === items.length - 1}
                        />
                        <button onClick={() => removeRow(idx)} className="flex items-center justify-center w-8 h-8 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" tabIndex={-1}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                ))}

                {items.length > 0 && (
                     <button onClick={addRow} className="w-full py-2 mt-2 flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-800 hover:border-cyan-500/30 transition-all">
                        <span>+ Weitere Zeile</span>
                    </button>
                )}
            </div>
        </div>
    );
}
