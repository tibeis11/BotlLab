'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DiscoverWidget from './components/DiscoverWidget';
import TrendingForumWidget from './components/TrendingForumWidget';
import { Megaphone, Bell, Flame, Plus, Users, ArrowRight, Sparkles, FileText, FlaskConical, QrCode, Compass, Dna } from 'lucide-react';
import { getActiveBrewery } from '@/lib/supabase';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useAuth } from '@/app/context/AuthContext';
import { getBreweryFeed, addToFeed, type FeedItem } from '@/lib/feed-service';
import { createDefaultBreweryTemplate } from '@/lib/actions/label-actions';
import { useBotlGuideInsights } from '@/lib/hooks/useBotlGuideInsights';
import UserAvatar from '@/app/components/UserAvatar';
import { BotlGuideInsightList } from '@/app/components/BotlGuideInsight';

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background text-text-primary flex items-center justify-center">Lade Dashboard...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = useSupabase();
    
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

    // BotlGuide Insights
    const { insights, dismiss: dismissInsight } = useBotlGuideInsights(3);

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
                .select('display_name')
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
                brewery = await getActiveBrewery(user.id, supabase);
            }
            setActiveBrewery(brewery);

            // 3. Load Activity Feed
            if (brewery) {
                const events = await getBreweryFeed(supabase, brewery.id);
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
             await addToFeed(supabase, brewery.id, { id: user!.id }, 'MEMBER_JOINED', { message: 'ist dem Squad beigetreten' });

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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* HEADER SECTION */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
                <div>
                     <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-brand bg-brand-bg border border-brand-dim">
                            Dashboard
                        </span>
                        {activeBrewery && (
                             <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-text-secondary bg-surface border border-border">
                                {activeBrewery.team_name || activeBrewery.name}
                            </span>
                        )}
                     </div>
                    <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight leading-none mb-3">
                        Moin, {userName}
                    </h1>
                    <p className="text-text-muted max-w-xl text-lg leading-relaxed">
                        Alles unter Kontrolle im Labor. Hier ist der aktuelle Status deiner digitalen Brauerei.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start relative">
                
                {/* --- LEFT COLUMN: MAIN CONTENT --- */}
                <div className="space-y-8 min-w-0">

                    {/* BREWERY CARD (Bridge to /team) */}
                    {activeBrewery && (
                        <Link
                            href={`/team/${activeBrewery.id}/dashboard`}
                            className="group flex items-center gap-4 bg-surface rounded-2xl border border-border hover:border-border-hover p-6 transition-all duration-300"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-surface-hover border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                {activeBrewery.logo_url ? (
                                    <img src={activeBrewery.logo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Users className="w-5 h-5 text-text-muted" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-text-primary truncate group-hover:text-brand transition-colors">
                                    {activeBrewery.team_name || activeBrewery.name}
                                </h3>
                                <p className="text-xs text-text-muted">Zum Team-Dashboard</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-text-disabled group-hover:text-brand transition-colors shrink-0" />
                        </Link>
                    )}

                    {/* BOTLGUIDE INSIGHTS */}
                    {insights.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-accent-purple" />
                                <h3 className="text-sm font-bold text-text-primary">BotlGuide sagt…</h3>
                            </div>
                            <BotlGuideInsightList
                                insights={insights}
                                onDismiss={dismissInsight}
                                breweryId={activeBrewery?.id}
                            />
                        </div>
                    )}

                    {/* CASE 1: No Brewery - Show Onboarding */}
                    {!activeBrewery && (
                        <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 relative overflow-hidden">
                             
                             {!isCreatingBrewery && !isJoiningBrewery && (
                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary mb-2">Kein Team, kein Ruhm.</h3>
                                        <p className="text-sm text-text-secondary leading-relaxed max-w-lg">
                                            Du bist aktuell heimatlos. Gründe eine Brauerei oder tritt einem Team bei, um das volle Potential von BotlLab zu nutzen.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <button 
                                            onClick={() => setIsCreatingBrewery(true)}
                                            className="group flex-1 bg-brand hover:bg-brand-hover text-background font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
                                        >
                                            <Plus className="w-5 h-5" />
                                            <span>Squad gründen</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsJoiningBrewery(true)}
                                            className="px-6 py-3 rounded-xl font-bold bg-surface-hover text-text-secondary hover:text-text-primary transition-all border border-border flex items-center gap-2"
                                        >
                                            <Users className="w-5 h-5" />
                                            <span>Beitreten</span>
                                        </button>
                                    </div>
                                </div>
                             )}

                             {isCreatingBrewery && (
                                <form onSubmit={handleCreateBrewery} className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-center border-b border-border pb-4">
                                         <h3 className="text-xl font-bold text-text-primary">Dein Squad-Name</h3>
                                         <button type="button" onClick={() => setIsCreatingBrewery(false)} className="text-text-muted hover:text-text-primary text-sm font-medium transition-colors">Abbrechen</button>
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="z.B. Hopfenrebellen"
                                        className="w-full bg-surface-sunken border border-border rounded-xl px-4 py-3 focus:border-border-active focus:outline-none transition font-bold text-lg text-text-primary placeholder-text-disabled"
                                        autoFocus
                                        value={newBreweryName}
                                        onChange={e => setNewBreweryName(e.target.value)}
                                    />
                                    <button disabled={breweryLoading} className="w-full bg-brand hover:bg-brand-hover text-background font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
                                        {breweryLoading ? 'Erstelle...' : 'Squad erstellen'}
                                    </button>
                                </form>
                             )}

                             {isJoiningBrewery && (
                                <form onSubmit={handleJoinBrewery} className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-center border-b border-border pb-4">
                                         <h3 className="text-xl font-bold text-text-primary">Einladungscode</h3>
                                         <button type="button" onClick={() => setIsJoiningBrewery(false)} className="text-text-muted hover:text-text-primary text-sm font-medium transition-colors">Abbrechen</button>
                                    </div>
                                    <div className="space-y-2">
                                        <input 
                                            type="text"
                                            placeholder="Code eingeben..."
                                            className="w-full bg-surface-sunken border border-border rounded-xl px-4 py-3 focus:border-border-active focus:outline-none transition font-mono text-center text-lg text-text-primary tracking-widest placeholder-text-disabled"
                                            autoFocus
                                            value={joinCode}
                                            onChange={e => setJoinCode(e.target.value)}
                                        />
                                        <p className="text-xs text-center text-text-muted">Frage deinen Squad-Leader nach der ID.</p>
                                    </div>
                                    <button disabled={breweryLoading} className="w-full bg-text-primary text-background font-bold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                        {breweryLoading ? 'Beitrete...' : 'Team beitreten'}
                                    </button>
                                </form>
                             )}

                            {onboardingError && (
                                <div className="mt-4 bg-error-bg text-error p-3 rounded-xl text-sm font-bold border border-error/20">
                                    {onboardingError}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* ACTIVITY FEED */}
                    {activeBrewery && (
                        <div className="bg-surface rounded-2xl border border-border p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-text-primary flex items-center gap-3">
                                    <Megaphone className="w-5 h-5 text-brand" />
                                    Was ist neu im Team?
                                </h3>
                            </div>

                             <div className="space-y-3">
                                {dashboardFeed.length > 0 ? dashboardFeed.slice(0, 3).map((item, i) => {
                                     const isRating = item.type === 'BREW_RATED';
                                     const displayName = isRating 
                                         ? (item.content.author || item.profiles?.display_name || 'Unbekannt')
                                         : (item.profiles?.display_name || 'Unbekannt');

                                     return (
                                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border-subtle hover:bg-surface-hover hover:border-border-hover transition-all group">
                                            <UserAvatar
                                                src={item.profiles?.logo_url}
                                                name={displayName}
                                                userId={item.profiles?.id}
                                                tier={item.profiles?.subscription_tier}
                                                sizeClass="w-8 h-8"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-text-primary text-sm truncate">{displayName}</span>
                                                    <span className="text-[10px] text-text-disabled whitespace-nowrap ml-2">{new Date(item.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors truncate">
                                                    {item.type === 'BREW_CREATED' && <>hat <span className="text-text-primary font-medium">&quot;{item.content.brew_name}&quot;</span> erstellt</>}
                                                    {item.type === 'BREW_RATED' && <>hat <span className="text-text-primary font-medium">&quot;{item.content.brew_name}&quot;</span> bewertet</>}
                                                    {item.type === 'MEMBER_JOINED' && <>ist dem Team beigetreten</>}
                                                    {!['BREW_CREATED', 'BREW_RATED', 'MEMBER_JOINED'].includes(item.type) && <>{item.content.message}</>}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="flex flex-col items-center py-12 gap-4 text-center">
                                         <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto">
                                             <Bell className="w-5 h-5 text-text-disabled" /> 
                                         </div>
                                         <p className="text-text-muted font-medium text-sm">Noch keine Updates in diesem Team.</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}

                    {/* DISCOVER WIDGET */}
                    <div className="bg-surface rounded-2xl border border-border p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-text-primary flex items-center gap-3">
                                <Flame className="w-5 h-5 text-rating" />
                                Angesagt in der Community
                            </h3>
                            <Link href="/discover" className="text-xs font-bold text-brand hover:text-brand-hover transition-colors flex items-center gap-1">
                                Alles anzeigen <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <DiscoverWidget />
                    </div>

                </div>

                {/* --- RIGHT COLUMN: SIDEBAR --- */}
                <div className="space-y-6 lg:sticky lg:top-8">
                    
                    {/* QUICK ACTIONS */}
                    {activeBrewery && (
                        <div className="bg-surface rounded-2xl border border-border p-5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">Schnellzugriff</p>
                            <div className="space-y-1">
                                <Link href={`/team/${activeBrewery.id}/brews`} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all">
                                    <FileText className="w-4 h-4 text-brand" />
                                    Rezept erstellen
                                </Link>
                                <Link href={`/team/${activeBrewery.id}/sessions`} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all">
                                    <FlaskConical className="w-4 h-4 text-brand" />
                                    Session starten
                                </Link>
                                <Link href={`/team/${activeBrewery.id}/labels`} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all">
                                    <QrCode className="w-4 h-4 text-brand" />
                                    Label gestalten
                                </Link>
                                <Link href="/discover" className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all">
                                    <Compass className="w-4 h-4 text-brand" />
                                    Entdecken
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* FORUM HIGHLIGHTS */}
                    <TrendingForumWidget />

                    {/* TASTING IQ TEASER */}
                    <div className="bg-brand-bg border border-brand-dim rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <Dna className="w-5 h-5 text-brand" />
                            <div>
                                <h3 className="text-sm font-bold text-text-primary">Tasting IQ</h3>
                                <p className="text-[10px] text-brand uppercase font-bold tracking-wider">Bald verfügbar</p>
                            </div>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">
                            Dein persönlicher Bier-Kompetenz-Score wächst mit jedem Rating und Beat-the-Brewer-Match.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
