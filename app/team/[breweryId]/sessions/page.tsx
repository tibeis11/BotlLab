'use client';

import { useEffect, useState, use } from 'react';
import { supabase, getBreweryMembers } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { SessionPhase } from '@/lib/types/session-log';
import { calculateCurrentStats } from '@/lib/session-log-service';
import { calculateABVFromSG, platoToSG } from '@/lib/brewing-calculations';

/* --- Design System Helpers --- */

const getPhaseColor = (p: SessionPhase) => {
    switch (p) {
        case 'planning': return 'bg-zinc-800 text-zinc-300 border-zinc-700';
        case 'brewing': return 'bg-amber-950/30 text-amber-500 border-amber-500/20';
        case 'fermenting': return 'bg-purple-950/30 text-purple-400 border-purple-500/20';
        case 'conditioning': return 'bg-sky-950/30 text-sky-400 border-sky-500/20';
        case 'completed': return 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20';
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
      <div className="flex justify-center py-20">
          <div className="text-zinc-500 animate-pulse text-sm font-bold uppercase tracking-widest">Lade Daten...</div>
      </div>
  );

  return (
    <div className="space-y-12 pb-24 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
             <div className="space-y-4">
                <div className="inline-flex items-center gap-2">
                    <span className="text-cyan-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-cyan-950/30 border border-cyan-500/20 shadow-sm shadow-cyan-900/20">
                        LOGBUCH & SUDE
                    </span>
                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                        {sessions.length} Einträge
                    </span>
                </div>
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">Brausessions</h1>
                    <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
                        Das digitale Brauprotokoll. Verfolge den Fortschritt deiner Sude von der Planung bis zur Verkostung.
                    </p>
                </div>
             </div>
             
             {isMember && (
                <div className="flex flex-col sm:flex-row gap-3 justify-start lg:justify-end">
                    <Link 
                        href={`/team/${breweryId}/sessions/new-quick`}
                        className="group relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black transition-all duration-300 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] active:scale-95"
                    >
                        <span>Quick Session</span>
                    </Link>
                    <Link 
                        href={`/team/${breweryId}/sessions/new`}
                        className="group relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-black transition-all duration-300 bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] active:scale-95"
                    >
                        <span>Neue Session</span>
                    </Link>
                </div>
             )}
        </div>

        {/* Sessions Grid */}
        {sessions.length === 0 ? (
            <div className="text-center py-24 border border-zinc-800 border-dashed rounded-3xl bg-zinc-900/30">
                <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                     <span className="text-4xl opacity-50 grayscale">📋</span>
                </div>
                <h3 className="text-xl font-black text-white mb-2">Keine Sude gefunden</h3>
                <p className="text-zinc-400 mb-8 max-w-md mx-auto">Es sieht so aus, als hättet ihr noch keine Brausessions gestartet. Lege jetzt los!</p>
                {isMember && (
                     <Link href={`/team/${breweryId}/sessions/new`} className="text-cyan-400 font-bold hover:text-cyan-300 uppercase tracking-widest text-sm border-b border-cyan-500/30 pb-1">
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
  );
}

function SessionCard({ session, breweryId }: { session: any, breweryId: string }) {
    const brew = session.brews;
    const date = new Date(session.brewed_at || session.created_at).toLocaleDateString('de-DE');
    
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
            className="group bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-lg flex flex-col relative hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50"
        >
            {/* Image / Header Area */}
            <div className="relative h-48 bg-zinc-950 overflow-hidden">
                {bgImage ? (
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-80"
                        style={{ backgroundImage: bgImage }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                        <span className="text-4xl grayscale opacity-20">🍺</span>
                    </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
                    <div className={`backdrop-blur-md px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-lg ${getPhaseColor(session.phase)}`}>
                        {getPhaseLabel(session.phase)}
                    </div>
                    {session.batch_code && (
                        <div className="bg-black/60 backdrop-blur text-zinc-400 px-2 py-1 rounded-lg border border-white/10 text-[10px] font-mono">
                            {session.batch_code}
                        </div>
                    )}
                </div>

                <div className="absolute top-4 right-4">
                     <div className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 group-hover:text-cyan-400 group-hover:bg-black/80 group-hover:border-cyan-500/30 transition-all">
                        ↗
                     </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 flex flex-col flex-1 relative -mt-6">
                 {/* Title Card */}
                 <div className="mb-6">
                    <h3 className="text-2xl font-black text-white leading-tight mb-2 group-hover:text-cyan-400 transition-colors">
                        {brew?.name || 'Unbekanntes Rezept'}
                    </h3>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                        <span>{date}</span>
                        {brew?.style && (
                            <>
                                <span>•</span>
                                <span className="text-zinc-400">{brew.style}</span>
                            </>
                        )}
                    </div>
                 </div>

                 {/* Mini Metrics Grid */}
                 <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/50">
                        <div className="text-[10px] text-zinc-600 font-black uppercase mb-1">Stammwürze</div>
                        <div className="text-white font-mono font-bold">
                            {og ? `${Number(og).toFixed(3)}` : '—'}
                        </div>
                    </div>
                    {session.current_gravity ? (
                         <div className="bg-cyan-950/20 rounded-xl p-3 border border-cyan-500/20">
                            <div className="text-[10px] text-cyan-700 font-black uppercase mb-1">Aktuell</div>
                            <div className="text-cyan-400 font-mono font-bold">
                                {Number(session.current_gravity).toFixed(3)}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/50">
                             <div className="text-[10px] text-zinc-600 font-black uppercase mb-1">Alkohol</div>
                             <div className="text-zinc-500 font-mono font-bold">
                                 {stats.abv ? `${stats.abv}%` : '—'}
                             </div>
                        </div>
                    )}
                 </div>
            </div>
        </Link>
    );
}
