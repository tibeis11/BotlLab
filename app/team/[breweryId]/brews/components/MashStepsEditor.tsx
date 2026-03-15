import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Thermometer, Flame, PauseCircle, Flag, Droplets, ChevronRight } from 'lucide-react';
import { calculateDecoctionVolume } from '@/lib/brewing-calculations';

// ─── Mash Step Types ─────────────────────────────────────────────
export type MashStepType = 'rest' | 'decoction' | 'mashout' | 'strike';
export type DecoctionForm = 'thick' | 'thin' | 'liquid';

export interface MashStep {
    name: string;
    temperature: string;
    duration: string;
    step_type?: MashStepType;
    volume_liters?: string;
    decoction_form?: DecoctionForm;
    decoction_rest_temp?: string;
    decoction_rest_time?: string;
    decoction_boil_time?: string;
}

interface MashStepsEditorProps {
    value: MashStep[] | undefined;
    onChange: (value: MashStep[]) => void;
    mashProcess?: string;
    mashInfusionTotal?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────
const STEP_TYPE_LABELS: Record<MashStepType, string> = {
    rest: 'Rast',
    decoction: 'Teilmaische',
    mashout: 'Abmaischen',
    strike: 'Einmaischen',
};

const DECOCTION_FORM_LABELS: Record<DecoctionForm, string> = {
    thick: 'Dickmaische',
    thin: 'Dünnmaische',
    liquid: 'Kochwasser',
};

function StepTypeBadge({ type }: { type?: MashStepType }) {
    const t = type || 'rest';
    const config: Record<MashStepType, { icon: React.ReactNode; bg: string; text: string }> = {
        rest:      { icon: <PauseCircle size={10} />, bg: 'bg-surface-hover',  text: 'text-text-secondary' },
        decoction: { icon: <Flame size={10} />,       bg: 'bg-amber-500/15',   text: 'text-amber-500' },
        mashout:   { icon: <Flag size={10} />,         bg: 'bg-red-500/15',     text: 'text-error' },
        strike:    { icon: <Droplets size={10} />,     bg: 'bg-cyan-500/15',    text: 'text-cyan-400' },
    };
    const c = config[t];
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${c.bg} ${c.text}`}>
            {c.icon} {STEP_TYPE_LABELS[t]}
        </span>
    );
}

function useBodyScrollLock(isLocked: boolean) {
    useEffect(() => {
        document.body.style.overflow = isLocked ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isLocked]);
}

function ensureBookends(steps: MashStep[]): MashStep[] {
    const result = [...steps];
    if (result.length === 0 || result[0].step_type !== 'strike') {
        result.unshift({ name: 'Einmaischen', temperature: '', duration: '', step_type: 'strike' });
    }
    if (result.length <= 1 || result[result.length - 1].step_type !== 'mashout') {
        result.push({ name: 'Abmaischen', temperature: '78', duration: '', step_type: 'mashout' });
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════
//  1) SINGLE STEP EDITOR – Infusion (eine Kombirast)
// ═══════════════════════════════════════════════════════════════════
function SingleStepEditor({ value, onChange }: Omit<MashStepsEditorProps, 'mashProcess'>) {
    const item: MashStep = Array.isArray(value) && value.length > 0
        ? value[0]
        : { name: 'Kombi-Rast', temperature: '', duration: '', step_type: 'rest' };

    const updateField = (field: keyof MashStep, val: string) => {
        onChange([{ ...item, [field]: val }]);
    };

    return (
        <div className="bg-surface border border-border rounded-xl overflow-visible mb-2 divide-y divide-border">
            <div className="grid grid-cols-2 gap-x-3 px-3 py-1.5 bg-surface-hover/60 rounded-t-xl">
                <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Zieltemperatur</span>
                <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Rastdauer</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 px-3 py-2.5 items-center">
                <div className="h-9 flex items-center bg-background border border-border rounded-lg overflow-hidden focus-within:border-red-500/50 transition">
                    <input
                        type="text"
                        inputMode="decimal"
                        className="flex-1 min-w-0 bg-transparent pl-2.5 pr-1 text-sm text-text-primary outline-none placeholder:text-text-disabled"
                        placeholder="67"
                        value={item.temperature || ''}
                        onChange={(e) => updateField('temperature', e.target.value.replace(',', '.'))}
                    />
                    <span className="pr-2.5 text-text-disabled text-xs select-none">°C</span>
                </div>
                <div className="h-9 flex items-center bg-background border border-border rounded-lg overflow-hidden focus-within:border-red-500/50 transition">
                    <input
                        type="text"
                        inputMode="decimal"
                        className="flex-1 min-w-0 bg-transparent pl-2.5 pr-1 text-sm text-text-primary outline-none placeholder:text-text-disabled"
                        placeholder="60"
                        value={item.duration || ''}
                        onChange={(e) => updateField('duration', e.target.value)}
                    />
                    <span className="pr-2.5 text-text-disabled text-xs select-none">min</span>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  2) STEP MASH EDITOR – Stufeninfusion / Zubrüh
// ═══════════════════════════════════════════════════════════════════
function StepMashEditor({ value, onChange }: Omit<MashStepsEditorProps, 'mashProcess'>) {
    const items = useMemo(() => ensureBookends(Array.isArray(value) ? value : []), [value]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useBodyScrollLock(editingIndex !== null);

    const handleChange = (newItems: MashStep[]) => onChange(newItems);

    const updateRow = (index: number, field: keyof MashStep, val: string | undefined) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        handleChange(newItems);
    };

    const removeRow = (index: number) => {
        if (index === 0 || index === items.length - 1) return;
        handleChange(items.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
    };

    const isFixed = (idx: number) => idx === 0 || idx === items.length - 1;

    const addRest = () => {
        const newItems = [...items];
        newItems.splice(items.length - 1, 0, { name: '', temperature: '', duration: '', step_type: 'rest' });
        handleChange(newItems);
    };

    const addRestMobile = () => {
        const insertIdx = items.length - 1;
        const newItems = [...items];
        newItems.splice(insertIdx, 0, { name: '', temperature: '', duration: '', step_type: 'rest' });
        handleChange(newItems);
        setEditingIndex(insertIdx);
    };

    const editingItem = editingIndex !== null ? items[editingIndex] : null;
    const editFixed = editingIndex !== null ? isFixed(editingIndex) : false;

    const formatSummary = (item: MashStep, fixed: boolean) => {
        const parts: string[] = [];
        if (item.temperature) parts.push(`${item.temperature} °C`);
        if (!fixed && item.duration) parts.push(`${item.duration} min`);
        return parts.join(' · ');
    };

    return (
        <div className="space-y-2 animate-in fade-in duration-200">

            {/* ── MOBILE: Full-screen edit sheet ── */}
            {editingItem !== null && editingIndex !== null && (
                <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                            {editingItem.step_type === 'strike' ? (
                                <span className="w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center"><Droplets size={14} /></span>
                            ) : editingItem.step_type === 'mashout' ? (
                                <span className="w-7 h-7 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"><Flag size={14} /></span>
                            ) : (
                                <span className="w-7 h-7 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"><Thermometer size={14} /></span>
                            )}
                            {editingItem.step_type === 'strike' ? 'Einmaischen' : editingItem.step_type === 'mashout' ? 'Abmaischen' : 'Rast bearbeiten'}
                        </h2>
                        <button type="button" onClick={() => setEditingIndex(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:text-text-primary transition">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
                        {!editFixed && (
                            <div>
                                <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Name</label>
                                <div className="bg-surface border border-border rounded-xl px-3 focus-within:border-red-500/50 transition">
                                    <input
                                        className="w-full bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-disabled"
                                        placeholder="z.B. Maltoserast"
                                        value={editingItem.name}
                                        onChange={(e) => updateRow(editingIndex, 'name', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Zieltemperatur (°C)</label>
                            <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-red-500/50 transition">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder={editingItem.step_type === 'mashout' ? '78' : '63'}
                                    value={editingItem.temperature || ''}
                                    onChange={(e) => updateRow(editingIndex, 'temperature', e.target.value.replace(',', '.'))}
                                />
                                <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">°C</span>
                            </div>
                        </div>
                        {!editFixed && (
                            <div>
                                <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Dauer (min)</label>
                                <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-red-500/50 transition">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                        placeholder="45"
                                        value={editingItem.duration || ''}
                                        onChange={(e) => updateRow(editingIndex, 'duration', e.target.value)}
                                    />
                                    <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">min</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="shrink-0 px-4 py-4 border-t border-border flex gap-3">
                        {!editFixed && (
                            <button type="button" onClick={() => { removeRow(editingIndex); setEditingIndex(null); }} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-text-disabled hover:text-red-400 hover:border-red-500/30 transition text-sm font-medium">
                                <Trash2 size={14} /> Löschen
                            </button>
                        )}
                        <button type="button" onClick={() => setEditingIndex(null)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition">
                            Fertig
                        </button>
                    </div>
                </div>
            )}

            {/* ── MOBILE: Compact list ── */}
            <div className="md:hidden bg-surface border border-border rounded-xl overflow-hidden mb-2 divide-y divide-border">
                {items.map((item, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => setEditingIndex(idx)}
                        className="w-full flex items-center gap-3 px-3 py-3 text-left"
                    >
                        <div className={`h-10 min-w-[3rem] px-1.5 rounded-lg flex items-center justify-center border shrink-0 ${item.step_type === 'strike' ? 'bg-cyan-500/5 border-cyan-500/20' : item.step_type === 'mashout' ? 'bg-red-500/5 border-red-500/20' : 'bg-surface border-border'}`}>
                            <span className="text-sm font-bold text-text-primary leading-tight">{item.temperature || '—'}</span>
                            <span className="text-[10px] text-text-muted ml-0.5 mb-1 self-end">°</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-text-primary truncate">
                                {item.step_type === 'strike' ? 'Einmaischen' : item.step_type === 'mashout' ? 'Abmaischen' : item.name || <span className="text-text-disabled italic font-normal">Unbenannt</span>}
                            </div>
                            {(item.temperature || (!isFixed(idx) && item.duration)) && (
                                <div className="text-xs text-text-muted mt-0.5">{formatSummary(item, isFixed(idx))}</div>
                            )}
                        </div>
                        <ChevronRight size={14} className="text-text-disabled shrink-0" />
                    </button>
                ))}
            </div>
            {/* ── DESKTOP: Merged container ── */}
            <div className="hidden md:block bg-surface border border-border rounded-xl overflow-visible mb-2 divide-y divide-border">
                <div className="grid grid-cols-[1fr_90px_90px_28px] gap-x-3 px-3 py-1.5 bg-surface-hover/60 rounded-t-xl">
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Name</span>
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider text-right">Temp.</span>
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider text-right">Dauer</span>
                    <span />
                </div>
                {items.map((item, idx) => {
                    const fixed = isFixed(idx);
                    return (
                        <div key={idx} className="grid grid-cols-[1fr_90px_90px_28px] gap-x-3 px-3 py-2.5 items-center group">
                            {/* Name */}
                            {fixed ? (
                                <div className="h-9 flex items-center px-1">
                                    <StepTypeBadge type={item.step_type} />
                                </div>
                            ) : (
                                <div className="h-9 flex items-center bg-background border border-border rounded-lg overflow-hidden focus-within:border-red-500/50 transition">
                                    <input
                                        className="flex-1 min-w-0 bg-transparent pl-2.5 pr-2.5 text-sm text-text-primary outline-none placeholder:text-text-disabled"
                                        placeholder="z.B. Maltoserast"
                                        value={item.name}
                                        onChange={(e) => updateRow(idx, 'name', e.target.value)}
                                    />
                                </div>
                            )}
                            {/* Temp */}
                            <div className="h-9 flex items-center bg-background border border-border rounded-lg overflow-hidden focus-within:border-red-500/50 transition">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="flex-1 min-w-0 bg-transparent pl-2 pr-1 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder={item.step_type === 'mashout' ? '78' : '63'}
                                    value={item.temperature}
                                    onChange={(e) => updateRow(idx, 'temperature', e.target.value.replace(',', '.'))}
                                />
                                <span className="pr-2 text-text-disabled text-xs select-none">°C</span>
                            </div>
                            {/* Duration */}
                            {fixed ? (
                                <div className="h-9 flex items-center justify-center text-text-disabled text-sm">—</div>
                            ) : (
                                <div className="h-9 flex items-center bg-background border border-border rounded-lg overflow-hidden focus-within:border-red-500/50 transition">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="flex-1 min-w-0 bg-transparent pl-2 pr-1 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                        placeholder="60"
                                        value={item.duration}
                                        onChange={(e) => updateRow(idx, 'duration', e.target.value)}
                                    />
                                    <span className="pr-2 text-text-disabled text-xs select-none">min</span>
                                </div>
                            )}
                            {/* Delete */}
                            {fixed ? (
                                <span />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => removeRow(idx)}
                                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 text-text-disabled hover:text-red-500 transition"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
                <div className="px-3 py-2.5 rounded-b-xl hidden md:block">
                </div>
            </div>

            <button type="button" onClick={addRestMobile}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition">
                <Plus size={16} /> Rast hinzufügen
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  3) DECOCTION EDITOR – Dekoktion
// ═══════════════════════════════════════════════════════════════════
function DecoctionEditor({ value, onChange, mashInfusionTotal }: Omit<MashStepsEditorProps, 'mashProcess'>) {
    const items = useMemo(() => ensureBookends(Array.isArray(value) ? value : []), [value]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useBodyScrollLock(editingIndex !== null);

    const handleChange = (newItems: MashStep[]) => onChange(newItems);

    const updateRow = (index: number, field: keyof MashStep, val: string | undefined) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        handleChange(newItems);
    };

    const removeRow = (index: number) => {
        if (index === 0 || index === items.length - 1) return;
        handleChange(items.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
    };

    const isFixed = (idx: number) => idx === 0 || idx === items.length - 1;

    const addRest = () => {
        const newItems = [...items];
        newItems.splice(items.length - 1, 0, { name: '', temperature: '', duration: '', step_type: 'rest' });
        handleChange(newItems);
    };

    const addDecoction = () => {
        const newItems = [...items];
        newItems.splice(items.length - 1, 0, {
            name: '', temperature: '', duration: '', step_type: 'decoction',
            decoction_form: 'thick', volume_liters: '', decoction_boil_time: '',
            decoction_rest_temp: '', decoction_rest_time: '',
        });
        handleChange(newItems);
    };

    const addRestMobile = () => {
        const insertIdx = items.length - 1;
        const newItems = [...items];
        newItems.splice(insertIdx, 0, { name: '', temperature: '', duration: '', step_type: 'rest' });
        handleChange(newItems);
        setEditingIndex(insertIdx);
    };

    const addDecoctionMobile = () => {
        const insertIdx = items.length - 1;
        const newItems = [...items];
        newItems.splice(insertIdx, 0, {
            name: '', temperature: '', duration: '', step_type: 'decoction',
            decoction_form: 'thick', volume_liters: '', decoction_boil_time: '',
            decoction_rest_temp: '', decoction_rest_time: '',
        });
        handleChange(newItems);
        setEditingIndex(insertIdx);
    };

    const getRecommendedVolume = (idx: number): number | null => {
        const totalVol = parseFloat(mashInfusionTotal || '0');
        if (totalVol <= 0) return null;
        const step = items[idx];
        if (!step || step.step_type !== 'decoction') return null;
        const prevTemp = idx > 0 ? parseFloat(items[idx - 1]?.temperature || '0') : 0;
        const targetTemp = parseFloat(step.temperature || '0');
        if (prevTemp <= 0 || targetTemp <= prevTemp) return null;
        return calculateDecoctionVolume(totalVol, prevTemp, targetTemp, 100, step.decoction_form || 'thick');
    };

    const editingItem = editingIndex !== null ? items[editingIndex] : null;
    const editFixed = editingIndex !== null ? isFixed(editingIndex) : false;

    const formatSummary = (item: MashStep, fixed: boolean) => {
        const parts: string[] = [];
        if (item.temperature) parts.push(`${item.temperature} °C`);
        if (!fixed && item.duration) parts.push(`${item.duration} min`);
        if (item.step_type === 'decoction' && item.volume_liters) parts.push(`${item.volume_liters} L ${DECOCTION_FORM_LABELS[item.decoction_form || 'thick']}`);
        return parts.join(' · ');
    };

    return (
        <div className="space-y-2 animate-in fade-in duration-200">

            {/* ── MOBILE: Full-screen edit sheet ── */}
            {editingItem !== null && editingIndex !== null && (
                <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                            {editingItem.step_type === 'strike' ? (
                                <span className="w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center"><Droplets size={14} /></span>
                            ) : editingItem.step_type === 'mashout' ? (
                                <span className="w-7 h-7 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"><Flag size={14} /></span>
                            ) : editingItem.step_type === 'decoction' ? (
                                <span className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center"><Flame size={14} /></span>
                            ) : (
                                <span className="w-7 h-7 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"><Thermometer size={14} /></span>
                            )}
                            {editingItem.step_type === 'strike' ? 'Einmaischen' : editingItem.step_type === 'mashout' ? 'Abmaischen' : editingItem.step_type === 'decoction' ? 'Teilmaische' : 'Rast bearbeiten'}
                        </h2>
                        <button type="button" onClick={() => setEditingIndex(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:text-text-primary transition">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
                        {!editFixed && (
                            <div>
                                <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Name</label>
                                <div className="bg-surface border border-border rounded-xl px-3 focus-within:border-red-500/50 transition">
                                    <input
                                        className="w-full bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-disabled"
                                        placeholder={editingItem.step_type === 'decoction' ? 'z.B. Dekoktion 1' : 'z.B. Maltoserast'}
                                        value={editingItem.name}
                                        onChange={(e) => updateRow(editingIndex, 'name', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Zieltemperatur (°C)</label>
                            <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-red-500/50 transition">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                    placeholder={editingItem.step_type === 'mashout' ? '78' : '63'}
                                    value={editingItem.temperature || ''}
                                    onChange={(e) => updateRow(editingIndex, 'temperature', e.target.value.replace(',', '.'))}
                                />
                                <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">°C</span>
                            </div>
                        </div>
                        {!editFixed && (
                            <div>
                                <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Dauer (min)</label>
                                <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-red-500/50 transition">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                        placeholder="30"
                                        value={editingItem.duration || ''}
                                        onChange={(e) => updateRow(editingIndex, 'duration', e.target.value)}
                                    />
                                    <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">min</span>
                                </div>
                            </div>
                        )}
                        {/* Teilmaische-Details */}
                        {editingItem.step_type === 'decoction' && (
                            <div className="space-y-4 pt-4 mt-2 border-t border-amber-500/20">
                                <p className="text-[10px] uppercase font-bold text-amber-500/80 tracking-wider flex items-center gap-1"><Flame size={10} /> Parameter Teilmaische</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Form</label>
                                        <div className="h-11 flex items-center bg-surface border border-border rounded-xl overflow-hidden focus-within:border-amber-500/50 transition">
                                            <select
                                                className="flex-1 bg-transparent px-3 text-sm text-text-primary outline-none self-stretch"
                                                value={editingItem.decoction_form || 'thick'}
                                                onChange={(e) => updateRow(editingIndex, 'decoction_form', e.target.value)}
                                            >
                                                <option value="thick">Dickmaische</option>
                                                <option value="thin">Dünnmaische</option>
                                                <option value="liquid">Kochwasser</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">
                                            Volumen (L)
                                            {(() => { const r = getRecommendedVolume(editingIndex); return r ? <span className="ml-1 text-amber-500/60 font-normal lowercase">~{r}L</span> : null; })()}
                                        </label>
                                        <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-amber-500/50 transition">
                                            <input
                                                type="text" inputMode="decimal"
                                                className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                                placeholder="6.0"
                                                value={editingItem.volume_liters || ''}
                                                onChange={(e) => updateRow(editingIndex, 'volume_liters', e.target.value.replace(',', '.'))}
                                            />
                                            <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">L</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                                        <Flame size={10} className="text-amber-500" /> Kochzeit Teilmaische (min)
                                    </label>
                                    <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-amber-500/50 transition">
                                        <input
                                            type="text" inputMode="decimal"
                                            className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                            placeholder="15"
                                            value={editingItem.decoction_boil_time || ''}
                                            onChange={(e) => updateRow(editingIndex, 'decoction_boil_time', e.target.value)}
                                        />
                                        <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">min</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Rast v. Kochen (°C)</label>
                                        <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-amber-500/50 transition">
                                            <input
                                                type="text" inputMode="decimal"
                                                className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                                placeholder="72"
                                                value={editingItem.decoction_rest_temp || ''}
                                                onChange={(e) => updateRow(editingIndex, 'decoction_rest_temp', e.target.value.replace(',', '.'))}
                                            />
                                            <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">°C</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-text-disabled uppercase tracking-wider mb-1.5 block">Rast v. Kochen (min)</label>
                                        <div className="flex bg-surface border border-border rounded-xl overflow-hidden focus-within:border-amber-500/50 transition">
                                            <input
                                                type="text" inputMode="decimal"
                                                className="flex-1 bg-transparent pl-3.5 pr-2 py-3 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                                placeholder="10"
                                                value={editingItem.decoction_rest_time || ''}
                                                onChange={(e) => updateRow(editingIndex, 'decoction_rest_time', e.target.value)}
                                            />
                                            <span className="flex items-center pr-3.5 text-text-disabled text-sm select-none">min</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="shrink-0 px-4 py-4 border-t border-border flex gap-3">
                        {!editFixed && (
                            <button type="button" onClick={() => { removeRow(editingIndex); setEditingIndex(null); }} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-text-disabled hover:text-red-400 hover:border-red-500/30 transition text-sm font-medium">
                                <Trash2 size={14} /> Löschen
                            </button>
                        )}
                        <button type="button" onClick={() => setEditingIndex(null)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition">
                            Fertig
                        </button>
                    </div>
                </div>
            )}

            {/* ── MOBILE: Compact list ── */}
            <div className="md:hidden bg-surface border border-border rounded-xl overflow-hidden mb-2 divide-y divide-border">
                {items.map((item, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => setEditingIndex(idx)}
                        className="w-full flex items-center gap-3 px-3 py-3 text-left"
                    >
                        <div className={`h-10 min-w-[3rem] px-1.5 rounded-lg flex items-center justify-center border shrink-0 ${item.step_type === 'strike' ? 'bg-cyan-500/5 border-cyan-500/20' : item.step_type === 'mashout' ? 'bg-red-500/5 border-red-500/20' : item.step_type === 'decoction' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-surface border-border'}`}>
                            <span className="text-sm font-bold text-text-primary leading-tight">{item.temperature || '—'}</span>
                            <span className="text-[10px] text-text-muted ml-0.5 mb-1 self-end">°</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-text-primary truncate flex items-center gap-2">
                                {item.step_type === 'strike' ? 'Einmaischen' : item.step_type === 'mashout' ? 'Abmaischen' : item.name || <span className="text-text-disabled italic font-normal">Unbenannt</span>}
                                {item.step_type === 'decoction' && <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"><Flame size={8} /> Dek.</span>}
                            </div>
                            <div className="text-xs text-text-muted mt-0.5">{formatSummary(item, isFixed(idx))}</div>
                        </div>
                        <ChevronRight size={14} className="text-text-disabled shrink-0" />
                    </button>
                ))}
            </div>

            {/* ── DESKTOP: Merged container ── */}
            <div className="hidden md:block bg-surface border border-border rounded-xl overflow-visible mb-2 divide-y divide-border">
                <div className="grid grid-cols-[110px_1fr_90px_90px_28px] gap-x-3 px-3 py-1.5 bg-surface-hover/60 rounded-t-xl">
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Typ</span>
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider">Name</span>
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider text-right">Temp.</span>
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider text-right">Dauer</span>
                    <span />
                </div>
                {items.map((item, idx) => {
                    const fixed = isFixed(idx);
                    return (
                        <div key={idx} className="group">
                            <div className="grid grid-cols-[110px_1fr_90px_90px_28px] gap-x-3 px-3 py-2.5 items-center">
                                {/* Typ */}
                                <div className="h-9 flex items-center">
                                    <StepTypeBadge type={item.step_type} />
                                </div>
                                {/* Name */}
                                {fixed ? (
                                    <div className="h-9 flex items-center px-1 text-sm text-text-muted">
                                        {item.step_type === 'strike' ? 'Einmaischen' : 'Abmaischen'}
                                    </div>
                                ) : (
                                    <div className="h-9 flex items-center bg-background border border-border rounded-lg overflow-hidden focus-within:border-red-500/50 transition">
                                        <input
                                            className="flex-1 min-w-0 bg-transparent pl-2.5 pr-2.5 text-sm text-text-primary outline-none placeholder:text-text-disabled"
                                            placeholder={item.step_type === 'decoction' ? 'z.B. Dekoktion 1' : 'z.B. Maltoserast'}
                                            value={item.name}
                                            onChange={(e) => updateRow(idx, 'name', e.target.value)}
                                        />
                                    </div>
                                )}
                                {/* Temp */}
                                <div className="h-9 flex items-center bg-background border border-border rounded-lg overflow-hidden focus-within:border-red-500/50 transition">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="flex-1 min-w-0 bg-transparent pl-2 pr-1 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                        placeholder={item.step_type === 'mashout' ? '78' : '63'}
                                        value={item.temperature}
                                        onChange={(e) => updateRow(idx, 'temperature', e.target.value.replace(',', '.'))}
                                    />
                                    <span className="pr-2 text-text-disabled text-xs select-none">°C</span>
                                </div>
                                {/* Duration */}
                                {fixed ? (
                                    <div className="h-9 flex items-center justify-center text-text-disabled text-sm">—</div>
                                ) : (
                                    <div className="h-9 flex items-center bg-background border border-border rounded-lg overflow-hidden focus-within:border-red-500/50 transition">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className="flex-1 min-w-0 bg-transparent pl-2 pr-1 text-sm text-text-primary outline-none text-right placeholder:text-text-disabled"
                                            placeholder="30"
                                            value={item.duration}
                                            onChange={(e) => updateRow(idx, 'duration', e.target.value)}
                                        />
                                        <span className="pr-2 text-text-disabled text-xs select-none">min</span>
                                    </div>
                                )}
                                {/* Delete */}
                                {fixed ? (
                                    <span />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => removeRow(idx)}
                                        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 text-text-disabled hover:text-red-500 transition"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            {/* Decoction sub-row */}
                            {item.step_type === 'decoction' && (
                                <div className="grid grid-cols-[110px_1fr_28px] gap-x-3 px-3 pb-3">
                                    <div />
                                    <div className="grid grid-cols-5 gap-2 bg-amber-500/5 px-2.5 py-2 rounded-lg border border-amber-500/20">
                                        <div>
                                            <label className="text-[8px] uppercase font-bold text-amber-500/80 mb-1 flex justify-between items-center">
                                                Vol (L)
                                                {(() => { const r = getRecommendedVolume(idx); return r ? <span className="lowercase font-normal text-amber-500/60">~{r}L</span> : null; })()}
                                            </label>
                                            <input type="text" inputMode="decimal" className="w-full bg-background border border-amber-500/20 focus:border-amber-500/50 outline-none rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-disabled" placeholder="6.0" value={item.volume_liters || ''} onChange={(e) => updateRow(idx, 'volume_liters', e.target.value.replace(',', '.'))} />
                                        </div>
                                        <div>
                                            <label className="text-[8px] uppercase font-bold text-amber-500/80 mb-1 block">Koch (min)</label>
                                            <input type="text" inputMode="decimal" className="w-full bg-background border border-amber-500/20 focus:border-amber-500/50 outline-none rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-disabled" placeholder="15" value={item.decoction_boil_time || ''} onChange={(e) => updateRow(idx, 'decoction_boil_time', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[8px] uppercase font-bold text-amber-500/80 mb-1 block">Rast (°C)</label>
                                            <input type="text" inputMode="decimal" className="w-full bg-background border border-amber-500/20 focus:border-amber-500/50 outline-none rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-disabled" placeholder="72" value={item.decoction_rest_temp || ''} onChange={(e) => updateRow(idx, 'decoction_rest_temp', e.target.value.replace(',', '.'))} />
                                        </div>
                                        <div>
                                            <label className="text-[8px] uppercase font-bold text-amber-500/80 mb-1 block">Rast (min)</label>
                                            <input type="text" inputMode="decimal" className="w-full bg-background border border-amber-500/20 focus:border-amber-500/50 outline-none rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-disabled" placeholder="10" value={item.decoction_rest_time || ''} onChange={(e) => updateRow(idx, 'decoction_rest_time', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[8px] uppercase font-bold text-amber-500/80 mb-1 block">Form</label>
                                            <select className="w-full bg-background border border-amber-500/20 focus:border-amber-500/50 outline-none rounded px-1 py-1 text-xs text-text-primary" value={item.decoction_form || 'thick'} onChange={(e) => updateRow(idx, 'decoction_form', e.target.value)}>
                                                <option value="thick">Dick.</option>
                                                <option value="thin">Dünn.</option>
                                                <option value="liquid">Flüs.</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div className="flex gap-2">
                <button type="button" onClick={addRestMobile}
                    className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 py-2 text-sm font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition">
                    <Plus size={16} /> Rast
                </button>
                <button type="button" onClick={addDecoctionMobile}
                    className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-3 py-2 text-sm font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition">
                    <Flame size={16} /> Teilmaische
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN WRAPPER
// ═══════════════════════════════════════════════════════════════════
export function MashStepsEditor(props: MashStepsEditorProps) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-text-disabled uppercase ml-1 block tracking-wider">Maischplan / Rasten</label>
            {props.mashProcess === 'infusion' ? (
                <SingleStepEditor {...props} />
            ) : props.mashProcess === 'decoction' ? (
                <DecoctionEditor {...props} />
            ) : (
                <StepMashEditor {...props} />
            )}
        </div>
    );
}
