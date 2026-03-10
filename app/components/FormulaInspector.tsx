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
    ColorContribution,
    OGContribution
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
        // Equipment profile config
        boilOffRate?: number;
        trubLoss?: number;
        grainAbsorption?: number;
        coolingShrinkage?: number;
        mashThickness?: number;
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

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

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
        <div className="fixed inset-0 z-[9999] flex justify-end" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-300" />

            {/* Slide-in Panel */}
            <div
                className="relative w-[90vw] sm:w-[400px] md:max-w-lg h-full bg-background border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="shrink-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-background">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-surface text-brand border border-border">
                            {icon}
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-text-primary uppercase tracking-tight leading-tight">{title}</h2>
                            <p className="text-[10px] uppercase font-medium tracking-wider text-text-muted">Transparenter Einblick in die Formeln</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-8">
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
    const equipConfig = {
        boilOffRate:      data.boilOffRate,
        trubLoss:         data.trubLoss,
        grainAbsorption:  data.grainAbsorption,
        coolingShrinkage: data.coolingShrinkage,
    };
    const effectiveBoilOffRate  = data.boilOffRate  ?? 3.5;
    const effectiveTrubLoss     = data.trubLoss     ?? 0.5;
    const effectiveShrinkage    = data.coolingShrinkage ?? 0.04;
    const effectiveGrainAbsorb  = data.grainAbsorption  ?? 0.96;
    const { batchSize, totalWater, grainAbsorption, preBoilVolume, boilOff, totalGrainKg, trubLoss, shrinkageLoss } = calculateBatchSizeDetails(
        data.mashWater || 0,
        data.spargeWater || 0,
        data.malts || [],
        data.boilTime || 60,
        equipConfig
    );

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-lg bg-background border border-border">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Ausschlagwürze (Batch Size)</span>
                    <span className="text-3xl font-black text-brand">{batchSize} L</span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-text-primary flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-text-muted" />
                    Die Bilanz (Rückwärtsrechnung)
                </h3>
                
                <div className="bg-surface border border-border p-2 rounded-lg mb-2 overflow-x-auto">
                     <BlockMath math="V_{Batch} = V_{Pfannevoll} - V_{Verdampfung} - V_{Trub} - V_{Schrumpfung}" />
                </div>

                <div className="p-4 rounded-lg bg-background border border-border font-mono text-xs md:text-sm text-text-secondary">
                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center mb-2 pb-2 border-b border-border">
                        <span>Gesamtwasser (Haupt- + Nachguss)</span>
                        <span className="font-bold">{totalWater.toFixed(1)} L</span>
                    </div>
                    
                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center text-red-500 mb-1 group relative">
                        <div className="flex flex-col cursor-help">
                             <div className="flex items-center gap-1 border-b border-dashed border-red-500/30 w-fit">
                                <span>- Treberverlust (Absorption)</span>
                                <span className="text-[10px] opacity-70">ⓘ</span>
                             </div>
                             <span className="text-[10px] text-text-disabled font-mono mt-0.5">
                                 {totalGrainKg}kg Malz × 0.96 L/kg
                             </span>
                        </div>
                        <span>-{grainAbsorption.toFixed(1)} L</span>
                    </div>

                     <div className="grid grid-cols-[1fr,auto] gap-2 items-center font-bold text-text-muted mb-2 pb-2 border-b border-border">
                        <span>= Pfannevollwürze (Pre-Boil)</span>
                        <span>{preBoilVolume.toFixed(1)} L</span>
                    </div>
                    
                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center text-red-500">
                        <div className="flex flex-col">
                            <span>- Verdampfung</span>
                            <span className="text-[10px] text-text-disabled font-mono mt-0.5">
                                {effectiveBoilOffRate} L/h × {(data.boilTime || 60) / 60}h
                            </span>
                        </div>
                        <span>-{boilOff.toFixed(1)} L</span>
                    </div>

                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center text-red-500">
                         <div className="flex flex-col">
                            <span>- Hopfenseihverlust (Trub)</span>
                            <span className="text-[10px] text-text-disabled font-mono mt-0.5">
                                Pauschal {effectiveTrubLoss} L
                            </span>
                        </div>
                        <span>-{(trubLoss || 0).toFixed(1)} L</span>
                    </div>

                    <div className="grid grid-cols-[1fr,auto] gap-2 items-center text-red-500">
                         <div className="flex flex-col">
                            <span>- Abkühlverlust ({(effectiveShrinkage * 100).toFixed(0)}%)</span>
                            <span className="text-[10px] text-text-disabled font-mono mt-0.5">
                                thermische Kontraktion
                            </span>
                        </div>
                        <span>-{(shrinkageLoss || 0).toFixed(1)} L</span>
                    </div>

                     <div className="grid grid-cols-[1fr,auto] gap-2 items-center mt-2 pt-2 border-t border-border font-bold text-brand">
                        <span>= Ausschlagwürze (Im Gäreimer)</span>
                        <span>{batchSize} L</span>
                    </div>
                </div>
                <p className="text-xs text-text-muted bg-background p-3 rounded-lg border border-border">
                    ℹ️ <span className="font-bold text-text-secondary">Physikalisches Modell:</span> Wir berechnen exakt nach Kochdauer ({effectiveBoilOffRate} L/h), Trubverlust ({effectiveTrubLoss} L), Schrumpfung ({(effectiveShrinkage * 100).toFixed(0)} %) und Schüttungsabsorption ({effectiveGrainAbsorb} L/kg).
                </p>
            </div>
        </div>
    );
}

function OGInspector({ data }: { data: FormulaInspectorProps['data'] }) {
    const { ogPlato, totalGrainKg, extractMass, parts } = calculateOGDetails(
        data.batchSize,
        data.malts || [],
        data.efficiency || 75
    );

    return (
        <div className="space-y-6">
             <div className="p-4 rounded-lg bg-background border border-border">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Stammwürze (OG)</span>
                    <span className="text-3xl font-black text-rating">{ogPlato} °P</span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-text-primary flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-text-muted" />
                    Die Berechnung
                </h3>
                 <div className="p-4 rounded-lg bg-background border border-border font-mono text-xs md:text-sm text-text-secondary">
                     <p className="mb-2 text-text-muted">// Sudhausausbeute (SHA)</p>
                     <p>Angenommene SHA: <span className="text-brand">{data.efficiency || 75}%</span></p>
                     
                     <div className="my-4 bg-surface border border-border p-2 rounded-lg overflow-x-auto">
                        <BlockMath math="M_{Extrakt} = \\sum (M_i \\times P_i) \\times \\frac{SHA}{100} \\div V_{Batch}" />
                     </div>
                     
                     <p className="mb-2 text-text-muted">// Konzentration (Lincoln Equation)</p>
                     <p className="text-xs text-text-muted mt-1">Wir nutzen eine exakte Herleitung aus der Lincoln-Gleichung für SG:</p>
                     <div className="my-2 bg-surface border border-border p-2 rounded-lg overflow-x-auto">
                        <BlockMath math="SG = 1 + \\frac{Points}{1000}" />
                        <BlockMath math="P = \\frac{259 \\times C}{259 + C}" />
                     </div>
                 </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wide">Beiträge der Malze</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-background border-b border-border text-text-muted font-medium">
                            <tr>
                                <th className="p-3 text-xs uppercase tracking-wider">Malz</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Menge</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Potential</th>
                                <th className="p-3 text-right text-text-primary text-xs uppercase tracking-wider">Punkte</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {parts.map((part, i) => (
                                <tr key={i} className="hover:bg-surface transition-colors bg-background">
                                    <td className="p-3 font-medium text-text-secondary">{part.maltName}</td>
                                    <td className="p-3 text-right text-text-secondary">{part.amountKg}kg</td>
                                    <td className="p-3 text-right text-text-secondary">{part.potential} pts</td>
                                    <td className="p-3 text-right font-bold text-rating">{part.points}</td>
                                </tr>
                            ))}
                            {parts.length === 0 && (
                                <tr className="bg-background">
                                    <td colSpan={4} className="p-8 text-center text-text-muted">Keine Malze hinzugefügt.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-text-muted">
                    * Gesamt-Schüttung: {totalGrainKg}kg · Extrakt: {extractMass}kg · SHA: {data.efficiency || 75}%
                </p>
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
            <div className="p-4 rounded-lg bg-background border border-border">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Alkohol (ABV)</span>
                    <span className="text-3xl font-black text-brand">{abv}%</span>
                </div>
            </div>

             <div className="space-y-4">
                <h3 className="font-bold text-text-primary flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-text-muted" />
                    Die Formel
                </h3>
                <div className="p-4 rounded-lg bg-background border border-border font-mono text-xs md:text-sm text-text-secondary">
                    <p className="mb-2 text-text-muted">// Standard-Formel (nach SG)</p>
                    <div className="my-2 bg-surface border border-border p-2 rounded-lg overflow-x-auto">
                        <BlockMath math="ABV = (OG_{sg} - FG_{sg}) \times 131.25" />
                    </div>

                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-text-muted block mb-1">OG (Start)</span>
                            <span className="text-text-primary">{data.ogPlato}°P <span className="text-text-muted">→ {ogSG} SG</span></span>
                        </div>
                        <div>
                            <span className="text-text-muted block mb-1">FG (Ende)</span>
                            <span className="text-text-primary">{data.fgPlato}°P <span className="text-text-muted">→ {fgSG} SG</span></span>
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
            <div className="p-4 rounded-lg bg-background border border-border">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Restextrakt (FG)</span>
                    <span className="text-3xl font-black text-brand">{data.fgPlato} °P</span>
                </div>
            </div>
             <div className="space-y-4">
                <h3 className="font-bold text-text-primary flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-text-muted" />
                    Die Schätzung
                </h3>
                <div className="p-4 rounded-lg bg-background border border-border font-mono text-xs md:text-sm text-text-secondary">
                    <p className="mb-2 text-text-muted">// Vergärungsgrad (V_Grad)</p>
                    <div className="my-2 bg-surface border border-border p-2 rounded-lg overflow-x-auto">
                        <BlockMath math="FG = OG \times (1 - V_{Grad})" />
                    </div>
                    <p className="mt-2 text-text-muted text-xs">Wir nehmen standardmäßig 75% Vergärungsgrad an, falls keine Hefe spezifiziert ist.</p>
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
            <div className="p-4 rounded-lg bg-background border border-border">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Gesamt IBU</span>
                    <span className="text-3xl font-black text-rating">{totalIBU}</span>
                </div>
                <div className="h-1 w-full bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-rating/50 w-full" />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-text-primary flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-text-muted" />
                    Die Formel (Tinseth)
                </h3>
                <div className="bg-surface border border-border p-2 rounded-lg mb-2 overflow-x-auto">
                     <BlockMath math="IBU = \frac{U_{\text{total}} \times mg_{\alpha}}{V_{Liter}}" />
                </div>
                <div className="p-4 rounded-lg bg-background border border-border font-mono text-xs md:text-sm text-text-secondary overflow-x-auto">
                    <p className="mb-2 text-text-muted">// Ausbeute / Utilization (U)</p>
                    <div className="my-2 bg-surface border border-border p-2 rounded-lg">
                        <BlockMath math="U_{\text{total}} = U_{\text{Bigness}} \times U_{\text{Time}}" />
                        <div className="text-green-500 mt-2 font-bold text-center text-xs">
                             + 10% nur für Pellets (× 1.1)
                        </div>
                    </div>
                    
                    <p className="mt-4 mb-2 text-text-muted">// Teil-Faktoren</p>
                    <div className="my-2 bg-surface border border-border p-2 rounded-lg">
                         <BlockMath math="U_{\text{Bigness}} = 1.65 \times 0.000125^{(SG_{Boil}-1)}" />
                         <BlockMath math="U_{\text{Time}} = \frac{1 - e^{-0.04 \times t}}{4.15}" />
                    </div>
                    <p className="mt-2 text-text-muted text-xs">Whirlpool: reduzierter Isomerisierungsfaktor (0.0125 statt 0.04). Dry Hop & Mash: kein IBU-Beitrag.</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wide">Beiträge der Hopfen</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-background border-b border-border text-text-muted font-medium">
                            <tr>
                                <th className="p-3 text-xs uppercase tracking-wider">Hopfen</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Menge</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Alpha</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Zeit</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Typ</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Ausbeute</th>
                                <th className="p-3 text-right text-text-primary text-xs uppercase tracking-wider">IBU</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {parts.map((part, i) => (
                                <tr key={i} className="hover:bg-surface transition-colors bg-background">
                                    <td className="p-3 font-medium text-text-secondary">{part.hopName}</td>
                                    <td className="p-3 text-right text-text-secondary">{part.amount}g</td>
                                    <td className="p-3 text-right text-text-secondary">{part.alpha}%</td>
                                    <td className="p-3 text-right text-text-secondary">{part.time}m</td>
                                    <td className="p-3 text-right">
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                            part.usage === 'Whirlpool' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            part.usage === 'Dry Hop' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            'bg-surface text-text-muted border border-border'
                                        }`}>
                                            {part.usage}{part.form && part.form !== 'Pellet' ? ` · ${part.form}` : ''}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right text-text-muted">{(part.utilization * 100).toFixed(1)}%</td>
                                    <td className="p-3 text-right font-bold text-rating">+{part.ibu}</td>
                                </tr>
                            ))}
                            {parts.length === 0 && (
                                <tr className="bg-background">
                                    <td colSpan={7} className="p-8 text-center text-text-muted">Keine Hopfen hinzugefügt.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-text-muted">
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
            <div className="p-4 rounded-lg bg-background border border-border">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Gesamt EBC</span>
                    <span className="text-3xl font-black" style={{ color: totalEBC < 10 ? '#EAB308' : '#EA580C' }}>{totalEBC}</span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-text-primary flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Calculator size={16} className="text-text-muted" />
                    Die Formel (Morey)
                </h3>
                <div className="p-4 rounded-lg bg-background border border-border font-mono text-xs md:text-sm text-text-secondary overflow-x-auto">
                    <p className="mb-2 text-text-muted">// Malt Color Units (MCU)</p>
                    <div className="my-2 bg-surface border border-border p-2 rounded-lg">
                        <BlockMath math="MCU = \frac{W_{lbs} \times L}{V_{gal}}" />
                    </div>
                    <p className="mt-4 mb-2 text-text-muted">// Umrechnung zu SRM & EBC</p>
                    <div className="my-2 bg-surface border border-border p-2 rounded-lg">
                        <BlockMath math="SRM = 1.4922 \times (MCU)^{0.6859}" />
                        <BlockMath math="EBC = SRM \times 1.97" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wide">Beiträge der Malze</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-background border-b border-border text-text-muted font-medium">
                            <tr>
                                <th className="p-3 text-xs uppercase tracking-wider">Malz</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Menge</th>
                                <th className="p-3 text-right text-xs uppercase tracking-wider">Farbe</th>
                                <th className="p-3 text-right text-text-primary text-xs uppercase tracking-wider">MCU Beitrag</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {parts.map((part, i) => (
                                <tr key={i} className="hover:bg-surface transition-colors bg-background">
                                    <td className="p-3 font-medium text-text-secondary">{part.maltName}</td>
                                    <td className="p-3 text-right text-text-secondary">{part.amountKg}kg</td>
                                    <td className="p-3 text-right text-text-secondary">{part.colorEBC} EBC</td>
                                    <td className="p-3 text-right font-bold text-text-secondary">{part.mcu}</td>
                                </tr>
                            ))}
                             {parts.length === 0 && (
                                <tr className="bg-background">
                                    <td colSpan={4} className="p-8 text-center text-text-muted">Keine Malze hinzugefügt.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-text-muted">
                    * Total MCU: {totalMCU}
                </p>
            </div>
        </div>
    );
}
