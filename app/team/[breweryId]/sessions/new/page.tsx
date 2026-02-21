'use client';

import { useEffect, useState, use } from 'react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ArrowLeft, Beaker, Calendar, Library, Search, Hash, Play, Beer, ChevronRight, BookOpen, FlaskConical } from 'lucide-react';
import { type EquipmentProfile, profileToConfig, BREW_METHOD_LABELS } from '@/lib/types/equipment';

export default function NewSessionPage({ params }: { params: Promise<{ breweryId: string }> }) {
    const supabase = useSupabase();
    const { breweryId } = use(params);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
    const [batchCode, setBatchCode] = useState('');
    const [brewedAt, setBrewedAt] = useState(new Date().toISOString().split('T')[0]);

    // Scaling State
    const [scaleVolume, setScaleVolume] = useState<number>(20);
    const [scaleEfficiency, setScaleEfficiency] = useState<number>(65);
    const [originalVolume, setOriginalVolume] = useState<number>(20);
    const [originalEfficiency, setOriginalEfficiency] = useState<number>(65);

    // Equipment Profile State
    const [equipmentProfiles, setEquipmentProfiles] = useState<EquipmentProfile[]>([]);
    const [selectedEquipmentProfileId, setSelectedEquipmentProfileId] = useState<string>('');
    const [profileLoadedName, setProfileLoadedName] = useState<string | null>(null);

    useEffect(() => {
        if (!user || authLoading) return;
        (supabase as any)
            .from('equipment_profiles')
            .select('*')
            .eq('brewery_id', breweryId)
            .order('is_default', { ascending: false })
            .then(({ data }: { data: EquipmentProfile[] | null }) => {
                if (!data) return;
                setEquipmentProfiles(data);
                const def = data.find(p => p.is_default);
                if (def) {
                    setSelectedEquipmentProfileId(def.id);
                    setProfileLoadedName(def.name);
                    setScaleEfficiency(def.default_efficiency ?? 65);
                }
            });
    }, [breweryId, user, authLoading]);

    useEffect(() => {
        if (selectedRecipeId) {
            const recipe = recipes.find(r => r.id === selectedRecipeId);
            if (recipe && recipe.data) {
                const bVol = parseFloat(String(recipe.data.batch_size || 20).replace(',', '.'));
                const bEff = parseFloat(String(recipe.data.efficiency || 65).replace(',', '.'));
                
                setOriginalVolume(bVol || 20);
                setOriginalEfficiency(bEff || 65);
                setScaleVolume(bVol || 20);
                setScaleEfficiency(bEff || 65);
            }
        }
    }, [selectedRecipeId, recipes]);

    useEffect(() => {
        async function loadRecipes() {
            if (authLoading) return;
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // 1. Fetch Own Recipes
                const { data: ownData, error: ownError } = await supabase
                    .from('brews')
                    .select('*')
                    .eq('brewery_id', breweryId)
                    .order('name', { ascending: true });

                if (ownError) throw ownError;

                // 2. Fetch Saved Brews from Library
                const { data: savedData, error: savedError } = await supabase
                    .from('brewery_saved_brews')
                    .select(`
                brew_id,
                brews (*)
            `)
                    .eq('brewery_id', breweryId);

                if (savedError) throw savedError;

                const ownBrews = (ownData || []).map(b => ({ ...b, sourceGroup: 'own' }));

                // Extract brews from library
                const savedBrewsRaw = savedData?.map((item: any) => item.brews).filter(b => b !== null) || [];

                // Filter out duplicates
                const ownIds = new Set(ownBrews.map(b => b.id));
                const savedBrews = savedBrewsRaw
                    .filter((b: any) => !ownIds.has(b.id))
                    .map((b: any) => ({ ...b, sourceGroup: 'saved' }));

                const allRecipes = [...ownBrews, ...savedBrews];
                setRecipes(allRecipes);

                // Auto-select first recipe if available
                if (allRecipes.length > 0) {
                    setSelectedRecipeId(allRecipes[0].id);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadRecipes();
    }, [breweryId, user, authLoading]);

    useEffect(() => {
        // Auto-generate batch code
        const year = new Date().getFullYear().toString().slice(-2);
        // This is a simple client-side generation, in a real app check DB for last batch
        setBatchCode(`B${year}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
    }, []);

    async function handleCreate() {
        if (!selectedRecipeId) return;

        try {
            setCreating(true);

            // Fetch the recipe name for a default note or title if needed
            const recipe = recipes.find(r => r.id === selectedRecipeId);

            const { data, error } = await supabase
                .from('brewing_sessions')
                .insert({
                    brewery_id: breweryId,
                    brew_id: selectedRecipeId,
                    batch_code: batchCode,
                    brewed_at: brewedAt,
                    status: 'planned',
                    measurements: {
                        target_volume: scaleVolume,
                        target_efficiency: scaleEfficiency,
                        original_volume: originalVolume,
                        original_efficiency: originalEfficiency,
                        ...(selectedEquipmentProfileId ? (() => {
                            const p = equipmentProfiles.find(x => x.id === selectedEquipmentProfileId);
                            if (!p) return {};
                            const cfg = profileToConfig(p);
                            return {
                                equipment_profile_id:   p.id,
                                equipment_profile_name: p.name,
                                boil_off_rate:     cfg.boilOffRate,
                                trub_loss:         cfg.trubLoss,
                                grain_absorption:  cfg.grainAbsorption,
                                cooling_shrinkage: cfg.coolingShrinkage,
                                mash_thickness:    cfg.mashThickness,
                            };
                        })() : {})
                    },
                    notes: `Session gestartet für ${recipe?.name || 'Rezept'}`
                })
                .select()
                .single();

            if (error) throw error;

            router.push(`/team/${breweryId}/sessions/${data.id}`);

        } catch (err: any) {
            console.error(err);
            alert('Fehler beim Erstellen: ' + err.message);
            setCreating(false);
        }
    }

    const filteredRecipes = recipes.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.style && r.style.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const ownRecipes = filteredRecipes.filter(r => r.sourceGroup === 'own');
    const savedRecipes = filteredRecipes.filter(r => r.sourceGroup === 'saved');

    const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <Beaker className="w-12 h-12 text-zinc-800" />
                    <p className="text-zinc-500 font-medium">Lade Rezepte...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="font-sans">
            <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4 md:pb-6">
                    <div>
                        <Link
                            href={`/team/${breweryId}/sessions`}
                            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition mb-2"
                        >
                            <ArrowLeft size={16} /> Zurück zur Übersicht
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                            <span className="bg-gradient-to-br from-cyan-500 to-blue-600 bg-clip-text text-transparent">Neue Brausession</span>
                        </h1>
                        <p className="text-zinc-500 mt-1">Wähle ein Rezept und starte deinen Brautag.</p>
                    </div>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN: Recipe Selection */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Rezept suchen..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-12 pr-4 py-4 text-white focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition outline-none placeholder:text-zinc-600"
                            />
                        </div>

                        <div className="space-y-8">
                            {/* Own Recipes Group */}
                            {ownRecipes.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 pl-1">
                                        <Beer size={14} /> Eigene Rezepte
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {ownRecipes.map(recipe => (
                                            <RecipeCard
                                                key={recipe.id}
                                                recipe={recipe}
                                                selected={selectedRecipeId === recipe.id}
                                                onSelect={() => setSelectedRecipeId(recipe.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Saved Recipes Group */}
                            {savedRecipes.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 pl-1 border-t border-zinc-800/50 pt-8 mt-4">
                                        <BookOpen size={14} /> Bibliothek
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {savedRecipes.map(recipe => (
                                            <RecipeCard
                                                key={recipe.id}
                                                recipe={recipe}
                                                selected={selectedRecipeId === recipe.id}
                                                onSelect={() => setSelectedRecipeId(recipe.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {filteredRecipes.length === 0 && (
                                <div className="text-center py-12 border border-zinc-800 border-dashed rounded-xl">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 text-zinc-600 mb-3">
                                        <Search size={24} />
                                    </div>
                                    <p className="text-zinc-500">Keine Rezepte gefunden.</p>
                                    <Link href={`/team/${breweryId}/brews/new`} className="text-cyan-500 hover:text-cyan-400 text-sm font-medium mt-2 inline-block">
                                        + Neues Rezept erstellen
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Configuration Sidebar */}
                    <div className="lg:col-span-4 sticky top-6">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 md:p-6 backdrop-blur-sm">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <span className="w-1 h-6 bg-cyan-500 rounded-full mr-2"></span>
                                Session Details
                            </h2>

                            <div className="space-y-6">
                                {/* Selected Recipe Preview */}
                                <div className="bg-black border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-zinc-800 rounded-md overflow-hidden flex-shrink-0 border border-zinc-700">
                                        {selectedRecipe?.image_url ? (
                                            <img src={selectedRecipe.image_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                <Beer size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Gewähltes Rezept</p>
                                        <p className="font-bold text-white truncate">{selectedRecipe?.name || 'Kein Rezept gewählt'}</p>
                                    </div>
                                </div>

                                {/* Scaling Options */}
                                {selectedRecipe && (
                                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                                        <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-2">
                                            <Beaker size={12} /> Sudplanung
                                        </h3>

                                        {/* Anlage-Dropdown */}
                                        {equipmentProfiles.length > 0 ? (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <FlaskConical size={10} /> Brauanlage
                                                </label>
                                                <select
                                                    value={selectedEquipmentProfileId}
                                                    onChange={e => {
                                                        const id = e.target.value;
                                                        setSelectedEquipmentProfileId(id);
                                                        const p = equipmentProfiles.find(x => x.id === id);
                                                        if (p) {
                                                            setScaleEfficiency(p.default_efficiency ?? 65);
                                                            setProfileLoadedName(p.name);
                                                        } else {
                                                            setProfileLoadedName(null);
                                                        }
                                                    }}
                                                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none transition text-sm appearance-none"
                                                >
                                                    <option value="">— Keine Anlage gewählt —</option>
                                                    {equipmentProfiles.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.is_default ? '★ ' : ''}{p.name} ({BREW_METHOD_LABELS[p.brew_method]}, {p.batch_volume_l} L)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-zinc-500 bg-zinc-900/50 px-3 py-2 rounded border border-zinc-800 flex items-center gap-2">
                                                <FlaskConical size={10} className="flex-shrink-0" />
                                                <span>Keine Brauanlage hinterlegt —</span>
                                                <a href={`/team/${breweryId}/settings?tab=equipment`} className="text-cyan-500 hover:underline font-medium">Jetzt anlegen →</a>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                                                    Zielvolumen (L)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={scaleVolume}
                                                    onChange={(e) => setScaleVolume(parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition outline-none font-mono text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                                                    Effizienz (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={scaleEfficiency}
                                                    onChange={(e) => setScaleEfficiency(parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition outline-none font-mono text-sm"
                                                />
                                                {profileLoadedName && (
                                                    <p className="text-[10px] text-cyan-600">
                                                        ↑ SHA aus Anlage <span className="font-semibold">{profileLoadedName}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {(scaleVolume !== originalVolume || scaleEfficiency !== originalEfficiency) && (
                                            <div className="text-[10px] text-zinc-500 bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                                Die Zutaten werden im Session-Logbuch automatisch auf diese Werte skaliert.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <Hash size={12} /> Batch Code
                                        </label>
                                        <input
                                            type="text"
                                            value={batchCode}
                                            onChange={(e) => setBatchCode(e.target.value)}
                                            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition outline-none font-mono text-sm"
                                            placeholder="z.B. B26-001"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <Calendar size={12} /> Braudatum
                                        </label>
                                        <input
                                            type="date"
                                            value={brewedAt}
                                            onChange={(e) => setBrewedAt(e.target.value)}
                                            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition outline-none text-sm [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-zinc-800">
                                    <button
                                        onClick={handleCreate}
                                        disabled={creating || !selectedRecipeId}
                                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg shadow-cyan-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                    >
                                        {creating ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span>Session starten</span>
                                                <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                    <p className="text-center text-xs text-zinc-600 mt-4">
                                        Das Rezept wird in die neue Session kopiert.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function RecipeCard({ recipe, selected, onSelect }: { recipe: any, selected: boolean, onSelect: () => void }) {
    return (
        <div
            onClick={onSelect}
            className={`
                group relative flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200
                ${selected
                    ? 'bg-cyan-950/10 border-cyan-500/50 ring-1 ring-cyan-500/50'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                }
            `}
        >
            {/* Image */}
            <div className="w-16 h-16 bg-black rounded-md overflow-hidden flex-shrink-0 border border-zinc-800 relative shadow-sm">
                {recipe.image_url ? (
                    <img src={recipe.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-900">
                        <Beer size={24} className="opacity-50" />
                    </div>
                )}
                {/* Source Badge */}
                {recipe.sourceGroup === 'saved' && (
                    <div className="absolute top-0 right-0 bg-blue-600 p-1 rounded-bl-md shadow-sm" title="Aus Bibliothek">
                        <BookOpen size={10} className="text-white" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-base truncate mb-1 ${selected ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                    {recipe.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 capitalize truncate max-w-[120px]">
                        {recipe.style || 'Unbekannt'}
                    </span>
                    {recipe.data?.abv && (
                        <span>{recipe.data.abv}%</span>
                    )}
                </div>
            </div>

            {/* Select Indicator */}
            <div className={`
                w-6 h-6 rounded-full border flex items-center justify-center transition-all
                ${selected
                    ? 'bg-cyan-500 border-cyan-500 text-black scale-100'
                    : 'border-zinc-700 bg-transparent text-transparent group-hover:border-zinc-500'
                }
            `}>
                <div className="w-2.5 h-2.5 bg-current rounded-full" />
            </div>
        </div>
    );
}
