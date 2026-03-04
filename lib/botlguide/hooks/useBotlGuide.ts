/**
 * useBotlGuide
 *
 * High-level hook for making BotlGuide API calls from any component.
 * Wraps the unified POST /api/botlguide endpoint and manages local state
 * (loading, error, result, caching).
 *
 * Usage:
 *   const { generate, result, isLoading, error, creditsRemaining } = useBotlGuide();
 *   await generate({ capability: 'architect.optimize', data: recipeData });
 */

import { useState, useCallback } from 'react';
import type {
  BotlGuideCapability,
  BotlGuideRequest,
  BotlGuideResponse,
  BotlGuideSessionContext,
} from '../types';
import { CREDIT_COST, CAPABILITY_META } from '../constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BotlGuideHookState = {
  isLoading: boolean;
  error: string | null;
  /** True when the error is specifically a credit exhaustion / tier gate */
  upgradeRequired: boolean;
  result: BotlGuideResponse | null;
  creditsRemaining: number | null;
  /** Text output shortcut (result.text) */
  text: string | null;
  /** Structured data shortcut (result.data) */
  data: Record<string, unknown> | null;
};

export type GenerateOptions = {
  capability: BotlGuideCapability;
  context?: BotlGuideSessionContext;
  data?: Record<string, unknown>;
  /**
   * If provided, the result will be read from / written to sessionStorage
   * under this key. Prevents repeat API calls for identical inputs.
   */
  cacheKey?: string;
};

export type UseBotlGuideReturn = BotlGuideHookState & {
  generate: (options: GenerateOptions) => Promise<BotlGuideResponse | null>;
  reset: () => void;
  /** Credits consumed by the last successful call */
  lastCreditsUsed: number | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE: BotlGuideHookState = {
  isLoading: false,
  error: null,
  upgradeRequired: false,
  result: null,
  creditsRemaining: null,
  text: null,
  data: null,
};

export function useBotlGuide(): UseBotlGuideReturn {
  const [state, setState] = useState<BotlGuideHookState>(INITIAL_STATE);
  const [lastCreditsUsed, setLastCreditsUsed] = useState<number | null>(null);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setLastCreditsUsed(null);
  }, []);

  const generate = useCallback(async (options: GenerateOptions): Promise<BotlGuideResponse | null> => {
    const { capability, context, data, cacheKey } = options;

    // ── Cache hit ────────────────────────────────────────────────────────
    if (cacheKey) {
      const cached = sessionStorage.getItem(`botlguide_${cacheKey}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as BotlGuideResponse;
          setState(prev => ({
            ...prev,
            result: parsed,
            text: parsed.text ?? null,
            data: parsed.data ?? null,
            error: null,
            upgradeRequired: false,
          }));
          return parsed;
        } catch {
          // Ignore malformed cache
        }
      }
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, upgradeRequired: false }));

    try {
      const body: BotlGuideRequest = { capability, context, data };

      const res = await fetch('/api/botlguide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        const upgradeRequired = res.status === 402 || json.upgrade_required === true;
        const errorMessage = resolveErrorMessage(res.status, json, capability);

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          upgradeRequired,
          result: null,
          text: null,
          data: null,
        }));
        return null;
      }

      const response = json as BotlGuideResponse;
      const creditsUsed = response.creditsUsed ?? CREDIT_COST[capability];

      setLastCreditsUsed(creditsUsed);

      if (cacheKey) {
        sessionStorage.setItem(`botlguide_${cacheKey}`, JSON.stringify(response));
      }

      setState({
        isLoading: false,
        error: null,
        upgradeRequired: false,
        result: response,
        creditsRemaining: response.creditsRemaining,
        text: response.text ?? null,
        data: response.data ?? null,
      });

      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
        upgradeRequired: false,
      }));
      return null;
    }
  }, []);

  return { ...state, generate, reset, lastCreditsUsed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function resolveErrorMessage(
  status: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any,
  capability: BotlGuideCapability,
): string {
  if (status === 402) return 'Upgrade Required';
  if (status === 403) {
    const meta = CAPABILITY_META[capability];
    return `${meta?.persona ?? 'BotlGuide'} – diese Funktion benötigt den ${meta?.minTier ?? 'Brewer'}-Plan.`;
  }
  if (status === 501) return json.error ?? 'Diese Funktion ist noch in Entwicklung.';
  if (status === 401) return 'Nicht eingeloggt.';
  return json.error ?? 'Generierung fehlgeschlagen.';
}
