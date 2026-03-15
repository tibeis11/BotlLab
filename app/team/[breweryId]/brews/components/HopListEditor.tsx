import { useState, useEffect } from 'react';
import { Trash2, Plus, X, ChevronRight } from 'lucide-react';
import { Command } from 'cmdk';
import { useSupabase } from '@/lib/hooks/useSupabase';

export interface Hop {
    name: string;
    amount: string;
    unit: string;
    alpha?: string;
    time?: string;
    temperature?: string;
    usage?: string;
    form?: string;
    manufacturer?: string;
    master_id?: string;
}

interface ProductHop {
    id: string;
    name: string;
    manufacturer: string;
    alpha_pct?: number;
}

export interface MasterHop {
    id: string;
    name: string;
    aliases: string[];
    alpha_pct?: number;
    products: ProductHop[];
}

interface HopListEditorProps {
    value: Hop[] | undefined;
    onChange: (value: Hop[]) => void;
}

const USAGE_OPTIONS = [
    { value: 'Boil', label: 'Kochen' },
    { value: 'Dry Hop', label: 'Stopfen' },
    { value: 'Whirlpool', label: 'Whirlpool' },
    { value: 'Mash', label: 'Maischen' },
    { value: 'First Wort', label: 'Vorderwürze' }
];

function SorteCombobox({ value, onSelect, hops }: { value: string; onSelect: (master: MasterHop) => void; hops: MasterHop[]; }) {
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
                        {hops.map(m => (
                            <Command.Item
                                key={m.id}
                                value={m.name + ' ' + (m.aliases ? m.aliases.join(' ') : '')}
                                onSelect={() => { setSearch(m.name); onSelect(m); setOpen(false); }}
                                className="px-3 py-2 cursor-pointer rounded-lg hover:bg-surface-hover flex items-center justify-between text-sm data-[selected='true']:bg-surface-hover"
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

export function HopListEditor({ value, onChange }: HopListEditorProps) {
    const supabase = useSupabase();
    const [items, setItems] = useState<Hop[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [dbHops, setDbHops] = useState<MasterHop[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    useEffect(() => {
        if (initialized) return;
        if (Array.isArray(value)) setItems(value);
        setInitialized(true);
    }, [value, initialized]);

    useEffect(() => {
        async function fetchHops() {
            const { data } = await supabase
                .from('ingredient_master')
                .select('id, name, aliases, alpha_pct, ingredient_products(id, name, manufacturer, alpha_pct)')
                .eq('type', 'hop')
                .order('name');
            if (data) {
                const uniqueMap = new Map<string, MasterHop>();
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
                        uniqueMap.set(m.name, { id: m.id, name: m.name, aliases: m.aliases || [], alpha_pct: m.alpha_pct, products });
                    }
                });
                setDbHops(Array.from(uniqueMap.values()));
            }
        }
        fetchHops();
    }, [supabase]);

    const handleChange = (newItems: Hop[]) => { setItems(newItems); onChange(newItems); };
    const addRow = () => { const idx = items.length; handleChange([...items, { name: '', amount: '', unit: 'g', usage: 'Boil', form: 'Pellet' }]); setEditingIdx(idx); };
    const updateRow = (index: number, field: keyof Hop, val: string) => { const n = [...items]; n[index] = { ...n[index], [field]: val }; handleChange(n); };
    const updateRowPartial = (index: number, updates: Partial<Hop>) => { const n = [...items]; n[index] = { ...n[index], ...updates }; handleChange(n); };
    const removeRow = (index: number) => { handleChange(items.filter((_, i) => i !== index)); setEditingIdx(null); };

    const formatSummary = (item: Hop) => {
        const parts: string[] = [];
        if (item.manufacturer) parts.push(item.manufacturer);
        if (item.amount) parts.push(item.amount + ' ' + item.unit);
        if (item.alpha) parts.push(item.alpha + '% α');
        return parts.join(' · ');
    };

    const handleSorteSelect = (index: number, master: MasterHop) => {
        updateRowPartial(index, { name: master.name, master_id: master.id, manufacturer: '', alpha: master.alpha_pct ? master.alpha_pct.toString() : '' });
    };

    const handleManufacturerSelect = (index: number, manufacturer: string) => {
        const item = items[index];
        const master = dbHops.find(m => m.name === item.name);
        if (!manufacturer) {
            updateRowPartial(index, { manufacturer: '', alpha: master?.alpha_pct ? master.alpha_pct.toString() : '' });
            return;
        }
        const product = master?.products.find(p => p.manufacturer === manufacturer);
        updateRowPartial(index, { manufacturer, alpha: product?.alpha_pct?.toString() || (master?.alpha_pct ? master.alpha_pct.toString() : '') });
    };

    const editingItem = editingIdx !== null ? items[editingIdx] : null;
    const editingMaster = editingItem ? dbHops.find(m => m.name === editingItem.name) : null;

    return (
        <div>
            <label className="text-xs font-bold text-text-disabled uppercase ml-1 block mb-2 tracking-wider">Hopfen</label>

            {/* ── MOBILE: Compact list ── */}
            {items.length > 0 && (
                <div className="md:hidden bg-surface border border-border rounded-xl overflow-hidden mb-2 divide-y divide-border">
                    {items.map((item, idx) => (
                        <button key={idx} type="button" onClick={() => setEditingIdx(idx)}
                            className="w-full flex items-center gap-3 px-3 py-3 text-left">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-text-primary truncate">
                                    {item.name || <span className="text-text-disabled italic font-normal">Sorte wählen…</span>}
                                </div>
                                {(item.amount || item.alpha || item.manufacturer) && (
                                    <div className="text-xs text-text-muted mt-0.5">{formatSummary(item)}</div>
                                )}
                            </div>
                            <ChevronRight size={14} className="text-text-disabled shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {/* ── MOBILE: Full-screen sheet ── */}
            {editingItem !== null && editingIdx !== null && (
                <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                        <h2 className="text-base font-bold text-text-primary">Hopfen bearbeiten</h2>
                        <button type="button" onClick={() => setEditingIdx(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:text-text-primary transition">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Sorte</label>
                            <div className="bg-surface border border-border rounded-xl px-3 py-2.5 focus-within:border-green-500/50 transition h-12">
                                <SorteCombobox value={editingItem.name} onSelect={(m) => handleSorteSelect(editingIdx, m)} hops={dbHops} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Hersteller (Optional)</label>
                            <div className="flex bg-surface border border-border rounded-xl px-3 py-2.5 overflow-visible focus-within:border-green-500/50 transition relative h-12">
                                <ManufacturerCombobox
                                    value={editingItem.manufacturer || ''}
                                    products={editingMaster?.products || []}
                                    onSelect={(val) => handleManufacturerSelect(editingIdx, val)}
                                    disabled={!editingMaster || editingMaster.products.length === 0}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Verwendung</label>
                            <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-green-500/50 transition">
                                <select className="flex-1 bg-transparent px-3 py-3 text-sm text-text-primary outline-none appearance-none"
                                    value={editingItem.usage || 'Boil'}
                                    onChange={(e) => updateRow(editingIdx, 'usage', e.target.value)}>
                                    {USAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Menge</label>
                                <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-green-500/50 transition">
                                    <input type="text" inputMode="decimal"
                                        className="flex-1 min-w-0 bg-transparent pl-3 pr-1 py-3 text-sm text-text-primary outline-none text-right"
                                        placeholder="0" value={editingItem.amount || ''}
                                        onChange={(e) => updateRow(editingIdx, 'amount', e.target.value.replace(',', '.'))} />
                                    <select className="bg-surface-hover border-l border-border px-2 py-3 text-sm font-bold text-text-secondary outline-none shrink-0"
                                        value={editingItem.unit || 'g'}
                                        onChange={(e) => updateRow(editingIdx, 'unit', e.target.value)}>
                                        <option value="g">g</option>
                                        <option value="kg">kg</option>
                                        <option value="oz">oz</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Alpha %</label>
                                <div className="bg-surface border border-border rounded-xl overflow-hidden focus-within:border-green-500/50 transition">
                                    <input type="text" inputMode="decimal"
                                        className="w-full bg-transparent px-3 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                        placeholder="0.0" value={editingItem.alpha || ''}
                                        onChange={(e) => updateRow(editingIdx, 'alpha', e.target.value.replace(',', '.'))} />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Zeit (Min.)</label>
                                <div className="bg-surface border border-border rounded-xl overflow-hidden focus-within:border-green-500/50 transition">
                                    <input type="text" inputMode="decimal"
                                        className="w-full bg-transparent px-3 py-3 text-sm text-text-primary outline-none text-right"
                                        placeholder="z.B. 60" value={editingItem.time || ''}
                                        onChange={(e) => updateRow(editingIdx, 'time', e.target.value)} />
                                </div>
                            </div>
                            {editingItem.usage === 'Whirlpool' && (
                                <div>
                                    <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Temperatur (°C)</label>
                                    <div className="bg-surface border border-border rounded-xl overflow-hidden focus-within:border-green-500/50 transition">
                                        <input type="text" inputMode="decimal"
                                            className="w-full bg-transparent px-3 py-3 text-sm text-text-primary outline-none text-right"
                                            placeholder="z.B. 80" value={editingItem.temperature || ''}
                                            onChange={(e) => updateRow(editingIdx, 'temperature', e.target.value.replace(',', '.'))} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 px-4 py-4 border-t border-border flex gap-3">
                        <button type="button" onClick={() => removeRow(editingIdx)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-text-disabled hover:text-red-400 hover:border-red-500/30 transition text-sm font-medium">
                            <Trash2 size={14} /> Löschen
                        </button>
                        <button type="button" onClick={() => setEditingIdx(null)}
                            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition">
                            Fertig
                        </button>
                    </div>
                </div>
            )}

            {/* ── DESKTOP ── */}
            <div className="hidden md:block bg-surface border border-border rounded-xl overflow-visible mb-2 divide-y divide-border">
                <div className="grid grid-cols-[1.3fr_1.3fr_110px_90px_100px_70px_28px] gap-x-3 px-3 py-1.5 bg-surface-hover/60 rounded-t-xl">
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Sorte</span>
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Hersteller (Opt.)</span>
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Verwendung</span>
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Menge</span>
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Zeit / Temp.</span>
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider text-right pr-2">Alpha %</span>
                    <span />
                </div>
                {items.map((item, idx) => {
                    const masterForRow = dbHops.find(m => m.name === item.name);
                    return (
                        <div key={idx} className="grid grid-cols-[1.3fr_1.3fr_110px_90px_100px_70px_28px] gap-x-3 px-3 py-2.5 items-center group relative focus-within:z-[60]">
                            {/* Sorte */}
                            <div className="h-9 flex items-center bg-background border border-border rounded-lg px-2.5 focus-within:border-green-500/50 transition z-10">
                                <SorteCombobox value={item.name} onSelect={(m) => handleSorteSelect(idx, m)} hops={dbHops} />
                            </div>
                            {/* Hersteller */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-visible focus-within:border-green-500/50 transition relative pl-2.5 z-10">
                                <ManufacturerCombobox
                                    value={item.manufacturer || ''}
                                    products={masterForRow?.products || []}
                                    onSelect={(val) => handleManufacturerSelect(idx, val)}
                                    disabled={!masterForRow || masterForRow.products.length === 0}
                                />
                            </div>
                            {/* Verwendung */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-green-500/50 transition">
                                <select className="w-full bg-transparent px-2 text-sm text-text-primary outline-none appearance-none truncate"
                                    value={item.usage || 'Boil'}
                                    onChange={(e) => updateRow(idx, 'usage', e.target.value)}>
                                    {USAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            {/* Menge */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-green-500/50 transition">
                                <input type="text" inputMode="decimal"
                                    className="flex-1 min-w-0 bg-transparent pl-2 pr-1 text-sm text-text-primary outline-none text-right"
                                    placeholder="0" value={item.amount || ''}
                                    onChange={(e) => updateRow(idx, 'amount', e.target.value.replace(',', '.'))} />
                                <select className="bg-surface-hover border-l border-border px-1 text-xs font-bold text-text-secondary outline-none shrink-0"
                                    value={item.unit || 'g'}
                                    onChange={(e) => updateRow(idx, 'unit', e.target.value)}>
                                    <option value="g">g</option>
                                    <option value="kg">kg</option>
                                    <option value="oz">oz</option>
                                </select>
                            </div>
                            {/* Zeit / Temp */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-green-500/50 transition text-sm">
                                <input type="text" inputMode="decimal"
                                    className="flex-1 min-w-0 bg-transparent px-2 text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder={item.usage === 'Whirlpool' ? 'Min.' : 'Zeit'} value={item.time || ''}
                                    onChange={(e) => updateRow(idx, 'time', e.target.value)} />
                                {item.usage === 'Whirlpool' && (
                                    <>
                                        <div className="w-px bg-border my-2" />
                                        <input type="text" inputMode="decimal"
                                            className="flex-1 min-w-0 bg-transparent px-2 text-text-primary outline-none text-right placeholder:text-text-disabled"
                                            placeholder="°C" value={item.temperature || ''}
                                            onChange={(e) => updateRow(idx, 'temperature', e.target.value.replace(',', '.'))} />
                                    </>
                                )}
                            </div>
                            {/* Alpha */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-green-500/50 transition">
                                <input type="text" inputMode="decimal"
                                    className="w-full bg-transparent px-2 text-sm text-text-primary outline-none text-right"
                                    placeholder="0.0" value={item.alpha || ''}
                                    onChange={(e) => updateRow(idx, 'alpha', e.target.value.replace(',', '.'))} />
                            </div>
                            {/* Delete */}
                            <button type="button" onClick={() => removeRow(idx)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-text-disabled hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <button type="button" onClick={addRow}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-green-500 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition">
                <Plus size={16} /> Hopfen hinzufügen
            </button>
        </div>
    );
}
