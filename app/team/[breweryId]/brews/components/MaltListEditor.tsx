import { useState, useEffect } from 'react';
import { Trash2, Plus, X, ChevronRight } from 'lucide-react';
import { Command } from 'cmdk';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { FALLBACK_MASTER_ID_SET } from '@/lib/ingredients/constants';

export interface Malt {
    name: string;
    amount: string;
    unit: string;
    color_ebc?: string;
    potential_pts?: string | number;
    manufacturer?: string;
    master_id?: string;
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

interface MasterMalt {
    id: string;
    name: string;
    aliases: string[];    color_ebc?: number;
    potential_pts?: number;    products: ProductMalt[];
}

interface ProductMalt {
    id: string;
    name: string;
    manufacturer: string;
    color_ebc: number | null;
    potential_pts: number | null;
}

function SorteCombobox({ value, onSelect, onFreeText, malts }: { value: string; onSelect: (master: MasterMalt) => void; onFreeText?: (name: string) => void; malts: MasterMalt[]; }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(value || '');

    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    useEffect(() => { if (value !== search) setSearch(value || ''); }, [value]);

    return (
        <Command className="relative overflow-visible w-full h-full" shouldFilter={true}>
            <Command.Input
                className="w-full bg-transparent px-0 py-0 text-sm text-text-primary outline-none placeholder:text-text-disabled h-full"
                placeholder="Sorte suchen…"
                value={search}
                onValueChange={(val) => { setSearch(val); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => {
                    setOpen(false);
                    if (search !== value && onFreeText) onFreeText(search);
                }, 200)}
            />
            <div className={`absolute ${open ? "" : "hidden"} top-full mt-1 left-0 z-50 w-full min-w-[280px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col`}>
                    <Command.List className="overflow-y-auto p-1">
                        <Command.Empty className="p-3 text-sm text-text-muted text-center">Keine Sorte gefunden.</Command.Empty>
                        {malts.map(m => (
                            <Command.Item
                                key={m.id}
                                value={m.name + " " + (m.aliases ? m.aliases.join(" ") : "")}
                                onSelect={() => {
                                    setSearch(m.name);
                                    onSelect(m);
                                    setOpen(false);
                                }}
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

function AdjunktCombobox({ value, onSelect, onFreeText, miscs }: { value: string; onSelect: (master: MasterMalt) => void; onFreeText?: (name: string) => void; miscs: MasterMalt[]; }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(value || '');

    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    useEffect(() => { if (value !== search) setSearch(value || ''); }, [value]);

    return (
        <Command className="relative overflow-visible w-full h-full" shouldFilter={true}>
            <Command.Input
                className="w-full bg-transparent px-0 py-0 text-sm text-text-primary outline-none placeholder:text-text-disabled h-full"
                placeholder="Adjunkt suchen…"
                value={search}
                onValueChange={(val) => { setSearch(val); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => {
                    setOpen(false);
                    if (search !== value && onFreeText) onFreeText(search);
                }, 200)}
            />
            <div className={`absolute ${open ? "" : "hidden"} top-full mt-1 left-0 z-50 w-full min-w-[280px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col`}>
                    <Command.List className="overflow-y-auto p-1">
                        <Command.Empty className="p-3 text-sm text-text-muted text-center">Kein Adjunkt gefunden.</Command.Empty>
                        {miscs.map(m => (
                            <Command.Item
                                key={m.id}
                                value={m.name + " " + (m.aliases ? m.aliases.join(" ") : "")}
                                onSelect={() => {
                                    setSearch(m.name);
                                    onSelect(m);
                                    setOpen(false);
                                }}
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

function ManufacturerCombobox({ value, onSelect, products, disabled }: { value: string; onSelect: (manufacturer: string) => void; products: { manufacturer: string }[]; disabled?: boolean; }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(value || '');

    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    useEffect(() => { if (value !== search) setSearch(value || ''); }, [value]);

    return (
        <Command className="relative overflow-visible w-full h-full" shouldFilter={true}>
            <Command.Input
                className="w-full bg-transparent px-0 py-0 text-sm text-text-primary outline-none placeholder:text-text-disabled h-full disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={disabled ? "(Nicht verfügbar)" : "Hersteller suchen…"}
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
                            onSelect={() => {
                                setSearch("");
                                onSelect("");
                                setOpen(false);
                            }}
                            className="px-3 py-2 cursor-pointer rounded-lg hover:bg-surface-hover flex items-center justify-between text-sm data-[selected='true']:bg-surface-hover mb-1"
                        >
                            <div className="font-semibold text-text-primary truncate italic text-text-muted">(Beliebiger Hersteller)</div>
                        </Command.Item>

                        {products.map((p, i) => (
                            <Command.Item
                                key={i}
                                value={p.manufacturer}
                                onSelect={() => {
                                    setSearch(p.manufacturer);
                                    onSelect(p.manufacturer);
                                    setOpen(false);
                                }}
                                className="px-3 py-2 cursor-pointer rounded-lg hover:bg-surface-hover flex items-center justify-between text-sm data-[selected='true']:bg-surface-hover"
                            >
                                <div className="font-semibold text-text-primary truncate">{p.manufacturer}</div>
                            </Command.Item>
                        ))}
                    </Command.List>
                </div>
        </Command>
    );
}

export function MaltListEditor({ value, onChange }: MaltListEditorProps) {
    const supabase = useSupabase();
    const [items, setItems] = useState<Malt[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [dbMalts, setDbMalts] = useState<MasterMalt[]>([]);
    const [dbMiscs, setDbMiscs] = useState<MasterMalt[]>([]);
    const [miscIds, setMiscIds] = useState<Set<string>>(new Set());
    const [adjunktNewIndices, setAdjunktNewIndices] = useState<Set<number>>(new Set());
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    useEffect(() => {
        if (initialized) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(value)) setItems(value);
        setInitialized(true);
    }, [value, initialized]);

    useEffect(() => {
        async function fetchIngredients() {
            const [maltResult, miscResult] = await Promise.all([
                supabase
                    .from('ingredient_master')
                    .select(`id, name, aliases, color_ebc, potential_pts, ingredient_products(id, name, manufacturer, color_ebc, potential_pts)`)
                    .eq('type', 'malt')
                    .order('name'),
                supabase
                    .from('ingredient_master')
                    .select(`id, name, aliases, color_ebc, potential_pts, ingredient_products(id, name, manufacturer, color_ebc, potential_pts)`)
                    .eq('type', 'misc')
                    .order('name'),
            ]);

            function buildMap(data: any[]): MasterMalt[] {
                const uniqueMap = new Map<string, MasterMalt>();
                data.forEach((m: any) => {
                    const products = (m.ingredient_products || []).filter((p: any) => p.manufacturer);
                    if (uniqueMap.has(m.name)) {
                        const existing = uniqueMap.get(m.name)!;
                        const mergedProducts = [...(existing.products || [])];
                        products.forEach((p: any) => {
                            if (!mergedProducts.some(ep => ep.manufacturer === p.manufacturer)) {
                                mergedProducts.push(p);
                            }
                        });
                        existing.products = mergedProducts;
                    } else {
                        uniqueMap.set(m.name, {
                            id: m.id,
                            name: m.name,
                            aliases: m.aliases || [],
                            color_ebc: m.color_ebc,
                            potential_pts: m.potential_pts,
                            products
                        });
                    }
                });
                return Array.from(uniqueMap.values());
            }

            if (maltResult.data) setDbMalts(buildMap(maltResult.data));
            if (miscResult.data) {
                const miscList = buildMap(miscResult.data);
                setDbMiscs(miscList);
                setMiscIds(new Set(miscResult.data.map((m: any) => m.id)));
            }
        }
        fetchIngredients();
    }, [supabase]);

    const isAdjunkt = (idx: number, item: Malt) =>
        adjunktNewIndices.has(idx) || !!(item.master_id && miscIds.has(item.master_id));

    const handleChange = (newItems: Malt[]) => { setItems(newItems); onChange(newItems); };

    const addRow = () => {
        const idx = items.length;
        handleChange([...items, { name: '', amount: '', unit: 'kg', color_ebc: '' }]);
        setEditingIdx(idx);
    };

    const addAdjunkt = () => {
        const idx = items.length;
        handleChange([...items, { name: '', amount: '', unit: 'kg', color_ebc: '' }]);
        setAdjunktNewIndices(prev => new Set([...prev, idx]));
        setEditingIdx(idx);
    };

    const updateRow = (index: number, field: keyof Malt, val: string) => { const n = [...items]; n[index] = { ...n[index], [field]: val }; handleChange(n); };
    const updateRowPartial = (index: number, updates: Partial<Malt>) => { const n = [...items]; n[index] = { ...n[index], ...updates }; handleChange(n); };

    const removeRow = (index: number) => {
        handleChange(items.filter((_, i) => i !== index));
        setEditingIdx(null);
        setAdjunktNewIndices(prev => {
            const next = new Set<number>();
            prev.forEach(i => { if (i !== index) next.add(i > index ? i - 1 : i); });
            return next;
        });
    };

    const formatSummary = (item: Malt) => {
        const parts: string[] = [];
        if (item.manufacturer) parts.push(item.manufacturer);
        if (item.amount) parts.push(`${item.amount} ${item.unit}`);
        if (item.color_ebc) parts.push(`${item.color_ebc} EBC`);
        return parts.join(' · ');
    };

    const handleSorteSelect = (index: number, master: MasterMalt) => {
        const updates: Partial<Malt> = {
            name: master.name,
            master_id: master.id,
            manufacturer: '',
            color_ebc: master.color_ebc ? master.color_ebc.toString() : '',
            potential_pts: master.potential_pts ? master.potential_pts.toString() : ''
        };
        updateRowPartial(index, updates);
    };

    const handleFreeText = (index: number, name: string) => {
        const exactMatch = dbMalts.find(m => m.name.toLowerCase() === name.toLowerCase());
        if (exactMatch) {
            handleSorteSelect(index, exactMatch);
        } else {
            updateRowPartial(index, { name, master_id: undefined });
        }
    };

    const handleAdjunktFreeText = (index: number, name: string) => {
        const exactMatch = dbMiscs.find(m => m.name.toLowerCase() === name.toLowerCase());
        if (exactMatch) {
            handleSorteSelect(index, exactMatch);
        } else {
            updateRowPartial(index, { name, master_id: undefined });
        }
    };

    const handleManufacturerSelect = (index: number, manufacturer: string) => {
        const item = items[index];
        const master = isAdjunkt(index, item)
            ? dbMiscs.find(m => m.name === item.name)
            : dbMalts.find(m => m.name === item.name);
        if (!master) {
            updateRowPartial(index, { manufacturer });
            return;
        }

        if (!manufacturer) {
            updateRowPartial(index, {
                manufacturer: '',
                color_ebc: master.color_ebc ? master.color_ebc.toString() : '',
                potential_pts: master.potential_pts ? master.potential_pts.toString() : ''
            });
            return;
        }

        const product = master.products.find(p => p.manufacturer === manufacturer);
        if (product) {
            updateRowPartial(index, {
                manufacturer,
                color_ebc: product.color_ebc?.toString() || (master.color_ebc ? master.color_ebc.toString() : ''),
                potential_pts: product.potential_pts?.toString() || (master.potential_pts ? master.potential_pts.toString() : '')
            });
        } else {
            updateRowPartial(index, { manufacturer });
        }
    };

    const editingItem = editingIdx !== null ? items[editingIdx] : null;
    const editingIsAdjunkt = editingIdx !== null && editingItem !== null && isAdjunkt(editingIdx, editingItem);
    const editingMaster = editingItem
        ? editingIsAdjunkt
            ? dbMiscs.find(m => m.name === editingItem.name)
            : dbMalts.find(m => m.name === editingItem.name)
        : null;

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
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-text-primary truncate">
                                        {item.name || <span className="text-text-disabled italic font-normal">Sorte wählen…</span>}
                                    </span>
                                    {isAdjunkt(idx, item) && (
                                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border text-yellow-400 bg-yellow-500/10 border-yellow-500/20">Adjunkt</span>
                                    )}
                                    {item.name && !isAdjunkt(idx, item) && (!item.master_id || FALLBACK_MASTER_ID_SET.has(item.master_id)) && (
                                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20">Neu</span>
                                    )}
                                </div>
                                {(item.amount || item.color_ebc || item.manufacturer) && (
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
                        <h2 className="text-base font-bold text-text-primary">
                            {editingIsAdjunkt ? 'Adjunkt bearbeiten' : 'Malz bearbeiten'}
                        </h2>
                        <button type="button" onClick={() => setEditingIdx(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:text-text-primary transition">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">
                                {editingIsAdjunkt ? 'Adjunkt' : 'Sorte'}
                            </label>
                            <div className={`bg-surface border border-border rounded-xl px-3 py-2.5 transition ${editingIsAdjunkt ? 'focus-within:border-yellow-500/50' : 'focus-within:border-orange-500/50'}`}>
                                {editingIsAdjunkt
                                    ? <AdjunktCombobox value={editingItem.name} onSelect={(master) => handleSorteSelect(editingIdx, master)} onFreeText={(name) => handleAdjunktFreeText(editingIdx, name)} miscs={dbMiscs} />
                                    : <SorteCombobox value={editingItem.name} onSelect={(master) => handleSorteSelect(editingIdx, master)} onFreeText={(name) => handleFreeText(editingIdx, name)} malts={dbMalts} />
                                }
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Hersteller (Optional)</label>
                            <div className={`flex bg-surface border border-border rounded-xl px-3 py-2.5 overflow-visible transition relative h-12 ${editingIsAdjunkt ? 'focus-within:border-yellow-500/50' : 'focus-within:border-orange-500/50'}`}>
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
                            <div className={`flex bg-surface border border-border rounded-xl overflow-hidden transition ${editingIsAdjunkt ? 'focus-within:border-yellow-500/50' : 'focus-within:border-orange-500/50'}`}>
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
                            <div className={`flex bg-surface border border-border rounded-xl overflow-hidden transition ${editingIsAdjunkt ? 'focus-within:border-yellow-500/50' : 'focus-within:border-orange-500/50'}`}>
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
                            className={`flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition ${editingIsAdjunkt ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                            Fertig
                        </button>
                    </div>
                </div>
            )}

            {/* ── DESKTOP: Merged container ── */}
            <div className="hidden md:block bg-surface border border-border rounded-xl overflow-visible mb-2 divide-y divide-border">
                    <div className="grid grid-cols-[1.5fr_1.5fr_130px_90px_28px] gap-x-3 px-3 py-1.5 bg-surface-hover/60 rounded-t-xl">
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Sorte</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Hersteller (Opt.)</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Menge</span>
                        <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider text-right pr-2">EBC</span>
                        <span />
                    </div>
                    {items.map((item, idx) => {
                        const adjunkt = isAdjunkt(idx, item);
                        const masterForThisItem = adjunkt
                            ? dbMiscs.find(m => m.name === item.name)
                            : dbMalts.find(m => m.name === item.name);
                        return (
                        <div key={idx} className="grid grid-cols-[1.5fr_1.5fr_130px_90px_28px] gap-x-3 px-3 py-2.5 items-center group relative focus-within:z-[60]">
                            {/* Sorte / Adjunkt */}
                            <div className={`h-9 flex items-center bg-background border rounded-lg px-2.5 transition ${
                                adjunkt
                                    ? 'border-yellow-500/40 focus-within:border-yellow-500/60'
                                    : item.name && (!item.master_id || FALLBACK_MASTER_ID_SET.has(item.master_id))
                                        ? 'border-amber-500/40 focus-within:border-orange-500/50'
                                        : 'border-border focus-within:border-orange-500/50'
                            }`}>
                                {adjunkt
                                    ? <AdjunktCombobox value={item.name} onSelect={(master) => handleSorteSelect(idx, master)} onFreeText={(name) => handleAdjunktFreeText(idx, name)} miscs={dbMiscs} />
                                    : <SorteCombobox value={item.name} onSelect={(master) => handleSorteSelect(idx, master)} onFreeText={(name) => handleFreeText(idx, name)} malts={dbMalts} />
                                }
                            </div>
                            {/* Hersteller */}
                            <div className={`h-9 flex bg-background border border-border rounded-lg overflow-visible transition relative pl-2.5 ${adjunkt ? 'focus-within:border-yellow-500/50' : 'focus-within:border-orange-500/50'}`}>
                                <ManufacturerCombobox
                                    value={item.manufacturer || ''}
                                    products={masterForThisItem?.products || []}
                                    onSelect={(val) => handleManufacturerSelect(idx, val)}
                                    disabled={!masterForThisItem || masterForThisItem.products.length === 0}
                                />
                            </div>
                            {/* Menge + Einheit */}
                            <div className={`h-9 flex bg-background border border-border rounded-lg overflow-hidden transition ${adjunkt ? 'focus-within:border-yellow-500/50' : 'focus-within:border-orange-500/50'}`}>
                                <input type="text" inputMode="decimal"
                                    className="flex-1 min-w-0 bg-transparent pl-2.5 pr-1 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder="0" value={item.amount || ''}
                                    onChange={(e) => updateRow(idx, 'amount', e.target.value.replace(',', '.'))} />
                                <select
                                    className="bg-surface-hover border-l border-border px-1.5 text-xs font-bold text-text-secondary outline-none shrink-0 self-stretch appearance-none pr-5 relative"
                                    value={item.unit || 'kg'}
                                    onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%237D7E81%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.2rem top 50%', backgroundSize: '0.4rem auto' }}
                                >
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="lb">lb</option>
                                    <option value="oz">oz</option>
                                </select>
                            </div>
                            {/* EBC */}
                            <div className={`h-9 flex bg-background border border-border rounded-lg overflow-hidden transition ${adjunkt ? 'focus-within:border-yellow-500/50' : 'focus-within:border-orange-500/50'}`}>
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
                    )})}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={addRow}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 rounded-xl transition">
                    <Plus size={16} /> Malz hinzufügen
                </button>
                <button type="button" onClick={addAdjunkt}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-xl transition">
                    <Plus size={16} /> Adjunkt hinzufügen
                </button>
            </div>
        </div>
    );
}
