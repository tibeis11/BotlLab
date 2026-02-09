'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChartBar, Thermometer, Leaf, FlaskConical, FileText, Grape, Wine, Apple, Settings, Hexagon, Citrus, Activity, Gauge, Droplets, Sprout, ScrollText, Tag, Crown, Microscope, Star } from 'lucide-react';
import ResponsiveTabs from '@/app/components/ResponsiveTabs';
import { supabase } from '@/lib/supabase';
import { getBreweryTierConfig } from '@/lib/tier-system';
import { checkAndGrantAchievements } from '@/lib/achievements';
import { useAchievementNotification } from '@/app/context/AchievementNotificationContext';
import { useAuth } from '@/app/context/AuthContext';
import { addToFeed } from '@/lib/feed-service';
import CrownCap from '@/app/components/CrownCap';
import { IngredientListEditor } from './IngredientListEditor';
import { MaltListEditor } from './MaltListEditor';
import { HopListEditor } from './HopListEditor';
import { YeastListEditor } from './YeastListEditor';
import { MashStepsEditor } from './MashStepsEditor';
import { RecipeStepsEditor } from './RecipeStepsEditor';
import { calculateColorEBC, calculateIBU, calculateWaterProfile, calculateOG, calculateABV, calculateFG, ebcToHex, calculateBatchSizeFromWater } from '@/lib/brewing-calculations';
import { FormulaInspector } from '@/app/components/FormulaInspector';
import { SubscriptionTier, type PremiumStatus } from '@/lib/premium-config';
import { getPremiumStatus } from '@/lib/actions/premium-actions';
import { notifyNewBrew } from '@/lib/actions/notification-actions';
import LegalConsentModal from '@/app/components/LegalConsentModal';
import { trackEvent } from '@/lib/actions/analytics-actions'; // This will need to be safe for client side usage or moved to API call wrapper

function formatIngredientsForPrompt(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        return value.map((v: any) => {
            const main = `${v.amount}${v.unit} ${v.name}`.trim();
            const details = [];
            if (v.alpha) details.push(`${v.alpha}% Alpha`);
            if (v.time) details.push(`${v.time}min`);
            if (v.usage) details.push(v.usage);
            if (v.color_ebc) details.push(`${v.color_ebc} EBC`);
            if (v.attenuation) details.push(`EVG ${v.attenuation}%`);
            if (v.type) details.push(v.type);
            
            return details.length > 0 ? `${main} (${details.join(', ')})` : main;
        }).join('; ');
    }
    return '';
}

// Simple SVG Component to replace Heroicons
function ArrowLeftIcon({ className }: { className?: string }) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
			<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
		</svg>
	);
}

interface BrewForm {
	id?: string;
	name: string;
	style: string;
	brew_type: string;
	description?: string;
	image_url?: string | null;
	cap_url?: string | null;
	is_public: boolean;
	data?: any;
	remix_parent_id?: string | null;
    moderation_status?: 'pending' | 'approved' | 'rejected';
    moderation_rejection_reason?: string | null;
}

function NumberInput({ 
  value, 
  onChange, 
  step = 1, 
  min = 0, 
  placeholder, 
  label,
  isCalculated,
  calculationInfo,
  previewColor,
  onInspectorOpen,
  readOnly
}: { 
  value: any, 
  onChange: (val: string) => void, 
  step?: number, 
  min?: number, 
  placeholder?: string,
  label?: string,
  isCalculated?: boolean,
  calculationInfo?: string,
  previewColor?: string,
  onInspectorOpen?: () => void,
  readOnly?: boolean
}) {
  const val = parseFloat(value) || 0;

  const update = (newVal: number) => {
    if (readOnly) return;
    if (newVal < min) newVal = min;
    const precision = step.toString().split('.')[1]?.length || 0;
    onChange(newVal.toFixed(precision));
  };

  return (
    <div className="w-full relative group">
      {label && (
        <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 flex items-end gap-2 h-8 leading-tight">
            <span>{label}</span>
            {isCalculated && (
                <div 
                    className={`relative group/info mb-[2px] ${onInspectorOpen ? 'cursor-pointer hover:scale-110 active:scale-95 transition-transform' : 'cursor-help'}`}
                    onClick={(e) => {
                        if (onInspectorOpen) {
                            e.preventDefault();
                            onInspectorOpen();
                        }
                    }}
                >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${onInspectorOpen ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                        {onInspectorOpen ? 'i' : 'ƒ'}
                    </div>
                    {calculationInfo && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black border border-zinc-800 p-2 rounded-lg text-[10px] text-zinc-300 pointer-events-none opacity-0 group-hover/info:opacity-100 transition-opacity z-50 shadow-xl">
                            {calculationInfo}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-zinc-800 rotate-45"></div>
                        </div>
                    )}
                </div>
            )}
        </label>
      )}
      <div className={`flex items-center w-full border ${readOnly ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-800 bg-zinc-950'} rounded-xl transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 overflow-hidden relative`}>
        {/* Color Swatch / Strip */}
        {previewColor && (
            <>
                {readOnly ? (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
                        <div 
                            className="w-6 h-6 rounded-full border border-white/20 shadow-sm" 
                            style={{ backgroundColor: previewColor }}
                        />
                    </div>
                ) : (
                    <div 
                        className="absolute left-0 top-0 bottom-0 w-1.5 z-10" 
                        style={{ backgroundColor: previewColor }}
                    />
                )}
            </>
        )}

        {!readOnly && (
        <button 
          onClick={() => update(val - step)}
          className={`w-12 h-12 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition active:scale-90 flex-shrink-0 z-10 ${previewColor ? 'pl-2' : ''}`}
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
          </svg>
        </button>
        )}
        <input 
          type="number"
          step={step}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : 0}
          onWheel={(e) => e.currentTarget.blur()}
          className={`flex-1 bg-transparent border-none text-center font-bold outline-none placeholder:font-normal placeholder:text-zinc-700 appearance-none min-w-0 relative z-10 ${readOnly ? 'text-white text-lg h-12 pointer-events-none select-none' : 'text-white text-lg h-12 focus:ring-0'}`}
          value={value || ''} 
          onChange={(e) => !readOnly && onChange(e.target.value)} 
          placeholder={placeholder} 
        />
        {!readOnly && (
        <button 
          onClick={() => update(val + step)}
          className="w-12 h-12 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition active:scale-90 flex-shrink-0 z-10"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ 
  checked, 
  onChange, 
  label 
}: { 
  checked: boolean; 
  onChange: (checked: boolean) => void; 
  label: string; 
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 cursor-pointer hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200 group select-none outline-none w-full"
      type="button"
    >
      <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${checked ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
        {label}
      </span>
      
      <div className={`relative w-11 h-6 rounded-full transition-all duration-300 ease-in-out p-1 ${
        checked 
          ? 'bg-cyan-950/40 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
          : 'bg-zinc-950 border-zinc-800 shadow-inner'
      } border flex-shrink-0`}>
        <div className={`h-full aspect-square rounded-full transition-all duration-300 shadow-sm flex items-center justify-center ${
          checked 
            ? 'translate-x-5 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]' 
            : 'translate-x-0 bg-zinc-700'
        }`} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.25, 0.64, 1)' }}>
          <div className={`w-0.5 h-1.5 rounded-full transition-colors ${checked ? 'bg-white/50' : 'bg-zinc-800'}`} />
        </div>
      </div>
    </button>
  );
}

// Restore original emoji icons for compatibility (not used for selection anymore).
const CAP_ICONS = ['🍺', '🍷', '🍎', '🍯', '🥤', '🔥', '🌊', '🧬', '🚀', '🧪', '💎', '🎨', '🦴', '🌿', '🍄', '🍋'];

// Palette of pleasant default center colors (hex). A random one is assigned by default.
const CAP_COLOR_PALETTE = ['#F97316','#FB7185','#EF4444','#F59E0B','#FDE047','#34D399','#10B981','#06B6D4','#3B82F6','#60A5FA','#7C3AED','#A78BFA','#F472B6','#FCA5A5','#FCD34D','#FDBA74'];

function pickRandomCapColor() {
    return CAP_COLOR_PALETTE[Math.floor(Math.random() * CAP_COLOR_PALETTE.length)];
}

export default function BrewEditor({ breweryId, brewId }: { breweryId: string, brewId?: string }) {
	const router = useRouter();
	const { user, loading: authLoading } = useAuth();
	const id = brewId || 'new';
	const { showAchievement } = useAchievementNotification();

	const [loading, setLoading] = useState(true);
	const [breweryTier, setBreweryTier] = useState<string>('garage');
	const [saving, setSaving] = useState(false);
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [inspectorType, setInspectorType] = useState<'IBU' | 'Color' | 'ABV' | 'BatchSize' | 'OG' | 'FG'>('IBU');

    const handleOpenInspector = (type: 'IBU' | 'Color' | 'ABV' | 'BatchSize' | 'OG' | 'FG') => {
        setInspectorType(type);
        setInspectorOpen(true);
    };

	const [generating, setGenerating] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [generatingCap, setGeneratingCap] = useState(false);
	const [uploadingCap, setUploadingCap] = useState(false);
	const [generatingName, setGeneratingName] = useState(false);
	const [generatingDescription, setGeneratingDescription] = useState(false);
	const [generatingLabelPrompt, setGeneratingLabelPrompt] = useState(false);
    const [resultsEditable, setResultsEditable] = useState(false);
	const [analyzingRecipe, setAnalyzingRecipe] = useState(false);
	const [optimizationSuggestions, setOptimizationSuggestions] = useState<string[]>([]);
	const [message, setMessage] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'input' | 'label' | 'caps' | 'optimization' | 'ratings' | 'settings'>('input');
    const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
	const [extraPrompt, setExtraPrompt] = useState('');
    const [legalModalOpen, setLegalModalOpen] = useState(false);
    const [legalModalType, setLegalModalType] = useState<'label' | 'cap' | null>(null);

    async function refreshPremium() {
        if (!user) return;
        const status = await getPremiumStatus();
        setPremiumStatus(status);
    }
    
    useEffect(() => {
        if (user) refreshPremium();
    }, [user]);

    // Ensure a random cap color is assigned by default when editor loads
    useEffect(() => {
        if (!brew.cap_url) {
            const c = pickRandomCapColor();
            setBrew(prev => ({ ...prev, cap_url: c }));
        }
    // We only want to run this when component mounts or when brew is reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
	const [ratings, setRatings] = useState<any[]>([]);
	const [ratingsLoading, setRatingsLoading] = useState(false);
	const [ratingsMessage, setRatingsMessage] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const fileInputCapRef = useRef<HTMLInputElement>(null);
	const [brew, setBrew] = useState<BrewForm>({
		name: '',
		style: '',
		brew_type: 'beer',
		description: '',
		image_url: '/default_label/default.png',
		cap_url: null,
		is_public: true,
        moderation_status: 'pending',
        moderation_rejection_reason: null,
		data: {
            batch_size_liters: '',
            og: '',
            fg: '',
            abv: '',
            ibu: '',
            color: '',
            efficiency: '',
            carbonation_g_l: '',
            mash_water_liters: '',
            sparge_water_liters: '',
            mash_ph: '',
            boil_time: '',
            boil_temp: '',
            yeast: [],
            attenuation: '',
            primary_temp: '',
            malts: [],
            hops: [],
            mash_steps: []
        }
	});

	function updateData(key: string, value: any) {
		setBrew(prev => ({ ...prev, data: { ...(prev.data || {}), [key]: value } }));
	}

    // --- Special Effect: Water -> Batch Size ---
    // Only runs when Water or Malts change. NOT when Batch Size changes (avoid overwrite loop).
    useEffect(() => {
        if (brew.brew_type !== 'beer' || !brew.data) return;
        
        const d = brew.data;
        const mashWater = parseFloat(d.mash_water_liters?.toString().replace(',', '.') || '0');
        const spargeWater = parseFloat(d.sparge_water_liters?.toString().replace(',', '.') || '0');
        const batchSize = parseFloat(d.batch_size_liters?.toString().replace(',', '.') || '0');

        if ((mashWater > 0 || spargeWater > 0) && Array.isArray(d.malts)) {
             const calcBatch = calculateBatchSizeFromWater(mashWater, spargeWater, d.malts as any[]);
             
             // Only update if significantly different from current batch size logic
             if (calcBatch > 0 && Math.abs(calcBatch - batchSize) > 0.5) {
                  updateData('batch_size_liters', calcBatch.toString());
             }
        }
    }, [brew.data?.mash_water_liters, brew.data?.sparge_water_liters, brew.data?.malts, brew.brew_type]);

	// --- Auto Calculations (Dependent on Batch Size) ---
	useEffect(() => {
		if (brew.brew_type !== 'beer' || !brew.data) return;
        
        const d = brew.data;
        const currentData = { ...d };
        let hasChanges = false;

        // Helper for safe float parsing (handle "12,5" -> 12.5)
        const safeFloat = (val: any) => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            const str = val.toString().replace(',', '.');
            return parseFloat(str) || 0;
        };

        const batchSize = safeFloat(d.batch_size_liters);
        const efficiency = safeFloat(d.efficiency || '75');
        // Note: autoAttenuation logic below might override this locally
        
        // 1. Calculate OG from Malts
        let calcOG = 0;
        if (Array.isArray(d.malts) && batchSize > 0) {
            calcOG = calculateOG(batchSize, d.malts as any[], efficiency);
            const currentOG = safeFloat(d.og);
            
            // Allow update if diff is significant (> 0.002 to avoid flip-flop)
            if (calcOG > 0 && Math.abs(calcOG - currentOG) > 0.002) {
                currentData.og = calcOG.toString();
                hasChanges = true;
            }
        }
        
        // 2. Max Attenuation from Yeast List
        let autoAttenuation = safeFloat(d.attenuation);
        if (Array.isArray(d.yeast)) {
             // Find max attenuation from yeast list
             let maxAtt = 0;
             d.yeast.forEach((y: any) => {
                 const v = safeFloat(y.attenuation);
                 if(v > maxAtt) maxAtt = v;
             });
             
             // If we found a yeast attenuation, use it
             // If yeast list is empty or has 0 attenuation, we keep existing user input OR 0 ??
             // Actually, if we have yeast, we should sync. 
             if (maxAtt > 0 && Math.abs(maxAtt - autoAttenuation) > 0.1) {
                 currentData.attenuation = maxAtt.toString();
                 autoAttenuation = maxAtt;
                 hasChanges = true;
             }
        }

        // 3. FG Calculation (based on OG and Attenuation)
        // Re-read OG from currentData in case we just updated it
        const og = safeFloat(currentData.og || d.og);
        
        if (og > 0) {
            // Use the updated attenuation value (autoAttenuation)
            const calcFG = calculateFG(og, autoAttenuation);
            const currentFG = safeFloat(d.fg);
            
            if (Math.abs(calcFG - currentFG) > 0.002) {
                 currentData.fg = calcFG.toString();
                 hasChanges = true;
            }
        }

        // 4. ABV Calculation
		// Uses updated OG/FG 
        const fg = safeFloat(currentData.fg || d.fg);
		if (og > 0 && fg > 0 && og > fg) {
			const calcAbv = calculateABV(og, fg);
            const currentAbv = safeFloat(d.abv);
			
            if (calcAbv > 0 && Math.abs(calcAbv - currentAbv) > 0.1) {
                currentData.abv = calcAbv.toString();
                hasChanges = true;
            }
		}

        // 5. Color (EBC) Calculation
        if (Array.isArray(d.malts) && batchSize > 0) {
            const calcColor = calculateColorEBC(batchSize, d.malts as any[]);
            const currentColor = safeFloat(d.color);
            
            // Allow slight tolerance
            if (calcColor > 0 && Math.abs(calcColor - currentColor) > 0.5) {
                 currentData.color = calcColor.toString();
                 hasChanges = true;
            }
        }

        // 6. IBU Calculation
        if (Array.isArray(d.hops) && batchSize > 0 && og > 0) {
            const calcIBU = calculateIBU(batchSize, og, d.hops as any[]);
             const currentIBU = safeFloat(d.ibu);
             
             if (calcIBU > 0 && Math.abs(calcIBU - currentIBU) > 0.5) {
                 currentData.ibu = calcIBU.toString();
                 hasChanges = true;
             }
        }
        
        // Removed Block 7 & 8 (Water -> Batch Size is handled in separate useEffect)

        if (hasChanges) {
             setBrew(prev => ({ ...prev, data: currentData }));
        }

	}, [
        brew.brew_type, 
        brew.data?.og, 
        brew.data?.fg, 
        // Use length keys or JSON.stringify for deep comparison to avoid ref-change loop
        // brew.data?.malts, 
        // brew.data?.hops, 
        // brew.data?.yeast,
        brew.data?.malts?.length,
        JSON.stringify(brew.data?.malts), // Deep check, but safe since small
        brew.data?.hops?.length,
        JSON.stringify(brew.data?.hops),
        brew.data?.batch_size_liters,
        brew.data?.yeast?.length,
        brew.data?.attenuation,
        brew.data?.efficiency
    ]);
	useEffect(() => {
		if (!authLoading) {
			init();
		}
	}, [id, breweryId, authLoading]);

	async function init() {
		setLoading(true);
		
		if (!user) {
			const redirectPath = id === 'new' 
                ? `/team/${breweryId}/brews/new` 
                : `/team/${breweryId}/brews/${id}/edit`;
			router.push(`/login?redirect=${redirectPath}`);
			return;
		}

        // Fetch Brewery Tier
        const { data: bData } = await supabase.from('breweries').select('tier').eq('id', breweryId).maybeSingle();
        if (bData) setBreweryTier(bData.tier || 'garage');

		if (id !== 'new') {
			const { data, error } = await supabase
				.from('brews')
				.select('*')
				.eq('id', id)
				.eq('brewery_id', breweryId)
				.maybeSingle();

			if (error || !data) {
				router.push(`/team/${breweryId}/brews`);
				return;
			}

			setBrew({ ...data, data: data.data || {} });
			await loadRatings(data.id);
		}

		setLoading(false);
	}

	async function loadRatings(brewId: string) {
		try {
			setRatingsLoading(true);
			const { data } = await supabase
				.from('ratings')
				.select('*')
				.eq('brew_id', brewId)
				.order('created_at', { ascending: false });
			setRatings(data || []);
		} finally {
			setRatingsLoading(false);
		}
	}

	async function handleSave() {
		setMessage(null);
		setSaving(true);
		
		if (!user) return;

        // Sanitize Data (Convert empty strings to null to ensure Postgres Numeric Indices don't crash)
        const sanitizedData = { ...(brew.data || {}) };
        Object.keys(sanitizedData).forEach(key => {
            if (sanitizedData[key] === '') {
                sanitizedData[key] = null;
            }
        });

		if (id === 'new') {
			const tierConfig = getBreweryTierConfig(breweryTier as any);
			const { count } = await supabase
				.from('brews')
				.select('*', { count: 'exact', head: true })
				.eq('brewery_id', breweryId);

			// Check if we should bypass organic brewery limits (Premium/Enterprise feature)
			const shouldBypass = premiumStatus?.features.bypassBrewLimits ?? false;

			if (!shouldBypass && (count || 0) >= tierConfig.limits.maxBrews) {
                let errorMsg = `Brauerei-Limit erreicht: ${tierConfig.displayName} erlaubt ${tierConfig.limits.maxBrews} Rezepte.`;
                if (premiumStatus?.tier === 'brewer') {
                    errorMsg = `Limit erreicht (${tierConfig.limits.maxBrews}). HINWEIS: Dein 'Brewer'-Abo enthält KEINE Slot-Erweiterung (nur AI). Upgrade auf 'Brewery' nötig.`;
                } else if (premiumStatus?.tier === 'free') {
                    errorMsg += " Upgrade auf 'Brewery' für unbegrenzte Slots.";
                }
				setMessage(errorMsg);
				setSaving(false);
				return;
			}

			const payload = {
				name: brew.name,
				style: brew.style,
				brew_type: brew.brew_type,
				description: brew.description,
				image_url: brew.image_url,
				cap_url: brew.cap_url,
				is_public: brew.is_public || false,
				data: sanitizedData,
				user_id: user.id,
				brewery_id: breweryId,
			};

			const { data, error } = await supabase
				.from('brews')
				.insert([payload])
				.select()
				.single();

			if (error || !data) {
				setMessage(error?.message || 'Speichern fehlgeschlagen.');
				setSaving(false);
				return;
			}

			// Feed Post
			addToFeed(breweryId, user, 'BREW_CREATED', {
				brew_id: data.id,
				brew_name: data.name
			});

            // Email Notification
            notifyNewBrew(
                breweryId, 
                data.id, 
                data.name, 
                brew.brew_type, 
                user?.user_metadata?.full_name || user.email || 'Ein Team-Mitglied'
            );

            // Analytics
            try {
                // Tracking creation event for analytics
                // Note: Since this is a client component, we might face issues if trackEvent uses server-only modules like 'headers'.
                // If trackEvent is marked 'use server', Next.js handles the RPC call automatically.
                await trackEvent({
                    event_type: 'create_brew',
                    category: 'content',
                    payload: {
                        brew_id: data.id,
                        brew_name: data.name,
                        brewery_id: breweryId,
                        style: brew.style,
                        type: brew.brew_type
                    }
                });
            } catch (e) {
                console.warn('Analytics tracking failed (non-critical):', e);
            }

			setBrew({ ...data, data: data.data || {} });
			setSaving(false);
			router.replace(`/team/${breweryId}/brews/${data.id}/edit`);
			await loadRatings(data.id);
			
			checkAndGrantAchievements(user.id).then(newAchievements => {
				newAchievements.forEach(achievement => showAchievement(achievement));
			}).catch(console.error);
			
			return;
		}

		const { data, error } = await supabase
			.from('brews')
			.update({
				name: brew.name,
				style: brew.style,
				brew_type: brew.brew_type,
				description: brew.description,
				image_url: brew.image_url,
				cap_url: brew.cap_url,
				is_public: brew.is_public,
				data: sanitizedData,
			})
			.eq('id', id)
            .eq('brewery_id', breweryId)
			.select()
			.single();

		if (error || !data) {
			setMessage(error?.message || 'Speichern fehlgeschlagen.');
		} else {
            // Storage Hygiene: If we saved a default/external image/cap, clean up the custom files from storage to prevent pollution
            if (data.id) {
                // If not using a custom brew image (url doesn't contain brew-ID), clean up storage
                if (!data.image_url || !data.image_url.includes(`brew-${data.id}`)) {
                    cleanStorageAssets(`brew-${data.id}`).catch(e => console.error("Clean brew assets", e));
                }
                // If not using a custom cap image (url doesn't contain cap-ID), clean up storage
                if (!data.cap_url || !data.cap_url.includes(`cap-${data.id}`)) {
                    cleanStorageAssets(`cap-${data.id}`).catch(e => console.error("Clean cap assets", e));
                }
            }

			setBrew({ ...data, data: data.data || {} });
			setMessage('Gespeichert.');

			if (data.id) await loadRatings(data.id);
			
			checkAndGrantAchievements(user.id).then(newAchievements => {
				newAchievements.forEach(achievement => showAchievement(achievement));
			}).catch(console.error);
		}
		setSaving(false);
	}

	async function moderateRating(ratingId: string, status: 'approved' | 'auto_approved' | 'rejected') {
		setRatingsMessage(null);
		const { data: { session } } = await supabase.auth.getSession();
		if (!session || !brew.id) {
			setRatingsMessage('Nicht angemeldet.');
			return;
		}

		try {
			const res = await fetch('/api/ratings/moderate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ ratingId, brewId: brew.id, status })
			});

			const payload = await res.json();
			if (!res.ok) {
				setRatingsMessage(payload.error || 'Aktion fehlgeschlagen');
				return;
			}

			setRatingsMessage(status === 'approved' || status === 'auto_approved' ? 'Bewertung freigegeben.' : 'Bewertung abgelehnt.');
			await loadRatings(brew.id!);
		} catch (err: any) {
			setRatingsMessage(err?.message || 'Aktion fehlgeschlagen');
		}
	}

	async function removeRating(ratingId: string) {
		setRatingsMessage(null);
		if (!user || !brew.id) return;
		try {
			const { error } = await supabase
				.from('ratings')
				.delete()
				.eq('id', ratingId)
				.eq('brew_id', brew.id);
			if (error) {
				setRatingsMessage(error.message);
				return;
			}
			setRatingsMessage('Bewertung gelöscht.');
			await loadRatings(brew.id!);
		} catch (err: any) {
			setRatingsMessage(err?.message || 'Aktion fehlgeschlagen');
		}
	}

	async function deleteBrew() {
		if (!user || !brew.id) return;
		if (!confirm("Möchtest du dieses Rezept wirklich unwiderruflich löschen? \n\nHINWEIS: Alle befüllten Flaschen werden zurückgesetzt (auf 'Leer' gesetzt).")) return;

		setSaving(true);
		
		// Unlink bottles
		const { error: bottlesError } = await supabase
			.from('bottles')
			.update({ brew_id: null })
			.eq('brew_id', brew.id);
		
		if (bottlesError) console.error('Fehler beim Zurücksetzen der Flaschen:', bottlesError);

        // CLEANUP STORAGE: Remove all associated files (images & caps)
        await cleanStorageAssets(`brew-${brew.id}`);
        await cleanStorageAssets(`cap-${brew.id}`);

		// Delete Brew
		const { error } = await supabase.from('brews').delete().eq('id', brew.id);
		
		if (!error) {
			router.replace(`/team/${breweryId}/brews`);
		} else {
			setMessage('Fehler beim Löschen: ' + error.message);
			setSaving(false);
		}
	}

	async function handleGenerate() {
		if (!brew.id) {
			setMessage('Bitte zuerst speichern, bevor du ein Label generierst.');
			return;
		}

		setGenerating(true);
		setMessage(null);

		const typePrompt: string[] = [];
		const d = brew.data || {};
		if (brew.brew_type === 'beer') {
			if (d.abv) typePrompt.push(`ABV ${d.abv}%`);
			if (d.ibu) typePrompt.push(`IBU ${d.ibu}`);
			if (d.srm) typePrompt.push(`SRM ${d.srm}`);
			if (d.malts) typePrompt.push(`Malts: ${formatIngredientsForPrompt(d.malts)}`);
			if (d.hops) typePrompt.push(`Hops: ${formatIngredientsForPrompt(d.hops)}`);
			if (d.yeast) typePrompt.push(`Yeast: ${formatIngredientsForPrompt(d.yeast)}`);
			if (d.og && d.fg) typePrompt.push(`OG ${d.og}, FG ${d.fg}`);
		} else if (brew.brew_type === 'wine') {
			if (d.abv) typePrompt.push(`ABV ${d.abv}%`);
			if (d.grapes) typePrompt.push(`Grapes: ${d.grapes}`);
			if (d.vintage) typePrompt.push(`Vintage ${d.vintage}`);
			if (d.region) typePrompt.push(`Region ${d.region}`);
			if (d.oak_aged) typePrompt.push(`Oak aged${d.oak_months ? ` ${d.oak_months} months` : ''}`);
			if (d.residual_sugar_g_l) typePrompt.push(`Residual sugar ${d.residual_sugar_g_l} g/l`);
			if (d.acidity_g_l) typePrompt.push(`Acidity ${d.acidity_g_l} g/l`);
			if (d.sulfites) typePrompt.push(`Contains sulfites`);
		} else if (brew.brew_type === 'cider') {
			if (d.abv) typePrompt.push(`ABV ${d.abv}%`);
			if (d.apples) typePrompt.push(`Apples: ${d.apples}`);
			if (d.yeast) typePrompt.push(`Yeast: ${d.yeast}`);
			if (d.fermentation) typePrompt.push(`Fermentation: ${d.fermentation}`);
			if (d.sweetness) typePrompt.push(`Sweetness: ${d.sweetness}`);
			if (d.carbonation_g_l) typePrompt.push(`Carbonation ${d.carbonation_g_l} g/l`);
			if (d.pH) typePrompt.push(`pH ${d.pH}`);
		} else if (brew.brew_type === 'mead') {
			if (d.abv) typePrompt.push(`ABV ${d.abv}%`);
			if (d.honey) typePrompt.push(`Honey: ${d.honey}`);
			if (d.adjuncts) typePrompt.push(`Adjuncts: ${d.adjuncts}`);
			if (d.yeast) typePrompt.push(`Yeast: ${d.yeast}`);
			if (d.final_gravity) typePrompt.push(`FG ${d.final_gravity}`);
			if (d.aging_months) typePrompt.push(`Aging ${d.aging_months} months`);
		} else if (brew.brew_type === 'softdrink') {
			if (d.base) typePrompt.push(`Base flavor: ${d.base}`);
			if (d.sugar_g_l) typePrompt.push(`Sugar ${d.sugar_g_l} g/l`);
			if (d.acidity_ph) typePrompt.push(`pH ${d.acidity_ph}`);
			if (d.carbonation_g_l) typePrompt.push(`Carbonation ${d.carbonation_g_l} g/l`);
			if (d.natural_flavors) typePrompt.push(`Natural flavors`);
			if (d.coloring) typePrompt.push(`Coloring used`);
		}

		const promptParts = [
			`Create a pure illustration label design for ${brew.name || 'dein Brew'}.`,
			brew.style ? `Style: ${brew.style}.` : '',
			brew.description ? `Visual theme: ${brew.description}.` : '',
			typePrompt.length ? `Context: ${typePrompt.join(', ')}.` : '',
			extraPrompt ? `Additional style: ${extraPrompt}` : '',
			'IMPORTANT: Pure illustration artwork only, absolutely NO TEXT, NO LETTERS, NO WORDS, NO TYPOGRAPHY on the label.',
			'Text-free design, visual artwork only.',
			'High detail, vibrant colors, artistic illustration, 1:1 aspect ratio.'
		].filter(Boolean);

		try {
			const response = await fetch('/api/generate-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: promptParts.join(' '),
					brewId: brew.id
				})
			});

			const data = await response.json();
			if (data.imageUrl) {
				setBrew(prev => ({ ...prev, image_url: data.imageUrl }));
				setMessage('Label aktualisiert.');
			} else {
				setMessage(data.error || 'Generierung fehlgeschlagen.');
			}
		} catch (e: any) {
			setMessage(e?.message || 'Generierung fehlgeschlagen.');
		} finally {
			setGenerating(false);
            // Re-fetch credits
            if (user?.id) {
                fetch(`/api/premium/status?userId=${user.id}`)
                    .then((res) => res.json())
                    .then((data) => setPremiumStatus(data));
            }
		}
	}

    /**
     * Helper to show credit info next to AI buttons
     */
    function AICreditBadge() {
        if (!premiumStatus) return null;
        const remaining = premiumStatus.features.aiGenerationsRemaining;
        // JSON.stringify converts Infinity to null, so we check both
        const isUnlimited = remaining === Infinity || remaining === null;
        
        return (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1.5 ${
                isUnlimited || (remaining && remaining > 0) ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-500'
            }`}>
                {isUnlimited ? '∞' : remaining} Left
            </span>
        );
    }

	async function handleField<K extends keyof BrewForm>(key: K, value: BrewForm[K]) {
		setBrew(prev => {
			const next = { ...prev, [key]: value };
			
			if (key === 'brew_type' && (!prev.cap_url || CAP_ICONS.includes(prev.cap_url))) {
				const iconMap: Record<string, string> = {
					beer: '🍺',
					wine: '🍷',
					cider: '🍎',
					mead: '🍯',
					softdrink: '🥤'
				};
				next.cap_url = iconMap[value as string] || '🍺';
			}
			
			return next;
		});
	}

	async function handleGenerateName() {
		setGeneratingName(true);
		setMessage(null);

		try {
			const d = brew.data || {};
			const context: string[] = [];
			
			if (brew.style) context.push(`Style: ${brew.style}`);
			if (brew.brew_type) context.push(`Type: ${brew.brew_type}`);
			
			if (brew.brew_type === 'beer') {
				if (d.hops) context.push(`Hops: ${formatIngredientsForPrompt(d.hops)}`);
				if (d.malts) context.push(`Malts: ${formatIngredientsForPrompt(d.malts)}`);
				if (d.abv) context.push(`ABV: ${d.abv}%`);
				if (d.ibu) context.push(`IBU: ${d.ibu}`);
			} else if (brew.brew_type === 'wine') {
				if (d.grapes) context.push(`Grapes: ${d.grapes}`);
				if (d.region) context.push(`Region: ${d.region}`);
				if (d.vintage) context.push(`Vintage: ${d.vintage}`);
			} else if (brew.brew_type === 'cider') {
				if (d.apples) context.push(`Apples: ${d.apples}`);
			} else if (brew.brew_type === 'mead') {
				if (d.honey) context.push(`Honey: ${d.honey}`);
				if (d.adjuncts) context.push(`Adjuncts: ${d.adjuncts}`);
			} else if (brew.brew_type === 'softdrink') {
				if (d.base) context.push(`Base: ${d.base}`);
			}

			const response = await fetch('/api/generate-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'name',
					context: context.join(', '),
					brewType: brew.brew_type,
					style: brew.style
				})
			});

            if (response.status === 402) {
                setMessage('Keine KI-Credits mehr übrig! Bitte warte bis zum nächsten Monat oder upgrade dein Abo.');
                setGeneratingName(false);
                return;
            }

			const data = await response.json();
			if (data.text) {
				setBrew(prev => ({ ...prev, name: data.text }));
				setMessage('Name generiert! 🎉');
			} else {
				setMessage(data.error || 'Name-Generierung fehlgeschlagen.');
			}
		} catch (e: any) {
			setMessage(e?.message || 'Name-Generierung fehlgeschlagen.');
		} finally {
			setGeneratingName(false);
            // Re-fetch credits
            if (user?.id) {
                fetch(`/api/premium/status?userId=${user.id}`)
                    .then((res) => res.json())
                    .then((data) => setPremiumStatus(data));
            }
		}
	}

	async function handleOptimizeRecipe() {
		setAnalyzingRecipe(true);
		setMessage(null);
		setOptimizationSuggestions([]);

		try {
			const d = brew.data || {};
			const recipeData: any = {
				name: brew.name,
				style: brew.style,
				brewType: brew.brew_type,
				description: brew.description
			};

			if (brew.brew_type === 'beer') {
				recipeData.abv = d.abv;
				recipeData.ibu = d.ibu;
				recipeData.colorEBC = d.color;
				recipeData.og = d.og;
				recipeData.fg = d.fg;
				recipeData.malts = formatIngredientsForPrompt(d.malts);
				recipeData.hops = formatIngredientsForPrompt(d.hops);
				recipeData.yeast = formatIngredientsForPrompt(d.yeast);
				recipeData.boilTime = d.boil_time;
				recipeData.mashWater = d.mash_water_liters;
				recipeData.spargeWater = d.sparge_water_liters;

				if (Array.isArray(d.mash_steps)) {
					recipeData.mashSchedule = d.mash_steps.map((s: any) => `${s.name}: ${s.temperature}°C (${s.duration}min)`).join(' -> ');
				}
			} else if (brew.brew_type === 'wine') {
				recipeData.abv = d.abv;
				recipeData.grapes = d.grapes;
				recipeData.vintage = d.vintage;
				recipeData.region = d.region;
				recipeData.oakAged = d.oak_aged;
				recipeData.oakMonths = d.oak_months;
			} else if (brew.brew_type === 'cider') {
				recipeData.abv = d.abv;
				recipeData.apples = d.apples;
				recipeData.sweetness = d.sweetness;
				recipeData.yeast = d.yeast;
			} else if (brew.brew_type === 'mead') {
				recipeData.abv = d.abv;
				recipeData.honey = d.honey;
				recipeData.adjuncts = d.adjuncts;
				recipeData.yeast = d.yeast;
			}

			const response = await fetch('/api/generate-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'optimization',
					recipeData
				})
			});

			const data = await response.json();
			if (data.suggestions && Array.isArray(data.suggestions)) {
				setOptimizationSuggestions(data.suggestions);
				setMessage('Rezept analysiert! ✨');
			} else {
				setMessage(data.error || 'Analyse fehlgeschlagen.');
			}
		} catch (e: any) {
			setMessage(e?.message || 'Analyse fehlgeschlagen.');
		} finally {
			setAnalyzingRecipe(false);
		}
	}

	async function handleGenerateDescription() {
		setGeneratingDescription(true);
		setMessage(null);

		try {
			const d = brew.data || {};
			const details: string[] = [];
			
			if (brew.name) details.push(`Name: ${brew.name}`);
			if (brew.style) details.push(`Style: ${brew.style}`);
			if (brew.brew_type) details.push(`Type: ${brew.brew_type}`);
			
			if (brew.brew_type === 'beer') {
				if (d.abv) details.push(`ABV: ${d.abv}%`);
				if (d.ibu) details.push(`IBU: ${d.ibu}`);
				if (d.srm) details.push(`SRM: ${d.srm}`);
				if (d.malts) details.push(`Malts: ${formatIngredientsForPrompt(d.malts)}`);
				if (d.hops) details.push(`Hops: ${formatIngredientsForPrompt(d.hops)}`);
				if (d.yeast) details.push(`Yeast: ${formatIngredientsForPrompt(d.yeast)}`);
				if (d.og && d.fg) details.push(`OG: ${d.og}, FG: ${d.fg}`);
			} else if (brew.brew_type === 'wine') {
				if (d.abv) details.push(`ABV: ${d.abv}%`);
				if (d.grapes) details.push(`Grapes: ${d.grapes}`);
				if (d.vintage) details.push(`Vintage: ${d.vintage}`);
				if (d.region) details.push(`Region: ${d.region}`);
				if (d.oak_aged) details.push(`Oak aged`);
			} else if (brew.brew_type === 'cider') {
				if (d.abv) details.push(`ABV: ${d.abv}%`);
				if (d.apples) details.push(`Apples: ${d.apples}`);
				if (d.sweetness) details.push(`Sweetness: ${d.sweetness}`);
			} else if (brew.brew_type === 'mead') {
				if (d.abv) details.push(`ABV: ${d.abv}%`);
				if (d.honey) details.push(`Honey: ${d.honey}`);
				if (d.adjuncts) details.push(`Adjuncts: ${d.adjuncts}`);
			} else if (brew.brew_type === 'softdrink') {
				if (d.base) details.push(`Base flavor: ${d.base}`);
				if (d.natural_flavors) details.push(`Natural flavors`);
			}

			const response = await fetch('/api/generate-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'description',
					details: details.join(', '),
					brewType: brew.brew_type,
					style: brew.style
				})
			});

            if (response.status === 402) {
                setMessage('Keine KI-Credits mehr übrig! Bitte warte bis zum nächsten Monat oder upgrade dein Abo.');
                setGeneratingDescription(false);
                return;
            }

			const data = await response.json();
			if (data.text) {
				setBrew(prev => ({ ...prev, description: data.text }));
				setMessage('Beschreibung generiert! ✨');
			} else {
				setMessage(data.error || 'Beschreibungs-Generierung fehlgeschlagen.');
			}
		} catch (e: any) {
			setMessage(e?.message || 'Beschreibungs-Generierung fehlgeschlagen.');
		} finally {
			setGeneratingDescription(false);
            // Re-fetch credits
            if (user?.id) {
                fetch(`/api/premium/status?userId=${user.id}`)
                    .then((res) => res.json())
                    .then((data) => setPremiumStatus(data));
            }
		}
	}

	async function handleGenerateLabelPrompt() {
		setGeneratingLabelPrompt(true);
		setMessage(null);

		try {
			const response = await fetch('/api/generate-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'label_prompt',
					context: brew.name, // Pass name as context
					brewType: brew.brew_type,
					style: brew.style
				})
			});

            if (response.status === 402) {
                setMessage('Keine KI-Credits mehr übrig! Bitte warte bis zum nächsten Monat oder upgrade dein Abo.');
                setGeneratingLabelPrompt(false);
                return;
            }

			const data = await response.json();
			if (data.text) {
				setExtraPrompt(data.text);
				setMessage('Label-Prompt generiert! ✨');
			} else {
				setMessage(data.error || 'Prompt-Generierung fehlgeschlagen.');
			}
		} catch (e: any) {
			setMessage(e?.message || 'Prompt-Generierung fehlgeschlagen.');
		} finally {
			setGeneratingLabelPrompt(false);
            // Re-fetch credits
            if (user?.id) {
                fetch(`/api/premium/status?userId=${user.id}`)
                    .then((res) => res.json())
                    .then((data) => setPremiumStatus(data));
            }
		}
	}

	// Helper to clean up old files for a specific brew/cap prefix
    async function cleanStorageAssets(prefix: string) {
        // List files in the root of 'labels' bucket
        const { data, error } = await supabase.storage
            .from('labels')
            .list('', { search: prefix, limit: 10 }); // Search acts like a fuzzy match
        
        if (error) {
            console.warn('Cleanup check failed:', error);
            return;
        }

        // Filter to ensure we only delete files that strictly start with the prefix + dot or existing patterns
        // We want to delete 'brew-{id}.png', 'brew-{id}.jpg', 'brew-{id}-timestamp.png'
        const filesToDelete = data
            .filter(f => f.name.startsWith(prefix))
            .map(f => f.name);

        if (filesToDelete.length > 0) {
            console.log("Cleaning up old assets:", filesToDelete);
            await supabase.storage.from('labels').remove(filesToDelete);
        }
    }

	async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			setMessage('Bitte nur Bilder hochladen (PNG, JPG, etc.)');
			return;
		}

		if (!brew.id) {
			setMessage('Bitte zuerst speichern, bevor du ein Label hochlädst.');
			return;
		}

		setUploading(true);
		setMessage(null);

		try {
            // 1. Clean up OLD images (ensure only one exists)
            await cleanStorageAssets(`brew-${brew.id}`);

            // 2. Upload NEW image (Standardized Name: brew-{id}.{ext})
			const fileName = `brew-${brew.id}.${file.name.split('.').pop()}`;
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('labels')
				.upload(fileName, file, { upsert: true });

			if (uploadError) throw uploadError;

            // Force cache bust
			const { data: urlData } = supabase.storage.from('labels').getPublicUrl(fileName);
			const imageUrl = `${urlData?.publicUrl}?t=${Date.now()}`;

			if (!urlData.publicUrl) throw new Error('Keine URL erhalten');

			if (!user) throw new Error('Nicht authentifiziert');
            
            // Note: Trigger will reset moderation status to pending automatically!
			const { data, error } = await supabase
				.from('brews')
				.update({ image_url: imageUrl })
				.eq('id', brew.id)
				.select()
				.single();

			if (error) throw error;
            
            // Update local state (including new moderation status from DB return)
			setBrew(prev => ({ 
                ...prev, 
                image_url: imageUrl,
                moderation_status: data.moderation_status,
                moderation_rejection_reason: data.moderation_rejection_reason 
            }));
			setMessage('Label hochgeladen und gespeichert.');
		} catch (err: any) {
			setMessage(err?.message || 'Upload fehlgeschlagen.');
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	}

	async function handleCapUpload(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!brew.id) {
			setMessage('Bitte zuerst speichern.');
			return;
		}

		setUploadingCap(true);
		try {
            // 1. Clean up OLD caps
            await cleanStorageAssets(`cap-${brew.id}`);

            // 2. Upload NEW cap
			const fileName = `cap-${brew.id}.${file.name.split('.').pop()}`;
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('labels')
				.upload(fileName, file, { upsert: true });

			if (uploadError) throw uploadError;

			const { data: urlData } = supabase.storage.from('labels').getPublicUrl(fileName);
			const imageUrl = `${urlData?.publicUrl}?t=${Date.now()}`;

			const { error } = await supabase
				.from('brews')
				.update({ cap_url: imageUrl })
				.eq('id', brew.id);

			if (error) throw error;

			setBrew(prev => ({ ...prev, cap_url: imageUrl }));
			setMessage('Kronkorken-Design hochgeladen!');
		} catch (err: any) {
			setMessage(err.message);
		} finally {
			setUploadingCap(false);
			if (fileInputCapRef.current) fileInputCapRef.current.value = '';
		}
	}

	async function handleGenerateCap() {
		if (!brew.id) {
			setMessage('Bitte zuerst speichern.');
			return;
		}

		setGeneratingCap(true);
		setMessage(null);

		try {
			const prompt = `A minimalist flat vector icon for a ${brew.brew_type} named "${brew.name}", style: ${brew.style}. Clean graphic on solid black background, highly iconic.`;
			
			const response = await fetch('/api/generate-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt,
					brewId: brew.id,
					type: 'cap'
				})
			});

            if (response.status === 402) {
                setMessage('Keine KI-Credits mehr übrig! Bitte warte bis zum nächsten Monat oder upgrade dein Abo.');
                setGeneratingCap(false);
                return;
            }

			const data = await response.json();
			if (data.imageUrl) {
				setBrew(prev => ({ ...prev, cap_url: data.imageUrl }));
				setMessage('KI-Kronkorken generiert! ✨');
			} else {
				throw new Error(data.error || 'Fehler');
			}
		} catch (err: any) {
			setMessage('KI-Generierung fehlgeschlagen: ' + err.message);
		} finally {
			setGeneratingCap(false);
            // Re-fetch credits
            if (user?.id) {
                fetch(`/api/premium/status?userId=${user.id}`)
                    .then((res) => res.json())
                    .then((data) => setPremiumStatus(data));
            }
		}
	}

	if (loading) {
		return (
			<div className="bg-black text-white flex items-center justify-center p-20">
				<div className="text-center">
					<div className="text-5xl mb-4 animate-pulse">🧪</div>
					<p className="text-zinc-400">Lade Rezeptdaten...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-black text-white sm:p-6 md:p-8 font-sans antialiased">
			<div className="max-w-[1600px] mx-auto w-full space-y-8">
				<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
					<div>
						<div className="flex items-center gap-3 mb-1">
							<h1 className="text-2xl font-bold text-white tracking-tight">{id === 'new' ? 'Neues Rezept' : brew.name || 'Rezept bearbeiten'}</h1>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-950/30 text-cyan-400 border border-cyan-900 uppercase tracking-wide">
                                Editor
                            </span>
						</div>
						<p className="text-sm text-zinc-500">Hier entstehen deine Brau-Kreationen</p>
					</div>
					<div className="flex items-center gap-3 w-full md:w-auto">
                        <Link 
                            href={`/team/${breweryId}/brews`}
                            className="hidden md:flex bg-black hover:bg-zinc-900 text-zinc-300 hover:text-white px-4 py-2 rounded-md text-sm font-medium border border-zinc-800 transition-colors items-center gap-2"
                        >
                            Abbrechen
                        </Link>
						<button
							onClick={handleSave}
							disabled={saving}
							className="flex-1 md:flex-none bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold px-6 py-2.5 rounded-lg hover:from-cyan-400 hover:to-blue-400 transition disabled:opacity-60 text-center justify-center items-center text-sm shadow-lg shadow-cyan-900/20"
						>
							{saving ? 'Speichern...' : 'Speichern'}
						</button>
					</div>
				</header>

				{message && (
					<div className="bg-zinc-900 border border-cyan-500/30 rounded-xl px-4 py-3 text-sm text-zinc-200">
						{message}
					</div>
				)}

                        {/* Global moderation banner: show when a label or uploaded cap is pending review */}
                        {brew.moderation_status === 'pending' && (
                            ((brew.image_url && brew.image_url !== '/default_label/default.png') || (brew.cap_url && !(typeof brew.cap_url === 'string' && brew.cap_url.startsWith('#')))) && (
                                <div className="bg-yellow-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-300 mt-3">
                                    <strong className="font-bold">Prüfung läuft:</strong> Dein Label oder Kronkorken wird aktuell überprüft und ist vorübergehend eingeschränkt.
                                </div>
                            )
                        )}

				{/* Tabs */}
                <div className="mb-8">
                    <ResponsiveTabs
                        variant="top"
                        activeTab={activeTab}
                        onTabChange={(id) => setActiveTab(id as any)}
                        items={[
                            { id: 'input', label: 'Eingabe', icon: ScrollText },
                            { id: 'label', label: 'Label', icon: Tag, hidden: id === 'new' },
                            { id: 'caps', label: 'Kronkorken', icon: Crown, hidden: id === 'new' },
                            { id: 'optimization', label: 'Optimierung', icon: Microscope, hidden: id === 'new' },
                            { id: 'ratings', label: 'Bewertung', icon: Star, hidden: id === 'new' },
                            { id: 'settings', label: 'Einstellungen', icon: Settings, hidden: false }
                        ].filter(t => !t.hidden)}
                    />
                </div>

				<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Content Area */}
                    <main className="w-full space-y-8">
                        
                        {activeTab === 'input' && (
                            <div className="space-y-8">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold mb-1">Rezept</p>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Basisdaten bearbeiten</h2>
                                </div>
                                <div className="space-y-6 sm:bg-black sm:border sm:border-zinc-800 sm:rounded-lg sm:p-6 mb-8 sm:mb-0 border-b border-zinc-900 pb-8 sm:pb-0 sm:border-0">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                        <div className="lg:col-span-8">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs uppercase font-medium tracking-wider text-zinc-500 mb-2 block">Name</label>
                                                <button 
                                                    onClick={handleGenerateName}
                                                    disabled={generatingName || premiumStatus?.features.aiGenerationsRemaining === 0}
                                                    className="text-[10px] uppercase font-bold text-cyan-600 hover:text-cyan-400 disabled:opacity-50 flex items-center gap-1 transition mb-2"
                                                >
                                                    {generatingName ? <span className="animate-spin">⏳</span> : <span>✨</span>}
                                                    KI-Vorschlag
                                                    <AICreditBadge />
                                                </button>
                                            </div>
                                            <div className="flex items-center w-full bg-black border border-zinc-800 rounded-md transition focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/20 overflow-hidden pr-1.5">
                                                <input
                                                    value={brew.name}
                                                    onChange={(e) => handleField('name', e.target.value)}
                                                    className="flex-1 bg-transparent border-none px-3 py-2 text-white outline-none placeholder:text-zinc-700 min-w-0 font-medium"
                                                    placeholder="z.B. Galaxy IPA"
                                                />
                                            </div>
                                        </div>
                                        <div className="lg:col-span-4">
                                            <label className="text-xs uppercase font-medium tracking-wider text-zinc-500 mb-2 block">Stil</label>
                                            <input
                                                value={brew.style}
                                                onChange={(e) => handleField('style', e.target.value)}
                                                className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-700 font-medium"
                                                placeholder="z.B. Hazy IPA, Rotwein"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs uppercase font-medium tracking-wider text-zinc-500 mb-2 block">Beschreibung</label>
                                            <button 
                                                onClick={handleGenerateDescription}
                                                disabled={generatingDescription || premiumStatus?.features.aiGenerationsRemaining === 0}
                                                className="text-[10px] uppercase font-bold text-purple-600 hover:text-purple-400 disabled:opacity-50 flex items-center gap-1 transition mb-2"
                                            >
                                                {generatingDescription ? <span className="animate-spin">⏳</span> : <span>✨</span>}
                                                KI-Vorschlag
                                                <AICreditBadge />
                                            </button>
                                        </div>
                                        <div className="relative flex flex-col w-full bg-black border border-zinc-800 rounded-md transition focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/20 overflow-hidden">
                                            <textarea
                                                value={brew.description || ''}
                                                onChange={(e) => handleField('description', e.target.value)}
                                                className="w-full bg-transparent border-none px-3 py-3 text-white min-h-[120px] outline-none placeholder:text-zinc-700 resize-none flex-1 text-sm leading-relaxed"
                                                placeholder="Aromen, Malz, Hopfen, Frucht, Farbe..."
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="sm:bg-black sm:border sm:border-zinc-800 sm:rounded-lg sm:p-6 space-y-4 mb-8 sm:mb-0 border-b border-zinc-900 pb-8 sm:pb-0 sm:border-0">
                                    <label className="text-xs uppercase font-medium tracking-wider text-zinc-500 mb-3 block">Getränke-Typ</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {[
                                            { key: 'beer', label: 'Bier', icon: '🍺' },
                                            { key: 'wine', label: 'Wein', icon: '🍷' },
                                            { key: 'cider', label: 'Cider', icon: '🍎' },
                                            { key: 'mead', label: 'Met', icon: '🍯' },
                                            { key: 'softdrink', label: 'Limo', icon: '🥤' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.key}
                                                onClick={() => handleField('brew_type', opt.key)}
                                                className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-200 active:scale-95 ${
                                                    brew.brew_type === opt.key 
                                                        ? 'bg-cyan-950/20 border-cyan-800 text-cyan-400 ring-1 ring-cyan-900' 
                                                        : 'bg-black border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                                                }`}
                                            >
                                                <span className="text-3xl mb-2 filter drop-shadow-md">{opt.icon}</span>
                                                <span className="text-xs font-bold uppercase tracking-wider">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {brew.brew_type === 'beer' && (
                                    <div className="space-y-6">
                                        {/* SECTION 1: EKS & MESSWERTE */}
                                        <div className="sm:bg-black sm:border sm:border-zinc-800 sm:rounded-lg sm:p-6 mb-8 sm:mb-0 border-b border-zinc-900 pb-8 sm:pb-0 sm:border-0">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Activity className="w-4 h-4" />
                                                </div>
                                                Eckdaten & Ergebnisse
                                            </h3>
                                            
                                            {/* Gruppe 1: Definition des Rezepts (Eingaben) */}
                                            <div className="mb-8">
                                                <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
                                                    <span className="text-[10px] uppercase font-bold text-cyan-600 tracking-widest">Rezept-Vorgaben</span>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    <NumberInput label="CO₂ (g/l)" value={brew.data?.carbonation_g_l || ''} onChange={(val) => updateData('carbonation_g_l', val)} placeholder="5.0" step={0.1} />
                                                    <NumberInput label="System-SHA (%)" value={brew.data?.efficiency || ''} onChange={(val) => updateData('efficiency', val)} placeholder="75" />
                                                </div>
                                            </div>

                                            {/* Gruppe 2: Resultierende Werte (Berechnet) */}
                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-4 border-b border-zinc-800 pb-2">
                                                     <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Ergebnisse / Prognose</span>
                                                     <button 
                                                        onClick={() => setResultsEditable(!resultsEditable)}
                                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${resultsEditable ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-800' : 'text-zinc-600 hover:text-zinc-400 border border-transparent hover:border-zinc-800'}`}
                                                     >
                                                        {resultsEditable ? '✓ Fertig' : '✎ Bearbeiten'}
                                                     </button>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    <NumberInput 
                                                        label="Menge (Liter)" 
                                                        value={brew.data?.batch_size_liters || ''} 
                                                        onChange={(val) => updateData('batch_size_liters', val)} 
                                                        placeholder="20" 
                                                        step={0.5} 
                                                        isCalculated={!!brew.data?.mash_water_liters || !!brew.data?.sparge_water_liters}
                                                        calculationInfo="Berechnet aus Wassermenge & Schüttung"
                                                        onInspectorOpen={() => handleOpenInspector('BatchSize')}
                                                        readOnly={!resultsEditable}
                                                    />

                                                    <NumberInput 
                                                        label="Bittere (IBU)" 
                                                        value={brew.data?.ibu || ''} 
                                                        onChange={(val) => updateData('ibu', val)} 
                                                        placeholder="30" 
                                                        step={0.1}
                                                        isCalculated={!!brew.data?.hops?.length}
                                                        calculationInfo="Berechnet nach Tinseth-Formel (Hopfen & Kochzeit)"
                                                        onInspectorOpen={() => handleOpenInspector('IBU')}
                                                        readOnly={!resultsEditable}
                                                    />
                                                    
                                                    <NumberInput 
                                                        label="Farbe (EBC)" 
                                                        value={brew.data?.color || ''} 
                                                        onChange={(val) => updateData('color', val)} 
                                                        placeholder="10" 
                                                        previewColor={brew.data?.color ? ebcToHex(parseFloat(brew.data.color)) : undefined}
                                                        isCalculated={!!brew.data?.malts?.length}
                                                        calculationInfo="Berechnet nach Morey-Formel (Malze)"
                                                        onInspectorOpen={() => handleOpenInspector('Color')}
                                                        readOnly={!resultsEditable}
                                                    />

                                                    <NumberInput 
                                                        label="Alkohol (ABV %)" 
                                                        value={brew.data?.abv || ''} 
                                                        onChange={(val) => updateData('abv', val)} 
                                                        placeholder="5.2" 
                                                        step={0.1} 
                                                        isCalculated={!!brew.data?.og}
                                                        calculationInfo="Berechnet aus Stammwürze & Restextrakt"
                                                        onInspectorOpen={() => handleOpenInspector('ABV')}
                                                        readOnly={!resultsEditable}
                                                    />

                                                    <NumberInput 
                                                        label="Stammwürze (°P)" 
                                                        value={brew.data?.og || ''} 
                                                        onChange={(val) => updateData('og', val)} 
                                                        placeholder="12.0" 
                                                        step={0.1}
                                                        isCalculated={!!brew.data?.malts?.length}
                                                        calculationInfo="Berechnet aus Schüttung & SHA"
                                                        onInspectorOpen={() => handleOpenInspector('OG')}
                                                        readOnly={!resultsEditable}
                                                    />
                                                    
                                                    <NumberInput 
                                                        label="Restextrakt (°P)" 
                                                        value={brew.data?.fg || ''} 
                                                        onChange={(val) => updateData('fg', val)} 
                                                        placeholder="3.0" 
                                                        step={0.1}
                                                        isCalculated={!!brew.data?.og}
                                                        calculationInfo="Berechnet aus Stammwürze & Hefe-Vergärungsgrad"
                                                        onInspectorOpen={() => handleOpenInspector('FG')}
                                                        readOnly={!resultsEditable}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION 2: WASSER & MAISCHEN */}
                                        <div className="sm:bg-black sm:border sm:border-zinc-800 sm:rounded-lg sm:p-6 mb-8 sm:mb-0 border-b border-zinc-900 pb-8 sm:pb-0 sm:border-0">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Thermometer className="w-4 h-4" />
                                                </div>
                                                Wasser & Maischen
                                            </h3>
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6">
                                                    <NumberInput label="Hauptguss (L)" value={brew.data?.mash_water_liters || ''} onChange={(val) => updateData('mash_water_liters', val)} placeholder="15" step={0.5} />
                                                    <NumberInput label="Nachguss (L)" value={brew.data?.sparge_water_liters || ''} onChange={(val) => updateData('sparge_water_liters', val)} placeholder="12" step={0.5} />
                                                    <NumberInput label="Maische-pH (Ziel)" value={brew.data?.mash_ph || ''} onChange={(val) => updateData('mash_ph', val)} placeholder="5.4" step={0.1} />
                                                </div>
                                                
                                                <MaltListEditor 
                                                    value={brew.data?.malts} 
                                                    onChange={(val) => updateData('malts', val)} 
                                                />

                                                <MashStepsEditor
                                                    value={brew.data?.mash_steps}
                                                    onChange={(val) => updateData('mash_steps', val)}
                                                />
                                            </div>
                                        </div>

                                        {/* SECTION 3: KOCHEN & HOPFEN */}
                                        <div className="sm:bg-black sm:border sm:border-zinc-800 sm:rounded-lg sm:p-6 mb-8 sm:mb-0 border-b border-zinc-900 pb-8 sm:pb-0 sm:border-0">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Leaf className="w-4 h-4" />
                                                </div>
                                                Kochen & Hopfen
                                            </h3>
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6">
                                                    <NumberInput label="Kochzeit (min)" value={brew.data?.boil_time || ''} onChange={(val) => updateData('boil_time', val)} placeholder="60" />
                                                    <NumberInput label="Kochtemperatur (°C)" value={brew.data?.boil_temp || ''} onChange={(val) => updateData('boil_temp', val)} placeholder="100" />
                                                </div>
                                                
                                                <HopListEditor 
                                                    value={brew.data?.hops} 
                                                    onChange={(val) => updateData('hops', val)} 
                                                />
                                            </div>
                                        </div>
                                        {/* SECTION 4: GÄRUNG */}
                                        <div className="sm:bg-black sm:border sm:border-zinc-800 sm:rounded-lg sm:p-6 mb-8 sm:mb-0 border-b border-zinc-900 pb-8 sm:pb-0 sm:border-0">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Microscope className="w-4 h-4" />
                                                </div>
                                                Gärung
                                            </h3>
                                            <div className="space-y-8">
                                                <YeastListEditor 
                                                    value={brew.data?.yeast} 
                                                    onChange={(val) => updateData('yeast', val)} 
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <NumberInput label="Gärtemp. (°C)" value={brew.data?.primary_temp || ''} onChange={(val) => updateData('primary_temp', val)} placeholder="19" step={0.5} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Dynamic Fields based on Type */}
                                {brew.brew_type === 'wine' && (
                                    <div className="space-y-6">
                                         {/* Section: Messwerte */}
                                        <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Activity className="w-4 h-4" />
                                                </div>
                                                Zielwerte & Eckdaten
                                            </h3>
                                            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6">
                                                <NumberInput label="Menge (Liter)" value={brew.data?.batch_size_liters || ''} onChange={(val) => updateData('batch_size_liters', val)} placeholder="15" step={0.5} />
                                                <NumberInput label="Start-Dichte (Öchsle)" value={brew.data?.original_gravity || ''} onChange={(val) => updateData('original_gravity', val)} placeholder="85" />
                                                <NumberInput label="ABV (%)" value={brew.data?.abv || ''} onChange={(val) => updateData('abv', val)} placeholder="12.5" step={0.1} />
                                                <NumberInput label="Restzucker (g/l)" value={brew.data?.residual_sugar_g_l || ''} onChange={(val) => updateData('residual_sugar_g_l', val)} placeholder="6.5" step={0.1} />
                                                <NumberInput label="Säure (g/l)" value={brew.data?.acidity_g_l || ''} onChange={(val) => updateData('acidity_g_l', val)} placeholder="5.8" step={0.1} />
                                                <NumberInput label="Jahrgang" value={brew.data?.vintage || ''} onChange={(val) => updateData('vintage', val)} placeholder="2024" step={1} />
                                            </div>
                                        </div>

                                        {/* Section: Zutaten & Herkunft */}
                                        <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Grape className="w-4 h-4" />
                                                </div>
                                                Reben & Herkunft
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Rebsorte(n)</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.grapes || ''} onChange={(e) => updateData('grapes', e.target.value)} placeholder="z.B. Riesling, Merlot..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Region / Lage</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.region || ''} onChange={(e) => updateData('region', e.target.value)} placeholder="z.B. Pfalz, Mosel..." />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Section: Ausbau */}
                                        <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Wine className="w-4 h-4" />
                                                </div>
                                                Ausbau
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="md:col-span-1">
                                                    <NumberInput label="Fasslager (Monate)" value={brew.data?.oak_months || ''} onChange={(val) => updateData('oak_months', val)} placeholder="0" />
                                                </div>
                                                <div className="flex flex-col gap-4 justify-end md:col-span-2">
                                                    <Toggle label="Barrique (Holzfass)" checked={!!brew.data?.oak_aged} onChange={(val) => updateData('oak_aged', val)} />
                                                    <Toggle label="Enthält Sulfite" checked={!!brew.data?.sulfites} onChange={(val) => updateData('sulfites', val)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {brew.brew_type === 'cider' && (
                                    <div className="space-y-6">
                                         {/* Section: Messwerte */}
                                        <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Activity className="w-4 h-4" />
                                                </div>
                                                Zielwerte & Eckdaten
                                            </h3>
                                            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6">
                                                <NumberInput label="Menge (Liter)" value={brew.data?.batch_size_liters || ''} onChange={(val) => updateData('batch_size_liters', val)} placeholder="10" step={0.5} />
                                                <NumberInput label="Start-Dichte (SG)" value={brew.data?.original_gravity || ''} onChange={(val) => updateData('original_gravity', val)} placeholder="1.050" step={0.001} />
                                                <NumberInput label="ABV (%)" value={brew.data?.abv || ''} onChange={(val) => updateData('abv', val)} placeholder="6.2" step={0.1} />
                                                <NumberInput label="Kohlensäure (g/l)" value={brew.data?.carbonation_g_l || ''} onChange={(val) => updateData('carbonation_g_l', val)} placeholder="6" step={0.1} />
                                                <NumberInput label="pH-Wert" value={brew.data?.pH || ''} onChange={(val) => updateData('pH', val)} placeholder="3.5" step={0.1} />
                                            </div>
                                        </div>

                                        {/* Section: Zutaten */}
                                        <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Apple className="w-4 h-4" />
                                                </div>
                                                Zutaten
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase ml-1 mb-2 block">Apfelsorten</label>
                                                    <input className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-700" value={brew.data?.apples || ''} onChange={(e) => updateData('apples', e.target.value)} placeholder="z.B. Boskoop, Elstar..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase ml-1 mb-2 block">Hefe</label>
                                                    <input className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-700" value={brew.data?.yeast || ''} onChange={(e) => updateData('yeast', e.target.value)} placeholder="z.B. Cider Yeast" />
                                                </div>
                                            </div>
                                        </div>
                                         {/* Section: Prozess */}
                                        <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Settings className="w-4 h-4" />
                                                </div>
                                                Verarbeitung
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase ml-1 mb-2 block">Gärung</label>
                                                    <select className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none appearance-none" value={brew.data?.fermentation || ''} onChange={(e) => updateData('fermentation', e.target.value)}>
                                                        <option value="">– bitte wählen –</option>
                                                        <option value="wild">Wild (Spontan)</option>
                                                        <option value="cultured">Reinzucht (Kulturhefe)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase ml-1 mb-2 block">Süßegrad</label>
                                                    <select className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none appearance-none" value={brew.data?.sweetness || ''} onChange={(e) => updateData('sweetness', e.target.value)}>
                                                        <option value="dry">Trocken</option>
                                                        <option value="semi">Halbtrocken</option>
                                                        <option value="sweet">Süß</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {brew.brew_type === 'mead' && (
                                    <div className="space-y-6">
                                         {/* Section: Messwerte */}
                                        <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Activity className="w-4 h-4" />
                                                </div>
                                                Messwerte
                                            </h3>
                                            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6">
                                                <NumberInput label="Menge (Liter)" value={brew.data?.batch_size_liters || ''} onChange={(val) => updateData('batch_size_liters', val)} placeholder="10" step={0.5} />
                                                <NumberInput label="Start-Dichte (SG)" value={brew.data?.original_gravity || ''} onChange={(val) => updateData('original_gravity', val)} placeholder="1.100" step={0.001} />
                                                <NumberInput label="ABV (%)" value={brew.data?.abv || ''} onChange={(val) => updateData('abv', val)} placeholder="14.0" step={0.1} />
                                                <NumberInput label="Final Gravity" value={brew.data?.final_gravity || ''} onChange={(val) => updateData('final_gravity', val)} placeholder="1.010" step={0.001} />
                                                <NumberInput label="Reifezeit (Monate)" value={brew.data?.aging_months || ''} onChange={(val) => updateData('aging_months', val)} placeholder="6" />
                                            </div>
                                        </div>
                                         {/* Section: Zutaten */}
                                        <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Hexagon className="w-4 h-4" />
                                                </div>
                                                Zutaten
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase ml-1 mb-2 block">Honigsorte(n)</label>
                                                    <input className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-700" value={brew.data?.honey || ''} onChange={(e) => updateData('honey', e.target.value)} placeholder="z.B. Akazie, Waldhonig..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase ml-1 mb-2 block">Hefe</label>
                                                    <input className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-700" value={brew.data?.yeast || ''} onChange={(e) => updateData('yeast', e.target.value)} placeholder="z.B. Lalvin D-47, QA23" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase ml-1 mb-2 block">Zusätze (Früchte / Gewürze)</label>
                                                    <input className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-700" value={brew.data?.adjuncts || ''} onChange={(e) => updateData('adjuncts', e.target.value)} placeholder="z.B. Himbeeren, Zimt, Vanille..." />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase ml-1 mb-2 block">Nährstoffplan</label>
                                                    <textarea 
                                                        className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-700 min-h-[80px]" 
                                                        value={brew.data?.nutrient_schedule || ''} 
                                                        onChange={(e) => updateData('nutrient_schedule', e.target.value)} 
                                                        placeholder="z.B. TOSNA Schema: 24h, 48h, 72h und beim 1/3 Zuckerabbau..." 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {brew.brew_type === 'softdrink' && (
                                    <div className="space-y-6">
                                         {/* Section: Messwerte */}
                                        <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Activity className="w-4 h-4" />
                                                </div>
                                                Messwerte
                                            </h3>
                                            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6">
                                                <NumberInput label="Menge (Liter)" value={brew.data?.batch_size_liters || ''} onChange={(val) => updateData('batch_size_liters', val)} placeholder="10" step={0.5} />
                                                <NumberInput label="Zucker (g/l)" value={brew.data?.sugar_g_l || ''} onChange={(val) => updateData('sugar_g_l', val)} placeholder="40" step={1} />
                                                <NumberInput label="Säure (pH)" value={brew.data?.acidity_ph || ''} onChange={(val) => updateData('acidity_ph', val)} placeholder="3.2" step={0.1} />
                                                <NumberInput label="Kohlensäure (g/l)" value={brew.data?.carbonation_g_l || ''} onChange={(val) => updateData('carbonation_g_l', val)} placeholder="5" step={0.1} />
                                            </div>
                                        </div>
                                         {/* Section: Zutaten */}
                                        <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                    <Citrus className="w-4 h-4" />
                                                </div>
                                                Inhalt
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase ml-1 mb-2 block">Basis / Geschmack</label>
                                                    <input className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-700" value={brew.data?.base || ''} onChange={(e) => updateData('base', e.target.value)} placeholder="z.B. Zitrone-Ingwer, Cola..." />
                                                </div>
                                                <div className="flex flex-col gap-4">
                                                    <Toggle label="Natürliche Aromen" checked={!!brew.data?.natural_flavors} onChange={(val) => updateData('natural_flavors', val)} />
                                                    <Toggle label="Farbstoff verwendet" checked={!!brew.data?.coloring} onChange={(val) => updateData('coloring', val)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                

                                <div className="space-y-6">
                                    <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                        <RecipeStepsEditor 
                                            value={brew.data?.steps} 
                                            onChange={(val) => updateData('steps', val)} 
                                        />
                                    </div>
                                    
                                    <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-700">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            Sonstiges
                                        </h3>
                                    <div>
                                        <label className="text-xs font-medium tracking-wider text-zinc-500 uppercase ml-1 mb-2 block">Notizen / Details</label>
                                        <textarea 
                                            className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-700 min-h-[120px]" 
                                            value={brew.data?.notes || ''} 
                                            onChange={(e) => updateData('notes', e.target.value)} 
                                            placeholder="Hier ist Platz für alles Weitere: Wasserprofil, Maischestruktur, pH-Wert Anpassungen, Pannen, Verkostungsnotizen..." 
                                        />
                                    </div>
                                </div>
                            </div>
                            </div>
                        )}

                        {activeTab === 'optimization' && (
                             <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-blue-500 font-medium mb-1">KI-Assistent</p>
                                        <h2 className="text-lg font-bold text-white">Rezept-Optimierung</h2>
                                    </div>
                                    <button
                                        onClick={handleOptimizeRecipe}
                                        disabled={analyzingRecipe || !brew.name || !brew.style || premiumStatus?.features.aiGenerationsRemaining === 0}
                                        className="bg-blue-900/50 hover:bg-blue-900 border border-blue-900 text-blue-100 font-medium px-4 py-2 rounded-md transition disabled:opacity-50 text-sm flex items-center gap-2"
                                    >
                                        {analyzingRecipe ? '🔍 Analysiere...' : '🔬 Rezept analysieren'}
                                        <AICreditBadge />
                                    </button>
                                </div>

                                <p className="text-sm text-zinc-500">
                                    Lass die KI dein Rezept analysieren und erhalte Verbesserungsvorschläge für Balance, Stil-Konformität und Zutaten.
                                </p>

                                {optimizationSuggestions.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-xs uppercase tracking-[0.2em] text-blue-400 font-bold">Vorschläge</p>
                                        {optimizationSuggestions.map((suggestion, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-black border border-zinc-800 hover:border-blue-900 cursor-default transition-colors rounded-lg p-4 flex gap-3"
                                            >
                                                <span className="text-blue-500 text-xl flex-shrink-0">💡</span>
                                                <p className="text-sm text-zinc-300 leading-relaxed">{suggestion}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {optimizationSuggestions.length === 0 && !analyzingRecipe && (
                                    <div className="bg-black border border-zinc-800 rounded-lg p-6 text-center">
                                        <div className="text-4xl mb-3 opacity-50">🔬</div>
                                        <p className="text-sm text-zinc-500">Noch keine Analyse durchgeführt</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'label' && (
                            <div className="space-y-6">
                                {/* Moderation Banner */}
                                {brew.moderation_status === 'rejected' && (
                                    <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-4 flex gap-4 items-start">
                                        <div className="text-2xl mt-1">⚠️</div>
                                        <div>
                                            <h3 className="text-red-500 font-bold text-sm uppercase tracking-wider mb-1">Bild wurde abgelehnt</h3>
                                            <p className="text-zinc-300 text-sm">{brew.moderation_rejection_reason || 'Verstoß gegen die Richtlinien'}</p>
                                        </div>
                                    </div>
                                )}
                                {/* Pending banner removed here because a global moderation banner is shown across the editor */}

                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-purple-600 font-medium mb-1">Label Design</p>
                                        <h2 className="text-lg font-bold text-white">Vorschau & Generator</h2>
                                    </div>
                                    {brew.id && (
                                        <Link 
                                            href={`/brew/${brew.id}`} 
                                            target="_blank"
                                            className="h-9 w-9 sm:w-auto sm:px-3 flex items-center justify-center gap-2 bg-black border border-zinc-800 rounded-md hover:bg-zinc-900 hover:text-white text-zinc-400 transition disabled:opacity-50"
                                            title="Öffentlich ansehen"
                                        >
                                            <span>🌍</span>
                                            <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider">Ansehen</span>
                                        </Link>
                                    )}
                                </div>

                                <div className="aspect-square bg-black border border-zinc-800 rounded-lg overflow-hidden flex items-center justify-center max-w-sm mx-auto p-1">
                                    {brew.image_url ? (
                                        <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover rounded" />
                                    ) : (
                                        <div className="text-center text-zinc-600">
                                            <div className="text-4xl mb-2">🏷️</div>
                                            <p className="text-sm font-medium uppercase tracking-wider">Noch kein Label generiert</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 bg-black border border-zinc-800 rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs uppercase font-medium tracking-wider text-purple-500">Zusatz-Prompt (optional)</label>
                                        <button 
                                            onClick={handleGenerateLabelPrompt}
                                            disabled={generatingLabelPrompt || !brew.name || premiumStatus?.features.aiGenerationsRemaining === 0}
                                            className="text-[10px] uppercase font-bold text-purple-600 hover:text-purple-400 disabled:opacity-50 flex items-center gap-1 transition"
                                        >
                                            {generatingLabelPrompt ? <span className="animate-spin">⏳</span> : <span>✨</span>}
                                            KI-Vorschlag
                                            <AICreditBadge />
                                        </button>
                                    </div>
                                    <textarea
                                        value={extraPrompt}
                                        onChange={(e) => setExtraPrompt(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-white min-h-[80px] focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition"
                                        placeholder="z.B. Illustrativer Retro-Stil, satten Farben, florale Ornamente"
                                    />
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <button
                                            onClick={handleGenerate}
                                            disabled={generating || uploading || premiumStatus?.features.aiGenerationsRemaining === 0}
                                            className="flex-1 bg-gradient-to-r from-purple-900 to-pink-900 text-white border border-purple-500/30 font-medium tracking-wide px-6 py-3 rounded-md hover:shadow-lg hover:shadow-purple-900/20 transition disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
                                        >
                                            {generating ? (
                                                <>
                                                    <span className="animate-spin">⏳</span>
                                                    <span>Wird generiert...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>✨</span>
                                                    <span>KI-Label generieren</span>
                                                    <AICreditBadge />
                                                </>
                                            )}
                                        </button>
                                        <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
                                            <button
                                                onClick={() => {
                                                    setLegalModalType('label');
                                                    setLegalModalOpen(true);
                                                }}
                                                disabled={uploading || generating}
                                                className="px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md text-sm font-medium hover:bg-zinc-800 hover:text-white transition disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px] whitespace-nowrap"
                                            >
                                                {uploading ? 'Upload...' : '📂 Upload'}
                                            </button>
                                            <button
                                                onClick={() => setBrew(prev => ({ ...prev, image_url: '/default_label/default.png' }))}
                                                disabled={uploading || generating || !brew.image_url || brew.image_url === '/default_label/default.png'}
                                                className="px-4 py-3 bg-black border border-zinc-800 rounded-md text-sm text-zinc-500 hover:text-red-400 hover:border-red-900/50 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                                                title="Label entfernen"
                                            >
                                                🗑️ <span className="sm:hidden lg:inline">Reset</span>
                                            </button>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'caps' && (
                             <div className="space-y-6 text-center text-white">
                                <div className="space-y-8 relative overflow-hidden">
                                     {/* Header Info */}
                                    <div className="text-left">
                                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-500 font-medium mb-1">Digitale Abzeichen</p>
                                        <h2 className="text-lg font-bold text-white">Kronkorken-Designer</h2>
                                        <p className="text-zinc-500 text-sm mt-1 max-w-md leading-relaxed">
                                            Wähle ein Symbol für dein digitales Sammlerstück. Dieses Abzeichen wird an User vergeben, die deine Flaschen scannen.
                                        </p>
                                    </div>

                                    <div className="flex justify-center py-6 bg-black rounded-lg border border-zinc-800">
                                        <CrownCap 
                                            content={brew.cap_url} 
                                            tier="gold" 
                                            size="lg"
                                            className="hover:scale-105 transition-transform duration-500 cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-8 relative z-10 text-left">
                                                                <div>
                                                                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-4">Farbe</p>
                                                                    <div className="flex items-center gap-4 p-2 -ml-2">
                                                                        <div className="w-12 h-12 rounded-full border border-zinc-800" style={{ background: brew.cap_url || '#111827' }} />
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-bold text-white">Automatisch zugewiesen</span>
                                                                            <button
                                                                                onClick={() => setBrew(prev => ({ ...prev, cap_url: pickRandomCapColor() }))}
                                                                                className="text-xs mt-1 px-3 py-1 rounded-md bg-black border border-zinc-800 text-zinc-300 hover:text-white transition"
                                                                            >Neue Farbe</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <button 
                                                className="w-full bg-gradient-to-r from-purple-900 to-pink-900 border border-purple-500/30 text-white font-medium px-6 py-4 rounded-lg hover:shadow-lg hover:shadow-purple-900/20 transition disabled:opacity-60 flex items-center justify-center gap-3 min-h-[60px]"
                                                onClick={handleGenerateCap}
                                                disabled={generatingCap || uploadingCap || premiumStatus?.features.aiGenerationsRemaining === 0}
                                            >
                                                {generatingCap ? (
                                                    <>
                                                        <span className="animate-spin text-xl">🧪</span>
                                                        <span className="uppercase text-xs font-black tracking-widest">Generiere...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-xl">✨</span>
                                                        <span className="text-xs font-black uppercase tracking-wider">mit KI generieren</span>
                                                        <AICreditBadge />
                                                    </>
                                                )}
                                            </button>
                                            
                                            <button 
                                                className="bg-black border border-zinc-800 hover:border-zinc-700 p-4 rounded-lg transition-all group flex items-center justify-center gap-3 text-zinc-400 hover:text-white disabled:opacity-50"
                                                onClick={() => {
                                                    setLegalModalType('cap');
                                                    setLegalModalOpen(true);
                                                }}
                                                disabled={generatingCap || uploadingCap}
                                            >
                                                {uploadingCap ? (
                                                    <span className="animate-spin text-xl">⏳</span>
                                                ) : (
                                                    <>
                                                        <span className="text-xl">📂</span>
                                                        <span className="text-xs font-bold uppercase tracking-wider text-inherit">Eigener Icon-Upload</span>
                                                    </>
                                                )}
                                            </button>
                                            <input
                                                ref={fileInputCapRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleCapUpload}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ratings' && (
                             <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-green-500 font-medium mb-1">Bewertungen</p>
                                        <h2 className="text-lg font-bold text-white">Verwalten & Moderieren</h2>
                                    </div>
                                    <button
                                        onClick={() => loadRatings(brew.id!)}
                                        disabled={ratingsLoading}
                                        className="h-9 w-9 sm:w-auto sm:px-3 flex items-center justify-center gap-2 bg-black border border-zinc-800 rounded-md hover:bg-zinc-900 hover:text-white text-zinc-400 transition disabled:opacity-50"
                                        title="Bewertungen aktualisieren"
                                    >
                                        <span className={`text-lg ${ratingsLoading ? 'animate-spin' : ''}`}>🔄</span>
                                        <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider">Aktualisieren</span>
                                    </button>
                                </div>

                                {ratingsMessage && (
                                    <div className="bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-200">
                                        {ratingsMessage}
                                    </div>
                                )}

                                {ratingsLoading ? (
                                    <div className="text-zinc-500 text-sm">Lade Bewertungen…</div>
                                ) : ratings.length === 0 ? (
                                    <div className="text-zinc-500 text-sm">Noch keine Bewertungen vorhanden.</div>
                                ) : (
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                        {ratings.map((r) => (
                                            <div key={r.id} className="bg-black border border-zinc-800 rounded-lg p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-900 to-blue-900 border border-zinc-700 flex items-center justify-center text-white font-bold text-sm">
                                                            {((r.author_name || r.name || 'A') as string)[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white text-sm">{r.author_name || r.name || 'Anonym'}</p>
                                                            <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">
                                                                {new Date(r.created_at).toLocaleDateString('de-DE')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex text-yellow-600">
                                                            {[1,2,3,4,5].map(s => (
                                                                <span key={s} className={r.rating >= s ? 'opacity-100' : 'opacity-30'}>★</span>
                                                            ))}
                                                        </div>
                                                        <span className="text-sm font-bold text-white">{r.rating}</span>
                                                    </div>
                                                </div>

                                                {r.comment && (
                                                    <p className="text-zinc-400 text-sm leading-relaxed mt-3">{r.comment}</p>
                                                )}

                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 gap-4 pt-4 border-t border-zinc-900">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            r.moderation_status === 'auto_approved' || r.moderation_status === 'approved' 
                                                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                                                                : r.moderation_status === 'rejected'
                                                                ? 'bg-red-500'
                                                                : 'bg-amber-500 animate-pulse'
                                                        }`} />
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                                                            {r.moderation_status || 'pending'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 sm:flex items-stretch gap-2 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => moderateRating(r.id, 'approved')}
                                                            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${
                                                                r.moderation_status === 'approved' || r.moderation_status === 'auto_approved'
                                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                                                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-400'
                                                            }`}
                                                        >
                                                            <span className="text-sm">✓</span>
                                                            <span>Freigeben</span>
                                                        </button>
                                                        <button
                                                            onClick={() => moderateRating(r.id, 'rejected')}
                                                            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${
                                                                r.moderation_status === 'rejected'
                                                                    ? 'bg-zinc-900 text-red-500 border-red-900/50'
                                                                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-red-500/50 hover:text-red-400'
                                                            }`}
                                                        >
                                                            <span className="text-sm">✕</span>
                                                            <span>Ablehnen</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if(confirm('Möchtest du diese Bewertung wirklich permanent löschen?')) removeRating(r.id);
                                                            }}
                                                            className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-2 bg-zinc-900 text-zinc-600 border border-zinc-800 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-red-950/20 hover:text-red-500 hover:border-red-900/50 transition-all duration-300"
                                                        >
                                                            <span className="text-sm">🗑️</span>
                                                            <span>Löschen</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-medium mb-1">Konfiguration</p>
                                    <h2 className="text-lg font-bold text-white">Einstellungen & Aktionen</h2>
                                </div>

                                <div className="bg-black border border-zinc-800 rounded-lg p-6">
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-sm border border-zinc-700">👁️</div>
                                        Sichtbarkeit
                                    </h3>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-zinc-900/20 border border-zinc-800 rounded-lg p-4">
                                         <div className="flex-1">
                                             <div className="text-sm font-bold text-white mb-0.5">{brew.is_public ? 'Status: Öffentlich' : 'Status: Privat'}</div>
                                             <div className="text-xs text-zinc-500">Öffentliche Rezepte sind für alle Nutzer & Brauereien sichtbar.</div>
                                         </div>
                                         <div className="w-full sm:w-auto">
                                             <Toggle label="Öffentlich" checked={brew.is_public} onChange={(val) => setBrew(prev => ({ ...prev, is_public: val }))} />
                                         </div>
                                    </div>
                                </div>

                                {brew.id && (
                                    <div className="bg-red-950/10 border border-red-900/20 rounded-2xl p-6">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-red-500 flex items-center gap-2">
                                                    <span>🗑️</span> Rezept löschen
                                                </h3>
                                                <p className="text-sm text-zinc-400 mt-1">
                                                    Diese Aktion kann nicht rückgängig gemacht werden. Alle verknüpften Flaschen werden zurückgesetzt.
                                                    Label-Bilder und Kronkorken werden ebenfalls vom Server gelöscht.
                                                </p>
                                            </div>
                                             <button 
                                                onClick={deleteBrew}
                                                disabled={saving}
                                                className="px-6 py-3 bg-red-950/30 border border-red-900/50 hover:bg-red-900/30 text-red-500 rounded-xl text-sm font-bold transition flex items-center gap-2 whitespace-nowrap w-full md:w-auto justify-center"
                                            >
                                                <span>🗑️</span>
                                                <span>Rezept unwiderruflich löschen</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
				</div>

                <FormulaInspector 
                    isOpen={inspectorOpen}
                    onClose={() => setInspectorOpen(false)}
                    type={inspectorType}
                    data={{
                        batchSize: parseFloat(brew.data?.batch_size_liters) || 0,
                        ogPlato: parseFloat(brew.data?.og) || 0,
                        fgPlato: parseFloat(brew.data?.fg) || 0,
                        efficiency: parseFloat(brew.data?.efficiency) || 75,
                        mashWater: parseFloat(brew.data?.mash_water_liters) || 0,
                        spargeWater: parseFloat(brew.data?.sparge_water_liters) || 0,
                        hops: brew.data?.hops || [],
                        malts: brew.data?.malts || []
                    }}
                />

                <LegalConsentModal 
                    isOpen={legalModalOpen}
                    type={legalModalType}
                    onClose={() => setLegalModalOpen(false)}
                    onConfirm={() => {
                        setLegalModalOpen(false);
                        if (legalModalType === 'label') {
                             fileInputRef.current?.click();
                        } else if (legalModalType === 'cap') {
                             fileInputCapRef.current?.click();
                        }
                    }}
                />

                 {/* Sticky Action Bar for Mobile */}
                <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-4 md:hidden z-50 flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/team/${breweryId}/brews`)}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                    >
                        ❌
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition disabled:opacity-60"
                    >
                        {saving ? 'Speichere...' : 'Speichern'}
                    </button>
                </div>
			</div>
		</div>
	);
}
