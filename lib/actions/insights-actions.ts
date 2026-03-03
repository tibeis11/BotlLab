'use server';

// ============================================================================
// Phase 15 — BotlGuide Analyst Server Actions
//
// CRUD for analytics_ai_insights + feedback + reaction tracking.
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import type { Json } from '@/lib/database.types';

// ── Types ────────────────────────────────────────────────────────────────────

export type InsightType =
  | 'off_flavor'
  | 'batch_comparison'
  | 'trend'
  | 'market'
  | 'seasonality'
  | 'shelf_life'
  | 'event_detected';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface AnalyticsInsight {
  id: string;
  breweryId: string;
  brewId: string | null;
  createdAt: string;
  expiresAt: string | null;
  insightType: InsightType;
  severity: InsightSeverity;
  title: string;
  body: string;
  actionSuggestion: string | null;
  triggerData: Record<string, unknown>;
  sourcePhases: string[] | null;
  brewerReaction: 'helpful' | 'not_helpful' | null;
  brewerNotes: string | null;
  isRead: boolean;
  isDismissed: boolean;
}

// ── Fetch Insights ───────────────────────────────────────────────────────────

/**
 * Get active (non-expired, non-dismissed) insights for a brewery.
 * Returns max `limit` sorted by severity (critical first) then creation date.
 */
export async function getBreweryInsights(
  breweryId: string,
  limit = 10
): Promise<AnalyticsInsight[]> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('analytics_ai_insights')
    .select('*')
    .eq('brewery_id', breweryId)
    .eq('is_dismissed', false)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Sort: critical > warning > info, then newest first
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };

  return (data as typeof data)
    .sort((a, b) => {
      const sDiff = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
      if (sDiff !== 0) return sDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .map(mapRowToInsight);
}

/**
 * Get count of unread, non-dismissed insights for badge display.
 */
export async function getUnreadInsightCount(
  breweryId: string
): Promise<number> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { count, error } = await supabase
    .from('analytics_ai_insights')
    .select('id', { count: 'exact', head: true })
    .eq('brewery_id', breweryId)
    .eq('is_read', false)
    .eq('is_dismissed', false)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  if (error) return 0;
  return count ?? 0;
}

// ── Reactions & Status Updates ───────────────────────────────────────────────

/**
 * Mark insight as read.
 */
export async function markInsightRead(insightId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('analytics_ai_insights')
    .update({ is_read: true })
    .eq('id', insightId);
  return !error;
}

/**
 * Dismiss an insight (hide it from the dashboard).
 */
export async function dismissInsight(insightId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('analytics_ai_insights')
    .update({ is_dismissed: true })
    .eq('id', insightId);
  return !error;
}

/**
 * Submit brewer reaction (helpful / not_helpful) + optional notes.
 * Also logs to botlguide_feedback for the ML feedback loop.
 */
export async function reactToInsight(
  insightId: string,
  reaction: 'helpful' | 'not_helpful',
  notes?: string
): Promise<boolean> {
  const supabase = await createClient();

  // Update insight
  const { error: updateErr } = await supabase
    .from('analytics_ai_insights')
    .update({
      brewer_reaction: reaction,
      brewer_notes: notes ?? null,
      is_read: true,
    })
    .eq('id', insightId);

  if (updateErr) return false;

  // Also log to botlguide_feedback for the feedback loop
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('botlguide_feedback').insert({
      user_id: user.id,
      context_key: `analytics_insight:${insightId}`,
      feedback: reaction === 'helpful' ? 'up' : 'down',
      generated_text: notes ?? null,
    });
  }

  return true;
}

// ── Internal helper ──────────────────────────────────────────────────────────

function mapRowToInsight(row: {
  id: string;
  brewery_id: string;
  brew_id: string | null;
  created_at: string;
  expires_at: string | null;
  insight_type: string;
  severity: string;
  title: string;
  body: string;
  action_suggestion: string | null;
  trigger_data: Json;
  source_phases: string[] | null;
  brewer_reaction: string | null;
  brewer_notes: string | null;
  is_read: boolean;
  is_dismissed: boolean;
}): AnalyticsInsight {
  return {
    id: row.id,
    breweryId: row.brewery_id,
    brewId: row.brew_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    insightType: row.insight_type as InsightType,
    severity: row.severity as InsightSeverity,
    title: row.title,
    body: row.body,
    actionSuggestion: row.action_suggestion,
    triggerData: (row.trigger_data ?? {}) as Record<string, unknown>,
    sourcePhases: row.source_phases,
    brewerReaction: (row.brewer_reaction as 'helpful' | 'not_helpful') ?? null,
    brewerNotes: row.brewer_notes,
    isRead: row.is_read,
    isDismissed: row.is_dismissed,
  };
}
