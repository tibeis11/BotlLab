'use client';

import { useSession } from '../../SessionContext';
import { PhaseTitle } from './PhaseLayout';
import { useState, useMemo } from 'react';
import {
    Thermometer,
    Droplets,
    Wind,
    Plus,
    Activity,
    Pencil,
    Trash2,
    Check,
    X,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Dna,
    Clock,
    Scale,
    FlaskConical
} from 'lucide-react';
import { FermentationGraph } from '../FermentationGraph';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { calculateABVFromSG, platoToSG, sgToPlato } from '@/lib/brewing-calculations';
import { BotlGuideTrigger } from '@/app/components/BotlGuideTrigger';
import { BotlGuideKey } from '@/lib/botlguide/BotlGuideContext';
import { useBotlGuide } from '@/lib/botlguide/hooks/useBotlGuide';
import { BotlGuidePersonaPill } from '@/app/components/BotlGuideBadge';
import { BotlGuideResponse } from '@/app/components/BotlGuideResponse';

// ── Helpers ────────────────────────────────────────────────────────────────
const CALIB_TEMP = 20; // °C – standard hydrometer calibration

function correctForTemp(sg: number, tempC: number): number {
    return sg + 0.000130 * (tempC - CALIB_TEMP);
}
    
const MetricCard = ({ label, value, unit, subtext, color = 'zinc', guideKey }: { label: string, value: string | number | null, unit?: string, subtext?: string, color?: 'zinc' | 'cyan' | 'emerald' | 'orange' | 'blue' | 'purple', guideKey?: BotlGuideKey }) => {
    const colorMap = {
        zinc: 'text-text-primary',
        cyan: 'text-brand',
        emerald: 'text-emerald-400',
        orange: 'text-orange-400',
        blue: 'text-blue-400',
        purple: 'text-purple-400'
    };
    
    return (
        <div className="flex flex-col justify-between h-full md:bg-surface md:border md:border-border md:rounded-lg md:p-4 py-2 px-1 border-b border-border/50 md:border-b-0 last:border-0">
            <div>
                <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{label}</div>
                    {guideKey && <BotlGuideTrigger guideKey={guideKey} />}
                </div>
                <div className={`text-2xl font-mono font-bold tracking-tight flex items-baseline gap-1 ${colorMap[color]}`}>
                    {value !== null && value !== undefined && value !== '—' ? value : '—'} 
                    {value && value !== '—' && unit && <span className="text-xs text-text-disabled font-bold ml-1">{unit}</span>}
                </div>
            </div>
            {subtext && <div className="text-[10px] text-text-disabled font-medium mt-1 md:mt-2 md:pt-2 md:border-t md:border-border/50">{subtext}</div>}
        </div>
    );
};

type DisplayUnit = 'sg' | 'plato';

function fmtGravity(sg: number | null | undefined, unit: DisplayUnit): string {
    if (!sg || sg < 0.9) return '—';
    const norm = sg > 2 ? platoToSG(sg) : sg;
    if (unit === 'plato') return `${sgToPlato(norm).toFixed(1)}`;
    return norm.toFixed(3);
}

function fmtGravityWithUnit(sg: number | null | undefined, unit: DisplayUnit): string {
    if (!sg || sg < 0.9) return '—';
    const val = fmtGravity(sg, unit);
    return unit === 'plato' ? `${val}` : val;
}

function parseGravityInput(raw: string, unit: DisplayUnit): number | null {
    const n = parseFloat(raw.replace(',', '.'));
    if (isNaN(n)) return null;
    return unit === 'plato' ? platoToSG(n) : n;
}

function nowLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Component ──────────────────────────────────────────────────────────────
export function FermentationTab() {
    const { session, measurements, addEvent, addMeasurement, updateMeasurement, deleteMeasurement } = useSession();

    // ─ Display preference ─
    const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('sg');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [addSaving, setAddSaving] = useState(false);

    // ─ Yeast Harvest State ─
    const [showHarvest, setShowHarvest] = useState(false);
    const [hGeneration, setHGeneration] = useState('1');
    const [hVolume, setHVolume] = useState('');
    const [hNote, setHNote] = useState('');

    // ─ Add form state ─
    const [aGravity, setAGravity] = useState('');
    const [aTemp, setATemp] = useState('');
    const [aNote, setANote] = useState('');
    const [aPressure, setAPressure] = useState('');
    const [aDatetime, setADatetime] = useState(nowLocal());

    // ─ Inline edit state ─
    const [editingId, setEditingId] = useState<string | null>(null);
    const [eGravity, setEGravity] = useState('');
    const [eTemp, setETemp] = useState('');
    const [eNote, setENote] = useState('');

    // ─ Delete confirmation ─
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // ─ BotlGuide Coach AI ─
    const coachHook = useBotlGuide();
    const [activeCoachCap, setActiveCoachCap] = useState<'analyze' | 'predict' | null>(null);

    const handleCoachAnalyze = async (cap: 'analyze' | 'predict') => {
        setActiveCoachCap(cap);
        coachHook.reset();
        const capability = cap === 'analyze' ? 'coach.analyze_fermentation' : 'coach.predict_fg';
        const measurementPayload = measurements.map(m => ({
            gravity: m.gravity,
            temperature: m.temperature,
            measured_at: m.measured_at,
            note: m.note,
        }));
        await coachHook.generate({
            capability,
            context: {
                brewStyle: session?.brew?.style ?? undefined,
                brewType: ((session?.brew as any)?.brew_type ?? undefined) as import('@/lib/botlguide/types').BotlGuideSessionContext['brewType'],
                yeast: session?.brew?.recipe_data?.yeast?.name ?? session?.brew?.recipe_data?.yeast ?? undefined,
                targetOG: session?.measured_og ?? session?.brew?.recipe_data?.og ?? undefined,
                targetFG: session?.brew?.recipe_data?.fg ?? session?.brew?.recipe_data?.target_fg ?? undefined,
            },
            data: {
                measurements: measurementPayload,
                ogSG: ogSG ?? undefined,
                currentABV: currentABV ?? undefined,
            },
            cacheKey: `coach_${cap}_${session?.id}_${measurements.length}`,
        });
    };

    // ─ KPI ─
    const latestM = measurements.length > 0 ? measurements[measurements.length - 1] : null;
    const currentSG = latestM?.gravity || null;
    const ogSG = session?.measured_og ? (session.measured_og > 2 ? platoToSG(session.measured_og) : session.measured_og) : null;

    const currentABV = useMemo(() => {
        if (!ogSG || !currentSG) return null;
        const curSG = currentSG > 2 ? platoToSG(currentSG) : currentSG;
        return calculateABVFromSG(ogSG, curSG);
    }, [ogSG, currentSG]);

    const attenuation = useMemo(() => {
        if (!ogSG || !currentSG) return null;
        const cur = currentSG > 2 ? platoToSG(currentSG) : currentSG;
        if (ogSG <= 1) return null;
        return ((ogSG - cur) / (ogSG - 1)) * 100;
    }, [ogSG, currentSG]);

    // ─ Live temp correction for add form ─
    const addCorrectedSG = useMemo(() => {
        const sg = parseGravityInput(aGravity, displayUnit);
        const temp = parseFloat(aTemp.replace(',', '.'));
        if (!sg || isNaN(temp)) return null;
        return correctForTemp(sg, temp);
    }, [aGravity, aTemp, displayUnit]);

    // ─ Handlers ─
    const handleAdd = async () => {
        const sg = parseGravityInput(aGravity, displayUnit);
        if (!sg) return;
        setAddSaving(true);
        try {
            await addMeasurement({
                gravity: sg,
                temperature: aTemp ? parseFloat(aTemp.replace(',', '.')) : undefined,
                pressure: aPressure ? parseFloat(aPressure.replace(',', '.')) : undefined,
                note: aNote || undefined,
                source: 'manual',
                measured_at: new Date(aDatetime).toISOString(),
            });
            await addEvent({
                type: 'MEASUREMENT_SG',
                title: 'Messwert erfasst',
                data: { gravity: sg, temperature: aTemp || null, unit: 'sg' }
            });
            setAGravity(''); setATemp(''); setANote(''); setAPressure('');
            setADatetime(nowLocal());
            setShowAddForm(false);
        } finally {
            setAddSaving(false);
        }
    };

    const handleHarvest = async () => {
        if (!hVolume) return;
        try {
            await addEvent({
                type: 'YEAST_HARVEST',
                title: 'Hefe geerntet',
                description: `${hVolume}ml (Gen. ${hGeneration}) — ${hNote}`,
                data: { volume: hVolume, generation: hGeneration, note: hNote }
            });
            setShowHarvest(false);
            setHVolume(''); setHNote('');
        } catch (e) {
            console.error('Harvest log failed', e);
        }
    };

    const startEdit = (m: any) => {
        setEditingId(m.id);
        setEGravity(displayUnit === 'plato' ? sgToPlato(m.gravity).toFixed(1) : m.gravity.toFixed(3));
        setETemp(m.temperature != null ? String(m.temperature) : '');
        setENote(m.note || '');
        setConfirmDeleteId(null);
    };

    const saveEdit = async (id: string) => {
        const sg = parseGravityInput(eGravity, displayUnit);
        if (!sg || !updateMeasurement) return;
        await updateMeasurement(id, {
            gravity: sg,
            temperature: eTemp ? parseFloat(eTemp.replace(',', '.')) : (null as any),
            note: eNote || (null as any),
        });
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        if (!deleteMeasurement) return;
        await deleteMeasurement(id);
        setConfirmDeleteId(null);
    };

    // ─ Render ─
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-text-primary tracking-tight">Gärung & Verlauf</h2>
                    <p className="text-text-muted text-sm">Überwache den Gärprozess für <span className="font-mono text-text-muted">#{session?.batch_code || session?.brew?.name}</span></p>
                 </div>
                <div className="flex items-center gap-2">
                    {/* SG / Plato toggle */}
                    <div className="flex bg-surface border border-border rounded-lg overflow-hidden text-[10px] font-bold">
                        <button
                            onClick={() => setDisplayUnit('sg')}
                            className={`px-3 py-1.5 transition-colors ${displayUnit === 'sg' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        >SG</button>
                        <div className="w-px bg-border" />
                        <button
                            onClick={() => setDisplayUnit('plato')}
                            className={`px-3 py-1.5 transition-colors ${displayUnit === 'plato' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        >°P</button>
                    </div>
                    
                    {measurements.length >= 2 && (
                        <>
                            <button
                                onClick={() => handleCoachAnalyze('analyze')}
                                disabled={coachHook.isLoading}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border bg-surface border-border text-emerald-400 hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40"
                            >
                                <Activity className="w-3.5 h-3.5" />
                                <span>Analysieren</span>
                            </button>
                            <button
                                onClick={() => handleCoachAnalyze('predict')}
                                disabled={coachHook.isLoading}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border bg-surface border-border text-blue-400 hover:border-blue-500/50 hover:text-blue-300 disabled:opacity-40"
                            >
                                <Activity className="w-3.5 h-3.5" />
                                <span>FG vorhersagen</span>
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => { setShowAddForm(v => !v); setEditingId(null); setConfirmDeleteId(null); }}
                        className={`text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors border ${showAddForm ? 'bg-surface-hover text-text-primary border-border' : 'bg-emerald-600 hover:bg-emerald-500 border-transparent text-text-primary'}`}
                    >
                        {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
                        <span>{showAddForm ? 'Abbrechen' : 'Messwert erfassen'}</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <MetricCard 
                    label="Aktuell" 
                    value={fmtGravityWithUnit(currentSG, displayUnit)} 
                    unit={displayUnit === 'sg' ? 'SG' : '°P'}
                    subtext={currentSG && displayUnit === 'sg' ? `≈ ${sgToPlato(currentSG).toFixed(1)}°P` : undefined}
                    guideKey="gaerung.sg_eingabe"
                />
                <MetricCard 
                    label="Alkohol (ABV)" 
                    value={currentABV != null ? currentABV.toFixed(1) : '—'} 
                    unit="%"
                    color="emerald"
                    subtext={currentABV ? "Geschätzt" : undefined}
                    guideKey="gaerung.endverwaerungsgrad"
                />
                <MetricCard 
                    label="Vergärung" 
                    value={attenuation != null ? attenuation.toFixed(0) : '—'}
                    unit="%"
                    color="blue"
                    subtext={attenuation ? "Scheinbarer EVG" : undefined}
                />
                <MetricCard 
                    label="Temperatur" 
                    value={latestM?.temperature != null ? latestM.temperature : '—'} 
                    unit="°C"
                    color="orange"
                    subtext={latestM?.measured_at ? `Zuletzt: ${format(new Date(latestM.measured_at), 'HH:mm')}` : undefined}
                />
            </div>

            {/* BotlGuide Coach Analysis */}
            {(coachHook.isLoading || coachHook.text || coachHook.error || coachHook.upgradeRequired) && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <BotlGuidePersonaPill persona="BotlGuide Coach" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            {activeCoachCap === 'predict' ? 'FG-Prognose' : 'Gärungsanalyse'}
                        </span>
                    </div>
                    <BotlGuideResponse
                        text={coachHook.text ?? undefined}
                        persona="BotlGuide Coach"
                        capability={activeCoachCap === 'analyze' ? 'coach.analyze_fermentation' : activeCoachCap === 'predict' ? 'coach.predict_fg' : undefined}
                        isLoading={coachHook.isLoading}
                        error={coachHook.error ?? undefined}
                        upgradeRequired={coachHook.upgradeRequired}
                        creditsUsed={coachHook.lastCreditsUsed ?? undefined}
                        onRetry={() => activeCoachCap && handleCoachAnalyze(activeCoachCap)}
                    />
                </div>
            )}

            {/* Inline Add Form Container */}
            {showAddForm && (
                <div className="bg-surface border border-emerald-500/30 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                         <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <Plus className="w-3 h-3" /> Neuer Messwert
                         </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Gravity */}
                        <div>
                            <label className="text-[9px] font-bold uppercase text-text-muted tracking-wider mb-1 flex items-center justify-between">
                                <span>Dichte ({displayUnit === 'sg' ? 'SG' : '°Plato'})</span>
                                <BotlGuideTrigger guideKey="gaerung.sg_eingabe" />
                            </label>
                            <input
                                type="text" inputMode="decimal" autoFocus
                                placeholder={displayUnit === 'sg' ? 'z.B. 1.048' : 'z.B. 12.0'}
                                value={aGravity} onChange={e => setAGravity(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm font-mono focus:border-emerald-500 outline-none transition-colors"
                            />
                            {addCorrectedSG && aTemp && Math.abs(addCorrectedSG - (parseGravityInput(aGravity, displayUnit) || 0)) > 0.0001 && (
                                <div className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                                    <RefreshCw className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />
                                    <span>20°C: <span className="font-mono text-emerald-400">{fmtGravity(addCorrectedSG, displayUnit)}</span></span>
                                </div>
                            )}
                        </div>
                        {/* Temperature */}
                        <div>
                            <label className="text-[9px] font-bold uppercase text-text-muted tracking-wider mb-1 flex items-center justify-between">
                                <span>Temperatur (°C)</span>
                                <BotlGuideTrigger guideKey="gaerung.temperaturkorrektur" />
                            </label>
                            <input
                                type="text" inputMode="decimal"
                                placeholder="z.B. 20"
                                value={aTemp} onChange={e => setATemp(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm font-mono focus:border-brand outline-none transition-colors"
                            />
                        </div>
                        {/* Timestamp */}
                        <div>
                            <label className="text-[9px] font-bold uppercase text-text-muted tracking-wider block mb-1">Zeitstempel</label>
                            <input
                                type="datetime-local"
                                value={aDatetime} onChange={e => setADatetime(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:border-brand outline-none transition-colors"
                            />
                        </div>
                        {/* Note */}
                        <div>
                            <label className="text-[9px] font-bold uppercase text-text-muted tracking-wider block mb-1">Notiz</label>
                            <input
                                type="text" placeholder="Optional..."
                                value={aNote} onChange={e => setANote(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:border-brand outline-none transition-colors"
                            />
                        </div>
                    </div>
                    {/* Advanced toggle */}
                    <div>
                        <button onClick={() => setShowAdvanced(v => !v)} className="text-[10px] text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors">
                            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Erweitert (Druck / pH / Ernte)
                        </button>
                        {showAdvanced && (
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1">
                                <div>
                                    <label className="text-[9px] font-bold uppercase text-text-muted tracking-wider mb-1 flex items-center justify-between">
                                        <span>Druck (bar)</span>
                                        <BotlGuideTrigger guideKey="gaerung.druck" />
                                    </label>
                                    <input
                                        type="text" inputMode="decimal" placeholder="z.B. 0.8"
                                        value={aPressure} onChange={e => setAPressure(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm font-mono focus:border-brand outline-none"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button 
                                        onClick={() => setShowHarvest(true)}
                                        className={`bg-surface border border-border hover:border-purple-500/50 text-text-secondary px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all w-full justify-center h-[38px] ${showHarvest ? 'border-purple-500 text-purple-400' : ''}`}
                                    >
                                        <Dna className="w-4 h-4 text-purple-500" />
                                        Hefe ernten...
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Harvest Form */}
                    {showHarvest && (
                    <div className="bg-purple-950/10 border border-purple-500/20 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                         <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Details zur Hefeernte</span>
                            </div>
                            <button onClick={() => setShowHarvest(false)}><X className="w-3 h-3 text-purple-400 hover:text-text-primary" /></button>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <div>
                                 <label className="text-[9px] font-bold uppercase text-purple-400/60 tracking-wider block mb-1">Volumen (ml)</label>
                                 <input type="number" value={hVolume} onChange={e => setHVolume(e.target.value)} placeholder="z.B. 500" className="w-full bg-background border border-purple-500/20 rounded-lg px-3 py-2 text-text-primary text-sm focus:border-purple-500 outline-none" />
                             </div>
                             <div>
                                 <label className="text-[9px] font-bold uppercase text-purple-400/60 tracking-wider block mb-1">Generation</label>
                                 <input type="number" value={hGeneration} onChange={e => setHGeneration(e.target.value)} className="w-full bg-background border border-purple-500/20 rounded-lg px-3 py-2 text-text-primary text-sm focus:border-purple-500 outline-none" />
                             </div>
                         </div>
                         <div>
                             <input type="text" value={hNote} onChange={e => setHNote(e.target.value)} placeholder="Notiz zur Hefe (Art, Vitalität...)" className="w-full bg-background border border-purple-500/20 rounded-lg px-3 py-2 text-text-primary text-sm focus:border-purple-500 outline-none" />
                         </div>
                         <button 
                            onClick={handleHarvest}
                            disabled={!hVolume}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-text-primary border-transparent text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                            Ernte loggen
                         </button>
                    </div>
                    )}
                
                    <div className="flex justify-end pt-2 border-t border-border/50">
                        <button
                            onClick={handleAdd}
                            disabled={!aGravity || addSaving}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-text-primary font-bold text-sm rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                        >
                            <Check className="w-4 h-4" />
                            {addSaving ? 'Speichern…' : 'Messung speichern'}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content: Graph */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="md:bg-surface md:border md:border-border md:rounded-xl md:p-4 overflow-hidden relative min-h-[300px] -mx-1 md:mx-0">
                        <div className="flex items-center justify-between mb-4 px-1 md:px-0">
                             <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                 <Activity className="w-4 h-4 text-brand" /> Gärverlauf
                             </h3>
                        </div>
                         {measurements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center border border-dashed border-border rounded-lg bg-surface m-4">
                                <Activity className="w-8 h-8 text-text-disabled" />
                                <p className="text-text-muted text-sm font-medium">Noch keine Messwerte vorhanden.</p>
                                <p className="text-text-disabled text-xs max-w-xs">Erfassen Sie einen ersten Messwert, um den Gärverlauf zu starten.</p>
                            </div>
                        ) : measurements.length === 1 ? (
                             <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-lg bg-surface">
                                <Scale className="w-8 h-8 text-emerald-500 mb-4" />
                                <div className="text-4xl font-mono font-bold text-text-primary mb-2">{fmtGravity(measurements[0].gravity, displayUnit)}</div>
                                <div className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Erster Messwert erfasst</div>
                                <div className="text-xs text-text-muted mt-2 max-w-xs text-center">Sobald ein zweiter Wert vorliegt, wird die Grafik aufgebaut.</div>
                            </div>
                        ) : (
                            <FermentationGraph height={300} />
                        )}
                    </div>
                </div>

                {/* Sidebar: Measurement History */}
                <div className="space-y-6">
                     <div className="md:bg-surface md:border md:border-border md:rounded-xl md:p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4 px-1 md:px-0">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Messprotokoll
                            </label>
                            <span className="text-[10px] font-mono text-text-disabled bg-surface px-1.5 py-0.5 rounded border border-border">{measurements.length}</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-1 scrollbar-thin scrollbar-thumb-surface-hover scrollbar-track-transparent">
                            {measurements.length === 0 && (
                                <div className="p-8 text-center text-text-disabled text-xs italic">Keine Messwerte.</div>
                            )}
                            {[...measurements].reverse().map((m, i) => {
                                const isEditing = editingId === m.id;
                                const isConfirmingDelete = confirmDeleteId === m.id;
                                const tempCorrected = m.temperature != null ? correctForTemp(m.gravity, m.temperature) : null;

                                /* ── Inline Edit Row ── */
                                if (isEditing) {
                                    return (
                                        <div key={m.id} className="p-3 bg-surface-hover border-l-2 border-emerald-500 rounded-r-lg mb-2">
                                            <div className="space-y-2 mb-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                                                            {displayUnit === 'sg' ? 'SG' : '°P'}
                                                        </label>
                                                        <input
                                                            type="text" inputMode="decimal" autoFocus
                                                            value={eGravity} onChange={e => setEGravity(e.target.value)}
                                                            className="w-full bg-background border border-border rounded px-2 py-1.5 text-text-primary text-xs font-mono focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">°C</label>
                                                        <input
                                                            type="text" inputMode="decimal"
                                                            value={eTemp} onChange={e => setETemp(e.target.value)}
                                                            className="w-full bg-background border border-border rounded px-2 py-1.5 text-text-primary text-xs font-mono focus:border-brand outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <input
                                                    type="text" placeholder="Notiz..."
                                                    value={eNote} onChange={e => setENote(e.target.value)}
                                                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-text-primary text-xs focus:border-brand outline-none"
                                                />
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setEditingId(null)} className="text-[10px] text-text-muted hover:text-text-primary px-2 py-1">Abbrechen</button>
                                                <button onClick={() => saveEdit(m.id)} className="bg-emerald-600 text-text-primary text-[10px] font-bold px-3 py-1 rounded">Speichern</button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={m.id || i} className="group relative flex items-start gap-3 p-2 hover:bg-surface-hover/30 rounded-lg transition-colors border border-transparent hover:border-border">
                                        
                                        <div className={`mt-0.5 p-1.5 rounded-md bg-surface border border-border group-hover:border-border text-brand`}>
                                            <FlaskConical className="w-3.5 h-3.5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-mono font-bold text-text-primary">
                                                    {fmtGravityWithUnit(m.gravity, displayUnit)}
                                                    <span className="text-[10px] text-text-disabled ml-1">{displayUnit === 'sg' ? 'SG' : '°P'}</span>
                                                </span>
                                                <span className="text-[10px] text-text-muted font-mono">
                                                    {format(new Date(m.measured_at), 'dd.MM HH:mm', { locale: de })}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 mt-0.5">
                                                {m.temperature != null && (
                                                     <span className="text-[10px] text-orange-400 font-mono flex items-center gap-1">
                                                        <Thermometer className="w-2.5 h-2.5" /> {m.temperature}°
                                                     </span>
                                                )}
                                                {m.note && (
                                                    <span className="text-[10px] text-text-muted truncate max-w-[100px] block" title={m.note}>
                                                        {m.note}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hover Actions */}
                                         <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-surface rounded border border-border p-0.5 shadow-sm">
                                            {isConfirmingDelete ? (
                                                <>
                                                    <button onClick={() => handleDelete(m.id)} className="p-1 text-red-400 hover:bg-red-900/50 rounded"><Check className="w-3 h-3" /></button>
                                                    <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-text-muted hover:bg-surface-hover rounded"><X className="w-3 h-3" /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(m)} className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded"><Pencil className="w-3 h-3" /></button>
                                                    <button onClick={() => { setConfirmDeleteId(m.id); setEditingId(null); }} className="p-1 text-text-muted hover:text-red-400 hover:bg-surface-hover rounded"><Trash2 className="w-3 h-3" /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}