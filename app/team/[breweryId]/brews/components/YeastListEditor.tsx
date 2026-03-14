import { useState, useEffect } from 'react';
import { Trash2, Plus, X, ChevronRight } from 'lucide-react';
import { Command } from 'cmdk';
import { useSupabase } from '@/lib/hooks/useSupabase';

export interface Yeast {
    name: string;
    amount: string;
    unit: string;
    attenuation?: string;
    type?: string;
}

interface YeastListEditorProps {
    value: Yeast[] | string | undefined;
    onChange: (value: Yeast[]) => void;
}

function YeastCombobox({ 
    value, 
    onSelect, 
    yeasts 
}: { 
    value: string; 
    onSelect: (update: Partial<Yeast>) => void;
    yeasts: any[];
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(value || '');

    useEffect(() => { 
        if (value !== search) setSearch(value || ''); 
    }, [value]);

    return (
        <Command className="relative overflow-visible w-full" shouldFilter={true}>
            <Command.Input 
                className="w-full bg-transparent px-0 py-0 text-sm text-text-primary outline-none placeholder:text-text-disabled"
                placeholder="Sorte suchen (z.B. US-05, Weizenbierhefe)…"
                value={search}
                onValueChange={(val) => {
                    setSearch(val);
                    setOpen(true);
                    onSelect({ name: val }); 
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
            />
            {open && search.length > 0 && (
                <div className="absolute top-full mt-1 z-50 w-full min-w-[280px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col">
                    <Command.List className="overflow-y-auto p-1">
                        <Command.Empty className="p-3 text-sm text-text-muted text-center">Keine Hefe gefunden.</Command.Empty>
                        {yeasts.map(y => (
                            <Command.Item 
                                key={y.id}
                                value={y.name + " " + (y.aliases ? y.aliases.join(" ") : "")}
                                onSelect={() => {
                                    setSearch(y.name);
                                    onSelect({ 
                                        name: y.name, 
                                        attenuation: y.attenuation_pct?.toString()
                                    });
                                    setOpen(false);
                                }}
                                className="px-3 py-2 cursor-pointer rounded-lg hover:bg-surface-hover flex items-center justify-between text-sm data-[selected='true']:bg-surface-hover"
                            >
                                <div className="font-semibold text-text-primary truncate mr-2">{y.name}</div>
                                {y.attenuation_pct && (
                                    <span className="shrink-0 bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-blue-500/20">
                                        {y.attenuation_pct}% EVG
                                    </span>
                                )}
                            </Command.Item>
                        ))}
                    </Command.List>
                </div>
            )}
        </Command>
    );
}

export function YeastListEditor({ value, onChange }: YeastListEditorProps) {
    const supabase = useSupabase();
    const [items, setItems] = useState<Yeast[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [dbYeasts, setDbYeasts] = useState<any[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    useEffect(() => {
        if (!initialized) {
            if (Array.isArray(value)) {
                setItems(value as Yeast[]);
            } else if (typeof value === 'string' && value.trim() !== '') {
                setItems([{ name: value, amount: '', unit: 'g', attenuation: '75', type: 'dry' }]);
            } else {
                setItems([]);
            }
            setInitialized(true);
        }
    }, [value, initialized]);

    useEffect(() => {
        async function fetchYeasts() {
            const { data } = await supabase
                .from('ingredient_products')
                .select(`id, name, manufacturer, attenuation_pct, ingredient_master!inner(type, aliases, name)`)
                .eq('ingredient_master.type', 'yeast')
                .order('name');
            if (data) {
                setDbYeasts(data.map((p: any) => ({
                    id: p.id,
                    name: p.manufacturer && !p.name.includes(p.manufacturer) ? `${p.name} (${p.manufacturer})` : p.name,
                    attenuation_pct: p.attenuation_pct,
                    aliases: p.ingredient_master?.aliases || [],
                })));
            }
        }
        fetchYeasts();
    }, [supabase]);

    const handleChange = (newItems: Yeast[]) => {
        setItems(newItems);
        onChange(newItems);
    };

    const addRow = () => {
        const newIdx = items.length;
        handleChange([...items, { name: '', amount: '', unit: 'g', attenuation: '75', type: 'dry' }]);
        setEditingIdx(newIdx);
    };

    const updateRow = (index: number, field: keyof Yeast, val: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        handleChange(newItems);
    };

    const updateRowPartial = (index: number, updates: Partial<Yeast>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updates };
        handleChange(newItems);
    };

    const removeRow = (index: number) => {
        handleChange(items.filter((_, i) => i !== index));
        setEditingIdx(null);
    };

    const formatSummary = (item: Yeast) => {
        const parts: string[] = [];
        if (item.amount) parts.push(`${item.amount} ${item.unit}`);
        if (item.type) parts.push(item.type === 'dry' ? 'Trocken' : 'Flüssig');
        if (item.attenuation) parts.push(`EVG ${item.attenuation}%`);
        return parts.join(' · ');
    };

    const editingItem = editingIdx !== null ? items[editingIdx] : null;

    return (
        <div>
            <label className="text-xs font-bold text-text-disabled uppercase ml-1 block mb-2 tracking-wider">Hefe</label>

            {/* ── MOBILE: Compact single-line list ── */}
            {items.length > 0 && (
                <div className="md:hidden bg-surface border border-border rounded-xl overflow-hidden mb-2 divide-y divide-border">
                    {items.map((item, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setEditingIdx(idx)}
                            className="w-full flex items-center gap-3 px-3 py-3 text-left"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-text-primary truncate">
                                    {item.name || <span className="text-text-disabled italic font-normal">Sorte wählen…</span>}
                                </div>
                                {(item.amount || item.type || item.attenuation) && (
                                    <div className="text-xs text-text-muted mt-0.5">{formatSummary(item)}</div>
                                )}
                            </div>
                            <ChevronRight size={14} className="text-text-disabled shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {/* ── MOBILE: Full-screen edit sheet ── */}
            {editingItem !== null && editingIdx !== null && (
                <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                        <h2 className="text-base font-bold text-text-primary">Hefe bearbeiten</h2>
                        <button
                            type="button"
                            onClick={() => setEditingIdx(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:text-text-primary transition"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Fields */}
                    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Sorte</label>
                            <div className="bg-surface border border-border rounded-xl px-3 py-2.5 focus-within:border-blue-500/50 transition">
                                <YeastCombobox
                                    value={editingItem.name}
                                    onSelect={(updates) => updateRowPartial(editingIdx, updates)}
                                    yeasts={dbYeasts}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Menge</label>
                            <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-blue-500/50 transition">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="0"
                                    value={editingItem.amount || ''}
                                    onChange={(e) => updateRow(editingIdx, 'amount', e.target.value.replace(',', '.'))}
                                />
                                <select
                                    className="bg-surface-hover border-l border-border px-3 py-3 text-sm font-bold text-text-secondary outline-none shrink-0"
                                    value={editingItem.unit || 'g'}
                                    onChange={(e) => updateRow(editingIdx, 'unit', e.target.value)}
                                >
                                    <option value="g">g</option>
                                    <option value="ml">ml</option>
                                    <option value="pkg">pkg</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Typ</label>
                            <div className="flex bg-surface-hover border border-border rounded-xl p-1 gap-1">
                                <button
                                    type="button"
                                    onClick={() => updateRow(editingIdx, 'type', 'dry')}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                                        (editingItem.type || 'dry') === 'dry'
                                            ? 'bg-background text-text-primary shadow-sm'
                                            : 'text-text-disabled hover:text-text-muted'
                                    }`}
                                >
                                    Trocken
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateRow(editingIdx, 'type', 'liquid')}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                                        editingItem.type === 'liquid'
                                            ? 'bg-background text-text-primary shadow-sm'
                                            : 'text-text-disabled hover:text-text-muted'
                                    }`}
                                >
                                    Flüssig
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Vergärungsgrad (EVG)</label>
                            <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-blue-500/50 transition">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="75"
                                    value={editingItem.attenuation || ''}
                                    onChange={(e) => updateRow(editingIdx, 'attenuation', e.target.value)}
                                />
                                <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer: Delete + Done */}
                    <div className="shrink-0 px-4 py-4 border-t border-border flex gap-3">
                        <button
                            type="button"
                            onClick={() => removeRow(editingIdx)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-text-disabled hover:text-red-400 hover:border-red-500/30 transition text-sm font-medium"
                        >
                            <Trash2 size={14} /> Löschen
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditingIdx(null)}
                            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition"
                        >
                            Fertig
                        </button>
                    </div>
                </div>
            )}

            {/* ── DESKTOP: Merged container with pixel-perfect aligned headers ── */}
            {/* Fixed column widths (not fr/auto) guarantee header ↔ row alignment */}
            {/* overflow-visible so the cmdk dropdown is not clipped */}
            <div className="hidden md:block bg-surface border border-border rounded-xl overflow-visible mb-2 divide-y divide-border">
                    <div className="grid grid-cols-[1fr_130px_160px_92px_28px] gap-x-3 px-3 py-1.5 bg-surface-hover/60 rounded-t-xl">
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Sorte</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Menge</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Typ</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider text-right pr-2">EVG</span>
                        <span />
                    </div>

                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className="grid grid-cols-[1fr_130px_160px_92px_28px] gap-x-3 px-3 py-2.5 items-center group"
                        >
                            {/* Sorte */}
                            <div className="h-9 flex items-center bg-background border border-border rounded-lg px-2.5 focus-within:border-blue-500/50 transition">
                                <YeastCombobox
                                    value={item.name}
                                    onSelect={(updates) => updateRowPartial(idx, updates)}
                                    yeasts={dbYeasts}
                                />
                            </div>

                            {/* Menge + Einheit */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-blue-500/50 transition">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="flex-1 min-w-0 bg-transparent pl-2.5 pr-1 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="0"
                                    value={item.amount || ''}
                                    onChange={(e) => updateRow(idx, 'amount', e.target.value.replace(',', '.'))}
                                />
                                <select
                                    className="bg-surface-hover border-l border-border px-1.5 text-xs font-bold text-text-secondary outline-none shrink-0 self-stretch"
                                    value={item.unit || 'g'}
                                    onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                                >
                                    <option value="g">g</option>
                                    <option value="ml">ml</option>
                                    <option value="pkg">pkg</option>
                                </select>
                            </div>

                            {/* Typ – Segmented pill toggle */}
                            <div className="h-9 flex bg-surface-hover border border-border rounded-lg p-0.5 gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => updateRow(idx, 'type', 'dry')}
                                    className={`flex-1 whitespace-nowrap px-3 text-xs font-bold rounded-md transition-all flex items-center justify-center ${
                                        (item.type || 'dry') === 'dry'
                                            ? 'bg-background text-text-primary shadow-sm'
                                            : 'text-text-disabled hover:text-text-muted'
                                    }`}
                                >
                                    Trocken
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateRow(idx, 'type', 'liquid')}
                                    className={`flex-1 whitespace-nowrap px-3 text-xs font-bold rounded-md transition-all flex items-center justify-center ${
                                        item.type === 'liquid'
                                            ? 'bg-background text-text-primary shadow-sm'
                                            : 'text-text-disabled hover:text-text-muted'
                                    }`}
                                >
                                    Flüssig
                                </button>
                            </div>

                            {/* EVG % */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-blue-500/50 transition">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="flex-1 min-w-0 bg-transparent pl-2 pr-0 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="75"
                                    value={item.attenuation || ''}
                                    onChange={(e) => updateRow(idx, 'attenuation', e.target.value)}
                                />
                                <span className="flex items-center pl-1.5 pr-2.5 text-text-disabled text-sm select-none">%</span>
                            </div>

                            {/* Delete */}
                            <button
                                type="button"
                                onClick={() => removeRow(idx)}
                                className="flex text-text-disabled hover:text-red-400 transition justify-center items-center opacity-0 group-hover:opacity-100"
                                title="Entfernen"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))}
                <div className="px-3 py-2.5">
                    <button
                        type="button"
                        onClick={addRow}
                        className="flex items-center gap-2 text-text-muted hover:text-text-secondary transition text-sm font-medium"
                    >
                        <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                            <Plus size={12} />
                        </span>
                        Hefe hinzufügen
                    </button>
                </div>
            </div>

            {/* Mobile add button */}
            <button
                type="button"
                onClick={addRow}
                className="md:hidden w-full py-2.5 bg-surface hover:bg-surface-hover border border-dashed border-border rounded-xl text-text-secondary text-sm font-semibold flex items-center justify-center gap-2 transition group"
            >
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/20 transition">
                    <Plus size={12} />
                </span>
                Hefe hinzufügen
            </button>
        </div>
    );
}
