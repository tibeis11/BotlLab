'use client';

import { useSession } from '../../SessionContext';
import { PhaseTitle } from './PhaseLayout';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Clock,
    Thermometer,
    Beaker,
    ArrowRight,
    Play,
    Pause,
    Plus,
    Trash2,
    Droplets,
    FlaskConical,
    CheckCircle2,
    ChevronUp,
    ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { BotlGuideTrigger } from '@/app/components/BotlGuideTrigger';

// 
// Types
// 

type EventType = 'mash' | 'sparge' | 'boil' | 'measure';

interface TEvent {
    id: string;
    type: EventType;
    title: string;
    description?: string;
    time?: number;
    temp?: number;
    spargeVol?: number;
    hops?: HopAddition[];
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

// 
// Helpers
// 

const sf = (v: any): number => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
};

const fmtMs = (ms: number) => {
    const s = Math.floor(Math.max(0, ms) / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const TYPE_LABEL: Record<EventType, string> = {
    mash:    'Maischen',
    sparge:  'Laeutern',
    boil:    'Wuerze\u00adkochen',
    measure: 'Abschluss',
};

// 
// LiveTimer
// 

function LiveTimer({ state }: { state: TimerState }) {
    const [display, setDisplay] = useState(() => fmtMs(Math.max(0, state.duration - state.elapsed)));
    useEffect(() => {
        if (!state.running || !state.startTime) {
            setDisplay(fmtMs(Math.max(0, state.duration - state.elapsed)));
            return;
        }
        const tick = () => {
            const total = state.elapsed + (Date.now() - state.startTime!);
            setDisplay(fmtMs(Math.max(0, state.duration - total)));
        };
        tick();
        const id = setInterval(tick, 200);
        return () => clearInterval(id);
    }, [state]);
    return <>{display}</>;
}

// 
// TimerBar
// 

function TimerBar({ state }: { state: TimerState }) {
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
    return <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />;
}

// 
// HopCountdown
// 

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
    if (due) return <span className="text-amber-400 font-bold animate-pulse">JETZT</span>;
    return <span className="font-mono tabular-nums">{fmtMs(remaining)}</span>;
}

// 
// Main Component
// 

export function BrewDayTab() {
    const { session, updateSessionData, addEvent } = useSession();

    const data        = session?.brew?.recipe_data       ?? {};
    const meas        = (session?.measurements as any)   ?? {};
    const savedTimers = meas.timers                      ?? {};
    const targetVol   = sf(meas.target_volume            ?? data.batch_size ?? 20);
    const origVol     = sf(meas.original_volume          ?? data.batch_size ?? 20);
    const scale       = origVol > 0 ? targetVol / origVol : 1;

    const timeline = useMemo<TEvent[]>(() => {
        const ev: TEvent[] = [];

        // 1. Mash steps (no Vorbereitung prefix)
        const mashSteps: any[] = data.mash_steps ?? data.mash_schedule ?? [];
        if (mashSteps.length > 0) {
            mashSteps.forEach((s, i) => {
                const t = sf(s.temperature ?? s.temp);
                ev.push({
                    id:    `mash-${i}`,
                    type:  'mash',
                    title: s.name ?? (i === 0 ? 'Einmaischen' : `Rast ${i + 1}`),
                    time:  sf(s.duration ?? s.time),
                    temp:  t > 0 ? t : undefined,
                });
            });
        } else {
            ev.push({ id: 'mash-0', type: 'mash', title: 'Einmaischen', time: 60, temp: 67 });
        }

        // 2. Sparge / Laeutern with Nachguss volume
        const spargeVol = sf(data.sparge_water_liters ?? data.sparge_volume ?? data.sparge_water_volume ?? 0);
        ev.push({
            id:        'sparge',
            type:      'sparge',
            title:     'Laeutern & Nachguss',
            spargeVol: spargeVol > 0 ? spargeVol : undefined,
        });

        // 3. Boil with hops embedded
        const boilTime = sf(data.boil_time ?? 60);
        const rawHops: any[] = data.hops ?? data.ingredients?.hops ?? [];
        const boilHops: HopAddition[] = rawHops
            .filter((h: any) => h.type === 'boil' || h.usage === 'Boil' || sf(h.time) > 0)
            .sort((a: any, b: any) => sf(b.time) - sf(a.time))
            .map((h: any) => ({
                name:   h.name ?? 'Hopfen',
                amount: Math.round(sf(String(h.amount ?? 0).replace(',', '.')) * scale),
                time:   sf(h.time),
            }));
        ev.push({
            id:    'boil',
            type:  'boil',
            title: 'Wuerze\u00adkochen',
            time:  boilTime > 0 ? boilTime : 60,
            temp:  100,
            hops:  boilHops,
        });

        // 4. OG Measurement
        const og = sf(data.og ?? '1.050');
        let desc = 'Zielwert nicht definiert';
        if (og > 0) {
            if (og > 2) {
                 // Assumed Plato
                 const sg = 1 + (og / (258.6 - ((og / 258.2) * 227.1)));
                 desc = `Ziel: ${og.toFixed(1)}°P (${sg.toFixed(3)} SG)`;
            } else {
                 // Assumed SG
                 const plato = (135.997 * Math.pow(og, 3)) - (630.272 * Math.pow(og, 2)) + (1111.14 * og) - 616.868;
                 desc = `Ziel: ${og.toFixed(3)} SG (${plato.toFixed(1)}°P)`;
            }
        }

        ev.push({
            id:          'measure',
            type:        'measure',
            title:       'Stammwuerze messen',
            description: desc,
        });

        return ev;
    }, [data, scale]);

    const [active, setActive]     = useState(0);
    const [timer,  setTimer]      = useState<TimerState>({ running: false, startTime: null, elapsed: 0, duration: 0 });
    const [ogReadings, setOgReadings] = useState<OGReading[]>(() => meas.og_readings ?? []);
    const [ogInput,    setOgInput]    = useState('');
    const [ogNote,     setOgNote]     = useState('');
    const [timerExpanded, setTimerExpanded] = useState(false);

    const activeRef    = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (meas.active_step_index !== undefined) setActive(meas.active_step_index);
        if (savedTimers.global) setTimer(savedTimers.global);
        if (meas.og_readings)   setOgReadings(meas.og_readings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [active]);

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

    const goTo = (i: number) => {
        setActive(i);
        const step    = timeline[i];
        const hasDur  = (step.time ?? 0) > 0 && step.type !== 'measure';
        const newTimer: TimerState = hasDur
            ? { running: false, startTime: null, elapsed: 0, duration: step.time! * 60_000 }
            : { running: false, startTime: null, elapsed: 0, duration: 0 };
        setTimer(newTimer);
        updateSessionData({ measurements: { ...meas, active_step_index: i, timers: { ...savedTimers, global: newTimer } } as any });
    };

    const toggleTimer = (e: React.MouseEvent) => {
        e.stopPropagation();
        const now = Date.now();
        const next: TimerState = timer.running
            ? { ...timer, running: false, startTime: null, elapsed: timer.elapsed + (now - (timer.startTime ?? now)) }
            : { ...timer, running: true, startTime: now };
        setTimer(next);
        updateSessionData({ measurements: { ...meas, timers: { ...savedTimers, global: next } } as any });
    };

    const nextStep = (e: React.MouseEvent) => {
        e.stopPropagation();
        const next = active + 1;
        if (next < timeline.length) {
            addEvent({ type: 'NOTE', title: `\u2713 ${timeline[active].title}`, data: { stepIndex: active } });
            goTo(next);
            toast.success('Weiter!', { description: timeline[next].title });
        } else {
            toast.success('Brautag abgeschlossen! \uD83C\uDF89');
        }
    };

    const addOGReading = () => {
        const val = sf(ogInput);
        if (val < 0.9 || val > 1.2) {
            toast.error('Ungueltiger Wert', { description: 'Bitte einen Wert zwischen 0.900 und 1.200 eingeben.' });
            return;
        }
        const reading: OGReading = {
            id:        crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            value:     val,
            note:      ogNote.trim() || undefined,
        };
        const updated = [...ogReadings, reading];
        setOgReadings(updated);
        setOgInput('');
        setOgNote('');
        addEvent({ type: 'MEASUREMENT_OG', title: `OG: ${val.toFixed(3)}`, data: { value: val, note: reading.note } });
        updateSessionData({ measurements: { ...meas, og_readings: updated } as any });
        toast.success('Messung gespeichert', { description: `${val.toFixed(3)}` });
    };

    const removeOGReading = (id: string) => {
        const updated = ogReadings.filter(r => r.id !== id);
        setOgReadings(updated);
        updateSessionData({ measurements: { ...meas, og_readings: updated } as any });
    };

    type Phase = { label: string; color: string };
    const PHASE_MAP: Record<EventType, Phase> = {
        mash:    { label: 'Maischen',  color: 'text-amber-400'   },
        sparge:  { label: 'Laeutern', color: 'text-sky-400'     },
        boil:    { label: 'Kochen',    color: 'text-red-400'     },
        measure: { label: 'Abschluss', color: 'text-emerald-400' },
    };

    const getHeader = (i: number): Phase | null => {
        const cur  = PHASE_MAP[timeline[i].type];
        const prev = i > 0 ? PHASE_MAP[timeline[i - 1].type] : null;
        if (i === 0 || cur.label !== prev?.label) return cur;
        return null;
    };

    const hasDur = (ev: TEvent) => (ev.time ?? 0) > 0 && ev.type !== 'measure';

    return (
        <div className="flex flex-col md:flex-row bg-black text-zinc-300 border-t border-zinc-900">

            {timer.duration > 0 && (
                <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800 shadow-[0_-4px_16px_rgba(0,0,0,0.6)]">
                    {/* Expandable details panel */}
                    {timerExpanded && (
                        <div className="px-4 py-3 border-b border-zinc-800 grid grid-cols-2 gap-x-6 gap-y-2">
                            {timeline[active]?.temp !== undefined && (
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-widest text-zinc-600 flex items-center gap-1.5"><Thermometer className="w-3 h-3"/>Temp</span>
                                    <span className="font-mono text-xs text-amber-400">{timeline[active].temp}°C</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-600 flex items-center gap-1.5"><Beaker className="w-3 h-3"/>Volumen</span>
                                <span className="font-mono text-xs text-zinc-300">{targetVol} L</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-600 flex items-center gap-1.5"><Clock className="w-3 h-3"/>Schritt</span>
                                <span className="font-mono text-xs text-zinc-300">{active + 1} / {timeline.length}</span>
                            </div>
                            {timeline[active + 1] && (
                                <div className="flex items-center justify-between col-span-2">
                                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">Nächster</span>
                                    <span className="text-xs text-zinc-400 truncate max-w-[180px] text-right">{timeline[active + 1].title}</span>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Collapsed strip */}
                    <div className="flex items-center justify-between px-4 h-12">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${timer.running ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'}`} />
                            <span className="text-[11px] text-zinc-500 truncate">{timeline[active]?.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-base font-mono font-bold text-white tabular-nums"><LiveTimer state={timer} /></span>
                            <button onClick={toggleTimer} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${timer.running ? 'bg-zinc-800 text-amber-500' : 'bg-amber-600 text-white'}`}>
                                {timer.running ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                            </button>
                            <button onClick={() => setTimerExpanded(v => !v)} className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors">
                                {timerExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div ref={containerRef} className="flex-1 min-w-0">
                <div className="max-w-lg mx-auto py-4 pb-4 md:pb-4">
                    <div className="mb-4">
                        <PhaseTitle>Brautag</PhaseTitle>
                        <p className="text-zinc-500 text-sm">Schritt-für-Schritt Anleitung für <span className="font-mono text-zinc-400">#{session?.batch_code || session?.brew?.name}</span></p>
                    </div>

                    {timeline.map((ev, i) => {
                        const isActive = i === active;
                        const isPast   = i < active;
                        const header   = getHeader(i);

                        return (
                            <div key={ev.id}>
                                {header && (
                                    <div className="flex items-center gap-2 pt-5 pb-1">
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${header.color}`}>{header.label}</p>
                                        {ev.type === 'sparge'  && <BotlGuideTrigger guideKey="brautag.laeutern"  icon="info" />}
                                        {ev.type === 'measure' && <BotlGuideTrigger guideKey="brautag.og_messen" icon="info" />}
                                    </div>
                                )}

                                <div ref={isActive ? activeRef : undefined} onClick={() => !isActive && goTo(i)} className={`flex gap-3 py-0.5 ${!isActive ? 'cursor-pointer' : ''}`}>
                                    <div className="flex flex-col items-center w-4 shrink-0 pt-3.5">
                                        <div className={`w-2 h-2 rounded-full transition-all duration-200 ${isActive ? 'bg-amber-500 ring-4 ring-amber-500/20 scale-150' : isPast ? 'bg-zinc-800' : 'bg-zinc-700'}`} />
                                    </div>

                                    <div className="flex-1 min-w-0 mb-0.5">
                                        {isActive ? (
                                            <div className="my-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                                                <div className="p-4 space-y-3">
                                                    <div>
                                                        <p className="text-[10px] font-mono uppercase tracking-widest text-amber-500 mb-1">
                                                            {TYPE_LABEL[ev.type]}
                                                            {hasDur(ev) && <span className="text-zinc-600 ml-2">· {ev.time} min</span>}
                                                        </p>
                                                        <h2 className="text-base font-bold text-white mb-2">{ev.title}</h2>
                                                        {ev.type === 'measure' && ev.description ? (
                                                            <div className="bg-zinc-950/50 border border-zinc-800 rounded px-3 py-2 inline-block">
                                                                <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold mr-2">Zielwert</span>
                                                                <span className="text-lg font-mono font-bold text-emerald-400">{ev.description.replace('Ziel: ', '')}</span>
                                                            </div>
                                                        ) : (
                                                            ev.description && <p className="text-xs text-zinc-500 mt-0.5">{ev.description}</p>
                                                        )}
                                                    </div>

                                                    {(ev.temp || ev.spargeVol) && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {ev.temp && (
                                                                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold bg-zinc-950 border border-zinc-800 text-amber-400 px-2 py-1 rounded">
                                                                    <Thermometer className="w-3 h-3" />{ev.temp}°C
                                                                </span>
                                                            )}
                                                            {ev.spargeVol && (
                                                                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold bg-zinc-950 border border-zinc-800 text-sky-400 px-2 py-1 rounded">
                                                                    <Droplets className="w-3 h-3" />{ev.spargeVol} L Nachguss
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {ev.type === 'boil' && (ev.hops?.length ?? 0) > 0 && (
                                                        <div className="rounded-md border border-zinc-800 overflow-hidden">
                                                            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950 border-b border-zinc-800">
                                                                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Hopfengaben</span>
                                                                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-600">verbleibend</span>
                                                            </div>
                                                            {ev.hops!.map((h) => {
                                                                const hopAddMs = (ev.time! - h.time) * 60_000;
                                                                return (
                                                                    <div key={`${h.name}-${h.time}`} className="flex items-center justify-between px-3 py-2 text-xs border-b border-zinc-800/50 last:border-0">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="text-zinc-300 truncate font-medium">{h.name}</span>
                                                                            <span className="text-zinc-600 shrink-0">{h.amount} g</span>
                                                                            <span className="text-zinc-700 shrink-0">bei {h.time} min</span>
                                                                        </div>
                                                                        <div className="text-zinc-400 shrink-0 ml-2">
                                                                            <HopCountdown hopAddMs={hopAddMs} boilState={timer} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {ev.type === 'measure' && (
                                                        <div className="space-y-3">
                                                            {ogReadings.length > 0 && (
                                                                <div className="rounded-md border border-zinc-800 overflow-hidden">
                                                                    {ogReadings.map((r) => (
                                                                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-xs border-b border-zinc-800/50 last:border-0">
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                                <span className="font-mono font-bold text-white">{r.value.toFixed(3)}</span>
                                                                                {r.note && <span className="text-zinc-500 truncate">{r.note}</span>}
                                                                            </div>
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                <span className="text-zinc-700 tabular-nums">
                                                                                    {new Date(r.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                                                </span>
                                                                                <button onClick={() => removeOGReading(r.id)} className="text-zinc-700 hover:text-red-500 transition-colors p-0.5">
                                                                                    <Trash2 className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <FlaskConical className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                                                                    <input
                                                                        type="number" step="0.001" min="0.9" max="1.2"
                                                                        placeholder="1.052"
                                                                        value={ogInput}
                                                                        onChange={e => setOgInput(e.target.value)}
                                                                        onKeyDown={e => e.key === 'Enter' && addOGReading()}
                                                                        className="w-full bg-black border border-zinc-800 rounded px-3 py-2 pl-8 text-white text-sm font-mono focus:border-zinc-600 outline-none"
                                                                    />
                                                                </div>
                                                                <input
                                                                    type="text" placeholder="Notiz (optional)"
                                                                    value={ogNote}
                                                                    onChange={e => setOgNote(e.target.value)}
                                                                    className="flex-1 bg-black border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:border-zinc-600 outline-none"
                                                                />
                                                                <button onClick={addOGReading} className="shrink-0 w-9 h-9 flex items-center justify-center bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors">
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 pt-1">
                                                        {hasDur(ev) && (
                                                            <button onClick={toggleTimer} className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold uppercase tracking-wide border transition-colors shrink-0 ${timer.running ? 'bg-zinc-950 border-zinc-700 text-amber-500 hover:bg-zinc-800' : 'bg-amber-600 border-transparent text-white hover:bg-amber-500'}`}>
                                                                {timer.running ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                                                                <span className="font-mono tabular-nums text-sm tracking-tighter"><LiveTimer state={timer} /></span>
                                                            </button>
                                                        )}
                                                        <button onClick={nextStep} className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-black text-xs font-bold uppercase tracking-wide rounded transition-colors active:scale-95">
                                                            Erledigt <ArrowRight className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {hasDur(ev) && timer.duration > 0 && (
                                                    <div className="h-0.5 bg-zinc-800"><TimerBar state={timer} /></div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={`flex items-center gap-3 py-2 ${isPast ? 'opacity-35' : 'hover:opacity-70 transition-opacity'}`}>
                                                <span className={`text-sm flex-1 min-w-0 truncate ${isPast ? 'line-through text-zinc-500' : 'text-zinc-400'}`}>{ev.title}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {ev.temp !== undefined && ev.type === 'mash' && (
                                                        <span className="text-[10px] font-mono text-amber-700">{ev.temp}°C</span>
                                                    )}
                                                    {ev.spargeVol !== undefined && (
                                                        <span className="text-[10px] font-mono text-sky-700">{ev.spargeVol} L</span>
                                                    )}
                                                    {hasDur(ev) && (
                                                        <span className="text-[10px] font-mono text-zinc-700">{ev.time} min</span>
                                                    )}
                                                    {ev.type === 'measure' && ogReadings.length > 0 && (
                                                        <span className="text-[10px] font-mono text-emerald-700">{ogReadings.length}×</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <p className="pt-10 pl-7 text-[10px] font-mono text-zinc-800 uppercase tracking-widest">Ende</p>
                </div>
            </div>

            <div className="w-56 hidden xl:flex flex-col shrink-0 border-l border-zinc-900 p-5 gap-5 sticky top-0 self-start">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Timer</p>
                    {timer.duration > 0 ? (
                        <>
                            <div className="text-3xl font-mono font-black text-white tabular-nums tracking-tighter"><LiveTimer state={timer} /></div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${timer.running ? 'bg-amber-500 animate-pulse' : 'bg-zinc-800'}`} />
                                <span className="text-xs text-zinc-600">{timer.running ? 'Laeuft' : 'Pausiert'}</span>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-zinc-700">Kein aktiver Timer</p>
                    )}
                </div>
                <div className="h-px bg-zinc-900"/>
                <div className="space-y-3">
                    {timeline[active]?.temp !== undefined && (
                        <div className="flex justify-between text-xs">
                            <span className="text-zinc-600 flex items-center gap-2"><Thermometer className="w-3 h-3"/>Temperatur</span>
                            <span className="font-mono text-amber-400">{timeline[active].temp}°C</span>
                        </div>
                    )}
                    {timeline[active]?.spargeVol !== undefined && (
                        <div className="flex justify-between text-xs">
                            <span className="text-zinc-600 flex items-center gap-2"><Droplets className="w-3 h-3"/>Nachguss</span>
                            <span className="font-mono text-sky-400">{timeline[active].spargeVol} L</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-600 flex items-center gap-2"><Beaker className="w-3 h-3"/>Volumen</span>
                        <span className="font-mono text-zinc-300">{targetVol} L</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-600 flex items-center gap-2"><Clock className="w-3 h-3"/>Schritt</span>
                        <span className="font-mono text-zinc-300">{active + 1} / {timeline.length}</span>
                    </div>
                </div>
                <div className="h-px bg-zinc-900"/>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Naechster Schritt</p>
                    <p className="text-xs text-zinc-400">{timeline[active + 1]?.title ?? '\u2014'}</p>
                </div>
            </div>
        </div>
    );
}