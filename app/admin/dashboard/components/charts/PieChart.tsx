'use client'

import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface PieChartProps {
  data: any[]
  nameKey: string
  valueKey: string
  colors?: string[]
  height?: number
}

const DEFAULT_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#6366f1']

export default function PieChart({
  data,
  nameKey,
  valueKey,
  colors = DEFAULT_COLORS,
  height = 320
}: PieChartProps) {
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
          label={({ [nameKey]: name, percent }: any) => 
            data.length <= 5 ? `${name} ${(percent * 100).toFixed(0)}%` : `${(percent * 100).toFixed(0)}%`
          }
          outerRadius={90}
          innerRadius={0}
          fill="#8884d8"
          dataKey={valueKey}
          style={{ fontSize: '11px' }}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              stroke="#000"
              strokeWidth={2}
            />
          ))}
        </Pie>
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
      </RechartsPie>
    </ResponsiveContainer>
  )
}
