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

interface LineChartProps {
  data: any[]
  xKey: string
  yKeys: { key: string; color: string; label: string }[]
  height?: number
}

export default function LineChart({
  data,
  xKey,
  yKeys,
  height = 320
}: LineChartProps) {
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
