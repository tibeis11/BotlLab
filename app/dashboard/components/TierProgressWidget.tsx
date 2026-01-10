'use client';

import { useEffect, useState } from 'react';
import { getTierConfig, getNextTier, calculateTierProgress, getDaysActive, type TierName } from '@/lib/tier-system';
import { supabase } from '@/lib/supabase';

export default function TierProgressWidget() {
  const [loading, setLoading] = useState(true);
  const [tierData, setTierData] = useState<{
    currentTier: TierName;
    daysActive: number;
    totalFills: number;
    totalViews: number;
    brewsCreated: number;
    achievementPoints: number;
  } | null>(null);

  useEffect(() => {
    loadTierData();
  }, []);

  async function loadTierData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tier, total_bottle_fills, total_profile_views, joined_at')
        .eq('id', user.id)
        .single();

      const { count: brewsCreated } = await supabase
        .from('brews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (profile) {
        setTierData({
          currentTier: (profile.tier || 'hobby') as TierName,
          daysActive: getDaysActive(profile.joined_at || new Date().toISOString()),
          totalFills: profile.total_bottle_fills || 0,
          totalViews: profile.total_profile_views || 0,
          brewsCreated: brewsCreated || 0,
          achievementPoints: 0,
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
      <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl animate-pulse">
        <div className="h-24 bg-surface-hover rounded-xl"></div>
      </div>
    );
  }

  const currentConfig = getTierConfig(tierData.currentTier);
  const nextTier = getNextTier(tierData.currentTier);
  const { progress, unlockedRequirements, totalRequirements } = calculateTierProgress(
    tierData.currentTier,
    tierData.daysActive,
    tierData.totalFills,
    tierData.totalViews,
    tierData.brewsCreated
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
          <div className="flex items-center gap-3">
            <div 
              className="text-4xl w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${currentConfig.color}20`, color: currentConfig.color }}
            >
              {currentConfig.icon}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Dein Level</div>
              <h3 className="text-2xl font-black text-foreground">{currentConfig.displayName}</h3>
            </div>
          </div>
          
          {!isMaxTier && (
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nächstes Level</div>
              <div className="text-sm font-bold" style={{ color: nextTier.color }}>{nextTier.icon} {nextTier.displayName}</div>
            </div>
          )}
        </div>

        {!isMaxTier && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400">Fortschritt</span>
              <span className="text-xs font-bold" style={{ color: currentConfig.color }}>
                {unlockedRequirements}/{totalRequirements} Anforderungen erfüllt
              </span>
            </div>
            <div className="h-3 bg-surface-hover rounded-full overflow-hidden border border-border">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: currentConfig.color }}
              />
            </div>
          </div>
        )}

        {!isMaxTier && nextTier && (
          <div className="grid grid-cols-2 gap-3">
            <RequirementCard
              label="Tage aktiv"
              current={tierData.daysActive}
              required={nextTier.requirements.daysActive}
              icon="📅"
              color={currentConfig.color}
            />
            <RequirementCard
              label="Befüllungen"
              current={tierData.totalFills}
              required={nextTier.requirements.totalFills}
              icon="🍾"
              color={currentConfig.color}
            />
            <RequirementCard
              label="Profil-Views"
              current={tierData.totalViews}
              required={nextTier.requirements.totalViews}
              icon="👁️"
              color={currentConfig.color}
            />
            <RequirementCard
              label="Rezepte"
              current={tierData.brewsCreated}
              required={nextTier.requirements.brewsCreated}
              icon="📝"
              color={currentConfig.color}
            />
          </div>
        )}

        {isMaxTier && (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">👑</div>
            <p className="text-sm font-bold text-foreground mb-1">Maximales Level erreicht!</p>
            <p className="text-xs text-zinc-400">Du hast alle Limits freigeschaltet.</p>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Benefits Vergleich</div>
          <div className="grid grid-cols-2 gap-3">
            <BenefitComparisonCard
              icon="📦"
              label="Rezepte"
              current={currentConfig.limits.maxBrews}
              next={nextTier?.limits.maxBrews}
              color={currentConfig.color}
            />
            <BenefitComparisonCard
              icon="🍾"
              label="Flaschen"
              current={currentConfig.limits.maxBottles}
              next={nextTier?.limits.maxBottles}
              color={currentConfig.color}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitComparisonCard({ icon, label, current, next, color }: { 
  icon: string; 
  label: string; 
  current: number; 
  next?: number;
  color: string;
}) {
  const currentValue = current === 999999 ? '∞' : current;
  const nextValue = next === 999999 ? '∞' : next;
  const hasUpgrade = next && next > current;

  return (
    <div 
      className="rounded-xl p-3 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}10, ${color}05)`,
        border: `1px solid ${color}20`
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
          {label}
        </div>
      </div>
      
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-black text-white">
          {currentValue}
        </div>
        {hasUpgrade && (
          <>
            <span className="text-zinc-600">→</span>
            <div 
              className="text-xl font-black"
              style={{ color }}
            >
              {nextValue}
            </div>
          </>
        )}
        {!hasUpgrade && next && (
          <div className="text-xs text-green-400 font-bold">✓ MAX</div>
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
      className="relative rounded-2xl p-4 transition-all duration-300 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${cardColor}15, ${cardColor}05)`,
        border: `1px solid ${cardColor}30`,
        boxShadow: `0 4px 12px ${cardColor}20`
      }}
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ 
          background: `radial-gradient(circle at top right, ${cardColor}20, transparent)`,
          filter: 'blur(20px)'
        }}
      />
      
      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow-lg shrink-0"
            style={{ backgroundColor: `${cardColor}30` }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1 truncate whitespace-nowrap sm:whitespace-normal" title={label}>
              {label}
            </div>
            <div className="text-xl font-black text-white">
              {current} <span className="text-zinc-500 text-sm">/ {required}</span>
              {isComplete && (
                <span className="sm:hidden text-green-400 text-xs font-bold ml-2 align-middle">✓</span>
              )}
            </div>
          </div>
        </div>
        {isComplete && (
          <div 
            className="hidden sm:flex absolute top-3 right-3 w-6 h-6 rounded-full items-center justify-center"
            style={{ backgroundColor: '#10b981' }}
          >
            <span className="text-white text-sm">✓</span>
          </div>
        )}
        
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${percentage}%`, 
              backgroundColor: cardColor,
              boxShadow: `0 0 8px ${cardColor}`
            }}
          />
        </div>
      </div>
    </div>
  );
}
