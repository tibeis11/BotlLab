'use client'

import { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number // Percentage change
  subValue?: string // Secondary value (e.g. "15% of total")
  icon?: ReactNode
  trend?: number[] // Mini sparkline data
  loading?: boolean
}

export default function MetricCard({ title, value, change, subValue, icon, trend, loading }: MetricCardProps) {
  if (loading) {
    return <MetricCardSkeleton />
  }

  return (
    <article 
      className="bg-(--surface) rounded-lg p-5 border border-(--border) hover:border-(--border-hover) transition-colors"
      role="region"
      aria-label={`${title} metric`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-(--text-muted) text-xs font-medium uppercase tracking-wider mb-1 truncate">{title}</h3>
          <p className="text-3xl font-medium text-(--text-primary) tracking-tight break-words font-mono">{value}</p>
        </div>
        {icon && (
          <div className="text-(--text-muted) text-lg ml-4 opacity-50">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {change !== undefined && (
          <div
            className={`text-sm font-bold ${
              change > 0 ? 'text-(--success)' : change < 0 ? 'text-(--error)' : 'text-(--text-muted)'
            }`}
          >
            {change > 0 ? '↗' : change < 0 ? '↘' : '→'} {Math.abs(change).toFixed(1)}%
          </div>
        )}
        {subValue && (
          <div className="text-sm font-bold text-(--text-muted)">
            {subValue}
          </div>
        )}
        {trend && trend.length > 0 && (
          <div className="flex-1">
            <MiniSparkline data={trend} />
          </div>
        )}
      </div>
    </article>
  )
}

function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((value, idx) => {
        const height = ((value - min) / range) * 100
        return (
          <div
            key={idx}
            className="flex-1 bg-(--brand)/30 rounded-sm min-h-[2px]"
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}

function MetricCardSkeleton() {
  return (
    <div className="bg-(--surface) rounded-xl p-6 border border-(--border) animate-pulse">
      <div className="h-4 bg-(--surface-hover) rounded w-24 mb-4" />
      <div className="h-10 bg-(--surface-hover) rounded w-32 mb-4" />
      <div className="h-3 bg-(--surface-hover) rounded w-16" />
    </div>
  )
}
