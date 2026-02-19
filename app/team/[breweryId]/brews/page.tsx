'use client';

import { useEffect, useState, use } from 'react';
import { getBreweryMembers } from '@/lib/supabase';
import { useSupabase } from '@/lib/hooks/useSupabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { getBreweryTierConfig, type BreweryTierName } from '@/lib/tier-system';
import BottlesModal from './components/BottlesModal';
import CustomSelect from '@/app/components/CustomSelect';
import { removeBrewFromLibrary } from '@/lib/actions/library-actions';
import { useGlobalToast } from '@/app/context/AchievementNotificationContext';
import { getPremiumStatus, getBreweryPremiumStatus } from '@/lib/actions/premium-actions';
import { type PremiumStatus } from '@/lib/premium-config';
import { 
    Plus, 
    Beer, 
    Lock, 
    Eye, 
    Globe, 
    Wine, 
    Star, 
    Library, 
    X,
    MoreHorizontal,
    Search,
    Filter,
    ArrowUpDown,
    ArrowUpRight,
    Trash2,
    Calendar,
    Users,
    LayoutGrid,
    BarChart3
} from 'lucide-react';

export default function TeamBrewsPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const supabase = useSupabase();
  const { breweryId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [brews, setBrews] = useState<any[]>([]);
  const [savedBrews, setSavedBrews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  
  const [breweryTier, setBreweryTier] = useState<BreweryTierName>('garage');
  const [brewRatings, setBrewRatings] = useState<{ [key: string]: { avg: number; count: number } }>({});
  const [bottlesModalOpen, setBottlesModalOpen] = useState(false);
  const [selectedBrew, setSelectedBrew] = useState<{ id: string; name: string } | null>(null);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');

  const { showToast } = useGlobalToast();

  async function handleRemoveSaved(brewId: string) {
       try {
           await removeBrewFromLibrary(breweryId, brewId);
           setSavedBrews(prev => prev.filter(b => b.id !== brewId));
           showToast("Entfernt", "Rezept wurde aus der Bibliothek entfernt.", "info");
       } catch(e: any) {
           showToast("Fehler", "Das Rezept konnte nicht entfernt werden.", "warning");
       }
  }

  useEffect(() => {
    if (!authLoading) {
        checkPermissionAndLoad();
    }
  }, [breweryId, user, authLoading]);

  async function checkPermissionAndLoad() {
    try {
      setLoading(true);

      let memberStatus = false;
      let currentUserId = user?.id;

      if (user) {
        // Fetch Own Brews - Added moderation status fields
        const { data: ownBrews } = await supabase.from('brews').select('*, moderation_status, moderation_rejection_reason, bottles(id, count)').eq('brewery_id', breweryId).order('created_at', { ascending: false });
        setBrews(ownBrews || []);

        // Fetch Saved Brews - Added moderation status fields
        const { data: savedData } = await supabase
            .from('brewery_saved_brews')
            .select(`
                saved_at,
                brew:brews (
                    id, name, style, image_url, is_public, created_at,
                    moderation_status, moderation_rejection_reason,
                    profiles(display_name),
                    breweries(name)
                )
            `)
            .eq('brewery_id', breweryId)
            .order('saved_at', { ascending: false });
        
        if (savedData) {
            setSavedBrews(savedData.map((item: any) => ({
                ...item.brew,
                saved_at: item.saved_at
            })));
        }

        // Fetch Brewery Tier
        const { data: brewery } = await supabase
			.from('breweries')
			.select('tier')
			.eq('id', breweryId)
			.maybeSingle();
		
		if (brewery) {
			setBreweryTier((brewery.tier as BreweryTierName) || 'garage');
		}

        // Check Membership
        const members = await getBreweryMembers(breweryId);
        const isUserMember = members.some((m: any) => m.user_id === user.id);
        setIsMember(isUserMember);
        memberStatus = isUserMember;
      } else {
        setIsMember(false);
      }

      // Load Brews
      let query = supabase
        .from('brews')
        .select('*, bottles(count)')
        .eq('brewery_id', breweryId)
        .order('created_at', { ascending: false });

      if (!memberStatus) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setBrews(data || []);

        // Load Premium Status for the brewery (based on OWNER subscription)
        const breweryStatus = await getBreweryPremiumStatus(breweryId);
        setPremiumStatus(breweryStatus);

      // Load Ratings
      if (data && data.length > 0) {
          const brewIds = data.map((b) => b.id);
          const { data: ratingData } = await supabase
					.from('ratings')
					.select('brew_id, rating')
					.in('brew_id', brewIds)
					.eq('moderation_status', 'auto_approved');

            if (ratingData) {
                const stats: { [key: string]: { sum: number; count: number } } = {};
                ratingData.forEach((r) => {
                    if (!stats[r.brew_id]) stats[r.brew_id] = { sum: 0, count: 0 };
                    stats[r.brew_id].sum += r.rating;
                    stats[r.brew_id].count += 1;
                });

                const finalRatings: { [key: string]: { avg: number; count: number } } = {};
                Object.keys(stats).forEach((id) => {
                    finalRatings[id] = {
                        avg: Math.round((stats[id].sum / stats[id].count) * 10) / 10,
                        count: stats[id].count,
                    };
                });
                setBrewRatings(finalRatings);
            }
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVisibility(id: string, currentState: boolean) {
      if (!isMember) return;
      
      const { error } = await supabase
        .from('brews')
        .update({ is_public: !currentState })
        .eq('id', id)
        .eq('brewery_id', breweryId); 

      if (!error) {
        setBrews(brews.map((b) => (b.id === id ? { ...b, is_public: !currentState } : b)));
      } else {
        alert('Fehler beim Ändern der Sichtbarkeit: ' + error.message);
      }
  }

  // Tier Config Limit Check (Brewery Based)
  const tierConfig = getBreweryTierConfig(breweryTier);
  const organicLimitReached = brews.length >= tierConfig.limits.maxBrews;
  const bypassed = premiumStatus?.features.bypassBrewLimits ?? false;
  const isLimitReached = organicLimitReached && !bypassed;

  // Filter Logic
  const filteredBrews = brews.filter(brew => {
      const matchesSearch = brew.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (brew.style || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filterType === 'ALL' 
            ? true 
            : filterType === 'PUBLIC' 
                ? brew.is_public 
                : !brew.is_public; // PRIVATE

      return matchesSearch && matchesFilter;
  }).sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortOrder === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
  });

  const publicCount = brews.filter(b => b.is_public).length;
  const privateCount = brews.filter(b => !b.is_public).length;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-zinc-900 animate-pulse rounded-2xl border border-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* HEADER SECTION (Outside Grid) */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-8">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Brau-Bibliothek</h1>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${
                            breweryTier === 'industrial' ? 'bg-blue-950/30 text-blue-400 border-blue-900' :
                            breweryTier === 'craft' ? 'bg-purple-950/30 text-purple-400 border-purple-900' :
                            breweryTier === 'micro' ? 'bg-cyan-950/30 text-cyan-400 border-cyan-900' :
                            'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                            {breweryTier} Tier
                    </span>
                </div>
                <p className="text-sm text-zinc-500">Verwalte deine Rezepte, dokumentiere Sude und behalte den Überblick.</p>
            </div>

            <div className="flex items-center gap-4">
                 {isMember && (
                    <button
                        onClick={() => {
                            if (isLimitReached) {
                                alert(`Die Brauerei hat das Limit für den ${tierConfig.displayName}-Status erreicht (${tierConfig.limits.maxBrews} Rezepte).`);
                                return;
                            }
                            router.push(`/team/${breweryId}/brews/new`);
                        }}
                        className={`
                            px-4 py-2 rounded-md font-bold text-sm transition-all shadow-sm flex items-center gap-2
                            ${isLimitReached 
                                ? 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-800' 
                                : 'bg-white hover:bg-zinc-200 text-black border border-transparent'
                            }
                        `}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Rezept erstellen</span>
                    </button>
                 )}

                 <div className="h-8 w-px bg-zinc-800 hidden md:block"></div>
                 <div className="text-right hidden md:block">
                    <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-0.5">Kapazität</p>
                    <p className="text-zinc-300 font-mono text-xs text-right">
                        {bypassed ? <span className="text-emerald-500">∞</span> : `${brews.length} / ${tierConfig.limits.maxBrews}`}
                    </p>
                 </div>
            </div>
      </header>
      
      {/* MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start relative">
         
         {/* LEFT COLUMN: Sidebar (Sticky) */}
         <div className="space-y-6 lg:sticky lg:top-8 z-20">
             
             {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider relative z-10">Öffentlich</div>
                    <div className="text-2xl font-mono font-bold text-emerald-400 relative z-10">{publicCount}</div>
                </div>
                <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="text-amber-500 text-xs font-bold uppercase tracking-wider relative z-10">Privat</div>
                    <div className="text-2xl font-mono font-bold text-amber-400 relative z-10">
                        {privateCount}
                    </div>
                </div>
            </div>

            {/* Sort & Filters */}
            <div className="hidden lg:block md:bg-black border border-zinc-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Filter className="w-4 h-4 text-zinc-400" />
                        Sortieren
                    </h3>
                </div>
                <div className="p-2 space-y-1">
                     <button
                        onClick={() => setSortOrder('newest')}
                        className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${sortOrder === 'newest' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Calendar className="w-3.5 h-3.5" />
                            Neueste zuerst
                        </div>
                        {sortOrder === 'newest' && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                     </button>
                     <button
                        onClick={() => setSortOrder('oldest')}
                        className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${sortOrder === 'oldest' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <div className="flex items-center gap-3">
                             <Calendar className="w-3.5 h-3.5" />
                             Älteste zuerst
                        </div>
                        {sortOrder === 'oldest' && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                     </button>
                     <button
                        onClick={() => setSortOrder('name')}
                        className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${sortOrder === 'name' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                         <div className="flex items-center gap-3">
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            Name (A-Z)
                        </div>
                        {sortOrder === 'name' && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                     </button>
                </div>
            </div>

            <div className="hidden lg:block md:bg-black border border-zinc-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Eye className="w-4 h-4 text-zinc-400" />
                        Sichtbarkeit
                    </h3>
                </div>
                <div className="p-2 space-y-1">
                     <button
                        onClick={() => setFilterType('ALL')}
                        className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Library className="w-3.5 h-3.5" />
                            Alle Rezepte
                        </div>
                        {filterType === 'ALL' && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                     </button>
                     <button
                        onClick={() => setFilterType('PUBLIC')}
                        className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${filterType === 'PUBLIC' ? 'bg-zinc-900 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <div className="flex items-center gap-3">
                             <Globe className="w-3.5 h-3.5" />
                             Nur öffentliche
                        </div>
                        {filterType === 'PUBLIC' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                     </button>
                     <button
                        onClick={() => setFilterType('PRIVATE')}
                        className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${filterType === 'PRIVATE' ? 'bg-zinc-900 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                         <div className="flex items-center gap-3">
                            <Lock className="w-3.5 h-3.5" />
                            Nur private
                        </div>
                        {filterType === 'PRIVATE' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                     </button>
                </div>
            </div>

         </div>

         {/* RIGHT COLUMN: Content */}
         <div className="space-y-8">
            
            {/* Toolbar */}
            <div className="flex flex-col gap-4 bg-zinc-900/30 p-1 rounded-xl border border-zinc-800/50">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Rezept suchen..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-sm text-white pl-9 pr-3 py-2 focus:outline-none placeholder:text-zinc-600 rounded-lg"
                        />
                    </div>
                </div>

                {/* Mobile Filters */}
                <div className="grid grid-cols-2 gap-2 lg:hidden px-1 pb-1">
                    <CustomSelect
                        value={sortOrder}
                        onChange={(val: any) => setSortOrder(val)}
                        options={[
                            { value: 'newest', label: 'Neueste zuerst' },
                            { value: 'oldest', label: 'Älteste zuerst' },
                            { value: 'name', label: 'Name (A-Z)' }
                        ]}
                    />

                    <CustomSelect
                        value={filterType}
                        onChange={(val: any) => setFilterType(val)}
                        options={[
                            { value: 'ALL', label: 'Alle Rezepte' },
                            { value: 'PUBLIC', label: 'Nur öffentliche' },
                            { value: 'PRIVATE', label: 'Nur private' }
                        ]}
                    />
                </div>
            </div>

            {/* SECTION 1: EIGENE REZEPTE */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {filteredBrews.length === 0 ? (
                    <div className="col-span-full text-center p-8 text-zinc-500">
                        Keine Rezepte gefunden.
                    </div>
                ) : (
                    filteredBrews.map((brew) => (
                    <div
                        key={brew.id}
                        className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors group flex flex-col h-full relative"
                    >
                        {/* Image Section */}
                        <div className="aspect-[4/3] relative bg-zinc-900 overflow-hidden border-b border-zinc-900">
                            <div 
                                className="absolute inset-0 z-0 cursor-pointer"
                                onClick={() => router.push(`/team/${breweryId}/brews/${brew.id}/edit`)}
                            >
                             {brew.image_url ? (
                                <img
                                    src={brew.image_url}
                                    alt={brew.name}
                                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-800 bg-zinc-900/50">
                                    <Beer className="w-10 h-10 mb-2 opacity-50" strokeWidth={1} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Kein Label</span>
                                </div>
                            )}
                            {/* Gradient Overlay for better contrast of overlay badges */}
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60 pointer-events-none" />
                        </div>

                        
                        {/* Top Left: Style Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start pointer-events-none z-10">
                            <span className="bg-zinc-950/80 backdrop-blur-md text-[10px] px-2 py-0.5 rounded uppercase tracking-wider border border-zinc-800 font-bold text-zinc-300">
                                {brew.style || 'Standard'}
                            </span>
                        </div>

                        {/* Top Right: Admin Actions (Overlay) */}
                        {isMember && (
                            <div className="absolute top-1.5 right-1.5 flex gap-1 z-20">
                                 <button
                                    onClick={(e) => { e.stopPropagation(); toggleVisibility(brew.id, brew.is_public); }}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg backdrop-blur-md border transition-all active:scale-95 ${brew.is_public ? 'bg-zinc-900/80 text-emerald-400 border-zinc-800 hover:bg-zinc-800' : 'bg-zinc-900/80 text-red-400 border-zinc-800 hover:bg-zinc-800'}`}
                                    aria-label={brew.is_public ? 'Sichtbar (Umschalten auf Privat)' : 'Privat (Umschalten auf Öffentlich)'}
                                >
                                    {brew.is_public ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                </button>
                                <Link
                                    href={`/brew/${brew.id}`}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition active:scale-95"
                                    aria-label="Öffentliche Seite öffnen"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Globe className="w-4 h-4" />
                                </Link>
                                
                                {/* Bottle Button - Only if bottles exist */}
                                {brew.bottles?.[0]?.count > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedBrew({ id: brew.id, name: brew.name });
                                            setBottlesModalOpen(true);
                                        }}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition active:scale-95"
                                        title="Flaschen verwalten"
                                    >
                                        <Wine className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Bottom Right: Rating Badge */}
                        {brewRatings[brew.id] && (
                            <div className="absolute bottom-3 right-3 pointer-events-none z-10">
                                <div className="bg-black/80 backdrop-blur-md text-amber-400 font-bold px-2 py-1 rounded-lg text-[10px] flex items-center gap-1.5 border border-zinc-800">
                                    <Star className="w-3 h-3 fill-amber-400" />
                                    <span className="text-white">{brewRatings[brew.id].avg}</span>
                                    <span className="text-zinc-500 font-normal">({brewRatings[brew.id].count})</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="p-4 flex flex-col flex-1 gap-3">
                        
                        {/* Header */}
                        <div>
                            <Link
                                href={`/team/${breweryId}/brews/${brew.id}/edit`}
                                className="block font-bold text-base leading-tight break-words text-white hover:text-cyan-400 transition line-clamp-2"
                            >
                                {brew.name}
                            </Link>
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                                 <span>{new Date(brew.created_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                 <span>•</span>
                                 <span className={brew.is_public ? 'text-emerald-500' : 'text-zinc-500'}>
                                    {brew.is_public ? 'Öffentlich' : 'Privat'}
                                 </span>
                                 {brew.remix_parent_id && (
                                    <>
                                        <span>•</span>
                                        <span className="text-purple-400">Remix</span>
                                    </>
                                 )}
                            </div>
                        </div>

                       {/* Main Action Buttons */}
                       {!isMember && (
                            <div className="mt-auto pt-2">
                                 <Link
                                    href={`/brew/${brew.id}`}
                                    className="block w-full bg-zinc-900 hover:bg-zinc-800 text-white h-10 flex items-center justify-center rounded-lg border border-zinc-800 text-xs font-bold uppercase tracking-wider transition"
                                >
                                    Rezept ansehen
                                </Link>
                            </div>
                       )}
                    </div>
                </div>
              ))
            )}
            </div>
            
            {/* SECTION 2: SAVED BREWS */}
            {savedBrews.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                     <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 pt-8 border-t border-zinc-800 mt-8">
                          <Library className="w-5 h-5 text-zinc-400" /> Bibliothek <span className="text-zinc-500 text-sm font-normal">({savedBrews.length})</span>
                      </h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {savedBrews.map((brew) => (
                          <div
                              key={brew.id}
                              className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors group flex flex-col h-full relative"
                          >
                              {/* Image Section */}
                              <Link href={`/brew/${brew.id}`} className="block aspect-[4/3] relative bg-zinc-900 overflow-hidden border-b border-zinc-900">
                                   {brew.image_url ? (
                                      <img
                                          src={brew.image_url}
                                          alt={brew.name}
                                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                                      />
                                  ) : (
                                      <div className="flex flex-col items-center justify-center h-full text-zinc-800 bg-zinc-900/50">
                                          <Beer className="w-8 h-8 opacity-50" strokeWidth={1} />
                                      </div>
                                  )}
                                  
                                  {/* Remove Button (Corner) */}
                                  {isMember && (
                                      <button
                                         onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveSaved(brew.id); }}
                                         className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/60 text-zinc-400 hover:text-white hover:bg-red-500 flex items-center justify-center transition opacity-0 group-hover:opacity-100 backdrop-blur-md"
                                         title="Aus Bibliothek entfernen"
                                      >
                                         <X className="w-3.5 h-3.5" />
                                      </button>
                                  )}

                                   <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start pointer-events-none z-10">
                                      <span className="bg-zinc-950/80 backdrop-blur-md text-[10px] px-2 py-0.5 rounded uppercase tracking-wider border border-zinc-800 font-bold text-zinc-300">
                                          {brew.style || 'Standard'}
                                      </span>
                                  </div>
                              </Link>

                              <div className="p-4 flex flex-col flex-1 gap-2"> 
                                  <Link href={`/brew/${brew.id}`} className="font-bold text-sm text-white hover:text-cyan-400 transition truncate block">
                                      {brew.name}
                                  </Link>
                                  <p className="text-[10px] text-zinc-500 font-medium truncate">
                                      von <span className="text-zinc-300 hover:text-white transition">{brew.profiles?.display_name || brew.breweries?.name || 'Unbekannt'}</span>
                                  </p>
                                   <div className="mt-auto pt-3">
                                      <Link
                                          href={`/brew/${brew.id}`}
                                          className="block w-full bg-zinc-900 border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white h-8 flex items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
                                      >
                                          Ansehen
                                      </Link>
                                  </div>
                              </div>
                          </div>
                        ))}
                     </div>
                </div>
            )}
            
         </div> {/* End Right Column */}

      </div> {/* End Main Grid */}

      {bottlesModalOpen && selectedBrew && (
        <BottlesModal 
            isOpen={bottlesModalOpen}
            onClose={() => setBottlesModalOpen(false)}
            brewId={selectedBrew.id}
            brewName={selectedBrew.name}
        />
      )}
    </div>
  );
}

