import { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Beaker, List } from 'lucide-react';

export interface Yeast {
    name: string;
    amount: string;
    unit: string;
    attenuation?: string; // %
    type?: string; // dry, liquid
}

interface YeastListEditorProps {
    value: Yeast[] | string | undefined;
    onChange: (value: Yeast[]) => void;
}

export function YeastListEditor({ value, onChange }: YeastListEditorProps) {
    const [items, setItems] = useState<Yeast[]>([]);
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
        // Safe init: handle string legacy data or empty
        if (!initialized) {
            if (Array.isArray(value)) {
                setItems(value as Yeast[]);
            } else if (typeof value === 'string' && value.trim() !== '') {
                // Convert legacy string to single object
                setItems([{ name: value, amount: '', unit: 'g', attenuation: '75', type: 'dry' }]);
            } else {
                setItems([]);
            }
            setInitialized(true);
        } else {
            // If value changes externally (e.g. reset), sync back if it's an array
            if (Array.isArray(value) && value !== items) {
                // simple check to avoid loops, maybe deep equal needed but simplistic for now
                // actually better to only sync on init or just trust local state and push up
            }
        }
    }, [value, initialized]);

    const handleChange = (newItems: Yeast[]) => {
        setItems(newItems);
        onChange(newItems);
    };

    const addRow = () => {
        const newItem = { name: '', amount: '', unit: 'g', attenuation: '75', type: 'dry' };
        const newItems = [...items, newItem];
        handleChange(newItems);
    };

    const addRowMobile = () => {
        const newItem = { name: '', amount: '', unit: 'g', attenuation: '75', type: 'dry' };
        const newItems = [...items, newItem];
        handleChange(newItems);
        setEditingIndex(newItems.length - 1);
    };

    const updateRow = (index: number, field: keyof Yeast, val: string) => {
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
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 block">Hefe</label>
            </div>
            
             {/* Mobile Modal for Editing */}
             {editingIndex !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900 shrink-0">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <Beaker size={16} />
                                </span>
                                Hefe bearbeiten
                            </h3>
                            <button onClick={() => setEditingIndex(null)} className="text-zinc-400 hover:text-white bg-zinc-800 p-2 rounded-full">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="p-4 space-y-4 overflow-y-auto">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Name / Sorte</label>
                                <input 
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-blue-500 outline-none placeholder:text-zinc-700"
                                    placeholder="z.B. US-05"
                                    value={items[editingIndex].name}
                                    onChange={(e) => updateRow(editingIndex, 'name', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Menge</label>
                                    <div className="relative">
                                        <input 
                                            type="number"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-3 pr-3 py-3 text-white focus:border-blue-500 outline-none placeholder:text-zinc-700"
                                            placeholder="0"
                                            value={items[editingIndex].amount}
                                            onChange={(e) => updateRow(editingIndex, 'amount', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Einheit</label>
                                    <input 
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-blue-500 outline-none placeholder:text-zinc-700"
                                        placeholder="g"
                                        value={items[editingIndex].unit}
                                        onChange={(e) => updateRow(editingIndex, 'unit', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    Vergärungsgrad (VG%)
                                </label>
                                <input 
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-blue-500 outline-none placeholder:text-zinc-700"
                                    placeholder="75"
                                    value={items[editingIndex].attenuation || ''}
                                    onChange={(e) => updateRow(editingIndex, 'attenuation', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0 flex gap-3">
                             <button 
                                onClick={() => { removeRow(editingIndex); setEditingIndex(null); }} 
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2"
                            > 
                                <Trash2 size={16}/> Löschen 
                            </button>
                            <button 
                                onClick={() => setEditingIndex(null)} 
                                className="flex-[2] bg-white text-black hover:bg-zinc-200 text-sm font-bold px-4 py-3 rounded-xl transition"
                            >
                                Übernehmen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                {items.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-sm text-zinc-600 mb-2">Keine Hefe eingetragen.</p>
                        <button onClick={addRowMobile} className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition">
                            + Hefe hinzufügen
                        </button>
                    </div>
                )}
                
                {/* Mobile View */}
                <div className="block md:hidden space-y-2">
                    {items.map((item, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setEditingIndex(idx)}
                            className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex justify-between items-center active:border-blue-500 transition cursor-pointer gap-4"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className="bg-zinc-900 h-12 min-w-[3.5rem] px-2 rounded-xl flex items-center justify-center border border-zinc-800 shrink-0">
                                    <span className="text-base font-bold text-white max-w-[4rem] truncate">{item.amount || '0'}</span>
                                    <span className="text-xs text-zinc-500 ml-1 mb-0.5">{item.unit || 'g'}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-base font-bold text-white truncate">{item.name || 'Unbenannt'}</div>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {item.attenuation && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-blue-950/30 text-blue-400 border border-blue-900/30 tracking-wider">
                                                VG: {item.attenuation}%
                                            </span>
                                        )}
                                        {item.type && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 capitalize">
                                               {item.type}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-zinc-600 shrink-0 pl-2">
                                <Pencil size={18} />
                            </div>
                        </div>
                    ))}
                    {items.length > 0 && (
                        <button onClick={addRowMobile} className="w-full py-3 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 rounded-lg transition border border-dashed border-zinc-800 flex items-center justify-center gap-2">
                            <Plus size={16}/> Hefe hinzufügen
                        </button>
                    )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block">
                    {items.length > 0 && (
                        <div className="grid grid-cols-[1fr_60px_60px_50px_30px] gap-2 mb-2 text-[10px] uppercase font-bold text-zinc-600">
                            <div>Name / Sorte</div>
                            <div>Menge</div>
                            <div>Einh.</div>
                            <div title="Vergärungsgrad">VG %</div>
                            <div></div>
                        </div>
                    )}

                    {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_60px_60px_50px_30px] gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                            <input 
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none placeholder:text-zinc-700"
                                placeholder="Name (z.B. US-05)"
                                value={item.name}
                                onChange={(e) => updateRow(idx, 'name', e.target.value)}
                            />
                            <input 
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none text-right placeholder:text-zinc-700"
                                placeholder="0"
                                value={item.amount}
                                onChange={(e) => updateRow(idx, 'amount', e.target.value)}
                            />
                            <input 
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none placeholder:text-zinc-700"
                                placeholder="g"
                                value={item.unit}
                                onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                            />
                            <input 
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-500 outline-none text-right placeholder:text-zinc-700"
                                placeholder="75"
                                value={item.attenuation || ''}
                                onChange={(e) => updateRow(idx, 'attenuation', e.target.value)}
                            />
                            <button 
                                onClick={() => removeRow(idx)}
                                className="text-zinc-600 hover:text-red-400 transition flex justify-center"
                                title="Entfernen"
                            >
                            <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    
                    {items.length > 0 && (
                        <button onClick={addRow} className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition border border-dashed border-zinc-800 mt-2">
                            + Weitere Hefe hinzufügen
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


