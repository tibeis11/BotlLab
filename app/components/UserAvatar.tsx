'use client';

/**
 * UserAvatar renders a user's profile picture.
 * Falls back to the first letter of the display name on a subtle gray background.
 * Optionally shows a small tier dot badge in the bottom-right corner.
 */

const TIER_DOT: Record<string, string> = {
  brewer:     'bg-blue-500',
  brewery:    'bg-amber-400',
  enterprise: 'bg-purple-500',
};

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  userId?: string | null;
  tier?: string | null;
  /** Size in Tailwind class format, e.g. "w-8 h-8" */
  sizeClass?: string;
  className?: string;
}

export default function UserAvatar({ src, name, userId, tier, sizeClass = 'w-8 h-8', className = '' }: UserAvatarProps) {
  const letter = (name || '?')[0].toUpperCase();
  const dotColor = tier ? TIER_DOT[tier] : null;

  return (
    <div className={`relative inline-flex shrink-0 ${sizeClass}`}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`w-full h-full rounded-full object-cover ${className}`}
        />
      ) : (
        <div className={`w-full h-full rounded-full flex items-center justify-center bg-surface-hover ${className}`}>
          <span className="text-text-secondary font-semibold text-sm select-none leading-none">{letter}</span>
        </div>
      )}
      {dotColor && (
        <span className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-[var(--background)] ${dotColor}`} />
      )}
    </div>
  );
}
