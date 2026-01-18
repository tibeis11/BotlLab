"use client";

import { useRouter } from "next/navigation";
import { SubscriptionTier, SUBSCRIPTION_TIERS } from "@/lib/premium-config";

interface PremiumFeatureLockProps {
  feature: string;
  tier: SubscriptionTier;
  children: React.ReactNode;
  message?: string;
  compact?: boolean;
}

export default function PremiumFeatureLock({
  feature,
  tier,
  children,
  message,
  compact = false,
}: PremiumFeatureLockProps) {
  const router = useRouter();

  // Logic: Is it locked for the current tier?
  const config = SUBSCRIPTION_TIERS[tier];
  // If the feature is false in the config, it's locked.
  const isLocked = !config.features[feature as keyof typeof config.features];

  if (!isLocked) {
    return <>{children}</>;
  }

  if (compact) {
    // For settings pages where we just want a "locked" badge or hint
    return (
      <div 
        onClick={() => router.push("/dashboard/account?tab=subscription")}
        className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg w-fit cursor-pointer hover:bg-zinc-700 transition-colors"
      >
        <span>🔒 Premium Perk</span>
      </div>
    );
  }

  return (
    <div className="relative group/lock">
      {/* Blurred/Disabled Content */}
      <div className="opacity-40 pointer-events-none blur-[2px] grayscale select-none">{children}</div>

      {/* Glass Overlay */}
      <div 
        className="absolute inset-x-0 bottom-0 top-0 rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 bg-zinc-950/40 backdrop-blur-[1px] group-hover/lock:bg-zinc-950/60 transition-all duration-300 cursor-pointer"
        onClick={() => router.push("/dashboard/account?tab=subscription")}
      >
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl transform group-hover/lock:scale-105 transition-transform duration-300 max-w-[280px]">
          <div className="text-2xl mb-2">💎</div>
          <h4 className="text-xs font-black uppercase tracking-widest text-white mb-2">Premium Feature</h4>
          <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
            {message || `Dieses Feature ist in deinem '${SUBSCRIPTION_TIERS[tier].name}' Abo nicht enthalten.`}
          </p>
          <div className="mt-4 text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center justify-center gap-2">
            <span>Upgrade ansehen</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}
