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
    Download,
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
        const { data: ownBrews } = await supabase.from('brews').select('*, moderation_status, moderation_rejection_reason, bottles!bottles_brew_id_fkey(id, count)').eq('brewery_id', breweryId).order('created_at', { ascending: false });
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

      // Load Brews (if memberStatus false, handled here maybe? wait, let's just make sure both are correct)
      let query = supabase
        .from('brews')
        .select('*, bottles!bottles_brew_id_fkey(count)')
        .eq('brewery_id', breweryId)
        .order('created_at', { ascending: false });

      if (!memberStatus) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setBrews(data || []);

        // Load Premium Status for the brewery (based on OWNER subscription)
        try {
          const breweryStatus = await getBreweryPremiumStatus(breweryId);
          setPremiumStatus(breweryStatus);
        } catch (e) {
          console.warn('Premium status check failed (non-fatal):', e);
        }

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

    } catch (error: any) {
      console.error('Error loading data:', error instanceof Error ? error.message : error);
      setErrorMsg(error?.message || JSON.stringify(error) || "Unknown error");
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
            <div key={i} className="h-80 bg-surface animate-pulse rounded-2xl border border-border" />
        ))}
      </div>
    );
  }

  if (errorMsg) {
      return (
          <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
              <div className="flex flex-col items-center gap-4 text-red-500 bg-red-50 p-6 rounded-xl border border-red-200">
                  <div className="text-xl font-bold text-red-600">Error Loading Data</div>
                  <pre className="text-sm font-mono max-w-xl break-words whitespace-pre-wrap">{errorMsg}</pre>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* HEADER SECTION (Outside Grid) */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">Brau-Bibliothek</h1>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${
                            breweryTier === 'industrial' ? 'bg-surface-sunken text-text-muted border-border' :
                            breweryTier === 'craft' ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/30' :
                            breweryTier === 'micro' ? 'bg-brand-bg text-brand border-brand-dim' :
                            'bg-surface text-text-muted border-border'
                    }`}>
                            {breweryTier} Tier
                    </span>
                </div>
                <p className="text-sm text-text-muted">Verwalte deine Rezepte, dokumentiere Sude und behalte den Überblick.</p>
            </div>

            <div className="flex items-center gap-4">
                 {isMember && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push(`/team/${breweryId}/brews/import`)}
                            className="px-4 py-2 rounded-md font-bold text-sm transition-all shadow-sm flex items-center gap-2 bg-surface hover:bg-surface-hover text-text-primary border border-border"
                            title="Rezept importieren"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Importieren</span>
                        </button>
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
                                    ? 'bg-surface text-text-disabled cursor-not-allowed border border-border' 
                                    : 'bg-text-primary hover:bg-text-secondary text-background border border-transparent'
                                }
                            `}
                        >
                            <Plus className="w-4 h-4" />
                            <span>Rezept erstellen</span>
                        </button>
                    </div>
                 )}

                 <div className="h-8 w-px bg-border hidden md:block"></div>
                 <div className="text-right hidden md:block">
                    <p className="text-[10px] uppercase font-bold text-text-disabled tracking-wider mb-0.5">Kapazität</p>
                    <p className="text-text-secondary font-mono text-xs text-right">
                        {bypassed ? <span className="text-success">∞</span> : `${brews.length} / ${tierConfig.limits.maxBrews}`}
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
                <div className="md:bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-success/30 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="text-success text-xs font-bold uppercase tracking-wider relative z-10">Öffentlich</div>
                    <div className="text-2xl font-mono font-bold text-success relative z-10">{publicCount}</div>
                </div>
                <div className="md:bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-rating/30 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-rating/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="text-rating text-xs font-bold uppercase tracking-wider relative z-10">Privat</div>
                    <div className="text-2xl font-mono font-bold text-rating relative z-10">
                        {privateCount}
                    </div>
                </div>
            </div>

            {/* Sort & Filters */}
            <div className="hidden lg:block md:bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <Filter className="w-4 h-4 text-text-muted" />
                        Sortieren
                    </h3>
                </div>
                <div className="p-2 space-y-1">
                     <button
                        onClick={() => setSortOrder('newest')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'newest' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Calendar className="w-3.5 h-3.5" />
                            Neueste zuerst
                        </div>
                        {sortOrder === 'newest' && <div className="w-1.5 h-1.5 rounded-full bg-accent-purple"></div>}
                     </button>
                     <button
                        onClick={() => setSortOrder('oldest')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'oldest' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                        <div className="flex items-center gap-3">
                             <Calendar className="w-3.5 h-3.5" />
                             Älteste zuerst
                        </div>
                        {sortOrder === 'oldest' && <div className="w-1.5 h-1.5 rounded-full bg-accent-purple"></div>}
                     </button>
                     <button
                        onClick={() => setSortOrder('name')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'name' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                         <div className="flex items-center gap-3">
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            Name (A-Z)
                        </div>
                        {sortOrder === 'name' && <div className="w-1.5 h-1.5 rounded-full bg-accent-purple"></div>}
                     </button>
                </div>
            </div>

            <div className="hidden lg:block bg-surface border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <Eye className="w-4 h-4 text-text-muted" />
                        Sichtbarkeit
                    </h3>
                </div>
                <div className="p-2 space-y-1">
                     <button
                        onClick={() => setFilterType('ALL')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Library className="w-3.5 h-3.5" />
                            Alle Rezepte
                        </div>
                        {filterType === 'ALL' && <div className="w-1.5 h-1.5 rounded-full bg-accent-purple"></div>}
                     </button>
                     <button
                        onClick={() => setFilterType('PUBLIC')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${filterType === 'PUBLIC' ? 'bg-success/10 text-success' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                        <div className="flex items-center gap-3">
                             <Globe className="w-3.5 h-3.5" />
                             Nur öffentliche
                        </div>
                        {filterType === 'PUBLIC' && <div className="w-1.5 h-1.5 rounded-full bg-success"></div>}
                     </button>
                     <button
                        onClick={() => setFilterType('PRIVATE')}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${filterType === 'PRIVATE' ? 'bg-rating/10 text-rating' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                         <div className="flex items-center gap-3">
                            <Lock className="w-3.5 h-3.5" />
                            Nur private
                        </div>
                        {filterType === 'PRIVATE' && <div className="w-1.5 h-1.5 rounded-full bg-rating"></div>}
                     </button>
                </div>
            </div>

         </div>

         {/* RIGHT COLUMN: Content */}
         <div className="space-y-8">
            
            {/* Toolbar */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-text-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Rezept suchen..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface border border-border rounded-2xl py-2 pl-9 pr-4 text-sm text-text-primary focus:border-brand/50 focus:ring-1 focus:ring-brand/20 focus:outline-none transition-all placeholder:text-text-disabled"
                        />
                    </div>
                </div>

                {/* Mobile Filters */}
                <div className="grid grid-cols-2 gap-2 lg:hidden">
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
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 animate-in fade-in duration-500">
                {filteredBrews.length === 0 ? (
                    <div className="col-span-full text-center py-24 md:bg-surface rounded-2xl border border-border border-dashed">
                        <div className="flex justify-center mb-4 opacity-50"><Beer className="w-12 h-12 text-text-disabled" /></div>
                        <p className="text-text-muted">Keine Rezepte gefunden.</p>
                    </div>
                ) : (
                    filteredBrews.map((brew) => (
                    <div key={brew.id} className="group flex flex-col gap-2">

                        {/* Image + stats strip in shared rounded-xl container */}
                        <div className="relative w-full overflow-hidden rounded-xl">

                            {/* Image area: aspect-square */}
                            <div
                                className="relative w-full aspect-square cursor-pointer overflow-hidden"
                                onClick={() => router.push(`/team/${breweryId}/brews/${brew.id}/edit`)}
                            >
                                {brew.image_url ? (
                                    <img
                                        src={brew.image_url}
                                        alt={brew.name}
                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-surface-hover to-surface flex flex-col items-center justify-center">
                                        <Beer className="w-10 h-10 text-border opacity-50" strokeWidth={1} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-border/40 mt-1.5">Kein Label</span>
                                    </div>
                                )}

                                {/* Style badge — top left */}
                                <div className="absolute top-2 left-2 pointer-events-none z-10">
                                    <span className="bg-black/60 backdrop-blur-sm text-white/90 border border-white/10 rounded-full text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                                        {brew.style || 'Standard'}
                                    </span>
                                </div>

                                {/* Admin actions — top right */}
                                {isMember && (
                                    <div className="absolute top-2 right-2 flex gap-1 z-20">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleVisibility(brew.id, brew.is_public); }}
                                            className={`w-7 h-7 flex items-center justify-center rounded-full backdrop-blur-sm border border-white/10 transition-all active:scale-95 ${brew.is_public ? 'bg-success/30 text-success' : 'bg-black/50 text-white/60'}`}
                                            aria-label={brew.is_public ? 'Sichtbar (Umschalten auf Privat)' : 'Privat (Umschalten auf Öffentlich)'}
                                        >
                                            {brew.is_public ? <Eye className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                        </button>
                                        <Link
                                            href={`/brew/${brew.id}`}
                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white transition active:scale-95"
                                            aria-label="Öffentliche Seite öffnen"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Globe className="w-3.5 h-3.5" />
                                        </Link>
                                        {brew.bottles?.[0]?.count > 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedBrew({ id: brew.id, name: brew.name });
                                                    setBottlesModalOpen(true);
                                                }}
                                                className="w-7 h-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white transition active:scale-95"
                                                title="Flaschen verwalten"
                                            >
                                                <Wine className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Stats strip — directly below image */}
                            <div className="flex items-center justify-around py-2.5 bg-surface-hover border-t border-border">
                                <span className="flex flex-col items-center leading-none min-w-0">
                                    <span className={`text-[13px] font-black tabular-nums ${brewRatings[brew.id] ? 'text-rating' : 'text-text-disabled'}`}>
                                        {brewRatings[brew.id] ? brewRatings[brew.id].avg : '—'}
                                    </span>
                                    <span className="text-[9px] text-text-muted mt-0.5">Bewertung</span>
                                </span>
                                <span className="w-px h-5 bg-border shrink-0" />
                                <span className="flex flex-col items-center leading-none min-w-0">
                                    <span className="text-[13px] font-black tabular-nums text-text-primary">
                                        {brewRatings[brew.id] ? brewRatings[brew.id].count : '0'}
                                    </span>
                                    <span className="text-[9px] text-text-muted mt-0.5">Ratings</span>
                                </span>
                                <span className="w-px h-5 bg-border shrink-0" />
                                <span className="flex flex-col items-center leading-none min-w-0">
                                    <span className={`text-[13px] font-black ${brew.is_public ? 'text-success' : 'text-text-disabled'}`}>
                                        {brew.is_public ? '●' : '○'}
                                    </span>
                                    <span className="text-[9px] text-text-muted mt-0.5">{brew.is_public ? 'Öffentl.' : 'Privat'}</span>
                                </span>
                            </div>
                        </div>

                        {/* Text below — minimal */}
                        <div className="flex flex-col gap-0.5 px-0.5">
                            <Link
                                href={`/team/${breweryId}/brews/${brew.id}/edit`}
                                className="font-bold text-text-primary text-sm leading-snug line-clamp-2 group-hover:text-brand transition-colors"
                            >
                                {brew.name}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                                <span className="text-[10px] text-text-disabled shrink truncate">
                                    {new Date(brew.created_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                </span>
                                {brew.remix_parent_id && (
                                    <span className="text-[10px] text-accent-purple ml-auto shrink-0">Remix</span>
                                )}
                            </div>
                        </div>
                    </div>
              ))
            )}
            </div>
            
            {/* SECTION 2: SAVED BREWS */}
            {savedBrews.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                     <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2 pt-8 border-t border-border mt-8">
                          <Library className="w-5 h-5 text-text-muted" /> Bibliothek <span className="text-text-muted text-sm font-normal">({savedBrews.length})</span>
                      </h3>
                     
                     <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {savedBrews.map((brew) => (
                          <div key={brew.id} className="group flex flex-col gap-2">

                              {/* Image + strip in shared rounded-xl container */}
                              <div className="relative w-full overflow-hidden rounded-xl">

                                  {/* Image area: aspect-square */}
                                  <div className="relative w-full aspect-square overflow-hidden">
                                      <Link href={`/brew/${brew.id}`} className="block absolute inset-0">
                                          {brew.image_url ? (
                                              <img
                                                  src={brew.image_url}
                                                  alt={brew.name}
                                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                                              />
                                          ) : (
                                              <div className="absolute inset-0 bg-gradient-to-br from-surface-hover to-surface flex items-center justify-center">
                                                  <Beer className="w-8 h-8 text-border opacity-50" strokeWidth={1} />
                                              </div>
                                          )}
                                      </Link>

                                      {/* Style badge — top left */}
                                      <div className="absolute top-2 left-2 pointer-events-none z-10">
                                          <span className="bg-black/60 backdrop-blur-sm text-white/90 border border-white/10 rounded-full text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                                              {brew.style || 'Standard'}
                                          </span>
                                      </div>

                                      {/* Remove button — top right */}
                                      {isMember && (
                                          <button
                                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveSaved(brew.id); }}
                                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white/60 hover:text-white hover:bg-red-500/80 flex items-center justify-center transition opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/10 z-10"
                                              title="Aus Bibliothek entfernen"
                                          >
                                              <X className="w-3.5 h-3.5" />
                                          </button>
                                      )}
                                  </div>

                                  {/* Stats strip */}
                                  <div className="flex items-center justify-between py-2 bg-surface-hover border-t border-border px-3">
                                      <span className="text-[10px] text-text-muted truncate min-w-0">
                                          von <span className="text-text-secondary">{brew.profiles?.display_name || brew.breweries?.name || 'Unbekannt'}</span>
                                      </span>
                                      <Link href={`/brew/${brew.id}`} className="ml-3 shrink-0 text-[10px] text-brand flex items-center gap-0.5 hover:underline">
                                          Ansehen <ArrowUpRight className="w-3 h-3" />
                                      </Link>
                                  </div>
                              </div>

                              {/* Text below */}
                              <div className="flex flex-col gap-0.5 px-0.5">
                                  <Link href={`/brew/${brew.id}`} className="font-bold text-text-primary text-sm leading-snug line-clamp-2 group-hover:text-brand transition-colors">
                                      {brew.name}
                                  </Link>
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

