'use client'

import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

type ChartRecord = Record<string, string | number | null | undefined>

interface BarChartProps<T extends ChartRecord = ChartRecord> {
  data: T[]
  xKey: string & keyof T
  yKeys: { key: string & keyof T; color: string; label: string }[]
  height?: number
}

export default function BarChart<T extends ChartRecord = ChartRecord>({
  data,
  xKey,
  yKeys,
  height = 320
}: BarChartProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ height }}>
        Keine Daten verfügbar
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBar data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          dataKey={xKey}
          stroke="var(--chart-axis)"
          tick={{ fontSize: 10 }}
          style={{ fontSize: '10px' }}
        />
        <YAxis
          stroke="var(--chart-axis)"
          tick={{ fontSize: 10 }}
          style={{ fontSize: '10px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            borderRadius: '0.75rem',
            color: 'var(--text-primary)',
            fontSize: '12px'
          }}
          cursor={{ fill: 'var(--chart-grid)', fillOpacity: 0.3 }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          iconSize={12}
        />
        {yKeys.map(({ key, color, label }) => (
          <Bar
            key={key}
            dataKey={key}
            name={label}
            fill={color}
            radius={[6, 6, 0, 0]}
            maxBarSize={60}
          />
        ))}
      </RechartsBar>
    </ResponsiveContainer>
  )
}
