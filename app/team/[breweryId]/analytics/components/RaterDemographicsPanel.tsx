'use client';

import { useState } from 'react';
import { Info, Lock, MapPin, Users } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DemographicsResult, AgeGroup, ExperienceLevel, ActivityLevel } from '@/lib/actions/analytics-actions';
import type { UserTier } from '@/lib/analytics-tier-features';

// ============================================================================
// Types
// ============================================================================

interface RaterDemographicsPanelProps {
  allScanners: DemographicsResult | null;
  verifiedDrinkers: DemographicsResult | null;
  userTier?: UserTier;
  isLoading?: boolean;
}

type ViewMode = 'all' | 'verified';

// ============================================================================
// Constants
// ============================================================================

const AGE_LABELS: Record<AgeGroup, string> = {
  '18-25': '18–25',
  '26-35': '26–35',
  '36-50': '36–50',
  '50+': '50+',
  unknown: 'Unbekannt',
};

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  newcomer: 'Einsteiger',
  experienced: 'Fortgeschritten',
  expert: 'Experte',
  anonymous: 'Anonym',
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  casual: 'Gelegenheitstrinker',
  explorer: 'Entdecker',
  enthusiast: 'Enthusiast',
  anonymous: 'Anonym',
};

const DONUT_COLORS = [
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#6b7280', // zinc-500
];

const LOCKED_COLOR = '#3f3f46'; // zinc-700

// ============================================================================
// Helpers
// ============================================================================

function buildPieData<K extends string>(
  record: Record<K, number>,
  labels: Record<K, string>,
): { name: string; value: number; isSmall: boolean }[] {
  return (Object.entries(record) as [K, number][])
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => ({
      name: labels[k] ?? k,
      value: v === -1 ? 1 : v,
      isSmall: v === -1,
      rawValue: v,
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, rawValue } = payload[0].payload;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white shadow-lg">
      <span className="font-semibold">{name}:</span>{' '}
      {rawValue === -1 ? (
        <span className="text-zinc-400">&lt; 5 (zu wenige Daten)</span>
      ) : (
        <span>{rawValue}</span>
      )}
    </div>
  );
};

// ============================================================================
// Sub-component: Donut Chart section
// ============================================================================

function DonutSection<K extends string>({
  title,
  record,
  labels,
}: {
  title: string;
  record: Record<K, number>;
  labels: Record<K, string>;
}) {
  const data = buildPieData(record, labels);
  const total = (Object.values(record) as number[]).reduce((s: number, v) => s + (v > 0 ? v : 0), 0);

  return (
    <div className="flex flex-col items-center gap-2">
      <h4 className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{title}</h4>
      {total === 0 ? (
        <div className="h-28 flex items-center justify-center text-zinc-600 text-xs italic">Nicht genug Daten</div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={58}
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isSmall ? LOCKED_COLOR : DONUT_COLORS[i % DONUT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-[10px] text-zinc-400">{value}</span>}
              iconSize={8}
              wrapperStyle={{ fontSize: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function RaterDemographicsPanel({
  allScanners,
  verifiedDrinkers,
  userTier = 'free',
  isLoading = false,
}: RaterDemographicsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const isLocked = userTier === 'free' || userTier === 'brewer';
  const current = viewMode === 'all' ? allScanners : verifiedDrinkers;

  // ---- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="bg-black border border-zinc-800 rounded-lg p-6 animate-pulse">
        <div className="h-4 w-48 bg-zinc-800 rounded mb-6" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-40 bg-zinc-900 rounded" />)}
        </div>
      </div>
    );
  }

  // ---- Tier lock ---
  if (isLocked) {
    return (
      <div className="relative bg-black border border-zinc-800 rounded-lg p-6 overflow-hidden">
        {/* Blurred preview */}
        <div className="blur-sm pointer-events-none select-none">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Wer trinkt dein Bier?</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['Altersgruppen', 'Erfahrung', 'Aktivität'].map(t => (
              <div key={t} className="flex flex-col items-center gap-2">
                <div className="text-zinc-500 text-xs uppercase tracking-wider">{t}</div>
                <div className="w-24 h-24 rounded-full border-8 border-zinc-800 bg-zinc-900/50" />
              </div>
            ))}
          </div>
        </div>
        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
          <Lock size={22} className="text-violet-400" />
          <p className="text-sm font-medium text-zinc-300">Verfügbar ab Brewery-Plan</p>
          <p className="text-xs text-zinc-500 text-center max-w-xs">
            Erfahre, wer dein Bier wirklich trinkt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black border border-zinc-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Wer trinkt dein Bier?</h3>
          {/* Privacy tooltip */}
          <div className="group relative">
            <Info size={13} className="text-zinc-600 cursor-help hover:text-zinc-400 transition" />
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-900 border border-zinc-700 rounded p-2 text-[10px] text-zinc-400 shadow-lg opacity-0 group-hover:opacity-100 transition z-10">
              Zeigt nur aggregierte Gruppen. Individuelle Nutzer sind nicht identifizierbar. Nutzer mit aktivem Analytics-Opt-out werden nicht berücksichtigt.
            </div>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center text-xs bg-zinc-900 border border-zinc-800 rounded-md p-0.5 self-start sm:self-auto">
          {(['all', 'verified'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded transition ${
                viewMode === mode
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {mode === 'all' ? 'Alle Scanner' : 'Verified Drinkers'}
            </button>
          ))}
        </div>
      </div>

      {/* Datenbasis info */}
      <p className="text-[10px] text-zinc-600 mb-5">
        Datenbasis: nur eingeloggte Nutzer ohne Analytics-Opt-out
        {current && (
          <>
            {' '}·{' '}
            <span className="text-zinc-500">{current.totalProfilesAnalyzed} Profile analysiert</span>
            {current.anonymousScans > 0 && (
              <>
                {' '}·{' '}
                <span className="text-zinc-600">{current.anonymousScans} anonyme Scans (nicht dargestellt)</span>
              </>
            )}
          </>
        )}
      </p>

      {/* No data state */}
      {!current || current.totalProfilesAnalyzed === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-600 text-sm italic border border-dashed border-zinc-800 rounded-lg">
          Noch nicht genug eingeloggte Besucher für eine demografische Auswertung.
        </div>
      ) : (
        <>
          {/* Donut charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <DonutSection
              title="Altersgruppen"
              record={current.ageGroups}
              labels={AGE_LABELS}
            />
            <DonutSection
              title="Erfahrungslevel"
              record={current.experienceLevels}
              labels={EXPERIENCE_LABELS}
            />
            <DonutSection
              title="Aktivitätsgrad"
              record={current.activityLevels}
              labels={ACTIVITY_LABELS}
            />
          </div>

          {/* Top locations */}
          {current.topLocations.length > 0 && (
            <div className="border-t border-zinc-800/60 pt-4">
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin size={12} className="text-zinc-500" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Top Locations</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {current.topLocations.map(({ location, count }) => (
                  <span
                    key={location}
                    className="bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-xs text-zinc-300 flex items-center gap-1.5"
                  >
                    <span className="capitalize">{location}</span>
                    <span className="text-zinc-600 font-mono text-[10px]">
                      {count === -1 ? '< 5' : count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
