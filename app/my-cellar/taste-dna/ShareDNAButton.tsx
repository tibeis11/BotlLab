'use client';

// ============================================================================
// Phase 12.1 — Share DNA Button
//
// Generates a share card image URL and triggers native share or opens the
// image directly. Optimised for Instagram Stories / TikTok (9:16).
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

interface ShareDNAButtonProps {
  gamesPlayed: number;
}

export default function ShareDNAButton({ gamesPlayed }: ShareDNAButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user || gamesPlayed === 0) return null;

  // Build image URL
  const imageUrl = `${window.location.origin}/api/taste-dna-share?userId=${user.id}`;
  const shareUrl = `${window.location.origin}/my-cellar/taste-dna`;

  async function handleShare() {
    setLoading(true);
    try {
      // Try native share (works well on mobile / Instagram)
      if (typeof navigator.share === 'function') {
        // Fetch the image blob for native share
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const file = new File([blob], 'my-taste-dna.png', { type: 'image/png' });

        await navigator.share({
          title: 'Meine BotlLab Taste DNA',
          text: `Mein Tasting IQ: schau dir meine Geschmacks-DNA an! 🧬🍺`,
          url: shareUrl,
          files: [file],
        });
      } else {
        // Desktop fallback: open image in new tab
        window.open(imageUrl, '_blank');
      }
    } catch (err) {
      // User cancelled or share failed; open image as fallback
      window.open(imageUrl, '_blank');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: prompt
      prompt('Link kopieren:', shareUrl);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Primary share button */}
      <button
        onClick={handleShare}
        disabled={loading}
        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm py-3 px-5 transition-all active:scale-95 hover:opacity-90 disabled:opacity-50"
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        )}
        DNA teilen
      </button>

      {/* Copy link */}
      <button
        onClick={handleCopyLink}
        className="flex items-center justify-center gap-2 rounded-xl border border-border text-text-secondary text-sm font-medium py-3 px-4 hover:border-border-hover hover:text-text-primary transition-all active:scale-95"
      >
        {copied ? (
          <>
            <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-success">Kopiert!</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Link kopieren
          </>
        )}
      </button>
    </div>
  );
}
