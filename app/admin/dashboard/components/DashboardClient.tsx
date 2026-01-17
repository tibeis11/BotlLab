
'use client';

import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useState } from 'react';

type AnalyticsEvent = {
    id: number;
    user_id: string | null;
    event_type: string;
    category: string;
    created_at: string;
    payload: any;
    path: string;
};

interface DashboardClientProps {
    events: AnalyticsEvent[];
}

const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function DashboardClient({ events }: DashboardClientProps) {
    // KPI Calculation
    const totalEvents = events.length;
    const uniqueUsers = new Set(events.map(e => e.user_id).filter(Boolean)).size;
    const last24h = events.filter(e => new Date(e.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000).length;

    // Chart 1: Events over Time (Last 7 Days)
    const eventsByDate = events.reduce((acc, event) => {
        const date = new Date(event.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const dataOverTime = Object.entries(eventsByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => {
             // Simple sort for DD.MM format assuming same year context or close enough for simple viz
             const [dA, mA] = a.date.split('.');
             const [dB, mB] = b.date.split('.');
             return new Date(2025, parseInt(mA)-1, parseInt(dA)).getTime() - new Date(2025, parseInt(mB)-1, parseInt(dB)).getTime(); 
        })
        .slice(-7); // Last 7 data points

    // Chart 2: Events by Category
    const eventsByCategory = events.reduce((acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const dataByCategory = Object.entries(eventsByCategory).map(([name, value]) => ({ name, value }));

    // Chart 3: Top Event Types
    const eventsByType = events.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const dataByType = Object.entries(eventsByType)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Gesamt-Events</p>
                    <p className="text-4xl font-black text-white mt-2">{totalEvents}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Aktive Nutzer (Total)</p>
                    <p className="text-4xl font-black text-cyan-400 mt-2">{uniqueUsers}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Letzte 24h</p>
                    <p className="text-4xl font-black text-purple-400 mt-2">{last24h}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Timeline Chart */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-white mb-6">Aktivität (Timeline)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataOverTime}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                                <YAxis stroke="#71717a" fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-white mb-6">Events nach Kategorie</h3>
                    <div className="h-64 w-full flex items-center justify-center">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {dataByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Events List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800">
                    <h3 className="text-lg font-bold text-white">Top 5 Event-Typen</h3>
                </div>
                <div className="divide-y divide-zinc-800">
                    {dataByType.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition">
                            <div className="flex items-center gap-4">
                                <span className="font-mono text-zinc-600 font-bold text-sm">#{i+1}</span>
                                <span className="text-zinc-200 font-medium">{item.name}</span>
                            </div>
                            <div className="bg-zinc-800 px-3 py-1 rounded-full text-xs font-bold text-cyan-400">
                                {item.value}x
                            </div>
                        </div>
                    ))}
                </div>
            </div>

             {/* Recent Events Table */}
             <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Letzte 50 Aktivitäten</h3>
                    <span className="text-xs uppercase bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded font-bold tracking-wider">Live Log</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="p-4">Zeit</th>
                                <th className="p-4">Event</th>
                                <th className="p-4">Kategorie</th>
                                <th className="p-4">User ID (Hash)</th>
                                <th className="p-4">Path</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 font-mono text-xs">
                            {events.slice(0, 50).map((event) => (
                                <tr key={event.id} className="hover:bg-zinc-800/30 transition">
                                    <td className="p-4 whitespace-nowrap">{new Date(event.created_at).toLocaleString()}</td>
                                    <td className="p-4 font-bold text-cyan-500">{event.event_type}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                            {event.category}
                                        </span>
                                    </td>
                                    <td className="p-4 text-zinc-600" title={event.user_id || 'Anonym'}>
                                        {event.user_id ? event.user_id.split('-')[0] + '...' : 'Anonym'}
                                    </td>
                                    <td className="p-4 text-zinc-500 truncate max-w-[200px]">{event.path}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
