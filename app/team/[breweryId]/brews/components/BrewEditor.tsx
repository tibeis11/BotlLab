'use client';

import { useEffect, useState, useRef, useMemo, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChartBar, Thermometer, Leaf, FlaskConical, FileText, Grape, Wine, Apple, Settings, Hexagon, Citrus, Activity, Gauge, Droplets, Sprout, ScrollText, Tag, Crown, Microscope, Star, RefreshCw, AlertTriangle, Globe, Loader2, Sparkles, Upload, Trash2, Lightbulb, Search, Check, X, Eye, Pencil, ShieldCheck } from 'lucide-react';
import ResponsiveTabs from '@/app/components/ResponsiveTabs';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { getBreweryTierConfig } from '@/lib/tier-system';
import { checkAndGrantAchievements } from '@/lib/achievements';
import { useAchievementNotification } from '@/app/context/AchievementNotificationContext';
import { useAuth } from '@/app/context/AuthContext';
import { addToFeed } from '@/lib/feed-service';
import CrownCap from '@/app/components/CrownCap';
import { BotlGuideBadge, BotlGuidePersonaPill } from '@/app/components/BotlGuideBadge';
import { inferFermentationType, inferMashMethod } from '@/lib/brew-type-lookup';
import CustomSelect from '@/app/components/CustomSelect';
import { IngredientListEditor } from './IngredientListEditor';
import { MaltListEditor } from './MaltListEditor';
import { HopListEditor } from './HopListEditor';
import { YeastListEditor } from './YeastListEditor';
import { MashStepsEditor } from './MashStepsEditor';
import { RecipeStepsEditor } from './RecipeStepsEditor';
import { calculateColorEBC, calculateIBU, calculateWaterProfile, calculateOG, calculateABV, calculateFG, ebcToHex, calculateBatchSizeFromWater, safeFloat, calculateTotalGrain, calculateDecoctionEvaporation } from '@/lib/brewing-calculations';
import { FormulaInspector } from '@/app/components/FormulaInspector';
import { SubscriptionTier, type PremiumStatus } from '@/lib/premium-config';
import { type EquipmentProfile, profileToConfig, BREW_METHOD_LABELS } from '@/lib/types/equipment';
import { getPremiumStatus } from '@/lib/actions/premium-actions';
import { createBrew, updateBrew } from '@/lib/actions/brew-actions';
import { notifyNewBrew } from '@/lib/actions/notification-actions';
import LegalConsentModal from '@/app/components/LegalConsentModal';
import { trackEvent } from '@/lib/actions/analytics-actions'; // This will need to be safe for client side usage or moved to API call wrapper
import FlavorProfileEditor from './FlavorProfileEditor';
import type { FlavorProfile } from '@/lib/flavor-profile-config';
import ReactMarkdown from 'react-markdown';
import { mergeRecipeIngredientsIntoData, extractAndSaveRecipeIngredients } from '@/lib/ingredients/ingredient-adapter';

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

export interface BrewForm {
    id?: string;
    name: string;
    style: string;
    brew_type: string;
    description?: string;
    image_url?: string | null;
    cap_url?: string | null;
    is_public: boolean;
    data?: any;
    flavor_profile?: FlavorProfile | null;
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
    // Parse value robustly for internal math (buttons)
    const val = safeFloat(value);

    const update = (newVal: number) => {
        if (readOnly) return;
        if (newVal < min) newVal = min;
        const precision = step.toString().split('.')[1]?.length || 0;
        // Always use dot for standardized storage, but input field below shows what is passed
        onChange(newVal.toFixed(precision));
    };
    
    // Handle manual input change to allow typing commas
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return;
        let inputVal = e.target.value;
        // Allow comma, but maybe don't replace it instantly to avoid cursor jumps?
        // Actually, for storage we usually want dot. But for UX we want to see comma.
        // If we replace on the fly, it's fine.
        inputVal = inputVal.replace(',', '.');
        onChange(inputVal);
    }

    return (
        <div className="w-full relative group">
            {label && (
                <label className="text-xs font-bold text-text-muted uppercase ml-1 mb-2 flex items-end gap-2 h-8 leading-tight">
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
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${onInspectorOpen ? 'bg-rating/10 border-rating/50 text-rating' : 'bg-surface-hover border-border text-text-muted'}`}>
                                {onInspectorOpen ? 'i' : 'ƒ'}
                            </div>
                            {calculationInfo && (
                                <div className="absolute bottom-full mb-2 right-0 w-48 max-w-[calc(100vw-2rem)] bg-surface border border-border p-2 rounded-lg text-[10px] text-text-secondary pointer-events-none opacity-0 group-hover/info:opacity-100 transition-opacity z-50 shadow-xl">
                                    {calculationInfo}
                                    <div className="absolute -bottom-1 right-2 w-2 h-2 bg-surface border-r border-b border-border rotate-45"></div>
                                </div>
                            )}
                        </div>
                    )}
                </label>
            )}
            <div className={`flex items-center w-full border ${readOnly ? 'border-border bg-surface' : 'border-border bg-surface'} rounded-xl transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 overflow-hidden relative`}>
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
                        className={`w-12 h-12 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition active:scale-90 flex-shrink-0 z-10 ${previewColor ? 'pl-2' : ''}`}
                        type="button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
                <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    readOnly={readOnly}
                    tabIndex={readOnly ? -1 : 0}
                    className={`flex-1 bg-transparent border-none text-center font-bold outline-none placeholder:font-normal placeholder:text-text-disabled appearance-none min-w-0 relative z-10 ${readOnly ? 'text-text-primary text-lg h-12 pointer-events-none select-none' : 'text-text-primary text-lg h-12 focus:ring-0'}`}
                    value={value || ''}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                />
                {!readOnly && (
                    <button
                        onClick={() => update(val + step)}
                        className="w-12 h-12 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition active:scale-90 flex-shrink-0 z-10"
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
            className="flex items-center justify-between gap-4 bg-surface border border-border rounded-xl px-4 py-3 cursor-pointer hover:bg-surface-hover hover:border-border-hover transition-all duration-200 group select-none outline-none w-full"
            type="button"
        >
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${checked ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary'}`}>
                {label}
            </span>

            <div className={`relative w-11 h-6 rounded-full transition-all duration-300 ease-in-out p-1 ${checked
                    ? 'bg-brand/10 border-brand/30 shadow-[0_0_10px_var(--color-brand,rgba(6,182,212,0.1))]'
                    : 'bg-background border-border shadow-inner'
                } border flex-shrink-0`}>
                <div className={`h-full aspect-square rounded-full transition-all duration-300 shadow-sm flex items-center justify-center ${checked
                        ? 'translate-x-5 bg-brand shadow-[0_0_8px_var(--color-brand,rgba(6,182,212,0.6))]'
                        : 'translate-x-0 bg-text-disabled'
                    }`} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.25, 0.64, 1)' }}>
                    <div className={`w-0.5 h-1.5 rounded-full transition-colors ${checked ? 'bg-white/50' : 'bg-border'}`} />
                </div>
            </div>
        </button>
    );
}



// Palette of pleasant default center colors (hex). A random one is assigned by default.
const CAP_COLOR_PALETTE = ['#F97316', '#FB7185', '#EF4444', '#F59E0B', '#FDE047', '#34D399', '#10B981', '#06B6D4', '#3B82F6', '#60A5FA', '#7C3AED', '#A78BFA', '#F472B6', '#FCA5A5', '#FCD34D', '#FDBA74'];

function pickRandomCapColor() {
    return CAP_COLOR_PALETTE[Math.floor(Math.random() * CAP_COLOR_PALETTE.length)];
}

const COLOR_PALETTES: { id: string; label: string; dot: string; prompt: string }[] = [
    { id: 'warm_earth',  label: 'Warme Erde',      dot: '#A0522D', prompt: 'warm earthy tones: terracotta, burnt sienna, warm beige, deep brown' },
    { id: 'noir',        label: 'Noir / Dunkel',   dot: '#1a1a2e', prompt: 'dark noir palette: deep black, charcoal, midnight blue, muted gold accents' },
    { id: 'pastel',      label: 'Pastell',         dot: '#f9c6d0', prompt: 'soft pastel palette: blush pink, lavender, mint green, pale yellow, cream' },
    { id: 'vivid',       label: 'Knallig / Bunt',  dot: '#FF3E00', prompt: 'vibrant vivid palette: electric red, royal blue, neon yellow, bold orange' },
    { id: 'forest',      label: 'Wald / Natur',    dot: '#2d6a4f', prompt: 'deep nature palette: forest green, moss, pine, rich soil brown, stone grey' },
    { id: 'ocean',       label: 'Ozean',           dot: '#0077b6', prompt: 'ocean palette: deep navy, turquoise, seafoam, sandy beige, coral accents' },
    { id: 'gold_black',  label: 'Gold & Schwarz',  dot: '#FFD700', prompt: 'luxurious black and gold palette: matte black, polished gold, dark bronze' },
    { id: 'monochrome',  label: 'Monochrom',       dot: '#888888', prompt: 'strict monochrome palette: black, white and shades of grey only' },
    { id: 'autumn',      label: 'Herbst',          dot: '#D2691E', prompt: 'autumn harvest palette: pumpkin orange, maple red, golden yellow, dark bark brown' },
    { id: 'nordic_cold', label: 'Nordisch Kalt',   dot: '#b8d8e8', prompt: 'cold nordic palette: icy blue, snow white, steel grey, pale birch' },
];

const LABEL_STYLES: { id: string; label: string; prompt: string }[] = [
    { id: 'vintage',      label: 'Vintage / Retro',    prompt: 'vintage retro illustration style' },
    { id: 'art_deco',     label: 'Art Deco',            prompt: 'art deco style with geometric elegance and ornamental details' },
    { id: 'minimalist',   label: 'Minimalistisch',      prompt: 'clean minimalist modern design with a limited color palette' },
    { id: 'illustrative', label: 'Illustrativ',         prompt: 'detailed hand-drawn illustration style' },
    { id: 'watercolor',   label: 'Aquarell',            prompt: 'soft expressive watercolor painting style' },
    { id: 'geometric',    label: 'Geometrisch',         prompt: 'bold geometric shapes and abstract patterns' },
    { id: 'psychedelic',  label: 'Psychedelisch',       prompt: 'psychedelic swirling colorful surreal style' },
    { id: 'botanical',    label: 'Botanisch',           prompt: 'intricate botanical nature illustration style' },
    { id: 'comic',        label: 'Comic',               prompt: 'bold comic book style with strong outlines and vibrant flat colors' },
    { id: 'pixel',        label: 'Pixel Art',           prompt: 'retro pixel art style with crisp pixels and limited color palette' },
    { id: 'woodcut',      label: 'Holzschnitt',         prompt: 'traditional woodcut printmaking style with bold lines and hatching' },
    { id: 'japanese',     label: 'Japanisch',           prompt: 'japanese ukiyo-e woodblock print style with flat areas of color and fine outlines' },
    { id: 'oil_painting', label: 'Ölgemälde',           prompt: 'rich classical oil painting style with visible brushstrokes and dramatic lighting' },
    { id: 'grunge',       label: 'Grunge',              prompt: 'grungy distressed texture style with rough edges and dark industrial feel' },
    { id: 'stained_glass',label: 'Glasmalerei',         prompt: 'stained glass window style with bold black outlines and vibrant translucent color fields' },
    { id: 'nordic',       label: 'Nordisch',            prompt: 'nordic folk art style with ornamental knotwork and muted natural tones' },
    { id: 'surreal',      label: 'Surreal',             prompt: 'surrealist dreamlike imagery with unexpected juxtapositions and painterly detail' },
    { id: 'flat_design',  label: 'Flat Design',         prompt: 'modern flat design with simple shapes and a clean two-tone color scheme' },
];

export default function BrewEditor({ breweryId, brewId, initialData }: { breweryId: string, brewId?: string, initialData?: Partial<BrewForm> }) {
    const supabase = useSupabase();
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
    // Tracks which result fields the user has manually overridden (prevents auto-calc from clobbering them)
    const manualOverrides = useRef<Set<string>>(new Set());
    const [analyzingRecipe, setAnalyzingRecipe] = useState(false);
    const [optimizationSuggestions, setOptimizationSuggestions] = useState<string[]>([]);
    // Stage 2 AI state
    const [suggestingHops, setSuggestingHops] = useState(false);
    const [hopSuggestions, setHopSuggestions] = useState<string | null>(null);
    const [loadingPairing, setLoadingPairing] = useState(false);
    const [pairingResult, setPairingResult] = useState<{ pairings: Array<{ food: string; why: string; emoji: string }>; intro: string } | null>(null);
    const [generatingSocial, setGeneratingSocial] = useState(false);
    const [socialResult, setSocialResult] = useState<{ instagram: string; facebook: string } | null>(null);
    // Stage 3: BJCP check (RAG)
    const [checkingBjcp, setCheckingBjcp] = useState(false);
    type BjcpParamCheck = { param: string; value: string; range: string; status: 'ok' | 'low' | 'high' | 'missing' };
    type BjcpResult = {
        bjcpStyle: { code: string; name: string; nameDe: string };
        conformityScore: number;
        parameterChecks: BjcpParamCheck[];
        strengths: string[];
        deviations: string[];
        improvements: string[];
        verdict: string;
    };
    const [bjcpResult, setBjcpResult] = useState<BjcpResult | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'input' | 'label' | 'caps' | 'optimization' | 'ratings' | 'flavor' | 'settings'>('input');
    const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
    const [extraPrompt, setExtraPrompt] = useState('');
    const [labelStyle, setLabelStyle] = useState<string | null>(null);
    const [labelColorPalette, setLabelColorPalette] = useState<string | null>(null);
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

    // Lade Equipment-Profile der Brewery
    useEffect(() => {
        if (!breweryId) return;
        (supabase as any)
            .from('equipment_profiles')
            .select('*')
            .eq('brewery_id', breweryId)
            .order('is_default', { ascending: false })
            .then(({ data }: { data: EquipmentProfile[] | null }) => {
                if (!data) return;
                setEquipmentProfiles(data);
                // Neues Rezept: Default-Profil automatisch vorladen
                if (id === 'new') {
                    const def = data.find(p => p.is_default) ?? data[0];
                    if (def) {
                        const cfg = profileToConfig(def);
                        setBrew(prev => ({
                            ...prev,
                            data: {
                                ...(prev.data || {}),
                                boil_off_rate:     cfg.boilOffRate,
                                trub_loss:         cfg.trubLoss,
                                grain_absorption:  cfg.grainAbsorption,
                                cooling_shrinkage: cfg.coolingShrinkage,
                                mash_thickness:    cfg.mashThickness,
                                efficiency:        def.default_efficiency ?? 75,
                            },
                        }));
                        setLoadedFromProfile(def.name);
                    }
                }
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [breweryId]);

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
    const [showWaterProfile, setShowWaterProfile] = useState(false);
    const [equipmentProfiles, setEquipmentProfiles] = useState<EquipmentProfile[]>([]);
    const [loadedFromProfile, setLoadedFromProfile] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileInputCapRef = useRef<HTMLInputElement>(null);
    const [brew, setBrew] = useState<BrewForm>(() => {
        if (initialData) {
            return {
                name: initialData.name || '',
                style: initialData.style || '',
                brew_type: initialData.brew_type || 'beer',
                description: initialData.description || '',
                image_url: initialData.image_url || '/default_label/default.png',
                cap_url: initialData.cap_url || null,
                is_public: initialData.is_public ?? true,
                moderation_status: initialData.moderation_status || 'pending',
                moderation_rejection_reason: initialData.moderation_rejection_reason || null,
                data: {
                    ...initialData.data,
                    batch_size_liters: initialData.data?.batch_size_liters || '',
                    og: initialData.data?.og || '',
                    fg: initialData.data?.fg || '',
                    abv: initialData.data?.abv || '',
                    ibu: initialData.data?.ibu || '',
                    color: initialData.data?.color || '',
                    efficiency: initialData.data?.efficiency || '',
                    carbonation_g_l: initialData.data?.carbonation_g_l || '',
                    mash_water_liters: initialData.data?.mash_water_liters || '',
                    sparge_water_liters: initialData.data?.sparge_water_liters || '',
                    mash_ph: initialData.data?.mash_ph || '',
                    boil_time: initialData.data?.boil_time || '',
                    boil_temp: initialData.data?.boil_temp || '',
                    yeast: initialData.data?.yeast || [],
                    attenuation: initialData.data?.attenuation || '',
                    primary_temp: initialData.data?.primary_temp || '',
                    malts: initialData.data?.malts || [],
                    hops: initialData.data?.hops || [],
                    mash_steps: initialData.data?.mash_steps || []
                }
            };
        }
        
        return {
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
        };
    });

    function updateData(key: string, value: any) {
        setBrew(prev => ({ ...prev, data: { ...(prev.data || {}), [key]: value } }));
    }

    // --- Smart Suggestions: Braumethode, Maischverfahren, Gärungstyp ---
    // Tracks which suggestions the user has explicitly dismissed
    const [ignoredSuggestions, setIgnoredSuggestions] = useState<Set<string>>(new Set());
    const ignoreSuggestion = (key: string) =>
        setIgnoredSuggestions(prev => new Set([...prev, key]));

    const FERMENTATION_LABELS: Record<string, string> = {
        top: 'Obergärig (Ale)', bottom: 'Untergärig (Lager)',
        spontaneous: 'Spontangärung', mixed: 'Gemischt',
    };

    // Tracks which mash fields were auto-derived (vs manually chosen by user)
    const autoSetFields = useRef<Set<string>>(new Set());

    // Auto-apply mash_method via lookup (Maischeschritte + Extrakt-Zutaten)
    useEffect(() => {
        const isUserSet = brew.data?.mash_method && !autoSetFields.current.has('mash_method');
        if (isUserSet) return;
        const suggested = inferMashMethod(
            brew.data?.mash_steps ?? [],
            brew.data?.malts ?? [],
        );
        if (brew.data?.mash_method === suggested) return;
        autoSetFields.current.add('mash_method');
        updateData('mash_method', suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brew.data?.mash_steps, brew.data?.malts]);

    // Maischverfahren leeren, wenn Braumethode auf Extrakt geändert wird
    useEffect(() => {
        if (brew.data?.mash_method === 'extract') {
            if (brew.data?.mash_process) {
                autoSetFields.current.add('mash_process');
                updateData('mash_process', null);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brew.data?.mash_method]);

    // Auto-apply fermentation_type via Lookup-Tabelle (Hefename → Typ, Bierstil als Fallback)
    useEffect(() => {
        const isUserSet = brew.data?.fermentation_type && !autoSetFields.current.has('fermentation_type');
        if (isUserSet) return;
        const yeastNames: string[] = Array.isArray(brew.data?.yeast)
            ? (brew.data.yeast as any[]).map((y: any) => y.name || '')
            : brew.data?.yeast ? [String(brew.data.yeast)] : [];
        const suggested = inferFermentationType(yeastNames, brew.style || '');
        if (!suggested || brew.data?.fermentation_type === suggested) return;
        autoSetFields.current.add('fermentation_type');
        updateData('fermentation_type', suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brew.data?.yeast, brew.style]);

    // --- Special Effect: Water -> Batch Size ---
    // Only runs when Water or Malts or BoilTime change.
    useEffect(() => {
        if (brew.brew_type !== 'beer' || !brew.data) return;

        const d = brew.data;
        const mashWater = parseFloat(d.mash_water_liters?.toString().replace(',', '.') || '0');
        const spargeWater = parseFloat(d.sparge_water_liters?.toString().replace(',', '.') || '0');
        const batchSize = parseFloat(d.batch_size_liters?.toString().replace(',', '.') || '0');
        const boilTime = parseFloat(d.boil_time?.toString().replace(',', '.') || '60');
        
        const grainAbsorption = parseFloat(d.grain_absorption?.toString().replace(',', '.') || '0.96');
        const boilOffRate = parseFloat(d.boil_off_rate?.toString().replace(',', '.') || '3.5');
        const trubLoss = parseFloat(d.trub_loss?.toString().replace(',', '.') || '0.5');
        const coolingShrinkage = parseFloat(d.cooling_shrinkage?.toString().replace(',', '.') || '0.04');

        if ((mashWater > 0 || spargeWater > 0) && Array.isArray(d.malts)) {
            const calcBatch = calculateBatchSizeFromWater(mashWater, spargeWater, d.malts as any[], boilTime, {
                grainAbsorption, boilOffRate, trubLoss, coolingShrinkage
            });

            // Only update if significantly different from current batch size... BUT wait.
            // If user changes Boil Time, boil off changes -> result batch changes.
            // We should update it.
            if (Math.abs(calcBatch - batchSize) > 0.1) {
                // We use updateData directly which updates state
                setBrew(prev => {
                    // Safety check to avoid infinite loop -> if prev state already has this value
                    const currentBatch = parseFloat(prev.data?.batch_size_liters?.toString().replace(',', '.') || '0');
                    if (Math.abs(calcBatch - currentBatch) < 0.1) return prev;
                    
                    return { ...prev, data: { ...(prev.data || {}), batch_size_liters: calcBatch.toString() } };
                });
            }
        }
    }, [
        brew.data?.mash_water_liters, 
        brew.data?.sparge_water_liters, 
        JSON.stringify(brew.data?.malts), 
        brew.brew_type, 
        brew.data?.boil_time,
        brew.data?.grain_absorption,
        brew.data?.boil_off_rate,
        brew.data?.trub_loss,
        brew.data?.cooling_shrinkage
    ]);

    // --- Auto Calculations (Dependent on Batch Size) ---
    // FIX: Respects manualOverrides — fields the user has explicitly edited are not overwritten.
    //      og/fg removed from dependency array to prevent feedback loops.
    useEffect(() => {
        if (brew.brew_type !== 'beer' || !brew.data) return;

        const d = brew.data;
        const currentData = { ...d };
        let hasChanges = false;

        const batchSize = safeFloat(d.batch_size_liters);
        const efficiency = safeFloat(d.efficiency || '75');

        // 1. Calculate OG from Malts (skip if user manually overrode OG)
        let calcOG = 0;
        if (Array.isArray(d.malts) && batchSize > 0) {
            calcOG = calculateOG(batchSize, efficiency, d.malts as any[]);
            if (!manualOverrides.current.has('og')) {
                const currentOG = safeFloat(d.og);
                if (calcOG > 0 && Math.abs(calcOG - currentOG) > 0.002) {
                    currentData.og = calcOG.toString();
                    hasChanges = true;
                }
            }
        }

        // 2. Max Attenuation from Yeast List
        let autoAttenuation = safeFloat(d.attenuation);
        if (Array.isArray(d.yeast)) {
            let maxAtt = 0;
            d.yeast.forEach((y: any) => {
                const v = safeFloat(y.attenuation);
                if (v > maxAtt) maxAtt = v;
            });

            if (maxAtt > 0 && Math.abs(maxAtt - autoAttenuation) > 0.1) {
                currentData.attenuation = maxAtt.toString();
                autoAttenuation = maxAtt;
                hasChanges = true;
            }
        }

        // 3. FG Calculation (skip if user manually overrode FG)
        const og = safeFloat(currentData.og || d.og);
        if (og > 0 && !manualOverrides.current.has('fg')) {
            const calcFG = calculateFG(og, autoAttenuation);
            const currentFG = safeFloat(d.fg);

            if (Math.abs(calcFG - currentFG) > 0.1) {
                currentData.fg = calcFG.toFixed(1);
                hasChanges = true;
            }
        }

        // 4. ABV Calculation (skip if user manually overrode ABV)
        const fg = safeFloat(currentData.fg || d.fg);
        if (og > 0 && fg > 0 && og > fg && !manualOverrides.current.has('abv')) {
            const calcAbv = calculateABV(og, fg);
            const currentAbv = safeFloat(d.abv);

            if (calcAbv > 0 && Math.abs(calcAbv - currentAbv) > 0.1) {
                currentData.abv = calcAbv.toString();
                hasChanges = true;
            }
        }

        // 5. Color (EBC) Calculation (skip if user manually overrode color)
        if (Array.isArray(d.malts) && batchSize > 0 && !manualOverrides.current.has('color')) {
            const calcColor = calculateColorEBC(batchSize, d.malts as any[]);
            const currentColor = safeFloat(d.color);

            if (calcColor > 0 && Math.abs(calcColor - currentColor) > 0.1) {
                currentData.color = calcColor.toString();
                hasChanges = true;
            }
        }

        // 6. IBU Calculation (skip if user manually overrode IBU)
        if (Array.isArray(d.hops) && batchSize > 0 && og > 0 && !manualOverrides.current.has('ibu')) {
            const boilTime = d.boil_time ? safeFloat(d.boil_time) : 60;
            const calcIBU = calculateIBU(batchSize, og, d.hops as any[], boilTime);
            const currentIBU = safeFloat(d.ibu);

            if (calcIBU > 0 && Math.abs(calcIBU - currentIBU) > 0.1) {
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
        // FIX: og/fg REMOVED from dependency array — they are outputs, not inputs.
        // They were causing an infinite feedback loop where manual edits got overwritten.
        brew.data?.malts?.length,
        JSON.stringify(brew.data?.malts), // Deep check, but safe since small
        brew.data?.hops?.length,
        JSON.stringify(brew.data?.hops),
        brew.data?.batch_size_liters,
        brew.data?.yeast?.length,
        brew.data?.attenuation,
        brew.data?.efficiency,
        brew.data?.boil_time
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
            const { getBrewForEdit } = await import('@/lib/actions/brew-actions');
            const { data, error } = await getBrewForEdit(id, breweryId);

            if (error || !data) {
                router.push(`/team/${breweryId}/brews`);
                return;
            }

            // INGREDIENTS v2: Intercept raw DB row, restore legacy arrays synchronically for UI math
            const fullyMergedData = await mergeRecipeIngredientsIntoData(data.data || {}, data.id);

            setBrew({ ...data, name: data.name || '', style: data.style || '', brew_type: data.brew_type || '', description: data.description || undefined, is_public: data.is_public || false, moderation_status: (data.moderation_status as any) || undefined, data: fullyMergedData, flavor_profile: (data.flavor_profile as any) || null });
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

        const payload = {
            name: brew.name,
            style: brew.style,
            brew_type: brew.brew_type,
            description: brew.description,
            image_url: brew.image_url,
            cap_url: brew.cap_url,
            is_public: brew.is_public || false,
            data: sanitizedData,
            brewery_id: breweryId,
            // Mirror mash fields as top-level DB columns (for filtering / indexing)
            mash_method: sanitizedData.mash_method ?? null,
            mash_process: sanitizedData.mash_process ?? null,
            fermentation_type: sanitizedData.fermentation_type ?? null,
            // Beat the Brewer: Flavor profile (Phase 11)
            flavor_profile: brew.flavor_profile ?? null,
        };

        if (id === 'new') {
            // Strip ingredients out before creating the initial raw brew wrapper.
            // IMPORTANT: use a one-level-deeper copy so the deletes below don't also
            // mutate payload.data (which is used by extractAndSaveRecipeIngredients below).
            const rawPayload = { ...payload, data: { ...sanitizedData } };
            delete rawPayload.data?.malts;
            delete rawPayload.data?.hops;
            delete rawPayload.data?.yeast;

            const { data, error } = await createBrew(rawPayload);

            if (error || !data) {
                const errorMsg = typeof error === 'string'
                    ? error
                    : Object.values(error || {}).flat().join(', ');
                setMessage(errorMsg || 'Speichern fehlgeschlagen.');
                setSaving(false);
                return;
            }

            // Post-Save Ingredient Extraction (since we now have a recipe_id)
            if (payload.data) {
                try {
                    await extractAndSaveRecipeIngredients(data.id, payload.data);
                } catch (extractErr: any) {
                    setMessage(extractErr.message || 'Zutaten konnten nicht gespeichert werden.');
                    setSaving(false);
                    return;
                }
            }
            // Feed Post
            addToFeed(supabase, breweryId, user, 'BREW_CREATED', {
                brew_id: data.id,
                brew_name: data.name || undefined
            });

            // Email Notification
            notifyNewBrew(
                breweryId,
                data.id,
                data.name || 'Unbenanntes Gebräu',
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
                        brew_name: data.name || '',
                        brewery_id: breweryId,
                        style: brew.style,
                        type: brew.brew_type
                    }
                });
            } catch (e) {
                console.warn('Analytics tracking failed (non-critical):', e);
            }

            setBrew({ ...data, name: data.name || '', style: data.style || '', brew_type: data.brew_type || '', description: data.description || undefined, is_public: data.is_public || false, moderation_status: (data.moderation_status as any) || undefined, data: data.data || {}, flavor_profile: (data.flavor_profile as any) || null });
            setSaving(false);
            router.replace(`/team/${breweryId}/brews/${data.id}/edit`);
            
            // Wait for router replace or just load ratings (on new brew usually empty, but good to be consistent)
            await loadRatings(data.id);

            checkAndGrantAchievements(user.id).then(newAchievements => {
                newAchievements.forEach(achievement => showAchievement(achievement));
            }).catch(console.error);

            // Fire-and-forget: BotlGuide RAG — update recipe embedding
            ;(async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                    if (!session || !supabaseUrl || !anonKey) return;
                    await fetch(`${supabaseUrl}/functions/v1/botlguide-embed`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                            'apikey': anonKey,
                        },
                        body: JSON.stringify({
                            type: 'user_recipe',
                            brew_id: data.id,
                            user_id: user.id,
                            brewery_id: breweryId,
                        }),
                    });
                } catch { /* non-critical */ }
            })();

            return;
        }

        // UPDATE Logic
        const tempOriginalData = { ...payload.data }; // Save copy with arrays for our extractor
        let sanitisedData: any;
        try {
            const result = await extractAndSaveRecipeIngredients(id, payload.data);
            sanitisedData = result.sanitisedData;
        } catch (extractErr: any) {
            setMessage(extractErr.message || 'Zutaten konnten nicht gespeichert werden.');
            setSaving(false);
            return;
        }
        payload.data = sanitisedData;

        const { data, error } = await updateBrew(id, payload);

        // Put the original formatted array data back in the local UI state without making another fetch roundtrip
        if (data) {
            data.data = { ...(data.data || {}), ...tempOriginalData };
        }

        if (error || !data) {
             const errorMsg = typeof error === 'string'
                ? error
                : Object.values(error || {}).flat().join(', ');
            setMessage(errorMsg || 'Speichern fehlgeschlagen.');
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

            setBrew({ ...data, name: data.name || '', style: data.style || '', brew_type: data.brew_type || '', description: data.description || undefined, is_public: data.is_public || false, moderation_status: (data.moderation_status as any) || undefined, data: data.data || {}, flavor_profile: (data.flavor_profile as any) || null });
            setMessage('Gespeichert.');

            if (data.id) await loadRatings(data.id);

            checkAndGrantAchievements(user.id).then(newAchievements => {
                newAchievements.forEach(achievement => showAchievement(achievement));
            }).catch(console.error);

            // Fire-and-forget: BotlGuide RAG — update recipe embedding
            ;(async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                    if (!session || !supabaseUrl || !anonKey) return;
                    await fetch(`${supabaseUrl}/functions/v1/botlguide-embed`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                            'apikey': anonKey,
                        },
                        body: JSON.stringify({
                            type: 'user_recipe',
                            brew_id: data.id,
                            user_id: user.id,
                            brewery_id: breweryId,
                        }),
                    });
                } catch { /* non-critical */ }
            })();
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

        const selectedStyle = LABEL_STYLES.find(s => s.id === labelStyle);
        const selectedPalette = COLOR_PALETTES.find(p => p.id === labelColorPalette);
        const promptParts = [
            `Create a pure illustration label design for ${brew.name || 'dein Brew'}.`,
            brew.style ? `Style: ${brew.style}.` : '',
            brew.description ? `Visual theme: ${brew.description}.` : '',
            typePrompt.length ? `Context: ${typePrompt.join(', ')}.` : '',
            selectedStyle ? `Art style: ${selectedStyle.prompt}.` : '',
            selectedPalette ? `Color palette: ${selectedPalette.prompt}.` : '',
            extraPrompt ? `Additional details: ${extraPrompt}` : '',
            'IMPORTANT: Pure illustration artwork only, absolutely NO TEXT, NO LETTERS, NO WORDS, NO TYPOGRAPHY on the label.',
            'Text-free design, visual artwork only.',
            'High detail, artistic illustration, 1:1 aspect ratio.'
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
     * Helper to show BotlGuide credit badge next to AI buttons.
     * Uses the shared BotlGuideBadge component for consistent branding.
     */
    function AICreditBadge() {
        if (!premiumStatus) return null;
        const r = premiumStatus.features.aiGenerationsRemaining;
        const remaining = r === Infinity ? null : r;
        return <BotlGuideBadge remaining={remaining} />;
    }

    async function handleField<K extends keyof BrewForm>(key: K, value: BrewForm[K]) {
        setBrew(prev => {
            const next = { ...prev, [key]: value };



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

            const response = await fetch('/api/botlguide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capability: 'copywriter.name',
                    context: { brewStyle: brew.style, brewType: brew.brew_type },
                    data: { details: context.join(', ') }
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
                setMessage('Name generiert!');
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
                    recipeData.mashSchedule = d.mash_steps.map((s: any) => {
                        let label = `${s.name}: ${s.temperature}°C (${s.duration}min)`;
                        if (s.step_type === 'decoction') {
                            const parts: string[] = [`Dekoktion`];
                            if (s.decoction_form) parts.push(s.decoction_form);
                            if (s.volume_liters) parts.push(`${s.volume_liters}L`);
                            if (s.decoction_boil_time) parts.push(`Kochen ${s.decoction_boil_time}min`);
                            label += ` [${parts.join(', ')}]`;
                        } else if (s.step_type === 'mashout') {
                            label += ' [Abmaischen]';
                        }
                        return label;
                    }).join(' -> ');
                    if (d.mash_process) recipeData.mashProcess = d.mash_process;
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

            const response = await fetch('/api/botlguide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capability: 'architect.optimize',
                    data: recipeData
                })
            });

            const data = await response.json();
            // New gateway returns suggestions nested under data.data
            const suggestions = data.data?.suggestions ?? data.suggestions;
            if (suggestions && Array.isArray(suggestions)) {
                setOptimizationSuggestions(suggestions);
                setMessage('Rezept analysiert!');
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

            const response = await fetch('/api/botlguide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capability: 'copywriter.description',
                    context: { brewStyle: brew.style, brewType: brew.brew_type },
                    data: { details: details.join(', ') }
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
                setMessage('Beschreibung generiert!');
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

    async function handleCheckBjcp() {
        if (!brew.style) { setMessage('Bierstil angeben, damit BJCP-Prüfung möglich ist.'); return; }
        setCheckingBjcp(true);
        setBjcpResult(null);
        setMessage(null);
        try {
            const response = await fetch('/api/botlguide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capability: 'architect.check_bjcp',
                    context: {
                        brewStyle: brew.style, brewType: brew.brew_type,
                        targetOG: brew.data?.og, targetFG: brew.data?.fg,
                        ibu: brew.data?.ibu, colorEBC: brew.data?.ebc,
                        abv: brew.data?.abv,
                    },
                    data: {
                        name: brew.name,
                        style: brew.style,
                        og: brew.data?.og,
                        fg: brew.data?.fg,
                        abv: brew.data?.abv,
                        ibu: brew.data?.ibu,
                        ebc: brew.data?.ebc,
                        malts: formatIngredientsForPrompt(brew.data?.malts ?? []),
                        hops: formatIngredientsForPrompt(brew.data?.hops ?? []),
                        yeast: formatIngredientsForPrompt(brew.data?.yeast ?? []),
                    },
                }),
            });
            if (response.status === 402) { setMessage('Keine KI-Credits mehr übrig!'); return; }
            if (response.status === 403) { setMessage('BJCP-Check ist ab dem Brewery-Abo verfügbar.'); return; }
            const data = await response.json();
            if (data.data?.conformityScore !== undefined) setBjcpResult(data.data as BjcpResult);
            else setMessage(data.error || 'BJCP-Prüfung fehlgeschlagen.');
        } catch (e: any) {
            setMessage(e?.message || 'BJCP-Prüfung fehlgeschlagen.');
        } finally {
            setCheckingBjcp(false);
            refreshPremium();
        }
    }

    async function handleSuggestHops() {
        setSuggestingHops(true);
        setHopSuggestions(null);
        setMessage(null);
        try {
            const existingHops = formatIngredientsForPrompt(brew.data?.hops);
            const response = await fetch('/api/botlguide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capability: 'architect.suggest_hops',
                    context: { brewStyle: brew.style, brewType: brew.brew_type, ibu: brew.data?.ibu, targetOG: brew.data?.og },
                    data: {
                        style: brew.style,
                        ibu: brew.data?.ibu,
                        og: brew.data?.og,
                        malts: formatIngredientsForPrompt(brew.data?.malts),
                        existingHops,
                    },
                }),
            });
            if (response.status === 402) { setMessage('Keine KI-Credits mehr übrig!'); return; }
            const data = await response.json();
            if (data.text) setHopSuggestions(data.text);
            else setMessage(data.error || 'Hopfen-Empfehlung fehlgeschlagen.');
        } catch (e: any) {
            setMessage(e?.message || 'Hopfen-Empfehlung fehlgeschlagen.');
        } finally {
            setSuggestingHops(false);
            refreshPremium();
        }
    }

    async function handleFoodPairing() {
        setLoadingPairing(true);
        setPairingResult(null);
        setMessage(null);
        try {
            const response = await fetch('/api/botlguide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capability: 'sommelier.pairing',
                    context: { brewStyle: brew.style, brewType: brew.brew_type, recipeName: brew.name, abv: brew.data?.abv, ibu: brew.data?.ibu },
                    data: {
                        name: brew.name,
                        style: brew.style,
                        abv: brew.data?.abv,
                        ibu: brew.data?.ibu,
                        malts: formatIngredientsForPrompt(brew.data?.malts),
                        hops: formatIngredientsForPrompt(brew.data?.hops),
                    },
                }),
            });
            if (response.status === 402) { setMessage('Keine KI-Credits mehr übrig!'); return; }
            const data = await response.json();
            if (data.data?.pairings) setPairingResult(data.data as typeof pairingResult);
            else setMessage(data.error || 'Food Pairing fehlgeschlagen.');
        } catch (e: any) {
            setMessage(e?.message || 'Food Pairing fehlgeschlagen.');
        } finally {
            setLoadingPairing(false);
            refreshPremium();
        }
    }

    async function handleGenerateSocial() {
        setGeneratingSocial(true);
        setSocialResult(null);
        setMessage(null);
        try {
            const response = await fetch('/api/botlguide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capability: 'copywriter.social',
                    context: { brewStyle: brew.style, brewType: brew.brew_type, recipeName: brew.name, abv: brew.data?.abv, ibu: brew.data?.ibu },
                    data: {
                        name: brew.name,
                        style: brew.style,
                        description: brew.description,
                        abv: brew.data?.abv,
                        ibu: brew.data?.ibu,
                    },
                }),
            });
            if (response.status === 402) { setMessage('Keine KI-Credits mehr übrig!'); return; }
            const data = await response.json();
            if (data.data?.instagram || data.data?.facebook) setSocialResult(data.data as typeof socialResult);
            else setMessage(data.error || 'Social-Post Generierung fehlgeschlagen.');
        } catch (e: any) {
            setMessage(e?.message || 'Social-Post Generierung fehlgeschlagen.');
        } finally {
            setGeneratingSocial(false);
            refreshPremium();
        }
    }

    async function handleGenerateLabelPrompt() {
        setGeneratingLabelPrompt(true);
        setMessage(null);

        try {
            const selectedStyle = LABEL_STYLES.find(s => s.id === labelStyle);
            const selectedPalette = COLOR_PALETTES.find(p => p.id === labelColorPalette);
            const response = await fetch('/api/botlguide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capability: 'copywriter.label_prompt',
                    context: { brewStyle: brew.style, brewType: brew.brew_type, recipeName: brew.name },
                    data: { labelStyle: selectedStyle?.prompt ?? null, labelColorPalette: selectedPalette?.prompt ?? null }
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
                setMessage('Label-Prompt generiert!');
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

            // Explizit pending setzen (Defense in Depth – zusätzlich zum DB-Trigger)
            const { data, error } = await supabase
                .from('brews')
                .update({
                    image_url: imageUrl,
                    moderation_status: 'pending',
                    moderated_at: null,
                    moderated_by: null,
                    moderation_rejection_reason: null
                })
                .eq('id', brew.id)
                .select()
                .single();

            if (error) throw error;

            // Update local state (including new moderation status from DB return)
            setBrew(prev => ({
                ...prev,
                image_url: imageUrl,
                moderation_status: (data.moderation_status as any) || undefined,
                moderation_rejection_reason: data.moderation_rejection_reason || null
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

            // Explizit pending setzen (Defense in Depth – zusätzlich zum DB-Trigger)
            const { error } = await supabase
                .from('brews')
                .update({
                    cap_url: imageUrl,
                    moderation_status: 'pending',
                    moderated_at: null,
                    moderated_by: null,
                    moderation_rejection_reason: null
                })
                .eq('id', brew.id);

            if (error) throw error;

            setBrew(prev => ({ ...prev, cap_url: imageUrl, moderation_status: 'pending', moderation_rejection_reason: null }));
            setMessage('Kronkorken-Design hochgeladen und wird geprüft!');
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
            const prompt = `Vector concept for ${brew.brew_type} "${brew.name}" (${brew.style}). Focus on central subject matter representing the name or ingredients.`;

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
                setMessage('KI-Kronkorken generiert!');
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

    function handleCalculateWater() {
        if (!brew.data) return;
        const d = brew.data;
        
        const batchSize = parseFloat(d.batch_size_liters?.toString().replace(',', '.') || '0');
        if (batchSize <= 0) {
            setMessage('Bitte erst eine Ziel-Menge (Liter) angeben.');
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        const totalGrainKg = calculateTotalGrain(d.malts || []);
        
        // Boil Time from Minutes to Hours
        const boilTimeMin = parseFloat(d.boil_time?.toString().replace(',', '.') || '60');
        const boilTimeHours = boilTimeMin / 60;
 
        const config = {
            grainAbsorption: parseFloat(d.grain_absorption?.toString().replace(',', '.') || '0.96'),
            boilOffRate: parseFloat(d.boil_off_rate?.toString().replace(',', '.') || '3.5'),
            trubLoss: parseFloat(d.trub_loss?.toString().replace(',', '.') || '0.5'),
            coolingShrinkage: parseFloat(d.cooling_shrinkage?.toString().replace(',', '.') || '0.04'),
            mashThickness: parseFloat(d.mash_thickness?.toString().replace(',', '.') || '3.5'),
            // Dekoktion: Verdampfungsverlust aus Teilmaische-Kochungen → fließt in Nachguss
            decoctionEvaporation: d.mash_process === 'decoction' && Array.isArray(d.mash_steps)
                ? calculateDecoctionEvaporation(d.mash_steps)
                : 0
        };
        
        const result = calculateWaterProfile(batchSize, totalGrainKg, boilTimeHours, config);
        
        const decEvap = config.decoctionEvaporation;
        if (decEvap > 0) {
            updateData('mash_water_liters', result.mashWater.toString());
            updateData('sparge_water_liters', result.spargeWater.toString());
            setMessage(`Wasser berechnet! HG: ${result.mashWater}L, NG: ${result.spargeWater}L (inkl. ${decEvap.toFixed(1)}L Dekoktions-Verdampfung)`);
        } else {
            updateData('mash_water_liters', result.mashWater.toString());
            updateData('sparge_water_liters', result.spargeWater.toString());
            setMessage(`Wasser berechnet! HG: ${result.mashWater}L, NG: ${result.spargeWater}L`);
        }
        setTimeout(() => setMessage(null), 3000);
    }

    if (loading) {
        return (
            <div className="bg-background text-text-primary flex items-center justify-center p-20">
                <div className="text-center">
                    <FlaskConical className="w-12 h-12 text-text-disabled animate-pulse mx-auto mb-4" />
                    <p className="text-text-muted">Lade Rezeptdaten...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background text-text-primary sm:p-6 md:p-8 font-sans antialiased">
            <div className="max-w-[1600px] mx-auto w-full space-y-8">
                <header className="sticky top-[64px] z-40 bg-background/80 backdrop-blur-xl flex flex-row items-center justify-between gap-4 border-b border-border py-3 mb-8 -mx-4 px-4 sm:-mx-8 sm:px-8 mt-[-1rem]">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-0 sm:mb-1">
                            <h1 className="text-lg sm:text-2xl font-bold text-text-primary tracking-tight truncate">
                                {id === 'new' ? 'Neues Rezept' : brew.name || 'Rezept'}
                            </h1>
                            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-[#ff6b2a]/10 text-[#ff6b2a] border border-[#ff6b2a]/20 uppercase tracking-widest shrink-0">
                                Editor
                            </span>
                        </div>
                        <p className="hidden sm:block text-sm text-text-muted truncate">Hier entstehen deine Brau-Kreationen</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Link
                            href={`/team/${breweryId}/brews`}
                            className="hidden md:flex bg-background hover:bg-surface text-text-secondary hover:text-text-primary px-4 py-2 rounded-md text-sm font-medium border border-border transition-colors items-center gap-2"
                        >
                            Abbrechen
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-text-primary text-background font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-60 text-sm shadow-md"
                        >
                            {saving ? '...' : 'Speichern'}
                        </button>
                    </div>
                </header>

                {message && (
                    <div className="bg-surface border border-brand/30 rounded-xl px-4 py-3 text-sm text-text-secondary">
                        {message}
                    </div>
                )}

                {/* Global moderation banner: show when a label or uploaded cap is pending review */}
                {brew.moderation_status === 'pending' && (
                    ((brew.image_url && brew.image_url !== '/default_label/default.png') || (brew.cap_url && !(typeof brew.cap_url === 'string' && brew.cap_url.startsWith('#')))) && (
                        <div className="bg-rating/10 border border-rating/30 rounded-xl px-4 py-3 text-sm text-rating mt-3">
                            <strong className="font-bold">Prüfung läuft:</strong> Dein Label oder Kronkorken wird aktuell überprüft und ist vorübergehend eingeschränkt.
                        </div>
                    )
                )}

                {/* Tabs */}
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Sidebar nav */}
                    <div className="lg:w-52 lg:flex-shrink-0 lg:sticky lg:top-20 lg:self-start w-full">
                        <ResponsiveTabs
                            variant="sidebar"
                            activeTab={activeTab}
                            onTabChange={(id) => setActiveTab(id as any)}
                            items={[
                                { id: 'input', label: 'Eingabe', icon: ScrollText },
                                { id: 'label', label: 'Label', icon: Tag, hidden: id === 'new' },
                                { id: 'caps', label: 'Kronkorken', icon: Crown, hidden: id === 'new' },
                                { id: 'optimization', label: 'Optimierung', icon: Microscope, hidden: id === 'new' },
                                { id: 'ratings', label: 'Bewertung', icon: Star, hidden: id === 'new' },
                                { id: 'flavor', label: 'Beat the Brewer', icon: Sparkles, hidden: id === 'new' },
                                { id: 'settings', label: 'Einstellungen', icon: Settings, hidden: false }
                            ].filter(t => !t.hidden)}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Content Area */}
                    <main className="w-full space-y-8 overflow-x-hidden">

                        {activeTab === 'input' && (
                            <div className="space-y-8">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-brand font-bold mb-1">Rezept</p>
                                    <h2 className="text-2xl font-bold text-text-primary tracking-tight">Basisdaten bearbeiten</h2>
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                        <div className="lg:col-span-8 space-y-1.5">
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-text-disabled block">Name</label>
                                            <div className="flex items-center w-full bg-surface text-text-primary border border-border rounded-xl transition focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/20 pr-2">
                                                <input
                                                    value={brew.name}
                                                    onChange={(e) => handleField('name', e.target.value)}
                                                    className="flex-1 bg-transparent border-none px-4 py-3.5 text-base font-semibold text-text-primary outline-none placeholder:text-text-disabled min-w-0"
                                                    placeholder="z.B. Galaxy IPA"
                                                />
                                                <button
                                                    onClick={handleGenerateName}
                                                    disabled={generatingName || premiumStatus?.features.aiGenerationsRemaining === 0}
                                                    className="shrink-0 flex items-center gap-1.5 bg-accent-purple/10 hover:bg-accent-purple/20 border border-accent-purple/30 text-accent-purple px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition disabled:opacity-50 whitespace-nowrap"
                                                >
                                                    {generatingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                    BotlGuide
                                                    <AICreditBadge />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="lg:col-span-4 space-y-1.5">
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-text-disabled block">Stil</label>
                                            <input
                                                value={brew.style}
                                                onChange={(e) => handleField('style', e.target.value)}
                                                className="w-full bg-surface text-text-primary border border-border rounded-xl px-4 py-3.5 text-base font-semibold focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled"
                                                placeholder="z.B. Hazy IPA"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-disabled block">Beschreibung</label>
                                        <div className="w-full bg-surface text-text-primary border border-border rounded-xl transition focus-within:border-accent-purple/50 focus-within:ring-1 focus-within:ring-accent-purple/20">
                                            <textarea
                                                value={brew.description || ''}
                                                onChange={(e) => handleField('description', e.target.value)}
                                                className="w-full bg-transparent border-none px-4 py-3.5 text-text-primary min-h-[100px] outline-none placeholder:text-text-disabled resize-none text-sm leading-relaxed block"
                                                placeholder="Aromen, Malz, Hopfen, Frucht, Farbe..."
                                            />
                                            <div className="flex justify-end px-3 pb-3">
                                                <button
                                                    onClick={handleGenerateDescription}
                                                    disabled={generatingDescription || premiumStatus?.features.aiGenerationsRemaining === 0}
                                                    className="flex items-center gap-1.5 bg-accent-purple/10 hover:bg-accent-purple/20 border border-accent-purple/30 text-accent-purple px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition disabled:opacity-50"
                                                >
                                                    {generatingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                    BotlGuide
                                                    <AICreditBadge />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-border">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-disabled mb-5">Getränke-Typ</p>
                                    <div className="flex flex-wrap gap-2.5">
                                        {(
                                            [
                                                { key: 'beer', label: 'Bier', Icon: Droplets },
                                                { key: 'wine', label: 'Wein', Icon: Wine },
                                                { key: 'cider', label: 'Cider', Icon: Apple },
                                                { key: 'mead', label: 'Met', Icon: Hexagon },
                                                { key: 'softdrink', label: 'Limo', Icon: Citrus },
                                            ] as { key: string; label: string; Icon: React.ElementType }[]
                                        ).map((opt) => (
                                            <button
                                                key={opt.key}
                                                onClick={() => handleField('brew_type', opt.key)}
                                                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border text-sm font-bold transition-all duration-200 active:scale-95 ${
                                                    brew.brew_type === opt.key
                                                        ? 'bg-brand/10 text-brand border-brand shadow-md shadow-brand/10'
                                                        : 'bg-background text-text-muted border-border hover:border-border-hover hover:text-text-secondary'
                                                }`}
                                            >
                                                <opt.Icon className="w-4 h-4" />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {brew.brew_type === 'beer' && (
                                    <div className="space-y-8">
                                        {/* SECTION 1: EKS & MESSWERTE */}
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Activity className="w-5 h-5" />
                                                </span>
                                                Eckdaten & Ergebnisse
                                            </h3>

                                            {/* Gruppe 1: Definition des Rezepts (Eingaben) */}
                                            <div className="mb-8">
                                                <div className="flex items-center gap-2 mb-4 border-l-2 border-brand pl-3">
                                                    <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">Rezept-Vorgaben</span>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    <div>
                                                        <NumberInput label="System-SHA (%)" value={brew.data?.efficiency || ''} onChange={(val) => updateData('efficiency', val)} placeholder="75" />
                                                        {loadedFromProfile && (
                                                            <p className="text-[10px] text-brand mt-1 flex items-center gap-1">
                                                                <span>↑ Übernommen aus Anlage</span>
                                                                <span className="font-semibold truncate">{loadedFromProfile}</span>
                                                            </p>
                                                        )}
                                                        {equipmentProfiles.length === 0 && (
                                                            <p className="text-[10px] text-text-disabled mt-1">
                                                                Tipp: <a href={`/team/${breweryId}/settings?tab=equipment`} className="text-brand hover:underline">Brauanlage hinterlegen</a> um SHA automatisch vorzubelegen.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Gruppe 2: Resultierende Werte (Berechnet) */}
                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-4">
                                                    <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest border-l-2 border-brand pl-3">Ergebnisse / Prognose</span>
                                                    <button
                                                        onClick={() => {
                                                            if (resultsEditable) {
                                                                // Toggling OFF edit mode: clear all manual overrides so auto-calc resumes
                                                                manualOverrides.current.clear();
                                                            }
                                                            setResultsEditable(!resultsEditable);
                                                        }}
                                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${resultsEditable ? 'bg-brand-bg/40 text-brand border border-brand-dim' : 'text-text-disabled hover:text-text-secondary border border-transparent hover:border-border'}`}
                                                    >
                                                        {resultsEditable ? <><Check className="w-3 h-3 inline mr-1" />Fertig</> : <><Pencil className="w-3 h-3 inline mr-1" />Bearbeiten</>}
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    <NumberInput
                                                        label="Bittere (IBU)"
                                                        value={brew.data?.ibu || ''}
                                                        onChange={(val) => { manualOverrides.current.add('ibu'); updateData('ibu', val); }}
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
                                                        onChange={(val) => { manualOverrides.current.add('color'); updateData('color', val); }}
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
                                                        onChange={(val) => { manualOverrides.current.add('abv'); updateData('abv', val); }}
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
                                                        onChange={(val) => { manualOverrides.current.add('og'); updateData('og', val); }}
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
                                                        onChange={(val) => { manualOverrides.current.add('fg'); updateData('fg', val); }}
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
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Thermometer className="w-5 h-5" />
                                                </span>
                                                Wasser & Maischen
                                            </h3>
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6">
                                                    <div className="relative group">
                                                         <NumberInput
                                                            label="Ausschlagwürze (Ziel / L)"
                                                            value={brew.data?.batch_size_liters || ''}
                                                            onChange={(val) => updateData('batch_size_liters', val)}
                                                            placeholder="20"
                                                            step={0.5}
                                                            isCalculated={!!brew.data?.mash_water_liters && !!brew.data?.sparge_water_liters}  // Nur "calculated" wenn Wasserwerte da sind
                                                            calculationInfo="Berechnet sich automatisch aus Haupt- und Nachguss."
                                                            readOnly={false}
                                                        />
                                                         {/* Hint Arrow/Line could go here, but let's keep it simple first */}
                                                    </div>
                                                   
                                                    <NumberInput 
                                                        label="Hauptguss (L)" 
                                                        value={brew.data?.mash_water_liters || ''} 
                                                        onChange={(val) => updateData('mash_water_liters', val)} 
                                                        placeholder="15" 
                                                        step={0.5} 
                                                        // Visual cue that this is calculated from Batch Size
                                                        isCalculated={!!brew.data?.batch_size_liters && !brew.data?.mash_water_liters} 
                                                        calculationInfo="Berechnet aus Ziel-Ausschlagwürze & Maischedicke"
                                                    />
                                                    <NumberInput 
                                                        label="Nachguss (L)" 
                                                        value={brew.data?.sparge_water_liters || ''} 
                                                        onChange={(val) => updateData('sparge_water_liters', val)} 
                                                        placeholder="12" 
                                                        step={0.5} 
                                                        isCalculated={!!brew.data?.batch_size_liters && !brew.data?.sparge_water_liters}
                                                        calculationInfo="Berechnet aus Ziel-Ausschlagwürze & Verlusten"
                                                    />
                                                    <NumberInput label="Maische-pH (Ziel)" value={brew.data?.mash_ph || ''} onChange={(val) => updateData('mash_ph', val)} placeholder="5.4" step={0.1} />
                                                </div>

                                                <div className="bg-surface/40 border border-border rounded-lg overflow-hidden transition-all duration-300">
                                                    <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-surface/60">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setShowWaterProfile(!showWaterProfile)}
                                                            className="flex flex-col gap-1 text-left group focus:outline-none"
                                                        >
                                                            <div className="flex items-center gap-2 text-sm font-medium text-text-primary group-hover:text-brand transition-colors">
                                                                <div className={`transition-transform duration-200 ${showWaterProfile ? 'rotate-90' : ''}`}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                                                </div>
                                                                <Settings className="w-4 h-4 text-brand" />
                                                                <span>Wasser-Automatik & Anlagenprofil</span>
                                                            </div>
                                                            <p className="text-xs text-text-muted max-w-lg pl-6">
                                                                Pass hier deine Verluste an oder lass dein Brauwasser automatisch berechnen.
                                                            </p>
                                                        </button>
                                                        
                                                        <button 
                                                            type="button"
                                                            onClick={handleCalculateWater}
                                                            className="text-xs py-2 px-4 bg-brand hover:bg-brand text-text-primary font-bold rounded shadow-lg shadow-brand-dim/20 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap ml-auto sm:ml-0"
                                                        >
                                                            <RefreshCw className="w-3 h-3" />
                                                            Wasser für {brew.data?.batch_size_liters || '?'}L berechnen
                                                        </button>
                                                    </div>
                                                    
                                                    {showWaterProfile && (
                                                        <div className="p-5 border-t border-border bg-background/20 animate-in slide-in-from-top-2 duration-200 space-y-4">

                                                            {/* Anlage-Dropdown */}
                                                            {equipmentProfiles.length > 0 && (
                                                                <div className="flex items-center gap-3">
                                                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Anlage laden</label>
                                                                    <select
                                                                        defaultValue=""
                                                                        onChange={e => {
                                                                            const p = equipmentProfiles.find(x => x.id === e.target.value);
                                                                            if (!p) return;
                                                                            const cfg = profileToConfig(p);
                                                                            updateData('boil_off_rate',     cfg.boilOffRate);
                                                                            updateData('trub_loss',         cfg.trubLoss);
                                                                            updateData('grain_absorption',  cfg.grainAbsorption);
                                                                            updateData('cooling_shrinkage', cfg.coolingShrinkage);
                                                                            updateData('mash_thickness',    cfg.mashThickness);
                                                                            updateData('efficiency',        p.default_efficiency ?? 75);
                                                                            setLoadedFromProfile(p.name);
                                                                            e.target.value = '';
                                                                        }}
                                                                        className="flex-1 bg-surface border border-border-hover rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-brand focus:outline-none transition appearance-none"
                                                                    >
                                                                        <option value="">— Profil wählen —</option>
                                                                        {equipmentProfiles.map(p => (
                                                                            <option key={p.id} value={p.id}>
                                                                                {p.is_default ? '[Standard] ' : ''}{p.name} ({BREW_METHOD_LABELS[p.brew_method]}, {p.batch_volume_l} L)
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                            {equipmentProfiles.length === 0 && (
                                                                <div className="text-[10px] text-text-muted bg-surface/50 px-3 py-2 rounded border border-border flex items-center gap-2">
                                                                    <span>Keine Brauanlage hinterlegt —</span>
                                                                    <a href={`/team/${breweryId}/settings?tab=equipment`} className="text-brand hover:underline font-medium">Jetzt anlegen →</a>
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
                                                                <NumberInput label="Verdampfung (L/h)" value={brew.data?.boil_off_rate || ''} onChange={(val) => updateData('boil_off_rate', val)} placeholder="3.5" step={0.5} />
                                                                <NumberInput label="Trubverlust (L)" value={brew.data?.trub_loss || ''} onChange={(val) => updateData('trub_loss', val)} placeholder="0.5" step={0.1} />
                                                                <NumberInput label="Kühlschwand (4% = 0.04)" value={brew.data?.cooling_shrinkage || ''} onChange={(val) => updateData('cooling_shrinkage', val)} placeholder="0.04" step={0.01} />
                                                                <NumberInput label="Kornabsorption (L/kg)" value={brew.data?.grain_absorption || ''} onChange={(val) => updateData('grain_absorption', val)} placeholder="0.96" step={0.05} />
                                                                <NumberInput label="Maischedicke (L/kg)" value={brew.data?.mash_thickness || ''} onChange={(val) => updateData('mash_thickness', val)} placeholder="3.5" step={0.1} />
                                                            </div>
                                                            {loadedFromProfile && (
                                                                <p className="text-[10px] text-brand/70 italic">
                                                                    Werte übernommen aus Anlage: <span className="font-semibold not-italic text-brand">{loadedFromProfile}</span>
                                                                </p>
                                                            )}
                                                            <p className="text-[10px] text-text-disabled italic">
                                                                Hinweis: Gib oben deine <strong>Ziel-Ausschlagwürze</strong> ein und drücke auf "Berechnen". Die Werte hier werden für die Berechnung verwendet.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <MaltListEditor
                                                    value={brew.data?.malts}
                                                    onChange={(val) => updateData('malts', val)}
                                                />

                                                {/* Braumethode & Maischverfahren */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Braumethode */}
                                                    <div>
                                                        <label className="text-xs font-bold text-text-muted uppercase ml-1 mb-2 block">
                                                            Braumethode
                                                        </label>
                                                        <CustomSelect
                                                            value={brew.data?.mash_method || ''}
                                                            onChange={(val) => {
                                                                autoSetFields.current.delete('mash_method');
                                                                updateData('mash_method', val || null);
                                                            }}
                                                            variant="surface"
                                                            size="lg"
                                                            placeholder="– bitte wählen –"
                                                            options={[
                                                                { value: 'all_grain', label: 'All-Grain' },
                                                                { value: 'extract', label: 'Extrakt' },
                                                                { value: 'partial_mash', label: 'Partial Mash (Kombiniert)' },
                                                            ]}
                                                        />
                                                    </div>

                                                    {/* Maischverfahren — nur wenn nicht Extrakt */}
                                                    {brew.data?.mash_method !== 'extract' && (
                                                        <div>
                                                            <label className="text-xs font-bold text-text-muted uppercase ml-1 mb-2 block">
                                                                Maischverfahren
                                                            </label>
                                                            <CustomSelect
                                                                value={brew.data?.mash_process || ''}
                                                                onChange={(val) => {
                                                                    autoSetFields.current.delete('mash_process');
                                                                    updateData('mash_process', val || null);
                                                                }}
                                                                variant="surface"
                                                                size="lg"
                                                                placeholder="– bitte wählen –"
                                                                options={[
                                                                    { value: 'infusion', label: 'Infusion (Single Step)' },
                                                                    { value: 'step_mash', label: 'Stufenmaische' },
                                                                    { value: 'decoction', label: 'Dekoktion' },
                                                                    { value: 'biab', label: 'BIAB (Brew in a Bag)' },
                                                                    { value: 'no_sparge', label: 'No-Sparge' },
                                                                ]}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Maischplan — komplett ausblenden bei Extraktbrauen */}
                                                {brew.data?.mash_method !== 'extract' && (
                                                    <MashStepsEditor
                                                        value={brew.data?.mash_steps}
                                                        onChange={(val) => updateData('mash_steps', val)}
                                                        mashProcess={brew.data?.mash_process}
                                                        mashInfusionTotal={brew.data?.mash_water_liters ? String(brew.data.mash_water_liters) : undefined}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* SECTION 3: KOCHEN & HOPFEN */}
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Leaf className="w-5 h-5" />
                                                </span>
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
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Microscope className="w-5 h-5" />
                                                </span>
                                                Gärung
                                            </h3>
                                            <div className="space-y-8">
                                                <YeastListEditor
                                                    value={brew.data?.yeast}
                                                    onChange={(val) => updateData('yeast', val)}
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                                    <NumberInput label="Gärtemp. (°C)" value={brew.data?.primary_temp || ''} onChange={(val) => updateData('primary_temp', val)} placeholder="19" step={0.5} />
                                                    {/* Gärungstyp */}
                                                    <div>
                                                        <label className="text-xs font-bold text-text-muted uppercase ml-1 mb-2 h-8 flex items-end leading-tight">
                                                            Gärungstyp
                                                        </label>
                                                        <CustomSelect
                                                            value={brew.data?.fermentation_type || ''}
                                                            onChange={(val) => {
                                                                autoSetFields.current.delete('fermentation_type');
                                                                updateData('fermentation_type', val || null);
                                                            }}
                                                            variant="surface"
                                                            size="lg"
                                                            placeholder="– nicht angegeben –"
                                                            options={[
                                                                { value: 'top', label: 'Obergärig (Ale)' },
                                                                { value: 'bottom', label: 'Untergärig (Lager)' },
                                                                { value: 'spontaneous', label: 'Spontangärung' },
                                                                { value: 'mixed', label: 'Gemischt' },
                                                            ]}
                                                        />
                                                    </div>
                                                    <NumberInput label="Karbonisierung (g/l)" value={brew.data?.carbonation_g_l || ''} onChange={(val) => updateData('carbonation_g_l', val)} placeholder="5.0" step={0.1} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Dynamic Fields based on Type */}
                                {brew.brew_type === 'wine' && (
                                    <div className="space-y-6">
                                        {/* Section: Messwerte */}
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Activity className="w-4 h-4" />
                                                </span>
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
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Grape className="w-4 h-4" />
                                                </span>
                                                Reben & Herkunft
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-bold text-text-muted uppercase ml-1 mb-2 block">Rebsorte(n)</label>
                                                    <input className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary focus:border-brand focus:ring-2 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled" value={brew.data?.grapes || ''} onChange={(e) => updateData('grapes', e.target.value)} placeholder="z.B. Riesling, Merlot..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-text-muted uppercase ml-1 mb-2 block">Region / Lage</label>
                                                    <input className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary focus:border-brand focus:ring-2 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled" value={brew.data?.region || ''} onChange={(e) => updateData('region', e.target.value)} placeholder="z.B. Pfalz, Mosel..." />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Section: Ausbau */}
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Wine className="w-4 h-4" />
                                                </span>
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
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Activity className="w-4 h-4" />
                                                </span>
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
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Apple className="w-4 h-4" />
                                                </span>
                                                Zutaten
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-text-muted uppercase ml-1 mb-2 block">Apfelsorten</label>
                                                    <input className="w-full bg-surface border border-border rounded-md px-3 py-2 text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled" value={brew.data?.apples || ''} onChange={(e) => updateData('apples', e.target.value)} placeholder="z.B. Boskoop, Elstar..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-text-muted uppercase ml-1 mb-2 block">Hefe</label>
                                                    <input className="w-full bg-surface border border-border rounded-md px-3 py-2 text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled" value={brew.data?.yeast || ''} onChange={(e) => updateData('yeast', e.target.value)} placeholder="z.B. Cider Yeast" />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Section: Prozess */}
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Settings className="w-4 h-4" />
                                                </span>
                                                Verarbeitung
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-text-muted uppercase ml-1 mb-2 block">Gärung</label>
                                                    <CustomSelect
                                                        value={brew.data?.fermentation || ''}
                                                        onChange={(val) => updateData('fermentation', val)}
                                                        variant="surface"
                                                        size="lg"
                                                        placeholder="– bitte wählen –"
                                                        options={[
                                                            { value: 'wild', label: 'Wild (Spontan)' },
                                                            { value: 'cultured', label: 'Reinzucht (Kulturhefe)' },
                                                        ]}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-text-muted uppercase ml-1 mb-2 block">Süßegrad</label>
                                                    <CustomSelect
                                                        value={brew.data?.sweetness || 'dry'}
                                                        onChange={(val) => updateData('sweetness', val)}
                                                        variant="surface"
                                                        size="lg"
                                                        options={[
                                                            { value: 'dry', label: 'Trocken' },
                                                            { value: 'semi', label: 'Halbtrocken' },
                                                            { value: 'sweet', label: 'Süß' },
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {brew.brew_type === 'mead' && (
                                    <div className="space-y-6">
                                        {/* Section: Messwerte */}
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Activity className="w-4 h-4" />
                                                </span>
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
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Hexagon className="w-4 h-4" />
                                                </span>
                                                Zutaten
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-text-muted uppercase ml-1 mb-2 block">Honigsorte(n)</label>
                                                    <input className="w-full bg-surface border border-border rounded-md px-3 py-2 text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled" value={brew.data?.honey || ''} onChange={(e) => updateData('honey', e.target.value)} placeholder="z.B. Akazie, Waldhonig..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium tracking-wider text-text-muted uppercase ml-1 mb-2 block">Hefe</label>
                                                    <input className="w-full bg-surface border border-border rounded-md px-3 py-2 text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled" value={brew.data?.yeast || ''} onChange={(e) => updateData('yeast', e.target.value)} placeholder="z.B. Lalvin D-47, QA23" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-medium tracking-wider text-text-muted uppercase ml-1 mb-2 block">Zusätze (Früchte / Gewürze)</label>
                                                    <input className="w-full bg-surface border border-border rounded-md px-3 py-2 text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled" value={brew.data?.adjuncts || ''} onChange={(e) => updateData('adjuncts', e.target.value)} placeholder="z.B. Himbeeren, Zimt, Vanille..." />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-medium tracking-wider text-text-muted uppercase ml-1 mb-2 block">Nährstoffplan</label>
                                                    <textarea
                                                        className="w-full bg-surface border border-border rounded-md px-3 py-2 text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled min-h-[80px]"
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
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Activity className="w-4 h-4" />
                                                </span>
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
                                        <div className="space-y-6 pt-6 border-t border-border">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                                <span className="text-brand">
                                                    <Citrus className="w-4 h-4" />
                                                </span>
                                                Inhalt
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-medium tracking-wider text-text-muted uppercase ml-1 mb-2 block">Basis / Geschmack</label>
                                                    <input className="w-full bg-surface border border-border rounded-md px-3 py-2 text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled" value={brew.data?.base || ''} onChange={(e) => updateData('base', e.target.value)} placeholder="z.B. Zitrone-Ingwer, Cola..." />
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
                                    <div className="space-y-6 pt-6 border-t border-border">
                                        <RecipeStepsEditor
                                            value={brew.data?.steps}
                                            onChange={(val) => updateData('steps', val)}
                                        />
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-border">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                            <span className="text-brand">
                                                <FileText className="w-4 h-4" />
                                            </span>
                                            Sonstiges
                                        </h3>
                                        <div>
                                            <label className="text-xs font-medium tracking-wider text-text-muted uppercase ml-1 mb-2 block">Notizen / Details</label>
                                            <textarea
                                                className="w-full bg-surface border border-border rounded-md px-3 py-2 text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/20 transition outline-none placeholder:text-text-disabled min-h-[120px]"
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
                                {/* Header */}
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-base font-bold text-text-primary">BotlGuide KI-Tools</h2>
                                        <p className="text-xs text-text-muted mt-0.5">Analysiere, optimiere und vermarkte dein Rezept mit KI.</p>
                                    </div>
                                    <AICreditBadge />
                                </div>

                                {/* Tool Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                    {/* ── Rezept analysieren ── */}
                                    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                                        <div className="flex items-start gap-2.5">
                                            <Microscope size={15} className="text-accent-purple flex-shrink-0 mt-0.5" />
                                            <div>
                                                <BotlGuidePersonaPill persona="BotlGuide Architect" className="mb-1" />
                                                <p className="text-sm font-bold text-text-primary leading-tight">Rezept analysieren</p>
                                                <p className="text-xs text-text-muted mt-0.5">Balance, Stil-Konformität & Zutaten-Verbesserungen.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleOptimizeRecipe}
                                            disabled={analyzingRecipe || !brew.name || !brew.style || premiumStatus?.features.aiGenerationsRemaining === 0}
                                            className="w-full bg-gradient-to-r from-accent-purple/40 to-brand-bg border border-accent-purple/30 text-text-primary font-medium px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm min-h-[40px]"
                                        >
                                            {analyzingRecipe
                                                ? <><Loader2 size={14} className="animate-spin" /><span>Analysiere...</span></>
                                                : <><Microscope size={14} /><span>Analysieren</span></>
                                            }
                                        </button>
                                        {analyzingRecipe && (
                                            <div className="space-y-2 animate-pulse">
                                                <div className="h-2.5 bg-surface-hover rounded w-1/3" />
                                                <div className="h-2.5 bg-surface-hover rounded w-full" />
                                                <div className="h-2.5 bg-surface-hover rounded w-4/5" />
                                            </div>
                                        )}
                                        {optimizationSuggestions.length > 0 && (
                                            <div className="space-y-4 pt-4 border-t border-border">
                                                {optimizationSuggestions.map((suggestion, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <Lightbulb className="text-brand w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                                        <div className="text-xs text-text-secondary leading-relaxed [&_p]:leading-relaxed [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:text-text-primary [&_strong]:font-semibold [&_h1]:text-text-primary [&_h2]:text-text-primary [&_h3]:text-text-primary">
                                                            <ReactMarkdown>{suggestion}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Hopfen-Empfehlungen ── */}
                                    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                                        <div className="flex items-start gap-2.5">
                                            <Leaf size={15} className="text-accent-purple flex-shrink-0 mt-0.5" />
                                            <div>
                                                <BotlGuidePersonaPill persona="BotlGuide Architect" className="mb-1" />
                                                <p className="text-sm font-bold text-text-primary leading-tight">Hopfen-Empfehlungen</p>
                                                <p className="text-xs text-text-muted mt-0.5">Passende Sorten für deinen Stil & dein IBU-Ziel.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSuggestHops}
                                            disabled={suggestingHops || !brew.style || premiumStatus?.features.aiGenerationsRemaining === 0}
                                            className="w-full bg-gradient-to-r from-accent-purple/40 to-brand-bg border border-accent-purple/30 text-text-primary font-medium px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm min-h-[40px]"
                                        >
                                            {suggestingHops
                                                ? <><Loader2 size={14} className="animate-spin" /><span>Lade...</span></>
                                                : <><Leaf size={14} /><span>Empfehlungen generieren</span></>
                                            }
                                        </button>
                                        {suggestingHops && (
                                            <div className="space-y-2 animate-pulse">
                                                <div className="h-2.5 bg-surface-hover rounded w-1/3" />
                                                <div className="h-2.5 bg-surface-hover rounded w-full" />
                                                <div className="h-2.5 bg-surface-hover rounded w-4/5" />
                                                <div className="h-2.5 bg-surface-hover rounded w-2/3" />
                                            </div>
                                        )}
                                        {hopSuggestions && !suggestingHops && (
                                            <div className="pt-1 border-t border-border">
                                                <div className="[&_p]:text-text-secondary [&_p]:leading-relaxed [&_p]:my-0
                                                    [&_strong]:text-text-primary [&_strong]:font-semibold
                                                    [&_h1]:text-text-primary [&_h1]:font-bold [&_h2]:text-text-primary [&_h2]:font-bold [&_h3]:text-text-primary [&_h3]:font-bold
                                                    [&_ol]:text-text-secondary [&_ol]:space-y-4 [&_ol]:pl-4
                                                    [&_ul]:text-text-secondary [&_ul]:pl-4
                                                    [&_li]:text-text-secondary [&_li]:leading-relaxed text-xs
                                                    [&_ol>li]:border-b [&_ol>li]:border-border/60 [&_ol>li]:pb-4 [&_ol>li:last-child]:border-0 [&_ol>li:last-child]:pb-0">
                                                    <ReactMarkdown>{hopSuggestions}</ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Food Pairing ── */}
                                    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                                        <div className="flex items-start gap-2.5">
                                            <Sparkles size={15} className="text-accent-purple flex-shrink-0 mt-0.5" />
                                            <div>
                                                <BotlGuidePersonaPill persona="BotlGuide Sommelier" className="mb-1" />
                                                <p className="text-sm font-bold text-text-primary leading-tight">Food Pairing</p>
                                                <p className="text-xs text-text-muted mt-0.5">Welche Gerichte passen am besten zu diesem Getränk?</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleFoodPairing}
                                            disabled={loadingPairing || !brew.style || premiumStatus?.features.aiGenerationsRemaining === 0}
                                            className="w-full bg-gradient-to-r from-accent-purple/40 to-brand-bg border border-accent-purple/30 text-text-primary font-medium px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm min-h-[40px]"
                                        >
                                            {loadingPairing
                                                ? <><Loader2 size={14} className="animate-spin" /><span>Lade...</span></>
                                                : <><Sparkles size={14} /><span>Pairing generieren</span></>
                                            }
                                        </button>
                                        {loadingPairing && (
                                            <div className="space-y-2 animate-pulse">
                                                <div className="h-2.5 bg-surface-hover rounded w-1/3" />
                                                <div className="h-2.5 bg-surface-hover rounded w-full" />
                                                <div className="h-2.5 bg-surface-hover rounded w-4/5" />
                                            </div>
                                        )}
                                        {pairingResult && !loadingPairing && (
                                            <div className="pt-1 border-t border-border space-y-2">
                                                {pairingResult.intro && (
                                                    <div className="text-xs text-text-secondary italic [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:text-text-primary [&_strong]:font-semibold"><ReactMarkdown>{pairingResult.intro}</ReactMarkdown></div>
                                                )}
                                                {pairingResult.pairings.map((p, i) => (
                                                    <div key={i} className="flex items-start gap-2.5 bg-background border border-border rounded-lg p-2.5">
                                                        <span className="text-base flex-shrink-0">{p.emoji}</span>
                                                        <div>
                                                            <div className="text-xs font-bold text-text-primary [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:text-text-primary [&_strong]:font-semibold"><ReactMarkdown>{p.food}</ReactMarkdown></div>
                                                            <div className="text-xs text-text-secondary mt-0.5 leading-relaxed [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:text-text-primary [&_strong]:font-semibold"><ReactMarkdown>{p.why}</ReactMarkdown></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Social-Media-Posts ── */}
                                    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                                        <div className="flex items-start gap-2.5">
                                            <Sparkles size={15} className="text-accent-purple flex-shrink-0 mt-0.5" />
                                            <div>
                                                <BotlGuidePersonaPill persona="BotlGuide Copywriter" className="mb-1" />
                                                <p className="text-sm font-bold text-text-primary leading-tight">Social-Media-Posts</p>
                                                <p className="text-xs text-text-muted mt-0.5">Instagram- & Facebook-Post für dein Getränk.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleGenerateSocial}
                                            disabled={generatingSocial || !brew.name || !brew.style || premiumStatus?.features.aiGenerationsRemaining === 0}
                                            className="w-full bg-gradient-to-r from-accent-purple/40 to-brand-bg border border-accent-purple/30 text-text-primary font-medium px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm min-h-[40px]"
                                        >
                                            {generatingSocial
                                                ? <><Loader2 size={14} className="animate-spin" /><span>Generiere...</span></>
                                                : <><Sparkles size={14} /><span>Posts generieren</span></>
                                            }
                                        </button>
                                        {generatingSocial && (
                                            <div className="space-y-2 animate-pulse">
                                                <div className="h-2.5 bg-surface-hover rounded w-1/3" />
                                                <div className="h-2.5 bg-surface-hover rounded w-full" />
                                                <div className="h-2.5 bg-surface-hover rounded w-4/5" />
                                            </div>
                                        )}
                                        {socialResult && !generatingSocial && (
                                            <div className="pt-1 border-t border-border space-y-2">
                                                <div className="bg-background border border-border rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-like">Instagram</span>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(socialResult.instagram)}
                                                            className="text-[10px] text-text-muted hover:text-text-primary transition flex items-center gap-1"
                                                        >
                                                            <Check size={10} /> Kopieren
                                                        </button>
                                                    </div>
                                                    <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:text-text-primary [&_strong]:font-semibold"><ReactMarkdown>{socialResult.instagram}</ReactMarkdown></div>
                                                </div>
                                                <div className="bg-background border border-border rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Facebook</span>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(socialResult.facebook)}
                                                            className="text-[10px] text-text-muted hover:text-text-primary transition flex items-center gap-1"
                                                        >
                                                            <Check size={10} /> Kopieren
                                                        </button>
                                                    </div>
                                                    <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:text-text-primary [&_strong]:font-semibold"><ReactMarkdown>{socialResult.facebook}</ReactMarkdown></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── BJCP-Konformität (full width) ── */}
                                    <div className="bg-surface border border-border rounded-xl p-4 space-y-3 sm:col-span-2">
                                        <div className="flex items-start gap-2.5">
                                            <ShieldCheck size={15} className="text-accent-purple flex-shrink-0 mt-0.5" />
                                            <div>
                                                <BotlGuidePersonaPill persona="BotlGuide Architect" className="mb-1" />
                                                <p className="text-sm font-bold text-text-primary leading-tight">BJCP-Konformität</p>
                                                <p className="text-xs text-text-muted mt-0.5">Rezept gegen BJCP 2021 Stilrichtlinien validieren (nur Brewery+).</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleCheckBjcp}
                                            disabled={checkingBjcp || !brew.style || premiumStatus?.features.aiGenerationsRemaining === 0}
                                            className="w-full bg-gradient-to-r from-accent-purple/40 to-brand-bg border border-accent-purple/30 text-text-primary font-medium px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm min-h-[40px]"
                                        >
                                            {checkingBjcp
                                                ? <><Loader2 size={14} className="animate-spin" /><span>Prüfe...</span></>
                                                : <><ShieldCheck size={14} /><span>BJCP prüfen</span></>
                                            }
                                        </button>
                                        {checkingBjcp && (
                                            <div className="space-y-2 animate-pulse">
                                                <div className="h-2.5 bg-surface-hover rounded w-1/3" />
                                                <div className="h-2.5 bg-surface-hover rounded w-full" />
                                                <div className="h-2.5 bg-surface-hover rounded w-2/3" />
                                            </div>
                                        )}
                                        {bjcpResult && !checkingBjcp && (
                                            <div className="pt-3 border-t border-border space-y-4">
                                                {/* Style + Score */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent-purple/80">BJCP {bjcpResult.bjcpStyle.code}</span>
                                                        <p className="text-sm font-bold text-text-primary mt-0.5">{bjcpResult.bjcpStyle.nameDe}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className={`text-3xl font-black tabular-nums ${
                                                            bjcpResult.conformityScore >= 80 ? 'text-success'
                                                            : bjcpResult.conformityScore >= 55 ? 'text-rating' : 'text-error'
                                                        }`}>
                                                            {bjcpResult.conformityScore}
                                                        </div>
                                                        <div className="text-[9px] text-text-muted uppercase tracking-wider">/100</div>
                                                    </div>
                                                </div>
                                                {/* Parameter Checks */}
                                                {bjcpResult.parameterChecks?.length > 0 && (
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-disabled mb-2">Parameter</p>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                                            {bjcpResult.parameterChecks.map((p, i) => (
                                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                                    <span className={`text-[10px] font-bold w-4 flex-shrink-0 ${p.status === 'ok' ? 'text-success' : 'text-rating'}`}>
                                                                        {p.status === 'ok' ? '✓' : p.status === 'high' ? '↑' : p.status === 'low' ? '↓' : '?'}
                                                                    </span>
                                                                    <span className="text-text-secondary w-10 flex-shrink-0">{p.param}</span>
                                                                    <span className="font-mono text-text-primary">{p.value}</span>
                                                                    <span className="text-text-disabled truncate">→ {p.range}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Strengths / Deviations / Improvements */}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    {bjcpResult.strengths?.length > 0 && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-success/80 mb-1.5">Stärken</p>
                                                            <ul className="space-y-1.5">
                                                                {bjcpResult.strengths.map((s, i) => (
                                                                    <li key={i} className="flex items-start gap-1.5">
                                                                        <span className="text-success mt-0.5 flex-shrink-0">+</span>
                                                                        <span className="text-xs text-text-secondary leading-relaxed [&_strong]:text-text-primary [&_strong]:font-semibold">
                                                                            <ReactMarkdown>{s}</ReactMarkdown>
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {bjcpResult.deviations?.length > 0 && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-rating/80 mb-1.5">Abweichungen</p>
                                                            <ul className="space-y-1.5">
                                                                {bjcpResult.deviations.map((d, i) => (
                                                                    <li key={i} className="flex items-start gap-1.5">
                                                                        <span className="text-rating mt-0.5 flex-shrink-0">⚠</span>
                                                                        <span className="text-xs text-text-secondary leading-relaxed [&_strong]:text-text-primary [&_strong]:font-semibold">
                                                                            <ReactMarkdown>{d}</ReactMarkdown>
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {bjcpResult.improvements?.length > 0 && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-brand/80 mb-1.5">Verbesserungen</p>
                                                            <ul className="space-y-1.5">
                                                                {bjcpResult.improvements.map((imp, i) => (
                                                                    <li key={i} className="flex items-start gap-1.5">
                                                                        <span className="text-brand mt-0.5 flex-shrink-0">→</span>
                                                                        <span className="text-xs text-text-secondary leading-relaxed [&_strong]:text-text-primary [&_strong]:font-semibold">
                                                                            <ReactMarkdown>{imp}</ReactMarkdown>
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                                {bjcpResult.verdict && (
                                                    <div className="bg-background border border-border rounded-lg p-3">
                                                        <div className="text-xs text-text-secondary leading-relaxed italic [&_strong]:text-text-primary [&_strong]:font-semibold [&_p]:inline not-italic">
                                                            <ReactMarkdown>{bjcpResult.verdict}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        )}

                        {activeTab === 'label' && (
                            <div className="space-y-6">
                                {/* Moderation Banner */}
                                {brew.moderation_status === 'rejected' && (
                                    <div className="bg-error/20 border border-error/30 rounded-lg p-4 flex gap-4 items-start">
                                        <AlertTriangle className="text-error mt-1 flex-shrink-0" />
                                        <div>
                                            <h3 className="text-error font-bold text-sm uppercase tracking-wider mb-1">Bild wurde abgelehnt</h3>
                                            <p className="text-text-secondary text-sm">{brew.moderation_rejection_reason || 'Verstoß gegen die Richtlinien'}</p>
                                        </div>
                                    </div>
                                )}
                                {/* Pending banner removed here because a global moderation banner is shown across the editor */}

                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-accent-purple font-medium mb-1">Label Design</p>
                                        <h2 className="text-lg font-bold text-text-primary">Vorschau & Generator</h2>
                                    </div>
                                    {brew.id && (
                                        <Link
                                            href={`/brew/${brew.id}`}
                                            target="_blank"
                                            className="h-9 w-9 sm:w-auto sm:px-3 flex items-center justify-center gap-2 bg-background border border-border rounded-md hover:bg-surface hover:text-text-primary text-text-secondary transition disabled:opacity-50"
                                            title="Öffentlich ansehen"
                                        >
                                            <Globe size={16} />
                                            <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider">Ansehen</span>
                                        </Link>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    {/* Image Preview */}
                                    <div className="aspect-square bg-background border border-border rounded-lg overflow-hidden flex items-center justify-center p-1">
                                        {brew.image_url ? (
                                            <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover rounded" />
                                        ) : (
                                            <div className="text-center text-text-disabled flex flex-col items-center">
                                                <Tag size={48} className="mb-2 opacity-50" />
                                                <p className="text-sm font-medium uppercase tracking-wider">Noch kein Label generiert</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Controls */}
                                    <div className="space-y-4">
                                        {/* Art Style Selector */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-text-disabled">Stil-Vorgabe</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {LABEL_STYLES.map(s => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => { setLabelStyle(prev => { const next = prev === s.id ? null : s.id; if (next !== prev) setExtraPrompt(''); return next; }); }}
                                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border transition ${
                                                            labelStyle === s.id
                                                                ? 'bg-accent-purple text-white border-accent-purple'
                                                                : 'bg-surface border-border text-text-secondary hover:border-accent-purple/50'
                                                        }`}
                                                    >
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Color Palette Selector */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase font-bold tracking-widest text-text-disabled">Farbpalette</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {COLOR_PALETTES.map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => setLabelColorPalette(prev => prev === p.id ? null : p.id)}
                                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border transition ${
                                                            labelColorPalette === p.id
                                                                ? 'bg-accent-purple text-white border-accent-purple'
                                                                : 'bg-surface border-border text-text-secondary hover:border-accent-purple/50'
                                                        }`}
                                                    >
                                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20" style={{ backgroundColor: p.dot }} />
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] uppercase font-bold tracking-widest text-text-disabled">Zusatz-Prompt (optional)</label>
                                                <button
                                                    onClick={handleGenerateLabelPrompt}
                                                    disabled={generatingLabelPrompt || !brew.name || premiumStatus?.features.aiGenerationsRemaining === 0}
                                                    className="flex items-center gap-1.5 bg-accent-purple/10 hover:bg-accent-purple/20 border border-accent-purple/30 text-accent-purple px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition disabled:opacity-50"
                                                >
                                                    {generatingLabelPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                    BotlGuide
                                                    <AICreditBadge />
                                                </button>
                                            </div>
                                            <textarea
                                                value={extraPrompt}
                                                onChange={(e) => setExtraPrompt(e.target.value)}
                                                className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text-primary min-h-[100px] focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/20 transition resize-none"
                                                placeholder="z.B. Illustrativer Retro-Stil, satten Farben, florale Ornamente"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <button
                                                onClick={handleGenerate}
                                                disabled={generating || uploading || premiumStatus?.features.aiGenerationsRemaining === 0}
                                                className="w-full bg-gradient-to-r from-accent-purple/40 to-like/40 text-text-primary border border-accent-purple/30 font-medium tracking-wide px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 transition disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
                                            >
                                                {generating ? (
                                                    <>
                                                        <Loader2 className="animate-spin" />
                                                        <span>Wird generiert...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles />
                                                        <span>BotlGuide — Label generieren</span>
                                                        <AICreditBadge />
                                                    </>
                                                )}
                                            </button>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => {
                                                        setLegalModalType('label');
                                                        setLegalModalOpen(true);
                                                    }}
                                                    disabled={uploading || generating}
                                                    className="px-4 py-3 bg-surface border border-border text-text-secondary rounded-xl text-sm font-medium hover:bg-surface-hover hover:text-text-primary transition disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
                                                >
                                                    {uploading ? <Loader2 className="animate-spin" /> : <Upload size={16} />}
                                                    {uploading ? 'Upload...' : 'Upload'}
                                                </button>
                                                <button
                                                    onClick={() => setBrew(prev => ({ ...prev, image_url: '/default_label/default.png' }))}
                                                    disabled={uploading || generating || !brew.image_url || brew.image_url === '/default_label/default.png'}
                                                    className="px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text-muted hover:text-error hover:border-error/50 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                                                    title="Label entfernen"
                                                >
                                                    <Trash2 size={16} /> Reset
                                                </button>
                                            </div>
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
                            <div className="space-y-6 text-text-primary">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    {/* Cap Preview */}
                                    <div className="aspect-square bg-background border border-border rounded-lg overflow-hidden flex items-center justify-center p-1">
                                        <CrownCap
                                            content={brew.cap_url}
                                            tier="gold"
                                            size="lg"
                                            className="hover:scale-105 transition-transform duration-500 cursor-pointer"
                                        />
                                    </div>

                                    {/* Controls */}
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-brand font-medium mb-1">Digitale Abzeichen</p>
                                            <h2 className="text-lg font-bold text-text-primary">Kronkorken-Designer</h2>
                                            <p className="text-text-muted text-sm mt-1 leading-relaxed">
                                                Wähle ein Symbol für dein digitales Sammlerstück. Dieses Abzeichen wird an User vergeben, die deine Flaschen scannen.
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-text-disabled mb-2">Farbe</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full border border-border flex-shrink-0" style={{ background: brew.cap_url || '#111827' }} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-text-primary">Automatisch zugewiesen</span>
                                                    <button
                                                        onClick={() => setBrew(prev => ({ ...prev, cap_url: pickRandomCapColor() }))}
                                                        className="text-xs mt-1 px-3 py-1 rounded-full bg-surface border border-border text-text-secondary hover:text-text-primary transition w-fit"
                                                    >Neue Farbe</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <button
                                                className="w-full bg-gradient-to-r from-accent-purple/40 to-like/40 border border-accent-purple/30 text-text-primary font-medium px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-accent-purple/20 transition disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
                                                onClick={handleGenerateCap}
                                                disabled={generatingCap || uploadingCap || premiumStatus?.features.aiGenerationsRemaining === 0}
                                            >
                                                {generatingCap ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={18} />
                                                        <span className="text-sm font-medium">Generiere...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={18} />
                                                        <span className="text-sm font-medium">BotlGuide — Kronkorken generieren</span>
                                                        <AICreditBadge />
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                className="w-full bg-surface border border-border hover:border-border-hover px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary disabled:opacity-50 min-h-[44px] text-sm font-medium"
                                                onClick={() => {
                                                    setLegalModalType('cap');
                                                    setLegalModalOpen(true);
                                                }}
                                                disabled={generatingCap || uploadingCap}
                                            >
                                                {uploadingCap ? (
                                                    <Loader2 className="animate-spin" size={18} />
                                                ) : (
                                                    <>
                                                        <Upload size={18} />
                                                        <span>Eigener Icon-Upload</span>
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
                                        <p className="text-xs uppercase tracking-[0.2em] text-success font-medium mb-1">Bewertungen</p>
                                        <h2 className="text-lg font-bold text-text-primary">Verwalten & Moderieren</h2>
                                    </div>
                                    <button
                                        onClick={() => loadRatings(brew.id!)}
                                        disabled={ratingsLoading}
                                        className="h-9 w-9 sm:w-auto sm:px-3 flex items-center justify-center gap-2 bg-background border border-border rounded-md hover:bg-surface hover:text-text-primary text-text-secondary transition disabled:opacity-50"
                                        title="Bewertungen aktualisieren"
                                    >
                                        <RefreshCw size={14} className={`${ratingsLoading ? 'animate-spin' : ''}`} />
                                        <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider">Aktualisieren</span>
                                    </button>
                                </div>

                                {ratingsMessage && (
                                    <div className="bg-background border border-border rounded-lg px-4 py-3 text-sm text-text-primary">
                                        {ratingsMessage}
                                    </div>
                                )}

                                {ratingsLoading ? (
                                    <div className="text-text-muted text-sm">Lade Bewertungen…</div>
                                ) : ratings.length === 0 ? (
                                    <div className="text-text-muted text-sm">Noch keine Bewertungen vorhanden.</div>
                                ) : (
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                        {ratings.map((r) => (
                                            <div key={r.id} className="bg-background border border-border rounded-lg p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-bg to-brand-bg border border-border-hover flex items-center justify-center text-text-primary font-bold text-sm">
                                                            {((r.author_name || r.name || 'A') as string)[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-text-primary text-sm">{r.author_name || r.name || 'Anonym'}</p>
                                                            <p className="text-[11px] text-text-muted uppercase tracking-wide font-medium">
                                                                {new Date(r.created_at).toLocaleDateString('de-DE')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex text-rating">
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <Star key={s} className={`w-3.5 h-3.5 ${r.rating >= s ? 'opacity-100' : 'opacity-30'}`} fill="currentColor" />
                                                            ))}
                                                        </div>
                                                        <span className="text-sm font-bold text-text-primary">{r.rating}</span>
                                                    </div>
                                                </div>

                                                {r.comment && (
                                                    <p className="text-text-secondary text-sm leading-relaxed mt-3">{r.comment}</p>
                                                )}

                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 gap-4 pt-4 border-t border-border">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${r.moderation_status === 'auto_approved' || r.moderation_status === 'approved'
                                                                ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                                                : r.moderation_status === 'rejected'
                                                                    ? 'bg-error'
                                                                    : 'bg-rating animate-pulse'
                                                            }`} />
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">
                                                            {r.moderation_status || 'pending'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 sm:flex items-stretch gap-2 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => moderateRating(r.id, 'approved')}
                                                            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${r.moderation_status === 'approved' || r.moderation_status === 'auto_approved'
                                                                    ? 'bg-success/10 text-success border-success/30'
                                                                    : 'bg-surface text-text-muted border-border hover:border-success/50 hover:text-success'
                                                                }`}
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            <span>Freigeben</span>
                                                        </button>
                                                        <button
                                                            onClick={() => moderateRating(r.id, 'rejected')}
                                                            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${r.moderation_status === 'rejected'
                                                                    ? 'bg-surface text-error border-error/50'
                                                                    : 'bg-surface text-text-muted border-border hover:border-error/30 hover:text-error'
                                                                }`}
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            <span>Ablehnen</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('Möchtest du diese Bewertung wirklich permanent löschen?')) removeRating(r.id);
                                                            }}
                                                            className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-2 bg-surface text-text-disabled border border-border rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-error/20 hover:text-error hover:border-error/50 transition-all duration-300"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
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

                        {activeTab === 'flavor' && (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-brand font-medium mb-1">Gamification</p>
                                    <h2 className="text-lg font-bold text-text-primary">Beat the Brewer — Geschmacksprofil</h2>
                                    <p className="text-sm text-text-secondary mt-1 max-w-xl">Definiere, wie dein Bier schmecken soll. Trinker können dann versuchen, dein Profil blind zu treffen — und du erhältst wertvolle Sensorik-Daten.</p>
                                </div>
                                <FlavorProfileEditor
                                    value={brew.flavor_profile ?? null}
                                    onChange={(fp) => setBrew(prev => ({ ...prev, flavor_profile: fp }))}
                                    brewStyle={brew.style || null}
                                    brewId={brewId}
                                    brewData={{
                                        brewType: brew.brew_type,
                                        style: brew.style,
                                        name: brew.name,
                                        abv: brew.data?.abv ? parseFloat(String(brew.data.abv)) : undefined,
                                        ibu: brew.data?.ibu ? parseFloat(String(brew.data.ibu)) : undefined,
                                        og: brew.data?.og ? parseFloat(String(brew.data.og)) : undefined,
                                        fg: brew.data?.fg ? parseFloat(String(brew.data.fg)) : undefined,
                                        colorEBC: brew.data?.color ? parseFloat(String(brew.data.color)) : undefined,
                                        malts: formatIngredientsForPrompt(brew.data?.malts),
                                        hops: formatIngredientsForPrompt(brew.data?.hops),
                                        yeast: formatIngredientsForPrompt(brew.data?.yeast),
                                        boilMinutes: brew.data?.boil_time ? parseFloat(String(brew.data.boil_time)) : undefined,
                                    }}
                                />
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-medium mb-1">Konfiguration</p>
                                    <h2 className="text-lg font-bold text-text-primary">Einstellungen & Aktionen</h2>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-border">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary border-l-2 border-brand pl-3 flex items-center gap-3 mb-6">
                                        <span className="text-text-secondary"><Eye className="w-4 h-4" /></span>
                                        Sichtbarkeit
                                    </h3>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-surface/20 border border-border rounded-lg p-4">
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-text-primary mb-0.5">{brew.is_public ? 'Status: Öffentlich' : 'Status: Privat'}</div>
                                            <div className="text-xs text-text-muted">Öffentliche Rezepte sind für alle Nutzer & Brauereien sichtbar.</div>
                                        </div>
                                        <div className="w-full sm:w-auto">
                                            <Toggle label="Öffentlich" checked={brew.is_public} onChange={(val) => setBrew(prev => ({ ...prev, is_public: val }))} />
                                        </div>
                                    </div>
                                </div>

                                {brew.id && (
                                    <div className="bg-surface border border-error/20 rounded-2xl p-6 space-y-4">
                                        <h3 className="text-error text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            Danger Zone
                                        </h3>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="text-text-primary font-bold text-sm mb-1">Rezept löschen</h4>
                                                <p className="text-text-muted text-xs max-w-md">
                                                    Diese Aktion kann nicht rückgängig gemacht werden. Alle verknüpften Flaschen werden zurückgesetzt.
                                                    Label-Bilder und Kronkorken werden ebenfalls vom Server gelöscht.
                                                </p>
                                            </div>
                                            <button
                                                onClick={deleteBrew}
                                                disabled={saving}
                                                className="bg-red-900 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {saving ? 'Lösche...' : 'Rezept löschen'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                    </div>
                </div>

                <FormulaInspector
                    isOpen={inspectorOpen}
                    onClose={() => setInspectorOpen(false)}
                    type={inspectorType}
                    data={{
                        batchSize: safeFloat(brew.data?.batch_size_liters),
                        ogPlato: safeFloat(brew.data?.og),
                        fgPlato: safeFloat(brew.data?.fg),
                        efficiency: safeFloat(brew.data?.efficiency) || 75,
                        mashWater: safeFloat(brew.data?.mash_water_liters),
                        spargeWater: safeFloat(brew.data?.sparge_water_liters),
                        hops: brew.data?.hops || [],
                        malts: brew.data?.malts || [],
                        boilTime: safeFloat(brew.data?.boil_time) || 60,
                        // Equipment profile config (stored in recipe data)
                        boilOffRate:      safeFloat(brew.data?.boil_off_rate)    || undefined,
                        trubLoss:         safeFloat(brew.data?.trub_loss)        || undefined,
                        grainAbsorption:  safeFloat(brew.data?.grain_absorption) || undefined,
                        coolingShrinkage: safeFloat(brew.data?.cooling_shrinkage)|| undefined,
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


            </div>
        </div>
    );
}
