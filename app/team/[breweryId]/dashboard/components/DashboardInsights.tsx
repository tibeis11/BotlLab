'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Sparkles, AlertTriangle, AlertCircle, Info, 
  ChevronRight, Lock
} from 'lucide-react';

interface Insight {
  id: string;
  insight_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  body: string;
  action_suggestion: string | null;
  created_at: string;
}

const SEVERITY_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  critical: { icon: AlertCircle,   color: 'text-red-400',    bg: 'bg-red-500/5',    border: 'border-red-500/20' },
  warning:  { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/5',  border: 'border-amber-500/20' },
  info:     { icon: Info,          color: 'text-blue-400',   bg: 'bg-blue-500/5',   border: 'border-blue-500/20' },
};

interface DashboardInsightsProps {
  breweryId: string;
  hasPremiumAccess: boolean;
}

export default function DashboardInsights({ breweryId, hasPremiumAccess }: DashboardInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasPremiumAccess) loadInsights();
    else setLoading(false);
  }, [breweryId, hasPremiumAccess]);

  async function loadInsights() {
    try {
      const { data } = await supabase
        .from('analytics_ai_insights')
        .select('id, insight_type, severity, title, body, action_suggestion, created_at')
        .eq('brewery_id', breweryId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) {
        setInsights(data as Insight[]);
      }
    } catch (e) {
      console.error('Failed to load insights', e);
    } finally {
      setLoading(false);
    }
  }

  // Locked state for non-premium
  if (!hasPremiumAccess) {
    return (
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-[2px] bg-zinc-950/60 z-10 flex flex-col items-center justify-center">
          <Lock className="w-5 h-5 text-zinc-600 mb-2" />
          <p className="text-xs text-zinc-500 font-bold">Brewery Premium</p>
          <Link 
            href="/pricing" 
            className="text-[10px] text-cyan-400 hover:text-cyan-300 mt-1 font-bold"
          >
            Freischalten →
          </Link>
        </div>
        <div className="opacity-30 pointer-events-none">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            BotlGuide Insights
          </h3>
          <div className="space-y-2">
            <div className="h-12 bg-zinc-800/50 rounded-lg" />
            <div className="h-12 bg-zinc-800/50 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-40 bg-zinc-800 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-12 bg-zinc-800/50 rounded-lg" />
          <div className="h-12 bg-zinc-800/50 rounded-lg" />
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400" />
          BotlGuide Insights
        </h3>
        <div className="text-center py-3">
          <p className="text-xs text-zinc-600">Aktuell keine neuen Insights</p>
          <p className="text-[10px] text-zinc-700 mt-1">BotlGuide analysiert deine Daten kontinuierlich</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/50 flex justify-between items-center">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          BotlGuide Insights
        </h3>
        <Link
          href={`/team/${breweryId}/analytics`}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider transition-colors"
        >
          Alle anzeigen
        </Link>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {insights.map((insight) => {
          const style = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
          const Icon = style.icon;

          return (
            <div 
              key={insight.id} 
              className={`px-4 py-3 flex items-start gap-3 ${style.bg} hover:bg-zinc-800/20 transition-colors`}
            >
              <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center border ${style.border} shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${style.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-200 line-clamp-1">{insight.title}</p>
                <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5 leading-relaxed">{insight.body}</p>
              </div>
              <Link
                href={`/team/${breweryId}/analytics`}
                className="shrink-0 mt-1"
              >
                <ChevronRight className="w-3.5 h-3.5 text-zinc-700 hover:text-zinc-400 transition-colors" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
