'use client';

import { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';

// Phase 10: Event type configuration
const EVENT_TYPE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  tasting:  { emoji: '🍻', label: 'Tasting',  color: '#f59e0b' },
  festival: { emoji: '🎉', label: 'Festival', color: '#ef4444' },
  party:    { emoji: '🎈', label: 'Party',    color: '#ec4899' },
  meetup:   { emoji: '🤝', label: 'Meetup',   color: '#8b5cf6' },
  unknown:  { emoji: '📍', label: 'Event',    color: '#6b7280' },
};

export interface EventAnnotation {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD) matching chart x-axis
  eventType: string;
  city: string | null;
  totalScans: number;
  uniqueSessions: number;
  brewerLabel: string | null;
  confidence: number;
}

interface ScansOverTimeChartProps {
  data: Record<string, { scans: number; unique: number }>;
  events?: EventAnnotation[];
  onEventClick?: (eventId: string) => void;
}

export default function ScansOverTimeChart({ data, events, onEventClick }: ScansOverTimeChartProps) {
  const chartData = useMemo(() => {
    return Object.entries(data)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, values]) => ({
        date,
        formattedDate: formatDate(new Date(date), 'dd. MMM', { locale: de }),
        fullDate: formatDate(new Date(date), 'dd. MMMM yyyy', { locale: de }),
        scans: values.scans,
        unique: values.unique
      }));
  }, [data]);

  // Phase 10: Map events to their chart x-axis formatted dates
  const eventsByFormattedDate = useMemo(() => {
    if (!events || events.length === 0) return new Map<string, EventAnnotation>();
    const map = new Map<string, EventAnnotation>();
    for (const evt of events) {
      const evtDate = evt.date.slice(0, 10); // YYYY-MM-DD
      const formatted = formatDate(new Date(evtDate), 'dd. MMM', { locale: de });
      map.set(formatted, evt);
    }
    return map;
  }, [events]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted text-sm">
        Keine Daten für diesen Zeitraum verfügbar
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest">Scans & Besucher Trend</h3>
        {events && events.length > 0 && (
          <span className="text-text-muted text-[10px] uppercase tracking-wider">
            📍 {events.length} Event{events.length !== 1 ? 's' : ''} erkannt
          </span>
        )}
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis 
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const eventForDate = eventsByFormattedDate.get(label as string);
                  const config = eventForDate ? (EVENT_TYPE_CONFIG[eventForDate.eventType] || EVENT_TYPE_CONFIG.unknown) : null;
                  return (
                    <div className="bg-surface border border-border p-3 rounded-lg shadow-xl max-w-xs">
                      <p className="text-text-secondary text-xs mb-2 font-medium">{payload[0].payload.fullDate}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                          <span className="text-text-secondary">Total Scans:</span>
                          <span className="text-text-primary font-mono font-bold">{payload[0].value}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                          <span className="text-text-secondary">Unique Visitors:</span>
                          <span className="text-text-primary font-mono font-bold">{payload[1].value}</span>
                        </div>
                      </div>
                      {eventForDate && config && (
                        <div className="mt-2 pt-2 border-t border-border-hover">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span>{config.emoji}</span>
                            <span className="font-medium" style={{ color: config.color }}>
                              {eventForDate.brewerLabel || config.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-text-muted mt-1 space-y-0.5">
                            {eventForDate.city && <p>{eventForDate.city}</p>}
                            <p>{eventForDate.totalScans} Scans • {eventForDate.uniqueSessions} Personen</p>
                            <p>{config.label} — {Math.round(eventForDate.confidence * 100)}% sicher</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
               wrapperStyle={{ paddingTop: '20px' }}
               iconType="circle"
               formatter={(value) => <span className="text-text-secondary text-xs font-medium ml-1">{value}</span>}
            />

            {/* Phase 10: Event reference lines */}
            {events && events.map((evt) => {
              const formattedDate = formatDate(new Date(evt.date.slice(0, 10)), 'dd. MMM', { locale: de });
              const config = EVENT_TYPE_CONFIG[evt.eventType] || EVENT_TYPE_CONFIG.unknown;
              return (
                <ReferenceLine
                  key={evt.id}
                  x={formattedDate}
                  stroke={config.color}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: config.emoji,
                    position: 'top',
                    fontSize: 16,
                    offset: 8,
                  }}
                  onClick={() => onEventClick?.(evt.id)}
                  style={{ cursor: onEventClick ? 'pointer' : 'default' }}
                />
              );
            })}

            <Area 
              type="monotone" 
              dataKey="scans" 
              name="Total Scans"
              stroke="#06b6d4" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorScans)" 
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area 
              type="monotone" 
              dataKey="unique" 
              name="Unique Visitors"
              stroke="#8b5cf6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorUnique)" 
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
