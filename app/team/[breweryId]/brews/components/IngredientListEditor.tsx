import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

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
                <label className="text-xs font-bold text-text-muted uppercase ml-1 block">{label}</label>
            </div>
            
            <div className="space-y-2 bg-surface border border-border rounded-xl p-3">
                {items.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-sm text-text-disabled mb-2">Keine Zutaten eingetragen.</p>
                        <button onClick={addRow} className="text-xs font-bold bg-surface-hover hover:bg-surface-hover text-text-secondary px-3 py-1.5 rounded-lg transition">
                            + Erste Zutat hinzufügen
                        </button>
                    </div>
                )}
                
                {items.length > 0 && (
                    <div className="grid grid-cols-[80px_70px_1fr_30px] gap-2 mb-2 text-[10px] uppercase font-bold text-text-disabled px-1">
                        <div>Menge</div>
                        <div>Einh.</div>
                        <div>Name</div>
                        <div></div>
                    </div>
                )}

                {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[80px_70px_1fr_30px] gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                        <input 
                            type="text"
                            inputMode="decimal"
                            className="w-full bg-background border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:border-brand outline-none text-right placeholder:text-text-disabled"
                            placeholder="0"
                            value={item.amount}
                            onChange={(e) => updateRow(idx, 'amount', e.target.value.replace(',', '.'))}
                        />
                        <div className="relative">
                             <input 
                                className="w-full bg-background border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:border-brand outline-none placeholder:text-text-disabled"
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
                            className="w-full bg-background border border-border rounded-lg px-2 py-2 text-sm text-text-primary focus:border-brand outline-none placeholder:text-text-disabled"
                            placeholder="Zutat..."
                            value={item.name}
                            onChange={(e) => updateRow(idx, 'name', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            autoFocus={item.name === '' && idx === items.length - 1}
                        />
                        <button 
                            onClick={() => removeRow(idx)}
                            className="text-text-disabled hover:text-error transition flex justify-center w-8"
                            title="Entfernen"
                            tabIndex={-1}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}

                {items.length > 0 && (
                     <button onClick={addRow} className="w-full py-2 mt-2 flex items-center justify-center gap-2 text-xs font-bold text-text-muted hover:text-brand hover:bg-surface-hover/50 rounded-lg border border-dashed border-border hover:border-brand/30 transition-all">
                        <span>+ Weitere Zeile</span>
                    </button>
                )}
            </div>
        </div>
    );
}
