'use client'

import { useState, useEffect, useRef } from 'react'
import BarChart from '../components/charts/BarChart'
import AdminCard from '../components/AdminCard'
import {
  getQualityScoreDistribution,
  getLowQualityBrews,
  getAdminBrewList,
  searchAdminBrews,
  getFeaturedBrewsAdmin,
  setTrendingScoreOverride,
  clearTrendingOverride,
  setBrewFeatured,
  type QualityBucket,
  type LowQualityBrew,
  type AdminBrewListItem,
} from '@/lib/actions/brew-admin-actions'
import { Star, AlertTriangle, ToggleLeft, ToggleRight, Search, X, Pin, PinOff } from 'lucide-react'

export default function ContentModerationView() {
  const [qualityDist, setQualityDist] = useState<QualityBucket[]>([])
  const [lowQualityBrews, setLowQualityBrews] = useState<LowQualityBrew[]>([])
  const [adminBrewList, setAdminBrewList] = useState<AdminBrewListItem[]>([])
  const [featuredBrews, setFeaturedBrews] = useState<AdminBrewListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [qualityThreshold, setQualityThreshold] = useState(40)
  const [brewSearch, setBrewSearch] = useState('')
  const [brewSearching, setBrewSearching] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [trendingOverrides, setTrendingOverrides] = useState<Record<string, string>>({})
  const [savingTrending, setSavingTrending] = useState<string | null>(null)
  const [clearingPin, setClearingPin] = useState<string | null>(null)
  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [qualityThreshold])

  async function loadData() {
    setLoading(true)
    try {
      const [dist, lowQ, brewList, featured] = await Promise.all([
        getQualityScoreDistribution(),
        getLowQualityBrews(qualityThreshold),
        getAdminBrewList(50),
        getFeaturedBrewsAdmin(),
      ])
      setQualityDist(dist)
      setLowQualityBrews(lowQ)
      setAdminBrewList(brewList)
      setFeaturedBrews(featured)
    } catch (error) {
      console.error('Failed to load admin brew data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleBrewSearchChange(value: string) {
    setBrewSearch(value)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    setBrewSearching(true)
    searchDebounce.current = setTimeout(async () => {
      try {
        const results = await searchAdminBrews(value, 50)
        setAdminBrewList(results)
      } catch (e) {
        console.error('Brew search failed:', e)
      } finally {
        setBrewSearching(false)
      }
    }, 400)
  }

  function clearBrewSearch() {
    setBrewSearch('')
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    setBrewSearching(true)
    getAdminBrewList(50)
      .then(setAdminBrewList)
      .catch(console.error)
      .finally(() => setBrewSearching(false))
  }

  async function handleTrendingOverride(brewId: string) {
    const raw = trendingOverrides[brewId]
    const score = parseFloat(raw)
    if (isNaN(score) || score < 0) return
    setSavingTrending(brewId)
    try {
      await setTrendingScoreOverride(brewId, score)
      setAdminBrewList(prev =>
        prev.map(b => b.id === brewId ? { ...b, trending_score: score, trending_score_override: score } : b)
      )
      setTrendingOverrides(prev => ({ ...prev, [brewId]: '' }))
    } catch (e) {
      console.error('Failed to set trending score:', e)
    } finally {
      setSavingTrending(null)
    }
  }

  async function handleClearPin(brewId: string) {
    setClearingPin(brewId)
    try {
      await clearTrendingOverride(brewId)
      setAdminBrewList(prev =>
        prev.map(b => b.id === brewId ? { ...b, trending_score_override: null } : b)
      )
    } catch (e) {
      console.error('Failed to clear trending pin:', e)
    } finally {
      setClearingPin(null)
    }
  }

  async function handleToggleFeatured(brew: AdminBrewListItem) {
    setTogglingFeatured(brew.id)
    const newFeatured = !brew.is_featured
    try {
      await setBrewFeatured(brew.id, newFeatured)
      setAdminBrewList(prev => prev.map(b => b.id === brew.id ? { ...b, is_featured: newFeatured } : b))
      if (newFeatured) {
        setFeaturedBrews(prev => [...prev, { ...brew, is_featured: true }])
      } else {
        setFeaturedBrews(prev => prev.filter(b => b.id !== brew.id))
      }
    } catch (e) {
      console.error('Failed to toggle featured:', e)
    } finally {
      setTogglingFeatured(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-(--brand) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-(--text-secondary)">Lade Content-Kontrolle...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
          <Star className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-(--text-primary)">Content-Kontrolle</h2>
          <p className="text-(--text-muted) text-xs">Quality Scoring, Trending-Pins &amp; Featured Management</p>
        </div>
      </div>

      {/* Quality Score Distribution */}
      <AdminCard title="Quality Score Verteilung" subtitle="Wie viele öffentliche Brews fallen in welchen Score-Bereich?">
        {qualityDist.length === 0 ? (
          <p className="text-(--text-disabled) text-sm">Keine Daten</p>
        ) : (
          <BarChart
            data={qualityDist.map(d => ({ bucket: d.bucket, Brews: d.bucket_count }))}
            xKey="bucket"
            yKeys={[{ key: 'Brews', color: '#eab308', label: 'Brews' }]}
            height={220}
          />
        )}
      </AdminCard>

      {/* Low Quality Brews */}
      <AdminCard
        title={`Low Quality Brews (${lowQualityBrews.length})`}
        action={
          <div className="flex items-center gap-3">
            <label className="text-xs text-(--text-muted)">Schwelle:</label>
            <input
              type="number"
              min="0" max="100"
              value={qualityThreshold}
              onChange={e => setQualityThreshold(Number(e.target.value))}
              className="w-16 bg-(--surface-sunken) border border-(--border-hover) rounded px-2 py-1 text-(--text-primary) text-xs text-center focus:outline-none focus:border-(--brand)"
            />
            <span className="text-xs text-(--text-muted)">/ 100</span>
          </div>
        }
      >
        {lowQualityBrews.length === 0 ? (
          <p className="text-(--text-disabled) text-sm py-4 text-center">Keine Brews unter Schwelle</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-(--border) text-left">
                  <th className="py-2 px-3 text-(--text-muted)">Name</th>
                  <th className="py-2 px-3 text-(--text-muted)">Style</th>
                  <th className="py-2 px-3 text-right text-(--text-muted)">Score</th>
                  <th className="py-2 px-3 text-right text-(--text-muted)">Trending</th>
                  <th className="py-2 px-3 text-center text-(--text-muted)">Featured</th>
                </tr>
              </thead>
              <tbody>
                {lowQualityBrews.map(brew => (
                  <tr key={brew.id} className="border-b border-(--border)/50 hover:bg-(--surface-hover)/20">
                    <td className="py-2 px-3 text-(--text-primary) font-medium max-w-[180px] truncate">{brew.name}</td>
                    <td className="py-2 px-3 text-(--text-secondary)">{brew.style ?? '—'}</td>
                    <td className="py-2 px-3 text-right"><span className="font-bold text-orange-400">{brew.quality_score}</span></td>
                    <td className="py-2 px-3 text-right text-(--text-secondary)">{brew.trending_score.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleToggleFeatured(brew as unknown as AdminBrewListItem)}
                        disabled={togglingFeatured === brew.id}
                        className="transition"
                        title={brew.is_featured ? 'Featured entfernen' : 'Als Featured markieren'}
                      >
                        {brew.is_featured
                          ? <ToggleRight className="w-5 h-5 text-yellow-400" />
                          : <ToggleLeft className="w-5 h-5 text-(--text-disabled)" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* Search Bar */}
      <div className="bg-(--surface)/60 border border-(--border-hover) rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted) pointer-events-none" />
          <input
            type="text"
            value={brewSearch}
            onChange={e => handleBrewSearchChange(e.target.value)}
            placeholder="Brew suchen nach Name oder Stil…"
            className="w-full bg-(--surface-sunken) border border-(--border-hover) rounded-lg pl-9 pr-9 py-2 text-(--text-primary) text-sm placeholder:text-(--text-disabled) focus:outline-none focus:border-(--brand) transition"
          />
          {brewSearch && (
            <button
              onClick={clearBrewSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-primary) transition"
              title="Suche zurücksetzen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-(--text-muted) shrink-0">
          {brewSearching ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border border-(--brand) border-t-transparent rounded-full animate-spin inline-block" />
              Suche…
            </span>
          ) : brewSearch ? (
            <span><span className="text-(--text-primary) font-bold">{adminBrewList.length}</span> Ergebnis{adminBrewList.length !== 1 ? 'se' : ''}</span>
          ) : (
            <span>Top <span className="text-(--text-primary) font-bold">{adminBrewList.length}</span> nach Quality Score</span>
          )}
        </p>
      </div>

      {/* Brew Manager — Trending Override + Featured */}
      <AdminCard
        title={`Brew Manager (${featuredBrews.length} featured · ${adminBrewList.filter(b => b.trending_score_override !== null).length} gepinnt)`}
        subtitle="Trending-Pin: Gepinnte Brews werden vom Cron nicht überschrieben. Featured: Brews erscheinen oben in der Discover-Page (max. 6)."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-(--border) text-left">
                <th className="py-2 px-3 text-(--text-muted)">Name</th>
                <th className="py-2 px-3 text-(--text-muted)">Style</th>
                <th className="py-2 px-3 text-right text-(--text-muted)">Quality</th>
                <th className="py-2 px-3 text-right text-(--text-muted)">Trending</th>
                <th className="py-2 px-3 text-(--text-muted)">Score pinnen</th>
                <th className="py-2 px-3 text-center text-(--text-muted)">Featured</th>
              </tr>
            </thead>
            <tbody>
              {adminBrewList.map(brew => {
                const isPinned = brew.trending_score_override !== null
                return (
                  <tr
                    key={brew.id}
                    className={`border-b border-(--border)/50 hover:bg-(--surface-hover)/20 ${
                      isPinned && brew.is_featured
                        ? 'bg-gradient-to-r from-(--brand)/5 to-purple-500/5'
                        : isPinned
                        ? 'bg-(--brand)/5'
                        : brew.is_featured
                        ? 'bg-purple-500/5'
                        : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-(--text-primary) font-medium max-w-[180px]">
                      <div className="flex items-center gap-1.5 truncate">
                        {isPinned && <Pin className="w-3 h-3 text-(--brand) shrink-0" />}
                        {brew.is_featured && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />}
                        <span className="truncate">{brew.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-(--text-secondary)">{brew.style ?? '—'}</td>
                    <td className="py-2 px-3 text-right text-yellow-400 font-bold">{brew.quality_score}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={isPinned ? 'text-(--brand-hover) font-bold' : 'text-(--brand)'}>{brew.trending_score.toFixed(2)}</span>
                      {isPinned && <span className="ml-1.5 text-[10px] text-(--brand) font-bold uppercase tracking-wide">pin</span>}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={isPinned ? String(brew.trending_score_override) : 'z. B. 9999'}
                          value={trendingOverrides[brew.id] ?? ''}
                          onChange={e => setTrendingOverrides(prev => ({ ...prev, [brew.id]: e.target.value }))}
                          className="w-24 bg-(--surface-sunken) border border-(--border-hover) rounded px-2 py-1 text-(--text-primary) text-xs focus:outline-none focus:border-(--brand)"
                        />
                        <button
                          onClick={() => handleTrendingOverride(brew.id)}
                          disabled={!trendingOverrides[brew.id] || savingTrending === brew.id}
                          className="px-2.5 py-1 bg-(--brand) hover:bg-(--brand-hover) disabled:opacity-30 disabled:cursor-not-allowed text-black rounded font-bold transition text-xs"
                        >
                          {savingTrending === brew.id ? '…' : isPinned ? 'Neu' : 'Pin'}
                        </button>
                        {isPinned && (
                          <button
                            onClick={() => handleClearPin(brew.id)}
                            disabled={clearingPin === brew.id}
                            title="Pin aufheben"
                            className="p-1 text-(--text-muted) hover:text-(--error) disabled:opacity-30 transition"
                          >
                            {clearingPin === brew.id ? <span className="text-xs">…</span> : <PinOff className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleToggleFeatured(brew)}
                        disabled={togglingFeatured === brew.id}
                        className="transition"
                        title={brew.is_featured ? 'Featured entfernen' : 'Als Featured markieren'}
                      >
                        {brew.is_featured
                          ? <ToggleRight className="w-5 h-5 text-purple-400" />
                          : <ToggleLeft className="w-5 h-5 text-(--text-disabled)" />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  )
}
