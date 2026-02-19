'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getTierConfig, getBreweryTierConfig } from '@/lib/tier-system';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import Header from '@/app/components/Header';
import Logo from '@/app/components/Logo';
import LikeButton from '@/app/components/LikeButton';
import { ebcToHex, sgToPlato, calculateWaterProfile } from '@/lib/brewing-calculations';
import { Star, Users, MessageCircle, Library, Shuffle, CheckCircle2, Wheat, Thermometer, Flame, Droplets, Clock, Scale, Timer, Microscope, Grape, Wine, Citrus } from 'lucide-react';
import { saveBrewToLibrary } from '@/lib/actions/library-actions';
import { useGlobalToast } from '@/app/context/AchievementNotificationContext';
import { getPremiumStatus } from '@/lib/actions/premium-actions';
import ReportButton from '@/app/components/reporting/ReportButton';
import { getBrewTasteProfile, getBrewFlavorDistribution, TasteProfile, FlavorDistribution } from '@/lib/rating-analytics';
import TasteRadarChart from './components/TasteRadarChart';
import FlavorTagCloud from './components/FlavorTagCloud';

// Helper: Ensure lists render correctly even if user didn't use double line breaks
const formatMarkdown = (text: string) => {
  if (!text) return '';
  return text.replace(/([^\n])\n(\s*-[ \t])/g, '$1\n\n$2');
};

const scaleAmount = (amount: any, factor: number) => {
    if (factor === 1) return amount;
    if (!amount) return amount;
    const num = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(num)) return amount;
    
    // Smart rounding
    const result = num * factor;
    if (result < 10) return result.toFixed(2).replace('.', ',');
    if (result < 100) return result.toFixed(1).replace('.', ',');
    return Math.round(result).toString();
};

// Share Button logic is now integrated into the main component

// Helper Component for Ingredients


function MaltView({ value, factor = 1 }: { value: any, factor?: number }) {
    if (!value || !Array.isArray(value)) return <IngredientView value={value} />;

    return (
        <div className="w-full">
            <div className="flex justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2 border-b border-zinc-800 pb-2">
                <span>Malz / Getreide</span>
                <div className="flex gap-8">
                     <span className="w-16 text-right">Menge</span>
                </div>
            </div>
            <ul className="space-y-3">
                {value.map((item: any, i: number) => (
                    <li key={i} className="flex justify-between items-center text-sm group hover:bg-zinc-900/30 rounded px-2 -mx-2 py-1 transition-colors">
                        <div className="flex items-center gap-3">
                            {item.color_ebc && (
                                <div 
                                    className="w-2 h-2 rounded-full ring-1 ring-white/10" 
                                    style={{ backgroundColor: `hsl(35, 100%, ${Math.max(20, 90 - (parseInt(item.color_ebc) * 2))}%)` }}
                                    title={`${item.color_ebc} EBC`}
                                />
                            )}
                            <div className="flex flex-col">
                                <span className="text-zinc-200 font-medium">{item.name}</span>
                                {item.color_ebc && <span className="text-[10px] text-zinc-500">{item.color_ebc} EBC</span>}
                            </div>
                        </div>
                        <div className="text-right font-mono text-zinc-400">
                            <span className="text-white font-bold">{scaleAmount(item.amount, factor)}</span> {item.unit || 'kg'}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function HopView({ value, factor = 1 }: { value: any, factor?: number }) {
    const [corrections, setCorrections] = useState<{ [key: number]: number | null }>({});
    const [isCorrectionMode, setIsCorrectionMode] = useState(false);

    if (!value || !Array.isArray(value)) return <IngredientView value={value} />;

    const setAlpha = (i: number, alpha: number) => {
        setCorrections(prev => ({ ...prev, [i]: alpha }));
    };

    const hasCorrections = Object.keys(corrections).some(k => corrections[parseInt(k)] !== null);

    return (
        <div className="w-full">
            <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between items-center">
                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Hopfen</div>
                    <button 
                        onClick={() => setIsCorrectionMode(!isCorrectionMode)}
                        className={`text-xs px-2 py-1 rounded-md border flex items-center gap-2 transition-colors ${
                            isCorrectionMode || hasCorrections
                            ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-400' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                    >
                        <Scale size={12} />
                        {isCorrectionMode ? 'Korrektur beenden' : 'Alpha-Werte anpassen'}
                    </button>
                </div>
                {isCorrectionMode && (
                    <div className="text-xs text-cyan-500/80 bg-cyan-950/20 p-2 rounded border border-cyan-900/30 mb-2">
                        Gib den tatsächlichen Alpha-Säure-Gehalt deines Hopfens ein. Die Menge wird automatisch angepasst, um die gleiche Bittere (IBU) zu erreichen.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-[1fr_auto_80px] text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2 border-b border-zinc-800 pb-2 gap-4">
                <span>Sorte</span>
                <span className="text-right">Details</span>
                <span className="text-right">Menge</span>
            </div>

            <ul className="space-y-4">
                {value.map((item: any, i: number) => {
                    const originalAmount = parseFloat(String(item.amount).replace(',', '.'));
                    const recipeAlpha = parseFloat(String(item.alpha).replace(',', '.'));
                    const actualAlpha = corrections[i];
                    
                    let displayAmount = scaleAmount(item.amount, factor);
                    let isCorrected = false;

                    // Only calculate correction if we have a valid actual alpha that differs from recipe
                    if (actualAlpha && recipeAlpha && actualAlpha > 0) {
                         const scaledOriginal = originalAmount * factor;
                         const corrected = scaledOriginal * (recipeAlpha / actualAlpha);
                         
                         if (corrected < 10) displayAmount = corrected.toFixed(2).replace('.', ',');
                         else if (corrected < 100) displayAmount = corrected.toFixed(1).replace('.', ',');
                         else displayAmount = Math.round(corrected).toString();
                         
                         isCorrected = true;
                    }

                    return (
                    <li key={i} className={`grid grid-cols-[1fr_auto_minmax(80px,auto)] items-center text-sm group rounded px-2 -mx-2 py-2 transition-colors border-b border-dashed border-zinc-900 last:border-0 gap-4 ${isCorrected ? 'bg-cyan-950/10' : 'hover:bg-zinc-900/30'}`}>
                        <div className="font-bold text-zinc-200">{item.name}</div>
                        
                        <div className="flex flex-wrap gap-2 items-center justify-end">
                             {item.usage && (
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                    item.usage === 'Dry Hop' ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-500' : 
                                    item.usage === 'Mash' ? 'bg-amber-950/30 border-amber-900/40 text-amber-500' :
                                    item.usage === 'First Wort' ? 'bg-purple-950/30 border-purple-900/40 text-purple-400' :
                                    'bg-zinc-800 border-zinc-700 text-zinc-400'
                                }`}>
                                    {item.usage === 'Boil' ? 'Kochen' : item.usage}
                                </span>
                             )}
                             {item.time && (
                                <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {item.time}m
                                </span>
                             )}
                             
                             {item.alpha && (
                                <div className={`flex items-center gap-1 transition-all ${isCorrectionMode ? 'bg-zinc-900 p-1 rounded border border-zinc-700' : ''}`}>
                                    <span className="text-[10px] font-mono text-zinc-500">α</span>
                                    {isCorrectionMode ? (
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="number" 
                                                className="w-12 bg-zinc-950 text-white text-xs px-1 py-0.5 rounded border border-zinc-700 outline-none focus:border-cyan-500 text-right"
                                                placeholder={item.alpha}
                                                value={corrections[i] || ''}
                                                onChange={(e) => setAlpha(i, parseFloat(e.target.value))}
                                            />
                                            <span className="text-xs text-zinc-500">%</span>
                                        </div>
                                    ) : (
                                        <span className={`text-[10px] font-mono ${isCorrected ? 'text-cyan-400 font-bold' : 'text-zinc-500'}`}>
                                            {actualAlpha || item.alpha}%
                                        </span>
                                    )}
                                </div>
                             )}
                        </div>
                        
                        <div className="text-right flex flex-col items-end justify-center font-mono whitespace-nowrap">
                             <div className="text-white font-bold flex items-center gap-2">
                                {isCorrected && (
                                    <span className="text-xs text-zinc-600 line-through decoration-zinc-600/50 hidden sm:inline-block">
                                        {scaleAmount(item.amount, factor)}
                                    </span>
                                )}
                                <span className={isCorrected ? 'text-cyan-400' : ''}>{displayAmount}</span> 
                                <span className="text-zinc-400 font-normal">{item.unit || 'g'}</span>
                             </div>
                             {isCorrected && <span className="text-[10px] text-cyan-500">Korrigiert</span>}
                        </div>
                    </li>
                )})}
            </ul>
        </div>
    );
}

function MashScheduleView({ steps, mashWater, spargeWater, factor = 1, calculatedMashWater, calculatedSpargeWater }: { steps: any, mashWater: any, spargeWater: any, factor?: number, calculatedMashWater?: number, calculatedSpargeWater?: number }) {
    // If we have accurate calculations, use them. Otherwise fallback to simple scaling.
    const displayMash = calculatedMashWater !== undefined ? calculatedMashWater : scaleAmount(mashWater, factor);
    const displaySparge = calculatedSpargeWater !== undefined ? calculatedSpargeWater : scaleAmount(spargeWater, factor);

    return (
        <div className="space-y-8">
            {(mashWater || spargeWater || (calculatedMashWater !== undefined)) && (
                <div className="grid grid-cols-2 gap-px bg-zinc-800 rounded-lg overflow-hidden border border-zinc-800">
                    <div className="bg-zinc-950 p-4 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Hauptguss</span>
                        <span className="font-mono text-white font-bold text-2xl">{typeof displayMash === 'number' ? displayMash.toFixed(1).replace('.', ',') : displayMash || '-'} <span className="text-zinc-600 text-sm font-normal">L</span></span>
                    </div>
                     <div className="bg-zinc-950 p-4 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Nachguss</span>
                         <span className="font-mono text-white font-bold text-2xl">{typeof displaySparge === 'number' ? displaySparge.toFixed(1).replace('.', ',') : displaySparge || '-'} <span className="text-zinc-600 text-sm font-normal">L</span></span>
                    </div>
                </div>
            )}
            
            {Array.isArray(steps) && steps.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                        <Thermometer className="w-3 h-3 text-zinc-500" />
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rasten & Temperaturen</h5>
                    </div>
                    <div className="space-y-0 relative border-l border-zinc-800 ml-2.5 my-2">
                        {steps.map((step: any, i: number) => (
                            <div key={i} className="relative pl-6 py-2 group">
                                <span className={`absolute -left-[5px] top-4 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 group-hover:bg-cyan-500 transition-colors ${i === 0 ? 'bg-zinc-500' : 'bg-zinc-800'}`}></span>
                                <div className="flex justify-between items-center">
                                     <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{step.name || `Rast ${i+1}`}</span>
                                     <div className="flex gap-3 text-xs font-mono items-center">
                                        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-300">
                                            <Thermometer className="w-3 h-3 text-zinc-500" />
                                            {step.temperature}°C
                                        </div>
                                        {step.duration && (
                                            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-400">
                                                <Clock className="w-3 h-3 text-zinc-600" />
                                                {step.duration} min
                                            </div>
                                        )}
                                     </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function IngredientView({ value, factor = 1 }: { value: any, factor?: number }) {
  if (!value) return <span className="text-zinc-500">–</span>;
  
  // Legacy String Support
  if (typeof value === 'string') {
    return <p className="text-sm text-zinc-300 font-medium leading-relaxed">{value}</p>;
  }
  
  // Structured Support
  if (Array.isArray(value)) {
     return (
       <ul className="space-y-3">
         {value.map((item: any, i: number) => (
            <li key={i} className="flex justify-between items-center text-sm border-b border-dashed border-zinc-900 pb-2 last:border-0 last:pb-0 group hover:bg-zinc-900/30 -mx-2 px-2 rounded py-1 transition-colors">
               <span className="text-zinc-300 font-bold group-hover:text-white transition-colors">{item.name}</span>
               <span className="text-zinc-500 font-mono text-xs whitespace-nowrap ml-4 flex items-baseline gap-1">
                 {item.amount && <span className="text-white font-bold text-base">{scaleAmount(item.amount, factor)}</span>} 
                 {item.unit && <span className="opacity-70">{item.unit}</span>}
               </span>
            </li>
         ))}
       </ul>
     );
  }

  // Single Object
  if (typeof value === 'object') {
     return (
        <div className="flex justify-between items-center text-sm bg-zinc-950/50 p-2 rounded border border-zinc-800">
           <span className="text-zinc-300 font-bold">{value.name}</span>
           <span className="text-zinc-500 font-mono text-xs whitespace-nowrap ml-4 flex items-baseline gap-1">
                 {value.amount && <span className="text-white font-bold text-base">{scaleAmount(value.amount, factor)}</span>} 
                 {value.unit && <span className="opacity-70">{value.unit}</span>}
           </span>
        </div>
     );
  }
  
  return null;
}

export default function BrewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [brew, setBrew] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [bottles, setBottles] = useState<any[]>([]);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [flavorTags, setFlavorTags] = useState<FlavorDistribution[]>([]);
  const [parent, setParent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [remixLoading, setRemixLoading] = useState(false);
  const [remixMessage, setRemixMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { showToast } = useGlobalToast();

  // Save to Library State
  const [userBreweries, setUserBreweries] = useState<any[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedInBreweryIds, setSavedInBreweryIds] = useState<Set<string>>(new Set());

  // Like System State
  const [likesCount, setLikesCount] = useState(0);
  const [userHasLiked, setUserHasLiked] = useState(false);

  // Scaling State
  const [scaleVolume, setScaleVolume] = useState<number>(20);
  const [scaleEfficiency, setScaleEfficiency] = useState<number>(65);
  const [originalVolume, setOriginalVolume] = useState<number>(20);
  const [originalEfficiency, setOriginalEfficiency] = useState<number>(65);

  const handleShare = async () => {
    const shareData = {
        title: `BotlLab: ${brew.name}`,
        text: `Schau dir dieses Rezept an: ${brew.name} (${brew.style}).`,
        url: window.location.href
    };

    if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
         try {
             await navigator.share(shareData);
         } catch (e) {
             console.log('Share cancelled');
         }
    } else {
         // Desktop Fallback
         try {
             await navigator.clipboard.writeText(window.location.href);
             setCopied(true);
             setTimeout(() => setCopied(false), 2000);
         } catch (e) {
             console.error('Clipboard failed');
         }
    }
  };

  useEffect(() => {
    async function loadBreweries() {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        
        const { data } = await supabase.from('brewery_members').select('brewery:breweries(id, name, logo_url)').eq('user_id', user.id);
        if(data) {
            setUserBreweries(data.map((item:any) => item.brewery));
        }
    }
    loadBreweries();
  }, []);

  // Check if already saved
  useEffect(() => {
    async function checkSavedStatus() {
        if (!userBreweries || userBreweries.length === 0 || !id) return;
        
        try {
            const breweryIds = userBreweries.map((b: any) => b.id);
            const { data } = await supabase
                .from('brewery_saved_brews')
                .select('brewery_id')
                .eq('brew_id', id)
                .in('brewery_id', breweryIds);
            
            if (data && data.length > 0) {
                const savedIds = new Set(data.map((d: any) => d.brewery_id));
                setSavedInBreweryIds(savedIds);
            }
        } catch (e) {
            console.error(e);
        }
    }
    checkSavedStatus();
  }, [userBreweries, id]);

  async function handleSaveToTeam(targetBreweryId?: string) {
    if (!targetBreweryId) {
        // If multiple breweries, always open modal to allow selection
        if (userBreweries.length > 1) {
            setSaveModalOpen(true);
            return;
        } else if (userBreweries.length === 1) {
            targetBreweryId = userBreweries[0].id;
        } else {
            showToast("Fehler", "Du musst Mitglied einer Brauerei sein, um Rezepte zu speichern.", "warning");
            return;
        }
    }

    setSaveLoading(true);
    try {
        const res = await saveBrewToLibrary(targetBreweryId!, id);
        if(res.success) {
             if (res.message === 'Bereits gespeichert') {
                showToast("Info", "Dieses Rezept befindet sich bereits in der Bibliothek.", "info");
            } else {
                showToast("Gespeichert", "Rezept zur Team-Bibliothek hinzugefügt", "success");
            }
            
            // Optimistically update the set
            setSavedInBreweryIds(prev => new Set(prev).add(targetBreweryId!));
            
            // Only close modal if it was open AND we processed the last/only one. 
            // Better UX: keep open if multiple teams so user can click others? 
            // Or close for simplicity. Let's keep it open if opened manually, or handling logic below.
            // Actually, for multiple teams, maybe user wants to add to another one.
            // But let's close if it was the modal flow.
            // setSaveModalOpen(false); // Let user close it manually if they want to add more? Or maybe auto-close?
            
            // New UX decision: If single team (direct click), no modal involved.
            // If modal (multiple teams), reflect state in modal button (change to "Saved"). 
            // So we don't necessarily close the modal immediately, allowing multi-save.
        }
    } catch (e: any) {
        showToast("Fehler", e.message || "Fehler beim Speichern", "warning");
    } finally {
        setSaveLoading(false);
    }
  }

  async function handleRemix() {
    setRemixMessage(null);
    setRemixLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRemixLoading(false);
      router.push(`/login?redirect=/brew/${id}`);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .maybeSingle();

    const { data: myBrews } = await supabase
      .from('brews')
      .select('id')
      .eq('user_id', user.id);

    const tierConfig = getTierConfig(profileData?.tier || 'lehrling');
    
    // Limits are now on Team/Brewery level, not User.
    // For individual "Remix" actions into a personal context (if supported), we should check the target brewery limit.
    // However, since we now strictly create brews inside a Brewery Context, this "Remix to Personal" flow needs adjustment.
    // For now, removing the user-level limit check as it no longer exists on ReputationLevelConfig.
    
    // Use first brewery if available or force user to pick one
    const { data: member } = await supabase.from('brewery_members').select('brewery_id').eq('user_id', user.id).limit(1).maybeSingle();
    
    if (!member) {
        setRemixMessage("Du musst Mitglied einer Brauerei sein, um Rezepte zu remixen.");
        setRemixLoading(false);
        return;
    }
    
    // Check Brewery Limits
    const { data: brewery } = await supabase.from('breweries').select('tier').eq('id', member.brewery_id).single();
    const { data: brews } = await supabase.from('brews').select('id', { count: 'exact', head: true }).eq('brewery_id', member.brewery_id);
    
    // Check if user has premium status that allows bypassing limits
    const premiumStatus = await getPremiumStatus();
    const shouldBypass = premiumStatus?.features.bypassBrewLimits ?? false;
    
    const breweryTierConfig = getBreweryTierConfig((brewery?.tier || 'garage') as any);
    
    if (!shouldBypass && (brews?.length || 0) >= breweryTierConfig.limits.maxBrews) {
         setRemixMessage(`Brauerei-Limit erreicht: ${breweryTierConfig.displayName} erlaubt maximal ${breweryTierConfig.limits.maxBrews} Rezepte.`);
         setRemixLoading(false);
         return;
    }

    const payload = {
      name: `${brew.name} (Remix)`,
      style: brew.style || '',
      description: brew.description || '',
      brew_type: brew.brew_type || 'beer',
      data: brew.data || {},
      image_url: brew.image_url || null,
      is_public: false,
      user_id: user.id,
      brewery_id: member.brewery_id,
      remix_parent_id: brew.id,
    };

    const { error } = await supabase
      .from('brews')
      .insert([payload]);

    if (error) {
      setRemixMessage(error.message || 'Konnte Remix nicht anlegen.');
      setRemixLoading(false);
      return;
    }

    setRemixLoading(false);
    router.push('/dashboard');
  }



  useEffect(() => {
    async function fetchBrewInfo() {
      try {
        // Auth holen
        const { data: { user } } = await supabase.auth.getUser();

        // Rezept laden (RLS kümmert sich um harte DB-Security, hier prüfen wir Logik)
        const { data: brewData, error: brewError } = await supabase
          .from('brews')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (brewError || !brewData) {
          setErrorMsg("Rezept nicht gefunden");
          setLoading(false);
          return;
        }

        // Access Control Logic
        // 1. Öffentlich? -> OK
        // 2. Ersteller? -> OK
        // 3. Brauerei-Mitglied? -> OK (bei Team-Brews)
        let hasAccess = brewData.is_public;
        
        if (!hasAccess) {
             if (user && brewData.user_id === user.id) {
                 hasAccess = true;
             } else if (user && brewData.brewery_id) {
                 const { data: member } = await supabase
                    .from('brewery_members')
                    .select('id')
                    .eq('brewery_id', brewData.brewery_id)
                    .eq('user_id', user.id)
                    .maybeSingle();
                 if (member) hasAccess = true;
             }
        }

        if (!hasAccess) {
            setErrorMsg("Dieses Rezept ist privat und nur für Team-Mitglieder sichtbar.");
            setLoading(false);
            return;
        }

        setBrew(brewData);

        // Init Scaling
        try {
            // Check both potential field names
            const rawVol = brewData.data?.batch_size_liters || brewData.data?.batch_size || 20;
            const bVol = parseFloat(String(rawVol).replace(',', '.'));
            
            const rawEff = brewData.data?.efficiency || 75; // Default to 75% if missing
            const bEff = parseFloat(String(rawEff).replace(',', '.'));

            setOriginalVolume(bVol || 20);
            setOriginalEfficiency(bEff || 75);
            setScaleVolume(bVol || 20);
            setScaleEfficiency(bEff || 75);
        } catch (e) {
            console.warn("Scaling init failed", e);
        }

        // Logic Switch: Team vs Personal
        if (brewData.brewery_id) {
             const { data: breweryData } = await supabase
              .from('breweries')
              .select('id, name, description, logo_url, moderation_status') 
              .eq('id', brewData.brewery_id)
              .maybeSingle();

             if (breweryData) {
                 setProfile({
                     id: breweryData.id,
                     display_name: breweryData.name,
                     logo_url: breweryData.moderation_status === 'pending' ? null : breweryData.logo_url,
                     bio: breweryData.description,
                     location: null
                 });
             }
        } else {
            // Profile laden (Personal)
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, display_name, location, bio, logo_url, tier')
              .eq('id', brewData.user_id)
              .maybeSingle();
            setProfile(profileData);
        }

        // Parent laden (wenn Remix)
        if (brewData.remix_parent_id) {
          const { data: parentData } = await supabase
            .from('brews')
            .select('id, name, user_id, profiles!inner(display_name)')
            .eq('id', brewData.remix_parent_id)
            .maybeSingle();
          setParent(parentData);
        }

        // Ratings laden
        const { data: ratingData } = await supabase
          .from('ratings')
          .select('*')
          .eq('brew_id', brewData.id)
          .order('created_at', { ascending: false });
        setRatings(ratingData || []);

        // Likes laden (Count & HasLiked)
        // Optimized: Uses denormalized count from brews table
        setLikesCount(brewData.likes_count || 0);

        if (user) {
          const { data: myLike } = await supabase
            .from('likes')
            .select('id')
            .eq('brew_id', brewData.id)
            .eq('user_id', user.id)
            .maybeSingle();
          setUserHasLiked(!!myLike);
        }

        // Bottles laden
        const { data: bottleData } = await supabase
          .from('bottles')
          .select('id, bottle_number')
          .eq('brew_id', brewData.id)
          .order('bottle_number');
        setBottles(bottleData || []);

        // Analytics (Geschmacksprofil & Tags)
        const [taste, tags] = await Promise.all([
          getBrewTasteProfile(brewData.id),
          getBrewFlavorDistribution(brewData.id),
        ]);
        setTasteProfile(taste);
        setFlavorTags(tags);

        setLoading(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Fehler beim Laden");
        setLoading(false);
      }
    }

    fetchBrewInfo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍺</div>
          <p className="text-zinc-500">Lade Rezept...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !brew) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Rezept nicht gefunden</h1>
          <p className="text-zinc-500 mb-6">{errorMsg || "Dieses Rezept existiert nicht oder wurde gelöscht."}</p>
          <Link href="/" className="text-cyan-500 hover:underline">← Zurück zur Startseite</Link>
        </div>
      </div>
    );
  }

  const avgRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  // Scaling Factors
  // Volume Scaling: Simple linear (New / Old)
  const volFactor = (scaleVolume && originalVolume && originalVolume > 0) ? scaleVolume / originalVolume : 1;
  
  // Efficiency Scaling: Inverse (Old / New) - Higher Efficiency = Less Malt needed
  const effFactor = (scaleEfficiency && originalEfficiency && scaleEfficiency > 0) ? originalEfficiency / scaleEfficiency : 1;
  
  // Malt needs both adjustments
  const maltFactor = volFactor * effFactor;
  
  // Hops/Water only need Volume adjustment
  const generalFactor = volFactor;

  // Scale Water Calculation (Accurate)
  const totalScaledGrain = brew.data.malts 
    ? brew.data.malts.reduce((sum: number, m: any) => {
        const rawAmount = parseFloat(String(m.amount).replace(',', '.')) || 0;
        return sum + (rawAmount * maltFactor);
    }, 0)
    : 0;
  
  const boilTime = parseFloat(String(brew.data.boil_time || 60));
  
  // Calculate original mash thickness if possible to preserve ratio
  let originalMashThickness = 3.5;
  if (brew.data.mash_water_liters && brew.data.malts) {
    const originalGrainWeight = brew.data.malts.reduce((sum: number, m: any) => sum + (parseFloat(String(m.amount).replace(',', '.')) || 0), 0);
    const originalMashWater = parseFloat(String(brew.data.mash_water_liters).replace(',', '.'));
    if (originalGrainWeight > 0 && originalMashWater > 0) {
        originalMashThickness = originalMashWater / originalGrainWeight;
    }
  }

  const waterProfile = calculateWaterProfile(scaleVolume, totalScaledGrain, boilTime / 60, { mashThickness: originalMashThickness });

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      
      <Header breweryId={brew.brewery_id} />

      <div className="max-w-7xl mx-auto px-4 py-12 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* --- LEFT COLUMN: Image & Actions (4 cols) --- */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
             {/* Image Card */}
             <div className="relative w-full shadow-2xl rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-square">
                {brew.image_url && (brew.moderation_status === 'approved' || brew.image_url.startsWith('/default_label/') || brew.image_url.startsWith('/brand/')) ? (
                  <img 
                    src={brew.image_url} 
                    alt={brew.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                    {brew.image_url && brew.moderation_status === 'pending' ? (
                         <>
                            <span className="text-6xl mb-4">⏳</span>
                            <p className="text-yellow-500 font-bold uppercase tracking-wider text-xs">Wird geprüft</p>
                            <p className="text-zinc-500 text-[10px] mt-2 max-w-[200px]">Das Bild wird gerade vom Support überprüft.</p>
                        </>
                    ) : (
                        <span className="text-8xl opacity-20">🍺</span>
                    )}
                  </div>
                )}
                
                {/* Badges Overlay */}
             </div>

             {/* Action Buttons */}
             <div className="flex justify-around gap-2 text-zinc-300">
                <button 
                    onClick={handleShare}
                    title={copied ? "Link kopiert!" : "Mit Freunden teilen"}
                    className="h-14 w-14 flex items-center justify-center bg-zinc-900 border border-zinc-700/50 hover:border-zinc-500 hover:text-white rounded-full transition"
                >
                    {copied ? <span className="text-lg">✅</span> : <Users className="w-5 h-5" />}
                </button>
                <Link 
                    href={`/forum/t/new?brew_id=${brew.id}&title=Diskussion%20zu%20${encodeURIComponent(brew.name)}`}
                    title="Rezept diskutieren"
                    className="h-14 w-14 flex items-center justify-center bg-zinc-900 border border-zinc-700/50 hover:border-zinc-500 hover:text-white rounded-full transition"
                >
                    <MessageCircle className="w-5 h-5" />
                </Link>
                <button
                    onClick={() => handleSaveToTeam()}
                    disabled={saveLoading || userBreweries.length === 0 || (userBreweries.length === 1 && savedInBreweryIds.has(userBreweries[0].id))}
                    title={
                        userBreweries.length === 1 && savedInBreweryIds.has(userBreweries[0].id) 
                        ? "Bereits in der Bibliothek gespeichert" 
                        : (userBreweries.length > 0 ? "Zur Team-Bibliothek hinzufügen" : "Du musst Mitglied einer Brauerei sein")
                    }
                    className={`h-14 w-14 flex items-center justify-center border rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        userBreweries.length === 1 && savedInBreweryIds.has(userBreweries[0].id)
                        ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400 cursor-default' 
                        : 'bg-zinc-900 border-zinc-700/50 hover:border-zinc-500 hover:text-white'
                    }`}
                >
                    {saveLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-zinc-400"></div>
                    ) : (
                        (userBreweries.length === 1 && savedInBreweryIds.has(userBreweries[0].id)) 
                        ? <CheckCircle2 className="w-5 h-5" /> 
                        : <Library className="w-5 h-5" />
                    )}
                </button>
                <button
                    onClick={handleRemix}
                    disabled={remixLoading}
                    title="Rezept remixen"
                    className="h-14 w-14 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full transition hover:opacity-90 disabled:opacity-50"
                >
                    {remixLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : <Shuffle className="w-5 h-5" />}
                </button>
             </div>

             {/* Brewery/Team Info unten links */}
             {profile && profile.display_name && (
               <Link
                 href={`/brewery/${profile.id}`}
                 className="block mt-10 group bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 py-3 transition hover:border-cyan-600 hover:bg-zinc-900/80 shadow flex items-center gap-3"
                 style={{ textDecoration: 'none' }}
               >
                 <div className="w-9 h-9 rounded-full border border-zinc-800 overflow-hidden shrink-0 shadow group-hover:border-cyan-500 transition relative bg-zinc-800 flex items-center justify-center">
                    {profile.logo_url ? (
                       <img src={profile.logo_url} alt={profile.display_name} className="w-full h-full object-cover" />
                    ) : (
                       <span className="text-xl text-zinc-500">🏭</span>
                    )}
                 </div>
                 <div className="flex flex-col min-w-0">
                   <span className="font-bold text-white text-sm truncate group-hover:text-cyan-400 transition">{profile.display_name}</span>
                   {profile.bio && <span className="text-zinc-500 text-xs truncate">{profile.bio}</span>}
                 </div>
                 <span className="ml-auto text-cyan-500 text-xs font-bold group-hover:underline group-hover:text-cyan-300 transition whitespace-nowrap">Team-Profil →</span>
               </Link>
             )}
          </div>

          {/* --- RIGHT COLUMN: Content (8 cols) --- */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Header */}
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2 shadow-sm">
                        {brew.brew_type === 'beer' ? 'Bier' : 
                         brew.brew_type === 'wine' ? 'Wein' : 
                         brew.brew_type === 'cider' ? 'Cider' :
                         brew.brew_type === 'mead' ? 'Met' :
                         brew.brew_type === 'softdrink' ? 'Softdrink' : 'Bier'}
                    </span>
                    {brew.remix_parent_id && (
                        <span className="text-purple-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-purple-950/30 border border-purple-500/20 shadow-sm shadow-purple-900/20 flex items-center gap-2">
                            Remix
                        </span>
                    )}
                    <span className="text-cyan-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-cyan-950/30 border border-cyan-500/20 shadow-sm shadow-cyan-900/20">
                        {brew.style || 'Handcrafted'}
                    </span>
                    <span className="text-zinc-600 text-xs font-bold px-2 py-1 ml-auto md:ml-0 rounded-lg bg-zinc-900/0 border border-transparent">
                        {new Date(brew.created_at).toLocaleDateString()}
                    </span>
                    <ReportButton targetId={brew.id} targetType="brew" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight">{brew.name}</h1>
                
                {/* Social Stats: Inline */}
                <div className="flex items-center gap-6 pt-1">
                     <div className="flex items-center gap-2 text-zinc-400">
                        <Star className="text-amber-500 fill-amber-500" size={18} />
                        <span className="font-bold text-white text-lg tabular-nums">{avgRating || '-'}</span>
                        <span className="text-sm text-zinc-600">({ratings.length})</span>
                     </div>
    
                     <div className="h-4 w-px bg-zinc-800"></div>
    
                     <LikeButton 
                        brewId={brew.id} 
                        initialCount={likesCount} 
                        initialIsLiked={userHasLiked} 
                    />
                </div>
            </div>

            {/* Description */}
            {brew.description && (
                <div className="prose prose-invert prose-lg max-w-none">
                    <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap font-medium">{brew.description}</p>
                </div>
            )}
            
            {/* Remix Source */}
            {parent && (
              <div className="bg-zinc-900/30 border border-purple-900/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-xl">♻️</div>
                <div className="text-sm text-zinc-400">
                  <p className="font-bold text-zinc-300">Remix Abstammung</p>
                  <p>
                    Basiert auf <Link href={`/brew/${parent.id}`} className="text-purple-400 hover:text-purple-300 transition underline decoration-purple-400/30">{parent.name}</Link>
                    {parent.profiles?.display_name && (
                        <> von <Link href={`/brewer/${parent.user_id}`} className="text-zinc-300 hover:underline">{parent.profiles.display_name}</Link></>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Technical Specs */}
             {brew.data && (
                <div className="py-10 border-t border-zinc-800/50">
                    
                    {/* Recipe Scaler */}
                    {(!brew.brew_type || brew.brew_type === 'beer') && (
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mb-10 flex flex-col md:flex-row gap-6 items-center justify-between shadow-inner">
                            <div className="flex items-center gap-3 text-zinc-400">
                                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                    <Shuffle className="w-5 h-5 text-cyan-500" />
                                </div>
                                <div>
                                    <span className="font-bold text-white block">Rezept skalieren</span>
                                    <span className="text-xs text-zinc-500">Passe Menge und Effizienz an dein Setup an.</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                <div className="flex-1 md:flex-none min-w-[140px]">
                                    <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1.5 block">Ausschlagwürze (L)</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={scaleVolume}
                                            onChange={(e) => setScaleVolume(parseFloat(e.target.value) || 0)}
                                            className="bg-zinc-900 text-white font-mono font-bold px-3 py-2 rounded-lg border border-zinc-700 w-full focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                                        />
                                        {scaleVolume !== originalVolume && (
                                            <button 
                                                onClick={() => setScaleVolume(originalVolume)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-cyan-500 font-bold hover:underline"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex-1 md:flex-none min-w-[140px]">
                                    <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1.5 block">Effizienz (SHA %)</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            min="1"
                                            max="100"
                                            value={scaleEfficiency}
                                            onChange={(e) => setScaleEfficiency(parseFloat(e.target.value) || 0)}
                                            className="bg-zinc-900 text-white font-mono font-bold px-3 py-2 rounded-lg border border-zinc-700 w-full focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                                        />
                                        {scaleEfficiency !== originalEfficiency && (
                                            <button 
                                                onClick={() => setScaleEfficiency(originalEfficiency)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-cyan-500 font-bold hover:underline"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-4 mb-8">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Technische Details</h3>
                        <div className="h-px bg-zinc-800 flex-1"></div>
                    </div>
                    
                    {/* Head Stats: Universal */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        {(!brew.brew_type || brew.brew_type === 'beer') ? (
                            <>
                                <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 flex flex-col items-center text-center justify-center min-h-[100px] relative overflow-hidden">
                                     {brew.data.color && (
                                        <div 
                                            className="absolute inset-x-0 top-0 h-1 z-10"
                                            style={{ backgroundColor: ebcToHex(parseFloat(brew.data.color)) }}
                                        />
                                     )}
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 relative z-10">Farbe</span>
                                    <div className="flex items-center gap-3 relative z-10">
                                        {brew.data.color && (
                                            <div 
                                                className="w-3 h-3 rounded-full shadow-lg border border-white/10"
                                                style={{ backgroundColor: ebcToHex(parseFloat(brew.data.color)) }}
                                            />
                                        )}
                                        <span className="text-2xl font-black text-white">{brew.data.color || '-'} <span className="text-sm font-bold text-zinc-600">EBC</span></span>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 flex flex-col items-center text-center justify-center min-h-[100px]">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Stammwürze</span>
                                    <span className="text-2xl font-black text-white">
                                        {(() => {
                                            const val = brew.data.og;
                                            if (!val) return '-';
                                            const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
                                            if (isNaN(num)) return '-';
                                            
                                            // Handle SG (1.0xx) vs Plato (>1.5 typically)
                                            if (num > 1.000 && num < 1.200) {
                                                return sgToPlato(num).toFixed(1);
                                            }
                                            return num;
                                        })()} <span className="text-sm font-bold text-zinc-600">°P</span>
                                    </span>
                                </div>
                                
                                <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 flex flex-col items-center text-center justify-center min-h-[100px]">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Bittere</span>
                                    <span className="text-2xl font-black text-white">{brew.data.ibu || '-'} <span className="text-sm font-bold text-zinc-600">IBU</span></span>
                                </div>

                                <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800 flex flex-col items-center text-center justify-center min-h-[100px]">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 mb-1">Alkohol</span>
                                    <span className="text-2xl font-black text-white">{brew.data.abv || brew.data.est_abv || '-'} <span className="text-sm font-bold text-zinc-600">%</span></span>
                                </div>
                            </>
                         ) : (
                            // For other types like Wine/Mead - keeping simplified for now or adapting?
                            // User request was specific for "Unten setzen wir...", likely referring to the main Beer view shown in screenshots.
                            // I will leave the generic handling for non-beer or adapt if needed. 
                            // Current fallback:
                            <div className="col-span-4 bg-zinc-900/20 rounded-xl p-4 text-center">
                                <span className="text-zinc-500">Details für diesen Typ folgen.</span>
                            </div>
                         )}
                    </div>

                    {/* BEER Structure */}
                    {(!brew.brew_type || brew.brew_type === 'beer') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Schüttung */}
                        <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50">
                          <h4 className="flex items-center gap-3 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50 uppercase tracking-wider">
                            <Wheat className="w-4 h-4 text-amber-500" /> <span>Schüttung</span>
                          </h4>
                          <MaltView 
                                value={brew.data.malts} 
                                factor={maltFactor} 
                          />
                        </div>

                        {/* Maischen & Wasser */}
                        <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50">
                          <h4 className="flex items-center gap-3 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50 uppercase tracking-wider">
                            <Thermometer className="w-4 h-4 text-blue-500" /> <span>Maischen & <span className="text-zinc-400">Wasser</span></span>
                          </h4>
                          <MashScheduleView 
                            steps={brew.data.mash_steps} 
                            mashWater={brew.data.mash_water_liters}
                            spargeWater={brew.data.sparge_water_liters}
                            factor={volFactor}
                            calculatedMashWater={waterProfile.mashWater}
                            calculatedSpargeWater={waterProfile.spargeWater}
                          />
                        </div>

                        {/* Kochen & Hopfen (Gruppiert) */}
                        <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50 md:col-span-2">
                          <h4 className="flex items-center gap-3 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50 uppercase tracking-wider">
                            <Flame className="w-4 h-4 text-red-500" /> <span>Kochen & Hopfen</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2 flex items-center gap-2"><Clock className="w-3 h-3" /> Kochzeit</p>
                              <p className="text-white font-mono text-lg">{brew.data.boil_time || 60} min</p>
                            </div>
                            <div className="md:col-span-2">
                              <HopView value={brew.data.hops} factor={volFactor} />
                            </div>
                          </div>
                        </div>

                        {/* Gärung & Hefe separat */}
                        <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50 md:col-span-2">
                          <h4 className="flex items-center gap-3 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50 uppercase tracking-wider">
                            <Microscope className="w-4 h-4 text-purple-500" /> <span>Hefe & Gärung</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Hefe</p>
                              <IngredientView value={brew.data.yeast} factor={volFactor} />
                            </div>
                            {brew.data.carbonation_g_l && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Karbonisierung</p>
                                <p className="text-white font-mono text-lg">{brew.data.carbonation_g_l} g/l</p>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    )}
                    
                    {/* WINE Structure */}
                    {brew.brew_type === 'wine' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50 h-full">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                    <span>🍇</span> Reben & Terroir
                                </h4>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Rebsorten</p>
                                        <p className="text-lg text-white font-bold leading-relaxed">{brew.data.grapes || '–'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Region</p>
                                        <p className="text-zinc-300 font-medium">{brew.data.region || '–'}</p>
                                    </div>
                                    <div>
                                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Jahrgang</p>
                                         <p className="text-white font-mono">{brew.data.vintage || '–'}</p>
                                    </div>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                        <span>🍷</span> Ausbau & Balance
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Restzucker</p><p className="text-white font-mono text-lg">{brew.data.residual_sugar_g_l || '-'} g/l</p></div>
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Säure</p><p className="text-white font-mono text-lg">{brew.data.acidity_g_l || '-'} g/l</p></div>
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Start-Dichte</p><p className="text-white font-mono text-lg">{brew.data.original_gravity || '-'} °Oe</p></div>
                                         <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Fasslager</p><p className="text-white font-mono text-lg">{brew.data.oak_months || '0'} M</p></div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {brew.data.oak_aged && <span className="px-3 py-1.5 bg-amber-950/40 text-amber-500 border border-amber-900/50 rounded-lg text-xs font-bold uppercase tracking-wider">Barrique</span>}
                                        {brew.data.sulfites && <span className="px-3 py-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider">Enthält Sulfite</span>}
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                    
                    {/* MEAD Structure */}
                    {brew.brew_type === 'mead' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50 h-full">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                    <span>🍯</span> Zutaten
                                </h4>
                                <div className="space-y-6">
                                     <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Honig & Zusätze</p>
                                        <p className="text-lg text-white font-bold leading-relaxed">{brew.data.honey || '–'}</p>
                                        {brew.data.adjuncts && <p className="text-sm text-zinc-400 mt-2">+ {brew.data.adjuncts}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Hefe</p>
                                        <p className="text-sm text-white font-medium">{brew.data.yeast || '–'}</p>
                                    </div>
                                </div>
                             </div>
                             
                             <div className="space-y-4">
                                 <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50">
                                     <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                        <span>📊</span> Metrics
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">OG (Start)</p><p className="text-white font-mono text-lg">{brew.data.original_gravity || '-'} SG</p></div>
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">FG (End)</p><p className="text-white font-mono text-lg">{brew.data.final_gravity || '-'} SG</p></div>
                                        <div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Reifezeit</p><p className="text-white font-mono text-lg">{brew.data.aging_months || '0'} M</p></div>
                                    </div>
                                 </div>
                                 {brew.data.nutrient_schedule && (
                                     <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50">
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                                            <span>💊</span> Nährstoffplan
                                        </h4>
                                        <p className="text-zinc-300 font-mono text-xs whitespace-pre-wrap">{brew.data.nutrient_schedule}</p>
                                     </div>
                                 )}
                             </div>
                        </div>
                    )}
                    
                    {/* CIDER & SOFTDRINK Structure (Simplified) */}
                    {(brew.brew_type === 'cider' || brew.brew_type === 'softdrink') && (
                        <div className="bg-zinc-900/20 rounded-2xl p-8 border border-zinc-800/50">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                 <div>
                                      <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                        <span>🍎</span> Zutaten
                                    </h4>
                                    <div className="space-y-6">
                                        {brew.data.apples && (<div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Apfelsorten</p><p className="text-lg text-white font-bold">{brew.data.apples}</p></div>)}
                                        {brew.data.base && (<div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Basis</p><p className="text-lg text-white font-bold">{brew.data.base}</p></div>)}
                                        {brew.data.yeast && (<div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Hefe</p><p className="text-zinc-300">{brew.data.yeast}</p></div>)}
                                    </div>
                                 </div>
                                 <div>
                                     <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-6 pb-4 border-b border-zinc-800/50">
                                        <span>📊</span> Werte
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                         {brew.data.original_gravity && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Start-Dichte</p><p className="text-white font-mono text-lg">{brew.data.original_gravity}</p></div>)}
                                         {brew.data.carbonation_g_l && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Karbonisierung</p><p className="text-white font-mono text-lg">{brew.data.carbonation_g_l} g/l</p></div>)}
                                         {brew.data.pH && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">pH</p><p className="text-white font-mono text-lg">{brew.data.pH}</p></div>)}
                                         {brew.data.sugar_g_l && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Zucker</p><p className="text-white font-mono text-lg">{brew.data.sugar_g_l} g/l</p></div>)}
                                         {brew.data.sweetness && (<div><p className="text-zinc-600 text-[10px] uppercase font-bold mb-1">Süße</p><p className="text-white capitalize text-lg">{brew.data.sweetness}</p></div>)}
                                    </div>
                                 </div>
                             </div>
                        </div>
                    )}

                    {/* Recipe Steps / Instructions */}
                    {brew.data.steps && brew.data.steps.length > 0 && (
                        <div className="py-10 border-t border-zinc-800/50">
                             <div className="flex items-center gap-4 mb-8">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Brauanleitung</h3>
                                <div className="h-px bg-zinc-800 flex-1"></div>
                            </div>
                            
                            <div className="relative border-l border-zinc-800 ml-3 space-y-8 py-2">
                                {brew.data.steps.map((step: any, idx: number) => (
                                    <div key={idx} className="relative pl-8">
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-900 border border-cyan-500"></div>
                                        <div className="bg-zinc-900/40 rounded-xl p-5 border border-zinc-800/80">
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <span className="text-[10px] font-black text-cyan-500 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/50 uppercase tracking-wider">
                                                    Schritt {idx + 1}
                                                </span>
                                                {step.title && (
                                                    <span className="text-white font-bold text-base">{step.title}</span>
                                                )}
                                            </div>
                                            <div className="prose prose-invert prose-sm max-w-none text-zinc-300 font-medium leading-relaxed [&>p]:my-0">
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkBreaks]}
                                                    components={{
                                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                                                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                                                        li: ({node, ...props}) => <li className="pl-1 marker:text-zinc-500" {...props} />
                                                    }}
                                                >
                                                    {formatMarkdown(step.instruction)}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Generic Notes Field for Everyone - Footer Style */}
                    {brew.data.notes && (
                         <div className="mt-10 pt-8 border-t border-zinc-800/50">
                             <div className="flex flex-col md:flex-row gap-6 items-start">
                                 <div className="md:w-48 flex-shrink-0">
                                     <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                        <span>📝</span> Notizen
                                     </h4>
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-zinc-400 whitespace-pre-wrap leading-relaxed text-sm font-mono">{brew.data.notes}</p>
                                 </div>
                             </div>
                         </div>
                    )}
                </div>
            )}

            {/* Analytics Section */}
            {tasteProfile && tasteProfile.count > 0 && (
              <div className="py-8 border-t border-zinc-800/50">
                <div className="flex items-center gap-4 mb-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                    Geschmacksprofil
                  </h3>
                  <div className="h-px bg-zinc-800 flex-1"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50 flex flex-col items-center">
                    <h4 className="text-sm font-bold text-zinc-300 mb-4">
                      Radar Chart
                    </h4>
                    <TasteRadarChart profile={tasteProfile} />
                  </div>

                  <div className="bg-zinc-900/20 rounded-2xl p-6 border border-zinc-800/50 h-full">
                    <h4 className="text-sm font-bold text-zinc-300 mb-4 text-center">
                      Häufigste Attribute
                    </h4>
                    <FlavorTagCloud tags={flavorTags} />
                  </div>
                </div>
              </div>
            )}

            {/* Ratings Section */}
            <div className="py-8 border-t border-zinc-800/50">
               <div className="flex items-center gap-4 mb-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Community Feedback ({ratings.length})</h3>
                  <div className="h-px bg-zinc-800 flex-1"></div>
               </div>
              
              {ratings.length === 0 ? (
                <div className="bg-zinc-900/30 rounded-2xl p-8 border border-dashed border-zinc-800 text-center">
                  <p className="text-zinc-500">Bisher keine Bewertungen.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ratings.map((rating) => (
                    <div key={rating.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs">{(rating.author_name || '?')[0]}</div>
                           <div>
                                <p className="font-bold text-sm text-white">{rating.author_name || 'Gast'}</p>
                                <p className="text-[10px] text-zinc-500">{new Date(rating.created_at).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="flex text-amber-500 text-xs gap-0.5">
                            {[1,2,3,4,5].map(s => <span key={s} className={rating.rating >= s ? 'opacity-100' : 'opacity-20 '}>★</span>)}
                        </div>
                      </div>
                      {rating.comment && <p className="text-zinc-400 text-sm pl-11">{rating.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          
          </div>
        </div>
      </div>

      <footer className="pt-12 pb-6 text-center opacity-40 hover:opacity-100 transition-opacity duration-500 flex flex-col items-center">
        <div className="mb-2">
            <Logo className="w-5 h-5" textSize="text-xs" />
        </div>
        <p className="text-[9px] text-zinc-700 font-medium">Digital Brew Lab</p>
        <div className="mt-4">
            <Link href="/impressum" className="text-[10px] text-zinc-600 hover:text-zinc-400 hover:underline transition">
              Impressum
            </Link>
        </div>
        <p className="text-[8px] text-zinc-800 mt-2 font-mono">{id}</p>
      </footer>
      
      {/* Save to Team Modal */}
      {saveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-white">In Team-Bibliothek speichern</h3>
                      <button onClick={() => setSaveModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
                  </div>
                  
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {userBreweries.map(b => (
                          <button
                             key={b.id}
                             disabled={saveLoading || savedInBreweryIds.has(b.id)}
                             onClick={() => handleSaveToTeam(b.id)}
                             className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 group disabled:opacity-50 transition-all ${
                                savedInBreweryIds.has(b.id) 
                                ? 'bg-emerald-900/10 border-emerald-500/20 cursor-default' 
                                : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 hover:shadow-lg'
                             }`}
                          >
                             {b.logo_url ? (
                                 <img src={b.logo_url} className="w-12 h-12 rounded-full object-cover border border-zinc-800" />
                             ) : (
                                 <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl">🏭</div>
                             )}
                             <div className="flex-1">
                                 <div className="flex justify-between items-center">
                                    <span className={`font-bold text-lg block transition ${savedInBreweryIds.has(b.id) ? 'text-emerald-500' : 'text-white group-hover:text-cyan-400'}`}>
                                        {b.name}
                                    </span>
                                    {savedInBreweryIds.has(b.id) && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                 </div>
                                 <span className="text-xs text-zinc-500">
                                     {savedInBreweryIds.has(b.id) ? 'Bereits gespeichert' : 'Klicken zum Speichern'}
                                 </span>
                             </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
