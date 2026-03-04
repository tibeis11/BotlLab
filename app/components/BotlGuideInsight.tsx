'use client';

import { Sparkles, X, AlertTriangle, Info, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { BotlGuideInsightItem, InsightSeverity } from '@/lib/hooks/useBotlGuideInsights';

// ── Severity Config ───────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<InsightSeverity, {
  border: string;
  bg: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  icon: typeof AlertTriangle;
  label: string;
}> = {
  info: {
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-950/20',
    iconBg: 'bg-indigo-500/20',
    badgeBg: 'bg-indigo-950/50',
    badgeText: 'text-indigo-400',
    icon: Info,
    label: 'Info',
  },
  warning: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/20',
    iconBg: 'bg-amber-500/20',
    badgeBg: 'bg-amber-950/50',
    badgeText: 'text-amber-400',
    icon: AlertTriangle,
    label: 'Hinweis',
  },
  critical: {
    border: 'border-red-500/50',
    bg: 'bg-red-950/20',
    iconBg: 'bg-red-500/20',
    badgeBg: 'bg-red-950/50',
    badgeText: 'text-red-400',
    icon: Zap,
    label: 'Kritisch',
  },
};

// ── insight_type → action URL helper ─────────────────────────────────────────

function getActionUrl(insight: BotlGuideInsightItem, breweryId?: string): string | null {
  if (!insight.brew_id || !breweryId) return null;
  if (insight.insight_type === 'fermentation_stall' || insight.insight_type === 'temp_anomaly' ||
      insight.insight_type === 'slow_fermentation' || insight.insight_type === 'ready_to_package') {
    return `/team/${breweryId}/brews/${insight.brew_id}`;
  }
  return null;
}

// ── Single Banner ─────────────────────────────────────────────────────────────

interface BotlGuideInsightBannerProps {
  insight: BotlGuideInsightItem;
  onDismiss: (id: string) => void;
  breweryId?: string;
  /** compact = slim single-line style for notification feeds */
  compact?: boolean;
}

export function BotlGuideInsightBanner({
  insight,
  onDismiss,
  breweryId,
  compact = false,
}: BotlGuideInsightBannerProps) {
  const config = SEVERITY_STYLES[insight.severity];
  const SeverityIcon = config.icon;
  const actionUrl = getActionUrl(insight, breweryId);

  if (compact) {
    return (
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border ${config.border} ${config.bg} animate-in fade-in slide-in-from-top-1 duration-300`}
      >
        <div className={`flex-shrink-0 w-7 h-7 rounded-full ${config.iconBg} flex items-center justify-center mt-0.5`}>
          <SeverityIcon size={13} className={config.badgeText} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{insight.title}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{insight.body}</p>
        </div>
        <button
          onClick={() => onDismiss(insight.id)}
          className="flex-shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors mt-0.5"
          aria-label="Schließen"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${config.border} ${config.bg} p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-400`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* BotlGuide brand pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/20">
            <Sparkles size={10} className="text-purple-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-purple-400">BotlGuide</span>
          </div>
          {/* Severity badge */}
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${config.badgeBg} ${config.border} ${config.badgeText}`}>
            {config.label}
          </span>
        </div>
        <button
          onClick={() => onDismiss(insight.id)}
          className="flex-shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
          aria-label="Insight schließen"
        >
          <X size={15} />
        </button>
      </div>

      {/* Icon + Content */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded-full ${config.iconBg} flex items-center justify-center mt-0.5`}>
          <SeverityIcon size={16} className={config.badgeText} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-bold text-white leading-tight">{insight.title}</p>
          <p className="text-xs text-zinc-400 leading-relaxed">{insight.body}</p>
        </div>
      </div>

      {/* Action link */}
      {actionUrl && (
        <div className="pl-12">
          <Link
            href={actionUrl}
            className={`inline-flex items-center gap-1.5 text-xs font-bold ${config.badgeText} hover:underline transition-colors`}
          >
            Sud öffnen <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Insight List (for dashboard widget) ──────────────────────────────────────

interface BotlGuideInsightListProps {
  insights: BotlGuideInsightItem[];
  onDismiss: (id: string) => void;
  breweryId?: string;
  compact?: boolean;
}

export function BotlGuideInsightList({
  insights,
  onDismiss,
  breweryId,
  compact = false,
}: BotlGuideInsightListProps) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.map(insight => (
        <BotlGuideInsightBanner
          key={insight.id}
          insight={insight}
          onDismiss={onDismiss}
          breweryId={breweryId}
          compact={compact}
        />
      ))}
    </div>
  );
}
