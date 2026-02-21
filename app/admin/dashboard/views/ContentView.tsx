'use client'

import { useState, useEffect, useRef } from 'react'
import MetricCard from '../components/MetricCard'
import DateRangePicker from '../components/DateRangePicker'
import BarChart from '../components/charts/BarChart'
import LineChart from '../components/charts/LineChart'
import PieChart from '../components/charts/PieChart'
import { getContentDailyStats, getTopBrews, getRatingDistribution } from '@/lib/actions/analytics-admin-actions'
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
import { Star, TrendingUp, Zap, AlertTriangle, ToggleLeft, ToggleRight, Search, X, Pin, PinOff } from 'lucide-react'
import { DateRange } from '@/lib/types/admin-analytics'

export default function ContentView() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // Quality / Featured / Trending admin state
  const [qualityDist, setQualityDist] = useState<QualityBucket[]>([])
  const [lowQualityBrews, setLowQualityBrews] = useState<LowQualityBrew[]>([])
  const [adminBrewList, setAdminBrewList] = useState<AdminBrewListItem[]>([])
  const [featuredBrews, setFeaturedBrews] = useState<AdminBrewListItem[]>([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [qualityThreshold, setQualityThreshold] = useState(40)
  // Search
  const [brewSearch, setBrewSearch] = useState('')
  const [brewSearching, setBrewSearching] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Trending override: map of brewId -> input string
  const [trendingOverrides, setTrendingOverrides] = useState<Record<string, string>>({})
  const [savingTrending, setSavingTrending] = useState<string | null>(null)
  const [clearingPin, setClearingPin] = useState<string | null>(null)
  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [dateRange])

  useEffect(() => {
    loadAdminData()
  }, [qualityThreshold])

  // Debounced brew search — fires 400ms after last keystroke
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

  async function loadData() {
    setLoading(true)
    try {
      const [contentStats, topBrews, ratingDist] = await Promise.all([
        getContentDailyStats(dateRange),
        getTopBrews(10),
        getRatingDistribution()
      ])

      const latestStats = contentStats[0] || {}
      const totalRatingsInRange = contentStats.reduce((sum, stat) => sum + (stat.total_ratings || 0), 0)

      setData({
        contentStats,
        topBrews,
        ratingDist,
        latestStats,
        totalRatingsInRange
      })
    } catch (error) {
      console.error('Failed to load content data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAdminData() {
    setAdminLoading(true)
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
      setAdminLoading(false)
    }
  }

  async function handleTrendingOverride(brewId: string, brewName: string) {
    const raw = trendingOverrides[brewId]
    const score = parseFloat(raw)
    if (isNaN(score) || score < 0) return
    setSavingTrending(brewId)
    try {
      await setTrendingScoreOverride(brewId, score)
      setAdminBrewList(prev =>
        prev.map(b => b.id === brewId
          ? { ...b, trending_score: score, trending_score_override: score }
          : b
        )
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
        prev.map(b => b.id === brewId
          ? { ...b, trending_score_override: null }
          : b
        )
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
      setAdminBrewList(prev =>
        prev.map(b => b.id === brew.id ? { ...b, is_featured: newFeatured } : b)
      )
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
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Lade Content-Daten...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-zinc-900/50 border border-red-800 rounded-xl p-8 text-center">
        <p className="text-red-400">Fehler beim Laden der Daten</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex justify-end">
        <DateRangePicker 
          value={dateRange} 
          onChange={setDateRange} 
          availableRanges={['7d', '30d', '90d']}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <MetricCard
          title="Gesamt Brews"
          value={data.latestStats.total_brews?.toLocaleString() || '0'}
          icon="🍺"
        />
        <MetricCard
          title="Gesamt Sessions"
          value={data.latestStats.total_sessions?.toLocaleString() || '0'}
          icon="📝"
        />
        <MetricCard
          title="Gesamt Bottles"
          value={data.latestStats.total_bottles?.toLocaleString() || '0'}
          icon="🍾"
        />
        <MetricCard
          title="Ø Rating"
          value={data.latestStats.avg_rating || '0.0'}
          icon="⭐"
        />
      </div>

      {/* Content Growth */}
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white mb-6">Content Growth</h3>
        <LineChart
          data={data.contentStats.slice(0, 30).reverse()}
          xKey="date"
          yKeys={[{ key: 'brews_created_today', color: '#0070f3', label: 'New Brews' }]}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Visibility Distribution */}
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Visibility</h3>
          <PieChart
            data={[
              { name: 'Public', value: data.latestStats.public_brews || 0 },
              { name: 'Private', value: data.latestStats.private_brews || 0 },
              { name: 'Team', value: data.latestStats.team_brews || 0 }
            ]}
            nameKey="name"
            valueKey="value"
          />
        </div>

        {/* Rating Distribution */}
        <div className="bg-black border border-zinc-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-white mb-6">Ratings</h3>
          <PieChart
            data={data.ratingDist}
            nameKey="label"
            valueKey="count"
          />
        </div>
      </div>

      {/* Top Brews */}
      <div className="bg-black border border-zinc-800 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white mb-6">Top Brews (by Bottles)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="py-3 px-4 text-zinc-500 font-medium">#</th>
                <th className="py-3 px-4 text-zinc-500 font-medium">Name</th>
                <th className="py-3 px-4 text-zinc-500 font-medium">Style</th>
                <th className="text-center py-3 px-4 text-zinc-500 font-medium">Visibility</th>
                <th className="text-right py-3 px-4 text-zinc-500 font-medium">Bottles</th>
              </tr>
            </thead>
            <tbody>
              {data.topBrews.map((brew: any, index: number) => (
                <tr key={brew.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 px-4 text-zinc-500">{index + 1}</td>
                  <td className="py-3 px-4 text-white font-medium">{brew.name}</td>
                  <td className="py-3 px-4 text-zinc-400">{brew.style || 'N/A'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      brew.visibility === 'public' ? 'bg-green-900/50 text-green-400' :
                      brew.visibility === 'team' ? 'bg-blue-900/50 text-blue-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {brew.visibility}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-bold">
                    {brew.bottle_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADMIN QUALITY PANEL ─── */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Quality Score Panel</h2>
            <p className="text-zinc-500 text-xs">Score-Verteilung, Low-Quality Brews &amp; Featured Management</p>
          </div>
        </div>

        {adminLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* A1: Score Distribution Histogram */}
            <div className="bg-black border border-zinc-800 rounded-lg p-6">
              <h3 className="text-sm font-medium text-white mb-2">Quality Score Verteilung</h3>
              <p className="text-xs text-zinc-500 mb-6">
                Wie viele öffentliche Brews fallen in welchen Score-Bereich?
              </p>
              {qualityDist.length === 0 ? (
                <p className="text-zinc-600 text-sm">Keine Daten</p>
              ) : (
                <BarChart
                  data={qualityDist.map(d => ({ bucket: d.bucket, Brews: d.bucket_count }))}
                  xKey="bucket"
                  yKeys={[{ key: 'Brews', color: '#eab308', label: 'Brews' }]}
                  height={220}
                />
              )}
            </div>

            {/* A2: Low Quality Brews */}
            <div className="bg-black border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-medium text-white">
                    Low Quality Brews
                    <span className="ml-2 text-xs text-zinc-500">({lowQualityBrews.length})</span>
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-zinc-500">Schwelle:</label>
                  <input
                    type="number"
                    min="0" max="100"
                    value={qualityThreshold}
                    onChange={e => setQualityThreshold(Number(e.target.value))}
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-xs text-center focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-xs text-zinc-500">/ 100</span>
                </div>
              </div>
              {lowQualityBrews.length === 0 ? (
                <p className="text-zinc-600 text-sm py-4 text-center">Keine Brews unter Schwelle ✨</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left">
                        <th className="py-2 px-3 text-zinc-500">Name</th>
                        <th className="py-2 px-3 text-zinc-500">Style</th>
                        <th className="py-2 px-3 text-right text-zinc-500">Score</th>
                        <th className="py-2 px-3 text-right text-zinc-500">Trending</th>
                        <th className="py-2 px-3 text-center text-zinc-500">Featured</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowQualityBrews.map(brew => (
                        <tr key={brew.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                          <td className="py-2 px-3 text-white font-medium max-w-[180px] truncate">{brew.name}</td>
                          <td className="py-2 px-3 text-zinc-400">{brew.style ?? '—'}</td>
                          <td className="py-2 px-3 text-right">
                            <span className="font-bold text-orange-400">{brew.quality_score}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-zinc-400">
                            {brew.trending_score.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => handleToggleFeatured(brew as unknown as AdminBrewListItem)}
                              disabled={togglingFeatured === brew.id}
                              className="transition"
                              title={brew.is_featured ? 'Featured entfernen' : 'Als Featured markieren'}
                            >
                              {brew.is_featured
                                ? <ToggleRight className="w-5 h-5 text-yellow-400" />
                                : <ToggleLeft className="w-5 h-5 text-zinc-600" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Search bar — controls both Trending Override + Featured Manager */}
            <div className="bg-zinc-900/60 border border-zinc-700 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={brewSearch}
                  onChange={e => handleBrewSearchChange(e.target.value)}
                  placeholder="Brew suchen nach Name oder Stil…"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-9 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition"
                />
                {brewSearch && (
                  <button
                    onClick={clearBrewSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                    title="Suche zurücksetzen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500 shrink-0">
                {brewSearching ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-cyan-500 border-t-transparent rounded-full animate-spin inline-block" />
                    Suche…
                  </span>
                ) : brewSearch ? (
                  <span>
                    <span className="text-white font-bold">{adminBrewList.length}</span> Ergebnis{adminBrewList.length !== 1 ? 'se' : ''}
                  </span>
                ) : (
                  <span>Top <span className="text-white font-bold">{adminBrewList.length}</span> nach Quality Score</span>
                )}
              </p>
            </div>

            {/* B: Trending Score Override */}
            <div className="bg-black border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-medium text-white">Trending Score Override</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-5">
                Pinne einzelne Brews auf einen festen Trending Score — gepinnte Brews werden vom stündlichen Cron-Job <span className="text-white font-medium">nicht überschrieben</span> und bleiben dauerhaft auf dem gesetzten Wert.
                Über das <span className="text-cyan-400 font-medium">PinOff-Symbol</span> wird der Pin aufgehoben und der Score wieder automatisch berechnet.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="py-2 px-3 text-zinc-500">Name</th>
                      <th className="py-2 px-3 text-right text-zinc-500">Quality</th>
                      <th className="py-2 px-3 text-right text-zinc-500">Trending (aktuell)</th>
                      <th className="py-2 px-3 text-zinc-500">Neuer Score</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminBrewList.map(brew => {
                      const isPinned = brew.trending_score_override !== null
                      return (
                        <tr
                          key={brew.id}
                          className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 ${
                            isPinned ? 'bg-cyan-500/5' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-white font-medium max-w-[200px]">
                            <div className="flex items-center gap-1.5 truncate">
                              {isPinned && (
                                <Pin className="w-3 h-3 text-cyan-400 shrink-0" />
                              )}
                              <span className="truncate">{brew.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right text-yellow-400 font-bold">{brew.quality_score}</td>
                          <td className="py-2 px-3 text-right">
                            <span className={isPinned ? 'text-cyan-300 font-bold' : 'text-cyan-400'}>
                              {brew.trending_score.toFixed(2)}
                            </span>
                            {isPinned && (
                              <span className="ml-1.5 text-[10px] text-cyan-500 font-bold uppercase tracking-wide">
                                gepinnt
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={isPinned ? String(brew.trending_score_override) : 'z. B. 9999'}
                              value={trendingOverrides[brew.id] ?? ''}
                              onChange={e =>
                                setTrendingOverrides(prev => ({
                                  ...prev,
                                  [brew.id]: e.target.value,
                                }))
                              }
                              className="w-28 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleTrendingOverride(brew.id, brew.name)}
                                disabled={!trendingOverrides[brew.id] || savingTrending === brew.id}
                                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded font-bold transition text-xs"
                              >
                                {savingTrending === brew.id ? '…' : isPinned ? 'Neu pinnen' : 'Pinnen'}
                              </button>
                              {isPinned && (
                                <button
                                  onClick={() => handleClearPin(brew.id)}
                                  disabled={clearingPin === brew.id}
                                  title="Pin aufheben — Cron berechnet Score wieder automatisch"
                                  className="p-1 text-zinc-500 hover:text-red-400 disabled:opacity-30 transition"
                                >
                                  {clearingPin === brew.id
                                    ? <span className="text-xs">…</span>
                                    : <PinOff className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* C: Featured Brews Manager */}
            <div className="bg-black border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-medium text-white">
                  Featured Brews Manager
                  <span className="ml-2 text-xs text-zinc-500">({featuredBrews.length} aktiv)</span>
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mb-6">
                Featured Brews erscheinen oben in der Discover-Page in einem separaten &quot;Empfohlen&quot;-Bereich.
                Empfehlung: max. 6 gleichzeitig.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="py-2 px-3 text-zinc-500">Name</th>
                      <th className="py-2 px-3 text-zinc-500">Style</th>
                      <th className="py-2 px-3 text-right text-zinc-500">Quality</th>
                      <th className="py-2 px-3 text-center text-zinc-500">Featured</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminBrewList.map(brew => (
                      <tr key={brew.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 ${
                        brew.is_featured ? 'bg-purple-500/5' : ''
                      }`}>
                        <td className="py-2 px-3 text-white font-medium max-w-[200px] truncate">
                          {brew.is_featured && (
                            <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-purple-400 align-middle" />
                          )}
                          {brew.name}
                        </td>
                        <td className="py-2 px-3 text-zinc-400">{brew.style ?? '—'}</td>
                        <td className="py-2 px-3 text-right text-yellow-400 font-bold">{brew.quality_score}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleToggleFeatured(brew)}
                            disabled={togglingFeatured === brew.id}
                            className="transition"
                            title={brew.is_featured ? 'Featured entfernen' : 'Als Featured markieren'}
                          >
                            {brew.is_featured
                              ? <ToggleRight className="w-5 h-5 text-purple-400" />
                              : <ToggleLeft className="w-5 h-5 text-zinc-600" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
