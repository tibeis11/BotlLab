'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { getPremiumStatus } from '@/lib/actions/premium-actions';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, Users, Activity, Lock } from 'lucide-react';

interface AnalyticsData {
  totalEvents: number;
  eventsByCategory: { category: string; count: number }[];
  topEvents: { event_type: string; count: number }[];
  recentActivity: { date: string; count: number }[];
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const status = await getPremiumStatus();
      const canAccess = status?.tier !== 'free';
      setHasAccess(canAccess);

      if (canAccess) {
        await fetchAnalytics();
      }
      setLoading(false);
    }

    checkAccess();
  }, [user, timeRange]);

  async function fetchAnalytics() {
    if (!user) return;

    try {
      // Calculate date range
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch total events
      const { count: totalEvents } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      // Fetch events by category
      const { data: categoryData } = await supabase
        .from('analytics_events')
        .select('category')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      const eventsByCategory = Object.entries(
        (categoryData || []).reduce((acc, { category }) => {
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([category, count]) => ({ category, count: count as number }));

      // Fetch top event types
      const { data: eventData } = await supabase
        .from('analytics_events')
        .select('event_type')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      const topEvents = Object.entries(
        (eventData || []).reduce((acc, { event_type }) => {
          acc[event_type] = (acc[event_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([event_type, count]) => ({ event_type, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Fetch recent activity (last 7 days, daily aggregated)
      const { data: activityData } = await supabase
        .from('analytics_events')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      const recentActivity = (activityData || []).reduce((acc, { created_at }) => {
        const date = new Date(created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recentActivityArray = Object.entries(recentActivity).map(([date, count]) => ({
        date,
        count: count as number,
      }));

      setData({
        totalEvents: totalEvents || 0,
        eventsByCategory,
        topEvents,
        recentActivity: recentActivityArray,
      });
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 max-w-2xl">
          <div className="w-16 h-16 mx-auto mb-6 bg-zinc-800 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-zinc-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Analytics freischalten</h1>
          <p className="text-zinc-400 text-lg mb-8">
            Detaillierte Statistiken und Auswertungen sind exklusiv für Premium-Mitglieder verfügbar.
            Upgrade jetzt und erhalte tiefe Einblicke in deine Nutzung.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/account"
              className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition flex items-center justify-center gap-2"
            >
              Jetzt upgraden
              <ArrowUpRight className="w-5 h-5" />
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition"
            >
              Zurück zum Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const maxActivity = Math.max(...(data?.recentActivity.map((a) => a.count) || [1]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-zinc-400">Einblicke in deine Nutzung und Aktivität</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                timeRange === range
                  ? 'bg-cyan-500 text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {range === '7d' ? '7 Tage' : range === '30d' ? '30 Tage' : '90 Tage'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
              Gesamte Events
            </h3>
          </div>
          <p className="text-4xl font-black">{data?.totalEvents || 0}</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
              Kategorien
            </h3>
          </div>
          <p className="text-4xl font-black">{data?.eventsByCategory.length || 0}</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
              Top Event
            </h3>
          </div>
          <p className="text-2xl font-black truncate">
            {data?.topEvents[0]?.event_type || 'N/A'}
          </p>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-6">Aktivitätsverlauf</h2>
        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="flex items-end gap-2 h-64">
            {data.recentActivity.map(({ date, count }) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-cyan-500 rounded-t-lg transition-all hover:bg-cyan-400"
                  style={{ height: `${(count / maxActivity) * 100}%`, minHeight: '4px' }}
                  title={`${date}: ${count} events`}
                ></div>
                <span className="text-xs text-zinc-500 rotate-45 origin-top-left">
                  {new Date(date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-12">Keine Daten verfügbar</p>
        )}
      </div>

      {/* Event Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Events */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Top Events</h2>
          <div className="space-y-3">
            {data?.topEvents.map(({ event_type, count }) => (
              <div key={event_type} className="flex items-center justify-between">
                <span className="text-sm text-zinc-300 font-mono">{event_type}</span>
                <span className="text-sm font-bold text-cyan-400">{count}x</span>
              </div>
            ))}
            {(!data?.topEvents || data.topEvents.length === 0) && (
              <p className="text-zinc-500 text-sm text-center py-8">Keine Events gefunden</p>
            )}
          </div>
        </div>

        {/* By Category */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Nach Kategorie</h2>
          <div className="space-y-3">
            {data?.eventsByCategory.map(({ category, count }) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-zinc-300 capitalize">{category}</span>
                <span className="text-sm font-bold text-purple-400">{count}x</span>
              </div>
            ))}
            {(!data?.eventsByCategory || data.eventsByCategory.length === 0) && (
              <p className="text-zinc-500 text-sm text-center py-8">Keine Kategorien gefunden</p>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6">
        <p className="text-sm text-zinc-400">
          <strong className="text-white">Hinweis:</strong> Diese Statistiken basieren auf deinen
          persönlichen Aktivitäten in BotlLab. Alle Daten werden anonymisiert gespeichert und nicht
          an Dritte weitergegeben. Du kannst das Tracking jederzeit in deinen{' '}
          <Link href="/dashboard/account" className="text-cyan-400 hover:underline">
            Account-Einstellungen
          </Link>{' '}
          deaktivieren.
        </p>
      </div>
    </div>
  );
}
