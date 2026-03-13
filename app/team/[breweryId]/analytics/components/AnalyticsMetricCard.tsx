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
       <div className="bg-surface rounded-2xl p-5 border border-border animate-pulse h-32">
          <div className="h-3 w-24 bg-surface-hover rounded mb-4"></div>
          <div className="h-8 w-16 bg-surface-hover rounded"></div>
       </div>
    );
  }

  return (
    <article 
      className="bg-surface rounded-2xl p-5 border border-border hover:border-border-hover transition-colors flex flex-col justify-between"
      role="region"
      aria-label={`${title} metric`}
    >
      <div>
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest truncate">{title}</h3>
          {icon && <div className="text-text-muted">{icon}</div>}
        </div>
        <div className="flex items-baseline gap-2">
           <p className="text-3xl font-black text-text-primary tracking-tight font-mono tabular-nums">{value}</p>
           {change !== undefined && (
             <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${change >= 0 ? 'bg-success-bg text-success border border-success/20' : 'bg-error-bg text-error border border-error/20'}`}>
               {change > 0 ? '+' : ''}{change}%
             </span>
           )}
        </div>
      </div>
      
      {subValue && (
        <div className="mt-3 pt-3 border-t border-border">
           <p className="text-xs text-text-muted">{subValue}</p>
        </div>
      )}
    </article>
  );
}
