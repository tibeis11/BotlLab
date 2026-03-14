'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Sparkles, AlertTriangle, AlertCircle, Info, 
  ChevronRight, Lock, ThumbsUp, ThumbsDown, Lightbulb
} from 'lucide-react';

interface Insight {
  id: string;
  insight_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  body: string;
  action_suggestion: string | null;
  brewer_reaction: string | null;
  created_at: string;
}

const SEVERITY_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  critical: { icon: AlertCircle,   color: 'text-error',          bg: 'bg-error/5',          border: 'border-error/20' },
  warning:  { icon: AlertTriangle, color: 'text-accent-orange',  bg: 'bg-accent-orange/5',  border: 'border-accent-orange/20' },
  info:     { icon: Info,          color: 'text-blue-400',       bg: 'bg-blue-500/5',       border: 'border-blue-500/20' },
};

interface DashboardInsightsProps {
  breweryId: string;
  hasPremiumAccess: boolean;
  isAdminMode?: boolean;
}

export default function DashboardInsights({ breweryId, hasPremiumAccess, isAdminMode }: DashboardInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactingId, setReactingId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (hasPremiumAccess) loadInsights();
    else setLoading(false);
  }, [breweryId, hasPremiumAccess]);

  async function loadInsights() {
    try {
      const { data } = await supabase
        .from('analytics_ai_insights')
        .select('id, insight_type, severity, title, body, action_suggestion, brewer_reaction, created_at')
        .eq('brewery_id', breweryId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setInsights(data as Insight[]);
      }
    } catch (e) {
      console.error('Failed to load insights', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualTrigger() {
    if (!isAdminMode || triggering) return;
    setTriggering(true);
    try {
      await supabase.functions.invoke('botlguide-daily-analyst', {
        body: { breweryId }
      });
      // reload after 2-3 seconds to give it time to save
      setTimeout(async () => {
        await loadInsights();
        setTriggering(false);
      }, 2500);
    } catch (e) {
      console.error('Manual trigger failed', e);
      setTriggering(false);
    }
  }

  async function handleReaction(insightId: string, reaction: 'helpful' | 'not_helpful') {
    setReactingId(insightId);
    try {
      await supabase
        .from('analytics_ai_insights')
        .update({ brewer_reaction: reaction })
        .eq('id', insightId);

      setInsights(prev =>
        prev.map(i => i.id === insightId ? { ...i, brewer_reaction: reaction } : i)
      );
    } catch (e) {
      console.error('Failed to save reaction', e);
    } finally {
      setReactingId(null);
    }
  }

  // Locked state for non-premium
  if (!hasPremiumAccess) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-[2px] bg-background/60 z-10 flex flex-col items-center justify-center">
          <Lock className="w-5 h-5 text-text-disabled mb-2" />
          <p className="text-xs text-text-muted font-bold">Brewery Premium</p>
          <Link 
            href="/pricing" 
            className="text-[10px] text-brand hover:text-brand-hover mt-1 font-bold"
          >
            Freischalten →
          </Link>
        </div>
        <div className="opacity-30 pointer-events-none">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent-purple" />
            BotlGuide Insights
          </h3>
          <div className="space-y-2">
            <div className="h-12 bg-surface-hover/50 rounded-lg" />
            <div className="h-12 bg-surface-hover/50 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-40 bg-surface-hover rounded mb-4" />
        <div className="space-y-2">
          <div className="h-12 bg-surface-hover/50 rounded-lg" />
          <div className="h-12 bg-surface-hover/50 rounded-lg" />
        </div>
      </div>
    );
  }

  // Separate daily_analysis from alert-type insights
  const dailyInsight = insights.find(i => i.insight_type === 'daily_analysis') ?? null;
  const alertInsights = insights.filter(i => i.insight_type !== 'daily_analysis');

  if (!dailyInsight && alertInsights.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent-purple" />
          BotlGuide Insights
        </h3>
        <div className="text-center py-3">
          <p className="text-xs text-text-disabled">Aktuell keine neuen Insights</p>
          <p className="text-[10px] text-text-disabled mt-1">BotlGuide analysiert deine Daten täglich um 07:00</p>
          {isAdminMode && (
            <button 
              onClick={handleManualTrigger}
              disabled={triggering}
              className="mt-4 px-3 py-1.5 bg-brand/10 text-brand text-[10px] uppercase font-bold rounded-lg border border-brand/20 hover:bg-brand/20 disabled:opacity-50 transition-colors"
            >
              {triggering ? 'Analysiere...' : 'Manuell analysieren (Admin)'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const timeLabel = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - d.getTime()) / 3_600_000);
    if (diffH < 1) return 'gerade eben';
    if (diffH < 24) return `vor ${diffH}h`;
    return `vor ${Math.floor(diffH / 24)}d`;
  };

  return (
    <div className="space-y-3">
      {/* ── Daily Analysis Card ───────────────────────────────────── */}
      {dailyInsight && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border-subtle bg-gradient-to-r from-accent-purple/5 to-transparent flex justify-between items-center">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-purple" />
              BotlGuide Tagesanalyse
              {isAdminMode && (
                <button 
                  onClick={handleManualTrigger}
                  disabled={triggering}
                  className="ml-2 px-1.5 py-0.5 bg-brand/10 text-brand text-[8px] uppercase font-bold rounded border border-brand/20 hover:bg-brand/20 disabled:opacity-50 transition-colors"
                  title="Neu generieren (Admin)"
                >
                  {triggering ? '...' : 'Re-Run'}
                </button>
              )}
            </h3>
            <span className="text-[10px] text-text-disabled">{timeLabel(dailyInsight.created_at)}</span>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs font-bold text-text-primary">{dailyInsight.title}</p>
            <p className="text-xs text-text-secondary leading-relaxed">{dailyInsight.body}</p>

            {dailyInsight.action_suggestion && (
              <div className="flex items-start gap-2 bg-accent-purple/5 border border-accent-purple/10 rounded-lg p-3">
                <Lightbulb className="w-3.5 h-3.5 text-accent-purple shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-secondary leading-relaxed">{dailyInsight.action_suggestion}</p>
              </div>
            )}

            {/* Reaction buttons */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-text-disabled">War dieser Insight hilfreich?</span>
              {dailyInsight.brewer_reaction ? (
                <span className="text-[10px] text-text-disabled">
                  {dailyInsight.brewer_reaction === 'helpful' ? '👍 Danke!' : '👎 Notiert'}
                </span>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleReaction(dailyInsight.id, 'helpful')}
                    disabled={reactingId === dailyInsight.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-muted hover:text-success hover:bg-success-bg border border-border-subtle transition-colors disabled:opacity-50"
                  >
                    <ThumbsUp className="w-3 h-3" /> Ja
                  </button>
                  <button
                    onClick={() => handleReaction(dailyInsight.id, 'not_helpful')}
                    disabled={reactingId === dailyInsight.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-muted hover:text-error hover:bg-error/5 border border-border-subtle transition-colors disabled:opacity-50"
                  >
                    <ThumbsDown className="w-3 h-3" /> Nein
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Alert-style insights (compact list) ───────────────────── */}
      {alertInsights.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border-subtle bg-surface-hover/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              {!dailyInsight && <Sparkles className="w-4 h-4 text-accent-purple" />}
              {dailyInsight ? 'Weitere Hinweise' : 'BotlGuide Insights'}
            </h3>
            <Link
              href={`/team/${breweryId}/analytics`}
              className="text-[10px] text-brand hover:text-brand-hover font-bold uppercase tracking-wider transition-colors"
            >
              Alle anzeigen
            </Link>
          </div>

          <div className="divide-y divide-border-subtle">
            {alertInsights.map((insight) => {
              const style = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
              const Icon = style.icon;

              return (
                <div 
                  key={insight.id} 
                  className={`px-4 py-3 flex items-start gap-3 ${style.bg} hover:bg-surface-hover/50 transition-colors`}
                >
                  <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center border ${style.border} shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${style.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text-secondary line-clamp-1">{insight.title}</p>
                    <p className="text-[10px] text-text-muted line-clamp-2 mt-0.5 leading-relaxed">{insight.body}</p>
                  </div>
                  <Link
                    href={`/team/${breweryId}/analytics`}
                    className="shrink-0 mt-1"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-text-disabled hover:text-text-muted transition-colors" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
