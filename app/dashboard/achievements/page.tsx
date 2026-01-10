'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
	getAllAchievements,
	getUserAchievements,
	getTierColor,
	type Achievement,
	type UserAchievement,
} from '@/lib/achievements';

export default function AchievementsPage() {
	const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
	const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
	const [loading, setLoading] = useState(true);
	const [userId, setUserId] = useState<string | null>(null);
	const [totalPoints, setTotalPoints] = useState(0);
	const [filterCategory, setFilterCategory] = useState<string>('all');
	const [filterTier, setFilterTier] = useState<string>('all');

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
		);
		const { data: { user } } = await supabase.auth.getUser();
    
		if (!user) {
			window.location.href = '/login';
			return;
		}

		setUserId(user.id);

		const [all, userAch] = await Promise.all([
			getAllAchievements(),
			getUserAchievements(user.id),
		]);

		setAllAchievements(all);
		setUserAchievements(userAch);

		const points = userAch.reduce((sum, ua) => {
			const achievement = all.find(a => a.id === ua.achievement_id);
			return sum + (achievement?.points || 0);
		}, 0);
		setTotalPoints(points);

		setLoading(false);
	}

	const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));

	let filteredAchievements = allAchievements;
	if (filterCategory !== 'all') {
		filteredAchievements = filteredAchievements.filter(a => a.category === filterCategory);
	}
	if (filterTier !== 'all') {
		filteredAchievements = filteredAchievements.filter(a => a.tier === filterTier);
	}

	const categories = {
		brewing: filteredAchievements.filter(a => a.category === 'brewing'),
		social: filteredAchievements.filter(a => a.category === 'social'),
		quality: filteredAchievements.filter(a => a.category === 'quality'),
		milestone: filteredAchievements.filter(a => a.category === 'milestone'),
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center">
				<p className="text-zinc-400">Lade Achievements...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen text-white">
			<div className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
				<div className="max-w-7xl mx-auto px-6 py-8">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h1 className="text-3xl font-bold mb-2">🏆 Achievements</h1>
							<p className="text-zinc-400">
								{userAchievements.length} von {allAchievements.length} freigeschaltet • {totalPoints} Punkte
							</p>
						</div>
					</div>

					<div className="flex gap-3 flex-wrap">
						<select
							value={filterCategory}
							onChange={(e) => setFilterCategory(e.target.value)}
							className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm"
						>
							<option value="all">Alle Kategorien</option>
							<option value="brewing">🍺 Brewing</option>
							<option value="social">🌍 Social</option>
							<option value="quality">⭐ Quality</option>
							<option value="milestone">📊 Milestone</option>
						</select>
						<select
							value={filterTier}
							onChange={(e) => setFilterTier(e.target.value)}
							className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm"
						>
							<option value="all">Alle Tiers</option>
							<option value="bronze">Bronze</option>
							<option value="silver">Silber</option>
							<option value="gold">Gold</option>
							<option value="platinum">Platin</option>
						</select>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-6 py-8">
				{userAchievements.length > 0 && (
					<div className="mb-12">
						<h2 className="text-xl font-bold mb-4">🎉 Zuletzt freigeschaltet</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{userAchievements.slice(0, 3).map((ua) => {
								const achievement = allAchievements.find(a => a.id === ua.achievement_id);
								if (!achievement) return null;

								return (
									<div
										key={ua.id}
										className={`p-6 rounded-xl border-2 bg-gradient-to-br from-emerald-500/10 to-transparent ${getTierColor(achievement.tier)}`}
									>
										<div className="text-4xl mb-3">{achievement.icon}</div>
										<h3 className="text-lg font-bold mb-1">{achievement.name}</h3>
										<p className="text-sm text-zinc-400 mb-3">{achievement.description}</p>
										<div className="flex items-center justify-between text-xs">
											<span className="font-semibold">{achievement.points} Punkte</span>
											<span className="text-zinc-500">
												{new Date(ua.unlocked_at).toLocaleDateString('de-DE')}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{Object.entries(categories).map(([category, achievements]) => {
					if (achievements.length === 0) return null;

					const categoryIcons = {
						brewing: '🍺',
						social: '🌍',
						quality: '⭐',
						milestone: '📊',
					};

					const categoryNames = {
						brewing: 'Brewing',
						social: 'Social',
						quality: 'Quality',
						milestone: 'Milestone',
					};

					return (
						<div key={category} className="mb-12">
							<h2 className="text-xl font-bold mb-4">
								{categoryIcons[category as keyof typeof categoryIcons]}{' '}
								{categoryNames[category as keyof typeof categoryNames]}
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{achievements.map((achievement) => {
									const isUnlocked = unlockedIds.has(achievement.id);
									const userAchievement = userAchievements.find(
										ua => ua.achievement_id === achievement.id
									);

									return (
										<div
											key={achievement.id}
											className={`p-6 rounded-xl border-2 transition-all ${
												isUnlocked
													? `${getTierColor(achievement.tier)}`
													: 'border-zinc-800 bg-zinc-900/30 opacity-50 grayscale'
											}`}
										>
											<div className="text-4xl mb-3">
												{isUnlocked ? achievement.icon : '🔒'}
											</div>
											<h3 className="text-lg font-bold mb-1">
												{isUnlocked ? achievement.name : '???'}
											</h3>
											<p className="text-sm text-zinc-400 mb-3">
												{isUnlocked ? achievement.description : 'Noch nicht freigeschaltet'}
											</p>
											<div className="flex items-center justify-between text-xs">
												<span className="font-semibold">{achievement.points} Punkte</span>
												{isUnlocked && userAchievement && (
													<span className="text-zinc-500">
														{new Date(userAchievement.unlocked_at).toLocaleDateString('de-DE')}
													</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}

				{filteredAchievements.length === 0 && (
					<div className="text-center py-12 text-zinc-500">
						Keine Achievements in dieser Kategorie gefunden.
					</div>
				)}
			</div>
		</div>
	);
}
