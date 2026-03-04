'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useAuth } from '@/app/context/AuthContext';

export type InsightSeverity = 'info' | 'warning' | 'critical';
export type InsightType =
  | 'fermentation_stall'
  | 'temp_anomaly'
  | 'slow_fermentation'
  | 'ready_to_package';

export interface BotlGuideInsightItem {
  id: string;
  session_id: string | null;
  brew_id: string | null;
  insight_type: InsightType;
  severity: InsightSeverity;
  title: string;
  body: string;
  created_at: string;
  dismissed: boolean;
}

interface UseBotlGuideInsightsReturn {
  insights: BotlGuideInsightItem[];
  loading: boolean;
  dismiss: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useBotlGuideInsights(limit = 5): UseBotlGuideInsightsReturn {
  const supabase = useSupabase();
  const { user } = useAuth();
  const [insights, setInsights] = useState<BotlGuideInsightItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('botlguide_insights')
        .select('id, session_id, brew_id, insight_type, severity, title, body, created_at, dismissed')
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        setInsights(data as unknown as BotlGuideInsightItem[]);
      }
    } catch (err) {
      console.error('[useBotlGuideInsights] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase, limit]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const dismiss = useCallback(async (id: string) => {
    // Optimistic update
    setInsights(prev => prev.filter(i => i.id !== id));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('botlguide_insights')
        .update({ dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('[useBotlGuideInsights] dismiss error', err);
      // Re-fetch on error to restore state
      fetchInsights();
    }
  }, [supabase, fetchInsights]);

  return { insights, loading, dismiss, refresh: fetchInsights };
}
