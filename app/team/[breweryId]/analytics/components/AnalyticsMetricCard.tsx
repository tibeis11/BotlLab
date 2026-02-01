'use client'

import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number; // Percentage change
  subValue?: string; // Secondary value
  icon?: ReactNode;
  loading?: boolean;
}

export default function AnalyticsMetricCard({ title, value, change, subValue, icon, loading }: MetricCardProps) {
  if (loading) {
    return (
       <div className="bg-black rounded-lg p-5 border border-zinc-800 animate-pulse h-32">
          <div className="h-3 w-24 bg-zinc-800 rounded mb-4"></div>
          <div className="h-8 w-16 bg-zinc-800 rounded"></div>
       </div>
    );
  }

  return (
    <article 
      className="bg-black rounded-lg p-5 border border-zinc-800 hover:border-zinc-600 transition-colors flex flex-col justify-between"
      role="region"
      aria-label={`${title} metric`}
    >
      <div>
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider truncate">{title}</h3>
          {icon && <div className="text-zinc-500">{icon}</div>}
        </div>
        <div className="flex items-baseline gap-2">
           <p className="text-3xl font-medium text-white tracking-tight font-mono">{value}</p>
           {change !== undefined && (
             <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${change >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-500 border border-red-900'}`}>
               {change > 0 ? '+' : ''}{change}%
             </span>
           )}
        </div>
      </div>
      
      {subValue && (
        <div className="mt-3 pt-3 border-t border-zinc-900">
           <p className="text-xs text-zinc-500">{subValue}</p>
        </div>
      )}
    </article>
  );
}
