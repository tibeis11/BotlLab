'use client';

// ============================================================================
// Phase 12.4 — Beat a Friend Share Component
//
// Rendered in BeatTheBrewerGame's reveal phase.
// Creates a challenge token and shows share options (WhatsApp / link copy).
// ============================================================================

import React, { useState } from 'react';
import { createFriendChallenge } from '@/lib/actions/beat-friend-actions';
import type { FlavorProfile } from '@/lib/flavor-profile-config';

interface BeatAFriendShareProps {
  brewId: string;
  playerProfile: FlavorProfile;
  matchScore: number;
}

export default function BeatAFriendShare({ brewId, playerProfile, matchScore }: BeatAFriendShareProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreateChallenge() {
    setLoading(true);
    setError(null);
    try {
      const result = await createFriendChallenge(brewId, playerProfile, matchScore);
      if (result.success && result.shareUrl) {
        setShareUrl(result.shareUrl);
      } else {
        setError(result.error ?? 'Fehler beim Erstellen der Challenge');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt('Challenge-Link kopieren:', shareUrl);
    }
  }

  function buildWhatsAppUrl(url: string): string {
    const text = encodeURIComponent(`🍺 Ich habe ${matchScore}% bei "Beat the Brewer" erreicht. Kannst du das toppen? ${url}`);
    return `https://wa.me/?text=${text}`;
  }

  function buildTelegramUrl(url: string): string {
    const text = encodeURIComponent(`🍺 Ich habe ${matchScore}% bei "Beat the Brewer" erreicht. Kannst du das toppen?`);
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`;
  }

  if (!shareUrl) {
    return (
      <div className="pt-2">
        <button
          onClick={handleCreateChallenge}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-90 text-white font-black text-sm rounded-xl py-3 px-4 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            '🤝'
          )}
          Fordere einen Freund heraus!
        </button>
        {error && <p className="text-xs text-red-400 text-center mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-[10px] uppercase font-black tracking-[0.25em] text-violet-400">
          Beat a Friend
        </p>
        <p className="text-sm font-bold text-text-primary">
          Wer hat den besseren Gaumen?
        </p>
        <p className="text-xs text-text-muted">
          Dein Score: <span className="text-brand font-bold">{matchScore}%</span>.
          Dein Link ist 7 Tage gültig.
        </p>
      </div>

      {/* Share via WhatsApp */}
      <a
        href={buildWhatsAppUrl(shareUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] font-bold text-sm rounded-xl py-3 hover:bg-[#25D366]/15 transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        Via WhatsApp teilen
      </a>

      {/* Share via Telegram */}
      <a
        href={buildTelegramUrl(shareUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-[#2AABEE]/10 border border-[#2AABEE]/30 text-[#2AABEE] font-bold text-sm rounded-xl py-3 hover:bg-[#2AABEE]/15 transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
        Via Telegram teilen
      </a>

      {/* Copy link */}
      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 w-full border border-border text-text-secondary text-sm font-medium rounded-xl py-2.5 hover:border-border-hover hover:text-text-primary transition-all"
      >
        {copied ? (
          <>
            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-400">Kopiert!</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Link kopieren
          </>
        )}
      </button>
    </div>
  );
}
