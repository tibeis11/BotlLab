'use client';

import { useEffect, useState, use } from 'react';
import { supabase, getBreweryMembers } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { SessionPhase } from '@/lib/types/session-log';
import { calculateCurrentStats } from '@/lib/session-log-service';
import { calculateABVFromSG, platoToSG } from '@/lib/brewing-calculations';
import { 
    Plus, 
    ClipboardList, 
    ArrowUpRight, 
    Beer, 
    Calendar, 
    FlaskConical, 
    Thermometer,
    Loader2,
    Zap 
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
  const { breweryId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

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

      const members = await getBreweryMembers(breweryId);
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

  if (loading) return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="font-medium animate-pulse">Lade Logbücher...</p>
      </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-zinc-800">
                 <div className="space-y-4">
                    <div className="inline-flex items-center gap-2">
                        <span className="text-cyan-400 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md bg-cyan-950/30 border border-cyan-500/20 flex items-center gap-1.5">
                            <ClipboardList className="w-3 h-3" />
                            Logbuch & Sude
                        </span>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800">
                            {sessions.length} Einträge
                        </span>
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">Brausessions</h1>
                        <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-xl">
                            Das digitale Brauprotokoll. Verfolge den Fortschritt deiner Sude.
                        </p>
                    </div>
                 </div>
                 
                 {isMember && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link 
                            href={`/team/${breweryId}/sessions/new-quick`}
                            className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
                        >
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span>Quick Session</span>
                        </Link>
                        <Link 
                            href={`/team/${breweryId}/sessions/new`}
                            className="bg-white hover:bg-zinc-200 text-black border border-transparent rounded-lg px-4 py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Neue Session</span>
                        </Link>
                    </div>
                 )}
            </div>

            {/* Sessions Grid */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {sessions.map(session => (
                        <SessionCard key={session.id} session={session} breweryId={breweryId} />
                    ))}
                </div>
            )}
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
        
        og = ogEvent?.data?.gravity || null;
    }

    // Fallback Image
    const bgImage = brew?.image_url 
        ? `url('${brew.image_url}')` 
        : undefined; 

    return (
        <Link 
            href={`/team/${breweryId}/sessions/${session.id}`}
            className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 flex flex-col h-full"
        >
            {/* Image / Header Area */}
            <div className="relative h-48 bg-zinc-950 overflow-hidden shrink-0">
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
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />

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
            <div className="p-5 flex flex-col flex-1 border-t border-zinc-800 relative z-10">
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
                    <div className="bg-black/40 rounded-lg p-3 border border-zinc-800">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1.5">
                            <FlaskConical className="w-3 h-3" />
                            Stammwürze
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
                        <div className="bg-black/40 rounded-lg p-3 border border-zinc-800">
                             <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1.5">
                                <FlaskConical className="w-3 h-3" />
                                Alkohol
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
