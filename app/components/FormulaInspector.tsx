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
import { createPortal } from 'react-dom';
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
        boilTime?: number;
    };
}

export function FormulaInspector({ isOpen, onClose, type, data }: FormulaInspectorProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Lock Body Scroll when Open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

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

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-black border border-zinc-800 w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="shrink-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800 bg-black">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-900 text-cyan-500 border border-zinc-800">
                            {icon}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">{title}</h2>
                            <p className="text-[10px] uppercase font-medium tracking-wider text-zinc-500">Transparenter Einblick in die Formeln</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-8 overflow-y-auto">
                    {type === 'IBU' && <IBUInspector data={data} />}
                    {type === 'Color' && <ColorInspector data={data} />}
                    {type === 'BatchSize' && <BatchSizeInspector data={data} />}
                    {type === 'OG' && <OGInspector data={data} />}
                    {type === 'ABV' && <ABVInspector data={data} />}
                    {type === 'FG' && <FGInspector data={data} />}
                </div>
            </div>
        </div>,
        document.body
    );
}

function BatchSizeInspector({ data }: { data: FormulaInspectorProps['data'] }) {
    // @ts-ignore - Ignore TS error for new return properties until full rebuild
    const { batchSize, totalWater, grainAbsorption, preBoilVolume, boilOff, totalGrainKg, trubLoss, shrinkageLoss } = calculateBatchSizeDetails(
        data.mashWater || 0,
        data.spargeWater || 0,
        data.malts || [],
        data.boilTime || 60
    );

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-lg bg-black border border-zinc-800">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Ausschlagwürze (Batch Size)</span>
                    <span className="text-3xl font-black text-cyan-500">{batchSize} L</span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-zinc-500" />
                    Die Bilanz (Rückwärtsrechnung)
                </h3>
                
                <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg mb-2 overflow-x-auto">
                     <BlockMath math="V_{Batch} = V_{Pfannevoll} - V_{Verdampfung} - V_{Trub} - V_{Schrumpfung}" />
                </div>

                <div className="p-4 rounded-lg bg-black border border-zinc-800 font-mono text-xs md:text-sm text-zinc-300">
                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center mb-2 pb-2 border-b border-zinc-800">
                        <span>Gesamtwasser (Haupt- + Nachguss)</span>
                        <span className="font-bold">{totalWater.toFixed(1)} L</span>
                    </div>
                    
                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center text-red-500 mb-1 group relative">
                        <div className="flex flex-col cursor-help">
                             <div className="flex items-center gap-1 border-b border-dashed border-red-500/30 w-fit">
                                <span>- Treberverlust (Absorption)</span>
                                <span className="text-[10px] opacity-70">ⓘ</span>
                             </div>
                             <span className="text-[10px] text-zinc-600 font-mono mt-0.5">
                                 {totalGrainKg}kg Malz × 0.96 L/kg
                             </span>
                        </div>
                        <span>-{grainAbsorption.toFixed(1)} L</span>
                    </div>

                     <div className="grid grid-cols-[1fr,auto] gap-2 items-center font-bold text-zinc-500 mb-2 pb-2 border-b border-zinc-800">
                        <span>= Pfannevollwürze (Pre-Boil)</span>
                        <span>{preBoilVolume.toFixed(1)} L</span>
                    </div>
                    
                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center text-red-500">
                        <div className="flex flex-col">
                            <span>- Verdampfung</span>
                            <span className="text-[10px] text-zinc-600 font-mono mt-0.5">
                                3.5 L/h × {(data.boilTime || 60) / 60}h
                            </span>
                        </div>
                        <span>-{boilOff.toFixed(1)} L</span>
                    </div>

                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center text-red-500">
                         <div className="flex flex-col">
                            <span>- Hopfenseihverlust (Trub)</span>
                            <span className="text-[10px] text-zinc-600 font-mono mt-0.5">
                                Pauschalverlust
                            </span>
                        </div>
                        <span>-{(trubLoss || 0).toFixed(1)} L</span>
                    </div>

                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center text-red-500">
                         <div className="flex flex-col">
                            <span>- Abkühlverlust (4%)</span>
                            <span className="text-[10px] text-zinc-600 font-mono mt-0.5">
                                thermische Kontraktion
                            </span>
                        </div>
                        <span>-{(shrinkageLoss || 0).toFixed(1)} L</span>
                    </div>

                     <div className="grid grid-cols-[1fr,auto] gap-2 items-center mt-2 pt-2 border-t border-zinc-800 font-bold text-cyan-500">
                        <span>= Ausschlagwürze (Im Gäreimer)</span>
                        <span>{batchSize} L</span>
                    </div>
                </div>
                <p className="text-xs text-zinc-500 bg-black p-3 rounded-lg border border-zinc-800">
                    ℹ️ <span className="font-bold text-zinc-400">Physikalisches Modell:</span> Wir berechnen nun exakt nach Kochdauer (3,5L/h), Trubverlust (0,5L) und Schrumpfung (4%).
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
             <div className="p-4 rounded-lg bg-black border border-zinc-800">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Stammwürze (OG)</span>
                    <span className="text-3xl font-black text-amber-500">{ogPlato} °P</span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-zinc-500" />
                    Die Berechnung
                </h3>
                 <div className="p-4 rounded-lg bg-black border border-zinc-800 font-mono text-xs md:text-sm text-zinc-300">
                     <p className="mb-2 text-zinc-500">// Sudhausausbeute (SHA)</p>
                     <p>Angenommene SHA: <span className="text-cyan-500">{data.efficiency || 75}%</span></p>
                     
                     <div className="my-4 bg-zinc-900 border border-zinc-800 p-2 rounded-lg overflow-x-auto">
                        <BlockMath math="M_{Extrakt} = M_{Schüttung} \times \frac{SHA}{100}" />
                        <BlockMath math={`M_{Extrakt} = ${totalGrainKg}kg \\times ${((data.efficiency || 75)/100).toFixed(2)} = ${extractMass}kg`} />
                     </div>
                     
                     <p className="mb-2 text-zinc-500">// Konzentration (Lincoln Equation)</p>
                     <p className="text-xs text-zinc-500 mt-1">Wir nutzen eine exakte Herleitung aus der Lincoln-Gleichung für SG:</p>
                     <div className="my-2 bg-zinc-900 border border-zinc-800 p-2 rounded-lg overflow-x-auto">
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
            <div className="p-4 rounded-lg bg-black border border-zinc-800">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Alkohol (ABV)</span>
                    <span className="text-3xl font-black text-cyan-500">{abv}%</span>
                </div>
            </div>

             <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-zinc-500" />
                    Die Formel
                </h3>
                <div className="p-4 rounded-lg bg-black border border-zinc-800 font-mono text-xs md:text-sm text-zinc-300">
                    <p className="mb-2 text-zinc-500">// Standard-Formel (nach SG)</p>
                    <div className="my-2 bg-zinc-900 border border-zinc-800 p-2 rounded-lg overflow-x-auto">
                        <BlockMath math="ABV = (OG_{sg} - FG_{sg}) \times 131.25" />
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-4">
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
            <div className="p-4 rounded-lg bg-black border border-zinc-800">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Restextrakt (FG)</span>
                    <span className="text-3xl font-black text-cyan-500">{data.fgPlato} °P</span>
                </div>
            </div>
             <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-zinc-500" />
                    Die Schätzung
                </h3>
                <div className="p-4 rounded-lg bg-black border border-zinc-800 font-mono text-xs md:text-sm text-zinc-300">
                    <p className="mb-2 text-zinc-500">// Vergärungsgrad (V_Grad)</p>
                    <div className="my-2 bg-zinc-900 border border-zinc-800 p-2 rounded-lg overflow-x-auto">
                        <BlockMath math="FG = OG \times (1 - V_{Grad})" />
                    </div>
                    <p className="mt-2 text-zinc-500 text-xs">Wir nehmen standardmäßig 75% Vergärungsgrad an, falls keine Hefe spezifiziert ist.</p>
                </div>
            </div>
        </div>
    );
}


function IBUInspector({ data }: { data: FormulaInspectorProps['data'] }) {
    const { totalIBU, parts, boilGravity } = calculateIBUDetails(
        data.batchSize, 
        data.ogPlato || 0, 
        data.hops || [],
        data.boilTime || 60
    );

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-lg bg-black border border-zinc-800">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Gesamt IBU</span>
                    <span className="text-3xl font-black text-amber-500">{totalIBU}</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/50 w-full" />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-zinc-500" />
                    Die Formel (Tinseth)
                </h3>
                <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg mb-2 overflow-x-auto">
                     <BlockMath math="IBU = \frac{U_{\text{total}} \times mg_{\alpha}}{V_{Liter}}" />
                </div>
                <div className="p-4 rounded-lg bg-black border border-zinc-800 font-mono text-xs md:text-sm text-zinc-300 overflow-x-auto">
                    <p className="mb-2 text-zinc-500">// Ausbeute / Utilization (U)</p>
                    <div className="my-2 bg-zinc-900 border border-zinc-800 p-2 rounded-lg">
                        <BlockMath math="U_{\text{total}} = U_{\text{Bigness}} \times U_{\text{Time}}" />
                        <div className="text-green-500 mt-2 font-bold text-center text-xs">
                             + 10% für Pellets (x 1.1)
                        </div>
                    </div>
                    
                    <p className="mt-4 mb-2 text-zinc-500">// Teil-Faktoren</p>
                    <div className="my-2 bg-zinc-900 border border-zinc-800 p-2 rounded-lg">
                         <BlockMath math="U_{\text{Bigness}} = 1.65 \times 0.000125^{(SG_{Boil}-1)}" />
                         <BlockMath math="U_{\text{Time}} = \frac{1 - e^{-0.04 \times t}}{4.15}" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">Beiträge der Hopfen</h3>
                <div className="rounded-lg border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-black border-b border-zinc-800 text-zinc-500 font-medium">
                            <tr>
                                <th className="p-3 text-xs uppercase tracking-wider">Hopfen</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Menge</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Alpha</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Zeit</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Ausbeute</th>
                                <th className="p-3 text-right text-white text-xs uppercase tracking-wider">IBU</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {parts.map((part, i) => (
                                <tr key={i} className="hover:bg-zinc-900 transition-colors bg-black">
                                    <td className="p-3 font-medium text-zinc-300">{part.hopName}</td>
                                    <td className="p-3 text-right text-zinc-400">{part.amount}g</td>
                                    <td className="p-3 text-right text-zinc-400">{part.alpha}%</td>
                                    <td className="p-3 text-right text-zinc-400">{part.time}m</td>
                                    <td className="p-3 text-right text-zinc-500">{(part.utilization * 100).toFixed(1)}%</td>
                                    <td className="p-3 text-right font-bold text-amber-500">+{part.ibu}</td>
                                </tr>
                            ))}
                            {parts.length === 0 && (
                                <tr className="bg-black">
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
            <div className="p-4 rounded-lg bg-black border border-zinc-800">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Gesamt EBC</span>
                    <span className="text-3xl font-black" style={{ color: totalEBC < 10 ? '#EAB308' : '#EA580C' }}>{totalEBC}</span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-zinc-500" />
                    Die Formel (Morey)
                </h3>
                <div className="p-4 rounded-lg bg-black border border-zinc-800 font-mono text-xs md:text-sm text-zinc-300 overflow-x-auto">
                    <p className="mb-2 text-zinc-500">// Malt Color Units (MCU)</p>
                    <div className="my-2 bg-zinc-900 border border-zinc-800 p-2 rounded-lg">
                        <BlockMath math="MCU = \frac{W_{lbs} \times L}{V_{gal}}" />
                    </div>
                    <p className="mt-4 mb-2 text-zinc-500">// Umrechnung zu SRM & EBC</p>
                    <div className="my-2 bg-zinc-900 border border-zinc-800 p-2 rounded-lg">
                        <BlockMath math="SRM = 1.4922 \times (MCU)^{0.6859}" />
                        <BlockMath math="EBC = SRM \times 1.97" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">Beiträge der Malze</h3>
                <div className="rounded-lg border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-black border-b border-zinc-800 text-zinc-500 font-medium">
                            <tr>
                                <th className="p-3 text-xs uppercase tracking-wider">Malz</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Menge</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Farbe</th>
                                <th className="p-3 text-right text-white text-xs uppercase tracking-wider">MCU Beitrag</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {parts.map((part, i) => (
                                <tr key={i} className="hover:bg-zinc-900 transition-colors bg-black">
                                    <td className="p-3 font-medium text-zinc-300">{part.maltName}</td>
                                    <td className="p-3 text-right text-zinc-400">{part.amountKg}kg</td>
                                    <td className="p-3 text-right text-zinc-400">{part.colorEBC} EBC</td>
                                    <td className="p-3 text-right font-bold text-zinc-300">{part.mcu}</td>
                                </tr>
                            ))}
                             {parts.length === 0 && (
                                <tr className="bg-black">
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
