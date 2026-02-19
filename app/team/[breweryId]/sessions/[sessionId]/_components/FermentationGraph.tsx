'use client';

import { useSession } from '../SessionContext';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    Tooltip as RechartsTooltip, 
    ResponsiveContainer, 
    CartesianGrid, 
    ReferenceLine,
    ReferenceDot,
    ReferenceArea
} from 'recharts';
import { platoToSG } from '@/lib/brewing-calculations';
import { useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';

export function FermentationGraph({ height = 300, minimal = false }: { height?: number; minimal?: boolean }) {
    const { measurements, session } = useSession();

    const chartData = useMemo(() => {
        if (!measurements || measurements.length === 0) return [];
        
        return measurements.map(m => {
            let g = parseFloat(String(m.gravity));
            // Auto-fix historical mixed data for chart visualization
            if (g > 1.5 && g < 30) { 
                 // Likely Plato -> convert for display consistency
                 g = platoToSG(g); 
            } else if (g > 900) {
                 // 1050 -> 1.050
                 g = g / 1000;
            }
            return {
                ...m,
                gravity: parseFloat(g.toFixed(3)),
                temperature: m.temperature ? parseFloat(String(m.temperature)) : null,
                timestamp: new Date(m.measured_at).getTime()
            };
        });
    }, [measurements]);

    // Timeline Events for Graph
    const annotations = useMemo(() => {
        if (!session?.timeline) return [];
        const validTypes = ['INGREDIENT_ADDITION', 'NOTE', 'ALERT', 'PROBLEM', 'YEAST_HARVEST'];
        return session.timeline
            .filter(e => validTypes.includes(e.type) || (e.title && (e.title.includes('Stopfen') || e.title.includes('Dry Hop'))))
            .filter(e => e.date && new Date(e.date) > new Date(session.created_at)) // Only show events after session start
            .map(e => {
                const title = e.title || 'Event';
                return {
                    ...e,
                    timestamp: new Date(e.date!).getTime(),
                    label: title.length > 15 ? title.substring(0, 15) + '...' : title
                };
            });
    }, [session?.timeline]);

    // Target Curve Logic
    const targetFG = useMemo(() => {
        const raw = session?.brew?.recipe_data?.fg ?? session?.brew?.recipe_data?.est_fg ?? session?.brew?.recipe_data?.final_gravity;
        if (!raw) return null;
        const val = parseFloat(String(raw));
        if (isNaN(val) || val < 0.9) return null;
        return val > 1.5 ? platoToSG(val) : val;
    }, [session]);

    const targetCurve = useMemo(() => {
         if (!session?.measured_og || !targetFG) return null;
         
         const targetFG2 = targetFG;
         // Estimate duration: 2 weeks (14 days) default for 'ideal' curve
         const idealDurationMs = 14 * 24 * 60 * 60 * 1000; 
         
         // Start point: Session Start or First Measurement or Creation Date
         let startTime = session.started_at ? new Date(session.started_at).getTime() : null;
         if (!startTime && chartData.length > 0) startTime = chartData[0].timestamp;
         if (!startTime) startTime = new Date(session.created_at).getTime();

         const startGravity = session.measured_og > 2 ? platoToSG(session.measured_og) : session.measured_og;

         return [
             { timestamp: startTime, target: startGravity },
             { timestamp: startTime + idealDurationMs, target: targetFG2 }
         ];
    }, [session, chartData, targetFG]);

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 bg-zinc-900/30 border border-zinc-800 rounded-lg text-zinc-500 text-sm h-full">
                Keine Messdaten verfügbar
            </div>
        );
    }

    if (minimal) {
        return (
            <div style={{ height }} className="w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <Line type="monotone" dataKey="gravity" stroke="#0891b2" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    // Compute gravity values for domain calculation
    const gravityValues = chartData.map(d => d.gravity).filter(Boolean) as number[];
    const ogVal = session?.measured_og ? (session.measured_og > 2 ? platoToSG(session.measured_og) : session.measured_og) : null;
    const allGravityRef = [
        ...gravityValues,
        ogVal,
        targetFG,
    ].filter((v): v is number => v != null && !isNaN(v));
    const gMin = allGravityRef.length > 0 ? Math.min(...allGravityRef) - 0.005 : 'auto';
    const gMax = allGravityRef.length > 0 ? Math.max(...allGravityRef) + 0.005 : 'auto';

    // Generate evenly-spaced X ticks across the time range, deduplicated by label
    const tsMin = chartData[0].timestamp;
    const tsMax = chartData[chartData.length - 1].timestamp;
    const rangeMs = tsMax - tsMin;
    // If range < 3 days show time, < 1h show HH:mm:ss
    const showTime = rangeMs < 3 * 24 * 60 * 60 * 1000;
    const showSeconds = rangeMs < 60 * 60 * 1000;
    const xTickFormatter = (ts: number) => {
        const d = new Date(ts);
        if (!showTime) return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
        if (showSeconds) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    };
    const tickCount = 5;
    const rawTicks = Array.from({ length: tickCount }, (_, i) =>
        Math.round(tsMin + (rangeMs / Math.max(tickCount - 1, 1)) * i)
    );
    // Deduplicate by formatted label to avoid Recharts key collision
    const seenLabels = new Set<string>();
    const xTicks = rawTicks.filter(ts => {
        const label = xTickFormatter(ts);
        if (seenLabels.has(label)) return false;
        seenLabels.add(label);
        return true;
    });

    return (
        <div style={{ height }} className="w-full bg-zinc-950/30 rounded-lg p-4 border border-zinc-800/50">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        scale="time"
                        domain={[tsMin, tsMax]}
                        ticks={xTicks}
                        stroke="#52525b"
                        tickFormatter={xTickFormatter}
                        tick={{ fontSize: 10 }}
                    />
                    <YAxis yAxisId="left" stroke="#0891b2" domain={[gMin, gMax]} tick={{ fontSize: 10 }} width={45} tickFormatter={(v) => v.toFixed(3)} />
                    <YAxis yAxisId="right" orientation="right" stroke="#ea580c" domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={30} />
                    <RechartsTooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }}
                        labelFormatter={(ts) => new Date(ts).toLocaleString()}
                    />

                    {/* Measurement Lines */}
                    <Line yAxisId="left" type="monotone" dataKey="gravity" stroke="#0891b2" name="Dichte" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#ea580c" name="Temp" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />

                    {/* Target Gravity Dashed Line (Ideal Curve) */}
                    {targetCurve && (
                        <ReferenceLine
                            yAxisId="left"
                            segment={[
                                { x: targetCurve[0].timestamp, y: targetCurve[0].target },
                                { x: targetCurve[1].timestamp, y: targetCurve[1].target },
                            ]}
                            stroke="#059669"
                            strokeDasharray="5 5"
                            strokeOpacity={0.6}
                            label={{ value: 'Zielkurve', position: 'insideTopRight', fill: '#059669', fontSize: 10 }}
                        />
                    )}

                    {/* Timeline Event Annotations */}
                    {annotations.map((event, i) => (
                        <ReferenceLine
                            key={i}
                            x={event.timestamp}
                            stroke="#fbbf24"
                            strokeDasharray="3 3"
                            label={{ value: event.label, position: 'insideTop', fill: '#fbbf24', fontSize: 10, angle: -90, offset: 10 }}
                        />
                    ))}

                    {/* Horizontal target lines for OG and FG */}
                    {ogVal && (
                        <ReferenceLine yAxisId="left" y={ogVal} stroke="#22c55e" strokeDasharray="4 3" label={{ value: `OG ${ogVal.toFixed(3)}`, position: 'insideTopLeft', fill: '#22c55e', fontSize: 10 }} />
                    )}
                    {targetFG && (
                        <ReferenceLine yAxisId="left" y={targetFG} stroke="#a855f7" strokeDasharray="4 3" label={{ value: `FG ${targetFG.toFixed(3)}`, position: 'insideBottomLeft', fill: '#a855f7', fontSize: 10 }} />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
