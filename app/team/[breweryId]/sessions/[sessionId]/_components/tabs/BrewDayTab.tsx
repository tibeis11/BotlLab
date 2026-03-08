'use client';

import { useSession } from '../../SessionContext';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Clock,
    Thermometer,
    Beaker,
    ArrowRight,
    ArrowLeft,
    Play,
    Pause,
    Plus,
    Trash2,
    Droplets,
    FlaskConical,
    CheckCircle2,
    Check,
    Flame,
    List,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { BotlGuideTrigger } from '@/app/components/BotlGuideTrigger';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type EventType = 'strike' | 'mash' | 'mashout' | 'sparge' | 'boil' | 'measure' | 'decoction_pull' | 'decoction_heat' | 'decoction_rest' | 'decoction_boil' | 'decoction_return';

interface TEvent {
    id: string;
    type: EventType;
    title: string;
    description?: string;
    time?: number;
    temp?: number;
    spargeVol?: number;
    mashWaterVol?: number;
    hops?: HopAddition[];
    stopwatch?: boolean;
    volumeInfo?: string;
}

interface HopAddition {
    name: string;
    amount: number;
    time: number;
}

interface TimerState {
    running: boolean;
    startTime: number | null;
    elapsed: number;
    duration: number;
}

interface OGReading {
    id: string;
    timestamp: string;
    value: number;
    note?: string;
}

type PhaseName = 'Maischen' | 'Läutern' | 'Kochen' | 'Abschluss';

interface PhaseSegment {
    label: PhaseName;
    startIdx: number;
    endIdx: number;
    color: string;
    bgColor: string;
    borderColor: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const sf = (v: any): number => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
};

const fmtMs = (ms: number) => {
    const s = Math.floor(Math.max(0, ms) / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const TYPE_LABEL: Record<EventType, string> = {
    strike:            'Einmaischen',
    mash:              'Maischen',
    mashout:           'Abmaischen',
    sparge:            'Läutern',
    boil:              'Kochen',
    measure:           'Abschluss',
    decoction_pull:    'Dekoktion',
    decoction_heat:    'Dekoktion',
    decoction_rest:    'Dekoktion',
    decoction_boil:    'Dekoktion',
    decoction_return:  'Dekoktion',
};

const PHASE_LABEL: Record<EventType, PhaseName> = {
    strike: 'Maischen', mash: 'Maischen', mashout: 'Maischen',
    sparge: 'Läutern', boil: 'Kochen', measure: 'Abschluss',
    decoction_pull: 'Maischen', decoction_heat: 'Maischen', decoction_rest: 'Maischen',
    decoction_boil: 'Maischen', decoction_return: 'Maischen',
};

const PHASE_COLORS: Record<PhaseName, { color: string; bgColor: string; borderColor: string }> = {
    'Maischen':  { color: 'text-amber-400',   bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/20' },
    'Läutern':   { color: 'text-sky-400',      bgColor: 'bg-sky-500/10',      borderColor: 'border-sky-500/20' },
    'Kochen':    { color: 'text-red-400',      bgColor: 'bg-red-500/10',      borderColor: 'border-red-500/20' },
    'Abschluss': { color: 'text-emerald-400',  bgColor: 'bg-emerald-500/10',  borderColor: 'border-emerald-500/20' },
};

// ─────────────────────────────────────────────
// Timer Components
// ─────────────────────────────────────────────

function useLiveTime(state: TimerState, mode: 'countdown' | 'stopwatch') {
    const [display, setDisplay] = useState(() => {
        if (mode === 'stopwatch') return fmtMs(state.elapsed);
        return fmtMs(Math.max(0, state.duration - state.elapsed));
    });
    useEffect(() => {
        if (!state.running || !state.startTime) {
            setDisplay(mode === 'stopwatch' ? fmtMs(state.elapsed) : fmtMs(Math.max(0, state.duration - state.elapsed)));
            return;
        }
        const tick = () => {
            const total = state.elapsed + (Date.now() - state.startTime!);
            setDisplay(mode === 'stopwatch' ? fmtMs(total) : fmtMs(Math.max(0, state.duration - total)));
        };
        tick();
        const id = setInterval(tick, 200);
        return () => clearInterval(id);
    }, [state, mode]);
    return display;
}

function TimerProgress({ state }: { state: TimerState }) {
    const [pct, setPct] = useState(0);
    useEffect(() => {
        if (!state.running || !state.startTime) {
            setPct(state.duration > 0 ? Math.min(100, (state.elapsed / state.duration) * 100) : 0);
            return;
        }
        const tick = () => {
            const total = state.elapsed + (Date.now() - state.startTime!);
            setPct(Math.min(100, (total / state.duration) * 100));
        };
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [state]);
    return (
        <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-linear" style={{ width: `${pct}%` }} />
        </div>
    );
}

function HopCountdown({ hopAddMs, boilState }: { hopAddMs: number; boilState: TimerState }) {
    const [remaining, setRemaining] = useState(0);
    const [due, setDue] = useState(false);
    useEffect(() => {
        const calc = () => {
            const elapsed = boilState.running && boilState.startTime
                ? boilState.elapsed + (Date.now() - boilState.startTime)
                : boilState.elapsed;
            const r = Math.max(0, hopAddMs - elapsed);
            setRemaining(r);
            setDue(r === 0);
        };
        calc();
        if (!boilState.running) return;
        const id = setInterval(calc, 500);
        return () => clearInterval(id);
    }, [boilState, hopAddMs]);
    if (due) return <span className="text-amber-400 font-bold animate-pulse text-xs">JETZT</span>;
    return <span className="font-mono tabular-nums text-xs">{fmtMs(remaining)}</span>;
}

// ─────────────────────────────────────────────
// Phase Rail
// ─────────────────────────────────────────────

function PhaseRail({ phases, activePhaseIdx, onPhaseClick }: {
    phases: PhaseSegment[];
    activePhaseIdx: number;
    onPhaseClick: (phaseIdx: number) => void;
}) {
    return (
        <div className="flex items-center gap-1">
            {phases.map((phase, i) => {
                const isActive = i === activePhaseIdx;
                const isPast = i < activePhaseIdx;
                return (
                    <button
                        key={phase.label}
                        onClick={() => onPhaseClick(i)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                            isActive
                                ? `${phase.bgColor} ${phase.color} ${phase.borderColor} border`
                                : isPast
                                    ? 'text-text-disabled'
                                    : 'text-text-muted hover:text-text-secondary'
                        }`}
                    >
                        {isPast && <Check className="w-3 h-3" />}
                        <span className="hidden sm:inline">{phase.label}</span>
                        <span className="sm:hidden">{phase.label.slice(0, 3)}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────
// Step List (Desktop Sidebar + Mobile Sheet)
// ─────────────────────────────────────────────

function StepList({ timeline, active, phases, onGoTo, className = '' }: {
    timeline: TEvent[];
    active: number;
    phases: PhaseSegment[];
    onGoTo: (i: number) => void;
    className?: string;
}) {
    const activeRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [active]);

    return (
        <div className={`space-y-1 ${className}`}>
            {phases.map((phase) => (
                <div key={phase.label} className="mb-3">
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${phase.color} mb-1.5 px-1`}>
                        {phase.label}
                    </p>
                    {timeline.slice(phase.startIdx, phase.endIdx + 1).map((ev, offsetIdx) => {
                        const i = phase.startIdx + offsetIdx;
                        const isActive = i === active;
                        const isPast = i < active;
                        return (
                            <button
                                key={ev.id}
                                ref={isActive ? activeRef : undefined}
                                onClick={() => onGoTo(i)}
                                className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all text-sm ${
                                    isActive
                                        ? `${phase.bgColor} ${phase.color} font-semibold`
                                        : isPast
                                            ? 'text-text-disabled hover:bg-surface'
                                            : 'text-text-muted hover:bg-surface hover:text-text-secondary'
                                }`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    isActive ? 'bg-current' : isPast ? 'bg-text-disabled' : 'bg-border'
                                }`} />
                                <span className={`flex-1 truncate ${isPast ? 'line-through' : ''}`}>{ev.title}</span>
                                {ev.temp !== undefined && !isPast && (
                                    <span className="text-[10px] font-mono opacity-60 shrink-0">{ev.temp}°</span>
                                )}
                                {(ev.time ?? 0) > 0 && ev.type !== 'measure' && !isPast && (
                                    <span className="text-[10px] font-mono opacity-60 shrink-0">{ev.time}m</span>
                                )}
                                {isPast && <Check className="w-3 h-3 text-text-disabled shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export function BrewDayTab() {
    const { session, updateSessionData, addEvent } = useSession();

    const data        = session?.brew?.recipe_data       ?? {};
    const meas        = (session?.measurements as any)   ?? {};
    const savedTimers = meas.timers                      ?? {};
    const targetVol   = sf(meas.target_volume            ?? data.batch_size ?? 20);
    const origVol     = sf(meas.original_volume          ?? data.batch_size ?? 20);
    const scale       = origVol > 0 ? targetVol / origVol : 1;

    // ── Build timeline ──
    const timeline = useMemo<TEvent[]>(() => {
        const ev: TEvent[] = [];

        // 1. Mash steps — per step_type differenziert
        const mashSteps: any[] = data.mash_steps ?? data.mash_schedule ?? [];
        const mashWater = sf(data.mash_water_liters ?? 0) * scale;

        if (mashSteps.length > 0) {
            mashSteps.forEach((s: any, i: number) => {
                const t = sf(s.temperature ?? s.temp);
                const stepType = s.step_type ?? (i === 0 ? 'strike' : 'rest');

                if (stepType === 'strike') {
                    // ── Einmaischen: Bestätigungsschritt mit Hauptguss-Info ──
                    const desc = mashWater > 0
                        ? `${mashWater.toFixed(1).replace('.', ',')} L Hauptguss auf ${t > 0 ? t + '°C' : 'Zieltemperatur'}`
                        : t > 0 ? `Einmaischtemperatur: ${t}°C` : 'Malz in Wasser einrühren';
                    ev.push({
                        id: `mash-${i}`, type: 'strike', title: s.name ?? 'Einmaischen',
                        description: desc, temp: t > 0 ? t : undefined,
                        mashWaterVol: mashWater > 0 ? mashWater : undefined,
                    });

                } else if (stepType === 'mashout') {
                    // ── Abmaischen: Stoppuhr bis Zieltemp erreicht ──
                    ev.push({
                        id: `mash-${i}`, type: 'mashout', title: s.name ?? 'Abmaischen',
                        description: t > 0 ? `Maische auf ${t}°C aufheizen` : 'Abmaischtemperatur erreichen',
                        temp: t > 0 ? t : 78, stopwatch: true,
                    });

                } else if (stepType === 'decoction') {
                    // ── Dekoktion: 6-Schritt-Expansion ──
                    const formLabel = s.decoction_form === 'thin' ? 'Dünnmaische'
                        : s.decoction_form === 'liquid' ? 'Kochwasser'
                        : 'Dickmaische';
                    const rawVol = s.volume_liters ? sf(s.volume_liters) * scale : 0;
                    const scaledVol = rawVol > 0 ? rawVol.toFixed(1).replace('.', ',') : '';
                    const volInfo = scaledVol ? `${scaledVol} L ${formLabel}` : formLabel;
                    const stepName = s.name ?? `Dekoktion ${i + 1}`;

                    // 1. Pull
                    ev.push({ id: `mash-${i}-pull`, type: 'decoction_pull', title: `${stepName}: Teilmaische ziehen`, description: volInfo, volumeInfo: volInfo });
                    // 2. Heat (Stoppuhr)
                    ev.push({ id: `mash-${i}-heat`, type: 'decoction_heat', title: `Teilmaische aufheizen`, description: s.decoction_rest_temp ? `Ziel: ${s.decoction_rest_temp}°C` : 'Bis zum Kochen aufheizen', temp: s.decoction_rest_temp ? sf(s.decoction_rest_temp) : 100, stopwatch: true });
                    // 3. Optional: Teilmaische-Rast
                    if (sf(s.decoction_rest_temp) > 0 && sf(s.decoction_rest_time) > 0) {
                        ev.push({ id: `mash-${i}-rest`, type: 'decoction_rest', title: `Teilmaische-Rast`, time: sf(s.decoction_rest_time), temp: sf(s.decoction_rest_temp) });
                    }
                    // 4. Optional: Kochen der Teilmaische
                    if (sf(s.decoction_boil_time) > 0) {
                        ev.push({ id: `mash-${i}-boil`, type: 'decoction_boil', title: `Teilmaische kochen`, time: sf(s.decoction_boil_time), temp: 100 });
                    }
                    // 5. Return (Stoppuhr — Temperatur prüfen nach Rückschüttung)
                    ev.push({
                        id: `mash-${i}-return`, type: 'decoction_return',
                        title: `${stepName}: Zurückführen`,
                        description: t > 0 ? `Rückschüttung → Hauptmaische auf ${t}°C bringen` : 'Teilmaische zurückschütten & Temperatur prüfen',
                        temp: t > 0 ? t : undefined, stopwatch: true,
                    });
                    // 6. Hauptrast bei Zieltemperatur
                    if (sf(s.duration) > 0) {
                        ev.push({ id: `mash-${i}-mainrest`, type: 'mash', title: `Rast bei ${t}°C`, time: sf(s.duration), temp: t > 0 ? t : undefined });
                    }

                } else {
                    // ── rest: Normale Temperatur-Rast mit Countdown ──
                    ev.push({
                        id: `mash-${i}`, type: 'mash',
                        title: s.name || `Rast ${i + 1}`,
                        time: sf(s.duration ?? s.time), temp: t > 0 ? t : undefined,
                    });
                }
            });
        } else {
            // Fallback: kein Maischplan definiert
            ev.push({ id: 'mash-0', type: 'strike', title: 'Einmaischen', temp: 67, description: 'Kein Maischplan im Rezept — bitte manuell maischen' });
            ev.push({ id: 'mash-1', type: 'mash', title: 'Kombi-Rast', time: 60, temp: 67 });
        }

        // 2. Sparge
        const spargeVol = sf(data.sparge_water_liters ?? data.sparge_volume ?? data.sparge_water_volume ?? 0);
        ev.push({ id: 'sparge', type: 'sparge', title: 'Läutern & Nachguss', spargeVol: spargeVol > 0 ? spargeVol : undefined });

        // 3. Boil
        const boilTime = sf(data.boil_time ?? 60);
        const rawHops: any[] = data.hops ?? data.ingredients?.hops ?? [];
        const boilHops: HopAddition[] = rawHops
            .filter((h: any) => h.type === 'boil' || h.usage === 'Boil' || sf(h.time) > 0)
            .sort((a: any, b: any) => sf(b.time) - sf(a.time))
            .map((h: any) => ({ name: h.name ?? 'Hopfen', amount: Math.round(sf(String(h.amount ?? 0).replace(',', '.')) * scale), time: sf(h.time) }));
        ev.push({ id: 'boil', type: 'boil', title: 'Würzekochen', time: boilTime > 0 ? boilTime : 60, temp: 100, hops: boilHops });

        // 4. OG Measurement
        const og = sf(data.og ?? '1.050');
        let desc = 'Zielwert nicht definiert';
        if (og > 0) {
            if (og > 2) {
                const sg = 1 + (og / (258.6 - ((og / 258.2) * 227.1)));
                desc = `Ziel: ${og.toFixed(1)}°P (${sg.toFixed(3)} SG)`;
            } else {
                const plato = (135.997 * Math.pow(og, 3)) - (630.272 * Math.pow(og, 2)) + (1111.14 * og) - 616.868;
                desc = `Ziel: ${og.toFixed(3)} SG (${plato.toFixed(1)}°P)`;
            }
        }
        ev.push({ id: 'measure', type: 'measure', title: 'Stammwürze messen', description: desc });

        return ev;
    }, [data, scale]);

    // ── Build phase segments ──
    const phases = useMemo<PhaseSegment[]>(() => {
        const segs: PhaseSegment[] = [];
        let cur: PhaseName | null = null;
        timeline.forEach((ev, i) => {
            const phase = PHASE_LABEL[ev.type];
            if (phase !== cur) {
                if (segs.length > 0) segs[segs.length - 1].endIdx = i - 1;
                const colors = PHASE_COLORS[phase];
                segs.push({ label: phase, startIdx: i, endIdx: i, ...colors });
                cur = phase;
            } else {
                segs[segs.length - 1].endIdx = i;
            }
        });
        return segs;
    }, [timeline]);

    const getActivePhaseIdx = useCallback((stepIdx: number) => {
        return phases.findIndex(p => stepIdx >= p.startIdx && stepIdx <= p.endIdx);
    }, [phases]);

    // ── State ──
    const [active, setActive]         = useState(0);
    const [timer,  setTimer]          = useState<TimerState>({ running: false, startTime: null, elapsed: 0, duration: 0 });
    const [ogReadings, setOgReadings] = useState<OGReading[]>(() => meas.og_readings ?? []);
    const [ogInput,    setOgInput]    = useState('');
    const [ogNote,     setOgNote]     = useState('');
    const [showStepList, setShowStepList] = useState(false);

    useEffect(() => {
        if (meas.active_step_index !== undefined) setActive(meas.active_step_index);
        if (savedTimers.global) setTimer(savedTimers.global);
        if (meas.og_readings) setOgReadings(meas.og_readings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!timer.running || timer.duration === 0) return;
        const id = setInterval(() => {
            const total = timer.elapsed + (Date.now() - (timer.startTime ?? Date.now()));
            if (total >= timer.duration) {
                setTimer(s => ({ ...s, running: false, elapsed: s.duration, startTime: null }));
                toast.success('Timer abgelaufen!', { description: timeline[active]?.title });
            }
        }, 1000);
        return () => clearInterval(id);
    }, [timer, active, timeline]);

    const goTo = useCallback((i: number) => {
        setActive(i);
        setShowStepList(false);
        const step = timeline[i];
        const isStopwatch = step.stopwatch;
        const hasDuration = (step.time ?? 0) > 0 && step.type !== 'measure';
        let newTimer: TimerState;
        if (isStopwatch) {
            newTimer = { running: false, startTime: null, elapsed: 0, duration: 0 };
        } else if (hasDuration) {
            newTimer = { running: false, startTime: null, elapsed: 0, duration: step.time! * 60_000 };
        } else {
            newTimer = { running: false, startTime: null, elapsed: 0, duration: 0 };
        }
        setTimer(newTimer);
        updateSessionData({ measurements: { ...meas, active_step_index: i, timers: { ...savedTimers, global: newTimer } } as any });
    }, [timeline, meas, savedTimers, updateSessionData]);

    const toggleTimer = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const now = Date.now();
        const next: TimerState = timer.running
            ? { ...timer, running: false, startTime: null, elapsed: timer.elapsed + (now - (timer.startTime ?? now)) }
            : { ...timer, running: true, startTime: now };
        setTimer(next);
        updateSessionData({ measurements: { ...meas, timers: { ...savedTimers, global: next } } as any });
    }, [timer, meas, savedTimers, updateSessionData]);

    const nextStep = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const next = active + 1;
        if (next < timeline.length) {
            addEvent({ type: 'NOTE', title: `✓ ${timeline[active].title}`, data: { stepIndex: active } });
            goTo(next);
            toast.success('Weiter!', { description: timeline[next].title });
        } else {
            toast.success('Brautag abgeschlossen! 🎉');
        }
    }, [active, timeline, addEvent, goTo]);

    const prevStep = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (active > 0) goTo(active - 1);
    }, [active, goTo]);

    const addOGReading = useCallback(() => {
        const val = sf(ogInput);
        if (val < 0.9 || val > 1.2) {
            toast.error('Ungültiger Wert', { description: 'Bitte einen Wert zwischen 0.900 und 1.200 eingeben.' });
            return;
        }
        const reading: OGReading = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), value: val, note: ogNote.trim() || undefined };
        const updated = [...ogReadings, reading];
        setOgReadings(updated);
        setOgInput('');
        setOgNote('');
        addEvent({ type: 'MEASUREMENT_OG', title: `OG: ${val.toFixed(3)}`, data: { value: val, note: reading.note } });
        updateSessionData({ measurements: { ...meas, og_readings: updated } as any });
        toast.success('Messung gespeichert', { description: `${val.toFixed(3)}` });
    }, [ogInput, ogNote, ogReadings, addEvent, meas, updateSessionData]);

    const removeOGReading = useCallback((id: string) => {
        const updated = ogReadings.filter(r => r.id !== id);
        setOgReadings(updated);
        updateSessionData({ measurements: { ...meas, og_readings: updated } as any });
    }, [ogReadings, meas, updateSessionData]);

    const ev = timeline[active];
    const hasDur = ev && ((ev.time ?? 0) > 0 || ev.stopwatch) && ev.type !== 'measure';
    const timerMode = ev?.stopwatch ? 'stopwatch' : 'countdown';
    const timerDisplay = useLiveTime(timer, timerMode);
    const activePhaseIdx = getActivePhaseIdx(active);
    const activePhase = phases[activePhaseIdx];

    return (
        <div className="flex flex-col min-h-[calc(100vh-8rem)] bg-background text-text-primary">

            {/* ── Phase Rail (Header) ── */}
            <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
                <div className="flex items-center justify-between px-2 py-3 sm:px-4 md:px-6">
                    <div className="flex items-center gap-3 min-w-0">
                        <div>
                            <h1 className="text-lg font-bold text-text-primary tracking-tight">Brautag</h1>
                            <p className="text-[11px] text-text-muted font-mono">#{session?.batch_code || session?.brew?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <PhaseRail phases={phases} activePhaseIdx={activePhaseIdx} onPhaseClick={(pi) => goTo(phases[pi].startIdx)} />
                        <button
                            onClick={() => setShowStepList(v => !v)}
                            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-border text-text-muted hover:text-text-primary transition-colors"
                        >
                            {showStepList ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                {/* Step counter */}
                <div className="px-2 sm:px-4 md:px-6 pb-2 flex items-center gap-2">
                    <div className="flex gap-0.5 flex-1">
                        {timeline.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                                    i < active ? 'bg-text-disabled' : i === active ? (activePhase ? 'bg-amber-500' : 'bg-brand') : 'bg-surface-hover'
                                }`}
                            />
                        ))}
                    </div>
                    <span className="text-[10px] font-mono text-text-disabled shrink-0 ml-2">{active + 1}/{timeline.length}</span>
                </div>
            </div>

            {/* ── Content Area ── */}
            <div className="flex-1 flex relative">

                {/* ── Mobile Step List Sheet ── */}
                {showStepList && (
                    <div className="absolute inset-0 z-20 bg-background lg:hidden overflow-y-auto p-2 sm:p-4 animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest">Alle Schritte</h2>
                            <button onClick={() => setShowStepList(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface text-text-muted">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <StepList timeline={timeline} active={active} phases={phases} onGoTo={goTo} />
                    </div>
                )}

                {/* ── Focus Card (Main) ── */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex-1 flex items-start justify-center px-2 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10">
                        <div className="w-full max-w-2xl space-y-6">

                            {/* Step Type Badge */}
                            <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-bold uppercase tracking-widest ${activePhase?.color ?? 'text-brand'}`}>
                                    {TYPE_LABEL[ev.type]}
                                </span>
                                {ev.stopwatch && <span className="text-[10px] text-text-disabled">· Stoppuhr</span>}
                                {!ev.stopwatch && hasDur && <span className="text-[10px] text-text-disabled">· {ev.time} min</span>}
                                {ev.type === 'sparge'  && <BotlGuideTrigger guideKey="brautag.laeutern"  icon="info" />}
                                {ev.type === 'measure' && <BotlGuideTrigger guideKey="brautag.og_messen" icon="info" />}
                            </div>

                            {/* Step Title */}
                            <h2 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight leading-tight">{ev.title}</h2>

                            {/* Description */}
                            {ev.description && ev.type !== 'measure' && (
                                <p className="text-text-muted text-sm md:text-base">{ev.description}</p>
                            )}

                            {/* Metadata Chips */}
                            {(ev.temp !== undefined || ev.spargeVol !== undefined || ev.volumeInfo || ev.mashWaterVol !== undefined) && (
                                <div className="flex flex-wrap gap-2">
                                    {ev.temp !== undefined && (
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${activePhase?.borderColor ?? 'border-border'} ${activePhase?.bgColor ?? 'bg-surface'}`}>
                                            <Thermometer className={`w-4 h-4 ${activePhase?.color ?? 'text-text-muted'}`} />
                                            <span className="text-lg font-mono font-bold text-text-primary">{ev.temp}°C</span>
                                        </div>
                                    )}
                                    {ev.mashWaterVol !== undefined && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                                            <Droplets className="w-4 h-4 text-cyan-400" />
                                            <span className="text-lg font-mono font-bold text-text-primary">{ev.mashWaterVol.toFixed(1).replace('.', ',')} L</span>
                                            <span className="text-xs text-text-muted">Hauptguss</span>
                                        </div>
                                    )}
                                    {ev.spargeVol !== undefined && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-sky-500/20 bg-sky-500/10">
                                            <Droplets className="w-4 h-4 text-sky-400" />
                                            <span className="text-lg font-mono font-bold text-text-primary">{ev.spargeVol} L</span>
                                            <span className="text-xs text-text-muted">Nachguss</span>
                                        </div>
                                    )}
                                    {ev.volumeInfo && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/10">
                                            <Flame className="w-4 h-4 text-amber-500" />
                                            <span className="text-sm font-mono font-bold text-amber-400">{ev.volumeInfo}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Timer Section ── */}
                            {hasDur && (
                                <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-text-disabled mb-1">
                                                {ev.stopwatch ? 'Stoppuhr' : 'Verbleibend'}
                                            </p>
                                            <div className="text-4xl md:text-5xl font-mono font-black text-text-primary tabular-nums tracking-tighter">
                                                {timerDisplay}
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleTimer}
                                            className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                                timer.running
                                                    ? 'bg-surface-hover border-2 border-amber-500/30 text-amber-500 hover:bg-border'
                                                    : 'bg-amber-600 text-white hover:bg-amber-500 active:scale-95'
                                            }`}
                                        >
                                            {timer.running ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                                        </button>
                                    </div>
                                    {timer.duration > 0 && !ev.stopwatch && <TimerProgress state={timer} />}
                                    <div className="flex items-center gap-1 text-xs text-text-disabled">
                                        <div className={`w-1.5 h-1.5 rounded-full ${timer.running ? 'bg-amber-500 animate-pulse' : 'bg-text-disabled'}`} />
                                        <span>{timer.running ? 'Läuft' : 'Pausiert'}</span>
                                    </div>
                                </div>
                            )}

                            {/* ── Strike: Einmaisch-Checkliste ── */}
                            {ev.type === 'strike' && (
                                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5 space-y-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Checkliste</p>
                                    <ul className="space-y-2 text-sm text-text-secondary">
                                        <li className="flex items-start gap-2">
                                            <Droplets className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                                            <span>Hauptguss auf <span className="font-mono font-bold text-text-primary">{ev.temp ? `${ev.temp}°C` : 'Zieltemperatur'}</span> erhitzen</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Beaker className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                                            <span>Malz langsam unter Rühren einschütten</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Thermometer className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                                            <span>Temperatur kontrollieren — ggf. nachregulieren</span>
                                        </li>
                                    </ul>
                                </div>
                            )}

                            {/* ── Mashout: Abmaisch-Info ── */}
                            {ev.type === 'mashout' && (
                                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Abmaischen</p>
                                    <ul className="space-y-2 text-sm text-text-secondary">
                                        <li className="flex items-start gap-2">
                                            <Thermometer className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                            <span>Maische auf <span className="font-mono font-bold text-text-primary">{ev.temp ?? 78}°C</span> aufheizen</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Clock className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                            <span>Stoppuhr läuft — &quot;Erledigt&quot; drücken wenn Temperatur erreicht</span>
                                        </li>
                                    </ul>
                                </div>
                            )}

                            {/* ── Boil: Hop Additions ── */}
                            {ev.type === 'boil' && (ev.hops?.length ?? 0) > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Hopfengaben</p>
                                    <div className="grid gap-2">
                                        {ev.hops!.map((h) => {
                                            const hopAddMs = (ev.time! - h.time) * 60_000;
                                            return (
                                                <div key={`${h.name}-${h.time}`} className="flex items-center justify-between bg-surface rounded-lg border border-border px-4 py-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                                            <span className="text-[10px] font-bold text-red-400">{h.time}′</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-text-primary truncate">{h.name}</p>
                                                            <p className="text-xs text-text-disabled">{h.amount} g</p>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <HopCountdown hopAddMs={hopAddMs} boilState={timer} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── OG Measurement ── */}
                            {ev.type === 'measure' && (
                                <div className="space-y-4">
                                    {/* Target value display */}
                                    {ev.description && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
                                            <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-2">Zielwert</p>
                                            <p className="text-2xl md:text-3xl font-mono font-black text-emerald-400">{ev.description.replace('Ziel: ', '')}</p>
                                        </div>
                                    )}

                                    {/* Previous readings */}
                                    {ogReadings.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Bisherige Messungen</p>
                                            {ogReadings.map((r) => (
                                                <div key={r.id} className="flex items-center justify-between bg-surface rounded-lg border border-border px-4 py-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                        <span className="font-mono font-bold text-text-primary text-lg">{r.value.toFixed(3)}</span>
                                                        {r.note && <span className="text-sm text-text-muted truncate">{r.note}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <span className="text-xs text-text-disabled tabular-nums">
                                                            {new Date(r.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <button onClick={() => removeOGReading(r.id)} className="text-text-disabled hover:text-red-500 transition-colors p-1">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add reading form */}
                                    <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
                                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Neue Messung</p>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-disabled" />
                                                <input
                                                    type="number" step="0.001" min="0.9" max="1.2"
                                                    placeholder="1.052"
                                                    value={ogInput}
                                                    onChange={e => setOgInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && addOGReading()}
                                                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 pl-10 text-text-primary text-base font-mono focus:border-emerald-500 outline-none transition-colors"
                                                />
                                            </div>
                                            <input
                                                type="text" placeholder="Notiz"
                                                value={ogNote}
                                                onChange={e => setOgNote(e.target.value)}
                                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:border-emerald-500 outline-none transition-colors"
                                            />
                                            <button onClick={addOGReading} className="shrink-0 w-11 h-11 flex items-center justify-center bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Context info (Volume, Step count) ── */}
                            <div className="flex items-center gap-4 text-xs text-text-disabled">
                                <span className="flex items-center gap-1"><Beaker className="w-3 h-3" />{targetVol} L</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Schritt {active + 1} von {timeline.length}</span>
                                {timeline[active + 1] && (
                                    <span className="truncate">Nächster: {timeline[active + 1].title}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Mobile Bottom Action Bar ── */}
                    <div className="lg:hidden fixed left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-border" style={{ bottom: 'calc(4rem + max(env(safe-area-inset-bottom), 8px))' }}>
                        {/* Timer progress line */}
                        {hasDur && timer.duration > 0 && !ev.stopwatch && (
                            <div className="h-0.5 -mt-px"><TimerProgress state={timer} /></div>
                        )}
                        <div className="flex items-center gap-2 px-2 py-3 sm:px-4">
                            <button
                                onClick={prevStep}
                                disabled={active === 0}
                                className="w-11 h-11 flex items-center justify-center rounded-lg bg-background border border-border text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>

                            {hasDur && (
                                <button
                                    onClick={toggleTimer}
                                    className={`flex items-center gap-2 px-4 h-11 rounded-lg font-mono font-bold tabular-nums text-sm transition-all ${
                                        timer.running
                                            ? 'bg-background border border-amber-500/30 text-amber-500'
                                            : 'bg-amber-600 text-white'
                                    }`}
                                >
                                    {timer.running ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                    {timerDisplay}
                                </button>
                            )}

                            <button
                                onClick={nextStep}
                                className="flex-1 h-11 flex items-center justify-center gap-2 bg-white text-black font-bold text-sm uppercase tracking-wide rounded-lg transition-colors active:scale-[0.98]"
                            >
                                {active === timeline.length - 1 ? 'Fertig 🎉' : 'Erledigt'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* ── Desktop Bottom Action Bar ── */}
                    <div className="hidden lg:flex items-center justify-center gap-3 px-8 py-4 border-t border-border">
                        <button
                            onClick={prevStep}
                            disabled={active === 0}
                            className="flex items-center gap-2 px-5 h-11 rounded-lg bg-surface border border-border text-text-muted hover:text-text-primary disabled:opacity-30 font-medium text-sm transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Zurück
                        </button>

                        {hasDur && (
                            <button
                                onClick={toggleTimer}
                                className={`flex items-center gap-2 px-5 h-11 rounded-lg font-mono font-bold tabular-nums text-sm transition-all ${
                                    timer.running
                                        ? 'bg-surface border border-amber-500/30 text-amber-500 hover:bg-surface-hover'
                                        : 'bg-amber-600 text-white hover:bg-amber-500'
                                }`}
                            >
                                {timer.running ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                                {timerDisplay}
                            </button>
                        )}

                        <button
                            onClick={nextStep}
                            className="flex items-center gap-2 px-8 h-11 bg-white text-black font-bold text-sm uppercase tracking-wide rounded-lg transition-colors hover:bg-gray-100 active:scale-[0.98]"
                        >
                            {active === timeline.length - 1 ? 'Brautag abschließen 🎉' : 'Erledigt'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Desktop Step List Sidebar ── */}
                <div className="hidden lg:block w-72 xl:w-80 shrink-0 border-l border-border bg-background overflow-y-auto sticky top-0 self-start max-h-screen">
                    <div className="p-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-disabled mb-4">Alle Schritte</p>
                        <StepList timeline={timeline} active={active} phases={phases} onGoTo={goTo} />
                    </div>
                </div>
            </div>
        </div>
    );
}