'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TierProgressWidget from './components/TierProgressWidget';
import { useAchievementNotification } from '../context/AchievementNotificationContext';
import { supabase, getActiveBrewery } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getBreweryFeed, type FeedItem } from '@/lib/feed-service';
import { getTierConfig } from '@/lib/tier-system';

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
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({
		brewCount: 0,
		bottleCount: 0,
		filledCount: 0,
		collectionCount: 0
	});
    const [dashboardFeed, setDashboardFeed] = useState<FeedItem[]>([]);
	const [recentBrews, setRecentBrews] = useState<any[]>([]);
	const [activeBrewery, setActiveBrewery] = useState<any>(null);
	const [brewRatings, setBrewRatings] = useState<{[key: string]: {avg: number, count: number}}>({});
	const [globalRatingStats, setGlobalRatingStats] = useState({
		avg: 0,
		total: 0,
		distribution: [0,0,0,0,0]
	});
	const [breweryName, setBreweryName] = useState("");
	const [userName, setUserName] = useState("");
    const [userTitle, setUserTitle] = useState("");
    const [titleColor, setTitleColor] = useState("");
	const [userId, setUserId] = useState<string | null>(null);
	const [profileInfo, setProfileInfo] = useState({
		display_name: '',
		founded_year: '',
		logo_url: '',
		banner_url: '',
		location: '',
		website: '',
		bio: ''
	});
	const { showAchievement } = useAchievementNotification();
    
    // State for Onboarding
    const [isCreatingBrewery, setIsCreatingBrewery] = useState(false);
    const [isJoiningBrewery, setIsJoiningBrewery] = useState(false);
    const [newBreweryName, setNewBreweryName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [onboardingError, setOnboardingError] = useState<string | null>(null);

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
			setUserId(user.id);

            // Fetch User Profile for Greeting
            const { data: userProfile } = await supabase.from('profiles').select('display_name, tier').eq('id', user.id).single();
            if(userProfile) {
                setUserName(userProfile.display_name);
                const tier = getTierConfig(userProfile.tier || 'lehrling');
                setUserTitle(tier.displayName);
                setTitleColor(tier.color);
            }

			// 1. Kontext: In welcher Brauerei bin ich gerade?
            // Priorität: URL Param > Standard (erste Brauerei)
            let brewery = null;
            const paramId = searchParams.get('breweryId');
            
            if (paramId) {
                const { data: member } = await supabase
                    .from('brewery_members')
                    .select('brewery_id, breweries(*)')
                    .eq('user_id', user.id)
                    .eq('brewery_id', paramId)
                    .maybeSingle();

                 if (member && member.breweries) {
                     brewery = Array.isArray(member.breweries) ? member.breweries[0] : member.breweries;
                }
            }

            if (!brewery) {
			    brewery = await getActiveBrewery(user.id);
            }

			setActiveBrewery(brewery);

			if (brewery) {
				setBreweryName(brewery.name);
				setProfileInfo({
					display_name: brewery.name || '',
					founded_year: brewery.founded_year ? String(brewery.founded_year) : '',
					logo_url: brewery.logo_url || '',
					banner_url: brewery.banner_url || '',
					location: brewery.location || '',
					website: brewery.website || '',
					bio: brewery.description || ''
				});

				// 2. Stats für die Brauerei laden (Squad-Fokus)
				const { count: brewCount } = await supabase
					.from('brews')
					.select('*', { count: 'exact', head: true })
					.eq('brewery_id', brewery.id);
					
				const { count: bottleCount } = await supabase
					.from('bottles')
					.select('*', { count: 'exact', head: true })
					.eq('brewery_id', brewery.id);
					
				const { count: filledCount } = await supabase
					.from('bottles')
					.select('*', { count: 'exact', head: true })
					.eq('brewery_id', brewery.id)
					.not('brew_id', 'is', null);

				const { count: collectionCount } = await supabase
					.from('collected_caps')
					.select('*', { count: 'exact', head: true })
					.eq('user_id', user.id); // Sammlung bleibt persönlich!

				setStats({
					brewCount: brewCount || 0,
					bottleCount: bottleCount || 0,
					filledCount: filledCount || 0,
					collectionCount: collectionCount || 0
				});

				// 3. Rezepte der Brauerei für Ratings & Recent List
				const { data: allBrews } = await supabase
					.from('brews')
					.select('id')
					.eq('brewery_id', brewery.id);
				
				if (allBrews && allBrews.length > 0) {
					const brewIds = allBrews.map(b => b.id);
					const { data: allRatings } = await supabase
						.from('ratings')
						.select('rating')
						.in('brew_id', brewIds)
						.eq('moderation_status', 'auto_approved');

					if (allRatings && allRatings.length > 0) {
						const count = allRatings.length;
						const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
						const avg = Math.round((sum / count) * 10) / 10;
						const dist = [0,0,0,0,0];
						allRatings.forEach(r => {
							if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
						});
						setGlobalRatingStats({ avg, total: count, distribution: dist });
					}
				}

				const { data: recents } = await supabase
					.from('brews')
					.select('*')
					.eq('brewery_id', brewery.id)
					.order('created_at', { ascending: false })
					.limit(3);
				
				if (recents) {
					setRecentBrews(recents);
					const ratingsMap: {[key: string]: {avg: number, count: number}} = {};
					for (const b of recents) {
						const { data: ratings } = await supabase
							.from('ratings')
							.select('rating')
							.eq('brew_id', b.id)
							.eq('moderation_status', 'auto_approved');
						if (ratings && ratings.length > 0) {
							const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
							ratingsMap[b.id] = { avg: Math.round(avg * 10) / 10, count: ratings.length };
						}
					}
					setBrewRatings(ratingsMap);
				}

                // 4. Feed für Dashboard laden (Mini Preview)
                const feedItems = await getBreweryFeed(brewery.id);
                setDashboardFeed(feedItems ? feedItems.slice(0, 3) : []);
			}

		} catch (e) {
			console.error("Dashboard Load Error", e);
		} finally {
			setLoading(false);
		}
	}

	// Show a one-time toast per session if profile is incomplete
	useEffect(() => {
		if (!userId) return;
		const fields: Array<{ key: keyof typeof profileInfo; isDone?: (v: any) => boolean }> = [
			{ key: 'display_name' },
			{ key: 'founded_year', isDone: (v) => !!(v && String(v).trim().length > 0) },
			{ key: 'logo_url' },
			{ key: 'banner_url' },
			{ key: 'location' },
			{ key: 'website' },
			{ key: 'bio' },
		];
		const isFilled = (key: keyof typeof profileInfo, custom?: (v: any) => boolean) => {
			const val = profileInfo[key];
			return custom ? custom(val) : !!(val && String(val).trim().length > 0);
		};
		const total = fields.length;
		const completed = fields.reduce((acc, f) => acc + (isFilled(f.key, f.isDone) ? 1 : 0), 0);
		if (completed < total) {
			const key = `toast-profile-${userId}`;
			if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
				showAchievement({
					id: key,
					name: 'Profil fast fertig',
					description: 'Ergänze Logo, Banner und Infos für dein bestes Auftreten.',
					icon: '🧩',
					tier: 'bronze',
					points: 0,
				});
				sessionStorage.setItem(key, '1');
			}
		}
	}, [profileInfo, userId, showAchievement]);

    async function handleCreateBrewery(e: React.FormEvent) {
        e.preventDefault();
        if(!newBreweryName.trim()) return;
        
        if (!userId) {
            console.error("User ID fehlt!");
            setOnboardingError("Benutzer nicht geladen. Bitte Seite neu laden.");
            return;
        }

        setLoading(true);
        setOnboardingError(null);

        try {
            console.log("Erstelle Brauerei via RPC:", newBreweryName);
            
            // Verwende die sichere RPC Funktion statt manuellem Insert
            const { data: brewery, error: rpcError } = await supabase
                .rpc('create_own_squad', { 
                    name_input: newBreweryName.trim() + "'s Squad" 
                });

            if (rpcError) {
                console.error("RPC Fehler:", rpcError);
                throw rpcError;
            }

            console.log("Brauerei erstellt:", brewery);
            
            // Reload to enter dashboard
            window.location.reload();

        } catch (err: any) {
             console.error("Catch Error Details:", JSON.stringify(err, null, 2));
             // Falls die RPC Funktion noch nicht existiert (SQL nicht ausgeführt)
             if (err?.message?.includes('function create_own_squad') || err?.code === '42883') {
                 setOnboardingError("Bitte führe zuerst die Migration 'add_create_squad_rpc.sql' in Supabase aus!");
             } else {
                 setOnboardingError(err.message || "Fehler beim Erstellen der Brauerei.");
             }
            setLoading(false);
        }
    }

    async function handleJoinBrewery(e: React.FormEvent) {
        e.preventDefault();
        if(!joinCode.trim()) return;
        setLoading(true);
        setOnboardingError(null);

        try {
             // 1. Check if brewery exists by invite code
             const { data: brewery, error: fetchError } = await supabase
                 .from('breweries')
                 .select('id')
                 .eq('invite_code', joinCode.trim())
                 .single();

             if (fetchError || !brewery) throw new Error("Squad nicht gefunden. Code prüfen.");

             // 2. Join as Member (default role)
             const { error: joinError } = await supabase
                .from('brewery_members')
                .insert({
                    brewery_id: brewery.id,
                    user_id: userId,
                    role: 'member'
                });
            
             if (joinError) {
                 if (joinError.code === '23505') throw new Error("Du bist bereits Mitglied in diesem Team.");
                 throw joinError;
             }

             window.location.reload();

        } catch (err: any) {
            console.error(err);
            setOnboardingError(err.message || "Fehler beim Beitreten.");
            setLoading(false);
        }
    }

    // --- Onboarding Logic Integrated into Dashboard ---


	return (
		<div className="space-y-12">
			{/* Header */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-cyan-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-cyan-950/30 border border-cyan-500/20 shadow-sm shadow-cyan-900/20">
                            Dashboard
                        </span>
                        {userTitle && (
                             <span className="text-[10px] font-black px-2 py-1 rounded-lg uppercase border border-white/5 tracking-wider" style={{ borderColor: `${titleColor}50`, color: titleColor, backgroundColor: `${titleColor}10` }}>
                                {userTitle}
                            </span>
                        )}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                        {loading ? 'Lade Daten...' : `Moin, ${userName || 'Braumeister'}! 👋`}
                    </h1>
                    <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
                        Alles unter Kontrolle im Labor. Hier ist der aktuelle Status deiner digitalen Brauerei.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Feeds */}
                <div className="lg:col-span-2 space-y-8">
                     {/* Integration: Onboarding Widget if No ACTIVE Brewery */}
                     {!loading && !activeBrewery && (
                        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-left relative overflow-hidden shadow-xl">
                             <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none grayscale">🏰</div>
                             
                             {!isCreatingBrewery && !isJoiningBrewery && (
                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <h3 className="text-2xl font-black text-white mb-2">Kein Squad, kein Ruhm.</h3>
                                        <p className="text-zinc-400 max-w-md">
                                            Du bist aktuell heimatlos. Gründe eine Brauerei oder tritt einem Team bei, um das volle Potential von BotlLab zu nutzen.
                                        </p>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setIsCreatingBrewery(true)}
                                            className="bg-brand text-black font-black py-6 px-6 rounded-2xl hover:bg-cyan-400 transition flex flex-col items-center justify-center gap-2 text-center border-b-4 border-black/10 active:border-b-0 active:translate-y-1"
                                        >
                                            <span className="text-3xl">🏰</span>
                                            <span>Squad gründen</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsJoiningBrewery(true)}
                                            className="bg-zinc-950 border border-zinc-800 text-white font-bold py-6 px-6 rounded-2xl hover:bg-zinc-800 transition flex flex-col items-center justify-center gap-2 text-center border-b-4 border-black/50 active:border-b-0 active:translate-y-1"
                                        >
                                            <span className="text-3xl">📩</span>
                                            <span>Code eingeben</span>
                                        </button>
                                    </div>
                                </div>
                             )}

                             {isCreatingBrewery && (
                                <form onSubmit={handleCreateBrewery} className="space-y-4 animate-in fade-in relative z-10">
                                    <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
                                         <h3 className="text-xl font-bold text-white">Dein Squad-Name</h3>
                                         <button type="button" onClick={() => setIsCreatingBrewery(false)} className="text-zinc-500 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition">Abbrechen</button>
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="z.B. Hopfenrebellen"
                                        className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl outline-none focus:border-cyan-500 transition font-bold text-lg text-white"
                                        autoFocus
                                        value={newBreweryName}
                                        onChange={e => setNewBreweryName(e.target.value)}
                                    />
                                    <button className="w-full bg-brand text-black font-bold py-4 rounded-xl hover:bg-cyan-400 mt-2">Squad erstellen 🚀</button>
                                </form>
                             )}

                             {isJoiningBrewery && (
                                <form onSubmit={handleJoinBrewery} className="space-y-4 animate-in fade-in relative z-10">
                                    <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
                                         <h3 className="text-xl font-bold text-white">Squad ID eingeben</h3>
                                         <button type="button" onClick={() => setIsJoiningBrewery(false)} className="text-zinc-500 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition">Abbrechen</button>
                                    </div>
                                    <p className="text-xs text-zinc-500">Frage deinen Squad-Leader nach der ID (Einstellungen {'>'} Allgemein).</p>
                                    <input 
                                        type="text"
                                        placeholder="UUID Code..."
                                        className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl outline-none focus:border-cyan-500 transition font-mono text-sm text-white"
                                        autoFocus
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value)}
                                    />
                                    <button className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 mt-2">Beitreten 🤝</button>
                                </form>
                             )}
                             
                             {onboardingError && (
                                <div className="mt-4 bg-red-500/10 text-red-400 p-3 rounded-lg text-sm font-bold animate-in shake border border-red-500/20">
                                    {onboardingError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mini Team Feed */}
                    {activeBrewery && (
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span>📢</span>
                                    Was ist neu im Team?
                                </h3>
                            </div>

                            <div className="space-y-3">
                                {loading ? (
                                    <div className="h-20 bg-zinc-900/50 rounded-xl animate-pulse"/>
                                ) : dashboardFeed.length === 0 ? (
                                    <div className="text-center py-6 text-zinc-500 text-sm">
                                        Noch keine Neuigkeiten. <br/>
                                        <Link href={`/team/${activeBrewery.id}/feed`} className="text-cyan-500 underline">Schreib den ersten Post!</Link>
                                    </div>
                                ) : (
                                    dashboardFeed.map(item => (
                                        <Link 
                                            key={item.id} 
                                            href={`/team/${activeBrewery.id}/feed`}
                                            className="block bg-zinc-950 border border-zinc-800/50 rounded-xl p-3 hover:border-zinc-700 transition group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden text-xs">
                                                    {item.profiles?.logo_url ? <img src={item.profiles.logo_url} className="w-full h-full object-cover"/> : item.type === 'BREW_RATED' ? '⭐' : '👤'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <span className="text-xs font-bold text-white truncate">
                                                            {item.type === 'BREW_RATED' ? (item.content.author || 'Gast') : (item.profiles?.display_name || 'Unbekannt')}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-600">
                                                            {new Date(item.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-zinc-400 truncate group-hover:text-zinc-300 transition">
                                                        {item.type === 'BREW_CREATED' ? `🍺 hat ein neues Rezept "${item.content.brew_name}" erstellt.` : item.content.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Discovery Feed Placeholder */}
                    {activeBrewery && (
                        <div className="bg-zinc-900/10 border border-zinc-800/50 border-dashed rounded-3xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center py-12">
                            <span className="text-4xl mb-4 grayscale opacity-30">🌍</span>
                            <h3 className="text-lg font-bold text-zinc-500">Community Feed wird geladen...</h3>
                            <p className="text-xs text-zinc-600 mt-2 max-w-xs">
                                Hier siehst du bald globale Neuigkeiten, neue öffentliche Rezepte und Trends aus der BotlLab Community.
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Column: Widgets */}
                <div className="space-y-6">
                    <TierProgressWidget />

                    {/* Collection Widget */}
                    <div className="bg-gradient-to-br from-purple-900/20 to-fuchsia-900/10 border border-purple-500/20 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl rotate-12 pointer-events-none">🏅</div>
                        <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-bold text-white">Sammlung</h3>
                        <span className="bg-purple-500/20 text-purple-400 text-xs font-black px-2 py-1 rounded-lg border border-purple-500/30">
                            {loading ? '-' : stats.collectionCount} KRONKORKEN
                        </span>
                        </div>
                        <p className="text-zinc-400 mb-6 max-w-sm text-sm">
                            Verwalte deine einzigartigen Kronkorken und tausche digitale Sammelobjekte.
                        </p>
                        <div>
                            <Link href="/dashboard/collection" className="bg-white text-black hover:bg-purple-400 font-bold py-3 px-6 rounded-xl transition inline-flex items-center gap-2">
                                <span>🏅</span> Zur Sammlung
                            </Link>
                        </div>
                    </div>

                    {/* Achievements Widget */}
                    <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border border-amber-500/20 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl rotate-12 pointer-events-none">🏆</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Achievements</h3>
                        <p className="text-zinc-400 mb-6 max-w-sm">
                            Schalte Erfolge frei und sammle Punkte für deine Brau-Aktivitäten.
                        </p>
                        <div>
                            <Link href="/dashboard/achievements" className="bg-white text-black hover:bg-amber-400 font-bold py-3 px-6 rounded-xl transition inline-flex items-center gap-2">
                                <span>🏆</span> Zu den Achievements
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
		</div>
	);
}
