'use client';

/**
 * Phase 13.1 — ShopLink
 *
 * Zeigt einen externen Link zur Brauerei-Website/Shop am Ende der
 * Bottle-Label-Seite. Nur sichtbar wenn `brewery.website` gesetzt ist.
 *
 * Position: nach Stash/Bounties, vor Brauerei-Card/Footer.
 */

interface ShopLinkProps {
  breweryName: string;
  websiteUrl: string;
}

export default function ShopLink({ breweryName, websiteUrl }: ShopLinkProps) {
  // Ensure URL has protocol for external link
  const href = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;

  const handleClick = () => {
    // Fire-and-forget analytics event
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/analytics/track',
          JSON.stringify({
            event: 'outbound_click',
            target: 'shop',
            brewery_name: breweryName,
            url: href,
          }),
        );
      }
    } catch {
      // Analytics should never block navigation
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block group bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-cyan-500/40 hover:bg-zinc-800/60 transition shadow-lg"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:border-cyan-500/40 transition">
          <span className="text-lg">🌐</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-0.5">
            Website / Shop
          </p>
          <p className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition">
            {breweryName} besuchen ↗
          </p>
        </div>
        <svg
          className="w-4 h-4 text-zinc-600 group-hover:text-cyan-500 transition shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  );
}
