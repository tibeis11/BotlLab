'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TierProgressWidget from './components/TierProgressWidget';
import DiscoverWidget from './components/DiscoverWidget';
import TrendingForumWidget from './components/TrendingForumWidget';
import { Megaphone, Award, Bell, Flame, Plus, Users, ArrowRight, User } from 'lucide-react';
import { supabase, getActiveBrewery } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { getBreweryFeed, addToFeed, type FeedItem } from '@/lib/feed-service';
import { getTierConfig } from '@/lib/tier-system';
import { createDefaultBreweryTemplate } from '@/lib/actions/label-actions';
import { getTierBorderColor } from '@/lib/premium-config';

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">Lade Dashboard...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Data State
    const [dashboardFeed, setDashboardFeed] = useState<FeedItem[]>([]);
    const [userName, setUserName] = useState("");
    const [activeBrewery, setActiveBrewery] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [breweryLoading, setBreweryLoading] = useState(false);
    
    // Onboarding State
    const [isCreatingBrewery, setIsCreatingBrewery] = useState(false);
    const [isJoiningBrewery, setIsJoiningBrewery] = useState(false);
    const [newBreweryName, setNewBreweryName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [onboardingError, setOnboardingError] = useState<string | null>(null);

    // Initialize Dashboard
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else {
                loadDashboardData();
            }
        }
    }, [user, authLoading, searchParams]);

    async function loadDashboardData() {
        if (!user) return;
        try {
            setLoading(true);

            // 1. Fetch User Profile
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('display_name, tier')
                .eq('id', user.id)
                .single();
            
            if(userProfile) {
                setUserName(userProfile.display_name || user.email?.split('@')[0] || 'Brauer');
            }

            // 2. Determine Active Brewery context
            let brewery = null;
            const paramId = searchParams.get('breweryId');
            
            if (paramId) {
                const { data: member } = await supabase.from('brewery_members').select('brewery_id, breweries(*)').eq('user_id', user.id).eq('brewery_id', paramId).maybeSingle();
                 if (member && member.breweries) {
                     brewery = Array.isArray(member.breweries) ? member.breweries[0] : member.breweries;
                }
            }

            if (!brewery) {
                brewery = await getActiveBrewery(user.id);
            }
            setActiveBrewery(brewery);

            // 3. Load Activity Feed
            if (brewery) {
                const events = await getBreweryFeed(brewery.id);
                setDashboardFeed((events || []).slice(0, 3));
            } else {
                setDashboardFeed([]);
            }

        } catch (error) {
            console.error("Dashboard Load Error:", error);
        } finally {
            setLoading(false);
        }
    }

    // --- Actions ---

    async function handleCreateBrewery(e: React.FormEvent) {
        e.preventDefault();
        if(!newBreweryName.trim()) return;
        if (!user) return;

        setBreweryLoading(true);
        setOnboardingError(null);

        try {
            const { data: brewery, error: rpcError } = await supabase
                .rpc('create_own_squad', { name_input: newBreweryName.trim() });

            if (rpcError) throw rpcError;

            // Optional: Default label
            try {
                const breweryId = (brewery as any)?.id;
                if (breweryId) await createDefaultBreweryTemplate(breweryId);
            } catch (err) { console.error(err); }
            
            window.location.reload();
        } catch (err: any) {
             console.error("Create Error:", err);
             setOnboardingError(err.message || "Fehler beim Erstellen der Brauerei.");
             setBreweryLoading(false);
        }
    }

    async function handleJoinBrewery(e: React.FormEvent) {
        e.preventDefault();
        if(!joinCode.trim()) return;
        setBreweryLoading(true);
        setOnboardingError(null);

        try {
             // 1. Check if brewery exists
             const { data: brewery, error: fetchError } = await supabase
                 .from('breweries')
                 .select('id')
                 .eq('invite_code', joinCode.trim())
                 .single();

             if (fetchError || !brewery) throw new Error("Squad nicht gefunden. Code prüfen.");

             // 2. Join
             const { error: joinError } = await supabase
                .from('brewery_members')
                .insert({ brewery_id: brewery.id, user_id: user!.id, role: 'member' });
            
             if (joinError) throw joinError;

             // Feed update
             await addToFeed(brewery.id, { id: user!.id }, 'MEMBER_JOINED', { message: 'ist dem Squad beigetreten' });

             window.location.reload();
        } catch (err: any) {
            console.error(err);
            setOnboardingError(err.message || "Fehler beim Beitreten.");
            setBreweryLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
        );
    }

    const HandIcon = () => <span className="inline-block animate-wave origin-bottom-right">👋</span>;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* HEADER SECTION */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-8">
                <div>
                     <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-red-500 bg-red-950/30 border border-red-500/20">
                            Dashboard
                        </span>
                        {activeBrewery && (
                             <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-zinc-400 bg-zinc-900 border border-zinc-800">
                                {activeBrewery.team_name || activeBrewery.name}
                            </span>
                        )}
                     </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-4">
                        Moin, {userName}! <HandIcon />
                    </h1>
                    <p className="text-zinc-500 max-w-xl text-lg leading-relaxed">
                        Alles unter Kontrolle im Labor. Hier ist der aktuelle Status deiner digitalen Brauerei.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start relative">
                
                {/* --- LEFT COLUMN: MAIN CONTENT --- */}
                <div className="space-y-8 min-w-0">
                    
                    {/* CASE 1: No Brewery - Show Onboarding */}
                    {!activeBrewery && (
                        <div className="md:bg-black md:border md:border-zinc-800 md:rounded-lg md:p-8 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-32 bg-red-500/5 blur-[100px] rounded-full pointer-events-none -mt-10 -mr-10"></div>
                             
                             {!isCreatingBrewery && !isJoiningBrewery && (
                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <h3 className="text-2xl font-black text-white mb-2">Kein Team, kein Ruhm.</h3>
                                        <p className="text-zinc-400 max-w-lg">
                                            Du bist aktuell heimatlos. Gründe eine Brauerei oder tritt einem Team bei, um das volle Potential von BotlLab zu nutzen.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <button 
                                            onClick={() => setIsCreatingBrewery(true)}
                                            className="group flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 px-6 rounded-md transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-3"
                                        >
                                            <Plus className="w-5 h-5" />
                                            <span>Squad gründen</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsJoiningBrewery(true)}
                                            className="px-6 py-3 rounded-md font-bold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition border border-zinc-700/50 flex items-center gap-2"
                                        >
                                            <Users className="w-5 h-5" />
                                            <span>Beitreten</span>
                                        </button>
                                    </div>
                                </div>
                             )}

                             {isCreatingBrewery && (
                                <form onSubmit={handleCreateBrewery} className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                                         <h3 className="text-xl font-black text-white">Dein Squad-Name</h3>
                                         <button type="button" onClick={() => setIsCreatingBrewery(false)} className="text-zinc-500 hover:text-white text-sm font-medium">Abbrechen</button>
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="z.B. Hopfenrebellen"
                                        className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-md focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition font-bold text-lg text-white"
                                        autoFocus
                                        value={newBreweryName}
                                        onChange={e => setNewBreweryName(e.target.value)}
                                    />
                                    <button disabled={breweryLoading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-md transition-all shadow-lg shadow-red-900/20">
                                        {breweryLoading ? 'Erstelle...' : 'Squad erstellen 🚀'}
                                    </button>
                                </form>
                             )}

                             {isJoiningBrewery && (
                                <form onSubmit={handleJoinBrewery} className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                                         <h3 className="text-xl font-black text-white">Einladungscode</h3>
                                         <button type="button" onClick={() => setIsJoiningBrewery(false)} className="text-zinc-500 hover:text-white text-sm font-medium">Abbrechen</button>
                                    </div>
                                    <div className="space-y-2">
                                        <input 
                                            type="text"
                                            placeholder="Code eingeben..."
                                            className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-md focus:border-white focus:ring-1 focus:ring-zinc-500 transition font-mono text-center text-lg text-white tracking-widest"
                                            autoFocus
                                            value={joinCode}
                                            onChange={e => setJoinCode(e.target.value)}
                                        />
                                        <p className="text-xs text-center text-zinc-500">Frage deinen Squad-Leader nach der ID.</p>
                                    </div>
                                    <button disabled={breweryLoading} className="w-full bg-white text-black font-bold py-4 rounded-md hover:bg-zinc-200 transition-all">
                                        {breweryLoading ? 'Beitrete...' : 'Team beitreten 🤝'}
                                    </button>
                                </form>
                             )}

                            {onboardingError && (
                                <div className="mt-4 bg-red-500/10 text-red-400 p-3 rounded-md text-sm font-bold border border-red-500/20">
                                    {onboardingError}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* CASE 2: Active Brewery - Show Feed */}
                    {activeBrewery && (
                        <div className="md:bg-black md:border md:border-zinc-800 md:rounded-lg md:p-8 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <Megaphone className="w-6 h-6 text-cyan-500" />
                                    Was ist neu im Team?
                                </h3>
                            </div>

                             <div className="space-y-4">
                                {dashboardFeed.length > 0 ? dashboardFeed.slice(0, 3).map((item, i) => {
                                     // Helper for feed item rendering
                                     const tierConfig = getTierConfig(item.profiles?.tier || 'lehrling');
                                     const borderColor = getTierBorderColor(item.profiles?.subscription_tier);
                                     
                                     // Standardized logic for Name and Image
                                     const isRating = item.type === 'BREW_RATED';
                                     
                                     const displayName = isRating 
                                         ? (item.content.author || item.profiles?.display_name || 'Unbekannt')
                                         : (item.profiles?.display_name || 'Unbekannt');

                                     return (
                                        <div key={i} className="flex gap-4 p-4 rounded-lg bg-zinc-900 border border-zinc-800/50 hover:bg-zinc-900 transition-colors group">
                                            <div className="mt-1">
                                                <div className={`w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border-2 overflow-hidden ${borderColor}`}>
                                                    {isRating ? (
                                                        <User className="w-5 h-5 text-zinc-400" />
                                                    ) : (
                                                        <img 
                                                            src={item.profiles?.logo_url || tierConfig.avatarPath} 
                                                            alt="" 
                                                            className="w-full h-full object-cover" 
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-white text-sm truncate">{displayName}</span>
                                                    <span className="text-[10px] text-zinc-600 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                                    {item.type === 'BREW_CREATED' && <>hat ein neues Rezept <span className="text-white font-medium">"{item.content.brew_name}"</span> erstellt.</>}
                                                    {item.type === 'BREW_RATED' && <>hat <span className="text-white font-medium">"{item.content.brew_name}"</span> bewertet.</>}
                                                    {item.type === 'MEMBER_JOINED' && <>ist dem Team beigetreten.</>}
                                                    {!['BREW_CREATED', 'BREW_RATED', 'MEMBER_JOINED'].includes(item.type) && <>{item.content.message}</>}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-12">
                                         <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                             <Bell className="w-6 h-6 text-zinc-700" /> 
                                         </div>
                                         <p className="text-zinc-500 text-sm">Noch keine Updates in diesem Team.</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                
                    {/* Mobile Divider */}
                    <div className="h-px bg-zinc-900 md:hidden" />

                    {/* DISCOVER WIDGET - Wrapped to look cohesive */}
                    <div className="md:bg-black md:border md:border-zinc-800 md:rounded-lg md:p-8 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <Flame className="w-6 h-6 text-amber-500" />
                                Angesagt in der Community
                            </h3>
                            <Link href="/discover" className="text-xs font-bold text-cyan-500 hover:text-cyan-400 transition-colors flex items-center gap-1">
                                Alles anzeigen <ArrowRight className="w-3" />
                            </Link>
                        </div>
                        <div className="-mx-2 md:mx-0">
                             <DiscoverWidget />
                        </div>
                    </div>

                    {/* Mobile Divider */}
                    <div className="h-px bg-zinc-900 md:hidden" />

                    {/* FORUM WIDGET */}
                    <TrendingForumWidget />

                </div>

                {/* --- RIGHT COLUMN: SIDEBAR --- */}
                <div className="space-y-6 lg:sticky lg:top-8">
                    
                    {/* Mobile Divider (before sidebar on small screens if stacked) */}
                    <div className="h-px bg-zinc-900 lg:hidden" />
                    
                    {/* REPUTATION WIDGET */}
                    <div className="relative group">
                         <TierProgressWidget />
                    </div>

                    {/* COLLECTION TEASER */}
                    <div className="bg-gradient-to-br from-purple-900/20 via-black to-black border border-purple-500/20 hover:border-purple-500/40 p-6 rounded-lg transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-24 bg-purple-500/5 blur-[60px] rounded-full pointer-events-none -mt-10 -mr-10 group-hover:bg-purple-500/10 transition-colors duration-700"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    Sammlung
                                </h3>
                                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20 uppercase font-bold tracking-wide">
                                    2 Kronkorken
                                </span>
                            </div>
                            
                            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                                Verwalte deine einzigartigen Kronkorken und tausche digitale Sammelobjekte.
                            </p>
                            
                            <Link 
                                href="/dashboard/collection" 
                                className="w-full bg-white hover:bg-purple-50 text-black font-bold py-3 rounded-md text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/10 hover:shadow-purple-900/20 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Award className="w-4 h-4 text-purple-600" />
                                Zur Sammlung
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
