'use client';

// ============================================================================
// Phase 12.3 — Bounties Client (Brewer Dashboard)
// ============================================================================

import React, { useState, useTransition } from 'react';
import {
  createBounty,
  toggleBountyActive,
  type BrewerBounty,
  type CreateBountyInput,
  type RewardType,
  type ConditionType,
} from '@/lib/actions/bounty-actions';
import { formatCondition, formatRewardType } from '@/lib/bounty-utils';

interface Props {
  breweryId: string;
  bounties: BrewerBounty[];
  brews: { id: string; name: string }[];
  canManage: boolean;
}

const REWARD_OPTIONS: { value: RewardType; label: string }[] = [
  { value: 'free_beer', label: '🍺 Freibier' },
  { value: 'discount', label: '💰 Rabatt-Code' },
  { value: 'merchandise', label: '👕 Merchandise' },
  { value: 'other', label: '🎁 Sonstiges' },
];

const CONDITION_OPTIONS: { value: ConditionType; label: string; hasValue: boolean }[] = [
  { value: 'match_score', label: 'Beat the Brewer Match Score >', hasValue: true },
  { value: 'rating_count', label: 'Anzahl Bewertungen >=', hasValue: true },
  { value: 'vibe_check', label: 'Vibe Check abgeben', hasValue: false },
];

const DEFAULT_FORM: CreateBountyInput = {
  brewId: null,
  title: '',
  description: '',
  rewardType: 'free_beer',
  rewardValue: '',
  rewardCode: '',
  conditionType: 'match_score',
  conditionValue: 90,
  maxClaims: null,
  expiresAt: null,
};

export default function BountiesClient({ breweryId, bounties: initial, brews, canManage }: Props) {
  const [bounties, setBounties] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateBountyInput>(DEFAULT_FORM);
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  function handleField<K extends keyof CreateBountyInput>(key: K, value: CreateBountyInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    startTransition(async () => {
      const result = await createBounty(breweryId, form);
      if (!result.success) {
        setCreateError(result.error ?? 'Fehler beim Erstellen');
        return;
      }
      // Reload bounties
      const { getBreweryBounties } = await import('@/lib/actions/bounty-actions');
      const updated = await getBreweryBounties(breweryId);
      setBounties(updated);
      setShowCreate(false);
      setForm(DEFAULT_FORM);
    });
  }

  async function handleToggle(bountyId: string, currentActive: boolean) {
    await toggleBountyActive(bountyId, !currentActive);
    setBounties((prev) =>
      prev.map((b) => (b.id === bountyId ? { ...b, isActive: !currentActive } : b)),
    );
  }

  const selectedCondition = CONDITION_OPTIONS.find((c) => c.value === form.conditionType)!;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-black tracking-[0.3em] text-amber-500">
            Brewer Dashboard
          </p>
          <h1 className="text-3xl font-black text-white">Bounties</h1>
          <p className="text-sm text-zinc-500">
            Erstelle Challenges und belohne die besten Taster mit echten Rewards.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm rounded-xl px-4 py-2.5 transition-all"
          >
            + Neue Bounty
          </button>
        )}
      </div>

      {/* Create form modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-white mb-5">Neue Bounty erstellen</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Brew selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Bier (optional)</label>
                <select
                  value={form.brewId ?? ''}
                  onChange={(e) => handleField('brewId', e.target.value || null)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm px-3 py-2.5"
                >
                  <option value="">Alle Biere</option>
                  {brews.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Titel *</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => handleField('title', e.target.value)}
                  placeholder="z.B. Imperial Stout Meister"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm px-3 py-2.5 placeholder-zinc-600"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Beschreibung *</label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={(e) => handleField('description', e.target.value)}
                  placeholder="Triff einen Match von > 90% beim Imperial Stout..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm px-3 py-2.5 placeholder-zinc-600 resize-none"
                />
              </div>

              {/* Condition */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Bedingung *</label>
                  <select
                    value={form.conditionType}
                    onChange={(e) => handleField('conditionType', e.target.value as ConditionType)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm px-3 py-2.5"
                  >
                    {CONDITION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {selectedCondition.hasValue && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Wert *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={form.conditionValue}
                      onChange={(e) => handleField('conditionValue', Number(e.target.value))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm px-3 py-2.5"
                    />
                  </div>
                )}
              </div>

              {/* Reward */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Reward-Typ *</label>
                  <select
                    value={form.rewardType}
                    onChange={(e) => handleField('rewardType', e.target.value as RewardType)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm px-3 py-2.5"
                  >
                    {REWARD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Reward-Beschreibung *</label>
                  <input
                    type="text"
                    required
                    value={form.rewardValue}
                    onChange={(e) => handleField('rewardValue', e.target.value)}
                    placeholder="z.B. 10 Pints Freibier"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm px-3 py-2.5 placeholder-zinc-600"
                  />
                </div>
              </div>

              {/* Reward code */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Reward-Code (optional)</label>
                <input
                  type="text"
                  value={form.rewardCode ?? ''}
                  onChange={(e) => handleField('rewardCode', e.target.value || null)}
                  placeholder="z.B. FREEBEER2026"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm px-3 py-2.5 placeholder-zinc-600"
                />
              </div>

              {/* Max claims + expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Max. Einlösungen</label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxClaims ?? ''}
                    onChange={(e) => handleField('maxClaims', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Unbegrenzt"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm px-3 py-2.5 placeholder-zinc-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Ablaufdatum</label>
                  <input
                    type="date"
                    value={form.expiresAt ? form.expiresAt.split('T')[0] : ''}
                    onChange={(e) => handleField('expiresAt', e.target.value ? `${e.target.value}T23:59:59Z` : null)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm px-3 py-2.5"
                  />
                </div>
              </div>

              {createError && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-4 py-2">
                  {createError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 border border-zinc-700 text-zinc-300 rounded-xl py-2.5 text-sm font-medium hover:border-zinc-500 transition-all"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl py-2.5 text-sm transition-all disabled:opacity-50"
                >
                  {isPending ? 'Erstelle…' : 'Bounty erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bounties list */}
      {bounties.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <span className="text-5xl">🏹</span>
          <p className="text-white font-bold">Noch keine Bounties</p>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto">
            Erstelle eine Bounty und belohne Taster, die deine Biere am besten kennen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bounties.map((bounty) => (
            <BountyCard
              key={bounty.id}
              bounty={bounty}
              canManage={canManage}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bounty Card (brewer view) ────────────────────────────────────────────────
function BountyCard({
  bounty,
  canManage,
  onToggle,
}: {
  bounty: BrewerBounty;
  canManage: boolean;
  onToggle: (id: string, current: boolean) => void;
}) {
  const expired = bounty.expiresAt && new Date(bounty.expiresAt) < new Date();
  const full = bounty.maxClaims !== null && bounty.claimCount >= bounty.maxClaims;

  return (
    <div className={`bg-zinc-900 border rounded-2xl p-5 space-y-3 ${bounty.isActive && !expired && !full ? 'border-amber-800/50' : 'border-zinc-800 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
              {formatRewardType(bounty.rewardType)}
            </span>
            {bounty.brewName && (
              <span className="text-[10px] text-zinc-600">für {bounty.brewName}</span>
            )}
            {expired && <span className="text-[10px] text-red-500 font-bold">ABGELAUFEN</span>}
            {full && <span className="text-[10px] text-zinc-500 font-bold">AUSGESCHÖPFT</span>}
          </div>
          <h3 className="text-base font-black text-white">{bounty.title}</h3>
          <p className="text-sm text-zinc-400">{bounty.description}</p>
        </div>
        {canManage && (
          <button
            onClick={() => onToggle(bounty.id, bounty.isActive)}
            className={`flex-shrink-0 text-xs font-bold rounded-full px-3 py-1.5 border transition-all ${
              bounty.isActive
                ? 'border-green-800 text-green-400 hover:bg-green-900/20'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
            }`}
          >
            {bounty.isActive ? 'Aktiv' : 'Inaktiv'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
        <span>🎯 {formatCondition(bounty.conditionType, bounty.conditionValue)}</span>
        <span>🎁 {bounty.rewardValue}</span>
        <span>
          📊 {bounty.claimCount}{bounty.maxClaims ? `/${bounty.maxClaims}` : ''} Einlösungen
        </span>
        {bounty.expiresAt && (
          <span>
            ⏰ bis {new Date(bounty.expiresAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}
