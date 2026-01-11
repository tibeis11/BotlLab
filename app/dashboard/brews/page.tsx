'use client';

import { useEffect, useState } from 'react';
import { supabase, getActiveBrewery } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottlesModal from './components/BottlesModal';
import { getTierConfig, type TierName } from '@/lib/tier-system';

export default function BrewsListPage() {
	const [brews, setBrews] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [userTier, setUserTier] = useState<TierName>('hobby');
	const [brewRatings, setBrewRatings] = useState<{ [key: string]: { avg: number; count: number } }>({});
	const [bottlesModalOpen, setBottlesModalOpen] = useState(false);
	const [selectedBrew, setSelectedBrew] = useState<{ id: string; name: string } | null>(null);
	const [activeBrewery, setActiveBrewery] = useState<any>(null);

	const router = useRouter();

	useEffect(() => {
		checkAuth();
	}, []);

	async function checkAuth() {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			router.push('/login');
			return;
		}
		
		// Load Brewery Context first
		const brewery = await getActiveBrewery(user.id);
		setActiveBrewery(brewery);
		
		if (brewery) {
			fetchBrews(brewery.id, user.id);
		} else {
			// Fallback (selten, da Onboarding jetzt Pflicht ist)
			setLoading(false);
		}
	}

	async function fetchBrews(breweryId: string, userId: string) {
		setLoading(true);

		const { data, error } = await supabase
			.from('brews')
			.select('*, is_public')
			.eq('brewery_id', breweryId) // Filter by Team
			.order('created_at', { ascending: false });
		
		const { data: profile } = await supabase
			.from('profiles')
			.select('tier')
			.eq('id', userId)
			.maybeSingle();
		
		if (profile) {
			setUserTier(profile.tier as TierName);
		}

		if (!error && data) {
			setBrews(data);

			const brewIds = data.map((b) => b.id);
			if (brewIds.length > 0) {
				const { data: ratingData } = await supabase
					.from('ratings')
					.select('brew_id, rating')
					.in('brew_id', brewIds)
					.eq('moderation_status', 'auto_approved');

				if (ratingData) {
					const stats: { [key: string]: { sum: number; count: number } } = {};
					ratingData.forEach((r) => {
						if (!stats[r.brew_id]) stats[r.brew_id] = { sum: 0, count: 0 };
						stats[r.brew_id].sum += r.rating;
						stats[r.brew_id].count += 1;
					});

					const finalRatings: { [key: string]: { avg: number; count: number } } = {};
					Object.keys(stats).forEach((id) => {
						finalRatings[id] = {
							avg: Math.round((stats[id].sum / stats[id].count) * 10) / 10,
							count: stats[id].count,
						};
					});
					setBrewRatings(finalRatings);
				}
			}
		}
		setLoading(false);
	}

	async function toggleVisibility(id: string, currentState: boolean) {
		const { error } = await supabase
			.from('brews')
			.update({ is_public: !currentState })
			.eq('id', id);

		if (!error) {
			setBrews(brews.map((b) => (b.id === id ? { ...b, is_public: !currentState } : b)));
		} else {
			alert('Fehler beim Ändern der Sichtbarkeit: ' + error.message);
		}
	}

	async function deleteBrew(id: string) {
		if (
			!confirm(
				"Möchtest du dieses Rezept wirklich unwiderruflich löschen? \n\nHINWEIS: Alle befüllten Flaschen werden zurückgesetzt (auf 'Leer' gesetzt)."
			)
		)
			return;

		const { error: bottlesError } = await supabase.from('bottles').update({ brew_id: null }).eq('brew_id', id);
		if (bottlesError) {
			console.error('Fehler beim Zurücksetzen der Flaschen:', bottlesError);
		}

		const brew = brews.find((b) => b.id === id);
		if (brew?.image_url) {
			try {
				const url = new URL(brew.image_url);
				const parts = url.pathname.split('/');
				const fileName = parts[parts.length - 1];
				if (fileName) {
					await supabase.storage.from('labels').remove([fileName]);
				}
			} catch (e) {
				console.warn('Konnte Bild-URL nicht parsen:', e);
			}
		}

		const { error } = await supabase.from('brews').delete().eq('id', id);
		if (!error) {
			setBrews(brews.filter((b) => b.id !== id));
		} else {
			alert('Fehler beim Löschen: ' + error.message);
		}
	}

	return (
		<div className="space-y-8">
			<div className="flex justify-between items-end">
				<div>
					<h2 className="text-3xl font-bold tracking-tight text-foreground">Meine Rezepte</h2>
					<p className="text-zinc-400">Verwalte deine Rezepte und gestalte individuelle Labels.</p>
				</div>
				<div className="flex items-center gap-3 bg-surface-hover px-4 py-2 rounded-lg border border-zinc-700/60">
					<span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Gesamt</span>
					<span className="text-lg font-black text-brand leading-none">{brews.length}</span>
				</div>
			</div>

			{loading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-80 bg-surface animate-pulse rounded-2xl" />
					))}
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
					{(() => {
						const tierConfig = getTierConfig(userTier);
						const limitReached = brews.length >= tierConfig.limits.maxBrews;
						
						return (
							<button
								onClick={() => {
									if (limitReached) {
										alert(`Du hast das Limit für deinen ${tierConfig.displayName}-Rang erreicht (${tierConfig.limits.maxBrews} Rezepte).`);
										return;
									}
									router.push('/dashboard/brews/editor/new');
								}}
								className={`flex flex-col justify-center items-center gap-2 border-2 border-dashed rounded-2xl p-4 transition group shadow-inner min-h-[180px]
									${limitReached 
										? 'border-red-500/30 bg-red-500/5 cursor-not-allowed opacity-80' 
										: 'border-zinc-700/80 bg-surface-hover hover:border-brand/60 hover:bg-surface text-foreground'
									}`}
							>
								<div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg transition-transform ${limitReached ? 'bg-zinc-800 text-zinc-500' : 'bg-brand text-black group-hover:scale-105'}`}>
									{limitReached ? '🔒' : '+'}
								</div>
								<div className="text-center space-y-1">
									<p className={`text-sm font-bold ${limitReached ? 'text-zinc-400' : ''}`}>Neues Rezept</p>
									<p className="text-xs text-zinc-500">
										{limitReached 
											? `${brews.length} / ${tierConfig.limits.maxBrews} belegt. Upgrade nötig.`
											: 'Kurz anlegen & Label später bauen.'}
									</p>
								</div>
							</button>
						);
					})()}
					{brews.map((brew) => (
						<div
							key={brew.id}
							className="bg-surface border border-border rounded-2xl overflow-hidden group hover:border-brand/30 transition-all duration-300 shadow-xl"
						>
							<div className="aspect-square relative bg-surface-hover overflow-hidden">
								{brew.image_url ? (
									<img
										src={brew.image_url}
										alt={brew.name}
										className="object-cover w-full h-full group-hover:scale-110 transition duration-700"
									/>
								) : (
									<div className="flex flex-col items-center justify-center h-full text-zinc-600 bg-surface">
										<span className="text-4xl mb-2">🍺</span>
										<p className="text-xs uppercase tracking-widest">Kein Label</p>
									</div>
								)}
								<div className="absolute top-4 left-4 flex flex-col gap-2">
									<span className="bg-black/60 backdrop-blur-md text-[10px] px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 font-bold inline-flex items-center justify-center">
										{brew.style || 'Standard'}
									</span>
									<span className="bg-black/50 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 font-bold inline-flex items-center justify-center">
										{brew.brew_type === 'beer'
											? 'Bier'
											: brew.brew_type === 'wine'
											? 'Wein'
											: brew.brew_type === 'softdrink'
											? 'Softdrink'
											: 'Sonstiges'}
									</span>
								</div>
							</div>

							<div className="p-5 space-y-3">
								<div className="flex items-start justify-between gap-3">
									<Link
										href={`/brew/${brew.id}`}
										className="font-black text-xl leading-tight break-words text-foreground hover:text-brand transition"
									>
										{brew.name}
									</Link>
									<div className="flex gap-1 shrink-0">
										<button
											onClick={() => toggleVisibility(brew.id, brew.is_public)}
											className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-cyan-400 transition"
											title={brew.is_public ? 'Öffentlich (klicken zum Verstecken)' : 'Privat (klicken zum Veröffentlichen)'}
										>
											{brew.is_public ? '👁️' : '🔒'}
										</button>
										<button
											onClick={() => deleteBrew(brew.id)}
											className="p-1.5 hover:bg-surface-hover rounded text-zinc-400 hover:text-red-400 transition"
											title="Löschen"
										>
											🗑️
										</button>
									</div>
								</div>

								{brewRatings[brew.id] ? (
									<div className="flex items-center gap-2">
										<span className="text-sm font-bold text-brand">{brewRatings[brew.id].avg}</span>
										<div className="flex gap-0.5">
											{[1, 2, 3, 4, 5].map((star) => (
												<span
													key={star}
													className={`text-xs ${star <= Math.round(brewRatings[brew.id].avg) ? 'text-yellow-500' : 'text-zinc-700'}`}
												>
													★
												</span>
											))}
										</div>
										<span className="text-xs text-zinc-500">({brewRatings[brew.id].count})</span>
									</div>
								) : (
									<div className="flex items-center gap-2 opacity-60 text-xs text-zinc-500">
										<span>Noch keine Bewertungen</span>
									</div>
								)}

								<div className="flex items-center justify-between text-xs text-zinc-500">
									<span>Braugtag: {new Date(brew.created_at).toLocaleDateString()}</span>
									<span className="flex items-center gap-1 text-zinc-400">
										{brew.is_public ? 'Öffentlich' : 'Privat'} {brew.remix_parent_id ? '• Remix' : ''}
									</span>
								</div>

								<div className="flex gap-2">
									<button
										onClick={() => router.push(`/dashboard/brews/editor/${brew.id}`)}
									className="flex-1 bg-brand hover:brightness-110 text-black py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg"
								>
									✏️ Öffnen
								</button>
								<button
									onClick={() => {
										setSelectedBrew({ id: brew.id, name: brew.name });
										setBottlesModalOpen(true);
									}}
									className="px-3 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl text-sm font-bold transition flex items-center justify-center shadow-lg"
									title="Flaschen anzeigen"
								>
									🍾
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{selectedBrew && (
				<BottlesModal
					brewId={selectedBrew.id}
					brewName={selectedBrew.name}
					isOpen={bottlesModalOpen}
					onClose={() => {
						setBottlesModalOpen(false);
						setSelectedBrew(null);
					}}
				/>
			)}
		</div>
	);
}
