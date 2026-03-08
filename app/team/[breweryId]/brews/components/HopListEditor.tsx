import { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Clock, Percent, List } from 'lucide-react';
import CustomSelect from '@/app/components/CustomSelect';

export interface Hop {
    name: string;
    amount: string;
    unit: string;
    alpha?: string;
    time?: string;
    usage?: string; // Boil, Dry Hop, Mash, First Wort, Whirlpool
    form?: string;  // Pellet, Leaf, Plug
}

interface HopListEditorProps {
    value: Hop[] | undefined;
    onChange: (value: Hop[]) => void;
}

const USAGE_OPTIONS = [
    { value: 'Boil', label: 'Kochen (Boil)' },
    { value: 'Dry Hop', label: 'Stopfen (Dry Hop)' },
    { value: 'Whirlpool', label: 'Whirlpool' },
    { value: 'Mash', label: 'Maischen (Mash)' },
    { value: 'First Wort', label: 'Vorderwürze' }
];

const FORM_OPTIONS = [
    { value: 'Pellet', label: 'Pellet' },
    { value: 'Leaf', label: 'Dolden' },
    { value: 'Plug', label: 'Plug' },
];

export function HopListEditor({ value, onChange }: HopListEditorProps) {
    const [items, setItems] = useState<Hop[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Lock Body Scroll when Modal is Open
    useEffect(() => {
        if (editingIndex !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
             document.body.style.overflow = 'unset';
        };
    }, [editingIndex]);

    useEffect(() => {
        if (initialized) return;
        
        if (Array.isArray(value)) {
            setItems(value);
        }
        setInitialized(true);
    }, [value, initialized]);

    const handleChange = (newItems: Hop[]) => {
        setItems(newItems);
        onChange(newItems);
    };

    const addRow = () => {
        const newItem = { name: '', amount: '', unit: 'g', alpha: '', time: '', usage: 'Boil' };
        const newItems = [...items, newItem];
        handleChange(newItems);
        // On mobile, immediately open modal for the new item. 
        // We can check screen width or just assume if they clicked the mobile add button (which we will add)
        // But for now, let's just use the index.
    };

    const addRowMobile = () => {
        const newItem = { name: '', amount: '', unit: 'g', alpha: '', time: '', usage: 'Boil' };
        const newItems = [...items, newItem];
        setItems(newItems);
        onChange(newItems);
        setEditingIndex(newItems.length - 1); // Open editor immediately
    };

    const updateRow = (index: number, field: keyof Hop, val: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        handleChange(newItems);
    };

    const removeRow = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        handleChange(newItems);
        if (editingIndex === index) setEditingIndex(null);
    };

    return (
        <div>
             <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-bold text-text-muted uppercase ml-1 block">Hopfen</label>
            </div>
            
            {/* Mobile Modal for Editing */}
            {editingIndex !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b border-border bg-surface shrink-0">
                            <h3 className="font-bold text-text-primary flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                                    <List size={16} />
                                </span>
                                Hopfen bearbeiten
                            </h3>
                            <button onClick={() => setEditingIndex(null)} className="text-text-secondary hover:text-text-primary bg-surface-hover p-2 rounded-full">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="p-4 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-text-muted">Menge</label>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            inputMode="decimal"
                                            className="w-full bg-background border border-border rounded-xl pl-3 pr-3 py-3 text-text-primary focus:border-green-500 outline-none placeholder:text-text-disabled"
                                            placeholder="0"
                                            value={items[editingIndex].amount}
                                            onChange={(e) => updateRow(editingIndex, 'amount', e.target.value.replace(',', '.'))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-text-muted">Einheit</label>
                                    <input 
                                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-text-primary focus:border-green-500 outline-none placeholder:text-text-disabled"
                                        placeholder="g"
                                        value={items[editingIndex].unit}
                                        onChange={(e) => updateRow(editingIndex, 'unit', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-text-muted">Sorte / Name</label>
                                <input 
                                    className="w-full bg-background border border-border rounded-xl px-3 py-3 text-text-primary focus:border-green-500 outline-none placeholder:text-text-disabled"
                                    placeholder="z.B. Citra"
                                    value={items[editingIndex].name}
                                    onChange={(e) => updateRow(editingIndex, 'name', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-text-muted flex items-center gap-1">
                                        <Percent size={12}/> Alpha
                                    </label>
                                    <input 
                                        type="text"
                                        inputMode="decimal"
                                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-text-primary focus:border-green-500 outline-none placeholder:text-text-disabled"
                                        placeholder="%"
                                        value={items[editingIndex].alpha || ''}
                                        onChange={(e) => updateRow(editingIndex, 'alpha', e.target.value.replace(',', '.'))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-text-muted flex items-center gap-1">
                                        <Clock size={12}/> Zeit (min)
                                    </label>
                                    <input                                         type="number"
                                        inputMode="numeric"                                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-text-primary focus:border-green-500 outline-none placeholder:text-text-disabled"
                                        placeholder="Min"
                                        value={items[editingIndex].time || ''}
                                        onChange={(e) => updateRow(editingIndex, 'time', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-text-muted">Verwendung</label>
                                <CustomSelect 
                                    value={items[editingIndex].usage || 'Boil'}
                                    onChange={(val) => updateRow(editingIndex, 'usage', val)}
                                    options={USAGE_OPTIONS}
                                    placement="top"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-text-muted">Form</label>
                                <CustomSelect 
                                    value={items[editingIndex].form || 'Pellet'}
                                    onChange={(val) => updateRow(editingIndex, 'form', val)}
                                    options={FORM_OPTIONS}
                                    placement="top"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-surface shrink-0 flex gap-3">
                             <button 
                                onClick={() => { removeRow(editingIndex); setEditingIndex(null); }} 
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2"
                            > 
                                <Trash2 size={16}/> Löschen 
                            </button>
                            <button 
                                onClick={() => setEditingIndex(null)} 
                                className="flex-[2] bg-white text-black hover:bg-surface-hover text-sm font-bold px-4 py-3 rounded-xl transition"
                            >
                                Übernehmen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2 bg-surface border border-border rounded-xl p-3">
                {items.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-sm text-text-disabled mb-2">Kein Hopfen eingetragen.</p>
                        <button onClick={addRowMobile} className="text-xs font-bold bg-surface-hover hover:bg-surface-hover text-text-secondary px-3 py-1.5 rounded-lg transition">
                            + Hopfen hinzufügen
                        </button>
                    </div>
                )}
                
                {/* Mobile View (Cards) */}
                <div className="block md:hidden space-y-2">
                    {items.map((item, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setEditingIndex(idx)}
                            className="bg-background border border-border rounded-xl p-3 flex justify-between items-center active:border-green-500 transition cursor-pointer gap-4"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="bg-surface h-12 min-w-[3.5rem] px-2 rounded-xl flex items-center justify-center border border-border shrink-0">
                                    <span className="text-base font-bold text-text-primary">{item.amount || '0'}</span>
                                    <span className="text-xs text-text-muted ml-1 mb-0.5">{item.unit || 'g'}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-base font-bold text-text-primary truncate">{item.name || 'Unbenannt'}</div>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-green-950/30 text-green-500 border border-green-900/30 tracking-wider">
                                            {item.usage}
                                        </span>
                                        {item.time && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface text-text-secondary border border-border">
                                               {item.time} min
                                            </span>
                                        )}
                                        {item.alpha && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface text-text-secondary border border-border">
                                               {item.alpha}%
                                            </span>
                                        )}
                                        {item.form && item.form !== 'Pellet' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface text-text-secondary border border-border">
                                               {item.form}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-text-disabled shrink-0 pl-2">
                                <Pencil size={18} />
                            </div>
                        </div>
                    ))}
                    {items.length > 0 && (
                        <button onClick={addRowMobile} className="w-full py-3 text-sm font-bold text-text-secondary hover:text-text-primary bg-background hover:bg-surface rounded-lg transition border border-dashed border-border flex items-center justify-center gap-2">
                            <Plus size={16}/> Hopfen hinzufügen
                        </button>
                    )}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block">
                    {items.length > 0 && (
                        <div className="grid grid-cols-[64px_52px_1fr_64px_60px_120px_90px_28px] gap-2 mb-2 text-[10px] uppercase font-bold text-text-disabled">
                            <div>Menge</div>
                            <div title="Einheit">Einh.</div>
                            <div>Sorte</div>
                            <div title="Alpha-Säure %">Alpha %</div>
                            <div title="Kochzeit / Dauer">Min</div>
                            <div>Typ</div>
                            <div>Form</div>
                            <div></div>
                        </div>
                    )}

                    <div className="space-y-2">
                    {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[64px_52px_1fr_64px_60px_120px_90px_28px] gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                            <input 
                                type="text"
                                inputMode="decimal"
                                className="w-full bg-background border border-border rounded-lg px-2 py-2.5 text-sm text-text-primary focus:border-brand outline-none text-right placeholder:text-text-disabled"
                                placeholder="0"
                                value={item.amount}
                                onChange={(e) => updateRow(idx, 'amount', e.target.value.replace(',', '.'))}
                            />

                            <input 
                                className="w-full bg-background border border-border rounded-lg px-2 py-2.5 text-sm text-text-primary focus:border-brand outline-none placeholder:text-text-disabled"
                                placeholder="g"
                                value={item.unit}
                                onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                            />
                            
                            <input 
                                className="w-full bg-background border border-border rounded-lg px-2 py-2.5 text-sm text-text-primary focus:border-brand outline-none placeholder:text-text-disabled"
                                placeholder="Name"
                                value={item.name}
                                onChange={(e) => updateRow(idx, 'name', e.target.value)}
                            />
                            <input 
                                type="text"
                                inputMode="decimal"
                                className="w-full bg-background border border-border rounded-lg px-2 py-2.5 text-sm text-text-primary focus:border-brand outline-none text-right placeholder:text-text-disabled"
                                placeholder="-"
                                value={item.alpha || ''}
                                onChange={(e) => updateRow(idx, 'alpha', e.target.value.replace(',', '.'))}
                            />
                            <input 
                                type="text"
                                inputMode="decimal"
                                className="w-full bg-background border border-border rounded-lg px-2 py-2.5 text-sm text-text-primary focus:border-brand outline-none text-right placeholder:text-text-disabled"
                                placeholder="-"
                                value={item.time || ''}
                                onChange={(e) => updateRow(idx, 'time', e.target.value)}
                            />
                            <CustomSelect
                                value={item.usage || 'Boil'}
                                onChange={(val) => updateRow(idx, 'usage', val)}
                                variant="surface"
                                size="sm"
                                options={[
                                    { value: 'Boil', label: 'Kochen' },
                                    { value: 'Dry Hop', label: 'Stopfen' },
                                    { value: 'Whirlpool', label: 'Whirlpool' },
                                    { value: 'Mash', label: 'Maische' },
                                    { value: 'First Wort', label: 'Vorderwürze' },
                                ]}
                            />
                            <CustomSelect
                                value={item.form || 'Pellet'}
                                onChange={(val) => updateRow(idx, 'form', val)}
                                variant="surface"
                                size="sm"
                                options={[
                                    { value: 'Pellet', label: 'Pellet' },
                                    { value: 'Leaf', label: 'Dolden' },
                                    { value: 'Plug', label: 'Plug' },
                                ]}
                            />
                            <button 
                                onClick={() => removeRow(idx)}
                                className="text-text-disabled hover:text-red-400 transition flex justify-center"
                                title="Entfernen"
                            >
                               <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    </div>
                    
                    {items.length > 0 && (
                        <button onClick={addRow} className="w-full py-2 text-xs font-bold text-text-muted hover:text-text-secondary hover:bg-surface-hover/50 rounded-lg transition border border-dashed border-border mt-2">
                            + Weiteren Hopfen hinzufügen
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
