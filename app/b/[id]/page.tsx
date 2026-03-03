'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '../../components/Logo';
import BottleLabelSkeleton from './components/BottleLabelSkeleton';
import { toast } from 'sonner';
import { checkAndGrantAchievements } from '@/lib/achievements';
import RatingCTABlock from './components/RatingCTABlock';
import { trackBottleScan, trackConversion, incrementProfileViews } from '@/lib/actions/analytics-actions';
import { useAuth } from '@/app/context/AuthContext';
import RateBrewModal from './components/RateBrewModal';
import DrinkingConfirmationPrompt from './components/DrinkingConfirmationPrompt';
import BeatTheBrewerGame from './components/BeatTheBrewerGame';
import VibeCheck from './components/VibeCheck';
import StashButton from './components/StashButton';
import BrewBounties from './components/BrewBounties';
import { RatingSubmission } from '@/lib/types/rating';
import IngredientList from './components/IngredientList';
import type { BottleWithBrew, BreweryData, RatingData, TeamMember, BrewerProfile } from './types';

// Phase 9.3: static dark blur placeholder for hero Image (zinc-900 = #18181b)
const DARK_BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxODE4MWIiLz48L3N2Zz4=';

export default function PublicScanPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const { user } = useAuth();

  const [data, setData] = useState<BottleWithBrew | null>(null);
  const [profile, setProfile] = useState<BrewerProfile | null>(null);
  const [brewery, setBrewery] = useState<BreweryData | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rating States
  const [ratings, setRatings] = useState<RatingData[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasAlreadyRated, setHasAlreadyRated] = useState(false);
  const [existingRatingId, setExistingRatingId] = useState<string | null>(null);

  // Cap Collection
  const [collectingCap, setCollectingCap] = useState(false);
  const [capCollected, setCapCollected] = useState(false);
  // Phase 2.3: toggle to show more than 3 ratings
  const [showAllRatings, setShowAllRatings] = useState(false);
  // Phase 1.3: separate loading state for ratings section
  const [ratingsLoading, setRatingsLoading] = useState(true);
  // Phase 4.3: Scan-Zähler für sozialen Beweis
  const [scanCount, setScanCount] = useState<number | null>(null);
  // Phase 8.1: App-Mode des eingeloggten Users für drinker-aware Links
  const [userAppMode, setUserAppMode] = useState<string | null>(null);
  // Phase 11: Beat the Brewer nach Rating prominenter zeigen
  const [showBeatTheBrewer, setShowBeatTheBrewer] = useState(false);
  // Hero-Bild Fehlerbehandlung: Fallback wenn Image-URL nicht erreichbar
  const [heroImageError, setHeroImageError] = useState(false);

  // Tracking: Use ref to prevent multiple tracking calls
  const hasTrackedScan = useRef(false);
  // Phase 3.4: prevent double-fire of auto-claim on StrictMode / re-render
  const hasAutoClaimedRef = useRef(false);

  // Beat a Friend challenge (Phase 12.4)
  const challengeToken = searchParams.get('challenge') ?? undefined;
  const [challengerName, setChallengerName] = useState<string | null>(null);

  useEffect(() => {
    if (!challengeToken) return;
    import('@/lib/actions/beat-friend-actions').then(({ getFriendChallenge }) => {
      getFriendChallenge(challengeToken).then((challenge) => {
        if (challenge) setChallengerName(challenge.challengerDisplayName);
      });
    });
  }, [challengeToken]);

  // Phase 8.1: App-Mode des eingeloggten Users laden (für drinker-aware Collection-Link)
  useEffect(() => {
    if (!user?.id) { setUserAppMode(null); return; }
    // Supabase returns PromiseLike (not full Promise) — use .then() without .catch()
    supabase.from('profiles').select('app_mode').eq('id', user.id).maybeSingle().then(
      ({ data: profileResp }) => setUserAppMode(profileResp?.app_mode ?? null),
    );
  }, [user?.id]);

  // Supabase singleton imported


  useEffect(() => {
    async function fetchBottleInfo() {
      if (!id) return;

      // Check if ID is UUID or ShortCode
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id as string);
      
      let bottleQuery = supabase
        .from('bottles')
        .select('id, bottle_number, brew_id, session_id, filled_at');

      if (isUUID) {
        bottleQuery = bottleQuery.eq('id', id);
      } else {
        bottleQuery = bottleQuery.eq('short_code', id);
      }

      // Zunächst die Flasche laden mit der brew_id und session_id
      const { data: bottle, error: bottleError } = await bottleQuery.maybeSingle();

      if (bottleError) {
        console.error('[b/[id]] Supabase Error (bottle):', bottleError);
        setErrorMsg(bottleError.message);
        setLoading(false);
        return;
      }

      if (!bottle) {
        setErrorMsg("Flasche nicht gefunden");
        setLoading(false);
        return;
      }

      if (!bottle.brew_id) {
        console.warn("⚠️ Flasche hat keine brew_id!");
        setData({ ...bottle, brews: null, session: null } as BottleWithBrew);
        setLoading(false);
        return;
      }

      // Session und Brew parallel laden (beide brauchen nur bottle.brew_id / session_id)
      const [sessionResult, brewResult] = await Promise.all([
        bottle.session_id
          ? supabase.from('brewing_sessions').select('*').eq('id', bottle.session_id).single()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('brews')
          .select(`
            id,
            name,
            style,
            image_url,
            created_at,
            user_id,
            brewery_id,
            description,
            brew_type,
            data,
            remix_parent_id,
            cap_url,
            flavor_profile,
            moderation_status,
            moderation_rejection_reason
          `)
          .eq('id', bottle.brew_id)
          .maybeSingle(),
      ]);

      const sessionData = sessionResult.data;
      const brew = brewResult.data;
      const brewError = brewResult.error;

      if (brewError) {
        console.error('[b/[id]] Supabase Error (brew):', brewError);
      }

      setData(bottle ? { ...bottle, brews: brew, session: sessionData } as BottleWithBrew : null);

      // ===== TRACKING: Track bottle scan (only once!) =====
      if (bottle && brew && !hasTrackedScan.current) {
        hasTrackedScan.current = true; // Set immediately to prevent race conditions
        try {
          // Phase 7.2 — UTM params
          const utmSource   = searchParams.get('utm_source')   ?? undefined;
          const utmMedium   = searchParams.get('utm_medium')   ?? undefined;
          const utmCampaign = searchParams.get('utm_campaign') ?? undefined;

          // Phase 7.2 — Referrer domain (client-side, normalised)
          let referrerDomain: string | undefined;
          try {
            const rawRef = typeof document !== 'undefined' ? document.referrer : '';
            referrerDomain = rawRef
              ? new URL(rawRef).hostname.replace(/^www\./, '')
              : undefined;
          } catch { /* ignore malformed referrer */ }

          // Phase 7.3 — Derive scan source from UTM + referrer
          const SOCIAL_DOMAINS = [
            'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
            'tiktok.com', 'youtube.com', 'whatsapp.com', 'linkedin.com', 'untappd.com',
          ];
          let derivedScanSource: 'qr_code' | 'direct_link' | 'social' | 'share';
          if (utmMedium === 'qr') {
            derivedScanSource = 'qr_code';
          } else if (!referrerDomain) {
            // No referrer = likely a real QR-code scan (mobile browsers open QR links without referrer)
            derivedScanSource = 'qr_code';
          } else if (SOCIAL_DOMAINS.includes(referrerDomain)) {
            derivedScanSource = 'social';
          } else {
            derivedScanSource = 'direct_link';
          }

          trackBottleScan(bottle.id, {
            brewId:         brew.id,
            breweryId:      brew.brewery_id || undefined,
            viewerUserId:   user?.id || undefined,
            scanSource:     derivedScanSource,
            utmSource,
            utmMedium,
            utmCampaign,
            referrerDomain,
          });
        } catch (trackError) {
          console.error('[Analytics] Failed to track scan:', trackError);
          hasTrackedScan.current = false; // Reset on error to allow retry
        }
      }

      // Alle abhängigen Daten parallel laden (kein sequenzieller Wasserfall)
      const secondaryPromises: Promise<void>[] = [];

      if (brew?.brewery_id) {
        secondaryPromises.push(
          (async () => { const { data: breweryData } = await supabase.from('breweries').select('*').eq('id', brew.brewery_id).single(); setBrewery(breweryData); })(),
          (async () => { const { data: memberData } = await supabase.from('brewery_members').select('role, profiles:user_id(display_name, logo_url)').eq('brewery_id', brew.brewery_id); setTeam((memberData || []) as unknown as TeamMember[]); })(),
        );
      }

      if (brew?.user_id) {
        secondaryPromises.push(
          (async () => {
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', brew.user_id).maybeSingle();
            setProfile(profileData);
            // Phase 6.1: atomic server-action increment (no client-side race condition)
            incrementProfileViews(brew.user_id).catch(console.error);
          })(),
        );
      }

      if (brew?.id) {
        secondaryPromises.push(
          loadRatings(brew.id),
          checkCapCollected(brew.id),
          // Phase 4.3: Scan-Count parallel laden (bottle.id als Fremdschlüssel)
          (async () => {
            const { count } = await supabase.from('bottle_scans').select('*', { count: 'exact', head: true }).eq('bottle_id', bottle.id);
            setScanCount(count ?? 0);
          })(),
        );
      }

      // Phase 1.3: try/catch/finally — sekundäre Daten laden, Loading immer beenden
      try {
        await Promise.all(secondaryPromises);
      } catch (err) {
        console.error('[b/[id]] Error loading secondary data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBottleInfo();
  }, [id]); // Only re-run when bottle ID changes

  async function loadRatings(brewId: string) {
    setRatingsLoading(true);
    try {
    const { data: ratingsData } = await supabase
      .from('ratings')
      .select('*')
      .eq('brew_id', brewId)
      .eq('moderation_status', 'auto_approved')
      .order('created_at', { ascending: false });

    if (ratingsData) {
      setRatings(ratingsData);
      if (ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
    }

    // Duplicate-Check: eingeloggter User → Server, Anonym → localStorage
    if (user) {
      try {
        const checkRes = await fetch('/api/ratings/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brew_id: brewId, user_id: user.id }),
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.hasRated) {
            setHasAlreadyRated(true);
            if (checkData.ratingId) setExistingRatingId(checkData.ratingId);
          }
        }
      } catch (e) {
        console.error('[b/[id]] Failed to check rating status:', e);
      }
    } else {
      // Anonymer Nutzer: localStorage-Flag prüfen
      if (localStorage.getItem('botllab_rated_' + brewId) === '1') {
        setHasAlreadyRated(true);
      }
    }
    } finally {
      setRatingsLoading(false);
    }
  }

  async function submitRating(submissionData: RatingSubmission): Promise<string | null> {
    if (hasAlreadyRated) {
      toast.info('Du hast dieses Rezept bereits bewertet.');
      return null;
    }

    const brewId = data?.brews?.id;
    if (!brewId) {
      toast.error('Rezept nicht geladen — bitte Seite neu laden.');
      return null;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...submissionData,
        brew_id: brewId,
        qr_verified: true, // Route /b/[id] is only reachable via QR-code scan
      };

      const response = await fetch('/api/ratings/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Special Handling for Duplicate Rating (409)
        if (response.status === 409) {
          setHasAlreadyRated(true);

          // Try to recover ID via safe API check
          try {
            const checkRes = await fetch('/api/ratings/check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ brew_id: brewId, ...(user ? { user_id: user.id } : {}) }),
            });
            const checkData = await checkRes.json();
            if (checkData.hasRated && checkData.ratingId) {
              return checkData.ratingId;
            }
          } catch (e) { console.error('[b/[id]] 409 recovery:', e); }

          // Fallback
          toast.info('Du hast dieses Rezept bereits bewertet.');
          setShowRatingForm(false);
          return null;
        }

        console.error('[b/[id]] API Error:', result.error);
        toast.error(result.error ?? 'Unbekannter Fehler beim Senden.');
        return null;
      } else {
        setHasAlreadyRated(true);
        setShowBeatTheBrewer(true);
        localStorage.setItem('botllab_rated_' + brewId, '1');
        await loadRatings(brewId);

        // Track conversion for analytics (if user is logged in)
        if (user) {
          trackConversion(id, user.id).catch(console.error);
        }

        // Achievements im Hintergrund prüfen (für den Brew-Besitzer)
        if (data?.brews?.user_id) {
          checkAndGrantAchievements(data.brews.user_id).catch(console.error);
        }

        return result.rating.id;
      }
    } catch (err: any) {
      console.error('[b/[id]] Exception in submitRating:', err);
      toast.error('Fehler: ' + (err.message ?? 'Unbekannter Fehler'));
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function claimCap(ratingId?: string) {
    if (!user) {
      // Redirect to Login with Context — Preserve Params in Callback URL
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('action', 'claim_cap');
      if (ratingId) currentUrl.searchParams.set('rating_id', ratingId);
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl.toString())}&intent=drink`);
      return;
    }

    // Resolve rating ID: prefer explicit arg, fall back to existingRatingId from state
    const resolvedRatingId = ratingId ?? existingRatingId;

    if (!data?.brews) return; // guard: can't claim without a brew

    setCollectingCap(true);
    try {
      if (resolvedRatingId) {
        // ── API path (verifies rating, adopts orphan, tracks analytics) ──
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Sitzung abgelaufen — bitte neu einloggen.');
          window.location.reload();
          return;
        }

        const response = await fetch('/api/bottle-caps/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ brew_id: data.brews.id, rating_id: resolvedRatingId }),
        });
        const res = await response.json();

        if (!response.ok) {
          toast.error('Fehler beim Sammeln: ' + (res.error ?? 'Unbekannter Fehler'));
          return;
        }
      } else {
        // ── Fallback: direct insert (no rating link available) ──
        const { error } = await supabase
          .from('collected_caps')
          .insert([{ user_id: user.id, brew_id: data.brews.id }]);
        if (error) throw error;
      }

      setShowRatingForm(false);
      setCapCollected(true);
      // Phase 10.2: persist cap status in localStorage for fast-path on return visits
      if (data?.brews?.id) localStorage.setItem('botllab_cap_' + data.brews.id, '1');
      // Phase 8.1: drinker-aware Sammlung-Link im Erfolgs-Toast
      const collectionUrl = userAppMode === 'drinker' ? '/my-cellar/collection' : '/dashboard/collection';
      toast.success('Kronkorken gesammelt! 🍺', {
        action: { label: 'Sammlung ↗', onClick: () => router.push(collectionUrl) },
      });

      // Confetti (lazy load — nur wenn wirklich benötigt)
      const confetti = (await import('canvas-confetti')).default;
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      console.error('[b/[id]] claimCap error:', e);
      toast.error('Fehler beim Sammeln: ' + msg);
    } finally {
      setCollectingCap(false);
    }
  }

  // --- Auto-Claim Logic after Login ---
  useEffect(() => {
    if (!user || !data?.brews?.id) return;
    // Phase 3.4: prevent double-fire on StrictMode remount or re-render
    if (hasAutoClaimedRef.current) return;

    const action = searchParams.get('action');
    const claimRatingId = searchParams.get('rating_id');

    if (action === 'claim_cap' && claimRatingId) {
      hasAutoClaimedRef.current = true;

      // Clean URL first, then trigger claim
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('action');
      newParams.delete('rating_id');
      const cleanUrl = newParams.toString() ? `/b/${id}?${newParams.toString()}` : `/b/${id}`;
      router.replace(cleanUrl, { scroll: false });

      // Trigger Claim
      claimCap(claimRatingId);
    }
  }, [user, data, searchParams, id]);

  async function checkCapCollected(brewId: string) {
    // Phase 10.2: fast-path from localStorage (avoids DB round-trip on return visits)
    if (typeof window !== 'undefined' && localStorage.getItem('botllab_cap_' + brewId) === '1') {
      setCapCollected(true);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('collected_caps')
      .select('id')
      .eq('user_id', user.id)
      .eq('brew_id', brewId)
      .maybeSingle();
    setCapCollected(!!data);
    // Sync to localStorage so future visits use fast-path
    if (data) localStorage.setItem('botllab_cap_' + brewId, '1');
  }

  function handleStartRating() {
    if (!data?.brews?.id) return;
    fetch('/api/ratings/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brew_id: data.brews.id, ...(user ? { user_id: user.id } : {}) }),
    })
      .then(res => res.json())
      .then(res => {
        if (res.hasRated && res.ratingId) {
          setExistingRatingId(res.ratingId);
          setShowRatingForm(true);
          // Modal direkt auf 'success' setzen
          setTimeout(() => {
            const modal = document.querySelector('.RateBrewModal');
            if (modal) {
              // Simuliere den Schrittwechsel
              // Alternativ: setStep('success') im Modal per Prop
            }
          }, 100);
        } else {
          setShowRatingForm(true);
        }
      });
  }

  if (loading) {
    return <BottleLabelSkeleton />;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-6">🔍</span>
        <h1 className="text-2xl font-bold">Unbekannte ID</h1>
        <p className="text-zinc-500 mt-2">Diese Flasche existiert nicht in unserer Datenbank.</p>
        {errorMsg && <p className="text-red-500 text-xs mt-4 font-mono">{errorMsg}</p>}
        <p className="text-zinc-700 text-xs mt-4 font-mono">ID: {id}</p>
      </div>
    );
  }

  if (!data.brews) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-6">🫙</span>
        <h1 className="text-2xl font-bold">Flasche ist leer</h1>
        <p className="text-zinc-500 mt-2">Bottle #{data.bottle_number} ist aktuell keinem Rezept zugewiesen.</p>
        <p className="text-zinc-600 text-sm mt-4">Bitte den Braumeister kontaktieren!</p>
      </div>
    );
  }

  const brew = data.brews;
  const session = data.session;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = (session?.measurements as any) || {};

  // Merge Session Data over Recipe Data for Display
  const displayData = {
    ...brew.data,
    abv: m.abv || brew.data?.abv,
    ibu: m.ibu || brew.data?.ibu, // Session might not have IBU usually
    og: m.og || brew.data?.og,
    fg: m.fg || brew.data?.fg,
    vintage: session?.brewed_at ? new Date(session.brewed_at).getFullYear() : (brew.data?.vintage || new Date(brew.created_at || '').getFullYear()),
    year: session?.brewed_at ? new Date(session.brewed_at).getFullYear() : new Date(brew.created_at || '').getFullYear(),
    // Phase 4.2: session.bottling_date bevorzugen (Session-Datum akkurater als data.filled_at)
    bottling_date: (session?.bottling_date || m.bottling_date || data.filled_at)
      ? new Date(session?.bottling_date || m.bottling_date || data.filled_at || '').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null,
    brewed_at_display: session?.brewed_at
      ? new Date(session.brewed_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null,
    batch_number: session?.batch_number ?? null,
    // Wine/Cider specifics if session supports them
    ph: m.ph || brew.data?.pH,
  };

  // Volume Estimation Logic
  let estimatedBatchVolume = 0;
  if (!brew.brew_type || brew.brew_type === 'beer') {
    // 1. Calculate Total Grain Mass (kg)
    let totalGrainKg = 0;
    if (Array.isArray(brew.data?.malts)) {
      const parseAmount = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
        return 0;
      };
      brew.data.malts.forEach((m: any) => {
        let val = parseAmount(m.amount);
        if (m.unit && (m.unit.toLowerCase() === 'g' || m.unit.toLowerCase() === 'gramm')) val /= 1000;
        totalGrainKg += val;
      });
    }

    // 2. Estimate Volume based on Gravity Point Potential
    if (totalGrainKg > 0) {
      // Get Gravity in Points (e.g. 1.050 -> 50, 12P -> 48)
      let points = 50; // Default 1.050
      let og = parseFloat(displayData.og);

      if (!isNaN(og) && og > 0) {
        if (og > 2) {
          // Assume Plato
          points = og * 4;
        } else {
          // Assume SG
          points = (og - 1) * 1000;
        }
      }

      // Formula: (Mass_kg * Potential_PPS * Efficiency) / Desired_Points
      // Potential ~300 pts/kg/L (Sucrose is 384, Malt ~300)
      // Efficiency ~75% -> 220
      // Volume = (Mass * 220) / Points
      if (points > 0) {
        estimatedBatchVolume = (totalGrainKg * 220) / points;
      }
    }
  }

  // Phase 5.6: Exact session volume preferred; grain-mass formula is fallback only
  const batchVolume = session?.volume_liters ?? estimatedBatchVolume;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center">
      {/* Moderation Alerts */}
      {/* Pending Banner */}
      {brew.moderation_status === 'pending' && (
        <div className="w-full bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3 flex items-center justify-center gap-2 text-yellow-500 text-sm font-medium">
          <span>⏳</span> Dieses Bild wird geprüft und ist noch nicht öffentlich sichtbar (Dauer ca. 24h).
        </div>
      )}

      {/* 1. Das KI-Label als Hero-Bild - GRÖSSER */}
      <div className="relative w-full max-w-2xl mx-auto overflow-hidden">
        <div className="aspect-square w-full shadow-2xl relative">
          {brew.image_url && !heroImageError ? (
            <Image
              fill
              priority
              placeholder="blur"
              blurDataURL={DARK_BLUR_PLACEHOLDER}
              src={brew.image_url}
              alt={brew.name}
              onError={() => setHeroImageError(true)}
              sizes="(max-width: 768px) 100vw, 672px"
              className={`object-cover ${(brew.moderation_status === 'pending') ? 'filter blur-md brightness-50' : ''}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center border-b border-zinc-800">
              <span className="text-9xl opacity-20">🍺</span>
            </div>
          )}

          {brew.moderation_status === 'pending' && brew.image_url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-white/50 tracking-widest uppercase">In Prüfung</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-6 left-6 flex flex-col gap-2 items-start">
          <span className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-widest shadow-xl inline-flex items-center gap-2">
            {brew.brew_type === 'beer' ? 'Bier' :
              brew.brew_type === 'wine' ? 'Wein' :
                brew.brew_type === 'cider' ? 'Cider' :
                  brew.brew_type === 'mead' ? 'Met' :
                    brew.brew_type === 'softdrink' ? 'Softdrink' : 'Bier'}
          </span>

          {brew.remix_parent_id && (
            <span className="bg-black/60 backdrop-blur-md border border-amber-500 px-4 py-2 rounded-full text-amber-500 text-xs font-bold uppercase tracking-widest shadow-xl inline-flex items-center gap-2">
              Remix
            </span>
          )}
          {/* Phase 4.1: Flaschennummer als dezentes Badge */}
          {data.bottle_number !== null && data.bottle_number !== undefined && (
            <span className="bg-black/60 backdrop-blur-md border border-zinc-700 px-3 py-1 rounded-full text-zinc-400 text-xs font-bold tracking-widest shadow-xl inline-flex items-center gap-1">
              <span className="text-zinc-600">#</span>{data.bottle_number}
            </span>
          )}
        </div>
      </div>

      {/* 2. Content Container */}
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Header — Name + Style, description moves below CTA (Phase 2.1) */}
        <header className="text-center space-y-2">
          <span className="inline-block text-cyan-400 text-xs font-black uppercase tracking-[0.3em] px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            {brew.style || 'Handcrafted'}
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
            {brew.name}
          </h1>
          {/* Phase 4.3: Dezentes Scan-Badge — ab 2 Scans als sozialer Beweis */}
          {scanCount !== null && scanCount >= 2 && (
            <p className="text-xs text-zinc-500 flex items-center justify-center gap-1">
              🔍 {scanCount}× gescannt
            </p>
          )}
        </header>

        <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

        {/* Stats Grid - Prominenter */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-lg">
            <p className="text-[10px] text-cyan-400 uppercase font-bold mb-2 tracking-wider">Alkohol</p>
            <p className="font-black text-3xl text-white tracking-tight">{displayData.abv || '0.0'}</p>
            <p className="text-[9px] text-zinc-600 uppercase mt-1">% Vol.</p>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-lg">
            {(!brew.brew_type || brew.brew_type === 'beer') ? (
              <>
                <p className="text-[10px] text-amber-400 uppercase font-bold mb-2 tracking-wider">Bittere</p>
                <p className="font-black text-3xl text-white tracking-tight">{displayData.ibu || '-'}</p>
                <p className="text-[9px] text-zinc-600 uppercase mt-1">IBU</p>
              </>
            ) : brew.brew_type === 'wine' ? (
              <>
                <p className="text-[10px] text-purple-400 uppercase font-bold mb-2 tracking-wider">Säure</p>
                <p className="font-black text-3xl text-white tracking-tight">
                  {displayData.acidity_g_l || '-'}
                </p>
                <p className="text-[9px] text-zinc-600 uppercase mt-1">g/L</p>
              </>
            ) : (
              <>
                <p className="text-[10px] text-pink-400 uppercase font-bold mb-2 tracking-wider">Zucker</p>
                <p className="font-black text-3xl text-white tracking-tight">
                  {displayData.sugar_g_l || '-'}
                </p>
                <p className="text-[9px] text-zinc-600 uppercase mt-1">g/L</p>
              </>
            )}
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-lg">
            <p className="text-[10px] text-emerald-400 uppercase font-bold mb-2 tracking-wider">
              {(!brew.brew_type || brew.brew_type === 'beer') ? 'Farbe' : (displayData.bottling_date ? 'Abfülldatum' : (brew.brew_type === 'wine' ? 'Jahrgang' : 'Jahr'))}
            </p>
            <p className="font-black text-3xl text-white tracking-tight">
              {(!brew.brew_type || brew.brew_type === 'beer') ? (displayData.color || '-') : (displayData.bottling_date || (brew.brew_type === 'wine' ? displayData.vintage : displayData.year))}
            </p>
            {(!brew.brew_type || brew.brew_type === 'beer') && (
              <p className="text-[9px] text-zinc-600 uppercase mt-1">EBC</p>
            )}
          </div>
        </div>

        {/* Phase 2.1 Tier 1: VibeCheck — above fold on mobile */}
        <VibeCheck
          brewId={brew.id}
          isLoggedIn={!!user}
        />

        {/* Phase 2.2 Tier 2: Kompakter Rating + Cap CTA */}
        <RatingCTABlock
          avgRating={avgRating}
          ratingCount={ratings.length}
          hasAlreadyRated={hasAlreadyRated}
          capCollected={capCollected}
          collectingCap={collectingCap}
          capUrl={brew.cap_url}
          onRate={() => setShowRatingForm(true)}
          onClaim={() => claimCap()}
        />

        {/* Rating Modal — inline, direkt nach CTA */}
        {showRatingForm && (
          <RateBrewModal
            brewId={data?.brews?.id || ''}
            onSubmit={async (submissionData) => {
              const payload = { ...submissionData, user_id: user?.id };
              return await submitRating(payload);
            }}
            onCancel={() => setShowRatingForm(false)}
            isSubmitting={submitting}
            onClaimCap={claimCap}
            existingRatingId={existingRatingId}
            currentUser={user}
          />
        )}

        {/* Phase 2.1 #7: Kurzbeschreibung — nach CTA, unter dem Fold */}
        {brew.description && (
          <p className="text-zinc-400 text-base leading-relaxed italic text-center">
            {brew.description}
          </p>
        )}

        {/* Phase 2.3: Bewertungen inline — max. 3, mit Mehr-anzeigen-Toggle */}
        {ratingsLoading ? (
          <div className="space-y-3 animate-pulse" aria-label="Bewertungen werden geladen">
            {[1, 2].map(i => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-1/3" />
                <div className="h-2 bg-zinc-800 rounded w-1/4 mt-1" />
                <div className="h-3 bg-zinc-800 rounded w-3/4 mt-2" />
              </div>
            ))}
          </div>
        ) : ratings.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-black tracking-[0.25em] text-zinc-500">Bewertungen</p>
            {ratings.slice(0, showAllRatings ? undefined : 3).map(rating => (
              <div key={rating.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-white">{rating.author_name}</p>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star} className={`text-sm ${star <= rating.rating ? 'text-yellow-500' : 'text-zinc-700'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600">
                    {new Date(rating.created_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
                {rating.comment && (
                  <p className="text-sm text-zinc-400 leading-relaxed">{rating.comment}</p>
                )}
              </div>
            ))}
            {ratings.length > 3 && (
              <button
                onClick={() => setShowAllRatings(prev => !prev)}
                className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-2 transition"
              >
                {showAllRatings ? '▲ Weniger anzeigen' : `▼ Alle ${ratings.length} Bewertungen anzeigen`}
              </button>
            )}
          </div>
        ) : (
          <p className="text-center text-zinc-600 text-sm py-2 italic">
            Noch keine Bewertungen — sei der Erste! ⭐
          </p>
        )}

        {/* Details Section - TYPE SPECIFIC */}
        {brew.data && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xs uppercase font-black tracking-[0.3em] text-cyan-400 mb-4">Details</h2>

            {/* BEER Details */}
            {(!brew.brew_type || brew.brew_type === 'beer') && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* 1. RESULTS / MESSWERTE */}
                <div className="space-y-1">
                  <p className="text-zinc-500 text-xs uppercase font-bold">Abgefüllt am</p>
                  <p className="text-white font-mono">{displayData.bottling_date || displayData.year}</p>
                </div>

                {displayData.srm && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Farbe (SRM)</p>
                    <p className="text-white font-mono">{displayData.srm}</p>
                  </div>
                )}
                {brew.data.carbonation_g_l && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Karbonisierung</p>
                    <p className="text-white font-mono">{brew.data.carbonation_g_l} g/l</p>
                  </div>
                )}

                {/* 2. ZUTATEN / INGREDIENTS */}
                {brew.data.malts && (
                  <div className="space-y-1 col-span-2 pt-2 border-t border-zinc-800/50">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Malzarten</p>
                    <div className="text-white"><IngredientList items={brew.data.malts} mode={{ type: 'grams_per_liter', volume: batchVolume }} /></div>
                  </div>
                )}
                {brew.data.hops && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hopfen</p>
                    <div className="text-white"><IngredientList items={brew.data.hops} mode={{ type: 'grams_per_liter', volume: batchVolume }} /></div>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hefe</p>
                    <div className="text-white"><IngredientList items={brew.data.yeast} mode={{ type: 'grams_per_liter', volume: batchVolume }} /></div>
                  </div>
                )}
                {brew.data.dry_hop_g && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Dry Hop</p>
                    <p className="text-white">{brew.data.dry_hop_g} g</p>
                  </div>
                )}
              </div>
            )}

            {/* WINE Details */}
            {brew.brew_type === 'wine' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.grapes && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Rebsorten</p>
                    <div className="text-white"><IngredientList items={brew.data.grapes} mode="percentage" /></div>
                  </div>
                )}
                {brew.data.region && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Region</p>
                    <p className="text-white">{brew.data.region}</p>
                  </div>
                )}
                {brew.data.vintage && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Jahrgang</p>
                    <p className="text-white">{brew.data.vintage}</p>
                  </div>
                )}
                {brew.data.oak_aged && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Barrique</p>
                    <p className="text-white">
                      {brew.data.oak_months ? `${brew.data.oak_months} Monate im Holzfass` : 'Im Holzfass gereift'}
                    </p>
                  </div>
                )}
                {brew.data.residual_sugar_g_l && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Restzucker</p>
                    <p className="text-white">{brew.data.residual_sugar_g_l} g/L</p>
                  </div>
                )}
                {brew.data.sulfites && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hinweis</p>
                    <p className="text-white">Enthält Sulfite</p>
                  </div>
                )}
              </div>
            )}

            {/* CIDER Details */}
            {brew.brew_type === 'cider' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.apples && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Apfelsorten</p>
                    <div className="text-white"><IngredientList items={brew.data.apples} mode="percentage" /></div>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hefe</p>
                    <div className="text-white"><IngredientList items={brew.data.yeast} mode="name_only" /></div>
                  </div>
                )}
                {brew.data.fermentation && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Gärung</p>
                    <p className="text-white capitalize">{brew.data.fermentation === 'wild' ? 'Wild' : 'Reinzucht'}</p>
                  </div>
                )}
                {brew.data.sweetness && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Süßegrad</p>
                    <p className="text-white capitalize">
                      {brew.data.sweetness === 'dry' ? 'Trocken' : brew.data.sweetness === 'semi' ? 'Halbtrocken' : 'Süß'}
                    </p>
                  </div>
                )}
                {brew.data.carbonation_g_l && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Kohlensäure</p>
                    <p className="text-white">{brew.data.carbonation_g_l} g/L</p>
                  </div>
                )}
                {brew.data.pH && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">pH-Wert</p>
                    <p className="text-white">{brew.data.pH}</p>
                  </div>
                )}
              </div>
            )}

            {/* MEAD Details */}
            {brew.brew_type === 'mead' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.honey && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Honigsorten</p>
                    <div className="text-white"><IngredientList items={brew.data.honey} mode="percentage" /></div>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hefe</p>
                    <div className="text-white"><IngredientList items={brew.data.yeast} mode="name_only" /></div>
                  </div>
                )}
                {brew.data.adjuncts && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Zutaten</p>
                    <div className="text-white"><IngredientList items={brew.data.adjuncts} /></div>
                  </div>
                )}
                {brew.data.aging_months && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Reifung</p>
                    <p className="text-white">{brew.data.aging_months} Monate</p>
                  </div>
                )}
                {brew.data.final_gravity && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Final Gravity</p>
                    <p className="text-white font-mono">{brew.data.final_gravity}</p>
                  </div>
                )}
              </div>
            )}

            {/* SOFTDRINK Details */}
            {brew.brew_type === 'softdrink' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.base && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Basis / Geschmack</p>
                    <p className="text-white">{brew.data.base}</p>
                  </div>
                )}
                {brew.data.carbonation_g_l && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Kohlensäure</p>
                    <p className="text-white">{brew.data.carbonation_g_l} g/L</p>
                  </div>
                )}
                {brew.data.acidity_ph && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">pH-Wert</p>
                    <p className="text-white">{brew.data.acidity_ph}</p>
                  </div>
                )}
                {brew.data.natural_flavors && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Aromen</p>
                    <p className="text-white">Natürliche Aromen</p>
                  </div>
                )}
                {brew.data.coloring && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hinweis</p>
                    <p className="text-white">Mit Farbstoff</p>
                  </div>
                )}
              </div>
            )}

            {/* Phase 4.2: Session-Informationen — Braudatum & Batch-Nummer */}
            {(displayData.brewed_at_display || displayData.batch_number) && (
              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-zinc-800/50">
                {displayData.brewed_at_display && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Gebraut am</p>
                    <p className="text-white font-mono">{displayData.brewed_at_display}</p>
                  </div>
                )}
                {displayData.batch_number && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Batch</p>
                    <p className="text-white font-mono">#{displayData.batch_number}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Phase 2.1 / Phase 11.1 Tier 3: Beat the Brewer — nach Rating prominent, sonst nur bei Flavor Profile */}
        {brew.flavor_profile && (hasAlreadyRated || showBeatTheBrewer) && (
          <div className={showBeatTheBrewer ? 'animate-in fade-in slide-in-from-bottom-4 duration-300' : ''}>
            {showBeatTheBrewer && (
              <p className="text-[10px] uppercase font-black tracking-[0.25em] text-cyan-500 text-center mb-2">
                Zeig, ob du den Geschmack genauso wahrnimmst wie der Brauer →
              </p>
            )}
            <BeatTheBrewerGame
              brewId={brew.id}
              brewName={brew.name || 'Dieses Bier'}
              isLoggedIn={!!user}
              challengeToken={challengeToken}
              challengerName={challengerName}
            />
          </div>
        )}

        {/* ── Tier 3 / Tier 4 Trenner ── */}
        <div className="relative flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-zinc-700 select-none">Community</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Phase 2.1 Tier 4: Stash & Bounties */}
        <StashButton
          brewId={brew.id}
          brewName={brew.name || 'Dieses Bier'}
        />
        <BrewBounties brewId={brew.id} />

        {/* Tier 4: Vollständiges Rezept — ans Ende verschoben */}
        <Link
          href={`/brew/${brew.id}`}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-center py-4 rounded-xl font-bold transition border border-zinc-700 shadow-lg block"
        >
          📖 Vollständiges Rezept
        </Link>

        {/* --- Link zur Brauerei & Team --- */}
        {brewery && (
          <div className="space-y-4 mt-8">
            <Link
              href={`/brewery/${brewery.id}`}
              className="block group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:bg-zinc-800 transition shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden shrink-0">
                  {brewery.logo_url && brewery.moderation_status !== 'pending' ? (
                    <Image fill src={brewery.logo_url} alt={brewery.name ?? 'Brauerei-Logo'} className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🏰</div>
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-1">Brauerei</p>
                  <h3 className="font-bold text-xl text-white truncate group-hover:text-cyan-400 transition">
                    {brewery.name} ↗
                  </h3>
                  {brewery.location && <p className="text-xs text-zinc-500 mt-1">📍 {brewery.location}</p>}
                </div>
              </div>
            </Link>

            {/* Team Avatars */}
            {team.length > 0 && (
              <div className="flex flex-col items-center gap-3 py-2">
                <p className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-600">Das Brau-Team</p>
                <div className="flex -space-x-2">
                  {team.map((m, i) => (
                    <div
                      key={i}
                      className="relative w-8 h-8 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center overflow-hidden"
                      title={m.profiles?.display_name ?? undefined}
                    >
                      {m.profiles?.logo_url ? (
                        <Image fill src={m.profiles.logo_url ?? ''} alt={m.profiles?.display_name ?? ''} className="object-cover" sizes="32px" />
                      ) : (
                        <span className="text-[10px]">👤</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="pt-12 pb-6 text-center opacity-40 hover:opacity-100 transition-opacity duration-500 flex flex-col items-center">
          <div className="mb-2">
            <Logo className="w-5 h-5" textSize="text-xs" />
          </div>
          <p className="text-[9px] text-zinc-700 font-medium">Digital Label System</p>
          <div className="mt-4">
            <Link href="/impressum" className="text-[10px] text-zinc-600 hover:text-zinc-400 hover:underline transition">
              Impressum
            </Link>
          </div>
          <p className="text-[8px] text-zinc-800 mt-2 font-mono">{data.id}</p>
        </footer>
      </div>

      {/* Phase 9.4: Drinker-Bestätigungs-Prompt (Smart Sampling) */}
      <DrinkingConfirmationPrompt
        bottleId={data.id}
        isOwner={user?.id === data?.brews?.user_id}
      />
    </div>
  );
}
