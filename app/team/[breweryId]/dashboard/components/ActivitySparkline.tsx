'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DayData {
  date: string;
  label: string;
  scans: number;
  ratings: number;
}

export default function ActivitySparkline({ breweryId }: { breweryId: string }) {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<'up' | 'down' | 'flat'>('flat');

  useEffect(() => {
    loadData();
  }, [breweryId]);

  async function loadData() {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 13); // 14 days for comparison

      const { data: dailyStats } = await supabase
        .from('analytics_brewery_daily')
        .select('date, bottles_scanned, ratings_received')
        .eq('brewery_id', breweryId)
        .gte('date', startDate.toISOString().slice(0, 10))
        .lte('date', endDate.toISOString().slice(0, 10))
        .order('date', { ascending: true });

      if (dailyStats && dailyStats.length > 0) {
        // Fill in all 14 days (even missing ones)
        const dayMap = new Map<string, { scans: number; ratings: number }>();
        dailyStats.forEach((d: { date: string; bottles_scanned: number | null; ratings_received: number | null }) => {
          dayMap.set(d.date, { 
            scans: d.bottles_scanned || 0, 
            ratings: d.ratings_received || 0 
          });
        });

        const filled: DayData[] = [];
        for (let i = 0; i < 14; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().slice(0, 10);
          const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
          const entry = dayMap.get(dateStr) || { scans: 0, ratings: 0 };
          filled.push({
            date: dateStr,
            label: dayNames[d.getDay()],
            scans: entry.scans,
            ratings: entry.ratings,
          });
        }

        setData(filled);

        // Calculate trend (last 7 vs previous 7)
        const prev7 = filled.slice(0, 7).reduce((s, d) => s + d.scans + d.ratings, 0);
        const last7 = filled.slice(7).reduce((s, d) => s + d.scans + d.ratings, 0);
        if (last7 > prev7 * 1.1) setTrend('up');
        else if (last7 < prev7 * 0.9) setTrend('down');
        else setTrend('flat');
      }
    } catch (e) {
      console.error('Failed to load activity sparkline', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-32 bg-surface-hover rounded mb-4" />
        <div className="h-20 bg-surface-hover/50 rounded-xl" />
      </div>
    );
  }

  const last7 = data.slice(-7);
  const totalScans = last7.reduce((s, d) => s + d.scans, 0);
  const totalRatings = last7.reduce((s, d) => s + d.ratings, 0);

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-20 bg-brand/5 blur-[80px] rounded-full pointer-events-none -mt-8 -mr-8" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            Aktivität
            <span className="text-[10px] text-text-muted font-normal">letzte 7 Tage</span>
          </h3>
          <div className="flex items-center gap-1.5">
            {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-success" />}
            {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-error" />}
            {trend === 'flat' && <Minus className="w-3.5 h-3.5 text-text-muted" />}
            <span className={`text-xs font-bold ${
              trend === 'up' ? 'text-success' : 
              trend === 'down' ? 'text-error' : 'text-text-muted'
            }`}>
              {trend === 'up' ? 'Steigend' : trend === 'down' ? 'Fallend' : 'Stabil'}
            </span>
          </div>
        </div>

        {/* Mini stats */}
        <div className="flex gap-4 mb-3">
          <div>
            <span className="text-xs text-text-muted">Scans</span>
            <p className="text-lg font-bold text-text-primary font-mono">{totalScans}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Bewertungen</span>
            <p className="text-lg font-bold text-text-primary font-mono">{totalRatings}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[80px] -mx-2">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <AreaChart data={last7} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
                interval={0}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}
                labelStyle={{ color: 'var(--text-muted)' }}
                formatter={(value: any, name: any) => [
                  value ?? 0, 
                  name === 'scans' ? 'Scans' : 'Bewertungen'
                ]}
              />
              <Area
                type="monotone"
                dataKey="scans"
                stroke="var(--brand)"
                strokeWidth={2}
                fill="url(#sparkGrad)"
                dot={false}
                animationDuration={1000}
              />
              <Area
                type="monotone"
                dataKey="ratings"
                stroke="var(--accent-purple)"
                strokeWidth={1.5}
                fill="none"
                dot={false}
                strokeDasharray="4 2"
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
