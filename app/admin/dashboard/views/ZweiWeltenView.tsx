'use client'

import { useState } from 'react'
import {
  previewUserClassification,
  runUserClassification,
  getEmptyBreweries,
  previewRatingsBackfill,
  runRatingsBackfill,
  type ClassificationPreview,
  type EmptyBrewery,
  type BackfillPreview,
} from '@/lib/actions/zwei-welten-admin-actions'
import { Users, Factory, Star, TriangleAlert, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ label, color }: { label: string; color: 'amber' | 'emerald' | 'red' | 'zinc' }) {
  const styles = {
    amber:   'bg-amber-950/30 text-amber-400 border-amber-800/40',
    emerald: 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40',
    red:     'bg-red-950/30 text-red-400 border-red-800/40',
    zinc:    'bg-zinc-800 text-zinc-400 border-zinc-700',
  }
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${styles[color]}`}>
      {label}
    </span>
  )
}

function SectionHeader({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-cyan-400">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h3 className="text-base font-bold text-white">{title}</h3>
      </div>
      {badge}
    </div>
  )
}

function StatItem({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
      <p className={`text-2xl font-black ${color ?? 'text-white'}`}>{value}</p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.1 — User-Klassifikation
// ─────────────────────────────────────────────────────────────────────────────
function ClassificationSection() {
  const [preview, setPreview] = useState<ClassificationPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function handlePreview() {
    setLoading(true)
    setError(null)
    setConfirmed(false)
    setResult(null)
    try {
      setPreview(await previewUserClassification())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRun() {
    if (!confirmed) { setConfirmed(true); return }
    setLoading(true)
    setError(null)
    try {
      const res = await runUserClassification()
      setResult(`✅ ${res.updatedCount} User wurden zu "brewer" klassifiziert.`)
      setPreview(null)
      setConfirmed(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <SectionHeader
        icon={Users}
        title="5.1 — User-Klassifikation"
        badge={<StatusBadge label="Hohes Risiko" color="amber" />}
      />

      <p className="text-sm text-zinc-400 mb-5 leading-relaxed max-w-2xl">
        Klassifiziert bestehende User basierend auf ihrer Brewery-Mitgliedschaft und Brau-Content.
        <strong className="text-white"> Niemals wird ein Brauer zu einem Drinker degradiert.</strong>{' '}
        Erst Preview laden, dann ausführen.
      </p>

      <div className="flex flex-wrap gap-3 mb-5">
        <button
          onClick={handlePreview}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Preview laden
        </button>
        {preview && preview.wouldBecomeBrewer > 0 && (
          <button
            onClick={handleRun}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition disabled:opacity-50 ${
              confirmed
                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                : 'bg-amber-900/50 hover:bg-amber-900 text-amber-400 border border-amber-800/50'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            {confirmed ? '⚠️ Nochmal klicken zum Bestätigen!' : 'Klassifikation ausführen'}
          </button>
        )}
      </div>

      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatItem value={preview.totalUsers}          label="Gesamt"         />
          <StatItem value={preview.alreadyBrewer}      label="Bereits Brauer" color="text-cyan-400" />
          <StatItem value={preview.wouldBecomeBrewer}  label="Wird Brauer"    color="text-amber-400" />
          <StatItem value={preview.stayDrinker}        label="Bleibt Drinker" color="text-zinc-400" />
        </div>
      )}

      {result && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-950/30 border border-emerald-800/30 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {result}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-3">
          <TriangleAlert className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.2 — Leere Brauereien
// ─────────────────────────────────────────────────────────────────────────────
function EmptyBreweriesSection() {
  const [breweries, setBreweries] = useState<EmptyBrewery[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLoad() {
    setLoading(true)
    setError(null)
    try {
      setBreweries(await getEmptyBreweries())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <SectionHeader
        icon={Factory}
        title="5.2 — Leere Brauereien"
        badge={<StatusBadge label="Nur Anzeige" color="zinc" />}
      />

      <p className="text-sm text-zinc-400 mb-5 max-w-2xl">
        Brauereien ohne einzigen Brew und ohne Flasche. Keine automatische Bereinigung —
        Admin entscheidet individuell. Direktlink zur Brauerei-Verwaltung wird angezeigt.
      </p>

      <button
        onClick={handleLoad}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50 mb-5"
      >
        <RefreshCw className="w-4 h-4" />
        {loading ? 'Lädt…' : 'Leere Brauereien laden'}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-3 mb-4">
          <TriangleAlert className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {breweries !== null && (
        breweries.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
            Keine leeren Brauereien gefunden! 🎉
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 mb-3">{breweries.length} leere Brauerei(en) gefunden:</p>
            {breweries.map((b) => (
              <div key={b.id} className="flex items-center gap-4 bg-zinc-800/40 border border-zinc-800 rounded-xl p-3">
                <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                  🏭
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{b.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    Mitglieder: {b.member_names.join(', ')} ·{' '}
                    Erstellt: {new Date(b.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div className="flex gap-2 text-[11px] text-zinc-600 flex-shrink-0">
                  <span>{b.brew_count} Rezepte</span>
                  <span>·</span>
                  <span>{b.bottle_count} Flaschen</span>
                </div>
                <a
                  href={`/brewery/${b.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-cyan-500 hover:text-cyan-300 transition underline flex-shrink-0"
                >
                  Öffnen →
                </a>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.3 — Ratings Backfill
// ─────────────────────────────────────────────────────────────────────────────
function RatingsBackfillSection() {
  const [preview, setPreview] = useState<BackfillPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function handlePreview() {
    setLoading(true)
    setError(null)
    setConfirmed(false)
    setResult(null)
    try {
      setPreview(await previewRatingsBackfill())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRun() {
    if (!confirmed) { setConfirmed(true); return }
    setLoading(true)
    setError(null)
    try {
      const res = await runRatingsBackfill()
      setResult(`✅ ${res.updatedCount} Ratings wurde eine user_id zugewiesen.`)
      setPreview(null)
      setConfirmed(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <SectionHeader
        icon={Star}
        title="5.3 — Ratings Backfill (user_id)"
        badge={<StatusBadge label="Konservativ" color="emerald" />}
      />

      <p className="text-sm text-zinc-400 mb-5 leading-relaxed max-w-2xl">
        Weist bestehenden anonymen Ratings nachträglich eine <code className="text-zinc-300 bg-zinc-800 px-1 rounded text-xs">user_id</code> zu,
        wenn der <code className="text-zinc-300 bg-zinc-800 px-1 rounded text-xs">author_name</code> eindeutig einem Profil-Namen entspricht.
        {' '}<strong className="text-white">Nur bei eindeutigem Match</strong> — kein falscher User wird zugeordnet.
      </p>

      <div className="flex flex-wrap gap-3 mb-5">
        <button
          onClick={handlePreview}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Preview laden
        </button>
        {preview && preview.wouldLink > 0 && (
          <button
            onClick={handleRun}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition disabled:opacity-50 ${
              confirmed
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                : 'bg-emerald-900/50 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/50'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            {confirmed ? '✅ Nochmal klicken zum Bestätigen!' : 'Backfill ausführen'}
          </button>
        )}
      </div>

      {preview && (
        <div className="grid grid-cols-2 gap-3 mb-4 max-w-sm">
          <StatItem value={preview.totalUnlinked} label="Ohne user_id"    />
          <StatItem value={preview.wouldLink}     label="Würde zugeordnet" color="text-emerald-400" />
        </div>
      )}

      {result && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-950/30 border border-emerald-800/30 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {result}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-3">
          <TriangleAlert className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────
export default function ZweiWeltenView() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Zwei Welten — Phase 5</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Altdaten-Migration: User-Klassifikation, leere Brauereien & Ratings-Backfill
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/30 rounded-xl px-3 py-2">
          <TriangleAlert className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">Zuerst im Staging testen!</span>
        </div>
      </div>

      <ClassificationSection />
      <EmptyBreweriesSection />
      <RatingsBackfillSection />
    </div>
  )
}
