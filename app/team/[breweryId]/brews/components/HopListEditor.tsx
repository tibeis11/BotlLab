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
    usage?: string;
    form?: string;
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

function HopCombobox({ value, onSelect, hops }: { value: string; onSelect: (update: Partial<Hop>) => void; hops: any[]; }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(value || '');

    useEffect(() => { if (value !== search) setSearch(value || ''); }, [value]);

    return (
        <Command className="relative overflow-visible w-full" shouldFilter={true}>
            <Command.Input
                className="w-full bg-transparent px-0 py-0 text-sm text-text-primary outline-none placeholder:text-text-disabled"
                placeholder="Sorte suchen (z.B. Citra, Hallertau)…"
                value={search}
                onValueChange={(val) => { setSearch(val); setOpen(true); onSelect({ name: val }); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
            />
            {open && search.length > 0 && (
                <div className="absolute top-full mt-1 z-50 w-full min-w-[280px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col">
                    <Command.List className="overflow-y-auto p-1">
                        <Command.Empty className="p-3 text-sm text-text-muted text-center">Keine Hopfen gefunden.</Command.Empty>
                        {hops.map(h => (
                            <Command.Item
                                key={h.id}
                                value={h.name + " " + (h.aliases ? h.aliases.join(" ") : "")}
                                onSelect={() => { setSearch(h.name); onSelect({ name: h.name, alpha: h.alpha_pct?.toString() }); setOpen(false); }}
                                className="px-3 py-2 cursor-pointer rounded-lg hover:bg-surface-hover flex items-center justify-between text-sm data-[selected='true']:bg-surface-hover"
                            >
                                <div className="font-semibold text-text-primary truncate mr-2">{h.name}</div>
                                {h.alpha_pct && (
                                    <span className="shrink-0 bg-green-500/10 text-green-500 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-green-500/20">
                                        {h.alpha_pct}% α
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

export function HopListEditor({ value, onChange }: HopListEditorProps) {
    const supabase = useSupabase();
    const [items, setItems] = useState<Hop[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [dbHops, setDbHops] = useState<any[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    useEffect(() => {
        if (initialized) return;
        if (Array.isArray(value)) setItems(value);
        setInitialized(true);
    }, [value, initialized]);

    useEffect(() => {
        async function fetchHops() {
            const { data } = await supabase
                .from('ingredient_products')
                .select(`id, name, manufacturer, alpha_pct, ingredient_master!inner(type, aliases, name)`)
                .eq('ingredient_master.type', 'hop')
                .order('name');
            if (data) {
                setDbHops(data.map((p: any) => ({
                    id: p.id,
                    name: p.manufacturer && !p.name.includes(p.manufacturer) ? `${p.name} (${p.manufacturer})` : p.name,
                    alpha_pct: p.alpha_pct,
                    aliases: p.ingredient_master?.aliases || [],
                })));
            }
        }
        fetchHops();
    }, [supabase]);

    const handleChange = (newItems: Hop[]) => { setItems(newItems); onChange(newItems); };
    const addRow = () => { const idx = items.length; handleChange([...items, { name: '', amount: '', unit: 'g', alpha: '', time: '', usage: 'Boil', form: 'Pellet' }]); setEditingIdx(idx); };
    const updateRow = (index: number, field: keyof Hop, val: string) => { const n = [...items]; n[index] = { ...n[index], [field]: val }; handleChange(n); };
    const updateRowPartial = (index: number, updates: Partial<Hop>) => { const n = [...items]; n[index] = { ...n[index], ...updates }; handleChange(n); };
    const removeRow = (index: number) => { handleChange(items.filter((_, i) => i !== index)); setEditingIdx(null); };

    const usageLabel = (u: string | undefined) => USAGE_OPTIONS.find(o => o.value === u)?.label ?? u ?? '';
    const formatSummary = (item: Hop) => {
        const parts: string[] = [];
        if (item.amount) parts.push(`${item.amount} ${item.unit}`);
        if (item.alpha) parts.push(`${item.alpha}% α`);
        if (item.time) parts.push(`${item.time} min`);
        if (item.usage) parts.push(usageLabel(item.usage));
        return parts.join(' · ');
    };

    const editingItem = editingIdx !== null ? items[editingIdx] : null;

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
                                {(item.amount || item.alpha || item.time || item.usage) && (
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
                            <div className="bg-surface border border-border rounded-xl px-3 py-2.5 focus-within:border-green-500/50 transition">
                                <HopCombobox value={editingItem.name} onSelect={(u) => updateRowPartial(editingIdx, u)} hops={dbHops} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Menge</label>
                            <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-green-500/50 transition">
                                <input type="text" inputMode="decimal"
                                    className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="0" value={editingItem.amount || ''}
                                    onChange={(e) => updateRow(editingIdx, 'amount', e.target.value.replace(',', '.'))} />
                                <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">g</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Alpha %</label>
                            <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-green-500/50 transition">
                                <input type="text" inputMode="decimal"
                                    className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="–" value={editingItem.alpha || ''}
                                    onChange={(e) => updateRow(editingIdx, 'alpha', e.target.value.replace(',', '.'))} />
                                <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Kochzeit</label>
                            <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-green-500/50 transition">
                                <input type="text" inputMode="numeric"
                                    className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="–" value={editingItem.time || ''}
                                    onChange={(e) => updateRow(editingIdx, 'time', e.target.value)} />
                                <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">min</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Verwendung</label>
                            <select
                                className="w-full bg-surface border border-border rounded-xl px-3.5 py-3 text-sm text-text-primary outline-none"
                                value={editingItem.usage || 'Boil'}
                                onChange={(e) => updateRow(editingIdx, 'usage', e.target.value)}>
                                {USAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
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

            {/* ── DESKTOP: Merged container ── */}
            <div className="hidden md:block bg-surface border border-border rounded-xl overflow-visible mb-2 divide-y divide-border">
                    <div className="grid grid-cols-[1fr_120px_88px_88px_140px_28px] gap-x-3 px-3 py-1.5 bg-surface-hover/60 rounded-t-xl">
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Sorte</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Menge</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Alpha</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Zeit</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Verwendung</span>
                        <span />
                    </div>
                    {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_120px_88px_88px_140px_28px] gap-x-3 px-3 py-2.5 items-center group">
                            {/* Sorte */}
                            <div className="h-9 flex items-center bg-background border border-border rounded-lg px-2.5 focus-within:border-green-500/50 transition">
                                <HopCombobox value={item.name} onSelect={(u) => updateRowPartial(idx, u)} hops={dbHops} />
                            </div>
                            {/* Menge */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-green-500/50 transition">
                                <input type="text" inputMode="decimal"
                                    className="flex-1 min-w-0 bg-transparent pl-2.5 pr-1 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="0" value={item.amount || ''}
                                    onChange={(e) => updateRow(idx, 'amount', e.target.value.replace(',', '.'))} />
                                <span className="flex items-center pl-1 pr-2.5 text-text-disabled text-sm select-none">g</span>
                            </div>
                            {/* Alpha */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-green-500/50 transition">
                                <input type="text" inputMode="decimal"
                                    className="flex-1 min-w-0 bg-transparent pl-2 pr-0 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="–" value={item.alpha || ''}
                                    onChange={(e) => updateRow(idx, 'alpha', e.target.value.replace(',', '.'))} />
                                <span className="flex items-center pl-1.5 pr-2 text-text-disabled text-sm select-none">%</span>
                            </div>
                            {/* Zeit */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-green-500/50 transition">
                                <input type="text" inputMode="numeric"
                                    className="flex-1 min-w-0 bg-transparent pl-2 pr-0 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="–" value={item.time || ''}
                                    onChange={(e) => updateRow(idx, 'time', e.target.value)} />
                                <span className="flex items-center pl-1 pr-2 text-text-disabled text-xs select-none">min</span>
                            </div>
                            {/* Verwendung */}
                            <div className="h-9 bg-background border border-border rounded-lg overflow-hidden flex items-center focus-within:border-green-500/50 transition">
                                <select
                                    className="w-full h-full bg-transparent px-2.5 text-sm text-text-primary outline-none"
                                    value={item.usage || 'Boil'}
                                    onChange={(e) => updateRow(idx, 'usage', e.target.value)}>
                                    {USAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            {/* Delete */}
                            <button type="button" onClick={() => removeRow(idx)}
                                className="flex text-text-disabled hover:text-red-400 transition justify-center items-center opacity-0 group-hover:opacity-100"
                                title="Entfernen">
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))}
                <div className="px-3 py-2.5">
                    <button type="button" onClick={addRow}
                        className="flex items-center gap-2 text-text-muted hover:text-text-secondary transition text-sm font-medium">
                        <span className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                            <Plus size={12} />
                        </span>
                        Hopfen hinzufügen
                    </button>
                </div>
            </div>

            {/* Mobile add button */}
            <button type="button" onClick={addRow}
                className="md:hidden w-full py-2.5 bg-surface hover:bg-surface-hover border border-dashed border-border rounded-xl text-text-secondary text-sm font-semibold flex items-center justify-center gap-2 transition group">
                <span className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center group-hover:bg-green-500/20 transition">
                    <Plus size={12} />
                </span>
                Hopfen hinzufügen
            </button>
        </div>
    );
}
