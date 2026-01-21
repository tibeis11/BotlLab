'use client'

import { DateRange } from '@/lib/types/admin-analytics'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  availableRanges?: DateRange[]
}

const ALL_RANGES: { id: DateRange; label: string }[] = [
  { id: '24h', label: '24 Std' },
  { id: '7d', label: '7 Tage' },
  { id: '30d', label: '30 Tage' },
  { id: '90d', label: '90 Tage' },
  { id: '1y', label: '1 Jahr' },
  { id: 'all', label: 'Alle' },
]

export default function DateRangePicker({ value, onChange, availableRanges }: DateRangePickerProps) {
  const visibleRanges = availableRanges 
    ? ALL_RANGES.filter(r => availableRanges.includes(r.id))
    : ALL_RANGES.filter(r => r.id !== '24h') // Default hide 24h as it's specific

  return (
    <div className="flex gap-2 flex-wrap" role="group" aria-label="Date range filter">
      {visibleRanges.map((range) => (
        <button
          key={range.id}
          onClick={() => onChange(range.id)}
          aria-pressed={value === range.id}
          aria-label={`Filter by ${range.label}`}
          className={`
            px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all
            focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black
            ${
              value === range.id
                ? 'bg-cyan-500 text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }
          `}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
