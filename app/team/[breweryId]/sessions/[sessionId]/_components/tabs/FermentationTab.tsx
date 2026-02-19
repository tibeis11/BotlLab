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

// ── Helpers ────────────────────────────────────────────────────────────────
const CALIB_TEMP = 20; // °C – standard hydrometer calibration

function correctForTemp(sg: number, tempC: number): number {
    return sg + 0.000130 * (tempC - CALIB_TEMP);
}
    
const MetricCard = ({ label, value, unit, subtext, color = 'zinc', guideKey }: { label: string, value: string | number | null, unit?: string, subtext?: string, color?: 'zinc' | 'cyan' | 'emerald' | 'orange' | 'blue' | 'purple', guideKey?: BotlGuideKey }) => {
    const colorMap = {
        zinc: 'text-white',
        cyan: 'text-cyan-400',
        emerald: 'text-emerald-400',
        orange: 'text-orange-400',
        blue: 'text-blue-400',
        purple: 'text-purple-400'
    };
    
    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between h-full">
            <div>
                <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{label}</div>
                    {guideKey && <BotlGuideTrigger guideKey={guideKey} className="scale-75 opacity-50 hover:opacity-100" />}
                </div>
                <div className={`text-2xl font-mono font-bold tracking-tight flex items-baseline gap-1 ${colorMap[color]}`}>
                    {value !== null && value !== undefined && value !== '—' ? value : '—'} 
                    {value && value !== '—' && unit && <span className="text-xs text-zinc-600 font-bold ml-1">{unit}</span>}
                </div>
            </div>
            {subtext && <div className="text-[10px] text-zinc-600 font-medium mt-2 pt-2 border-t border-zinc-800/50">{subtext}</div>}
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
                    <h2 className="text-2xl font-bold text-white tracking-tight">Gärung & Verlauf</h2>
                    <p className="text-zinc-500 text-sm">Überwache den Gärprozess für <span className="font-mono text-zinc-400">#{session?.batch_code || session?.brew?.name}</span></p>
                 </div>
                <div className="flex items-center gap-2">
                    {/* SG / Plato toggle */}
                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden text-[10px] font-bold">
                        <button
                            onClick={() => setDisplayUnit('sg')}
                            className={`px-3 py-1.5 transition-colors ${displayUnit === 'sg' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >SG</button>
                        <div className="w-px bg-zinc-800" />
                        <button
                            onClick={() => setDisplayUnit('plato')}
                            className={`px-3 py-1.5 transition-colors ${displayUnit === 'plato' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >°P</button>
                    </div>
                    
                    <button
                        onClick={() => { setShowAddForm(v => !v); setEditingId(null); setConfirmDeleteId(null); }}
                        className={`text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors border ${showAddForm ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-emerald-600 hover:bg-emerald-500 border-transparent text-white'}`}
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

            {/* Inline Add Form Container */}
            {showAddForm && (
                <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                         <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <Plus className="w-3 h-3" /> Neuer Messwert
                         </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Gravity */}
                        <div>
                            <label className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider mb-1 flex items-center justify-between">
                                <span>Dichte ({displayUnit === 'sg' ? 'SG' : '°Plato'})</span>
                                <BotlGuideTrigger guideKey="gaerung.sg_eingabe" className="scale-75" />
                            </label>
                            <input
                                type="text" inputMode="decimal" autoFocus
                                placeholder={displayUnit === 'sg' ? 'z.B. 1.048' : 'z.B. 12.0'}
                                value={aGravity} onChange={e => setAGravity(e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-emerald-500 outline-none transition-colors"
                            />
                            {addCorrectedSG && aTemp && Math.abs(addCorrectedSG - (parseGravityInput(aGravity, displayUnit) || 0)) > 0.0001 && (
                                <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                                    <RefreshCw className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />
                                    <span>20°C: <span className="font-mono text-emerald-400">{fmtGravity(addCorrectedSG, displayUnit)}</span></span>
                                </div>
                            )}
                        </div>
                        {/* Temperature */}
                        <div>
                            <label className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider mb-1 flex items-center justify-between">
                                <span>Temperatur (°C)</span>
                                <BotlGuideTrigger guideKey="gaerung.temperaturkorrektur" className="scale-75" />
                            </label>
                            <input
                                type="text" inputMode="decimal"
                                placeholder="z.B. 20"
                                value={aTemp} onChange={e => setATemp(e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-zinc-600 outline-none transition-colors"
                            />
                        </div>
                        {/* Timestamp */}
                        <div>
                            <label className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider block mb-1">Zeitstempel</label>
                            <input
                                type="datetime-local"
                                value={aDatetime} onChange={e => setADatetime(e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-zinc-600 outline-none transition-colors"
                            />
                        </div>
                        {/* Note */}
                        <div>
                            <label className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider block mb-1">Notiz</label>
                            <input
                                type="text" placeholder="Optional..."
                                value={aNote} onChange={e => setANote(e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-zinc-600 outline-none transition-colors"
                            />
                        </div>
                    </div>
                    {/* Advanced toggle */}
                    <div>
                        <button onClick={() => setShowAdvanced(v => !v)} className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Erweitert (Druck / pH / Ernte)
                        </button>
                        {showAdvanced && (
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1">
                                <div>
                                    <label className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider mb-1 flex items-center justify-between">
                                        <span>Druck (bar)</span>
                                        <BotlGuideTrigger guideKey="gaerung.druck" className="scale-75" />
                                    </label>
                                    <input
                                        type="text" inputMode="decimal" placeholder="z.B. 0.8"
                                        value={aPressure} onChange={e => setAPressure(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-zinc-600 outline-none"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button 
                                        onClick={() => setShowHarvest(true)}
                                        className={`bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 text-zinc-300 px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all w-full justify-center h-[38px] ${showHarvest ? 'border-purple-500 text-purple-400' : ''}`}
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
                            <button onClick={() => setShowHarvest(false)}><X className="w-3 h-3 text-purple-400 hover:text-white" /></button>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <div>
                                 <label className="text-[9px] font-bold uppercase text-purple-400/60 tracking-wider block mb-1">Volumen (ml)</label>
                                 <input type="number" value={hVolume} onChange={e => setHVolume(e.target.value)} placeholder="z.B. 500" className="w-full bg-black border border-purple-500/20 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none" />
                             </div>
                             <div>
                                 <label className="text-[9px] font-bold uppercase text-purple-400/60 tracking-wider block mb-1">Generation</label>
                                 <input type="number" value={hGeneration} onChange={e => setHGeneration(e.target.value)} className="w-full bg-black border border-purple-500/20 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none" />
                             </div>
                         </div>
                         <div>
                             <input type="text" value={hNote} onChange={e => setHNote(e.target.value)} placeholder="Notiz zur Hefe (Art, Vitalität...)" className="w-full bg-black border border-purple-500/20 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none" />
                         </div>
                         <button 
                            onClick={handleHarvest}
                            disabled={!hVolume}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white border-transparent text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                            Ernte loggen
                         </button>
                    </div>
                    )}
                
                    <div className="flex justify-end pt-2 border-t border-zinc-800/50">
                        <button
                            onClick={handleAdd}
                            disabled={!aGravity || addSaving}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
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
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 overflow-hidden relative min-h-[300px]">
                        <div className="flex items-center justify-between mb-4">
                             <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                 <Activity className="w-4 h-4 text-cyan-500" /> Gärverlauf
                             </h3>
                        </div>
                         {measurements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-900/30 m-4">
                                <Activity className="w-8 h-8 text-zinc-700" />
                                <p className="text-zinc-500 text-sm font-medium">Noch keine Messwerte vorhanden.</p>
                                <p className="text-zinc-600 text-xs max-w-xs">Erfassen Sie einen ersten Messwert, um den Gärverlauf zu starten.</p>
                            </div>
                        ) : measurements.length === 1 ? (
                             <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/30">
                                <Scale className="w-8 h-8 text-emerald-500 mb-4" />
                                <div className="text-4xl font-mono font-bold text-white mb-2">{fmtGravity(measurements[0].gravity, displayUnit)}</div>
                                <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Erster Messwert erfasst</div>
                                <div className="text-xs text-zinc-500 mt-2 max-w-xs text-center">Sobald ein zweiter Wert vorliegt, wird die Grafik aufgebaut.</div>
                            </div>
                        ) : (
                            <FermentationGraph height={300} />
                        )}
                    </div>
                </div>

                {/* Sidebar: Measurement History */}
                <div className="space-y-6">
                     <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Messprotokoll
                            </label>
                            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{measurements.length}</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            {measurements.length === 0 && (
                                <div className="p-8 text-center text-zinc-600 text-xs italic">Keine Messwerte.</div>
                            )}
                            {[...measurements].reverse().map((m, i) => {
                                const isEditing = editingId === m.id;
                                const isConfirmingDelete = confirmDeleteId === m.id;
                                const tempCorrected = m.temperature != null ? correctForTemp(m.gravity, m.temperature) : null;

                                /* ── Inline Edit Row ── */
                                if (isEditing) {
                                    return (
                                        <div key={m.id} className="p-3 bg-zinc-800 border-l-2 border-emerald-500 rounded-r-lg mb-2">
                                            <div className="space-y-2 mb-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                                                            {displayUnit === 'sg' ? 'SG' : '°P'}
                                                        </label>
                                                        <input
                                                            type="text" inputMode="decimal" autoFocus
                                                            value={eGravity} onChange={e => setEGravity(e.target.value)}
                                                            className="w-full bg-black border border-zinc-700 rounded px-2 py-1.5 text-white text-xs font-mono focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">°C</label>
                                                        <input
                                                            type="text" inputMode="decimal"
                                                            value={eTemp} onChange={e => setETemp(e.target.value)}
                                                            className="w-full bg-black border border-zinc-700 rounded px-2 py-1.5 text-white text-xs font-mono focus:border-zinc-600 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <input
                                                    type="text" placeholder="Notiz..."
                                                    value={eNote} onChange={e => setENote(e.target.value)}
                                                    className="w-full bg-black border border-zinc-700 rounded px-2 py-1.5 text-white text-xs focus:border-zinc-600 outline-none"
                                                />
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setEditingId(null)} className="text-[10px] text-zinc-400 hover:text-white px-2 py-1">Abbrechen</button>
                                                <button onClick={() => saveEdit(m.id)} className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded">Speichern</button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={m.id || i} className="group relative flex items-start gap-3 p-2 hover:bg-zinc-800/30 rounded-lg transition-colors border border-transparent hover:border-zinc-800">
                                        
                                        <div className={`mt-0.5 p-1.5 rounded-md bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 text-cyan-500`}>
                                            <FlaskConical className="w-3.5 h-3.5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-mono font-bold text-zinc-200">
                                                    {fmtGravityWithUnit(m.gravity, displayUnit)}
                                                    <span className="text-[10px] text-zinc-600 ml-1">{displayUnit === 'sg' ? 'SG' : '°P'}</span>
                                                </span>
                                                <span className="text-[10px] text-zinc-500 font-mono">
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
                                                    <span className="text-[10px] text-zinc-500 truncate max-w-[100px] block" title={m.note}>
                                                        {m.note}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hover Actions */}
                                         <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-zinc-900/90 rounded border border-zinc-800 p-0.5 shadow-sm">
                                            {isConfirmingDelete ? (
                                                <>
                                                    <button onClick={() => handleDelete(m.id)} className="p-1 text-red-400 hover:bg-red-900/50 rounded"><Check className="w-3 h-3" /></button>
                                                    <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-zinc-400 hover:bg-zinc-800 rounded"><X className="w-3 h-3" /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(m)} className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"><Pencil className="w-3 h-3" /></button>
                                                    <button onClick={() => { setConfirmDeleteId(m.id); setEditingId(null); }} className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded"><Trash2 className="w-3 h-3" /></button>
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