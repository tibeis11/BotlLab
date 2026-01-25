'use client';

import { useEffect, useState } from 'react';
import { getTierConfig, getNextTier, calculateTierProgress, getDaysActive, type TierName, type ReputationLevelConfig } from '@/lib/tier-system';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';

export default function TierProgressWidget() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tierData, setTierData] = useState<{
    currentTier: string;
    daysActive: number;
    bottlesScanned: number;
    globalCheers: number;
  } | null>(null);

  useEffect(() => {
    if (user) loadTierData();
  }, [user]);

  async function loadTierData() {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier, total_bottle_fills, total_profile_views, joined_at')
        .eq('id', user.id)
        .single();

      // Fetch additional stats for "Actions"
      const { count: brewCount } = await supabase.from('brews').select('id', { count: 'exact', head: true }).eq('created_by', user.id);
      const { count: postCount } = await supabase.from('forum_posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id);

      if (profile) {
        const totalActions = (profile.total_bottle_fills || 0) + (brewCount || 0) + (postCount || 0);

        setTierData({
          currentTier: profile.tier || 'lehrling',
          daysActive: getDaysActive(profile.joined_at || new Date().toISOString()),
          bottlesScanned: totalActions, // Mapping fills + brews + posts to actions
          globalCheers: profile.total_profile_views || 0,   // Mapping views to reputation/cheers
        });
      }
    } catch (e) {
      console.error('Failed to load tier data:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !tierData) {
    return (
      <div className="bg-transparent md:bg-zinc-900 md:border md:border-zinc-800 md:rounded-3xl md:p-6 md:shadow-xl animate-pulse">
        <div className="h-24 md:bg-zinc-800 rounded-xl"></div>
      </div>
    );
  }

  const currentConfig = getTierConfig(tierData.currentTier) as ReputationLevelConfig;
  const nextTier = getNextTier(tierData.currentTier) as ReputationLevelConfig | null;
  
  const { progress, unlockedRequirements, totalRequirements } = calculateTierProgress(
    tierData.currentTier,
    tierData.daysActive,
    tierData.bottlesScanned,
    tierData.globalCheers
  );

  const isMaxTier = !nextTier;

  return (
    <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/10 border border-cyan-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-10 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${currentConfig.color}, transparent)` }}
      />

      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl p-0.5"
              style={{ backgroundColor: `${currentConfig.color}20`, borderColor: `${currentConfig.color}40`, borderWidth: 1 }}
            >
              <img src={currentConfig.avatarPath} alt="Current" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Dein Ruf</div>
              <h3 className="text-3xl font-black text-white leading-none">{currentConfig.displayName}</h3>
              <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1">
                 <span style={{ color: currentConfig.color }}>●</span> Aktiver Status
              </p>
            </div>
          </div>
        </div>

        {!isMaxTier && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400">Fortschritt</span>
              <span className="text-xs font-bold" style={{ color: currentConfig.color }}>
                {unlockedRequirements}/{totalRequirements} Anforderungen erfüllt
              </span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: currentConfig.color }}
              />
            </div>
          </div>
        )}

        {!isMaxTier && nextTier && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <RequirementCard
              label="Tage aktiv"
              current={tierData.daysActive}
              required={nextTier.requirements.daysActive}
              icon="📅"
              color={currentConfig.color}
            />
            <RequirementCard
              label="Aktionen"
              current={tierData.bottlesScanned}
              required={nextTier.requirements.bottlesScanned}
              icon="🎯"
              color={currentConfig.color}
            />
            <RequirementCard
              label="Reputation"
              current={tierData.globalCheers}
              required={nextTier.requirements.globalCheers}
              icon="👁️"
              color={currentConfig.color}
            />
          </div>
        )}

        {isMaxTier && (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">👑</div>
            <p className="text-sm font-bold text-white mb-1">Maximales Level erreicht!</p>
            <p className="text-xs text-zinc-400">Du bist eine Legende.</p>
          </div>
        )}

        {/* Benefits Section - Now purely cosmetic/influence */}
        {nextTier && (
           <div className="pt-6 border-t border-zinc-800/50">
             <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex justify-between items-center">
                <span>Nächste Belohnung</span>
                <span className="text-zinc-600">Locked 🔒</span>
             </div>
             
             <div className="flex items-center gap-4 bg-black/20 p-3 rounded-2xl border border-white/5 relative group overflow-hidden">
                {/* Visual Effect: Grayed out but visible */}
                <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 relative overflow-hidden shrink-0">
                    <img src={nextTier.avatarPath} className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition duration-500" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:opacity-0 transition">
                        <span className="text-xl">🔒</span>
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm mb-0.5">Rang: {nextTier.displayName}</h4>
                    <p className="text-xs text-zinc-500 truncate">Schaltet neuen Avatar und Titel frei.</p>
                </div>

                <div className="pr-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                        ➔
                    </div>
                </div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}

function RequirementCard({ label, current, required, icon, color }: { label: string; current: number; required: number; icon: string; color: string }) {
  const isComplete = current >= required;
  const percentage = Math.min((current / required) * 100, 100);
  const cardColor = isComplete ? '#10b981' : color;

  return (
    <div 
      className="relative rounded-2xl p-3 transition-all duration-300 overflow-hidden group"
      style={{
        background: `linear-gradient(135deg, ${cardColor}15, ${cardColor}05)`,
        border: `1px solid ${cardColor}30`,
        boxShadow: `0 4px 12px ${cardColor}20`
      }}
    >
      <div className="relative z-10 flex flex-col items-center text-center">
        <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-lg mb-2"
            style={{ backgroundColor: `${cardColor}30` }}
        >
          {icon}
        </div>
        
        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-0.5 whitespace-nowrap">
            {label}
        </div>
        
        <div className="text-lg font-black text-white mb-2 leading-none">
            {current} <span className="text-zinc-500 text-[10px] font-normal">/ {required}</span>
        </div>
        
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${percentage}%`, 
              backgroundColor: cardColor
            }}
          />
        </div>
      </div>
    </div>
  );
}

