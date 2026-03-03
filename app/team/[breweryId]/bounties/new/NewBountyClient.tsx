'use client';

// ============================================================================
// Phase 12.3 — Create Bounty Client Page
// ============================================================================

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Trophy, Target, Zap, Star,
  Clock, Hash, ChevronRight, Tag,
} from 'lucide-react';
import {
  createBounty,
  type CreateBountyInput,
  type RewardType,
  type ConditionType,
} from '@/lib/actions/bounty-actions';

interface Props {
  breweryId: string;
  brews: { id: string; name: string }[];
}

const REWARD_OPTIONS: { value: RewardType; label: string; icon: string; desc: string }[] = [
  { value: 'free_beer', label: 'Freibier',   icon: '🍺', desc: 'Gratis Bier' },
  { value: 'discount',  label: 'Rabatt',     icon: '💰', desc: 'Rabatt-Code' },
  { value: 'merchandise', label: 'Merch',    icon: '👕', desc: 'Merchandise' },
  { value: 'other',     label: 'Sonstiges',  icon: '🎁', desc: 'Eigener Reward' },
];

const CONDITION_OPTIONS: {
  value: ConditionType;
  label: string;
  desc: string;
  hasValue: boolean;
  icon: React.ReactNode;
}[] = [
  { value: 'match_score',  label: 'Match Score',  desc: 'Beat the Brewer Score erreichen', hasValue: true,  icon: <Target className="w-4 h-4" /> },
  { value: 'rating_count', label: 'Bewertungen',  desc: 'Anzahl Bewertungen abgeben',       hasValue: true,  icon: <Star   className="w-4 h-4" /> },
  { value: 'vibe_check',   label: 'Vibe Check',   desc: 'Einen Vibe Check abgeben',         hasValue: false, icon: <Zap    className="w-4 h-4" /> },
];

const DEFAULT_FORM: CreateBountyInput = {
  brewId: null,
  title: '',
  description: '',
  rewardType: 'free_beer',
  rewardValue: '',
  rewardCode: null,
  conditionType: 'match_score',
  conditionValue: 90,
  maxClaims: null,
  expiresAt: null,
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">{label}</p>
      {children}
    </section>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        {label}
        {optional && <span className="text-zinc-700 font-normal normal-case tracking-normal">optional</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = 'w-full bg-black border border-zinc-800 rounded-lg px-3 py-3 text-white text-sm focus:border-zinc-600 focus:outline-none transition-colors placeholder:text-zinc-700';

export default function NewBountyClient({ breweryId, brews }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CreateBountyInput>(DEFAULT_FORM);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CreateBountyInput>(key: K, value: CreateBountyInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const selectedCondition = CONDITION_OPTIONS.find(c => c.value === form.conditionType)!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBounty(breweryId, form);
      if (!result.success) {
        setError(result.error ?? 'Fehler beim Erstellen');
        return;
      }
      router.push(`/team/${breweryId}/bounties`);
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* PAGE HEADER */}
      <header className="space-y-4 border-b border-zinc-900 pb-6">
        <Link
          href={`/team/${breweryId}/bounties`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Zurück zu Bounties
        </Link>
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Neue Bounty</h1>
          </div>
          <p className="text-sm text-zinc-500">Definiere eine Challenge und belohne die besten Taster mit einem echten Reward.</p>
        </div>
      </header>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* SECTION: Grundinfo */}
        <Section label="Grundinfo">
          <Field label="Titel">
            <input
              required
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="z.B. Imperial Stout Meister"
              className={INPUT}
            />
          </Field>
          <Field label="Beschreibung">
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Triff einen Match-Score von über 90% beim Imperial Stout..."
              className={`${INPUT} resize-none`}
            />
          </Field>
          <Field label="Bier" optional>
            <div className="relative">
              <select
                value={form.brewId ?? ''}
                onChange={e => set('brewId', e.target.value || null)}
                className={`${INPUT} appearance-none`}
              >
                <option value="">Alle Biere</option>
                {brews.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 rotate-90 pointer-events-none" />
            </div>
          </Field>
        </Section>

        <div className="border-t border-zinc-800/50" />

        {/* SECTION: Bedingung */}
        <Section label="Bedingung">
          <div className="grid grid-cols-3 gap-3">
            {CONDITION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('conditionType', opt.value)}
                className={`flex flex-col items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  form.conditionType === opt.value
                    ? 'bg-zinc-900 border-cyan-500/50 text-white'
                    : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  form.conditionType === opt.value ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-600'
                }`}>
                  {opt.icon}
                </div>
                <div>
                  <div className="text-xs font-bold leading-none mb-1">{opt.label}</div>
                  <div className="text-[10px] text-zinc-600 leading-tight">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {selectedCondition.hasValue && (
            <Field label={`${selectedCondition.label} >`}>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={form.conditionValue}
                  onChange={e => set('conditionValue', Number(e.target.value))}
                  className={`${INPUT} font-mono pr-20`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                  {form.conditionType === 'match_score' ? '% Match' : 'Stück'}
                </span>
              </div>
            </Field>
          )}
        </Section>

        <div className="border-t border-zinc-800/50" />

        {/* SECTION: Reward */}
        <Section label="Reward">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {REWARD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('rewardType', opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                  form.rewardType === opt.value
                    ? 'bg-zinc-900 border-amber-500/50 text-white'
                    : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-[11px] font-bold leading-none">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Reward-Beschreibung">
              <input
                type="text"
                required
                value={form.rewardValue}
                onChange={e => set('rewardValue', e.target.value)}
                placeholder="z.B. 10 Pints Freibier"
                className={INPUT}
              />
            </Field>
            <Field label="Einlöse-Code" optional>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700 pointer-events-none" />
                <input
                  type="text"
                  value={form.rewardCode ?? ''}
                  onChange={e => set('rewardCode', e.target.value || null)}
                  placeholder="FREEBEER2026"
                  className={`${INPUT} pl-9 font-mono uppercase`}
                />
              </div>
            </Field>
          </div>
        </Section>

        <div className="border-t border-zinc-800/50" />

        {/* SECTION: Limits */}
        <Section label="Limits">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Max. Einlösungen" optional>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700 pointer-events-none" />
                <input
                  type="number"
                  min={1}
                  value={form.maxClaims ?? ''}
                  onChange={e => set('maxClaims', e.target.value ? Number(e.target.value) : null)}
                  placeholder="Unbegrenzt"
                  className={`${INPUT} pl-9 font-mono`}
                />
              </div>
            </Field>
            <Field label="Ablaufdatum" optional>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700 pointer-events-none" />
                <input
                  type="date"
                  value={form.expiresAt ? form.expiresAt.split('T')[0] : ''}
                  onChange={e => set('expiresAt', e.target.value ? `${e.target.value}T23:59:59Z` : null)}
                  className={`${INPUT} pl-9 [color-scheme:dark]`}
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* ERROR */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {/* ACTIONS — sticky on mobile, inline on desktop */}
        <div className="fixed sm:relative bottom-0 left-0 right-0 sm:bottom-auto p-4 sm:p-0 bg-black/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none border-t border-zinc-900 sm:border-none z-30 flex gap-3">
          <Link
            href={`/team/${breweryId}/bounties`}
            className="flex-1 sm:flex-none border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg py-3 sm:py-2.5 px-6 text-sm font-bold transition-all text-center"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 sm:flex-none bg-white hover:bg-zinc-100 text-black font-bold rounded-lg py-3 sm:py-2.5 px-8 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Erstelle…
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Bounty erstellen
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
