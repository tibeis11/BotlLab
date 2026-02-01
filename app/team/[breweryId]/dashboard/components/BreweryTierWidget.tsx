'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  getBreweryTierConfig, 
  getNextBreweryTier, 
  calculateBreweryTierProgress, 
  type BreweryTierName, 
  type BreweryTierConfig 
} from '@/lib/tier-system';
import { getPremiumStatus, getSpecificUserPremiumStatus } from '@/lib/actions/premium-actions';
import { type PremiumStatus } from '@/lib/premium-config';

export default function BreweryTierWidget({ breweryId }: { breweryId: string }) {
  const [loading, setLoading] = useState(true);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [data, setData] = useState<{
    tier: BreweryTierName;
    totalFills: number;
    teamPosts: number;
    memberCount: number;
    brewCount: number; // Current Usage
    bottleCount: number; // Current Usage
  } | null>(null);
  // LabelCount Hook immer oben!
  const [labelCount, setLabelCount] = useState(0);
  useEffect(() => {
    async function fetchLabels() {
      const { count } = await supabase
        .from('label_templates')
        .select('*', { count: 'exact', head: true })
        .eq('brewery_id', breweryId);
      setLabelCount(count || 0);
    }
    fetchLabels();
  }, [breweryId]);

  useEffect(() => {
    if (breweryId) loadData();
  }, [breweryId]);

  async function loadData() {
    try {
      // 1. Get Brewery Tier
      const { data: brewery } = await supabase
        .from('breweries')
        .select('tier')
        .eq('id', breweryId)
        .single();
      
      // 2. Get Stats for Progress
      // Total Fills (all bottles filled by this brewery)
      // Note: This query might be heavy, in real app usage counters are better.
      // Assuming we verify logic later. 
      const { count: fills } = await supabase
        .from('bottles')
        .select('*', { count: 'exact', head: true })
        .eq('brewery_id', breweryId)
        .eq('status', 'filled'); // Or historic total? Requirement says 'totalFills'. Let's assume total bottles created for now or all time fills.
      
      // Team Posts
      const { count: posts } = await supabase
        .from('brewery_feed')
        .select('*', { count: 'exact', head: true })
        .eq('brewery_id', breweryId);

      // Members
      const { count: members } = await supabase
        .from('brewery_members')
        .select('*', { count: 'exact', head: true })
        .eq('brewery_id', breweryId);

      // Current Usage for Limits Display
      const { count: brews } = await supabase
        .from('brews')
        .select('*', { count: 'exact', head: true })
        .eq('brewery_id', breweryId);
      
      const { count: totalBottles } = await supabase
        .from('bottles')
        .select('*', { count: 'exact', head: true })
        .eq('brewery_id', breweryId);

      // Get Owners Premium Status to check for limit bypass
      const { data: ownerMember } = await supabase
        .from('brewery_members')
        .select('user_id')
        .eq('brewery_id', breweryId)
        .eq('role', 'owner')
        .single();
      
      if (ownerMember) {
        const status = await getSpecificUserPremiumStatus(ownerMember.user_id);
        setPremiumStatus(status);
      }

      setData({
        tier: (brewery?.tier as BreweryTierName) || 'garage',
        totalFills: totalBottles || 0, // Using total bottles for now as proxy for fills if fills not tracked separately
        teamPosts: posts || 0,
        memberCount: members || 0,
        brewCount: brews || 0,
        bottleCount: totalBottles || 0
      });

    } catch (e) {
      console.error('Failed to load brewery tier data', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl animate-pulse mb-8">
        <div className="h-20 bg-zinc-800 rounded-xl"></div>
      </div>
    );
  }

  const currentConfig = getBreweryTierConfig(data.tier);
  // Etiketten-Limit aus tier-system
  const labelLimit = currentConfig.limits.maxLabels ?? 1;
  const nextTier = getNextBreweryTier(data.tier);
  
  const { progress, unlockedRequirements, totalRequirements } = calculateBreweryTierProgress(
    data.tier,
    {
        totalFills: data.totalFills,
        teamPosts: data.teamPosts,
        activeMembers: data.memberCount
    }
  );

  const isMaxTier = !nextTier;
  const isPremiumUser = premiumStatus?.tier === 'brewery' || premiumStatus?.tier === 'enterprise';

  // Premium Widget for Brewery users
  if (isPremiumUser && premiumStatus) {
    return (
      <div className="bg-gradient-to-br from-purple-900/20 to-zinc-900/10 border border-purple-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden mb-8">
        <div 
          className="absolute inset-0 opacity-10 blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle at top right, #a855f7, transparent)` }}
        />

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="text-4xl w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-purple-600 to-pink-600"
              >
                🏭
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-purple-400">Premium Status</div>
                <h3 className="text-2xl font-black text-white">
                  {premiumStatus.tier === 'enterprise' ? 'Enterprise' : 'Brewery'} Premium
                </h3>
              </div>
            </div>
            
            <div className="hidden sm:block">
              <div className="text-right">
                <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Status</div>
                <div className="text-lg font-black text-emerald-400">Aktiv</div>
              </div>
            </div>
          </div>

          {/* Active Benefits */}
          <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50">
            <div className="text-sm font-bold text-white mb-3">Freigeschaltete Features</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeaturePill icon="♾️" label="Unbegrenzte Rezepte" active={premiumStatus.features.bypassBrewLimits} />
              <FeaturePill icon="🍾" label="Unbegrenzte Flaschen" active={premiumStatus.features.bypassBottleLimits} />
              <FeaturePill icon="🏷️" label="Eigenes Brauerei-Logo" active={premiumStatus.features.canUseBreweryLogo} />
              <FeaturePill icon="💬" label="Custom Slogan" active={premiumStatus.features.canUseCustomSlogan} />
              <FeaturePill icon="📊" label="Erweiterte Analytics" active={true} />
              <FeaturePill icon="🤖" label={premiumStatus.features.aiGenerationsRemaining === -1 ? 'Unbegrenzte AI' : `${premiumStatus.features.aiGenerationsRemaining} AI/Monat`} active={true} />
            </div>
          </div>

          {/* Current Limits Display */}
          <div className="bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/30">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Aktuelle Nutzung</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-black text-cyan-400">{data.brewCount}</div>
                <div className="text-xs text-zinc-500 mt-1">Rezepte</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-purple-400">{data.bottleCount}</div>
                <div className="text-xs text-zinc-500 mt-1">Flaschen</div>
              </div>
            </div>
          </div>

          {/* Thank You Message */}
          <div className="text-center p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <span className="text-sm text-purple-300 font-bold">
              💎 Danke für deine Unterstützung!
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Regular Tier Widget for Free/Brewer users
  return (
    <div className="bg-gradient-to-br from-emerald-900/20 to-zinc-900/10 border border-emerald-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden mb-8">
       <div 
        className="absolute inset-0 opacity-10 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${currentConfig.color}, transparent)` }}
      />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="text-4xl w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-zinc-900"
              style={{ border: `1px solid ${currentConfig.color}40`, color: currentConfig.color }}
            >
              {currentConfig.icon}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Brauerei Status</div>
              <h3 className="text-2xl font-black text-white">{currentConfig.displayName}</h3>
            </div>
          </div>
          
           {/* Limits Overview (Mini) */}
             <div className="hidden sm:flex items-center gap-4">
              <Limitpill 
                icon="📝" 
                current={data.brewCount} 
                max={currentConfig.limits.maxBrews} 
                label="Rezepte" 
                bypassed={premiumStatus?.features.bypassBrewLimits}
              />
              <Limitpill 
                icon="🍾" 
                current={data.bottleCount} 
                max={currentConfig.limits.maxBottles} 
                label="Flaschen" 
                bypassed={premiumStatus?.features.bypassBottleLimits}
              />
              <Limitpill 
                icon="🏷️" 
                current={labelCount} 
                max={labelLimit} 
                label="Etiketten" 
                bypassed={premiumStatus?.tier === 'brewery' || premiumStatus?.tier === 'enterprise'}
              />
             </div>
        </div>

        {/* Premium/Enterprise Notice */}
        {(premiumStatus?.tier === 'enterprise' || premiumStatus?.tier === 'brewery') && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <div className="text-xs">
                      <div className="font-bold text-purple-400 uppercase tracking-widest">Premium Status Active</div>
                      <div className="text-zinc-500">Alle Brauerei-Limits wurden durch dein Abo außer Kraft gesetzt.</div>
                  </div>
              </div>
          </div>
        )}

        {/* Progress System */}
        {!isMaxTier && nextTier && (premiumStatus?.tier !== 'enterprise' && premiumStatus?.tier !== 'brewery') && (
          <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50">
             <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-zinc-300">Nächstes Level: <span style={{ color: nextTier.color }}>{nextTier.displayName}</span></span>
                <span className="text-xs font-bold text-zinc-500">{unlockedRequirements}/{totalRequirements} Ziele</span>
             </div>
             
             {/* Progress Bar */}
             <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
                 <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: nextTier.color }} />
             </div>

             <div className="grid grid-cols-3 gap-2">
                <GoalItem label="Posts" current={data.teamPosts} target={nextTier.requirements.teamPosts} />
                <GoalItem label="Flaschen" current={data.totalFills} target={nextTier.requirements.totalFills} />
                <GoalItem label="Mitglieder" current={data.memberCount} target={nextTier.requirements.activeMembers} />
             </div>
          </div>
        )}

        {isMaxTier && (
            <div className="text-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <span className="text-emerald-400 font-bold">Maximale Ausbaustufe erreicht! 🏭</span>
            </div>
        )}

        {/* Benefits Next Tier */}
        {!isMaxTier && nextTier && (premiumStatus?.tier !== 'enterprise' && premiumStatus?.tier !== 'brewery') && (
             <div className="mt-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Next Up</div>
                <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                    {nextTier.benefits.map((b, i) => (
                        <span key={i} className="px-2 py-1 rounded-md bg-zinc-800/50 border border-zinc-700/50">
                            {b}
                        </span>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

function Limitpill({ icon, current, max, label, bypassed = false }: { icon: string, current: number, max: number, label: string, bypassed?: boolean }) {
    const isUnlimited = max > 90000 || bypassed;
    const isClose = !isUnlimited && (current / max) > 0.8;
    const isHit = !isUnlimited && current >= max;
    
    return (
        <div className={`flex flex-col items-end ${isHit ? 'text-red-400' : isClose ? 'text-orange-400' : 'text-zinc-400'}`}>
            <div className="text-xs font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                {label} {bypassed && <span title="Limit aufgehoben durch Premium">💎</span>}
            </div>
            <div className="font-mono font-bold text-sm">
                <span>{current}</span>
                <span className="opacity-50 mx-1">/</span>
                <span className="opacity-80">{isUnlimited ? '∞' : max}</span>
            </div>
        </div>
    )
}

function GoalItem({ label, current, target }: { label: string, current: number, target: number }) {
    const done = current >= target;
    return (
        <div className={`flex flex-col items-center justify-center p-2 rounded-lg border ${done ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500'}`}>
            <span className="text-[10px] uppercase font-bold tracking-wider mb-1">{label}</span>
            <span className={`text-sm font-black ${done ? 'text-emerald-400' : 'text-zinc-300'}`}>
                {current >= target ? '✓' : `${current}/${target}`}
            </span>
        </div>
    )
}

function FeaturePill({ icon, label, active }: { icon: string, label: string, active: boolean }) {
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
            active 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500'
        }`}>
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-bold">{label}</span>
            {active && <span className="ml-auto text-emerald-400">✓</span>}
        </div>
    )
}
