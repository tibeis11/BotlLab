'use client'

import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'

type ChartRecord = Record<string, string | number | null | undefined>

interface PieChartProps<T extends ChartRecord = ChartRecord> {
  data: T[]
  nameKey: string & keyof T
  valueKey: string & keyof T
  colors?: string[]
  height?: number
}

const DEFAULT_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#6366f1']

export default function PieChart<T extends ChartRecord = ChartRecord>({
  data,
  nameKey,
  valueKey,
  colors = DEFAULT_COLORS,
  height = 320
}: PieChartProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ height }}>
        Keine Daten verfügbar
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPie>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props: PieLabelRenderProps) => {
            const name = (props as unknown as Record<string, unknown>)[nameKey as string]
            const pct = ((props.percent ?? 0) * 100).toFixed(0)
            return data.length <= 5 ? `${name} ${pct}%` : `${pct}%`
          }}
          outerRadius={90}
          innerRadius={0}
          fill="#8884d8"
          dataKey={valueKey}
          nameKey={nameKey}
          style={{ fontSize: '11px' }}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              stroke="var(--background)"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            borderRadius: '0.75rem',
            color: 'var(--text-primary)',
            fontSize: '12px'
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          iconSize={12}
        />
      </RechartsPie>
    </ResponsiveContainer>
  )
}
