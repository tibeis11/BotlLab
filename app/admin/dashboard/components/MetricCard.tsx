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
      className="bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-800 hover:border-zinc-700 transition-all"
      role="region"
      aria-label={`${title} metric`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-zinc-500 text-xs sm:text-sm font-bold mb-2 uppercase tracking-wide truncate">{title}</h3>
          <p className="text-2xl sm:text-4xl font-black text-white break-words">{value}</p>
        </div>
        {icon && (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 ml-2" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {change !== undefined && (
          <div
            className={`text-sm font-bold ${
              change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-zinc-500'
            }`}
          >
            {change > 0 ? '↗' : change < 0 ? '↘' : '→'} {Math.abs(change).toFixed(1)}%
          </div>
        )}
        {subValue && (
          <div className="text-sm font-bold text-zinc-500">
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
            className="flex-1 bg-cyan-500/30 rounded-sm min-h-[2px]"
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}

function MetricCardSkeleton() {
  return (
    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-24 mb-4" />
      <div className="h-10 bg-zinc-800 rounded w-32 mb-4" />
      <div className="h-3 bg-zinc-800 rounded w-16" />
    </div>
  )
}
