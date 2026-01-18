import { SUBSCRIPTION_TIERS, SubscriptionTier } from "@/lib/premium-config";

interface PremiumBadgeProps {
  tier: SubscriptionTier;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export default function PremiumBadge({
  tier,
  size = "md",
  showIcon = true,
}: PremiumBadgeProps) {
  const config = SUBSCRIPTION_TIERS[tier];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span
      className={`
      inline-flex items-center gap-1 rounded-full font-semibold text-white
      ${config.badge_color} ${sizeClasses[size]}
    `}
    >
      {showIcon && <span>{config.badge_icon}</span>}
      <span>{config.name}</span>
    </span>
  );
}
