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
import CustomSelect from '@/app/components/CustomSelect';
import { 
    Trophy, 
    Medal, 
    Search, 
    Filter, 
    Star, 
    Zap, 
    Award, 
    Share2, 
    Beer, 
    Globe, 
    BarChart3, 
    Target, 
    Users, 
    FlaskConical, 
    LayoutGrid,
    Sparkles,
    Flag
} from 'lucide-react';

export default function AchievementsPage() {
    const { user, loading: authLoading } = useAuth();
	const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
	const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
	const [loading, setLoading] = useState(true);
	
	const [totalPoints, setTotalPoints] = useState(0);
	const [filterCategory, setFilterCategory] = useState<string>('all');
	const [filterTier, setFilterTier] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
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
    if (searchQuery) {
        filteredAchievements = filteredAchievements.filter(a => 
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            a.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // Sort: Unlocked first, then by points high to low
    filteredAchievements.sort((a, b) => {
        const aUnlocked = unlockedIds.has(a.id);
        const bUnlocked = unlockedIds.has(b.id);
        if (aUnlocked && !bUnlocked) return -1;
        if (!aUnlocked && bUnlocked) return 1;
        return b.points - a.points;
    });

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
			</div>
		);
	}

	return (
		<div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-8">
                <div>
                     <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-amber-500 bg-amber-950/30 border border-amber-500/20">
                            Halle des Ruhms
                        </span>
                     </div>
                    <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">Meine Erfolge</h1>
                 </div>
             </header>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start relative">
                
                {/* --- SIDEBAR --- */}
                <div className="space-y-6 hidden lg:block lg:sticky lg:top-8 z-20">
                    
                    {/* Main Stats */}
                    <div className="grid grid-cols-2 gap-3">
                         <div className="md:bg-black border border-zinc-800 p-4 rounded-lg flex flex-col justify-between h-24 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div className="text-amber-500 text-xs font-bold uppercase tracking-wider relative z-10">Punkte</div>
                            <div className="text-2xl font-mono font-bold text-amber-400 relative z-10">{totalPoints}</div>
                        </div>
                        <div className="md:bg-black border border-zinc-800 p-4 rounded-lg flex flex-col justify-between h-24 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider relative z-10">Unlocked</div>
                            <div className="text-2xl font-mono font-bold text-emerald-400 relative z-10">{userAchievements.length}</div>
                        </div>
                    </div>

                    {/* Filters Card */}
                    <div className="md:bg-black border border-zinc-800 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Filter className="w-4 h-4 text-zinc-400" />
                                Filter
                            </h3>
                            {filterCategory !== 'all' && (
                                <button 
                                    onClick={() => setFilterCategory('all')} 
                                    className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                        <div className="p-2 space-y-1">
                             {[
                                { id: 'all', label: 'Alle Erfolge', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                                { id: 'brewing', label: 'Brewing', icon: <FlaskConical className="w-3.5 h-3.5" /> },
                                { id: 'social', label: 'Social', icon: <Users className="w-3.5 h-3.5" /> },
                                { id: 'quality', label: 'Quality', icon: <Star className="w-3.5 h-3.5" /> },
                                { id: 'milestone', label: 'Milestones', icon: <Target className="w-3.5 h-3.5" /> },
                             ].map((cat) => (
                                 <button
                                    key={cat.id}
                                    onClick={() => setFilterCategory(cat.id)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded text-xs font-bold transition-all ${
                                        filterCategory === cat.id 
                                            ? 'bg-zinc-900 text-white shadow-sm' 
                                            : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'
                                    }`}
                                 >
                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${filterCategory === cat.id ? 'bg-zinc-800' : 'bg-zinc-900 border border-zinc-800'}`}>
                                        {cat.icon}
                                    </div>
                                    {cat.label}
                                 </button>
                             ))}
                        </div>
                    </div>

                     {/* Tier Filter */}
                     <div className="md:bg-black border border-zinc-800 rounded-lg p-4 space-y-3">
                         <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Seltenheit</h3>
                         <div className="flex flex-wrap gap-2">
                            {['all', 'bronze', 'silver', 'gold', 'platinum'].map(tier => {
                                const tiers = {
                                    all: { color: 'bg-zinc-800 text-zinc-300', label: 'Alle' },
                                    bronze: { color: 'bg-amber-900/20 text-amber-600 border-amber-900/30', label: 'Bronze' },
                                    silver: { color: 'bg-zinc-300/20 text-zinc-400 border-zinc-500/30', label: 'Silber' },
                                    gold: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Gold' },
                                    platinum: { color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', label: 'Platin' }
                                };
                                const t = tiers[tier as keyof typeof tiers];
                                const active = filterTier === tier;
                                
                                return (
                                    <button 
                                        key={tier}
                                        onClick={() => setFilterTier(tier)}
                                        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                            active ? t.color + ' border-current shadow-sm' : 'border-transparent bg-zinc-900 text-zinc-600 hover:bg-zinc-800'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                         </div>
                     </div>
                </div>

                {/* --- MAIN CONTENT --- */}
                <div className="space-y-6">
                    
                    <div className="flex flex-col gap-4">
                        {/* Search */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Erfolge durchsuchen..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded py-2 pl-10 pr-4 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 lg:hidden">
                            <CustomSelect
                                value={filterCategory}
                                onChange={(val: any) => setFilterCategory(val)}
                                options={[
                                    { value: 'all', label: 'Alle Kategorien' },
                                    { value: 'brewing', label: 'Brewing' },
                                    { value: 'social', label: 'Social' },
                                    { value: 'quality', label: 'Quality' },
                                    { value: 'milestone', label: 'Milestones' },
                                ]}
                            />
                            <CustomSelect
                                value={filterTier}
                                onChange={(val: any) => setFilterTier(val)}
                                options={[
                                    { value: 'all', label: 'Alle Ränge' },
                                    { value: 'bronze', label: 'Bronze' },
                                    { value: 'silver', label: 'Silber' },
                                    { value: 'gold', label: 'Gold' },
                                    { value: 'platinum', label: 'Platin' },
                                ]}
                            />
                        </div>
                    </div>
                    
                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                         {filteredAchievements.map((achievement) => {
                                    const isUnlocked = unlockedIds.has(achievement.id);
                                    const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
                                    
                                    // Icon Selection
                                    let IconComponent = Trophy; // Default
                                    if (achievement.category === 'brewing') IconComponent = FlaskConical;
                                    if (achievement.category === 'social') IconComponent = Users;
                                    if (achievement.category === 'quality') IconComponent = Star;
                                    if (achievement.category === 'milestone') IconComponent = Target;

                                    // Custom colors based on logic
                                    let borderColor = 'border-zinc-800';
                                    let bgGradient = 'from-zinc-900 to-zinc-950';
                                    let iconColor = isUnlocked ? 'text-white' : 'text-zinc-700';
                                    
                                    if (isUnlocked) {
                                         if (achievement.tier === 'bronze') {
                                             borderColor = 'border-amber-900/50';
                                             bgGradient = 'from-amber-950/20 to-zinc-900/50';
                                             iconColor = 'text-amber-600';
                                         }
                                         if (achievement.tier === 'silver') {
                                             borderColor = 'border-zinc-600/50';
                                             bgGradient = 'from-zinc-800/20 to-zinc-900/50';
                                             iconColor = 'text-zinc-400';
                                         }
                                         if (achievement.tier === 'gold') {
                                             borderColor = 'border-yellow-500/50';
                                             bgGradient = 'from-yellow-900/20 to-zinc-900/50';
                                             iconColor = 'text-yellow-500';
                                         }
                                         if (achievement.tier === 'platinum') {
                                             borderColor = 'border-cyan-500/50';
                                             bgGradient = 'from-cyan-900/20 to-zinc-900/50';
                                             iconColor = 'text-cyan-400';
                                         }
                                    }

                                    return (
                                        <div
                                            key={achievement.id}
                                            className={`
                                                relative p-5 rounded-lg border transition-all duration-300 flex flex-col h-full group
                                                bg-gradient-to-br ${bgGradient}
                                                ${isUnlocked ? borderColor + ' shadow-lg' : 'border-zinc-800/60 opacity-60 hover:opacity-100 md:bg-black'}
                                            `}
                                        >   
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`p-3 rounded bg-zinc-950 border border-zinc-800/50 shadow-inner ${isUnlocked ? 'grayscale-0' : 'grayscale brightness-50'}`}>
                                                    <IconComponent className={`w-8 h-8 ${iconColor}`} strokeWidth={1.5} />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-mono font-bold text-sm ${isUnlocked ? 'text-white' : 'text-zinc-600'}`}>
                                                        {achievement.points} <span className="text-[10px] text-zinc-600">XP</span>
                                                    </span>
                                                    {isUnlocked && (
                                                        <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 rounded border border-emerald-500/20 mt-1">Unlocked</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex-1">
                                                <h3 className={`font-bold mb-2 leading-tight ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>
                                                    {achievement.name}
                                                </h3>
                                                <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                                                    {achievement.description}
                                                </p>
                                            </div>
                                            
                                            {isUnlocked && userAchievement && (
                                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] text-zinc-600 font-mono">
                                                        {new Date(userAchievement.unlocked_at).toLocaleDateString()}
                                                    </span>
                                                    <button className="text-zinc-600 hover:text-white transition-colors" title="Teilen">
                                                        <Share2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                        })}
                    </div>

                    {filteredAchievements.length === 0 && (
                        <div className="p-12 text-center text-zinc-500 md:bg-black border border-zinc-800 rounded-lg border-dashed">
                             <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                             <p>Keine Achievements gefunden.</p>
                        </div>
                    )}
                </div>
            </div>
		</div>
	);
}

