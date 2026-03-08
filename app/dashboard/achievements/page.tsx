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
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rating"></div>
			</div>
		);
	}

	return (
		<div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
                <div>
                     <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-rating bg-rating/10 border border-rating/20">
                            Halle des Ruhms
                        </span>
                     </div>
                    <h1 className="text-3xl font-black text-text-primary tracking-tight leading-none mb-2">Meine Erfolge</h1>
                 </div>
             </header>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start relative">
                
                {/* --- SIDEBAR --- */}
                <div className="space-y-6 hidden lg:block lg:sticky lg:top-8 z-20">
                    
                    {/* Main Stats */}
                    <div className="grid grid-cols-2 gap-3">
                         <div className="md:bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-rating/30 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-br from-rating/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div className="text-rating text-xs font-bold uppercase tracking-wider relative z-10">Punkte</div>
                            <div className="text-2xl font-mono font-bold text-rating relative z-10">{totalPoints}</div>
                        </div>
                        <div className="md:bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-success/30 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div className="text-success text-xs font-bold uppercase tracking-wider relative z-10">Unlocked</div>
                            <div className="text-2xl font-mono font-bold text-success relative z-10">{userAchievements.length}</div>
                        </div>
                    </div>

                    {/* Filters Card */}
                    <div className="md:bg-surface border border-border rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                <Filter className="w-4 h-4 text-text-muted" />
                                Filter
                            </h3>
                            {filterCategory !== 'all' && (
                                <button 
                                    onClick={() => setFilterCategory('all')} 
                                    className="text-[10px] text-text-muted hover:text-text-primary uppercase font-bold"
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
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-bold transition-all ${
                                        filterCategory === cat.id 
                                            ? 'bg-surface-hover text-text-primary shadow-sm' 
                                            : 'text-text-muted hover:bg-surface-hover/50 hover:text-text-secondary'
                                    }`}
                                 >
                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${filterCategory === cat.id ? 'bg-surface-raised' : 'bg-surface border border-border'}`}>
                                        {cat.icon}
                                    </div>
                                    {cat.label}
                                 </button>
                             ))}
                        </div>
                    </div>

                     {/* Tier Filter */}
                     <div className="md:bg-surface border border-border rounded-2xl p-4 space-y-3">
                         <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Seltenheit</h3>
                         <div className="flex flex-wrap gap-2">
                            {['all', 'bronze', 'silver', 'gold', 'platinum'].map(tier => {
                                const tiers = {
                                    all: { color: 'bg-surface-hover text-text-secondary', label: 'Alle' },
                                    bronze: { color: 'bg-orange-500/10 text-orange-700 dark:text-amber-600 border-orange-600/30 dark:border-amber-900/30', label: 'Bronze' },
                                    silver: { color: 'bg-border/20 text-text-secondary border-border-hover/50', label: 'Silber' },
                                    gold: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Gold' },
                                    platinum: { color: 'bg-brand/10 text-brand border-brand/20', label: 'Platin' }
                                };
                                const t = tiers[tier as keyof typeof tiers];
                                const active = filterTier === tier;
                                
                                return (
                                    <button 
                                        key={tier}
                                        onClick={() => setFilterTier(tier)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                            active ? t.color + ' border-current shadow-sm' : 'border-transparent bg-surface-hover text-text-disabled hover:bg-surface-raised'
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
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-text-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Erfolge durchsuchen..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-surface border border-border rounded-2xl py-2 pl-10 pr-4 text-sm text-text-primary focus:border-rating/50 focus:ring-1 focus:ring-rating/20 focus:outline-none transition-all placeholder:text-text-disabled"
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

                                    // Custom colors based on tier (only tint when unlocked)
                                    let borderColor = 'border-border';
                                    let bgGradient = 'from-surface to-background';
                                    let iconColor = isUnlocked ? 'text-text-primary' : 'text-text-disabled';
                                    
                                    if (isUnlocked) {
                                         if (achievement.tier === 'bronze') {
                                             borderColor = 'border-orange-600/30 dark:border-amber-900/50';
                                             bgGradient = 'from-orange-200/40 dark:from-amber-950/20 to-surface/50';
                                             iconColor = 'text-orange-700 dark:text-amber-600';
                                         }
                                         if (achievement.tier === 'silver') {
                                             borderColor = 'border-border-hover/40 dark:border-border/50';
                                             bgGradient = 'from-surface-hover/60 dark:from-surface-hover/20 to-surface/50';
                                             iconColor = 'text-text-muted dark:text-text-secondary';
                                         }
                                         if (achievement.tier === 'gold') {
                                             borderColor = 'border-yellow-500/40 dark:border-yellow-500/50';
                                             bgGradient = 'from-yellow-200/40 dark:from-yellow-900/20 to-surface/50';
                                             iconColor = 'text-yellow-600 dark:text-yellow-500';
                                         }
                                         if (achievement.tier === 'platinum') {
                                             borderColor = 'border-cyan-500/40 dark:border-brand/50';
                                             bgGradient = 'from-cyan-200/30 dark:from-brand/10 to-surface/50';
                                             iconColor = 'text-cyan-600 dark:text-brand';
                                         }
                                    }

                                    return (
                                        <div
                                            key={achievement.id}
                                            className={`
                                                relative p-5 rounded-2xl border transition-all duration-300 flex flex-col h-full group
                                                bg-gradient-to-br ${bgGradient}
                                                ${isUnlocked ? borderColor + ' shadow-lg' : 'border-border/60 opacity-60 hover:opacity-100 md:bg-surface'}
                                            `}
                                        >   
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`p-3 rounded-xl bg-surface-sunken border border-border/50 shadow-inner ${isUnlocked ? 'grayscale-0' : 'grayscale brightness-50'}`}>
                                                    <IconComponent className={`w-8 h-8 ${iconColor}`} strokeWidth={1.5} />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-mono font-bold text-sm ${isUnlocked ? 'text-text-primary' : 'text-text-disabled'}`}>
                                                        {achievement.points} <span className="text-[10px] text-text-disabled">XP</span>
                                                    </span>
                                                    {isUnlocked && (
                                                        <span className="text-[10px] text-success font-bold bg-success-bg px-1.5 rounded border border-success/20 mt-1">Unlocked</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex-1">
                                                <h3 className={`font-bold mb-2 leading-tight ${isUnlocked ? 'text-text-primary' : 'text-text-muted'}`}>
                                                    {achievement.name}
                                                </h3>
                                                <p className="text-xs text-text-muted leading-relaxed font-medium">
                                                    {achievement.description}
                                                </p>
                                            </div>
                                            
                                            {isUnlocked && userAchievement && (
                                                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
                                                    <span className="text-[10px] text-text-disabled font-mono">
                                                        {new Date(userAchievement.unlocked_at).toLocaleDateString()}
                                                    </span>
                                                    <button className="text-text-disabled hover:text-text-primary transition-colors" title="Teilen">
                                                        <Share2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                        })}
                    </div>

                    {filteredAchievements.length === 0 && (
                        <div className="p-12 text-center text-text-muted md:bg-surface border border-border rounded-2xl border-dashed">
                             <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                             <p>Keine Achievements gefunden.</p>
                        </div>
                    )}
                </div>
            </div>
		</div>
	);
}

