import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Pencil, Trash2, Thermometer, Clock, Flame, PauseCircle, Flag, Droplets, Info } from 'lucide-react';
import { calculateDecoctionVolume } from '@/lib/brewing-calculations';

// ─── Mash Step Types ─────────────────────────────────────────────
export type MashStepType = 'rest' | 'decoction' | 'mashout' | 'strike';
export type DecoctionForm = 'thick' | 'thin' | 'liquid';

export interface MashStep {
    // Pflichtfelder (alle Verfahren)
    name: string;
    temperature: string;        // Zieltemperatur der Hauptmaische nach diesem Schritt (°C)
    duration: string;           // Rastzeit der Hauptmaische (min)

    // Optionale Metadaten (alle Verfahren)
    step_type?: MashStepType;   // expliziter Typ; wenn leer: 'rest'

    // Nur für Dekoktion relevant
    volume_liters?: string;           // gezogenes Teilmaische-Volumen (L)
    decoction_form?: DecoctionForm;   // Dickmaische / Dünnmaische / Kochwasser
    decoction_rest_temp?: string;     // Temperatur der Teilmaische vor dem Kochen (°C)
    decoction_rest_time?: string;     // Rastzeit der Teilmaische vor dem Kochen (min)
    decoction_boil_time?: string;     // Kochzeit der Teilmaische (min)
}

interface MashStepsEditorProps {
    value: MashStep[] | undefined;
    onChange: (value: MashStep[]) => void;
    mashProcess?: string;           // 'infusion' | 'decoction' | 'step_mash'
    mashInfusionTotal?: string;     // Gesamtmaischevolumen für Volumen-Empfehlung (L)
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
        rest:       { icon: <PauseCircle size={10} />, bg: 'bg-zinc-800', text: 'text-zinc-400' },
        decoction:  { icon: <Flame size={10} />,       bg: 'bg-amber-500/15', text: 'text-amber-500' },
        mashout:    { icon: <Flag size={10} />,         bg: 'bg-red-500/15', text: 'text-red-400' },
        strike:     { icon: <Droplets size={10} />,     bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
    };
    const c = config[t];
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${c.bg} ${c.text}`}>
            {c.icon} {STEP_TYPE_LABELS[t]}
        </span>
    );
}

/** Shared hook: Body-Scroll sperren wenn ein Modal offen ist */
function useBodyScrollLock(isLocked: boolean) {
    useEffect(() => {
        document.body.style.overflow = isLocked ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isLocked]);
}

/** Stellt sicher, dass Einmaischen (strike) am Anfang und Abmaischen (mashout) am Ende stehen */
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
//  1) SINGLE STEP EDITOR — Infusion (1 Zeile, kein Hinzufügen)
// ═══════════════════════════════════════════════════════════════════
function SingleStepEditor({ value, onChange }: Omit<MashStepsEditorProps, 'mashProcess'>) {
    const item: MashStep = Array.isArray(value) && value.length > 0
        ? value[0]
        : { name: 'Kombi-Rast', temperature: '', duration: '', step_type: 'rest' };

    const updateField = (field: keyof MashStep, val: string) => {
        onChange([{ ...item, [field]: val }]);
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Thermometer size={14} className="text-red-500" /> Kombi-Rast
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Zieltemperatur (°C)</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-red-500 outline-none placeholder:text-zinc-700"
                        placeholder="67"
                        value={item.temperature || ''}
                        onChange={(e) => updateField('temperature', e.target.value.replace(',', '.'))}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1"><Clock size={10} /> Rastdauer (min)</label>
                    <input
                        type="number"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-red-500 outline-none placeholder:text-zinc-700"
                        placeholder="60"
                        value={item.duration || ''}
                        onChange={(e) => updateField('duration', e.target.value)}
                    />
                </div>
            </div>
            <p className="text-[10px] text-zinc-600 mt-3">Ein einzelner Temperaturschritt – perfekt für Single-Step Infusion.</p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  2) STEP MASH EDITOR — Stufeninfusion / Zubrüh (mehrere Rasten)
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
        const newItems = [...items];
        const insertIdx = items.length - 1;
        newItems.splice(insertIdx, 0, { name: '', temperature: '', duration: '', step_type: 'rest' });
        handleChange(newItems);
        setEditingIndex(insertIdx);
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Mobile Modal */}
            {editingIndex !== null && items[editingIndex] && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b border-zinc-800 shrink-0">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${items[editingIndex].step_type === 'strike' ? 'bg-cyan-500/10 text-cyan-400' : items[editingIndex].step_type === 'mashout' ? 'bg-red-500/10 text-red-400' : 'bg-red-500/10 text-red-500'}`}>
                                    {items[editingIndex].step_type === 'strike' ? <Droplets size={16} /> : items[editingIndex].step_type === 'mashout' ? <Flag size={16} /> : <Thermometer size={16} />}
                                </span>
                                {items[editingIndex].step_type === 'strike' ? 'Einmaischen' : items[editingIndex].step_type === 'mashout' ? 'Abmaischen' : 'Rast bearbeiten'}
                            </h3>
                            <button onClick={() => setEditingIndex(null)} className="text-zinc-400 hover:text-white bg-zinc-800 p-2 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            {!isFixed(editingIndex) && (
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Name</label>
                                    <input
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-red-500 outline-none placeholder:text-zinc-700"
                                        placeholder="z.B. Maltoserast"
                                        value={items[editingIndex].name}
                                        onChange={(e) => updateRow(editingIndex, 'name', e.target.value)}
                                    />
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Zieltemp. (°C)</label>
                                <input
                                    type="text" inputMode="decimal"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-red-500 outline-none"
                                    placeholder={items[editingIndex].step_type === 'mashout' ? '78' : '57'}
                                    value={items[editingIndex].temperature || ''}
                                    onChange={(e) => updateRow(editingIndex, 'temperature', e.target.value.replace(',', '.'))}
                                />
                            </div>
                            {!isFixed(editingIndex) && (
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Dauer (min)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-red-500 outline-none"
                                        placeholder="45"
                                        value={items[editingIndex].duration || ''}
                                        onChange={(e) => updateRow(editingIndex, 'duration', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-zinc-800 shrink-0 flex gap-3">
                            {!isFixed(editingIndex) && (
                                <button onClick={() => { removeRow(editingIndex); setEditingIndex(null); }} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2"><Trash2 size={16} /> Löschen</button>
                            )}
                            <button onClick={() => setEditingIndex(null)} className={`${isFixed(editingIndex) ? 'flex-1' : 'flex-[2]'} bg-white text-black hover:bg-zinc-200 text-sm font-bold px-4 py-3 rounded-xl transition`}>Übernehmen</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                {/* Mobile View */}
                <div className="block md:hidden space-y-2">
                    {items.map((item, idx) => {
                        const fixed = isFixed(idx);
                        return (
                            <div key={idx} onClick={() => setEditingIndex(idx)} className={`rounded-xl p-3 flex justify-between items-center transition cursor-pointer gap-4 ${fixed ? 'bg-zinc-900 border border-dashed border-zinc-700' : 'bg-zinc-950 border border-zinc-800 active:border-red-500'}`}>
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`h-12 min-w-[3.5rem] px-2 rounded-xl flex items-center justify-center border shrink-0 ${item.step_type === 'strike' ? 'bg-cyan-500/5 border-cyan-500/20' : item.step_type === 'mashout' ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                                        <span className="text-base font-bold text-white">{item.temperature || '—'}</span><span className="text-xs text-zinc-500 ml-0.5 mb-1.5 align-top">°</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {fixed ? (
                                            <StepTypeBadge type={item.step_type} />
                                        ) : (
                                            <>
                                                <div className="text-base font-bold text-white truncate">{item.name || 'Unbenannt'}</div>
                                                <div className="text-[10px] uppercase font-bold text-zinc-400 mt-1 inline-flex items-center bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md tracking-wider"><span className="mr-1">⏳</span> {item.duration || '0'} min</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <Pencil size={18} className="text-zinc-600 shrink-0" />
                            </div>
                        );
                    })}
                    <button onClick={addRestMobile} className="w-full py-3 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 rounded-lg transition border border-dashed border-zinc-800 flex items-center justify-center gap-2">
                        <Plus size={16} /> Rast hinzufügen
                    </button>
                </div>

                {/* Desktop View */}
                <div className="hidden md:block space-y-2">
                    <div className="grid grid-cols-[1fr_80px_80px_30px] gap-2 px-1 mb-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-600">Name</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-600 text-right">Temp. (°C)</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-600 text-right">Dauer (min)</span>
                        <span />
                    </div>
                    {items.map((item, idx) => {
                        const fixed = isFixed(idx);
                        return (
                            <div key={idx} className="animate-in fade-in slide-in-from-top-1 duration-200">
                                {fixed ? (
                                    <div className="grid grid-cols-[1fr_80px_80px_30px] gap-2 items-center">
                                        <div className="px-2 text-sm text-zinc-500">
                                            {item.step_type === 'mashout' ? 'Abmaischen' : 'Einmaischen'}
                                        </div>
                                        <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500 outline-none rounded-lg px-2 py-2 text-sm text-white text-right placeholder:text-zinc-700" placeholder={item.step_type === 'mashout' ? '78' : '57'} value={item.temperature} onChange={(e) => updateRow(idx, 'temperature', e.target.value.replace(',', '.'))} />
                                        <div className="text-center text-zinc-700 text-sm">—</div>
                                        <span />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-[1fr_80px_80px_30px] gap-2 items-center">
                                        <input className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500 outline-none rounded-lg px-2 py-2 text-sm text-white placeholder:text-zinc-700" placeholder="z.B. Maltoserast" value={item.name} onChange={(e) => updateRow(idx, 'name', e.target.value)} />
                                        <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500 outline-none rounded-lg px-2 py-2 text-sm text-white text-right placeholder:text-zinc-700" placeholder="63" value={item.temperature} onChange={(e) => updateRow(idx, 'temperature', e.target.value.replace(',', '.'))} />
                                        <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500 outline-none rounded-lg px-2 py-2 text-sm text-white text-right placeholder:text-zinc-700" placeholder="60" value={item.duration} onChange={(e) => updateRow(idx, 'duration', e.target.value)} />
                                        <button onClick={() => removeRow(idx)} className="text-zinc-600 hover:text-red-400 transition flex justify-center" title="Entfernen"><Trash2 size={16} /></button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <button onClick={addRest} className="w-full mt-2 py-3 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition border border-dashed border-zinc-800 flex items-center justify-center gap-2">
                        <Plus size={16} /> Rast hinzufügen
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  3) DECOCTION EDITOR — Dekoktion (Rasten + Teilmaischen)
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
        newItems.splice(items.length - 1, 0, { name: '', temperature: '', duration: '', step_type: 'decoction', decoction_form: 'thick', volume_liters: '', decoction_boil_time: '', decoction_rest_temp: '', decoction_rest_time: '' });
        handleChange(newItems);
    };

    const addRestMobile = () => {
        const newItems = [...items];
        const insertIdx = items.length - 1;
        newItems.splice(insertIdx, 0, { name: '', temperature: '', duration: '', step_type: 'rest' });
        handleChange(newItems);
        setEditingIndex(insertIdx);
    };
    const addDecoctionMobile = () => {
        const newItems = [...items];
        const insertIdx = items.length - 1;
        newItems.splice(insertIdx, 0, { name: '', temperature: '', duration: '', step_type: 'decoction', decoction_form: 'thick', volume_liters: '', decoction_boil_time: '', decoction_rest_temp: '', decoction_rest_time: '' });
        handleChange(newItems);
        setEditingIndex(insertIdx);
    };

    /** Berechne empfohlenes Dekoktionsvolumen für einen Schritt */
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

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Mobile Modal */}
            {editingIndex !== null && items[editingIndex] && (
                <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col my-auto max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b border-zinc-800 shrink-0">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                {items[editingIndex].step_type === 'strike' ? (
                                    <><span className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center"><Droplets size={16} /></span> Einmaischen</>
                                ) : items[editingIndex].step_type === 'mashout' ? (
                                    <><span className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center"><Flag size={16} /></span> Abmaischen</>
                                ) : items[editingIndex].step_type === 'decoction' ? (
                                    <><span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center"><Flame size={16} /></span> Teilmaische</>
                                ) : (
                                    <><span className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center"><PauseCircle size={16} /></span> Rast</>
                                )}
                            </h3>
                            <button onClick={() => setEditingIndex(null)} className="text-zinc-400 hover:text-white bg-zinc-800 p-2 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            {!isFixed(editingIndex) && (
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Name</label>
                                    <input className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-amber-500 outline-none placeholder:text-zinc-700" placeholder="z.B. Eiweißrast" value={items[editingIndex].name} onChange={(e) => updateRow(editingIndex, 'name', e.target.value)} />
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Zieltemp. (°C)</label>
                                <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-amber-500 outline-none" placeholder={items[editingIndex].step_type === 'mashout' ? '78' : '57'} value={items[editingIndex].temperature || ''} onChange={(e) => updateRow(editingIndex, 'temperature', e.target.value.replace(',', '.'))} />
                            </div>
                            {!isFixed(editingIndex) && (
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Dauer (min)</label>
                                    <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:border-amber-500 outline-none" placeholder="30" value={items[editingIndex].duration || ''} onChange={(e) => updateRow(editingIndex, 'duration', e.target.value)} />
                                </div>
                            )}

                            {/* Teilmaische-Details (nur bei decoction) */}
                            {items[editingIndex].step_type === 'decoction' && (
                                <div className="space-y-4 pt-4 mt-2 border-t border-zinc-800">
                                    <p className="text-[10px] uppercase font-bold text-amber-500/70 tracking-wider flex items-center gap-1"><Flame size={10} /> Parameter Teilmaische</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-zinc-500">Form</label>
                                            <select className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-xl px-3 py-3 text-white" value={items[editingIndex].decoction_form || 'thick'} onChange={(e) => updateRow(editingIndex, 'decoction_form', e.target.value)}>
                                                <option value="thick">Dickmaische</option><option value="thin">Dünnmaische</option><option value="liquid">Kochwasser</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-zinc-500">Volumen (L)</label>
                                            <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-xl px-3 py-3 text-white placeholder:text-zinc-700" placeholder="6.0" value={items[editingIndex].volume_liters || ''} onChange={(e) => updateRow(editingIndex, 'volume_liters', e.target.value.replace(',', '.'))} />
                                            {(() => { const r = getRecommendedVolume(editingIndex); return r ? <p className="text-[10px] text-amber-500/60 flex items-center gap-1 mt-1"><Info size={10} /> Empfohlen: ~{r} L</p> : null; })()}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-zinc-500">Rast vor Kochen (°C)</label>
                                            <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-xl px-3 py-3 text-white placeholder:text-zinc-700" placeholder="72" value={items[editingIndex].decoction_rest_temp || ''} onChange={(e) => updateRow(editingIndex, 'decoction_rest_temp', e.target.value.replace(',', '.'))} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-zinc-500">Rast vor Kochen (min)</label>
                                            <input type="number" className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-xl px-3 py-3 text-white placeholder:text-zinc-700" placeholder="10" value={items[editingIndex].decoction_rest_time || ''} onChange={(e) => updateRow(editingIndex, 'decoction_rest_time', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1"><Flame size={10} /> Kochzeit Teilmaische (min)</label>
                                        <input type="number" className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-xl px-3 py-3 text-white placeholder:text-zinc-700" placeholder="15" value={items[editingIndex].decoction_boil_time || ''} onChange={(e) => updateRow(editingIndex, 'decoction_boil_time', e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-zinc-800 shrink-0 flex gap-3">
                            {!isFixed(editingIndex) && (
                                <button onClick={() => { removeRow(editingIndex); setEditingIndex(null); }} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2"><Trash2 size={16} /> Löschen</button>
                            )}
                            <button onClick={() => setEditingIndex(null)} className={`${isFixed(editingIndex) ? 'flex-1' : 'flex-[2]'} bg-white text-black hover:bg-zinc-200 text-sm font-bold px-4 py-3 rounded-xl transition`}>Übernehmen</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                {/* Mobile View */}
                <div className="block md:hidden space-y-2">
                    {items.map((item, idx) => {
                        const fixed = isFixed(idx);
                        return (
                            <div key={idx} onClick={() => setEditingIndex(idx)} className={`rounded-xl p-3 flex justify-between items-center transition cursor-pointer gap-4 ${fixed ? 'bg-zinc-900 border border-dashed border-zinc-700' : 'bg-zinc-950 border border-zinc-800 active:border-amber-500'}`}>
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`h-12 min-w-[3.5rem] px-2 rounded-xl flex items-center justify-center border shrink-0 ${item.step_type === 'strike' ? 'bg-cyan-500/5 border-cyan-500/20' : item.step_type === 'mashout' ? 'bg-red-500/5 border-red-500/20' : item.step_type === 'decoction' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                                        <span className="text-base font-bold text-white">{item.temperature || '—'}</span><span className="text-xs text-zinc-500 ml-0.5 mb-1.5 align-top">°</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {fixed ? (
                                            <StepTypeBadge type={item.step_type} />
                                        ) : (
                                            <>
                                                <div className="text-base font-bold text-white truncate">{item.name || 'Unbenannt'}</div>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    <StepTypeBadge type={item.step_type} />
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 tracking-wider"><span className="mr-1">⏳</span> {item.duration || '0'} min</span>
                                                    {item.step_type === 'decoction' && item.volume_liters && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 tracking-wider">{item.volume_liters} L {DECOCTION_FORM_LABELS[item.decoction_form || 'thick']}</span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <Pencil size={18} className="text-zinc-600 shrink-0" />
                            </div>
                        );
                    })}
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={addRestMobile} className="w-full py-3 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 rounded-lg transition border border-dashed border-zinc-800 flex items-center justify-center gap-2"><Plus size={16} /> Rast</button>
                        <button onClick={addDecoctionMobile} className="w-full py-3 text-sm font-bold text-amber-500 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-lg transition border border-dashed border-amber-500/30 flex items-center justify-center gap-2"><Flame size={14} /> Teilmaische</button>
                    </div>
                </div>

                {/* Desktop View */}
                <div className="hidden md:block space-y-2">
                    <div className="grid grid-cols-[100px_1fr_80px_80px_30px] gap-2 px-1 mb-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-600">Typ</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-600">Name</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-600 text-right">Temp. (°C)</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-600 text-right">Dauer (min)</span>
                        <span />
                    </div>
                    {items.map((item, idx) => {
                        const fixed = isFixed(idx);
                        return (
                            <div key={idx} className="animate-in slide-in-from-top-2 duration-200">
                                {fixed ? (
                                    /* Einmaischen / Abmaischen: im gleichen Grid ausrichten */
                                    <div className="grid grid-cols-[100px_1fr_80px_80px_30px] gap-2 items-center">
                                        <div className="col-span-2 px-1 text-sm text-zinc-500">
                                            {item.step_type === 'mashout' ? 'Abmaischen' : 'Einmaischen'}
                                        </div>
                                        <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-lg px-2 py-2 text-sm text-white text-right placeholder:text-zinc-700" placeholder={item.step_type === 'mashout' ? '78' : '57'} value={item.temperature} onChange={(e) => updateRow(idx, 'temperature', e.target.value.replace(',', '.'))} />
                                        <div className="text-center text-zinc-700 text-sm">—</div>
                                        <span />
                                    </div>
                                ) : item.step_type !== 'decoction' ? (
                                    /* Rast-Zeile (kompakt) */
                                    <div className="grid grid-cols-[100px_1fr_80px_80px_30px] gap-2 items-center">
                                        <div><StepTypeBadge type={item.step_type} /></div>
                                        <input className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-lg px-2 py-2 text-sm text-white placeholder:text-zinc-700" placeholder="z.B. Maltoserast" value={item.name} onChange={(e) => updateRow(idx, 'name', e.target.value)} />
                                        <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-lg px-2 py-2 text-sm text-white text-right placeholder:text-zinc-700" placeholder="63" value={item.temperature} onChange={(e) => updateRow(idx, 'temperature', e.target.value.replace(',', '.'))} />
                                        <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-lg px-2 py-2 text-sm text-white text-right placeholder:text-zinc-700" placeholder="30" value={item.duration} onChange={(e) => updateRow(idx, 'duration', e.target.value)} />
                                        <button onClick={() => removeRow(idx)} className="text-zinc-600 hover:text-red-400 transition flex justify-center" title="Entfernen"><Trash2 size={16} /></button>
                                    </div>
                                ) : (
                                    /* Teilmaische-Zeile (kompakt integriert) */
                                    <div className="space-y-1 mt-1 mb-2 group">
                                        <div className="grid grid-cols-[100px_1fr_80px_80px_30px] gap-2 items-center">
                                            <div><StepTypeBadge type={item.step_type} /></div>
                                            <input className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-lg px-2 py-2 text-sm text-white placeholder:text-zinc-700" placeholder="z.B. Dekoktion 1" value={item.name} onChange={(e) => updateRow(idx, 'name', e.target.value)} />
                                            <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-lg px-2 py-2 text-sm text-white text-right placeholder:text-zinc-700" placeholder="72" value={item.temperature} onChange={(e) => updateRow(idx, 'temperature', e.target.value.replace(',', '.'))} />
                                            <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 outline-none rounded-lg px-2 py-2 text-sm text-white text-right placeholder:text-zinc-700" placeholder="30" value={item.duration} onChange={(e) => updateRow(idx, 'duration', e.target.value)} />
                                            <button onClick={() => removeRow(idx)} className="text-zinc-600 hover:text-red-400 transition flex justify-center py-2" title="Entfernen"><Trash2 size={16} /></button>
                                        </div>
                                        <div className="grid grid-cols-[100px_1fr_30px] gap-2">
                                            <div />
                                            <div className="grid grid-cols-5 gap-2 items-end bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                                                <div>
                                                    <label className="text-[8px] uppercase font-bold text-amber-500/80 mb-1 flex justify-between items-center w-full">Vol (L) {(() => { const r = getRecommendedVolume(idx); return r ? <span className="lowercase font-normal">~{r}L</span> : null; })()}</label>
                                                    <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-amber-500/20 focus:border-amber-500 outline-none rounded px-2 py-1 text-xs text-white placeholder:text-zinc-700" placeholder="6.0" value={item.volume_liters || ''} onChange={(e) => updateRow(idx, 'volume_liters', e.target.value.replace(',', '.'))} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] uppercase font-bold text-amber-500/80 mb-1 block">Kochzeit (m)</label>
                                                    <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-amber-500/20 focus:border-amber-500 outline-none rounded px-2 py-1 text-xs text-white placeholder:text-zinc-700" placeholder="15" value={item.decoction_boil_time || ''} onChange={(e) => updateRow(idx, 'decoction_boil_time', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] uppercase font-bold text-amber-500/80 mb-1 block">R. v. Koch(°C)</label>
                                                    <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-amber-500/20 focus:border-amber-500 outline-none rounded px-2 py-1 text-xs text-white placeholder:text-zinc-700" placeholder="72" value={item.decoction_rest_temp || ''} onChange={(e) => updateRow(idx, 'decoction_rest_temp', e.target.value.replace(',', '.'))} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] uppercase font-bold text-amber-500/80 mb-1 block">R. v. Koch(m)</label>
                                                    <input type="text" inputMode="decimal" className="w-full bg-zinc-950 border border-amber-500/20 focus:border-amber-500 outline-none rounded px-2 py-1 text-xs text-white placeholder:text-zinc-700" placeholder="10" value={item.decoction_rest_time || ''} onChange={(e) => updateRow(idx, 'decoction_rest_time', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] uppercase font-bold text-amber-500/80 mb-1 block">Form</label>
                                                    <select className="w-full bg-zinc-950 border border-amber-500/20 focus:border-amber-500 outline-none rounded px-1 py-1 text-xs text-white" value={item.decoction_form || 'thick'} onChange={(e) => updateRow(idx, 'decoction_form', e.target.value)}>
                                                        <option value="thick">Dick.</option><option value="thin">Dünn.</option><option value="liquid">Flüs.</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Zwei separate Hinzufügen-Buttons */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <button onClick={addRest} className="w-full py-3 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition border border-dashed border-zinc-800 flex items-center justify-center gap-2">
                            <Plus size={16} /> Rast hinzufügen
                        </button>
                        <button onClick={addDecoction} className="w-full py-3 text-sm font-bold text-amber-500 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-lg transition border border-dashed border-amber-500/30 flex items-center justify-center gap-2">
                            <Flame size={14} /> Teilmaische hinzufügen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN WRAPPER — rendert je nach mashProcess den richtigen Editor
// ═══════════════════════════════════════════════════════════════════
export function MashStepsEditor(props: MashStepsEditorProps) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 block">Maischplan / Rasten</label>
            </div>
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