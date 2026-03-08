'use client';

// ============================================================================
// Phase 12.3 — Create Bounty Client Page
// ============================================================================

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Trophy, Target, Zap, Star,
  Clock, Hash, ChevronRight, Tag, Beer, Percent, Package, Gift, AlertCircle,
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

const REWARD_OPTIONS: { value: RewardType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'free_beer',   label: 'Freibier',  icon: <Beer    className="w-5 h-5" />, desc: 'Gratis Bier' },
  { value: 'discount',   label: 'Rabatt',    icon: <Percent className="w-5 h-5" />, desc: 'Rabatt-Code' },
  { value: 'merchandise', label: 'Merch',    icon: <Package className="w-5 h-5" />, desc: 'Merchandise' },
  { value: 'other',      label: 'Sonstiges', icon: <Gift    className="w-5 h-5" />, desc: 'Eigener Reward' },
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
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-disabled">{label}</p>
      {children}
    </section>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-[10px] font-bold text-text-disabled uppercase tracking-wider">
        {label}
        {optional && <span className="text-text-disabled/60 font-normal normal-case tracking-normal">optional</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = 'w-full bg-surface/60 border border-border rounded-lg px-3 py-3 text-text-primary text-sm focus:border-border-hover focus:outline-none transition-colors placeholder:text-text-disabled';

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
      <header className="space-y-4 border-b border-border-subtle pb-6">
        <Link
          href={`/team/${breweryId}/bounties`}
          className="inline-flex items-center gap-1.5 text-xs text-text-disabled hover:text-text-secondary transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Zurück zu Bounties
        </Link>
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Neue Bounty</h1>
          </div>
          <p className="text-sm text-text-muted">Definiere eine Challenge und belohne die besten Taster mit einem echten Reward.</p>
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
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled rotate-90 pointer-events-none" />
            </div>
          </Field>
        </Section>

        <div className="border-t border-border/50" />

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
                    ? 'bg-surface border-brand/50 text-text-primary'
                    : 'bg-surface/30 border-border text-text-disabled hover:border-border-hover hover:text-text-secondary'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  form.conditionType === opt.value ? 'bg-brand/20 text-brand' : 'bg-surface-hover text-text-disabled'
                }`}>
                  {opt.icon}
                </div>
                <div>
                  <div className="text-xs font-bold leading-none mb-1">{opt.label}</div>
                  <div className="text-[10px] text-text-disabled leading-tight">{opt.desc}</div>
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-disabled uppercase tracking-wider">
                  {form.conditionType === 'match_score' ? '% Match' : 'Stück'}
                </span>
              </div>
            </Field>
          )}
        </Section>

        <div className="border-t border-border/50" />

        {/* SECTION: Reward */}
        <Section label="Reward">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {REWARD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('rewardType', opt.value)}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all ${
                  form.rewardType === opt.value
                    ? 'bg-surface border-warning/50 text-text-primary'
                    : 'bg-surface/30 border-border text-text-disabled hover:border-border-hover hover:text-text-secondary'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  form.rewardType === opt.value ? 'bg-warning/20 text-warning' : 'bg-surface-hover text-text-disabled'
                }`}>
                  {opt.icon}
                </div>
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
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled pointer-events-none" />
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

        <div className="border-t border-border/50" />

        {/* SECTION: Limits */}
        <Section label="Limits">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Max. Einlösungen" optional>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled pointer-events-none" />
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
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled pointer-events-none" />
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
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ACTIONS — sticky on mobile, inline on desktop */}
        <div className="fixed sm:relative bottom-0 left-0 right-0 sm:bottom-auto p-4 sm:p-0 bg-background/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none border-t border-border-subtle sm:border-none z-30 flex gap-3">
          <Link
            href={`/team/${breweryId}/bounties`}
            className="flex-1 sm:flex-none border border-border hover:border-border-hover text-text-muted hover:text-text-primary rounded-lg py-3 sm:py-2.5 px-6 text-sm font-bold transition-all text-center"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 sm:flex-none bg-white hover:opacity-90 text-black font-bold rounded-lg py-3 sm:py-2.5 px-8 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
