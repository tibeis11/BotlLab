'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, CheckCheck, X, RefreshCw, Wheat, Hop, FlaskConical, Clock, GitMerge, Ban } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import type { ImportQueueItem, QueueStats } from '@/lib/types/ingredients';
import {
  getIngredientQueueItems,
  getQueueStats,
  rejectQueueItem,
  getIngredientUsageStats,
  type IngredientUsageStat,
} from '@/lib/actions/admin-ingredient-actions';
import ImportQueueCard from './components/ImportQueueCard';
import MergeIngredientModal from './components/MergeIngredientModal';

type StatusTab = 'pending' | 'merged' | 'rejected' | 'stats';
type TypeFilter = 'all' | 'malt' | 'hop' | 'yeast' | 'misc';

const TYPE_FILTERS: { value: TypeFilter; label: string; Icon: React.ElementType }[] = [
  { value: 'all',   label: 'Alle',    Icon: Package },
  { value: 'malt',  label: 'Malz',    Icon: Wheat },
  { value: 'hop',   label: 'Hopfen',  Icon: Hop },
  { value: 'yeast', label: 'Hefe',    Icon: FlaskConical },
  { value: 'misc',  label: 'Sonstig', Icon: Package },
];

// ── Ablehnen-Bestätigung (Inline-Modal) ───────────────────────────────────────

function RejectConfirmModal({
  item,
  onConfirm,
  onClose,
}: {
  item: ImportQueueItem;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('Kein echter Zutat-Eintrag / Duplikat');

  const REASONS = [
    'Kein echter Zutat-Eintrag / Duplikat',
    'Zu generisch (z.B. "Malz", "Hopfen")',
    'Fehlerhafter Import / Encoding-Fehler',
    'Spam',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-(--surface) border border-(--border-hover) rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold text-(--text-primary) flex items-center gap-2">
          <X className="text-red-400" />
          Eintrag ablehnen
        </h3>
        <p className="text-sm text-(--text-muted)">
          „<span className="text-(--text-primary) font-medium">{item.raw_name}</span>" wird abgelehnt.
        </p>

        <div className="space-y-2">
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${
                reason === r
                  ? 'bg-red-500/10 border-red-500 text-(--text-primary)'
                  : 'border-(--border) text-(--text-secondary) hover:bg-(--surface-hover)'
              }`}
            >
              {r}
            </button>
          ))}
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Anderer Grund..."
            className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-(--border-hover) text-(--text-secondary) hover:bg-(--surface-hover) transition text-sm"
          >
            Abbrechen
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-950/20 text-red-400 border border-red-900/30 hover:bg-red-900/30 font-semibold text-sm transition"
          >
            Ablehnen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Haupt-View ────────────────────────────────────────────────────────────────

export default function IngredientsQueueView() {
  const [activeTab, setActiveTab] = useState<StatusTab>('pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [items, setItems] = useState<ImportQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Analytics state
  const [usageStats, setUsageStats] = useState<IngredientUsageStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Modal-State
  const [mergeTarget, setMergeTarget] = useState<ImportQueueItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ImportQueueItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    if (activeTab === 'stats') return;
    setLoading(true);
    try {
      const [queueResult, queueStats] = await Promise.all([
        getIngredientQueueItems({
          status:   activeTab,
          type:     typeFilter === 'all' ? undefined : typeFilter,
          page,
          pageSize: PAGE_SIZE,
        }),
        getQueueStats(),
      ]);
      setItems(queueResult.items);
      setTotal(queueResult.total);
      setStats(queueStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Tab/Filter-Wechsel: immer auf Seite 1 zurückspringen
  function handleTabChange(tab: StatusTab) {
    setActiveTab(tab);
    setPage(1);
    if (tab === 'stats' && usageStats.length === 0) {
      setStatsLoading(true);
      getIngredientUsageStats(50).then(data => {
        setUsageStats(data);
        setStatsLoading(false);
      }).catch(() => setStatsLoading(false));
    }
  }
  function handleTypeChange(type: TypeFilter) {
    setTypeFilter(type);
    setPage(1);
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    setProcessing(rejectTarget.id);
    setRejectTarget(null);
    try {
      await rejectQueueItem(rejectTarget.id, reason);
      setItems(prev => prev.filter(i => i.id !== rejectTarget.id));
      setStats(prev => prev ? { ...prev, pending: Math.max(0, prev.pending - 1), rejected: prev.rejected + 1 } : prev);
      showSuccess('Eintrag abgelehnt.');
    } catch {
      showSuccess('Fehler beim Ablehnen.'); // Wiederverwendung für Einfachheit
    } finally {
      setProcessing(null);
    }
  }

  function handleMergeSuccess(itemId: string, recipesUpdated: number) {
    setMergeTarget(null);
    setItems(prev => prev.filter(i => i.id !== itemId));
    setStats(prev => prev ? { ...prev, pending: Math.max(0, prev.pending - 1), merged: prev.merged + 1 } : prev);
    showSuccess(`Zusammengeführt! ${recipesUpdated > 0 ? `${recipesUpdated} Rezept${recipesUpdated !== 1 ? 'e' : ''} aktualisiert.` : ''}`);
  }

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">

      {/* Titel + Refresh */}
      <div className="flex items-center justify-between pb-4 border-b border-(--border)">
        <h2 className="text-xl font-bold text-(--text-primary) flex items-center gap-2">
          <Package className="w-5 h-5" />
          Zutaten-Import-Queue
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-(--text-secondary) hover:text-(--text-primary) border border-(--border) rounded-lg hover:bg-(--surface-hover) transition disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {/* Metriken */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Ausstehend"
          value={stats?.pending ?? '—'}
          icon={<Clock className="w-5 h-5" />}
          loading={!stats}
        />
        <MetricCard
          title="Zusammengeführt"
          value={stats?.merged ?? '—'}
          icon={<GitMerge className="w-5 h-5" />}
          loading={!stats}
        />
        <MetricCard
          title="Abgelehnt"
          value={stats?.rejected ?? '—'}
          icon={<Ban className="w-5 h-5" />}
          loading={!stats}
        />
      </div>

      {/* Erfolgs-Toast */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-400">
          <CheckCheck className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Status-Tabs */}
      <div className="flex gap-1 bg-(--surface-sunken) p-1 rounded-xl w-fit flex-wrap">
        {(['pending', 'merged', 'rejected', 'stats'] as StatusTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-(--surface) text-(--text-primary) shadow-sm'
                : 'text-(--text-muted) hover:text-(--text-secondary)'
            }`}
          >
            {tab === 'pending'  && `Ausstehend ${stats ? `(${stats.pending})` : ''}`}
            {tab === 'merged'   && `Zusammengeführt ${stats ? `(${stats.merged})` : ''}`}
            {tab === 'rejected' && `Abgelehnt ${stats ? `(${stats.rejected})` : ''}`}
            {tab === 'stats'    && 'Beliebteste Zutaten'}
          </button>
        ))}
      </div>

      {/* Beliebteste Zutaten — Analytics Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-12 bg-(--surface-sunken) rounded-xl animate-pulse" />
              ))}
            </div>
          ) : usageStats.length === 0 ? (
            <p className="text-sm text-(--text-muted) py-8 text-center">Keine Daten verfügbar.</p>
          ) : (
            <div className="space-y-1">
              {usageStats.map((s, i) => {
                const typeIcon = s.type === 'malt' ? '🌾' : s.type === 'hop' ? '🌿' : s.type === 'yeast' ? '🧫' : '⚗️';
                const maxCount = usageStats[0]?.usage_count || 1;
                const pct = Math.round((s.usage_count / maxCount) * 100);
                return (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-(--surface-hover) transition group">
                    <span className="text-xs text-(--text-disabled) w-5 text-right shrink-0">{i + 1}</span>
                    <span className="text-base shrink-0">{typeIcon}</span>
                    <span className="flex-1 text-sm text-(--text-primary) truncate font-medium">{s.name}</span>
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <div className="w-24 h-1.5 bg-(--surface-sunken) rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-(--text-muted) w-12 text-right">
                        {s.usage_count}×
                      </span>
                      <span className="text-xs text-(--text-disabled) w-16 text-right">
                        {s.recipe_count} Rez.
                      </span>
                    </div>
                    <div className="flex sm:hidden text-xs text-(--text-muted)">{s.usage_count}×</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Typ-Filter + Liste (nur für Queue-Tabs) */}
      {activeTab !== 'stats' && <>
      <div className="flex gap-2 flex-wrap">
        {TYPE_FILTERS.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => handleTypeChange(value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition ${
              typeFilter === value
                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                : 'border-(--border) text-(--text-muted) hover:text-(--text-secondary) hover:bg-(--surface-hover)'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {value !== 'all' && stats && activeTab === 'pending' && (
              <span className="text-[10px] font-mono opacity-70">
                {(stats.byType as Record<string, number>)[value] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-(--surface-sunken) rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-4 text-center border border-dashed border-(--border) rounded-2xl bg-zinc-950/50">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
            <CheckCheck className="w-6 h-6 text-zinc-500" />
          </div>
          <div>
            <p className="text-zinc-500 font-medium text-sm">Keine Einträge</p>
            <p className="text-zinc-700 text-xs max-w-xs mx-auto mt-1">
              {activeTab === 'pending'
                ? 'Alle Zutaten in der Queue wurden bearbeitet.'
                : 'Keine Einträge in dieser Kategorie.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map(item => (
              <ImportQueueCard
                key={item.id}
                item={item}
                onMerge={setMergeTarget}
                onReject={setRejectTarget}
                processing={processing === item.id}
              />
            ))}
          </div>

          {/* Paginierung */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-(--border)">
              <p className="text-sm text-(--text-muted)">{total} Einträge gesamt</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-(--border) text-sm text-(--text-secondary) hover:bg-(--surface-hover) disabled:opacity-40 transition"
                >
                  ← Zurück
                </button>
                <span className="px-3 py-1.5 text-sm text-(--text-muted)">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-(--border) text-sm text-(--text-secondary) hover:bg-(--surface-hover) disabled:opacity-40 transition"
                >
                  Weiter →
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </>}

      {/* Modals */}
      {mergeTarget && (
        <MergeIngredientModal
          item={mergeTarget}
          onClose={() => setMergeTarget(null)}
          onSuccess={handleMergeSuccess}
        />
      )}

      {rejectTarget && (
        <RejectConfirmModal
          item={rejectTarget}
          onConfirm={handleRejectConfirm}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
