'use client'

import {
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

type ChartRecord = Record<string, string | number | null | undefined>

interface LineChartProps<T extends ChartRecord = ChartRecord> {
  data: T[]
  xKey: string & keyof T
  yKeys: { key: string & keyof T; color: string; label: string }[]
  height?: number
}

export default function LineChart<T extends ChartRecord = ChartRecord>({
  data,
  xKey,
  yKeys,
  height = 320
}: LineChartProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ height }}>
        Keine Daten verfügbar
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLine data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          iconSize={12}
        />
        {yKeys.map(({ key, color, label }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        ))}
      </RechartsLine>
    </ResponsiveContainer>
  )
}
