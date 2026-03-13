'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import {
  AlertTriangle, Info, AlertCircle, ThumbsUp, ThumbsDown,
  X, ChevronRight, Sparkles, Loader2,
} from 'lucide-react';
import type { UserTier } from '@/lib/analytics-tier-features';
import type { AnalyticsInsight, InsightSeverity } from '@/lib/actions/insights-actions';
import {
  getBreweryInsights,
  markInsightRead,
  dismissInsight,
  reactToInsight,
} from '@/lib/actions/insights-actions';

// ── Tier-Gating ──────────────────────────────────────────────────────────────

const BASIC_TYPES = new Set(['off_flavor', 'batch_comparison', 'trend', 'shelf_life']);
// Extended types require enterprise tier
// const EXTENDED_TYPES = new Set(['market', 'event_detected', 'seasonality']);

function isInsightAllowed(insight: AnalyticsInsight, userTier: UserTier): boolean {
  // brewery+ can see basic insights
  if (['brewery', 'enterprise'].includes(userTier)) {
    if (BASIC_TYPES.has(insight.insightType)) return true;
  }
  // enterprise can see everything
  if (userTier === 'enterprise') return true;
  return false;
}

// ── Severity Config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<InsightSeverity, {
  icon: typeof AlertTriangle;
  borderColor: string;
  iconColor: string;
  bgColor: string;
  badgeColor: string;
  label: string;
}> = {
  critical: {
    icon: AlertCircle,
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    bgColor: 'bg-red-500/5',
    badgeColor: 'bg-red-500/20 text-red-400',
    label: 'Kritisch',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/5',
    badgeColor: 'bg-amber-500/20 text-amber-400',
    label: 'Warnung',
  },
  info: {
    icon: Info,
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-500/5',
    badgeColor: 'bg-blue-500/20 text-blue-400',
    label: 'Info',
  },
};

// ── Component ────────────────────────────────────────────────────────────────

interface BotlGuideInsightCardsProps {
  breweryId: string;
  userTier: UserTier;
}

export default function BotlGuideInsightCards({
  breweryId,
  userTier,
}: BotlGuideInsightCardsProps) {
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchInsights = useCallback(async () => {
    try {
      const all = await getBreweryInsights(breweryId, 10);
      // Apply tier-gating client-side (only show what tier allows)
      const allowed = all.filter((i) => isInsightAllowed(i, userTier));
      setInsights(allowed.slice(0, 3)); // max 3 visible
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [breweryId, userTier]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDismiss = (insightId: string) => {
    startTransition(async () => {
      await dismissInsight(insightId);
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
    });
  };

  const handleReaction = (insightId: string, reaction: 'helpful' | 'not_helpful') => {
    startTransition(async () => {
      await reactToInsight(insightId, reaction);
      setInsights((prev) =>
        prev.map((i) => (i.id === insightId ? { ...i, brewerReaction: reaction } : i))
      );
    });
  };

  const handleExpand = (insightId: string) => {
    setExpandedId((prev) => (prev === insightId ? null : insightId));
    // Mark as read on expand
    const insight = insights.find((i) => i.id === insightId);
    if (insight && !insight.isRead) {
      startTransition(async () => {
        await markInsightRead(insightId);
        setInsights((prev) =>
          prev.map((i) => (i.id === insightId ? { ...i, isRead: true } : i))
        );
      });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  // Don't render anything if no insights or tier too low
  if (loading) {
    return (
      <div className="bg-surface/50 rounded-xl border border-border p-4 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-text-muted" />
        <span className="text-sm text-text-muted">BotlGuide Analyst lädt…</span>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-amber-400" />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
          BotlGuide Analyst
        </h3>
        {isPending && <Loader2 size={12} className="animate-spin text-text-muted" />}
      </div>

      {/* Insight Cards */}
      <div className="space-y-2">
        {insights.map((insight) => {
          const config = SEVERITY_CONFIG[insight.severity];
          const Icon = config.icon;
          const isExpanded = expandedId === insight.id;

          return (
            <div
              key={insight.id}
              className={`
                rounded-xl border ${config.borderColor} ${config.bgColor}
                transition-all duration-200
                ${!insight.isRead ? 'ring-1 ring-border-hover' : ''}
              `}
            >
              {/* Card Header */}
              <div
                className="flex items-start gap-3 p-4 cursor-pointer"
                onClick={() => handleExpand(insight.id)}
              >
                <Icon size={18} className={`${config.iconColor} mt-0.5 shrink-0`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.badgeColor}`}>
                      {config.label}
                    </span>
                    {!insight.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-text-primary leading-tight">
                    {insight.title}
                  </h4>
                  {!isExpanded && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                      {insight.body}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <ChevronRight
                    size={14}
                    className={`text-text-muted transition-transform duration-200 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(insight.id);
                    }}
                    className="p-1 text-text-disabled hover:text-text-secondary transition-colors"
                    title="Ausblenden"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border-subtle mt-0">
                  <div className="pt-3 space-y-3">
                    {/* Body */}
                    <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                      {insight.body}
                    </p>

                    {/* Action Suggestion */}
                    {insight.actionSuggestion && (
                      <div className="bg-surface-hover/50 rounded-lg p-3 border border-border-hover/50">
                        <p className="text-xs font-bold text-text-secondary mb-1">
                          💡 Empfehlung
                        </p>
                        <p className="text-sm text-text-primary">
                          {insight.actionSuggestion}
                        </p>
                      </div>
                    )}

                    {/* Source Phases */}
                    {insight.sourcePhases && insight.sourcePhases.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {insight.sourcePhases.map((phase) => (
                          <span
                            key={phase}
                            className="text-[10px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded"
                          >
                            {phase}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Feedback Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {insight.brewerReaction ? (
                        <span className="text-xs text-text-muted">
                          {insight.brewerReaction === 'helpful'
                            ? '✅ Als hilfreich bewertet'
                            : '❌ Als nicht relevant markiert'}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReaction(insight.id, 'helpful');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold
                              bg-surface-hover hover:bg-success-bg text-text-secondary hover:text-success
                              rounded-lg border border-border-hover hover:border-success/30
                              transition-all duration-150"
                          >
                            <ThumbsUp size={12} />
                            Hilfreich
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReaction(insight.id, 'not_helpful');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold
                              bg-surface-hover hover:bg-error-bg text-text-secondary hover:text-error
                              rounded-lg border border-border-hover hover:border-error/30
                              transition-all duration-150"
                          >
                            <ThumbsDown size={12} />
                            Nicht relevant
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
