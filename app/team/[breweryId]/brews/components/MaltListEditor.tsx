import { useState, useEffect } from 'react';
import { Trash2, Plus, X, ChevronRight } from 'lucide-react';
import { Command } from 'cmdk';
import { useSupabase } from '@/lib/hooks/useSupabase';

export interface Malt {
    name: string;
    amount: string;
    unit: string;
    color_ebc?: string;
    potential_pts?: string | number;
}

interface MaltListEditorProps {
    value: Malt[] | undefined;
    onChange: (value: Malt[]) => void;
}

function getEBCColor(ebc: number): string {
    if (ebc < 4) return '#F8E783';
    if (ebc < 8) return '#EACA5D';
    if (ebc < 16) return '#D58A39';
    if (ebc < 30) return '#C5622B';
    if (ebc < 50) return '#A83B1B';
    if (ebc < 80) return '#7F1A12';
    if (ebc < 120) return '#5D0908';
    if (ebc < 200) return '#3B0403';
    return '#1A0000';
}

function MaltCombobox({ value, onSelect, malts }: { value: string; onSelect: (update: Partial<Malt>) => void; malts: any[]; }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(value || '');

    useEffect(() => { if (value !== search) setSearch(value || ''); }, [value]);

    return (
        <Command className="relative overflow-visible w-full" shouldFilter={true}>
            <Command.Input
                className="w-full bg-transparent px-0 py-0 text-sm text-text-primary outline-none placeholder:text-text-disabled"
                placeholder="Sorte suchen (z.B. Pilsner, Weizen)…"
                value={search}
                onValueChange={(val) => { setSearch(val); setOpen(true); onSelect({ name: val }); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
            />
            {open && search.length > 0 && (
                <div className="absolute top-full mt-1 z-50 w-full min-w-[280px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col">
                    <Command.List className="overflow-y-auto p-1">
                        <Command.Empty className="p-3 text-sm text-text-muted text-center">Keine Zutaten gefunden.</Command.Empty>
                        {malts.map(m => (
                            <Command.Item
                                key={m.id}
                                value={m.name + " " + (m.aliases ? m.aliases.join(" ") : "")}
                                onSelect={() => {
                                    setSearch(m.name);
                                    onSelect({ name: m.name, color_ebc: m.color_ebc?.toString(), potential_pts: m.potential_pts });
                                    setOpen(false);
                                }}
                                className="px-3 py-2 cursor-pointer rounded-lg hover:bg-surface-hover flex items-center justify-between text-sm data-[selected='true']:bg-surface-hover"
                            >
                                <div className="font-semibold text-text-primary truncate mr-2">{m.name}</div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {m.color_ebc && (
                                        <span className="bg-orange-500/10 text-orange-500 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-500/20">
                                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getEBCColor(m.color_ebc) }} />
                                            {m.color_ebc} EBC
                                        </span>
                                    )}
                                </div>
                            </Command.Item>
                        ))}
                    </Command.List>
                </div>
            )}
        </Command>
    );
}

export function MaltListEditor({ value, onChange }: MaltListEditorProps) {
    const supabase = useSupabase();
    const [items, setItems] = useState<Malt[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [dbMalts, setDbMalts] = useState<any[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    useEffect(() => {
        if (initialized) return;
        if (Array.isArray(value)) setItems(value);
        setInitialized(true);
    }, [value, initialized]);

    useEffect(() => {
        async function fetchMalts() {
            const { data } = await supabase
                .from('ingredient_products')
                .select(`id, name, manufacturer, color_ebc, potential_pts, ingredient_master!inner(type, aliases, name)`)
                .eq('ingredient_master.type', 'malt')
                .order('name');
            if (data) {
                setDbMalts(data.map((p: any) => ({
                    id: p.id,
                    name: p.manufacturer && !p.name.includes(p.manufacturer) ? `${p.name} (${p.manufacturer})` : p.name,
                    color_ebc: p.color_ebc,
                    potential_pts: p.potential_pts,
                    aliases: p.ingredient_master?.aliases || [],
                })));
            }
        }
        fetchMalts();
    }, [supabase]);

    const handleChange = (newItems: Malt[]) => { setItems(newItems); onChange(newItems); };
    const addRow = () => { const idx = items.length; handleChange([...items, { name: '', amount: '', unit: 'kg', color_ebc: '' }]); setEditingIdx(idx); };
    const updateRow = (index: number, field: keyof Malt, val: string) => { const n = [...items]; n[index] = { ...n[index], [field]: val }; handleChange(n); };
    const updateRowPartial = (index: number, updates: Partial<Malt>) => { const n = [...items]; n[index] = { ...n[index], ...updates }; handleChange(n); };
    const removeRow = (index: number) => { handleChange(items.filter((_, i) => i !== index)); setEditingIdx(null); };

    const formatSummary = (item: Malt) => {
        const parts: string[] = [];
        if (item.amount) parts.push(`${item.amount} ${item.unit}`);
        if (item.color_ebc) parts.push(`${item.color_ebc} EBC`);
        return parts.join(' · ');
    };

    const editingItem = editingIdx !== null ? items[editingIdx] : null;

    return (
        <div>
            <label className="text-xs font-bold text-text-disabled uppercase ml-1 block mb-2 tracking-wider">Malz / Fermentables</label>

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
                                {(item.amount || item.color_ebc) && (
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
                        <h2 className="text-base font-bold text-text-primary">Malz bearbeiten</h2>
                        <button type="button" onClick={() => setEditingIdx(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:text-text-primary transition">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Sorte</label>
                            <div className="bg-surface border border-border rounded-xl px-3 py-2.5 focus-within:border-orange-500/50 transition">
                                <MaltCombobox value={editingItem.name} onSelect={(u) => updateRowPartial(editingIdx, u)} malts={dbMalts} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Menge</label>
                            <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-orange-500/50 transition">
                                <input type="text" inputMode="decimal"
                                    className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="0" value={editingItem.amount || ''}
                                    onChange={(e) => updateRow(editingIdx, 'amount', e.target.value.replace(',', '.'))} />
                                <select
                                    className="bg-surface-hover border-l border-border px-3 py-3 text-sm font-bold text-text-secondary outline-none shrink-0"
                                    value={editingItem.unit || 'kg'}
                                    onChange={(e) => updateRow(editingIdx, 'unit', e.target.value)}>
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="lb">lb</option>
                                    <option value="oz">oz</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Farbe (EBC)</label>
                            <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-orange-500/50 transition">
                                <input type="text" inputMode="decimal"
                                    className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="–" value={editingItem.color_ebc || ''}
                                    onChange={(e) => updateRow(editingIdx, 'color_ebc', e.target.value.replace(',', '.'))} />
                                {editingItem.color_ebc && (
                                    <span className="flex items-center px-1.5">
                                        <span className="w-5 h-5 rounded-full border border-border/50" style={{ backgroundColor: getEBCColor(Number(editingItem.color_ebc)) }} />
                                    </span>
                                )}
                                <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">EBC</span>
                            </div>
                        </div>
                        {editingItem.potential_pts && (
                            <div className="flex items-center gap-2 text-xs text-text-muted px-1">
                                <span className="text-orange-400 font-bold">{editingItem.potential_pts} PPG</span>
                                <span>Extraktpotenzial</span>
                            </div>
                        )}
                    </div>
                    <div className="shrink-0 px-4 py-4 border-t border-border flex gap-3">
                        <button type="button" onClick={() => removeRow(editingIdx)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-text-disabled hover:text-red-400 hover:border-red-500/30 transition text-sm font-medium">
                            <Trash2 size={14} /> Löschen
                        </button>
                        <button type="button" onClick={() => setEditingIdx(null)}
                            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition">
                            Fertig
                        </button>
                    </div>
                </div>
            )}

            {/* ── DESKTOP: Merged container ── */}
            <div className="hidden md:block bg-surface border border-border rounded-xl overflow-visible mb-2 divide-y divide-border">
                    <div className="grid grid-cols-[1fr_130px_90px_28px] gap-x-3 px-3 py-1.5 bg-surface-hover/60 rounded-t-xl">
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Malz</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Menge</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider text-right pr-2">EBC</span>
                        <span />
                    </div>
                    {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_130px_90px_28px] gap-x-3 px-3 py-2.5 items-center group">
                            {/* Sorte */}
                            <div className="h-9 flex items-center bg-background border border-border rounded-lg px-2.5 focus-within:border-orange-500/50 transition">
                                <MaltCombobox value={item.name} onSelect={(u) => updateRowPartial(idx, u)} malts={dbMalts} />
                            </div>
                            {/* Menge + Einheit */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-orange-500/50 transition">
                                <input type="text" inputMode="decimal"
                                    className="flex-1 min-w-0 bg-transparent pl-2.5 pr-1 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="0" value={item.amount || ''}
                                    onChange={(e) => updateRow(idx, 'amount', e.target.value.replace(',', '.'))} />
                                <select
                                    className="bg-surface-hover border-l border-border px-1.5 text-xs font-bold text-text-secondary outline-none shrink-0 self-stretch"
                                    value={item.unit || 'kg'}
                                    onChange={(e) => updateRow(idx, 'unit', e.target.value)}>
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="lb">lb</option>
                                    <option value="oz">oz</option>
                                </select>
                            </div>
                            {/* EBC */}
                            <div className="h-9 flex bg-background border border-border rounded-lg overflow-hidden focus-within:border-orange-500/50 transition">
                                <input type="text" inputMode="decimal"
                                    className="flex-1 min-w-0 bg-transparent pl-2 pr-0 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="–" value={item.color_ebc || ''}
                                    onChange={(e) => updateRow(idx, 'color_ebc', e.target.value.replace(',', '.'))} />
                                <span className="flex items-center pl-1.5 pr-2 text-text-disabled text-xs select-none">EBC</span>
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
                        <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <Plus size={12} />
                        </span>
                        Malz hinzufügen
                    </button>
                </div>
            </div>

            {/* Mobile add button */}
            <button type="button" onClick={addRow}
                className="md:hidden w-full py-2.5 bg-surface hover:bg-surface-hover border border-dashed border-border rounded-xl text-text-secondary text-sm font-semibold flex items-center justify-center gap-2 transition group">
                <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:bg-orange-500/20 transition">
                    <Plus size={12} />
                </span>
                Malz hinzufügen
            </button>
        </div>
    );
}
