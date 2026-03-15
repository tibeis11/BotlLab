'use client';

import { useState } from 'react';
import { Wheat, Hop, FlaskConical, Package, ArrowUpDown, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { ImportQueueItem } from '@/lib/types/ingredients';

const TYPE_CONFIG = {
  malt:  { label: 'Malz',    color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  Icon: Wheat },
  hop:   { label: 'Hopfen',  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',  Icon: Hop },
  yeast: { label: 'Hefe',    color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',    Icon: FlaskConical },
  misc:  { label: 'Sonstig', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', Icon: Package },
  water: { label: 'Wasser',  color: 'text-cyan-400',   bg: 'bg-cyan-950/20 border-cyan-900/30',    Icon: Package },
} as const;

function formatRawData(raw: Record<string, unknown> | null): string[] {
  if (!raw) return [];
  const lines: string[] = [];
  if (raw.amount != null)        lines.push(`Menge: ${raw.amount} ${raw.unit ?? ''}`);
  if (raw.alpha_pct != null)     lines.push(`Alpha: ${raw.alpha_pct}%`);
  if (raw.color_ebc != null)     lines.push(`Farbe: ${raw.color_ebc} EBC`);
  if (raw.attenuation_pct != null) lines.push(`Vergärung: ${raw.attenuation_pct}%`);
  if (raw.time_minutes != null)  lines.push(`Zeit: ${raw.time_minutes} min`);
  if (raw.usage != null)         lines.push(`Verwendung: ${raw.usage}`);
  return lines;
}

interface ImportQueueCardProps {
  item: ImportQueueItem;
  onMerge: (item: ImportQueueItem) => void;
  onReject: (item: ImportQueueItem) => void;
  processing?: boolean;
}

export default function ImportQueueCard({ item, onMerge, onReject, processing }: ImportQueueCardProps) {
  const [expanded, setExpanded] = useState(false);

  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.misc;
  const { label, color, bg, Icon } = config;
  const rawLines = formatRawData(item.raw_data);
  const age = new Date(item.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl overflow-hidden hover:border-(--border-hover) transition-colors">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Typ-Badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider shrink-0 ${bg} ${color}`}>
          <Icon className="w-3 h-3" />
          {label}
        </span>

        {/* Name + Meta */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-(--text-primary) truncate" title={item.raw_name}>
            {item.raw_name}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-(--text-muted)">
            {item.suggested_master && (
              <span className="text-cyan-400">
                → {item.suggested_master.name}
              </span>
            )}
            <span>{age}</span>
          </div>
        </div>

        {/* Import-Zähler */}
        {item.import_count > 1 && (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-(--surface-sunken) border border-(--border) text-xs font-bold text-(--text-secondary) shrink-0"
            title={`${item.import_count}× importiert`}
          >
            <ArrowUpDown className="w-3 h-3" />
            {item.import_count}×
          </span>
        )}
      </div>

      {/* Rohwerte (aufklappbar) */}
      {rawLines.length > 0 && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-(--text-muted) hover:text-(--text-secondary) transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Rohwerte
          </button>
          {expanded && (
            <div className="mt-2 flex flex-wrap gap-2">
              {rawLines.map((line, i) => (
                <span key={i} className="text-xs bg-(--surface-sunken) px-2 py-0.5 rounded-md text-(--text-secondary) font-mono">
                  {line}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aktionen */}
      <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => onReject(item)}
          disabled={processing}
          className="px-3 py-2 bg-red-950/20 text-red-400 hover:bg-red-900/30 border border-red-900/30 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40"
        >
          <X className="w-4 h-4" />
          Ablehnen
        </button>
        <button
          onClick={() => onMerge(item)}
          disabled={processing}
          className="px-3 py-2 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30 border border-emerald-900/30 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40"
        >
          {processing ? (
            <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Zusammenführen
        </button>
      </div>
    </div>
  );
}
