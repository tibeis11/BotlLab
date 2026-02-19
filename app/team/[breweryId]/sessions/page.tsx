'use client';

import { useEffect, useState, use } from 'react';
import { getBreweryMembers } from '@/lib/supabase';
import { useSupabase } from '@/lib/hooks/useSupabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { SessionPhase } from '@/lib/types/session-log';
import { calculateCurrentStats } from '@/lib/session-log-service';
import { calculateABVFromSG, platoToSG } from '@/lib/brewing-calculations';
import CustomSelect from '@/app/components/CustomSelect';
import { 
    Plus, 
    ClipboardList, 
    ArrowUpRight, 
    Beer, 
    Calendar, 
    FlaskConical, 
    Thermometer,
    Loader2,
    Zap,
    Search,
    Filter,
    ArrowUpDown,
    CheckCircle2,
    Timer,
    History
} from 'lucide-react';

/* --- Design System Helpers --- */

const getPhaseColor = (p: SessionPhase) => {
    switch (p) {
        case 'planning': return 'bg-zinc-800 text-zinc-300 border-zinc-700';
        case 'brewing': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'fermenting': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        case 'conditioning': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
};

const getPhaseLabel = (p: SessionPhase) => {
    switch (p) {
        case 'planning': return 'Planung';
        case 'brewing': return 'Brautag';
        case 'fermenting': return 'Gärung';
        case 'conditioning': return 'Reifung';
        case 'completed': return 'Abgeschlossen';
        default: return p;
    }
};

export default function TeamSessionsPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const supabase = useSupabase();
  const { breweryId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [filterPhase, setFilterPhase] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  useEffect(() => {
    if (!authLoading) {
        checkPermissionAndLoad();
    }
  }, [breweryId, user, authLoading]);

  async function checkPermissionAndLoad() {
    try {
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      const members = await getBreweryMembers(breweryId, supabase);
      const isUserMember = members.some((m: any) => m.user_id === user.id);
      setIsMember(isUserMember);

      const { data, error } = await supabase
        .from('brewing_sessions')
        .select(`
            *,
            brews (id, name, style, image_url)
        `)
        .eq('brewery_id', breweryId)
        .order('brewed_at', { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);

    } catch (err: any) {
      console.error('Error:', err);
    } finally {
        setLoading(false);
    }
  }

  // Filter Logic
  const filteredSessions = sessions.filter(session => {
      const brewName = session.brews?.name || '';
      const batchCode = session.batch_code || '';
      const matchesSearch = brewName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            batchCode.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isActive = session.phase !== 'completed';
      const matchesPhase = filterPhase === 'ALL' 
            ? true 
            : filterPhase === 'ACTIVE' ? isActive : !isActive;

      return matchesSearch && matchesPhase;
  }).sort((a, b) => {
      const dateA = new Date(a.brewed_at || a.created_at).getTime();
      const dateB = new Date(b.brewed_at || b.created_at).getTime();
      
      if (sortOrder === 'newest') return dateB - dateA;
      if (sortOrder === 'oldest') return dateA - dateB;
      if (sortOrder === 'name') return (a.brews?.name || '').localeCompare(b.brews?.name || '');
      return 0;
  });

  const activeCount = sessions.filter(s => s.phase !== 'completed').length;
  const completedCount = sessions.filter(s => s.phase === 'completed').length;

  if (loading) return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="font-medium animate-pulse">Lade Logbücher...</p>
      </div>
  );

  return (
    <div className="space-y-8 pb-24 text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-8">
            <div>
                 <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Brausessions</h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide bg-zinc-800 text-zinc-400 border-zinc-700">
                        Logbuch
                    </span>
                 </div>
                 <p className="text-sm text-zinc-500">Das digitale Brauprotokoll. Verfolge den Fortschritt deiner Sude.</p>
            </div>

            <div className="flex items-center gap-4">
                 {isMember && (
                    <>
                        <div className="flex flex-col sm:flex-row gap-2">
                             <Link 
                                href={`/team/${breweryId}/sessions/new-quick`}
                                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-md px-4 py-2 text-sm font-bold transition-all flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span>Quick Session</span>
                            </Link>
                            <Link 
                                href={`/team/${breweryId}/sessions/new`}
                                className="bg-white hover:bg-zinc-200 text-black border border-transparent rounded-md px-4 py-2 text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Neue Session</span>
                            </Link>
                        </div>
                    </>
                 )}

                 <div className="h-8 w-px bg-zinc-800 hidden md:block"></div>
                 <div className="text-right hidden md:block">
                    <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-0.5">Einträge</p>
                    <p className="text-zinc-300 font-mono text-xs text-right">
                        {sessions.length}
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
                    <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <div className="text-amber-500 text-xs font-bold uppercase tracking-wider relative z-10 flex items-center gap-1">
                            <Timer className="w-3 h-3" /> AK
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 font-bold mb-0.5">AKTIV</div>
                            <div className="text-2xl font-mono font-bold text-amber-400 relative z-10">{activeCount}</div>
                        </div>
                    </div>
                    
                    <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-zinc-500/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/10 to-transparent opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none" />
                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider relative z-10 flex items-center gap-1">
                            <History className="w-3 h-3" /> AB
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 font-bold mb-0.5">FERTIG</div>
                            <div className="text-2xl font-mono font-bold text-zinc-400 relative z-10">{completedCount}</div>
                        </div>
                    </div>
                </div>

                {/* Sort Widget */}
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
                            {sortOrder === 'newest' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                        </button>
                        <button
                            onClick={() => setSortOrder('oldest')}
                            className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${sortOrder === 'oldest' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Calendar className="w-3.5 h-3.5" />
                                Älteste zuerst
                            </div>
                            {sortOrder === 'oldest' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                        </button>
                        <button
                            onClick={() => setSortOrder('name')}
                            className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${sortOrder === 'name' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                Name (A-Z)
                            </div>
                            {sortOrder === 'name' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                        </button>
                    </div>
                </div>

                {/* Filter Widget (Phase) */}
                <div className="hidden lg:block md:bg-black border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Filter className="w-4 h-4 text-zinc-400" />
                            Status
                        </h3>
                    </div>
                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => setFilterPhase('ALL')}
                            className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${filterPhase === 'ALL' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-3.5 h-3.5" />
                                Alle Sessions
                            </div>
                            {filterPhase === 'ALL' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                        </button>
                        <button
                            onClick={() => setFilterPhase('ACTIVE')}
                            className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${filterPhase === 'ACTIVE' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Timer className="w-3.5 h-3.5" />
                                Nur aktive
                            </div>
                            {filterPhase === 'ACTIVE' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                        </button>
                        <button
                            onClick={() => setFilterPhase('COMPLETED')}
                            className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${filterPhase === 'COMPLETED' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Abgeschlossen
                            </div>
                             {filterPhase === 'COMPLETED' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                        </button>
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN: Content */}
            <div className="space-y-6">
                
                {/* Search Bar */}
                <div className="flex flex-col gap-4 bg-zinc-900/30 p-1 rounded-xl border border-zinc-800/50">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative group w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Sud oder Batch-Nummer suchen..." 
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
                            value={filterPhase}
                            onChange={(val: any) => setFilterPhase(val)}
                            options={[
                                { value: 'ALL', label: 'Alle Sessions' },
                                { value: 'ACTIVE', label: 'Nur aktive' },
                                { value: 'COMPLETED', label: 'Abgeschlossen' }
                            ]}
                        />
                    </div>
                </div>

                {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 border border-zinc-800 border-dashed rounded-xl bg-zinc-900/20">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                             <ClipboardList className="w-10 h-10 text-zinc-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Keine Sude gefunden</h3>
                        <p className="text-zinc-500 mb-8 max-w-md text-center">Es sieht so aus, als hättet ihr noch keine Brausessions gestartet.</p>
                        {isMember && (
                             <Link 
                                href={`/team/${breweryId}/sessions/new`} 
                                className="text-cyan-500 hover:text-cyan-400 text-sm font-medium flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Ersten Sud anlegen
                             </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {filteredSessions.map(session => (
                            <SessionCard key={session.id} session={session} breweryId={breweryId} />
                        ))}
                    </div>
                )}
            </div>

        </div>
    </div>
  );
}

function SessionCard({ session, breweryId }: { session: any, breweryId: string }) {
    const brew = session.brews;
    const date = new Date(session.brewed_at || session.created_at).toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
    
    // Check if this is a Quick Session
    const isQuickSession = session.session_type === 'quick';
    
    let og = null;
    let stats: any = { abv: null, attenuation: null };
    
    if (isQuickSession && session.measurements) {
        // Quick Session: Get data from measurements
        const rawOg = session.measurements.og ? parseFloat(session.measurements.og) : null;
        // Consistent Display: If > 1.5 assume Plato and convert, else keep SG
        og = rawOg && rawOg >= 1.5 ? platoToSG(rawOg) : rawOg;
        
        // Calculate ABV if we have both OG and FG (converting if needed)
        if (session.measurements.og && session.measurements.fg) {
            const rawFg = parseFloat(session.measurements.fg);
            
            const ogSG = rawOg && rawOg >= 1.5 ? platoToSG(rawOg) : rawOg;
            const fgSG = rawFg >= 1.5 ? platoToSG(rawFg) : rawFg;
            
            if (ogSG && fgSG) {
                stats.abv = calculateABVFromSG(ogSG, fgSG).toFixed(1);
            }
        } else if (session.measurements.abv) {
            // Or use directly provided ABV
            stats.abv = parseFloat(session.measurements.abv).toFixed(1);
        }
    } else {
        // Normal Session: Calculate Stats from Timeline
        const timeline = session.timeline || [];
        stats = calculateCurrentStats(timeline);
        
        // Extract OG from timeline
        const ogEvent = timeline.filter((e: any) => e.type === 'MEASUREMENT_OG')
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        const measuredOg = session.measured_og || ogEvent?.data?.gravity || null;

        // TARGET OG Fallback (Recipe)
        const targetOgRaw = session.brew?.recipe_data?.Stammwuerze || session.brew?.recipe_data?.stammwuerze || session.brew?.recipe_data?.og;
        const targetOg = targetOgRaw ? (parseFloat(targetOgRaw) > 2 ? platoToSG(parseFloat(targetOgRaw)) : parseFloat(targetOgRaw)) : null;

        og = measuredOg || targetOg;
        
        // ABV Logic:
        // 1. If we have measured stats, use them (stats.abv is already calculated)
        // 2. If we only have OG (measured or target) and current gravity, calc it
        if (!stats.abv && og && stats.currentGravity) {
             stats.abv = calculateABVFromSG(og, stats.currentGravity).toFixed(1);
        }
        // 3. If still no ABV, try target ABV from recipe
        if (!stats.abv) {
             const targetAbv = session.brew?.recipe_data?.Alkohol || session.brew?.recipe_data?.alkohol || session.brew?.recipe_data?.abv;
             if (targetAbv) stats.abv = parseFloat(targetAbv).toFixed(1);
        }
    }

    // Fallback Image
    const bgImage = brew?.image_url 
        ? `url('${brew.image_url}')` 
        : undefined; 

    return (
        <Link 
            href={`/team/${breweryId}/sessions/${session.id}`}
            className="group bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 flex flex-col h-full"
        >
            {/* Image / Header Area */}
            <div className="relative h-48 bg-zinc-900 overflow-hidden shrink-0 border-b border-zinc-900">
                {bgImage ? (
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-80"
                        style={{ backgroundImage: bgImage }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                        <Beer className="w-12 h-12 text-zinc-800" strokeWidth={1} />
                    </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
                    <div className={`backdrop-blur-md px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest shadow-lg ${getPhaseColor(session.phase)}`}>
                        {getPhaseLabel(session.phase)}
                    </div>
                    {session.batch_code && (
                        <div className="bg-black/60 backdrop-blur text-zinc-400 px-2 py-1 rounded-lg border border-white/10 text-[10px] font-mono">
                            {session.batch_code}
                        </div>
                    )}
                </div>

                <div className="absolute top-4 right-4 translate-x-2 -translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300">
                     <div className="w-8 h-8 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-cyan-400">
                        <ArrowUpRight className="w-4 h-4" />
                     </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-5 flex flex-col flex-1 relative z-10 bg-zinc-950">
                 {/* Title Card */}
                 <div className="mb-6">
                    <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                        {brew?.name || 'Unbekanntes Rezept'}
                    </h3>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>{date}</span>
                        {brew?.style && (
                            <>
                                <span className="text-zinc-700">•</span>
                                <span className="text-zinc-400 truncate">{brew.style}</span>
                            </>
                        )}
                        {isQuickSession && (
                            <>
                                <span className="text-zinc-700">•</span>
                                <span className="text-amber-500 flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> Quick
                                </span>
                            </>
                        )}
                    </div>
                 </div>

                 {/* Mini Metrics Grid */}
                 <div className="grid grid-cols-2 gap-3 mt-auto">
                    <div className="bg-black/40 rounded-lg p-3 border border-zinc-900">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                            <FlaskConical className="w-3 h-3 shrink-0" />
                            <span className="truncate">Stammwürze</span>
                        </div>
                        <div className="text-zinc-200 font-mono font-bold text-sm">
                            {og ? `${Number(og).toFixed(3)}` : '—'}
                        </div>
                    </div>
                    {session.current_gravity ? (
                         <div className="bg-cyan-950/10 rounded-lg p-3 border border-cyan-500/20">
                            <div className="text-[10px] text-cyan-600 font-bold uppercase mb-1 flex items-center gap-1.5">
                                <Thermometer className="w-3 h-3" />
                                Aktuell
                            </div>
                            <div className="text-cyan-400 font-mono font-bold text-sm">
                                {Number(session.current_gravity).toFixed(3)}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-black/40 rounded-lg p-3 border border-zinc-900">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                            <FlaskConical className="w-3 h-3 shrink-0" />
                            <span className="truncate">Alkohol</span>
                         </div>
                             <div className="text-zinc-400 font-mono font-bold text-sm">
                                 {stats.abv ? `${stats.abv}%` : '—'}
                             </div>
                        </div>
                    )}
                 </div>
            </div>
        </Link>
    );
}
