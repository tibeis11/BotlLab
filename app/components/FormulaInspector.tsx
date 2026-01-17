'use client';

import { X, Calculator, FlaskConical, Droplets, Scale, Percent, Gauge } from 'lucide-react';
import { 
    calculateIBUDetails, 
    calculateColorEBCDetails, 
    calculateBatchSizeDetails,
    calculateOGDetails,
    calculateABVDetails,
    HopItem, 
    MaltItem,
    IBUContribution,
    ColorContribution
} from '@/lib/brewing-calculations';
import { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

type InspectorType = 'IBU' | 'Color' | 'ABV' | 'BatchSize' | 'OG' | 'FG';

interface FormulaInspectorProps {
    isOpen: boolean;
    onClose: () => void;
    type: InspectorType;
    data: {
        batchSize: number;
        ogPlato?: number;
        fgPlato?: number;
        efficiency?: number;
        mashWater?: number;
        spargeWater?: number;
        hops?: HopItem[];
        malts?: MaltItem[];
    };
}

export function FormulaInspector({ isOpen, onClose, type, data }: FormulaInspectorProps) {
    if (!isOpen) return null;

    let icon = <Calculator size={24} />;
    let title = 'Berechnung';
    
    switch(type) {
        case 'IBU': icon = <Droplets size={24} />; title = 'IBU Berechnung (Tinseth)'; break;
        case 'Color': icon = <FlaskConical size={24} />; title = 'Farbe Berechnung (Morey)'; break;
        case 'BatchSize': icon = <Scale size={24} />; title = 'Mengen-Berechnung'; break;
        case 'OG': icon = <Gauge size={24} />; title = 'Stammwürze (OG) Prognose'; break;
        case 'ABV': icon = <Percent size={24} />; title = 'Alkohol (ABV) Berechnung'; break;
        case 'FG': icon = <Gauge size={24} />; title = 'Restextrakt (FG) Prognose'; break;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                            {icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                            <p className="text-xs text-zinc-400">Transparenter Einblick in die Formeln</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {type === 'IBU' && <IBUInspector data={data} />}
                    {type === 'Color' && <ColorInspector data={data} />}
                    {type === 'BatchSize' && <BatchSizeInspector data={data} />}
                    {type === 'OG' && <OGInspector data={data} />}
                    {type === 'ABV' && <ABVInspector data={data} />}
                    {type === 'FG' && <FGInspector data={data} />}
                </div>
            </div>
        </div>
    );
}

function BatchSizeInspector({ data }: { data: FormulaInspectorProps['data'] }) {
    const { batchSize, totalWater, grainAbsorption, preBoilVolume, boilOff, totalGrainKg } = calculateBatchSizeDetails(
        data.mashWater || 0,
        data.spargeWater || 0,
        data.malts || []
    );

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/50">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-400 font-mono text-sm">Ausschlagwürze (Batch Size)</span>
                    <span className="text-3xl font-black text-cyan-500">{batchSize} L</span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Calculator size={16} />
                    Die Bilanz (Rückwärtsrechnung)
                </h3>
                
                <div className="bg-zinc-800/30 p-2 rounded-lg mb-2">
                     <BlockMath math="V_{Batch} = (V_{Haupt} + V_{Nach}) - V_{Treber} - V_{Verdampfung}" />
                </div>

                <div className="p-4 rounded-xl bg-zinc-800/50 font-mono text-xs md:text-sm text-zinc-300">
                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center mb-2 pb-2 border-b border-zinc-700/50">
                        <span>Gesamtwasser (Haupt- + Nachguss)</span>
                        <span className="font-bold">{totalWater.toFixed(1)} L</span>
                    </div>
                    
                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center text-red-400 mb-1 group relative">
                        <div className="flex flex-col cursor-help">
                             <div className="flex items-center gap-1 border-b border-dashed border-red-400/30 w-fit">
                                <span>- Treberverlust (Absorption)</span>
                                <span className="text-[10px] opacity-70">ⓘ</span>
                             </div>
                             <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                 {totalGrainKg}kg Malz × 0.96 L/kg
                             </span>
                        </div>
                        <span>-{grainAbsorption.toFixed(1)} L</span>
                    </div>

                     <div className="grid grid-cols-[1fr,auto] gap-2 items-center font-bold text-zinc-400 mb-2 pb-2 border-b border-zinc-700/50">
                        <span>= Pfannevollwürze (Pre-Boil)</span>
                        <span>{preBoilVolume.toFixed(1)} L</span>
                    </div>
                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center text-red-400">
                        <div className="flex flex-col">
                            <span>- Verdampfung & Schwand</span>
                            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                {totalGrainKg > 0 ? 'ca. 15% Systemverlust' : '0% (kein Malz)'}
                            </span>
                        </div>
                        <span>-{boilOff.toFixed(1)} L</span>
                    </div>
                     <div className="grid grid-cols-[1fr,auto] gap-2 items-center mt-2 pt-2 border-t border-zinc-500 font-bold text-cyan-400">
                        <span>= Ausschlagwürze (Im Gäreimer)</span>
                        <span>{batchSize} L</span>
                    </div>
                </div>
                <p className="text-xs text-zinc-500 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    ℹ️ <span className="font-bold">Treberverlust:</span> Trockenes Malz saugt Wasser auf, das nicht im Bier landet. Wir rechnen standardmäßig mit <span className="font-mono text-cyan-400">0.96 L pro kg</span> Malz.
                </p>
            </div>
        </div>
    );
}

function OGInspector({ data }: { data: FormulaInspectorProps['data'] }) {
    const { ogPlato, totalGrainKg, extractMass } = calculateOGDetails(
        data.batchSize,
        data.malts || [],
        data.efficiency || 75
    );

    return (
        <div className="space-y-6">
             <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/50">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-400 font-mono text-sm">Stammwürze (OG)</span>
                    <span className="text-3xl font-black text-amber-500">{ogPlato} °P</span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Calculator size={16} />
                    Die Berechnung
                </h3>
                 <div className="p-4 rounded-xl bg-zinc-800/50 font-mono text-xs md:text-sm text-zinc-300">
                     <p className="mb-2 text-zinc-500">// Sudhausausbeute (SHA)</p>
                     <p>Angenommene SHA: <span className="text-cyan-400">{data.efficiency || 75}%</span></p>
                     
                     <div className="my-4 bg-zinc-900/50 p-2 rounded">
                        <BlockMath math="M_{Extrakt} = M_{Schüttung} \times \frac{SHA}{100}" />
                        <BlockMath math={`M_{Extrakt} = ${totalGrainKg}kg \\times ${((data.efficiency || 75)/100).toFixed(2)} = ${extractMass}kg`} />
                     </div>
                     
                     <p className="mb-2 text-zinc-500">// Konzentration (Lincoln Equation)</p>
                     <p className="text-xs text-zinc-500 mt-1">Wir nutzen eine exakte Herleitung aus der Lincoln-Gleichung für SG:</p>
                     <div className="my-2 bg-zinc-900/50 p-2 rounded">
                        <BlockMath math="C = \frac{M_{Extrakt} \times 100}{V_{Batch}}" />
                        <BlockMath math="P = \frac{259 \times C}{259 + C}" />
                     </div>
                 </div>
            </div>
        </div>
    );
}

function ABVInspector({ data }: { data: FormulaInspectorProps['data'] }) {
    const { abv, ogSG, fgSG } = calculateABVDetails(
        data.ogPlato || 0,
        data.fgPlato || 0
    );

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/50">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-400 font-mono text-sm">Alkohol (ABV)</span>
                    <span className="text-3xl font-black text-cyan-500">{abv}%</span>
                </div>
            </div>

             <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Calculator size={16} />
                    Die Formel
                </h3>
                <div className="p-4 rounded-xl bg-zinc-800/50 font-mono text-xs md:text-sm text-zinc-300">
                    <p className="mb-2 text-zinc-500">// Standard-Formel (nach SG)</p>
                    <div className="my-2 bg-zinc-900/50 p-2 rounded">
                        <BlockMath math="ABV = (OG_{sg} - FG_{sg}) \times 131.25" />
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-700/50 grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-zinc-500 block mb-1">OG (Start)</span>
                            <span className="text-white">{data.ogPlato}°P <span className="text-zinc-500">→ {ogSG} SG</span></span>
                        </div>
                        <div>
                            <span className="text-zinc-500 block mb-1">FG (Ende)</span>
                            <span className="text-white">{data.fgPlato}°P <span className="text-zinc-500">→ {fgSG} SG</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FGInspector({ data }: { data: FormulaInspectorProps['data'] }) {
    return (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/50">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-400 font-mono text-sm">Restextrakt (FG)</span>
                    <span className="text-3xl font-black text-cyan-500">{data.fgPlato} °P</span>
                </div>
            </div>
             <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Calculator size={16} />
                    Die Schätzung
                </h3>
                <div className="p-4 rounded-xl bg-zinc-800/50 font-mono text-xs md:text-sm text-zinc-300">
                    <p className="mb-2 text-zinc-500">// Vergärungsgrad (V_Grad)</p>
                    <div className="my-2 bg-zinc-900/50 p-2 rounded">
                        <BlockMath math="FG = OG \times (1 - V_{Grad})" />
                    </div>
                    <p className="mt-2 text-zinc-400">Wir nehmen standardmäßig 75% Vergärungsgrad an, falls keine Hefe spezifiziert ist.</p>
                </div>
            </div>
        </div>
    );
}


function IBUInspector({ data }: { data: FormulaInspectorProps['data'] }) {
    const { totalIBU, parts, boilGravity } = calculateIBUDetails(
        data.batchSize, 
        data.ogPlato || 0, 
        data.hops || []
    );

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/50">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-400 font-mono text-sm">Gesamt IBU</span>
                    <span className="text-3xl font-black text-amber-500">{totalIBU}</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/50 w-full" />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Calculator size={16} />
                    Die Formel (Tinseth)
                </h3>
                <div className="bg-zinc-800/30 p-2 rounded-lg mb-2">
                     <BlockMath math="IBU = \frac{U_{\text{total}} \times mg_{\alpha}}{V_{Liter}}" />
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/50 font-mono text-xs md:text-sm text-zinc-300 overflow-x-auto">
                    <p className="mb-2 text-zinc-500">// Ausbeute / Utilization (U)</p>
                    <div className="my-2 bg-zinc-900/50 p-2 rounded">
                        <BlockMath math="U_{\text{total}} = U_{\text{Bigness}} \times U_{\text{Time}}" />
                        <div className="text-green-400 mt-2 font-bold text-center">
                             + 10% für Pellets (x 1.1)
                        </div>
                    </div>
                    
                    <p className="mt-4 mb-2 text-zinc-500">// Teil-Faktoren</p>
                    <div className="my-2 bg-zinc-900/50 p-2 rounded">
                         <BlockMath math="U_{\text{Bigness}} = 1.65 \times 0.000125^{(SG_{Boil}-1)}" />
                         <BlockMath math="U_{\text{Time}} = \frac{1 - e^{-0.04 \times t}}{4.15}" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white">Beiträge der Hopfen</h3>
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-900 text-zinc-500 font-medium">
                            <tr>
                                <th className="p-3">Hopfen</th>
                                <th className="p-3 text-right">Menge</th>
                                <th className="p-3 text-right">Alpha</th>
                                <th className="p-3 text-right">Zeit</th>
                                <th className="p-3 text-right">Ausbeute</th>
                                <th className="p-3 text-right text-white">IBU</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {parts.map((part, i) => (
                                <tr key={i} className="hover:bg-zinc-800/20">
                                    <td className="p-3 font-medium text-zinc-300">{part.hopName}</td>
                                    <td className="p-3 text-right text-zinc-400">{part.amount}g</td>
                                    <td className="p-3 text-right text-zinc-400">{part.alpha}%</td>
                                    <td className="p-3 text-right text-zinc-400">{part.time}m</td>
                                    <td className="p-3 text-right text-zinc-500">{(part.utilization * 100).toFixed(1)}%</td>
                                    <td className="p-3 text-right font-bold text-amber-500">+{part.ibu}</td>
                                </tr>
                            ))}
                            {parts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-zinc-500">Keine Hopfen hinzugefügt.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-zinc-500">
                    * Bigness Factor basiert auf einer geschätzten Kochdichte von {boilGravity.toFixed(3)} (aus Stammwürze abgeleitet).
                </p>
            </div>
        </div>
    );
}

function ColorInspector({ data }: { data: FormulaInspectorProps['data'] }) {
    const { totalEBC, parts, totalMCU } = calculateColorEBCDetails(
        data.batchSize, 
        data.malts || []
    );

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/50">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-400 font-mono text-sm">Gesamt EBC</span>
                    <span className="text-3xl font-black" style={{ color: totalEBC < 10 ? '#EAB308' : '#EA580C' }}>{totalEBC}</span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Calculator size={16} />
                    Die Formel (Morey)
                </h3>
                <div className="p-4 rounded-xl bg-zinc-800/50 font-mono text-xs md:text-sm text-zinc-300 overflow-x-auto">
                    <p className="mb-2 text-zinc-500">// Malt Color Units (MCU)</p>
                    <div className="my-2 bg-zinc-900/50 p-2 rounded">
                        <BlockMath math="MCU = \frac{W_{lbs} \times L}{V_{gal}}" />
                    </div>
                    <p className="mt-4 mb-2 text-zinc-500">// Umrechnung zu SRM & EBC</p>
                    <div className="my-2 bg-zinc-900/50 p-2 rounded">
                        <BlockMath math="SRM = 1.4922 \times (MCU)^{0.6859}" />
                        <BlockMath math="EBC = SRM \times 1.97" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white">Beiträge der Malze</h3>
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-900 text-zinc-500 font-medium">
                            <tr>
                                <th className="p-3">Malz</th>
                                <th className="p-3 text-right">Menge</th>
                                <th className="p-3 text-right">Farbe</th>
                                <th className="p-3 text-right text-white">MCU Beitrag</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {parts.map((part, i) => (
                                <tr key={i} className="hover:bg-zinc-800/20">
                                    <td className="p-3 font-medium text-zinc-300">{part.maltName}</td>
                                    <td className="p-3 text-right text-zinc-400">{part.amountKg}kg</td>
                                    <td className="p-3 text-right text-zinc-400">{part.colorEBC} EBC</td>
                                    <td className="p-3 text-right font-bold text-zinc-300">{part.mcu}</td>
                                </tr>
                            ))}
                             {parts.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-zinc-500">Keine Malze hinzugefügt.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-zinc-500">
                    * Total MCU: {totalMCU}
                </p>
            </div>
        </div>
    );
}
