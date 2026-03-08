'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Beer } from 'lucide-react';
import { resolveScanForPrompt, confirmDrinking } from '@/lib/actions/analytics-actions';

// ============================================================================
// Types
// ============================================================================

interface DrinkingConfirmationPromptProps {
  bottleId: string;
  isOwner?: boolean;
}

type EngagementSignal = 'after_rating' | 'scroll_ratings' | 'dwell_30s' | 'exit_intent';

const LS_KEY_NO_PROMPT = 'botllab_no_drinking_prompt';
const LS_KEY_ASKED = 'botllab_drinking_asked_session';
const LS_KEY_CONFIRMED_PREFIX = 'botllab_confirmed_brew_';

// ============================================================================
// Component
// ============================================================================

export default function DrinkingConfirmationPrompt({
  bottleId,
  isOwner = false,
}: DrinkingConfirmationPromptProps) {
  const [visible, setVisible] = useState(false);
  const [responded, setResponded] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [scanId, setScanId] = useState<string | null>(null);
  const [samplingRate, setSamplingRate] = useState(0);
  const [samplingReason, setSamplingReason] = useState('');
  const [engagementSignal, setEngagementSignal] = useState<EngagementSignal>('dwell_30s');

  // Engagement tracking
  const mountTime = useRef(Date.now());
  const maxScrollDepth = useRef(0);
  const hasInteracted = useRef(false);
  const promptShown = useRef(false);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Check local excludes ─────────────────────────────────────────────────
  const isExcludedLocally = useCallback(() => {
    if (isOwner) return true;
    try {
      if (localStorage.getItem(LS_KEY_NO_PROMPT) === 'true') return true;
      if (sessionStorage.getItem(LS_KEY_ASKED) === 'true') return true;
      // Already confirmed this brew today
      const todayKey = `${LS_KEY_CONFIRMED_PREFIX}${new Date().toISOString().slice(0, 10)}`;
      if (localStorage.getItem(todayKey) === bottleId) return true;
    } catch { /* SSR or private browsing */ }
    return false;
  }, [bottleId, isOwner]);

  // ── Show prompt ──────────────────────────────────────────────────────────
  const showPrompt = useCallback(async (signal: EngagementSignal) => {
    if (promptShown.current || isExcludedLocally()) return;
    promptShown.current = true;

    try {
      const result = await resolveScanForPrompt(bottleId);
      if (!result.shouldAsk || !result.scanId) return;

      setScanId(result.scanId);
      setSamplingRate(result.samplingRate);
      setSamplingReason(result.reason);
      setEngagementSignal(signal);
      setVisible(true);

      // Mark session as asked
      try { sessionStorage.setItem(LS_KEY_ASKED, 'true'); } catch {}

      // Auto-hide after 15 seconds
      autoHideTimer.current = setTimeout(() => {
        setVisible(false);
      }, 15_000);
    } catch {
      // Silently fail — prompt is optional
    }
  }, [bottleId, isExcludedLocally]);

  // ── Engagement tracking ──────────────────────────────────────────────────
  useEffect(() => {
    if (isExcludedLocally()) return;

    let dwellTimer: ReturnType<typeof setTimeout> | null = null;

    // 1. Scroll tracking
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const depth = scrollTop / docHeight;
        if (depth > maxScrollDepth.current) maxScrollDepth.current = depth;

        // Trigger on 50% scroll (ratings section is usually in the lower half)
        if (depth >= 0.5 && !promptShown.current) {
          showPrompt('scroll_ratings');
        }
      }
    };

    // 2. Dwell time (30 seconds of active viewing)
    const startDwellTimer = () => {
      dwellTimer = setTimeout(() => {
        if (!promptShown.current) {
          showPrompt('dwell_30s');
        }
      }, 30_000);
    };

    // 3. Visibility tracking (pause on tab switch)
    const handleVisibility = () => {
      if (document.hidden) {
        if (dwellTimer) { clearTimeout(dwellTimer); dwellTimer = null; }
      } else {
        const elapsed = Date.now() - mountTime.current;
        const remaining = 30_000 - elapsed;
        if (remaining > 0 && !promptShown.current) {
          dwellTimer = setTimeout(() => {
            if (!promptShown.current) showPrompt('dwell_30s');
          }, remaining);
        }
      }
    };

    // 4. Click/tap tracking
    const handleInteraction = () => { hasInteracted.current = true; };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('click', handleInteraction, { once: true });
    startDwellTimer();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('click', handleInteraction);
      if (dwellTimer) clearTimeout(dwellTimer);
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  }, [isExcludedLocally, showPrompt]);

  // ── Handle response ──────────────────────────────────────────────────────
  const handleResponse = async (confirmed: boolean) => {
    if (!scanId) return;
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);

    const dwellSeconds = Math.round((Date.now() - mountTime.current) / 1000);

    try {
      await confirmDrinking(scanId, confirmed, {
        engagementSignal,
        dwellTimeSeconds: dwellSeconds,
        scrollDepth: Math.round(maxScrollDepth.current * 100) / 100,
        samplingRate,
        samplingReason,
      });
    } catch {
      // Silently fail
    }

    // Store confirmation to prevent re-asking
    try {
      const todayKey = `${LS_KEY_CONFIRMED_PREFIX}${new Date().toISOString().slice(0, 10)}`;
      localStorage.setItem(todayKey, bottleId);
    } catch {}

    setResponseText(confirmed ? 'Danke! 🍻' : 'Verstanden 👍');
    setResponded(true);

    // Slide out after 2 seconds
    setTimeout(() => setVisible(false), 2000);
  };

  const handleOptOut = () => {
    try { localStorage.setItem(LS_KEY_NO_PROMPT, 'true'); } catch {}
    setVisible(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!visible) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Trinkst du dieses Bier gerade?"
      className={`fixed bottom-0 inset-x-0 z-50 transition-transform duration-500 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="max-w-lg mx-auto px-4 pb-4">
        <div className="bg-surface border border-border rounded-2xl shadow-2xl p-4 backdrop-blur-md">
          {responded ? (
            /* ── Thank you state ── */
            <p className="text-center text-sm text-text-secondary py-2 font-medium">
              {responseText}
            </p>
          ) : (
            /* ── Question state ── */
            <>
              <div className="flex items-start gap-3">
                <Beer className="w-6 h-6 shrink-0 mt-0.5 text-amber-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Trinkst du dieses Bier gerade?
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    Hilft dem Brauer zu verstehen, wie beliebt sein Bier wirklich ist.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => handleResponse(true)}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm py-2.5 px-4 rounded-xl transition-colors"
                >
                  Ja, Prost! 🍻
                </button>
                <button
                  onClick={() => handleResponse(false)}
                  className="flex-1 bg-surface-hover hover:bg-border text-text-secondary font-medium text-sm py-2.5 px-4 rounded-xl border border-border transition-colors"
                >
                  Nein, nur schauen
                </button>
              </div>

              <button
                onClick={handleOptOut}
                className="mt-2 w-full text-center text-[11px] text-text-disabled hover:text-text-secondary transition-colors py-1"
              >
                ✕ Nicht mehr fragen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
