'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TierProgressWidget from './components/TierProgressWidget';
import DiscoverWidget from './components/DiscoverWidget';
import ForumActivityWidget from './components/ForumActivityWidget';
import TrendingForumWidget from './components/TrendingForumWidget';
import { Megaphone } from 'lucide-react';
import { useAchievementNotification } from '../context/AchievementNotificationContext';
import { supabase, getActiveBrewery } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getBreweryFeed, addToFeed, type FeedItem } from '@/lib/feed-service';
import { getTierConfig } from '@/lib/tier-system';
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
					.select('*, data') // Include 'data' column
					.eq('brewery_id', brewery.id)
					.order('created_at', { ascending: false })
					.limit(3);
				
				if (recents) {
					setRecentBrews(recents.map((b: any) => ({ // Map to include specific data properties
                        ...b,
                        abv: b.data?.abv ? parseFloat(b.data.abv) : undefined,
                        ibu: b.data?.ibu ? parseInt(b.data.ibu, 10) : undefined,
                        ebc: b.data?.color ? parseInt(b.data.color, 10) : undefined,
                        original_gravity: b.data?.original_gravity || b.data?.og || b.data?.plato ? parseFloat(String(b.data.original_gravity || b.data.og || b.data.plato)) : undefined,
                    })));
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
			{ key: 'location' },
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
			if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
				showAchievement({
					id: key,
					name: 'Profil fast fertig',
					description: 'Ergänze deine Infos für dein bestes Auftreten.',
					icon: '🧩',
					tier: 'bronze',
					points: 0,
				});
				localStorage.setItem(key, '1');
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
                    name_input: newBreweryName.trim() 
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

             // Feed update
             if (userId) {
                 await addToFeed(brewery.id, { id: userId }, 'MEMBER_JOINED', { message: 'ist dem Squad beigetreten' });
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
        <div className="space-y-8 px-0 md:px-4">
			{/* Header */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Feeds */}
                <div className="lg:col-span-2 space-y-6 divide-y divide-zinc-700/30 md:divide-y-0 [&>*]:py-4 md:[&>*]:py-6">
                     {/* Integration: Onboarding Widget if No ACTIVE Brewery */}
                            {!loading && !activeBrewery && (
                                <div className="md:bg-zinc-900 md:border md:border-zinc-800 md:p-8 md:rounded-3xl text-left relative overflow-hidden md:shadow-xl">
                             <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none grayscale">🏰</div>
                             
                             {!isCreatingBrewery && !isJoiningBrewery && (
                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <h3 className="text-2xl font-black text-white mb-2">Kein Squad, kein Ruhm.</h3>
                                        <p className="text-zinc-400 max-w-md">
                                            Du bist aktuell heimatlos. Gründe eine Brauerei oder tritt einem Team bei, um das volle Potential von BotlLab zu nutzen.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <button 
                                            onClick={() => setIsCreatingBrewery(true)}
                                            className="group flex-1 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black font-extrabold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-cyan-900/20 flex items-center justify-center gap-3"
                                        >
                                            <span className="text-xl group-hover:scale-110 transition-transform duration-300">🏰</span>
                                            <span>Neuen Squad gründen</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsJoiningBrewery(true)}
                                            className="px-6 py-3 rounded-xl font-bold bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition border border-zinc-700/50 flex items-center gap-2"
                                        >
                                            <span className="text-lg opacity-60">📩</span>
                                            <span>Einladungscode?</span>
                                        </button>
                                    </div>
                                </div>
                             )}

                             {isCreatingBrewery && (
                                <form onSubmit={handleCreateBrewery} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 relative z-10 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
                                    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
                                         <div>
                                            <h3 className="text-xl font-black text-white">Dein Squad-Name</h3>
                                            <p className="text-xs text-zinc-500 mt-1">Wie soll euer Brau-Kollektiv heißen?</p>
                                         </div>
                                         <button type="button" onClick={() => setIsCreatingBrewery(false)} className="text-zinc-500 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 transition text-sm font-medium">Abbrechen</button>
                                    </div>
                                    <div className="space-y-2">
                                        <input 
                                            type="text"
                                            placeholder="z.B. Hopfenrebellen"
                                            className="w-full bg-black/40 border border-zinc-700/50 p-4 rounded-xl outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition font-bold text-lg text-white placeholder:text-zinc-700"
                                            autoFocus
                                            value={newBreweryName}
                                            onChange={e => setNewBreweryName(e.target.value)}
                                        />
                                    </div>
                                    <button className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black font-extrabold py-4 rounded-xl transition-all shadow-lg hover:shadow-cyan-900/20 active:scale-[0.98]">
                                        Squad erstellen 🚀
                                    </button>
                                </form>
                             )}

                             {isJoiningBrewery && (
                                <form onSubmit={handleJoinBrewery} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 relative z-10 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
                                    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
                                         <div>
                                            <h3 className="text-xl font-black text-white">Einladungscode</h3>
                                            <p className="text-xs text-zinc-500 mt-1">Gib die ID deines Teams ein.</p>
                                         </div>
                                         <button type="button" onClick={() => setIsJoiningBrewery(false)} className="text-zinc-500 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 transition text-sm font-medium">Abbrechen</button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <input 
                                            type="text"
                                            placeholder="UUID Code..."
                                            className="w-full bg-black/40 border border-zinc-700/50 p-4 rounded-xl outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition font-mono text-base text-center tracking-wider text-white placeholder:text-zinc-700"
                                            autoFocus
                                            value={joinCode}
                                            onChange={e => setJoinCode(e.target.value)}
                                        />
                                        <p className="text-xs text-zinc-500 text-center">Frage deinen Squad-Leader nach der ID (Einstellungen {'>'} Allgemein).</p>
                                    </div>
                                    <button className="w-full bg-white text-black font-extrabold py-4 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98]">
                                        Team beitreten 🤝
                                    </button>
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
                        <div className="md:bg-zinc-900/50 md:border md:border-zinc-800 md:rounded-3xl md:p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
                                        <Megaphone size={20} />
                                    </div>
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
                                    dashboardFeed.map(item => {
                                        const tierConfig = getTierConfig(item.profiles?.tier || 'lehrling');
                                        const avatarUrl = item.profiles?.logo_url || tierConfig.avatarPath;
                                        const tierBorderClass = getTierBorderColor(item.profiles?.subscription_tier);

                                        return (
                                        <Link 
                                            key={item.id} 
                                            href={`/team/${activeBrewery.id}/feed`}
                                            className="block bg-zinc-950 border border-zinc-800/50 rounded-xl p-3 hover:border-zinc-700 transition group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 overflow-hidden text-xs border-2 ${tierBorderClass}`}>
                                                    {item.profiles ? (
                                                        <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <span>{item.type === 'BREW_RATED' ? '⭐' : '👤'}</span>
                                                    )}
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
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Discovery Widget */}
                    <TrendingForumWidget />
                    <DiscoverWidget />
                </div>

                {/* Right Column: Widgets */}
                <div className="space-y-4 divide-y divide-zinc-700/30 md:divide-y-0 [&>*]:py-4 md:[&>*]:py-6">
                    <TierProgressWidget />
                    {userId && <ForumActivityWidget userId={userId} />}

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
