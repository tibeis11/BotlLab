'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '@/lib/hooks/useSupabase';
import Header from '../components/Header';
import DiscoverBrewCard from '../components/DiscoverBrewCard';
import CustomSelect from '../components/CustomSelect';
import { inferFermentationType } from '@/lib/brew-type-lookup';
import { toggleBrewLike } from '@/lib/actions/like-actions';
import {
  buildUserProfile,
  getPersonalizedBrews,
  getQualityFallback,
  getRecommendationReason,
  scoreBrewForUser,
  NEEDS_MORE_DATA_THRESHOLD,
} from '@/lib/utils/recommendation-engine';
import { Flame, Heart, Star, Sparkles, Search, Filter, SearchX, ChevronDown, ChevronLeft, ChevronRight, X, ArrowLeft, Clock, Loader2, TrendingUp, BadgeCheck, Check } from 'lucide-react';
import Image from 'next/image';
import { Section, SectionHeader } from './_components/DiscoverSection';

type Brew = {
  id: string;
  name: string;
  style: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  brew_type?: string | null;
  mash_method?: string | null;
  fermentation_type?: string | null;
  copy_count?: number;
  times_brewed?: number;
  view_count?: number;
  trending_score?: number;
  quality_score?: number;
  personalization_score?: number;
  abv?: number;
  ibu?: number;
  ebc?: number;
  original_gravity?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  remix_parent_id?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  breweries?: any; 
  ratings?: { rating: number }[] | null;
  likes_count?: number; 
  user_has_liked?: boolean;
  is_featured?: boolean;
  brewery?: { id: string; name: string; team_name?: string; logo_url?: string } | null;
};

export default function DiscoverClient({ 
  initialBrews, 
  initialTrending, 
  initialFeatured,
  initialRandomFact,
  collabDiversityCap = 3,
}: { 
  initialBrews: Brew[]; 
  initialTrending: Brew[]; 
  initialFeatured: Brew[];
  initialRandomFact: string;
  /** Diversity-Cap aus platform_settings.collab_diversity_cap (SSR) */
  collabDiversityCap?: number;
}) {
  // Singleton imported
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brews, setBrews] = useState<Brew[]>(initialBrews);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [styleFilter, setStyleFilter] = useState<string>(() => searchParams.get('style') || 'all');
  const [sort, setSort] = useState<'newest'|'top'|'most_rated'|'quality'|'most_liked'>(
    () => (searchParams.get('sort') as 'newest'|'top'|'most_rated'|'quality'|'most_liked') || 'quality'
  );
  const [showAllGrid, setShowAllGrid] = useState(false);
  const [brewTypeFilter, setBrewTypeFilter] = useState<'all' | 'all_grain' | 'extract' | 'partial_mash'>(
    () => (searchParams.get('mash') as 'all' | 'all_grain' | 'extract' | 'partial_mash') || 'all'
  );
  const [fermentationFilter, setFermentationFilter] = useState<'all' | 'top' | 'bottom' | 'spontaneous' | 'mixed'>(
    () => (searchParams.get('fermentation') as 'all' | 'top' | 'bottom' | 'spontaneous' | 'mixed') || 'all'
  );
  const [abvPreset, setAbvPreset] = useState<'all' | 'session' | 'craft' | 'imperial'>(
    () => (searchParams.get('abv') as 'all' | 'session' | 'craft' | 'imperial') || 'all'
  );
  const [ibuPreset, setIbuPreset] = useState<'all' | 'mild' | 'balanced' | 'hoppy'>(
    () => (searchParams.get('ibu') as 'all' | 'mild' | 'balanced' | 'hoppy') || 'all'
  );
  const [hopFilter, setHopFilter] = useState(() => searchParams.get('hop') || '');
  const [showMoreFilters, setShowMoreFilters] = useState(
    () => !!(searchParams.get('abv') || searchParams.get('ibu') || searchParams.get('hop'))
  );
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const sheetDragStartY = useRef<number>(0);
  const sheetIsDragging = useRef(false);
  const [beginnerMode, setBeginnerMode] = useState(() => searchParams.get('beginner') === '1');
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const overlaySearchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Infinite Scroll ───────────────────────────────────────────────
  const PAGE_SIZE = 20;
  const [loadedOffset, setLoadedOffset] = useState(initialBrews.length);
  const [hasMore, setHasMore] = useState(initialBrews.length >= PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('botllab_recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  // Lock body scroll when bottom sheet or search overlay is open
  useEffect(() => {
    if (showBottomSheet || showSearchOverlay) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showBottomSheet, showSearchOverlay]);

  const resetFilters = () => {
    setSearch('');
    setStyleFilter('all');
    setBrewTypeFilter('all');
    setFermentationFilter('all');
    setAbvPreset('all');
    setIbuPreset('all');
    setHopFilter('');
    setBeginnerMode(false);
    searchRef.current?.focus();
  };

  // Sync filter state → URL (replace so back-button works cleanly)
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (styleFilter !== 'all') params.set('style', styleFilter);
    if (sort !== 'quality') params.set('sort', sort);
    if (brewTypeFilter !== 'all') params.set('mash', brewTypeFilter);
    if (fermentationFilter !== 'all') params.set('fermentation', fermentationFilter);
    if (abvPreset !== 'all') params.set('abv', abvPreset);
    if (ibuPreset !== 'all') params.set('ibu', ibuPreset);
    if (hopFilter.trim()) params.set('hop', hopFilter.trim());
    if (beginnerMode) params.set('beginner', '1');
    const qs = params.toString();
    router.replace(qs ? `/discover?${qs}` : '/discover', { scroll: false });
  }, [search, styleFilter, sort, brewTypeFilter, fermentationFilter, abvPreset, ibuPreset, hopFilter, beginnerMode]);

  useEffect(() => {
    // Auto-focus the search input on page load
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    // Fetch current user for likes + admin check (brews already provided via SSR)
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? undefined);
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    setIsAdmin(!!user?.email && adminEmails.includes(user.email.toLowerCase()));

    if (user) {
      // Profil-Einstellungen laden (für Opt-Out)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('analytics_opt_out')
        .eq('id', user.id)
        .single();

      if (profileData?.analytics_opt_out) {
        sessionStorage.setItem('botllab_analytics_opt_out', 'true');
      } else {
        sessionStorage.removeItem('botllab_analytics_opt_out');
      }

      const { data: likesData } = await supabase
        .from('likes')
        .select('brew_id')
        .eq('user_id', user.id);

      const likedIds = new Set((likesData || []).map((l: any) => l.brew_id));
      setBrews(prev => prev.map(b => ({ ...b, user_has_liked: likedIds.has(b.id) })));
      setTrending(prev => prev.map(b => ({ ...b, user_has_liked: likedIds.has(b.id) })));
      setFeatured(prev => prev.map(b => ({ ...b, user_has_liked: likedIds.has(b.id) })));

      // ── Empfehlungs-Engine: eigene Brews laden ──────────────────────────
      // Enthält data-Feld für Hop/Malt-Overlap sowie remix_parent_id für
      // "bereits kopiert"-Ausschluss. Limit 50 reicht für das Nutzerprofil.
      const { data: ownBrewsData } = await supabase
        .from('brews')
        .select('id,name,style,mash_method,data,remix_parent_id,quality_score,ratings(rating)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (ownBrewsData && ownBrewsData.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = ownBrewsData.map((b: any) => {
          const bData = b.data as any;
          return {
            ...b,
            abv: bData?.abv ? parseFloat(bData.abv) : undefined,
            ibu: bData?.ibu ? parseInt(bData.ibu, 10) : undefined,
            ebc: bData?.color ? parseInt(bData.color, 10) : undefined,
          } as Brew;
        });
        setUserBrews(mapped);
      }

      // ── Stufe A+: Hoch bewertete Brews laden (≥4★) ───────────────────────
      // Brews die der Nutzer persönlich mit ≥4 Sternen bewertet hat.
      // Zusätzliches Signal in buildUserProfile (Faktor 1.5).
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('brew_id')
        .eq('user_id', user.id)
        .gte('rating', 4);

      if (ratingsData && (ratingsData as any[]).length > 0) {
        const highRatedIds = (ratingsData as any[]).map(r => r.brew_id);
        const { data: highRatedBrewsData } = await supabase
          .from('brews')
          .select('id,name,style,data,quality_score')
          .in('id', highRatedIds)
          .eq('is_public', true);
        if (highRatedBrewsData) setHighRatedBrews(highRatedBrewsData as Brew[]);
      }

      // ── Stufe B: Implizite Signale aus brew_views laden ───────────────────
      // Brews die der Nutzer in den letzten 30 Tagen ≥3s angeschaut hat.
      // Wird als schwaches Interesse-Signal im Nutzerprofil gewertet.
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: viewsData } = await (supabase as any)
        .from('brew_views')
        .select('brew_id')
        .eq('user_id', user.id)
        .gte('viewed_at', thirtyDaysAgo)
        .order('viewed_at', { ascending: false })
        .limit(50);

      if (viewsData && viewsData.length > 0) {
        // Deduplizieren und Brew-Daten nachladen
        const viewedIds = [...new Set((viewsData as unknown as { brew_id: string }[]).map(v => v.brew_id))];
        const { data: viewedBrewsData } = await supabase
          .from('brews')
          .select('id,name,style,data,quality_score')
          .in('id', viewedIds)
          .limit(50);

        if (viewedBrewsData) setViewedBrews(viewedBrewsData as Brew[]);
      }

      // ── Stufe C: Kollaborative Empfehlungen (Cache-first) ────────────────
      // Strategie: user_recommendations-Tabelle lesen (TTL 2h).
      // Bei Cache-Miss → live RPC → Ergebnis in Cache schreiben (fire-and-forget).
      // Ab ~500 aktiven Nutzern: pg_cron-Job in 20260221150000_collab_v2.sql aktivieren,
      // dann entfällt der client-seitige Cache-Write.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cacheMaxAge = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h TTL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cachedRecs } = await (supabase as any)
        .from('user_recommendations')
        .select('brew_id, score')
        .eq('user_id', user.id)
        .gte('computed_at', cacheMaxAge)
        .order('score', { ascending: false })
        .limit(20);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let collabIds: string[] = (cachedRecs && (cachedRecs as any[]).length >= 3)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? [...new Set((cachedRecs as any[]).map(r => r.brew_id as string))]
        : [];

      if (collabIds.length < 3) {
        // Cache-Miss → live RPC v2.1 (Likes + Ratings ≥4★, konfigurierbarer Diversity-Cap)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: collabData } = await (supabase as any).rpc('get_collaborative_recommendations', {
          p_user_id:       user.id,
          p_limit:         20,
          p_diversity_cap: collabDiversityCap,
        });

        if (collabData && (collabData as unknown as { brew_id: string }[]).length >= 3) {
          collabIds = [...new Set((collabData as unknown as { brew_id: string }[]).map(r => r.brew_id as string))];

          // Cache schreiben — upsert verhindert Race-Window zwischen DELETE und INSERT.
          // Alte Empfehlungen werden via 2h-TTL beim Lesen automatisch gefiltert.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const now = new Date().toISOString();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cacheRows = (collabData as any[]).map((r: any) => ({
            user_id:     user.id,
            brew_id:     r.brew_id,
            score:       r.collab_score,
            computed_at: now,
          }));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('user_recommendations')
            .upsert(cacheRows, { onConflict: 'user_id,brew_id' });
        }
      }

      if (collabIds.length >= 3) {
        setCollaborativeBrewIds(new Set(collabIds));

        // Brew-Objekte nachladen damit sie im Pool landen
        const { data: collabBrewsData } = await supabase
          .from('brews')
          .select('id,name,style,image_url,created_at,user_id,brew_type,data,remix_parent_id,quality_score,is_featured,copy_count,times_brewed,view_count,trending_score,breweries!left(id,name,logo_url),ratings(rating),likes_count')
          .in('id', collabIds)
          .eq('is_public', true);

        if (collabBrewsData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped = (collabBrewsData as any[]).map((b: any) => {
            const bData = b.data as any;
            return {
              ...b,
              abv:     bData?.abv   ? parseFloat(bData.abv)          : undefined,
              ibu:     bData?.ibu   ? parseInt(bData.ibu, 10)         : undefined,
              ebc:     bData?.color ? parseInt(bData.color, 10)       : undefined,
              brewery: Array.isArray(b.breweries) ? b.breweries[0] : b.breweries,
              user_has_liked: false,
            } as Brew;
          });
          setCollaborativeBrews(mapped);
        }
      }
    }
  }

  const avg = (b: Brew) => {
    const rs = b.ratings || [];
    if (rs.length === 0) return 0;
    return Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10;
  };

  // Trending: DB-seitig sortiert via SSR (trending_score DESC, stündlich via pg_cron aktualisiert)
  // initialTrending enthält Top-10 aus der *gesamten* brews-Tabelle — unabhängig vom Infinite-Scroll-Batch
  const [trending, setTrending] = useState<Brew[]>(initialTrending);

  // Featured: Admin-markierte Empfehlungsbrews
  const [featured, setFeatured] = useState<Brew[]>(initialFeatured);

  // Personalisierung: eigene Brews des eingeloggten Nutzers (wird in loadUserData geladen)
  const [userBrews, setUserBrews]                = useState<Brew[]>([]);
  // Stufe B: Brews die der Nutzer ≥3s angeschaut hat (implizites Signal)
  const [viewedBrews, setViewedBrews]            = useState<Brew[]>([]);
  // Stufe A erweiterung: Hoch bewertete Brews (≥4★)
  const [highRatedBrews, setHighRatedBrews]      = useState<Brew[]>([]);
  // Stufe C: IDs und Brew-Objekte aus kollaborativem Filtering
  const [collaborativeBrewIds, setCollaborativeBrewIds] = useState<Set<string>>(new Set());
  const [collaborativeBrews, setCollaborativeBrews]     = useState<Brew[]>([]);

  const topRated = useMemo(() => {
    // ── Hot-Rating-Score ────────────────────────────────────────────────────
    // Combiniert Bewertungsqualität mit Aktualität — verhindert dass alte
    // Rezepte die Liste auf Dauer blockieren.
    //
    // Formel:  hotScore = bayesianAvg × recencyFactor
    //   bayesianAvg   = (M×C + n×avg) / (M+n)   ; M=3, C=3.5 (global avg)
    //   recencyFactor = 0.4 + 0.6 × exp(-age_days / 45)  ; Halbwertszeit 45d
    //     → Alter 0d:   1.00  (frisch)
    //     → Alter 24d:  0.75  (Schwelle für ↑-Pfeil)
    //     → Alter 45d:  0.62  (Halbwertszeit)
    //     → Alter 80d:  0.50  (Schwelle für ↓-Pfeil)
    //     → Alter ∞:    0.40  (Floor — Ausnahme-Klassiker bleiben sichtbar)
    //
    // Minimum: ≥2 Ratings (verhindert 1×5★ ganz oben)
    const now = Date.now();
    const M = 3; const C = 3.5; // Bayesian-Konstanten
    return [...brews]
      .filter(b => (b.ratings?.length || 0) >= 2)
      .map(b => {
        const n = b.ratings!.length;
        const r = b.ratings!.reduce((s, x) => s + x.rating, 0) / n;
        const bayesianAvg = (M * C + n * r) / (M + n);
        const ageDays = (now - new Date(b.created_at).getTime()) / 86_400_000;
        const recencyFactor = 0.4 + 0.6 * Math.exp(-ageDays / 45);
        return { brew: b, hotScore: bayesianAvg * recencyFactor, recencyFactor };
      })
      .sort((a, b) => b.hotScore - a.hotScore)
      .slice(0, 10)
      .map(x => ({ ...x.brew, _recencyFactor: x.recencyFactor }));
  }, [brews]) as (Brew & { _recencyFactor?: number })[];

  const newest = useMemo(() => {
    return [...brews].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
  }, [brews]);

  /**
   * Personalised section: "Für dich"
   *
   * Signalstärke (stärkste → schwächste):
   *  Stufe A: eigene Brews (3) + Likes (2) + Hohe Ratings (1.5) — immer aktiv
   *  Stufe B: brew_views Dwell-Time (0.5) — aktiv sobald Views vorhanden
   *  Stufe C: kollab. Filtering (+0.15 Bonus) — aktiv ab ≥3 ähnlichen Nutzern
   *
   * Fallback: eigene Brews + Likes < NEEDS_MORE_DATA_THRESHOLD → Qualitäts-Fallback
   */
  const personalizedBrews = useMemo<Brew[]>(() => {
    if (!currentUserId) return [];

    // Pool: alle bekannten Brews + kollaborative Empfehlungen (Stufe C)
    const pool = [...brews, ...trending, ...featured, ...collaborativeBrews];
    const seen = new Set<string>();
    const uniquePool = pool.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });

    // Liked brews müssen VOR dem Threshold-Check bekannt sein — Likes zählen als Signal
    const likedBrews = uniquePool.filter(b => b.user_has_liked);

    if (userBrews.length + likedBrews.length + highRatedBrews.length < NEEDS_MORE_DATA_THRESHOLD) {
      const ownIds = new Set(userBrews.map(b => b.id));
      return getQualityFallback(uniquePool, ownIds, 10) as Brew[];
    }

    // buildUserProfile jetzt mit allen Stufen-Signalen
    const profile = buildUserProfile(userBrews, likedBrews, highRatedBrews, viewedBrews, collaborativeBrewIds);
    // Brews mit ihrem Personalisierungs-Score und Grund annotieren (für Portrait-Tooltip + Admin-Debug)
    return (getPersonalizedBrews(uniquePool, profile, trending, 10) as Brew[]).map(b => ({
      ...b,
      personalization_score: Math.round(scoreBrewForUser(b, profile) * 100) / 100,
      recommendation_reason: getRecommendationReason(b, profile),
    }));
  }, [currentUserId, userBrews, highRatedBrews, brews, trending, featured, viewedBrews, collaborativeBrewIds, collaborativeBrews]);

  const isFiltering =
    search.length > 0 ||
    styleFilter !== 'all' ||
    brewTypeFilter !== 'all' ||
    fermentationFilter !== 'all' ||
    abvPreset !== 'all' ||
    ibuPreset !== 'all' ||
    hopFilter.trim().length > 0 ||
    beginnerMode;

  // Save a search term to localStorage recent-searches
  const saveRecentSearch = (q: string) => {    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches(prev => {
      const updated = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, 5);
      try { localStorage.setItem('botllab_recent_searches', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // ── Load next batch from Supabase and append ─────────────────────
  const loadMoreBrews = useCallback(async (reset = false) => {
    if (loadingMore || (!hasMore && !reset)) return;
    setLoadingMore(true);
    const from = reset ? 0 : loadedOffset;
    const to = from + PAGE_SIZE - 1;
    
    let query = supabase
      .from('brews')
      .select(
        'id,name,style,image_url,created_at,user_id,brew_type,mash_method,fermentation_type,copy_count,times_brewed,view_count,trending_score,quality_score,is_featured,abv,ibu,data,remix_parent_id,moderation_status,breweries!left(id,name,logo_url),ratings(rating),likes_count'
      )
      .eq('is_public', true);

    // Backend Filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,style.ilike.%${search}%`);
    }
    if (styleFilter !== 'all') {
      query = query.eq('style', styleFilter);
    }
    if (brewTypeFilter !== 'all') {
      query = query.eq('mash_method', brewTypeFilter);
    }
    if (fermentationFilter !== 'all') {
      query = query.eq('fermentation_type', fermentationFilter);
    }

    // Backend ABV filter — uses dedicated abv column (synced via DB trigger)
    if (abvPreset !== 'all') {
      if (abvPreset === 'session')  query = query.lt('abv', 4.5);
      else if (abvPreset === 'craft')    query = query.gte('abv', 4.5).lte('abv', 7);
      else if (abvPreset === 'imperial') query = query.gt('abv', 7);
    }
    // Backend IBU filter — uses dedicated ibu column (synced via DB trigger)
    if (ibuPreset !== 'all') {
      if (ibuPreset === 'mild')     query = query.lt('ibu', 20);
      else if (ibuPreset === 'balanced') query = query.gte('ibu', 20).lte('ibu', 40);
      else if (ibuPreset === 'hoppy')    query = query.gt('ibu', 40);
    }

    // Sorting
    if (sort === 'newest') query = query.order('created_at', { ascending: false });
    else if (sort === 'most_liked') query = query.order('likes_count', { ascending: false });
    else query = query.order('quality_score', { ascending: false }); // default for top, most_rated, quality

    const { data } = await query.range(from, to);

    if (!data || data.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      if (reset) setBrews([]);
      return;
    }
    if (data.length < PAGE_SIZE) setHasMore(false);
    else setHasMore(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = data.map((b: any) => {
      const bData = b.data as any;
      return {
        ...b,
        // Prefer dedicated columns (synced by trigger), fall back to JSON
        abv: b.abv != null ? Number(b.abv)
           : bData?.abv  ? parseFloat(bData.abv)  : undefined,
        ibu: b.ibu != null ? Number(b.ibu)
           : bData?.ibu  ? parseInt(bData.ibu, 10) : undefined,
        ebc: bData?.color ? parseInt(bData.color, 10) : undefined,
        original_gravity: bData?.original_gravity || bData?.og || bData?.plato
          ? parseFloat(String(bData.original_gravity || bData.og || bData.plato))
          : undefined,
        brewery: Array.isArray(b.breweries) ? b.breweries[0] : b.breweries,
        user_has_liked: false,
      };
    });

    setBrews(prev => reset ? mapped : [...prev, ...mapped]);
    setLoadedOffset(from + data.length);
    setLoadingMore(false);
  }, [loadingMore, hasMore, loadedOffset, supabase, search, styleFilter, brewTypeFilter, fermentationFilter, sort, abvPreset, ibuPreset]);

  // Trigger reload when backend filters change
  useEffect(() => {
    // Debounce search slightly
    const timer = setTimeout(() => {
      loadMoreBrews(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, styleFilter, brewTypeFilter, fermentationFilter, sort, abvPreset, ibuPreset]);

  // ── IntersectionObserver: trigger loadMore when sentinel is visible ──
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreBrews(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreBrews]);

  // Unique ingredient names (hops + malts) from all loaded brews, for autocomplete
  const allIngredientNames = useMemo(() => {
    const names = new Set<string>();
    brews.forEach(b => {
      (b.data?.hops as any[] | undefined)?.forEach((h: any) => { if (h?.name) names.add(h.name); });
      (b.data?.malts as any[] | undefined)?.forEach((m: any) => { if (m?.name) names.add(m.name); });
    });
    return Array.from(names).sort();
  }, [brews]);

  // Autocomplete suggestions: brew names + styles + ingredients, max 8 total
  type Suggestion = { label: string; type: 'recipe' | 'style' | 'ingredient' };
  const autocompleteSuggestions = useMemo((): Suggestion[] => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: Suggestion[] = [];
    const seen = new Set<string>();
    const add = (label: string, type: Suggestion['type']) => {
      if (!seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        results.push({ label, type });
      }
    };
    // Recipe names
    brews.forEach(b => { if (b.name?.toLowerCase().includes(q)) add(b.name, 'recipe'); });
    // Styles (deduplicated)
    brews.forEach(b => { if (b.style?.toLowerCase().includes(q)) add(b.style!, 'style'); });
    // Ingredients
    allIngredientNames.forEach(n => { if (n.toLowerCase().includes(q)) add(n, 'ingredient'); });
    return results.slice(0, 8);
  }, [search, brews, allIngredientNames]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset "showAllGrid" when user starts a new search or filter
  useEffect(() => {
    if (isFiltering) setShowAllGrid(false);
  }, [isFiltering]);

  const list = useMemo(() => {
    let items = brews.filter(b => {
      // Backend filters are already applied to `brews`
      // We only apply client-side filters here
      const matchesAbv =
        abvPreset === 'all' ? true :
        abvPreset === 'session' ? (b.abv != null && b.abv < 4.5) :
        abvPreset === 'craft'   ? (b.abv != null && b.abv >= 4.5 && b.abv <= 7) :
        abvPreset === 'imperial'? (b.abv != null && b.abv > 7) : true;
      const matchesIbu =
        ibuPreset === 'all'      ? true :
        ibuPreset === 'mild'     ? (b.ibu != null && b.ibu < 20) :
        ibuPreset === 'balanced' ? (b.ibu != null && b.ibu >= 20 && b.ibu <= 40) :
        ibuPreset === 'hoppy'    ? (b.ibu != null && b.ibu > 40) : true;
      const matchesIngredient = !hopFilter.trim() || (() => {
        const term = hopFilter.trim().toLowerCase();
        const hops: any[] = b.data?.hops || [];
        const malts: any[] = b.data?.malts || [];
        return [...hops, ...malts].some((i: any) => i?.name?.toLowerCase().includes(term));
      })();
      const matchesBeginner = !beginnerMode || (() => {
        const maltCount  = Array.isArray(b.data?.malts)      ? b.data.malts.length      : 0;
        const hopCount   = Array.isArray(b.data?.hops)       ? b.data.hops.length       : 0;
        const stepCount  = Array.isArray(b.data?.mash_steps) ? b.data.mash_steps.length : 0;
        return maltCount + hopCount + stepCount <= 4;
      })();
      return matchesAbv && matchesIbu && matchesIngredient && matchesBeginner;
    });

    // Client-side sorting for complex metrics
    if (sort === 'top') items = items.sort((a, b) => avg(b) - avg(a) || (b.quality_score || 0) - (a.quality_score || 0));
    if (sort === 'most_rated') items = items.sort((a, b) => (b.ratings?.length || 0) - (a.ratings?.length || 0) || (b.quality_score || 0) - (a.quality_score || 0));
    
    return items;
  }, [brews, abvPreset, ibuPreset, hopFilter, sort, beginnerMode]);

  // Smart fallback: when search yields 0, suggest alternatives by loosening filters
  const suggestions = useMemo(() => {
    if (list.length > 0) return [];
    // Loosen: ignore search term, keep style filter
    const byStyle = styleFilter !== 'all'
      ? brews.filter(b => b.style === styleFilter).slice(0, 3)
      : [];
    // Loosen further: ignore style filter, keep search term
    const bySearch = search.length > 0
      ? brews.filter(b => b.name?.toLowerCase().includes(search.toLowerCase()) || (b.style || '').toLowerCase().includes(search.toLowerCase())).slice(0, 3)
      : [];
    // Prefer style matches if available, else search matches, else top 3
    if (byStyle.length > 0) return byStyle;
    if (bySearch.length > 0) return bySearch;
    return [...brews].sort((a, b) => avg(b) - avg(a)).slice(0, 3);
  }, [list, brews, search, styleFilter, brewTypeFilter, fermentationFilter, abvPreset, ibuPreset, hopFilter]);

  const sortOptions = [
      { value: 'quality', label: 'Höchste Qualität' },
      { value: 'top', label: 'Top bewertet' },
      { value: 'most_liked', label: 'Meiste Likes' },
      { value: 'most_rated', label: 'Meist bewertet' },
      { value: 'newest', label: 'Neueste' },
  ];

  const POPULAR_STYLES = ['IPA', 'Weizen', 'Pils', 'Stout', 'Lager', 'Porter', 'Pale Ale', 'Sour'];
  const POPULAR_SEARCHES = ['IPA', 'Weizen', 'Saison', 'Pils', 'Stout', 'Helles', 'Citra', 'Kölsch', 'Pale Ale', 'Sour'];
  const BREW_TYPES = [
    { value: 'all', label: 'Alle' },
    { value: 'all_grain', label: 'All-Grain' },
    { value: 'extract', label: 'Extrakt' },
    { value: 'partial_mash', label: 'Teilmaische' },
  ];
  const FERMENTATION_TYPES = [
    { value: 'all', label: 'Alle' },
    { value: 'top', label: 'Obergärig' },
    { value: 'bottom', label: 'Untergärig' },
    { value: 'spontaneous', label: 'Spontan' },
    { value: 'mixed', label: 'Gemischt' },
  ];
  const ABV_PRESETS = [
    { value: 'all', label: 'Alle' },
    { value: 'session', label: 'Session < 4,5 %' },
    { value: 'craft', label: 'Craft 4,5–7 %' },
    { value: 'imperial', label: 'Imperial > 7 %' },
  ];
  const IBU_PRESETS = [
    { value: 'all', label: 'Alle' },
    { value: 'mild', label: 'Mild < 20' },
    { value: 'balanced', label: 'Ausgewogen 20–40' },
    { value: 'hoppy', label: 'Hopfig > 40' },
  ];

  // SectionHeader and Section are imported from ./_components/DiscoverSection
  // (extracted to prevent React from treating them as new component types on every render)

  // ── Desktop search input (rendered inside Header via slot) ──────────────
  const desktopSearchSlot = (
    <div className="relative w-full max-w-sm lg:max-w-md" ref={searchContainerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      <input
        ref={searchRef}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowSuggestions(true);
          setSuggestionIndex(-1);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSuggestionIndex(i => Math.min(i + 1, autocompleteSuggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSuggestionIndex(i => Math.max(i - 1, -1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestionIndex >= 0 && autocompleteSuggestions.length > 0) {
              setSearch(autocompleteSuggestions[suggestionIndex].label);
              saveRecentSearch(autocompleteSuggestions[suggestionIndex].label);
            } else if (search.trim()) {
              saveRecentSearch(search);
            }
            setShowSuggestions(false);
            setSuggestionIndex(-1);
          } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setSuggestionIndex(-1);
          }
        }}
        placeholder="Rezept, Stil oder Zutat suchen…"
        className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-zinc-600 rounded-lg pl-9 pr-8 py-2 outline-none text-sm text-white transition-all placeholder:text-zinc-600"
      />
      {search && (
        <button
          onClick={() => { setSearch(''); setShowSuggestions(false); searchRef.current?.focus(); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
          aria-label="Suche löschen"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {showSuggestions && (autocompleteSuggestions.length > 0 || !search) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-[60]">
          {!search && recentSearches.length > 0 && (
            <>
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Letzte Suchen</p>
              {recentSearches.map(s => (
                <button
                  key={s}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearch(s);
                    setShowSuggestions(false);
                    setSuggestionIndex(-1);
                    searchRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <Clock className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                  <span className="flex-1 truncate">{s}</span>
                </button>
              ))}
            </>
          )}
          {!search && recentSearches.length === 0 && (
            <div className="px-3 py-3">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Beliebte Suchen</p>
              {POPULAR_SEARCHES.slice(0, 6).map(s => (
                <button
                  key={s}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearch(s);
                    saveRecentSearch(s);
                    setShowSuggestions(false);
                    searchRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                >
                  <TrendingUp className="w-3 h-3 text-cyan-600" />
                  {s}
                </button>
              ))}
            </div>
          )}
          {autocompleteSuggestions.map((s, i) => (
            <button
              key={`${s.type}-${s.label}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setSearch(s.label);
                saveRecentSearch(s.label);
                setShowSuggestions(false);
                setSuggestionIndex(-1);
                searchRef.current?.focus();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                i === suggestionIndex
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span className="flex-shrink-0 text-zinc-600">
                {s.type === 'recipe'     && <Search className="w-3 h-3" />}
                {s.type === 'style'      && <span className="text-xs">🍺</span>}
                {s.type === 'ingredient' && <span className="text-xs">🌿</span>}
              </span>
              <span className="flex-1 truncate">{s.label}</span>
              <span className="text-[10px] text-zinc-600 flex-shrink-0">
                {s.type === 'recipe' ? 'Rezept' : s.type === 'style' ? 'Stil' : 'Zutat'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Mobile action buttons (rendered inside Header via slot) ─────────────
  const mobileActions = (
    <>
      <button
        onClick={() => setShowSearchOverlay(true)}
        className="p-2 text-zinc-400 hover:text-white transition-colors"
        aria-label="Suche öffnen"
      >
        <Search className="w-5 h-5" />
      </button>
      <button
        onClick={() => setShowBottomSheet(true)}
        className={`p-2 transition-colors ${isFiltering ? 'text-cyan-400' : 'text-zinc-400 hover:text-white'}`}
        aria-label="Filter öffnen"
      >
        <Filter className="w-5 h-5" />
        {isFiltering && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400" />}
      </button>
    </>
  );

  return (
    <>
      <Header discoverSearchSlot={desktopSearchSlot} discoverMobileActions={mobileActions} />
      {/* Full-width outer shell — no max-width cap */}
      <div className="w-full pt-0 pb-20">
        {/* Hero Banner - full bleed */}
        <div className="relative overflow-hidden mb-0 min-h-[260px] md:min-h-[300px] bg-zinc-900 border-b border-zinc-800">
          {/* Background image from first trending brew — using Next Image for LCP priority */}
          {trending[0]?.image_url && (
            <Image
              src={trending[0].image_url}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-[0.18]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/80 to-transparent" />

          <div className="relative flex items-center gap-8 px-6 md:px-12 lg:px-16 py-10 md:py-12 max-w-screen-2xl mx-auto">
            {/* Left: Text */}
            <div className="flex-1 min-w-0">
              <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-3">Community Discover</p>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
                Entdecke neue<br />
                <span className="text-cyan-400">Braukreationen</span>
              </h1>
              <p className="text-zinc-400 max-w-md text-sm md:text-base mb-6">
                Die besten Rezepte der Community — sortiert nach Bewertung, Trend und Neuheit.
              </p>
              <button
                onClick={() => { searchRef.current?.focus(); }}
                className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-5 py-2.5 rounded-xl transition-all text-sm"
              >
                <Search className="w-4 h-4" />
                Rezept suchen
              </button>
            </div>

            {/* Right: Image collage — up to 3 brew images */}
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              {(trending.slice(0, 3)).map((brew, i) => (
                <div
                  key={brew.id}
                  className="rounded-xl overflow-hidden border border-zinc-700/60 shadow-xl flex-shrink-0 bg-zinc-800"
                  style={{
                    width: i === 0 ? 200 : i === 1 ? 160 : 130,
                    height: i === 0 ? 200 : i === 1 ? 160 : 130,
                    marginTop: i === 1 ? -16 : i === 2 ? 12 : 0,
                    opacity: i === 0 ? 1 : i === 1 ? 0.85 : 0.65,
                  }}
                >
                  {brew.image_url ? (
                    <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                      <span className="text-zinc-500 text-3xl">🍺</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative flex items-center gap-6 px-6 md:px-12 lg:px-16 pb-5 flex-wrap max-w-screen-2xl mx-auto">
            {trending.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="font-bold text-white">{trending.length}</span> Trending Rezepte
              </div>
            )}
            {featured.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <BadgeCheck className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-bold text-white">{featured.length}</span> Empfehlungen
              </div>
            )}
            {topRated.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                <span className="font-bold text-white">{topRated.length}</span> Top-Bewertet
              </div>
            )}
          </div>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex gap-0 max-w-screen-2xl mx-auto">
          {/* Left Sidebar - always visible on desktop, scrolls naturally with page */}
          <aside className="hidden md:flex w-56 lg:w-64 xl:w-72 flex-shrink-0 flex-col border-r border-zinc-800/60 sticky top-14 self-start pt-8 pb-10 pl-6 md:pl-8 lg:pl-12 xl:pl-16 pr-6 space-y-8">

            {/* Sortierung */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Sortierung</h3>
              <div className="flex flex-col">
                {sortOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSort(value as any)}
                    className={`relative text-left py-1.5 text-sm transition-colors ${
                      sort === value
                        ? 'text-white font-semibold'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {sort === value && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-cyan-500 rounded-full" />
                    )}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bierstil */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Bierstil</h3>
              <div className="flex flex-col">
                <button
                  onClick={() => setStyleFilter('all')}
                  className={`relative text-left py-1.5 text-sm transition-colors ${
                    styleFilter === 'all' ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {styleFilter === 'all' && <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-cyan-500 rounded-full" />}
                  Alle Stile
                </button>
                {POPULAR_STYLES.map(style => (
                  <button
                    key={style}
                    onClick={() => setStyleFilter(style)}
                    className={`relative text-left py-1.5 text-sm transition-colors ${
                      styleFilter === style ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {styleFilter === style && <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-cyan-500 rounded-full" />}
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Braumethode */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Braumethode</h3>
              <div className="flex flex-col">
                {BREW_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setBrewTypeFilter(value as any)}
                    className={`relative text-left py-1.5 text-sm transition-colors ${
                      brewTypeFilter === value ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {brewTypeFilter === value && <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-cyan-500 rounded-full" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gärungstyp */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Gärungstyp</h3>
              <div className="flex flex-col">
                {FERMENTATION_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFermentationFilter(value as any)}
                    className={`relative text-left py-1.5 text-sm transition-colors ${
                      fermentationFilter === value ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {fermentationFilter === value && <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-cyan-500 rounded-full" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alkohol (ABV) */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Alkohol (ABV)</h3>
              <div className="flex flex-col">
                {ABV_PRESETS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setAbvPreset(value as any)}
                    className={`relative text-left py-1.5 text-sm transition-colors ${
                      abvPreset === value ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {abvPreset === value && <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-cyan-500 rounded-full" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bitterkeit (IBU) */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Bitterkeit (IBU)</h3>
              <div className="flex flex-col">
                {IBU_PRESETS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setIbuPreset(value as any)}
                    className={`relative text-left py-1.5 text-sm transition-colors ${
                      ibuPreset === value ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {ibuPreset === value && <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-cyan-500 rounded-full" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zutat (Hopfen/Malz) */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Zutat</h3>
              <div className="relative">
                <input
                  type="text"
                  list="ingredient-suggestions-desktop"
                  value={hopFilter}
                  onChange={(e) => setHopFilter(e.target.value)}
                  placeholder="z. B. Citra…"
                  className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                />
                {hopFilter && (
                  <button
                    onClick={() => setHopFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <datalist id="ingredient-suggestions-desktop">
                {allIngredientNames.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>

            {/* Einsteiger-Modus */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Schwierigkeitsgrad</h3>
              <button
                onClick={() => setBeginnerMode(v => !v)}
                className={`relative text-left py-1.5 text-sm transition-colors w-full ${
                  beginnerMode ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {beginnerMode && <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-cyan-500 rounded-full" />}
                Nur Einsteiger-Rezepte
              </button>
            </div>

            {/* Reset Link */}
            {isFiltering && (
              <button
                onClick={resetFilters}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-left"
              >
                ← Alle Filter zurücksetzen
              </button>
            )}
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 px-6 md:px-8 lg:px-10 xl:px-12 pt-8">
            {/* Mobile Fullscreen Search Overlay */}
            {showSearchOverlay && (
              <div className="md:hidden fixed inset-0 z-[60] bg-zinc-950 flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                  <button
                    onClick={() => setShowSearchOverlay(false)}
                    className="p-2 -ml-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
                    aria-label="Suche schließen"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      ref={overlaySearchRef}
                      autoFocus
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setSuggestionIndex(-1); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (suggestionIndex >= 0 && autocompleteSuggestions.length > 0) {
                            setSearch(autocompleteSuggestions[suggestionIndex].label);
                            saveRecentSearch(autocompleteSuggestions[suggestionIndex].label);
                          } else if (search.trim()) {
                            saveRecentSearch(search);
                          }
                          setShowSearchOverlay(false);
                        } else if (e.key === 'Escape') {
                          setShowSearchOverlay(false);
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSuggestionIndex(i => Math.min(i + 1, autocompleteSuggestions.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSuggestionIndex(i => Math.max(i - 1, -1));
                        }
                      }}
                      placeholder="Suchen…"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl pl-9 pr-9 py-2.5 outline-none text-sm text-white placeholder:text-zinc-500 transition-colors"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        aria-label="Eingabe löschen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                  {/* Recent searches (empty input) */}
                  {!search && recentSearches.length > 0 && (
                    <div className="px-4 pt-5 pb-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Letzte Suchen</p>
                        <button
                          onClick={() => {
                            setRecentSearches([]);
                            try { localStorage.removeItem('botllab_recent_searches'); } catch {}
                          }}
                          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                          Alle löschen
                        </button>
                      </div>
                      {recentSearches.map(s => (
                        <button
                          key={s}
                          onClick={() => { setSearch(s); saveRecentSearch(s); setShowSearchOverlay(false); }}
                          className="w-full flex items-center gap-3 py-3.5 text-left text-sm text-zinc-300 hover:text-white border-b border-zinc-800/40 last:border-0 transition-colors"
                        >
                          <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                          <span className="flex-1">{s}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Hint when no searches yet */}
                  {!search && recentSearches.length === 0 && (
                    <div className="px-4 pt-6 pb-2">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Beliebte Suchen</p>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_SEARCHES.map(s => (
                          <button
                            key={s}
                            onClick={() => { setSearch(s); saveRecentSearch(s); setShowSearchOverlay(false); }}
                            className="flex items-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Autocomplete suggestions while typing */}
                  {search && autocompleteSuggestions.length > 0 && (
                    <div className="px-4 pt-3 pb-2">
                      {autocompleteSuggestions.map((s, i) => (
                        <button
                          key={`${s.type}-${s.label}`}
                          onClick={() => {
                            setSearch(s.label);
                            saveRecentSearch(s.label);
                            setShowSearchOverlay(false);
                          }}
                          className={`w-full flex items-center gap-3 py-3.5 text-left text-sm border-b border-zinc-800/40 last:border-0 transition-colors ${
                            i === suggestionIndex ? 'text-cyan-400' : 'text-zinc-300 hover:text-white'
                          }`}
                        >
                          <span className="flex-shrink-0 w-5 text-center">
                            {s.type === 'recipe'     && <Search className="w-4 h-4 text-zinc-500 inline" />}
                            {s.type === 'style'      && <span className="text-base leading-none">🍺</span>}
                            {s.type === 'ingredient' && <span className="text-base leading-none">🌿</span>}
                          </span>
                          <span className="flex-1 truncate">{s.label}</span>
                          <span className="text-xs text-zinc-600 flex-shrink-0">{s.type === 'recipe' ? 'Rezept' : s.type === 'style' ? 'Stil' : 'Zutat'}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No suggestions while typing */}
                  {search && autocompleteSuggestions.length === 0 && (
                    <p className="px-4 py-12 text-center text-zinc-600 text-sm">Keine Vorschläge für „{search}"</p>
                  )}
                </div>
              </div>
            )}

        {/* Live Active Filter Summary */}
        {isFiltering && (
          <div className="flex items-center gap-3 mb-6 text-sm">
            <span className="text-zinc-300 font-medium">
              {list.length === 0
                ? 'Keine Treffer'
                : `${list.length} Rezept${list.length === 1 ? '' : 'e'} gefunden`}
            </span>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" /> Alles zurücksetzen
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 bg-zinc-900/40 rounded-2xl border border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div>
            {!isFiltering && !showAllGrid ? (
              <div className="space-y-4">
                 {/* Gerade angesagt 🔥 */}
                 {trending.length > 0 && (
                   <Section
                     icon={<Flame className="w-5 h-5 text-orange-500" />}
                     title="Gerade angesagt"
                     items={trending}
                     layout="hero-scroll"
                     onMore={() => { setSort('quality'); setShowAllGrid(true); }}
                     currentUserId={currentUserId}
                     isAdmin={isAdmin}
                   />
                 )}

                 {/* Empfohlen ✓ */}
                 {featured.length > 0 && (
                   <Section
                     icon={<BadgeCheck className="w-5 h-5 text-purple-500" />}
                     title="Empfohlen"
                     items={featured}
                     layout="hero-scroll"
                     onMore={() => { setSort('quality'); setShowAllGrid(true); }}
                     currentUserId={currentUserId}
                     isAdmin={isAdmin}
                   />
                 )}

                 {/* Für dich ✨ – personalisierte Empfehlungen */}
                 {currentUserId && personalizedBrews.length > 0 && (
                   <>
                     <Section
                       icon={<Sparkles className="w-5 h-5 text-cyan-400" />}
                       title={userBrews.length + brews.filter(b => b.user_has_liked).length >= NEEDS_MORE_DATA_THRESHOLD ? 'Für dich' : 'Empfohlen für dich'}
                       items={personalizedBrews}
                       layout="portrait-only"
                       onMore={() => { setSort('quality'); setShowAllGrid(true); }}
                       currentUserId={currentUserId}
                       isAdmin={isAdmin}
                       infoText={userBrews.length + brews.filter(b => b.user_has_liked).length < NEEDS_MORE_DATA_THRESHOLD
                         ? 'Personalisierung wird besser mit mehr Daten. Like noch ein paar Rezepte oder erstelle eigene Brews – dann passen wir diesen Feed genau auf deinen Geschmack an.'
                         : undefined}
                     />
                   </>
                 )}
                 {currentUserId && personalizedBrews.length === 0 && (
                   <div className="mb-10 flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
                     <Sparkles className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                     <p className="text-sm text-zinc-400 leading-relaxed">
                       <span className="font-semibold text-zinc-200">Dein persönlicher Feed wartet auf dich.</span>{' '}
                       Like mindestens {NEEDS_MORE_DATA_THRESHOLD} Rezepte oder erstelle eigene Brews — dann zeigen wir dir hier Empfehlungen, die wirklich zu dir passen.
                     </p>
                   </div>
                 )}

                 {/* Am besten bewertet ★ — ranked chart list */}
                 {topRated.length > 0 && (
                   <Section
                     icon={<Star className="w-5 h-5 text-yellow-500" />}
                     title="Am besten bewertet"
                     items={topRated}
                     layout="ranked-list"
                     onMore={() => { setSort('top'); setShowAllGrid(true); }}
                     currentUserId={currentUserId}
                     isAdmin={isAdmin}
                   />
                 )}

                 {/* Recipe Insight Banner */}
                 {trending.length > 0 && (() => {
                   const t = trending[0];
                   const ratingCount = t.ratings?.length ?? 0;
                   const avgR = ratingCount > 0
                     ? Math.round((t.ratings!.reduce((s, r) => s + r.rating, 0) / ratingCount) * 10) / 10
                     : null;
                   const copyCount = t.copy_count ?? 0;
                   const likesCount = t.likes_count ?? 0;

                   // Build a real "why popular" sentence from actual data
                   const facts: string[] = [];
                   if (ratingCount > 0) facts.push(`${ratingCount} Bewertung${ratingCount !== 1 ? 'en' : ''}${avgR ? ` (Ø ${avgR}★)` : ''}`);
                   if (copyCount > 0) facts.push(`${copyCount}× nachgebraut`);
                   if (likesCount > 0) facts.push(`${likesCount} Likes`);
                   const statsLine = facts.length > 0 ? facts.join(', ') + ' — ' : '';

                   const charParts: string[] = [];
                   if (t.abv != null) charParts.push(`${Number(t.abv).toFixed(1)}% Alkohol`);
                   if (t.ibu != null) charParts.push(Number(t.ibu) < 15 ? 'mildes Hopfenspiel' : Number(t.ibu) < 35 ? 'ausgewogene Bittere' : 'kräftiger Hopfencharakter');
                   const charLine = charParts.length > 0 ? `Mit ${charParts.join(' und ')} passt es zu vielen Geschmäckern.` : '';

                   return (
                     <div className="mb-12 relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800">
                       <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 to-zinc-900/80 pointer-events-none" />
                       
                       {/* Mobile Layout (Compact) */}
                       <div className="md:hidden relative z-10 p-4 flex gap-4 items-start">
                         <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800">
                           {t.image_url ? (
                             <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-2xl">🍺</div>
                           )}
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
                             <TrendingUp className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-bold uppercase tracking-wider">Rezept Insight</span>
                           </div>
                           <h3 className="text-base font-black text-white leading-tight mb-1.5">
                             Warum ist &ldquo;{t.name}&rdquo; so beliebt?
                           </h3>
                           <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2 mb-2">
                             {statsLine}Mit {charParts.join(' und ')} passt es zu vielen Geschmäckern.
                           </p>
                           <button
                             onClick={() => router.push(`/brew/${t.id}`)}
                             className="text-cyan-400 text-xs font-bold flex items-center gap-1"
                           >
                             Ansehen <ChevronRight className="w-3 h-3" />
                           </button>
                         </div>
                       </div>

                       {/* Desktop Layout (Full) */}
                       <div className="hidden md:flex relative z-10 p-10 items-center gap-8">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 text-cyan-400 mb-3">
                             <TrendingUp className="w-5 h-5" />
                             <span className="text-sm font-bold uppercase tracking-wider">Rezept Insight</span>
                           </div>
                           <h3 className="text-3xl font-black text-white mb-3">
                             Warum ist &ldquo;{t.name}&rdquo; so beliebt?
                           </h3>
                           <p className="text-zinc-400 text-base leading-relaxed mb-6">
                             {statsLine}dieses {t.style || 'Rezept'} trendet gerade in der Community. {charLine} Schau dir Zutaten und Maischeschritte selbst an.
                           </p>
                           <button
                             onClick={() => router.push(`/brew/${t.id}`)}
                             className="inline-flex items-center gap-2 border border-zinc-600 hover:border-cyan-500 text-zinc-300 hover:text-cyan-400 font-bold px-6 py-3 rounded-xl transition-all duration-200"
                           >
                             Rezept ansehen
                             <ChevronRight className="w-4 h-4" />
                           </button>
                         </div>
                         <div className="w-[30%] aspect-square rounded-2xl overflow-hidden flex-shrink-0">
                           {t.image_url ? (
                             <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                               <span className="text-4xl">🍺</span>
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                   );
                 })()}

                 {/* Community Highlight */}
                 {featured.length > 1 && (
                   <div className="mb-12">
                     <SectionHeader title="Community Highlight" icon={<Flame className="w-5 h-5 text-orange-500" />} count={1} />
                     <DiscoverBrewCard brew={featured[1]} currentUserId={currentUserId} isAdmin={isAdmin} variant="highlight" />
                   </div>
                 )}

                 {/* Neuheiten ✨ */}
                 {newest.length > 0 && (
                   <Section
                     icon={<Sparkles className="w-5 h-5 text-cyan-500" />}
                     title="Neuheiten"
                     items={newest}
                     layout="portrait-only"
                     onMore={() => { setSort('newest'); setShowAllGrid(true); }}
                     currentUserId={currentUserId}
                     isAdmin={isAdmin}
                   />
                 )}

                 {/* Alle Rezepte CTA */}
                 <div className="mt-8 pt-8 border-t border-zinc-900 flex flex-col items-center gap-3 text-center">
                    <p className="text-zinc-500 text-sm">{brews.length}{hasMore ? '+' : ''} Rezepte in der Community</p>
                    <button
                      onClick={() => setShowAllGrid(true)}
                      className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-white font-semibold px-6 py-3 rounded-xl transition-all"
                    >
                      <Filter className="w-4 h-4" />
                      Alle Rezepte durchsuchen
                    </button>
                 </div>
              </div>
            ) : (
              <div>
                {/* Back button when showing full grid without active filter */}
                {showAllGrid && !isFiltering && (
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setShowAllGrid(false)}
                      className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
                    >
                      ← Zurück zur Übersicht
                    </button>
                    <span className="text-zinc-500 text-sm">{list.length} Rezepte</span>
                  </div>
                )}
                <div className="animate-in fade-in duration-500">
                  {list.length > 0 ? (
                    <>
                      {/* Mobile: compact list */}
                      <div className="flex flex-col gap-2 md:hidden">
                        {list.map(brew => (
                          <DiscoverBrewCard key={brew.id} brew={brew} currentUserId={currentUserId} isAdmin={isAdmin} variant="compact" />
                        ))}
                      </div>
                      {/* Desktop: portrait grid */}
                      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {list.map(brew => (
                          <div key={brew.id}>
                            <DiscoverBrewCard brew={brew} currentUserId={currentUserId} isAdmin={isAdmin} variant="portrait" />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="col-span-full py-16 flex flex-col items-center gap-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <SearchX className="w-7 h-7 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg mb-1">Keine Rezepte gefunden</p>
                        <p className="text-zinc-500 text-sm max-w-sm">
                          Versuch einen anderen Suchbegriff oder setze die Filter zurück.
                        </p>
                      </div>
                      <button
                        onClick={resetFilters}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
                      >
                        Filter zurücksetzen
                      </button>
                      {suggestions.length > 0 && (
                        <div className="w-full mt-4">
                          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-4">
                            {styleFilter !== 'all' ? `Diese ${styleFilter}-Rezepte passen vielleicht:` : 'Diese Rezepte könnten dich interessieren:'}
                          </p>
                          <div className="flex flex-col gap-2">
                            {suggestions.map(brew => (
                              <DiscoverBrewCard key={brew.id} brew={brew} currentUserId={currentUserId} isAdmin={isAdmin} variant="compact" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Infinite Scroll Sentinel */}
                {list.length > 0 && (
                  <>
                    <div ref={sentinelRef} className="h-1" aria-hidden="true" />
                    {loadingMore && (
                      <div className="flex justify-center items-center py-10 gap-3 text-zinc-500 text-sm">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Weitere Rezepte laden…
                      </div>
                    )}
                    {!hasMore && !loadingMore && (
                      <p className="text-center text-zinc-700 text-xs py-8">
                        Alle {brews.length} Rezepte geladen
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
          </main>
        </div>
      </div>

      {/* Bottom Sheet: Mobile Filter */}
      {showBottomSheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowBottomSheet(false); setSheetDragY(0); }}
          />
          {/* Panel */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-xl shadow-2xl max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ transform: `translateY(${sheetDragY}px)`, transition: sheetDragY > 0 ? 'none' : 'transform 0.3s ease' }}
          >
            {/* Drag handle — pointer events only on this area */}
            <div
              className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={(e) => {
                sheetDragStartY.current = e.clientY;
                sheetIsDragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!sheetIsDragging.current) return;
                const delta = e.clientY - sheetDragStartY.current;
                if (delta > 0) setSheetDragY(delta);
              }}
              onPointerUp={() => {
                if (sheetDragY > 80) setShowBottomSheet(false);
                setSheetDragY(0);
                sheetIsDragging.current = false;
              }}
            >
              <div className="w-8 h-1 rounded-full bg-zinc-700" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-2 pb-3 flex-shrink-0 border-b border-zinc-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Filter &amp; Sortierung</span>
              <button
                onClick={() => { setShowBottomSheet(false); setSheetDragY(0); }}
                className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 touch-auto overscroll-contain divide-y divide-zinc-800/60">
              {/* Sortierung */}
              <div className="px-4 py-4">
                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-3">Sortierung</p>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSort(value as any)}
                      className={`text-sm px-3 py-2 rounded-lg border transition-all min-h-[38px] ${
                        sort === value
                          ? 'bg-white text-black font-semibold border-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Brautyp */}
              <div className="px-4 py-4">
                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-3">Brautyp</p>
                <div className="flex flex-wrap gap-2">
                  {BREW_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setBrewTypeFilter(value as 'all' | 'all_grain' | 'extract' | 'partial_mash')}
                      className={`text-sm px-3 py-2 rounded-lg border transition-all min-h-[38px] ${
                        brewTypeFilter === value
                          ? 'bg-white text-black font-semibold border-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Gärungstyp */}
              <div className="px-4 py-4">
                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-3">Gärungstyp</p>
                <div className="flex flex-wrap gap-2">
                  {FERMENTATION_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setFermentationFilter(value as 'all' | 'top' | 'bottom' | 'spontaneous' | 'mixed')}
                      className={`text-sm px-3 py-2 rounded-lg border transition-all min-h-[38px] ${
                        fermentationFilter === value
                          ? 'bg-white text-black font-semibold border-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Alkohol (ABV) */}
              <div className="px-4 py-4">
                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-3">Alkohol (ABV)</p>
                <div className="flex flex-wrap gap-2">
                  {ABV_PRESETS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setAbvPreset(value as 'all' | 'session' | 'craft' | 'imperial')}
                      className={`text-sm px-3 py-2 rounded-lg border transition-all min-h-[38px] ${
                        abvPreset === value
                          ? 'bg-white text-black font-semibold border-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Bitterkeit (IBU) */}
              <div className="px-4 py-4">
                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-3">Bitterkeit (IBU)</p>
                <div className="flex flex-wrap gap-2">
                  {IBU_PRESETS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setIbuPreset(value as 'all' | 'mild' | 'balanced' | 'hoppy')}
                      className={`text-sm px-3 py-2 rounded-lg border transition-all min-h-[38px] ${
                        ibuPreset === value
                          ? 'bg-white text-black font-semibold border-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Zutat */}
              <div className="px-4 py-4">
                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-3">Zutat (Hopfen oder Malz)</p>
                <div className="relative">
                  <input
                    type="text"
                    list="ingredient-suggestions-sheet"
                    value={hopFilter}
                    onChange={(e) => setHopFilter(e.target.value)}
                    placeholder="z. B. Citra, Hallertau, Pilsner Malz…"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors min-h-[38px]"
                  />
                  {hopFilter && (
                    <button
                      onClick={() => setHopFilter('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      aria-label="Löschen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <datalist id="ingredient-suggestions-sheet">
                  {allIngredientNames.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>
              {/* Einsteiger-Modus */}
              <div className="px-4 py-4">
                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-3">Schwierigkeitsgrad</p>
                <button
                  onClick={() => setBeginnerMode(v => !v)}
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all min-h-[38px] text-left ${
                    beginnerMode
                      ? 'bg-white text-black font-semibold border-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${beginnerMode ? 'border-black bg-black/10' : 'border-zinc-500'}`}>
                    {beginnerMode && <Check className="w-2.5 h-2.5" />}
                  </div>
                  Nur Einsteiger-Rezepte
                </button>
              </div>
            </div>
            {/* Sticky footer */}
            <div className="flex gap-2 px-4 py-3 border-t border-zinc-800 flex-shrink-0">
              <button
                onClick={() => { resetFilters(); setShowBottomSheet(false); setSheetDragY(0); }}
                className="flex-1 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-white font-medium text-sm hover:bg-zinc-800 transition-all"
              >
                Zurücksetzen
              </button>
              <button
                onClick={() => { setShowBottomSheet(false); setSheetDragY(0); }}
                className="flex-1 py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-zinc-100 transition-all"
              >
                Anwenden
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
