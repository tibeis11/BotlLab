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
    manufacturer?: string;
    master_id?: string;
}

interface ProductYeast {
    id: string;
    name: string;
    manufacturer: string;
    attenuation_pct?: number;
}

export interface MasterYeast {
    id: string;
    name: string;
    aliases: string[];
    attenuation_pct?: number;
    products: ProductYeast[];
}

interface YeastListEditorProps {
    value: Yeast[] | string | undefined;
    onChange: (value: Yeast[]) => void;
}

function SorteCombobox({ value, onSelect, yeasts }: { value: string; onSelect: (master: MasterYeast) => void; yeasts: MasterYeast[]; }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(value || '');

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (value !== search) setSearch(value || ''); }, [value]);

    return (
        <Command className="relative overflow-visible w-full h-full" shouldFilter={true}>
            <Command.Input
                className="w-full bg-transparent px-0 py-0 text-sm text-text-primary outline-none placeholder:text-text-disabled h-full"
                placeholder="Sorte suchen…"
                value={search}
                onValueChange={(val) => { setSearch(val); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
            />
            <div className={`absolute ${open ? "" : "hidden"} top-full mt-1 left-0 z-50 w-full min-w-[280px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col`}>
                    <Command.List className="overflow-y-auto p-1">
                        <Command.Empty className="p-3 text-sm text-text-muted text-center">Keine Sorte gefunden.</Command.Empty>
                        {yeasts.map(m => (
                            <Command.Item
                                key={m.id}
                                value={m.name + ' ' + (m.aliases ? m.aliases.join(' ') : '')}
                                onSelect={() => { setSearch(m.name); onSelect(m); setOpen(false); }}
                                className="px-3 py-2 cursor-pointer rounded-lg hover:bg-surface-hover text-sm data-[selected='true']:bg-surface-hover"
                            >
                                <div className="font-semibold text-text-primary truncate">{m.name}</div>
                            </Command.Item>
                        ))}
                    </Command.List>
                </div>
        </Command>
    );
}

function ManufacturerCombobox({ value, onSelect, products, disabled }: {
    value: string;
    onSelect: (manufacturer: string) => void;
    products: { manufacturer: string }[];
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(value || '');

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (value !== search) setSearch(value || ''); }, [value]);

    return (
        <Command className="relative overflow-visible w-full h-full" shouldFilter={true}>
            <Command.Input
                className="w-full bg-transparent px-0 py-0 text-sm text-text-primary outline-none placeholder:text-text-disabled h-full disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={disabled ? '(Nicht verfügbar)' : 'Hersteller suchen…'}
                disabled={disabled}
                value={search}
                onValueChange={(val) => { setSearch(val); setOpen(true); }}
                onFocus={() => { if (!disabled) setOpen(true); }}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
            />
            <div className={`absolute ${open && !disabled ? "" : "hidden"} top-full mt-1 left-0 z-50 w-full min-w-[280px] bg-surface border border-border rounded-xl shadow-xl overflow-hidden max-h-64 flex flex-col`}>
                    <Command.List className="overflow-y-auto p-1">
                        <Command.Empty className="p-3 text-sm text-text-muted text-center">Kein Hersteller gefunden.</Command.Empty>
                        <Command.Item
                            value="(Beliebig)"
                            onSelect={() => { setSearch(''); onSelect(''); setOpen(false); }}
                            className="px-3 py-2 cursor-pointer rounded-lg hover:bg-surface-hover text-sm data-[selected='true']:bg-surface-hover mb-1"
                        >
                            <div className="font-semibold italic text-text-muted truncate">(Beliebiger Hersteller)</div>
                        </Command.Item>
                        {products.map((p, i) => (
                            <Command.Item
                                key={i}
                                value={p.manufacturer}
                                onSelect={() => { setSearch(p.manufacturer); onSelect(p.manufacturer); setOpen(false); }}
                                className="px-3 py-2 cursor-pointer rounded-lg hover:bg-surface-hover text-sm data-[selected='true']:bg-surface-hover"
                            >
                                <div className="font-semibold text-text-primary truncate">{p.manufacturer}</div>
                            </Command.Item>
                        ))}
                    </Command.List>
                </div>
        </Command>
    );
}

export function YeastListEditor({ value, onChange }: YeastListEditorProps) {
    const supabase = useSupabase();
    const [items, setItems] = useState<Yeast[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [dbYeasts, setDbYeasts] = useState<MasterYeast[]>([]);
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
                .from('ingredient_master')
                .select('id, name, aliases, ingredient_products(id, name, manufacturer, attenuation_pct)')
                .eq('type', 'yeast')
                .order('name');
            if (data) {
                const uniqueMap = new Map<string, MasterYeast>();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data.forEach((m: any) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const products = (m.ingredient_products || []).filter((p: any) => p.manufacturer);
                    if (uniqueMap.has(m.name)) {
                        const existing = uniqueMap.get(m.name)!;
                        const merged = [...(existing.products || [])];
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        products.forEach((p: any) => {
                            if (!merged.some(ep => ep.manufacturer === p.manufacturer)) merged.push(p);
                        });
                        existing.products = merged;
                    } else {
                        uniqueMap.set(m.name, { id: m.id, name: m.name, aliases: m.aliases || [], attenuation_pct: m.attenuation_pct, products });
                    }
                });
                setDbYeasts(Array.from(uniqueMap.values()));
            }
        }
        fetchYeasts();
    }, [supabase]);

    const handleChange = (newItems: Yeast[]) => { setItems(newItems); onChange(newItems); };
    const addRow = () => { const idx = items.length; handleChange([...items, { name: '', amount: '', unit: 'g', attenuation: '75', type: 'dry' }]); setEditingIdx(idx); };
    const updateRow = (index: number, field: keyof Yeast, val: string) => { const n = [...items]; n[index] = { ...n[index], [field]: val }; handleChange(n); };
    const updateRowPartial = (index: number, updates: Partial<Yeast>) => { const n = [...items]; n[index] = { ...n[index], ...updates }; handleChange(n); };
    const removeRow = (index: number) => { handleChange(items.filter((_, i) => i !== index)); setEditingIdx(null); };

    const formatSummary = (item: Yeast) => {
        const parts: string[] = [];
        if (item.manufacturer) parts.push(item.manufacturer);
        if (item.amount) parts.push(item.amount + ' ' + item.unit);
        if (item.attenuation) parts.push('EVG ' + item.attenuation + '%');
        return parts.join(' · ');
    };

    const handleSorteSelect = (index: number, master: MasterYeast) => {
        updateRowPartial(index, { name: master.name, master_id: master.id, manufacturer: '', attenuation: master.attenuation_pct ? master.attenuation_pct.toString() : '' });
    };

    const handleManufacturerSelect = (index: number, manufacturer: string) => {
        const item = items[index];
        const master = dbYeasts.find(m => m.name === item.name);
        if (!manufacturer) {
            updateRowPartial(index, { manufacturer: '', attenuation: master?.attenuation_pct ? master.attenuation_pct.toString() : '' });
            return;
        }
        const product = master?.products.find(p => p.manufacturer === manufacturer);
        updateRowPartial(index, { manufacturer, attenuation: product?.attenuation_pct?.toString() || (master?.attenuation_pct ? master.attenuation_pct.toString() : '') });
    };

    const editingItem = editingIdx !== null ? items[editingIdx] : null;
    const editingMaster = editingItem ? dbYeasts.find(m => m.name === editingItem.name) : null;

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
                            <div className="bg-surface border border-border rounded-xl px-3 py-2.5 focus-within:border-blue-500/50 transition h-12">
                                <SorteCombobox
                                    value={editingItem.name}
                                    onSelect={(m) => handleSorteSelect(editingIdx, m)}
                                    yeasts={dbYeasts}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Hersteller (Optional)</label>
                            <div className="flex bg-surface border border-border rounded-xl px-3 py-2.5 overflow-visible focus-within:border-blue-500/50 transition relative h-12">
                                <ManufacturerCombobox
                                    value={editingItem.manufacturer || ''}
                                    products={editingMaster?.products || []}
                                    onSelect={(val) => handleManufacturerSelect(editingIdx, val)}
                                    disabled={!editingMaster || editingMaster.products.length === 0}
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
                    <div className="grid grid-cols-[1.3fr_1fr_130px_140px_80px_28px] gap-x-3 px-3 py-1.5 bg-surface-hover/60 rounded-t-xl">
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Sorte</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Hersteller (Opt.)</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Menge</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Typ</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider text-right pr-2">EVG</span>
                        <span />
                    </div>

                    {items.map((item, idx) => {
                        const masterForRow = dbYeasts.find(m => m.name === item.name);
                        return (
                        <div
                            key={idx}
                            className="grid grid-cols-[1.3fr_1fr_130px_140px_80px_28px] gap-x-3 px-3 py-2.5 items-center group relative focus-within:z-[60]"
                        >
                            {/* Sorte */}
                            <div className="h-9 flex items-center bg-background border border-border rounded-lg px-2.5 focus-within:border-blue-500/50 transition z-10">
                                <SorteCombobox
                                    value={item.name}
                                    onSelect={(m) => handleSorteSelect(idx, m)}
                                    yeasts={dbYeasts}
                                />
                            </div>
                            {/* Hersteller */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-visible focus-within:border-blue-500/50 transition relative pl-2.5 z-10">
                                <ManufacturerCombobox
                                    value={item.manufacturer || ''}
                                    products={masterForRow?.products || []}
                                    onSelect={(val) => handleManufacturerSelect(idx, val)}
                                    disabled={!masterForRow || masterForRow.products.length === 0}
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
                    ); })}
            </div>

            <button type="button" onClick={addRow}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition">
                <Plus size={16} /> Hefe hinzufügen
            </button>
        </div>
    );
}
