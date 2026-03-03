'use client';

import { getBreweryTierConfig, type BreweryTierName } from '@/lib/tier-system';
import { type PremiumStatus } from '@/lib/premium-config';
import Link from 'next/link';
import { Crown, ChevronRight, Zap } from 'lucide-react';

interface CompactTierStatusProps {
  tier: BreweryTierName;
  premiumStatus: PremiumStatus | null;
  brewCount: number;
  bottleCount: number;
  labelCount: number;
  breweryId: string;
}

export default function CompactTierStatus({ 
  tier, premiumStatus, brewCount, bottleCount, labelCount, breweryId 
}: CompactTierStatusProps) {
  const config = getBreweryTierConfig(tier);
  const isPremium = premiumStatus?.tier === 'brewery' || premiumStatus?.tier === 'enterprise';

  if (isPremium) {
    return (
      <div className="bg-gradient-to-br from-purple-900/20 to-zinc-900/10 border border-purple-500/20 rounded-xl p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-16 bg-purple-500/5 blur-[50px] rounded-full pointer-events-none -mt-4 -mr-4" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xl shadow-lg">
              💎
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
                {premiumStatus!.tier === 'enterprise' ? 'Enterprise' : 'Brewery'} Premium
              </div>
              <div className="text-xs text-emerald-400 font-bold">Aktiv</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Rezepte" value={brewCount} unlimited />
            <MiniStat label="Flaschen" value={bottleCount} unlimited />
            <MiniStat label="Etiketten" value={labelCount} unlimited />
          </div>
        </div>
      </div>
    );
  }

  // Free / Brewer tier — compact status with progress
  const maxBrews = config.limits.maxBrews;
  const maxBottles = config.limits.maxBottles;
  const brewPercent = maxBrews > 0 ? Math.min((brewCount / maxBrews) * 100, 100) : 0;
  const isNearLimit = brewPercent > 75;

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-5 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${config.color}, transparent)` }}
      />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-xl"
              style={{ border: `1px solid ${config.color}40` }}
            >
              {config.icon}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Brauerei-Status</div>
              <div className="text-sm font-black text-white">{config.displayName}</div>
            </div>
          </div>
        </div>

        {/* Usage bars */}
        <div className="space-y-2 mb-3">
          <UsageBar 
            label="Rezepte" 
            current={brewCount} 
            max={maxBrews} 
            color={isNearLimit ? '#f97316' : config.color} 
            bypassed={premiumStatus?.features.bypassBrewLimits}
          />
          <UsageBar 
            label="Flaschen" 
            current={bottleCount} 
            max={maxBottles} 
            color={config.color} 
            bypassed={premiumStatus?.features.bypassBottleLimits}
          />
        </div>

        {/* Upgrade nudge */}
        {!isPremium && (
          <Link
            href="/pricing"
            className="flex items-center justify-between w-full p-2.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition-colors">
                Mehr freischalten
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
          </Link>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, unlimited = false }: { label: string; value: number; unlimited?: boolean }) {
  return (
    <div className="text-center p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
      <div className="text-sm font-bold text-white font-mono">{value}</div>
      <div className="text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">
        {label} {unlimited && <span className="text-purple-400">∞</span>}
      </div>
    </div>
  );
}

function UsageBar({ label, current, max, color, bypassed = false }: { 
  label: string; current: number; max: number; color: string; bypassed?: boolean 
}) {
  const isUnlimited = max > 90000 || bypassed;
  const percent = isUnlimited ? 30 : Math.min((current / max) * 100, 100);
  const isHit = !isUnlimited && current >= max;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-zinc-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${percent}%`, 
            backgroundColor: isHit ? '#ef4444' : color 
          }} 
        />
      </div>
      <span className="text-[10px] text-zinc-500 font-mono w-14 text-right shrink-0">
        {current}/{isUnlimited ? '∞' : max}
      </span>
    </div>
  );
}
