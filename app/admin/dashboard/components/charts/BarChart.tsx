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

interface BarChartProps {
  data: any[]
  xKey: string
  yKeys: { key: string; color: string; label: string }[]
  height?: number
}

export default function BarChart({
  data,
  xKey,
  yKeys,
  height = 320
}: BarChartProps) {
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
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey={xKey}
          stroke="#71717a"
          tick={{ fontSize: 10 }}
          style={{ fontSize: '10px' }}
        />
        <YAxis
          stroke="#71717a"
          tick={{ fontSize: 10 }}
          style={{ fontSize: '10px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '0.75rem',
            color: '#fff',
            fontSize: '12px'
          }}
          cursor={{ fill: '#27272a', fillOpacity: 0.3 }}
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
