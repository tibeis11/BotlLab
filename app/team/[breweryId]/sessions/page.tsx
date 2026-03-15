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
        case 'planning': return 'bg-surface-hover text-text-secondary border-border';
        case 'brewing': return 'bg-rating/10 text-rating border-rating/20';
        case 'fermenting': return 'bg-accent-purple/10 text-accent-purple border-accent-purple/20';
        case 'conditioning': return 'bg-brand-bg text-brand border-brand-dim';
        case 'completed': return 'bg-success/10 text-success border-success/20';
        default: return 'bg-surface-hover text-text-secondary border-border';
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
      <div className="min-h-screen flex flex-col items-center justify-center text-text-muted gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="font-medium animate-pulse">Lade Logbücher...</p>
      </div>
  );

  return (
    <div className="space-y-8 pb-24 font-sans">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
            <div>
                 <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">Brausessions</h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide bg-surface text-text-muted border-border">
                        Logbuch
                    </span>
                 </div>
                 <p className="text-sm text-text-muted">Das digitale Brauprotokoll. Verfolge den Fortschritt deiner Sude.</p>
            </div>

            <div className="flex items-center gap-4">
                 {isMember && (
                    <>
                        <div className="flex flex-col sm:flex-row gap-2">
                             <Link 
                                href={`/team/${breweryId}/sessions/new-quick`}
                                className="bg-surface border border-border hover:bg-surface-hover hover:border-border-hover text-text-secondary hover:text-text-primary rounded-md px-4 py-2 text-sm font-bold transition-all flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4 text-rating" />
                                <span>Quick Session</span>
                            </Link>
                            <Link 
                                href={`/team/${breweryId}/sessions/new`}
                                className="bg-text-primary hover:bg-text-secondary text-background border border-transparent rounded-md px-4 py-2 text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Neue Session</span>
                            </Link>
                        </div>
                    </>
                 )}

                 <div className="h-8 w-px bg-border hidden md:block"></div>
                 <div className="text-right hidden md:block">
                    <p className="text-[10px] uppercase font-bold text-text-disabled tracking-wider mb-0.5">Einträge</p>
                    <p className="text-text-secondary font-mono text-xs text-right">
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
                    <div className="md:bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-rating/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-rating/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <div className="text-rating text-xs font-bold uppercase tracking-wider relative z-10 flex items-center gap-1">
                            <Timer className="w-3 h-3" /> AK
                        </div>
                        <div>
                            <div className="text-xs text-text-muted font-bold mb-0.5">AKTIV</div>
                            <div className="text-2xl font-mono font-bold text-rating relative z-10">{activeCount}</div>
                        </div>
                    </div>
                    
                    <div className="md:bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-border-hover transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-surface-hover to-transparent opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none" />
                        <div className="text-text-muted text-xs font-bold uppercase tracking-wider relative z-10 flex items-center gap-1">
                            <History className="w-3 h-3" /> AB
                        </div>
                        <div>
                            <div className="text-xs text-text-muted font-bold mb-0.5">FERTIG</div>
                            <div className="text-2xl font-mono font-bold text-text-secondary relative z-10">{completedCount}</div>
                        </div>
                    </div>
                </div>

                {/* Sort Widget */}
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
                            {sortOrder === 'newest' && <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>}
                        </button>
                        <button
                            onClick={() => setSortOrder('oldest')}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'oldest' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Calendar className="w-3.5 h-3.5" />
                                Älteste zuerst
                            </div>
                            {sortOrder === 'oldest' && <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>}
                        </button>
                        <button
                            onClick={() => setSortOrder('name')}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'name' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                Name (A-Z)
                            </div>
                            {sortOrder === 'name' && <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>}
                        </button>
                    </div>
                </div>

                {/* Filter Widget (Phase) */}
                <div className="hidden lg:block bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                            <Filter className="w-4 h-4 text-text-muted" />
                            Status
                        </h3>
                    </div>
                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => setFilterPhase('ALL')}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${filterPhase === 'ALL' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-3.5 h-3.5" />
                                Alle Sessions
                            </div>
                            {filterPhase === 'ALL' && <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>}
                        </button>
                        <button
                            onClick={() => setFilterPhase('ACTIVE')}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${filterPhase === 'ACTIVE' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Timer className="w-3.5 h-3.5" />
                                Nur aktive
                            </div>
                            {filterPhase === 'ACTIVE' && <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>}
                        </button>
                        <button
                            onClick={() => setFilterPhase('COMPLETED')}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all ${filterPhase === 'COMPLETED' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Abgeschlossen
                            </div>
                             {filterPhase === 'COMPLETED' && <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>}
                        </button>
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN: Content */}
            <div className="space-y-6">
                
                {/* Search Bar */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative group w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-text-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Sud oder Batch-Nummer suchen..." 
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
                    <div className="text-center py-24 md:bg-surface rounded-2xl border border-border border-dashed">
                        <div className="flex justify-center mb-4 opacity-50"><ClipboardList className="w-12 h-12 text-text-disabled" /></div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">Keine Sude gefunden</h3>
                        <p className="text-text-muted mb-8 max-w-md mx-auto">Es sieht so aus, als hättet ihr noch keine Brausessions gestartet.</p>
                        {isMember && (
                             <Link 
                                href={`/team/${breweryId}/sessions/new`} 
                                className="text-brand hover:text-brand/80 text-sm font-medium flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Ersten Sud anlegen
                             </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

    // Background image
    const bgImage = brew?.image_url 
        ? `url('${brew.image_url}')` 
        : undefined; 

    return (
        <Link 
            href={`/team/${breweryId}/sessions/${session.id}`}
            className="group flex flex-col gap-2 transition-all duration-200"
        >
            {/* Image + Stats strip — shared rounded-xl container */}
            <div className="relative w-full overflow-hidden rounded-xl">

                {/* Image area: aspect-square */}
                <div className="relative w-full aspect-square overflow-hidden">
                    {bgImage ? (
                        <div 
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                            style={{ backgroundImage: bgImage }}
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-surface-hover to-surface flex items-center justify-center">
                            <Beer className="w-10 h-10 text-border" strokeWidth={1} />
                        </div>
                    )}

                    {/* Phase badge — top left */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start z-10">
                        <span className={`backdrop-blur-md px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${getPhaseColor(session.phase)}`}>
                            {getPhaseLabel(session.phase)}
                        </span>
                        {session.batch_code && (
                            <span className="bg-black/60 backdrop-blur-sm text-white/80 border border-white/10 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                {session.batch_code}
                            </span>
                        )}
                    </div>

                    {/* Arrow hover indicator — top right */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                        <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                            <ArrowUpRight className="w-3.5 h-3.5 text-white/90" />
                        </div>
                    </div>
                </div>

                {/* Stats strip — directly below image, no gap */}
                <div className="flex items-center justify-around py-2.5 bg-surface-hover border-t border-border">
                    <span className="flex flex-col items-center leading-none min-w-0">
                        <span className="text-[13px] font-black text-text-primary tabular-nums">
                            {og ? Number(og).toFixed(3) : '—'}
                        </span>
                        <span className="text-[9px] text-text-muted mt-0.5">OG</span>
                    </span>
                    <span className="w-px h-5 bg-border shrink-0" />
                    <span className="flex flex-col items-center leading-none min-w-0">
                        <span className={`text-[13px] font-black tabular-nums ${stats.abv ? 'text-text-primary' : 'text-text-disabled'}`}>
                            {stats.abv ? `${stats.abv}%` : '—'}
                        </span>
                        <span className="text-[9px] text-text-muted mt-0.5">ABV</span>
                    </span>
                    <span className="w-px h-5 bg-border shrink-0" />
                    {session.measured_efficiency ? (
                        <span className="flex flex-col items-center leading-none min-w-0">
                            <span className="text-[13px] font-black tabular-nums text-brand">
                                {session.measured_efficiency}%
                            </span>
                            <span className="text-[9px] text-text-muted mt-0.5">SHA</span>
                        </span>
                    ) : (
                        <span className="flex flex-col items-center leading-none min-w-0">
                            <span className={`text-[13px] font-black tabular-nums ${session.current_gravity ? 'text-brand' : 'text-text-disabled'}`}>
                                {session.current_gravity ? Number(session.current_gravity).toFixed(3) : '—'}
                            </span>
                            <span className="text-[9px] text-text-muted mt-0.5">Aktuell</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Text area — minimal, no bg */}
            <div className="flex flex-col gap-0.5 px-0.5">
                <h3 className="font-bold text-text-primary text-sm leading-snug line-clamp-2 group-hover:text-brand transition-colors">
                    {brew?.name || 'Unbekanntes Rezept'}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                    <Calendar className="w-3 h-3 text-text-disabled shrink-0" />
                    <span className="text-[10px] text-text-disabled shrink truncate min-w-0">{date}</span>
                    {brew?.style && (
                        <>
                            <span className="text-border shrink-0">·</span>
                            <span className="text-[10px] text-text-muted truncate shrink min-w-0">{brew.style}</span>
                        </>
                    )}
                    {isQuickSession && (
                        <span className="flex items-center gap-0.5 text-[10px] text-rating ml-auto shrink-0">
                            <Zap className="w-2.5 h-2.5" /> Quick
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
