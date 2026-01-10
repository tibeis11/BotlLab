'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TierProgressWidget from './components/TierProgressWidget';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({
		brewCount: 0,
		bottleCount: 0,
		filledCount: 0
	});
	const [recentBrews, setRecentBrews] = useState<any[]>([]);
	const [brewRatings, setBrewRatings] = useState<{[key: string]: {avg: number, count: number}}>({});
	const [globalRatingStats, setGlobalRatingStats] = useState({
		avg: 0,
		total: 0,
		distribution: [0,0,0,0,0]
	});
	const [breweryName, setBreweryName] = useState("");
	const router = useRouter();

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

			const { data: profile } = await supabase.from('profiles').select('brewery_name').eq('id', user.id).single();
			if (profile?.brewery_name) setBreweryName(profile.brewery_name);

			const { count: brewCount } = await supabase
				.from('brews')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', user.id);
        
			const { count: bottleCount } = await supabase
				.from('bottles')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', user.id);
        
			const { count: filledCount } = await supabase
				.from('bottles')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', user.id)
				.not('brew_id', 'is', null);

			setStats({
				brewCount: brewCount || 0,
				bottleCount: bottleCount || 0,
				filledCount: filledCount || 0
			});

			const { data: allBrews } = await supabase
				.from('brews')
				.select('id')
				.eq('user_id', user.id);
      
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
						 if (r.rating >= 1 && r.rating <= 5) {
							 dist[r.rating - 1]++;
						 }
					 });
					 setGlobalRatingStats({
						 avg,
						 total: count,
						 distribution: dist
					 });
				}
			}

			const { data: recents } = await supabase
				.from('brews')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false })
				.limit(3);
      
			if (recents) {
				setRecentBrews(recents);
				const ratingsMap: {[key: string]: {avg: number, count: number}} = {};
				for (const brew of recents) {
					const { data: ratings } = await supabase
						.from('ratings')
						.select('rating')
						.eq('brew_id', brew.id)
						.eq('moderation_status', 'auto_approved');
          
					if (ratings && ratings.length > 0) {
						const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
						ratingsMap[brew.id] = {
							avg: Math.round(avg * 10) / 10,
							count: ratings.length
						};
					}
				}
				setBrewRatings(ratingsMap);
			}

		} catch (e) {
			console.error("Dashboard Load Error", e);
		} finally {
			setLoading(false);
		}
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

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

					<div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
							<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-6xl rotate-12">⭐</div>
							<p className="text-sm text-zinc-500 uppercase font-bold tracking-widest">Qualität</p>
							<p className="text-4xl font-black text-white mt-1">{loading ? '-' : (globalRatingStats.total > 0 ? globalRatingStats.avg : '-')}</p>
							<div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center gap-2 text-xs text-zinc-400">
									<span className="text-yellow-500 font-bold">{globalRatingStats.total}</span> Bewertungen gesamt
							</div>
					</div>
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
