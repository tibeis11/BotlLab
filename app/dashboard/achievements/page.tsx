'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
	getAllAchievements,
	getUserAchievements,
	getTierColor,
	type Achievement,
	type UserAchievement,
} from '@/lib/achievements';

export default function AchievementsPage() {
    const { user, loading: authLoading } = useAuth();
	const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
	const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
	const [loading, setLoading] = useState(true);
	
	const [totalPoints, setTotalPoints] = useState(0);
	const [filterCategory, setFilterCategory] = useState<string>('all');
	const [filterTier, setFilterTier] = useState<string>('all');
    const router = useRouter();

	useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else {
                loadData();
            }
        }
	}, [user, authLoading]);

	async function loadData() {
		if (!user) return;
    
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
			<div className="flex items-center justify-center min-h-[50vh]">
				<div className="animate-spin text-4xl">🟡</div>
			</div>
		);
	}

	return (
		<div className="space-y-12">
            {/* Header */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-amber-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-amber-950/30 border border-amber-500/20 shadow-sm shadow-amber-900/20">
                            Halle des Ruhms
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Meine Erfolge</h1>
                    <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
                        Sammle Punkte durch Interaktionen und entdecke neue Möglichkeiten.
                        Jedes Abzeichen markiert einen Meilenstein auf deiner Reise.
                    </p>
                </div>
                
                <div className="lg:justify-self-end flex flex-wrap gap-4">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col min-w-[160px] flex-1 lg:flex-none">
                        <span className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-1">Fortschritt</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white">{userAchievements.length}</span>
                            <span className="text-sm text-zinc-500 font-bold">/ {allAchievements.length}</span>
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col min-w-[160px] flex-1 lg:flex-none">
                        <span className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-1">Gesamtpunkte</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-amber-400">{totalPoints}</span>
                            <span className="text-sm text-zinc-500 font-bold">XP</span>
                        </div>
                    </div>
                </div>
            </div>

			<div className="space-y-8">
                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-300 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
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
                        className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-300 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                    >
                        <option value="all">Alle Stufen</option>
                        <option value="bronze">🥉 Bronze</option>
                        <option value="silver">🥈 Silber</option>
                        <option value="gold">🥇 Gold</option>
                        <option value="platinum">💎 Platin</option>
                    </select>
                </div>
            </div>

            {/* Content Grid */}
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                {/* Section: Recently Unlocked (Simulated/Calculated) */}
                {userAchievements.length > 0 && filterCategory === 'all' && filterTier === 'all' && (
                    <div className="mb-12">
                        <h2 className="text-xl font-bold mb-4 text-white">🎉 Zuletzt freigeschaltet</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {userAchievements
                              .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
                              .slice(0, 4)
                              .map((ua) => {
                                const achievement = allAchievements.find(a => a.id === ua.achievement_id);
                                if (!achievement) return null;

                                return (
                                    <div
                                        key={`recent-${ua.id}`}
                                        className={`p-6 rounded-xl border-2 bg-gradient-to-br from-emerald-500/10 to-transparent ${getTierColor(achievement.tier)}`}
                                    >
                                        <div className="text-4xl mb-3">{achievement.icon}</div>
                                        <h3 className="text-lg font-bold mb-1">{achievement.name}</h3>
                                        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{achievement.description}</p>
                                        <div className="flex items-center justify-between text-xs opacity-70">
                                            <span className="font-semibold">{achievement.points} Punkte</span>
                                            <span>{new Date(ua.unlocked_at).toLocaleDateString('de-DE')}</span>
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
                        milestone: 'Milestones',
                    };

                    return (
                        <div key={category} className="space-y-4 pt-4">
                            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                                <span className="text-xl">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                                <h2 className="text-xl font-bold text-white capitalize">
                                    {categoryNames[category as keyof typeof categoryNames]}
                                </h2>
                                <span className="text-zinc-500 font-normal opacity-50 text-sm">({achievements.length})</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {achievements.map((achievement) => {
                                    const isUnlocked = unlockedIds.has(achievement.id);
                                    const userAchievement = userAchievements.find(
                                        ua => ua.achievement_id === achievement.id
                                    );
                                    
                                    const tierClass = getTierColor(achievement.tier);

                                    return (
                                        <div
                                            key={achievement.id}
                                            className={`
                                                relative p-6 rounded-xl border-2 transition-all duration-300
                                                ${isUnlocked 
                                                    ? `${tierClass}` 
                                                    : 'border-zinc-800 bg-zinc-900/30 opacity-50 grayscale'
                                                }
                                            `}
                                        >
                                            <div className="text-4xl mb-3">
                                                {isUnlocked ? achievement.icon : '🔒'}
                                            </div>

                                            <h3 className="text-lg font-bold mb-1 line-clamp-1">
                                                {isUnlocked ? achievement.name : '???'}
                                            </h3>
                                            <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                                                {isUnlocked ? achievement.description : 'Noch nicht freigeschaltet'}
                                            </p>

                                            <div className="flex items-center justify-between text-xs opacity-70">
                                                <span className="font-semibold">{achievement.points} Punkte</span>
                                                {isUnlocked && userAchievement && (
                                                    <span>
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
                    <div className="col-span-full py-20 text-center space-y-4 opacity-50">
                        <div className="text-4xl">🔍</div>
                        <p className="text-zinc-400 font-bold">Keine Achievements gefunden.</p>
                    </div>
                )}
            </div>
		</div>
	);
}
