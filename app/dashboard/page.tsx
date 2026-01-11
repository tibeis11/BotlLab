'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TierProgressWidget from './components/TierProgressWidget';
import ProfileCompletionRing from './components/ProfileCompletionRing';
import { useAchievementNotification } from '../context/AchievementNotificationContext';
import { supabase, getActiveBrewery } from '@/lib/supabase';

export default function DashboardPage() {
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({
		brewCount: 0,
		bottleCount: 0,
		filledCount: 0,
		collectionCount: 0
	});
	const [recentBrews, setRecentBrews] = useState<any[]>([]);
	const [activeBrewery, setActiveBrewery] = useState<any>(null);
	const [brewRatings, setBrewRatings] = useState<{[key: string]: {avg: number, count: number}}>({});
	const [globalRatingStats, setGlobalRatingStats] = useState({
		avg: 0,
		total: 0,
		distribution: [0,0,0,0,0]
	});
	const [breweryName, setBreweryName] = useState("");
	const [userId, setUserId] = useState<string | null>(null);
	const [profileInfo, setProfileInfo] = useState({
		brewery_name: '',
		founded_year: '',
		logo_url: '',
		banner_url: '',
		location: '',
		website: '',
		bio: ''
	});
	const { showAchievement } = useAchievementNotification();
	const router = useRouter();
    
    // State for Onboarding
    const [isCreatingBrewery, setIsCreatingBrewery] = useState(false);
    const [isJoiningBrewery, setIsJoiningBrewery] = useState(false);
    const [newBreweryName, setNewBreweryName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [onboardingError, setOnboardingError] = useState<string | null>(null);

	useEffect(() => {
		checkAuth();
	}, []);

	async function checkAuth() {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			router.push('/login');
			return;
		}
		loadDashboardData();
	}

	async function loadDashboardData() {
		try {
			setLoading(true);
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return; 
			setUserId(user.id);

			// 1. Kontext: In welcher Brauerei bin ich gerade?
			const brewery = await getActiveBrewery(user.id);
			setActiveBrewery(brewery);

			if (brewery) {
				setBreweryName(brewery.name);
				setProfileInfo({
					brewery_name: brewery.name || '',
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
			{ key: 'brewery_name' },
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
        setLoading(true);
        setOnboardingError(null);

        try {
            // 1. Create Brewery
            const { data: brewery, error: createError } = await supabase
                .from('breweries')
                .insert({ name: newBreweryName.trim() + "'s Squad" })
                .select()
                .single();

            if (createError) throw createError;

            // 2. Add Member as Owner
            const { error: memberError } = await supabase
                .from('brewery_members')
                .insert({
                    brewery_id: brewery.id,
                    user_id: userId,
                    role: 'owner'
                });

            if (memberError) throw memberError;

            // Reload to enter dashboard
            window.location.reload();

        } catch (err: any) {
            console.error(err);
            setOnboardingError(err.message || "Fehler beim Erstellen der Brauerei.");
            setLoading(false);
        }
    }

    async function handleJoinBrewery(e: React.FormEvent) {
        e.preventDefault();
        if(!joinCode.trim()) return;
        setLoading(true);
        setOnboardingError(null);

        try {
             // 1. Check if brewery exists
             const { data: brewery, error: fetchError } = await supabase
                 .from('breweries')
                 .select('id')
                 .eq('id', joinCode.trim())
                 .single();
            
             if (fetchError || !brewery) throw new Error("Brauerei nicht gefunden. ID prüfen.");

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

    // --- Onboarding View for Squadless Users ---
    if (!loading && !activeBrewery) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full space-y-8 text-center">
                    <div>
                        <div className="text-6xl mb-4">🍻</div>
                        <h2 className="text-3xl font-black text-white">Willkommen im BotlLab!</h2>
                        <p className="text-zinc-400 mt-2">
                            Du bist noch keinem Brauerei-Squad zugeordnet. Gründe dein eigenes Team oder tritt einem bestehenden bei.
                        </p>
                    </div>

                    {!isCreatingBrewery && !isJoiningBrewery && (
                        <div className="grid grid-cols-1 gap-4">
                            <button 
                                onClick={() => setIsCreatingBrewery(true)}
                                className="bg-brand text-black font-black py-4 px-6 rounded-2xl hover:bg-cyan-400 transition flex items-center justify-center gap-3 text-lg"
                            >
                                <span>🏰</span>
                                Brauerei gründen
                            </button>
                            <button 
                                onClick={() => setIsJoiningBrewery(true)}
                                className="bg-zinc-800 text-white font-bold py-4 px-6 rounded-2xl hover:bg-zinc-700 transition flex items-center justify-center gap-3"
                            >
                                <span>📩</span>
                                Einladungscode eingeben
                            </button>
                        </div>
                    )}

                    {isCreatingBrewery && (
                        <form onSubmit={handleCreateBrewery} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-bold text-white">Dein Brauerei-Name</h3>
                            <input 
                                type="text"
                                placeholder="z.B. Hopfenrebellen"
                                className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl outline-none focus:border-brand transition text-center font-bold text-lg"
                                autoFocus
                                value={newBreweryName}
                                onChange={e => setNewBreweryName(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsCreatingBrewery(false)} className="flex-1 py-3 rounded-xl hover:bg-zinc-800 font-bold text-zinc-400">Zurück</button>
                                <button className="flex-1 bg-brand text-black font-bold py-3 rounded-xl hover:bg-cyan-400">Los geht's 🚀</button>
                            </div>
                        </form>
                    )}

                    {isJoiningBrewery && (
                        <form onSubmit={handleJoinBrewery} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-bold text-white">Squad ID eingeben</h3>
                            <p className="text-xs text-zinc-500">Frage deinen Squad-Leader nach der Brauerei-ID (in den Teameinstellungen zu finden).</p>
                            <input 
                                type="text"
                                placeholder="UUID Code..."
                                className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl outline-none focus:border-brand transition text-center font-mono text-sm"
                                autoFocus
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsJoiningBrewery(false)} className="flex-1 py-3 rounded-xl hover:bg-zinc-800 font-bold text-zinc-400">Zurück</button>
                                <button className="flex-1 bg-zinc-100 text-black font-bold py-3 rounded-xl hover:bg-white">Beitreten 🤝</button>
                            </div>
                        </form>
                    )}

                    {onboardingError && (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm font-bold animate-in shake">
                            {onboardingError}
                        </div>
                    )}
                </div>
            </div>
        );
    }

	return (
		<div className="space-y-10 py-8">
			<header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
				<div>
					 <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-2">Dashboard</p>
					 <h2 className="text-4xl font-bold text-white">
						 {loading ? 'Lade Daten...' : `Moin, ${breweryName || 'Braumeister'}! 👋`}
					 </h2>
					 <p className="text-zinc-400 mt-2 max-w-lg">
						 Alles unter Kontrolle im Labor. Hier ist der aktuelle Status deiner digitalen Brauerei.
					 </p>
				</div>
        
				<div className="flex gap-3">
					 <Link href="/dashboard/brews" className="bg-white text-black hover:bg-zinc-200 px-5 py-3 rounded-xl font-bold transition flex items-center gap-2">
						 <span>🍺</span> Neues Rezept
					 </Link>
					 <Link href="/dashboard/bottles" className="bg-zinc-800 text-white hover:bg-zinc-700 px-5 py-3 rounded-xl font-bold transition flex items-center gap-2">
						 <span>🏷️</span> Inventar
					 </Link>
				</div>
			</header>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				{/* Profilstatus Kachel */}
				<Link href="/dashboard/profile" className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-600 transition">
					<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-6xl rotate-12">🧩</div>
					<p className="text-sm text-zinc-500 uppercase font-bold tracking-widest mb-3">Profilstatus</p>
					{(() => {
						const fields: Array<{ key: keyof typeof profileInfo; label: string; isDone?: (v: any) => boolean }> = [
							{ key: 'brewery_name', label: 'Name' },
							{ key: 'founded_year', label: 'Gründungsjahr', isDone: (v) => !!(v && String(v).trim().length > 0) },
							{ key: 'logo_url', label: 'Profilbild' },
							{ key: 'banner_url', label: 'Banner' },
							{ key: 'location', label: 'Standort' },
							{ key: 'website', label: 'Webseite' },
							{ key: 'bio', label: 'Über uns' },
						];
						const isFilled = (key: keyof typeof profileInfo, custom?: (v: any) => boolean) => {
							const val = profileInfo[key];
							return custom ? custom(val) : !!(val && String(val).trim().length > 0);
						};
						const completed = fields.reduce((acc, f) => acc + (isFilled(f.key, f.isDone) ? 1 : 0), 0);
						const pending = fields.filter(f => !isFilled(f.key, f.isDone)).map(f => f.label);
						return (
							<div className="flex items-center justify-between gap-4">
								<div className="flex-1">
									<ProfileCompletionRing
										completed={completed}
										total={fields.length}
										label="Profil-Vervollständigung"
										pendingLabels={pending}
										variant="inline"
										showPending={false}
										size={80}
									/>
								</div>
								<div className="shrink-0 text-zinc-400 font-bold">→</div>
							</div>
						);
					})()}
				</Link>
					<div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
							<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-6xl rotate-12">🍺</div>
							<p className="text-sm text-zinc-500 uppercase font-bold tracking-widest">Aktive Rezepte</p>
							<p className="text-4xl font-black text-white mt-1">{loading ? '-' : stats.brewCount}</p>
							<div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center gap-2 text-xs text-zinc-400">
									<span className="text-cyan-500">↗</span> bereit zum Abfüllen
							</div>
					</div>

					<div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
							<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-6xl rotate-12">📦</div>
							<p className="text-sm text-zinc-500 uppercase font-bold tracking-widest">Inventar</p>
							<p className="text-4xl font-black text-white mt-1">{loading ? '-' : stats.bottleCount}</p>
							<div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center gap-2 text-xs text-zinc-400">
									<span className="text-sm font-bold text-white">{stats.filledCount}</span> aktuell befüllt ({stats.bottleCount > 0 ? Math.round((stats.filledCount / stats.bottleCount) * 100) : 0}%)
							</div>
					</div>

					<Link href="/dashboard/collection" className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-600 transition">
							<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-6xl rotate-12">🟡</div>
							<p className="text-sm text-zinc-500 uppercase font-bold tracking-widest">Sammlung</p>
							<p className="text-4xl font-black text-white mt-1">{loading ? '-' : stats.collectionCount}</p>
							<div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center gap-2 text-xs text-zinc-400">
									<span className="text-cyan-500 font-bold">Badge</span> Sammlerstücke gesamt
							</div>
					</Link>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				 <div className="space-y-6">
						<div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
							 <h3 className="text-lg font-bold mb-6 flex items-center gap-2">⭐ Community Feedback</h3>
               
							 <div className="flex items-center gap-8">
									<div className="text-center">
										 <div className="text-5xl font-black text-white">{globalRatingStats.total > 0 ? globalRatingStats.avg : '-'}</div>
										 <div className="flex gap-1 justify-center my-2 text-yellow-500">
												{[1,2,3,4,5].map(s => (
													 <span key={s} className={s <= Math.round(globalRatingStats.avg) ? 'opacity-100' : 'opacity-30'}>★</span>
												))}
										 </div>
										 <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">{globalRatingStats.total} Votes</p>
									</div>

									<div className="flex-1 space-y-2">
										 {[5,4,3,2,1].map((star) => {
												const count = globalRatingStats.distribution[star-1];
												const percent = globalRatingStats.total > 0 ? (count / globalRatingStats.total) * 100 : 0;
												return (
													<div key={star} className="flex items-center gap-3 text-xs">
														 <span className="w-3 font-bold text-zinc-500">{star}</span>
														 <span className="text-yellow-500">★</span>
														 <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
																<div className="h-full bg-cyan-500 rounded-full" style={{ width: `${percent}%` }} />
														 </div>
														 <span className="w-6 text-right text-zinc-600 font-mono">{count}</span>
													</div>
												);
										 })}
									</div>
							 </div>
						</div>

						<div className="bg-gradient-to-br from-purple-900/20 to-pink-900/10 border border-purple-500/20 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden">
							 <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl rotate-12 pointer-events-none">🚀</div>
							 <h3 className="text-2xl font-bold text-white mb-2">Mehr Feedback erhalten?</h3>
							 <p className="text-zinc-400 mb-6 max-w-sm">
									Drucke QR-Codes für deine Flaschen. Gäste können direkt beim Trinken bewerten – ohne App, ohne Login.
							 </p>
							 <div>
									<Link href="/dashboard/bottles" className="bg-white text-black hover:bg-purple-400 font-bold py-3 px-6 rounded-xl transition inline-flex items-center gap-2">
										<span>🖨️</span> Codes drucken
								 </Link>
							 </div>
						</div>

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

				 <TierProgressWidget />
			</div>

			<div>
				<div className="flex justify-between items-end mb-6">
						<h3 className="text-xl font-bold">Zuletzt gebraut</h3>
					<Link href="/dashboard/brews" className="text-sm text-zinc-500 hover:text-white transition">Alle anzeigen →</Link>
				</div>
        
				{loading ? (
					 <div className="h-32 bg-zinc-900/50 rounded-2xl animate-pulse" />
				) : recentBrews.length === 0 ? (
					 <div className="text-center p-12 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
							 <p className="text-zinc-500">Noch keine Rezepte angelegt.</p>
							 <Link href="/dashboard/brews" className="text-cyan-500 font-bold mt-2 inline-block hover:underline">Erstes Bier brauen</Link>
					 </div>
				) : (
					 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							 {recentBrews.map(brew => (
									 <div key={brew.id} className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-600 transition flex flex-col">
											 <div className="flex items-center gap-4 mb-3">
													 <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden shrink-0">
															 {brew.image_url ? (
																	 <img src={brew.image_url} className="w-full h-full object-cover group-hover:scale-110 transition"/>
															 ) : (
																	 <div className="w-full h-full flex items-center justify-center text-xl">🍺</div>
															 )}
													 </div>
													 <div className="flex-1 min-w-0">
															 <h4 className="font-bold text-white truncate">{brew.name}</h4>
															 <p className="text-xs text-zinc-500">{brew.style}</p>
															 <p className="text-[10px] text-zinc-600 mt-1 capitalize">
																	{new Date(brew.created_at).toLocaleDateString('de-DE', { month: 'short', day: 'numeric'})}
															 </p>
													 </div>
													<Link href={`/dashboard/brews`} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-cyan-500 hover:text-black transition shrink-0">
															→
													 </Link>
											 </div>
                       
											 {brewRatings[brew.id] && (
													 <div className="pt-3 border-t border-zinc-800 flex items-center gap-2">
															 <span className="text-sm font-bold text-cyan-400">{brewRatings[brew.id].avg}</span>
															 <div className="flex gap-0.5">
																	 {[1,2,3,4,5].map(star => (
																			 <span key={star} className={`text-xs ${star <= Math.round(brewRatings[brew.id].avg) ? 'text-yellow-500' : 'text-zinc-700'}`}>★</span>
																	 ))}
															 </div>
															 <span className="text-xs text-zinc-500">({brewRatings[brew.id].count})</span>
													 </div>
											 )}
									 </div>
							 ))}
					 </div>
				)}
			</div>
		</div>
	);
}
