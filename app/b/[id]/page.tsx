'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '../../components/Logo';
import Footer from '../../components/Footer';
import BottleLabelSkeleton from './components/BottleLabelSkeleton';
import { toast } from 'sonner';
import RatingCTABlock from './components/RatingCTABlock';
import { trackBottleScan, incrementProfileViews } from '@/lib/actions/analytics-actions';
import { useAuth } from '@/app/context/AuthContext';
import RateBrewModal from './components/RateBrewModal';
import DrinkingConfirmationPrompt from './components/DrinkingConfirmationPrompt';
import BeatTheBrewerGame from './components/BeatTheBrewerGame';
import { checkBrewHasFlavorProfile } from '@/lib/actions/beat-the-brewer-actions';
import VibeCheck from './components/VibeCheck';
import StashButton from './components/StashButton';
import BrewBounties from './components/BrewBounties';
import { useQrVerification } from '@/lib/hooks/useQrVerification';
import { RatingSubmission } from '@/lib/types/rating';
import { rollCapTier, type CapTier } from '@/lib/cap-tier';
import IngredientList from './components/IngredientList';
import GeoConsentPrompt from './components/GeoConsentPrompt';
import ShopLink from './components/ShopLink';
import type { BottleWithBrew, BreweryData, RatingData, TeamMember, BrewerProfile } from './types';
import { Clock, Search, Package, Beer, BookOpen, MapPin, Building2, User, Star, ChevronUp, ChevronDown, Lock, QrCode } from 'lucide-react';

// Phase 9.3: static dark blur placeholder for hero Image (zinc-900 = #18181b)
const DARK_BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxODE4MWIiLz48L3N2Zz4=';

export default function PublicScanPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawId = params?.id as string;
  const { user } = useAuth();

  // Parse dot-separated format: /b/ID.TOKEN → bottleId + pathToken
  const dotIndex = rawId?.indexOf('.') ?? -1;
  const id = dotIndex > 0 ? rawId.substring(0, dotIndex) : rawId;
  const pathToken = dotIndex > 0 ? rawId.substring(dotIndex + 1) : null;

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
  const [capTier, setCapTier] = useState<CapTier>('zinc');
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
  // Late Reveal: only flag, actual profile stays server-side
  const [hasFlavorProfile, setHasFlavorProfile] = useState(false);
  // Phase 11.2: VibeCheck abgeschlossen → RatingCTABlock kurz hervorheben
  const [ratingCTAHighlight, setRatingCTAHighlight] = useState(false);
  // Hero-Bild Fehlerbehandlung: Fallback wenn Image-URL nicht erreichbar
  const [heroImageError, setHeroImageError] = useState(false);
  // Phase 12.1: GeoConsentPrompt nach Star-Rating einblenden
  const [showGeoConsent, setShowGeoConsent] = useState(false);
  // Phase 5.1: Brewer darf eigenes Bier nicht spielen
  const [isBreweryMember, setIsBreweryMember] = useState(false);

  // Tracking: Use ref to prevent multiple tracking calls
  const hasTrackedScan = useRef(false);
  // Phase 3.4: prevent double-fire of auto-claim on StrictMode / re-render
  const hasAutoClaimedRef = useRef(false);

  // Beat a Friend challenge (Phase 12.4)
  const challengeToken = searchParams.get('challenge') ?? undefined;
  const [challengerName, setChallengerName] = useState<string | null>(null);

  // QR Verification: Check if user arrived via physical QR scan
  // Supports new dot-separator format (/b/ID.TOKEN) and legacy query param (?_t=TOKEN)
  const { isQrVerified, isVerifying: isQrVerifying, qrToken } = useQrVerification(data?.id ?? null, pathToken);

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

          // Phase 7.3 — Derive scan source from UTM + referrer + QR token
          // New QR codes embed an HMAC token via dot separator: /b/ID.TOKEN
          // Legacy format via query param (?_t=TOKEN) also supported.
          const SOCIAL_DOMAINS = [
            'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
            'tiktok.com', 'youtube.com', 'whatsapp.com', 'linkedin.com', 'untappd.com',
          ];
          const hasQrToken = !!pathToken || !!searchParams.get('_t');
          let derivedScanSource: 'qr_code' | 'direct_link' | 'social' | 'share';
          if (hasQrToken || utmMedium === 'qr') {
            derivedScanSource = 'qr_code';
          } else if (!referrerDomain) {
            // No referrer = likely QR scan (camera app) or direct URL entry
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
        // Phase 5.1: Check if current user is a member of this brew's brewery
        if (user?.id) {
          secondaryPromises.push(
            (async () => {
              const { data: membership } = await supabase.from('brewery_members').select('id').eq('brewery_id', brew.brewery_id).eq('user_id', user.id).maybeSingle();
              setIsBreweryMember(!!membership);
            })(),
          );
        }
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
          // Late Reveal: check server-side, don't send actual profile values to client
          checkBrewHasFlavorProfile(brew.id).then(setHasFlavorProfile).catch(() => {}),
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
        qr_verified: isQrVerified,
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

        // Track conversion + Achievements werden jetzt server-seitig in der API Route geprüft
        // (mit Admin-Client → kein RLS-Problem)

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
        if (res.cap_tier) setCapTier(res.cap_tier as CapTier);
      } else {
        // ── Fallback: direct insert (no rating link available) ──
        const tier = rollCapTier();
        const { error } = await supabase
          .from('collected_caps')
          .insert([{ user_id: user.id, brew_id: data.brews.id, cap_tier: tier }]);
        if (error) throw error;
        setCapTier(tier);
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
      // Tier from localStorage (stored after first claim)
      const storedTier = localStorage.getItem('botllab_cap_tier_' + brewId) as CapTier | null;
      if (storedTier) setCapTier(storedTier);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('collected_caps')
      .select('id, cap_tier')
      .eq('user_id', user.id)
      .eq('brew_id', brewId)
      .maybeSingle();
    setCapCollected(!!data);
    if (data) {
      const tier = (data.cap_tier as CapTier) ?? 'zinc';
      setCapTier(tier);
      localStorage.setItem('botllab_cap_' + brewId, '1');
      localStorage.setItem('botllab_cap_tier_' + brewId, tier);
    }
  }

  function handleStartRating() {
    // Smooth scroll down to the gamification CTA section
    const scrollToCTA = () => {
      setTimeout(() => {
        const ctaSection = document.getElementById('gamification-cta-section');
        if (ctaSection) {
          ctaSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight it briefly
          setRatingCTAHighlight(true);
          setTimeout(() => setRatingCTAHighlight(false), 2000);
        }
      }, 50);
    };

    scrollToCTA();
  }

  if (loading) {
    return <BottleLabelSkeleton />;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-6">
          <Search className="w-6 h-6 text-text-muted" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Unbekannte ID</h1>
        <p className="text-text-muted mt-2">Diese Flasche existiert nicht in unserer Datenbank.</p>
        {errorMsg && <p className="text-red-500 text-xs mt-4 font-mono">{errorMsg}</p>}
        <p className="text-text-disabled text-xs mt-4 font-mono">ID: {id}</p>
      </div>
    );
  }

  if (!data.brews) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-6">
          <Package className="w-6 h-6 text-text-muted" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Flasche ist leer</h1>
        <p className="text-text-muted mt-2">Bottle #{data.bottle_number} ist aktuell keinem Rezept zugewiesen.</p>
        <p className="text-text-disabled text-sm mt-4">Bitte den Braumeister kontaktieren!</p>
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
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      {/* Moderation Alerts */}
      {/* Pending Banner */}
      {brew.moderation_status === 'pending' && (
        <div className="w-full bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3 flex items-center justify-center gap-2 text-yellow-500 text-sm font-medium">
          <Clock className="w-4 h-4" /> Dieses Bild wird geprüft und ist noch nicht öffentlich sichtbar (Dauer ca. 24h).
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
              unoptimized={brew.image_url.startsWith('http://127.') || brew.image_url.startsWith('http://localhost')}
              className={`object-cover ${(brew.moderation_status === 'pending') ? 'filter blur-md brightness-50' : ''}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-950 via-zinc-900 to-zinc-950 flex items-center justify-center border-b border-border">
              <Beer className="w-24 h-24 opacity-20 text-text-disabled" />
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
            <span className="bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-white/70 text-xs font-bold tracking-widest shadow-xl inline-flex items-center gap-1">
              <span className="text-white/40">#</span>{data.bottle_number}
            </span>
          )}
        </div>
      </div>

      {/* 2. Content Container */}
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Header — Name + Style, description moves below CTA (Phase 2.1) */}
        <header className="text-center space-y-2">
          <span className="inline-block text-brand text-xs font-black tracking-normal px-4 py-1 rounded-full bg-brand/10 border border-brand/20">
            {(brew.style || 'Handcrafted').toUpperCase()}
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
            {brew.name}
          </h1>
          {/* Phase 4.3: Dezentes Scan-Badge — ab 2 Scans als sozialer Beweis */}
          {scanCount !== null && scanCount >= 2 && (
            <p className="text-xs text-text-muted flex items-center justify-center gap-1">
              <Search className="w-3 h-3" /> {scanCount}× gescannt
            </p>
          )}
        </header>

        {/* Beschreibung — direkt unter dem Namen, wichtigste Info zuerst */}
        {brew.description && (
          <p className="text-text-secondary text-base leading-relaxed italic text-center">
            {brew.description}
          </p>
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Stats Grid - Prominenter */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface/50 p-5 rounded-2xl border border-border shadow-lg">
            <p className="text-[10px] text-brand uppercase font-bold mb-2 tracking-wider">Alkohol</p>
            <p className="font-black text-3xl text-text-primary tracking-tight">{displayData.abv || '0.0'}</p>
            <p className="text-[9px] text-text-disabled uppercase mt-1">% Vol.</p>
          </div>

          <div className="bg-surface/50 p-5 rounded-2xl border border-border shadow-lg">
            {(!brew.brew_type || brew.brew_type === 'beer') ? (
              <>
                <p className="text-[10px] text-amber-400 uppercase font-bold mb-2 tracking-wider">Bittere</p>
                <p className="font-black text-3xl text-text-primary tracking-tight">{displayData.ibu || '-'}</p>
                <p className="text-[9px] text-text-disabled uppercase mt-1">IBU</p>
              </>
            ) : brew.brew_type === 'wine' ? (
              <>
                <p className="text-[10px] text-purple-400 uppercase font-bold mb-2 tracking-wider">Säure</p>
                <p className="font-black text-3xl text-text-primary tracking-tight">
                  {displayData.acidity_g_l || '-'}
                </p>
                <p className="text-[9px] text-text-disabled uppercase mt-1">g/L</p>
              </>
            ) : (
              <>
                <p className="text-[10px] text-pink-400 uppercase font-bold mb-2 tracking-wider">Zucker</p>
                <p className="font-black text-3xl text-text-primary tracking-tight">
                  {displayData.sugar_g_l || '-'}
                </p>
                <p className="text-[9px] text-text-disabled uppercase mt-1">g/L</p>
              </>
            )}
          </div>

          <div className="bg-surface/50 p-5 rounded-2xl border border-border shadow-lg">
            <p className="text-[10px] text-emerald-400 uppercase font-bold mb-2 tracking-wider">
              {(!brew.brew_type || brew.brew_type === 'beer') ? 'Farbe' : (displayData.bottling_date ? 'Abfülldatum' : (brew.brew_type === 'wine' ? 'Jahrgang' : 'Jahr'))}
            </p>
            <p className="font-black text-3xl text-text-primary tracking-tight">
              {(!brew.brew_type || brew.brew_type === 'beer') ? (displayData.color || '-') : (displayData.bottling_date || (brew.brew_type === 'wine' ? displayData.vintage : displayData.year))}
            </p>
            {(!brew.brew_type || brew.brew_type === 'beer') && (
              <p className="text-[9px] text-text-disabled uppercase mt-1">EBC</p>
            )}
          </div>
        </div>

        {/* Details Section — Inhaltsstoffe & Zutaten direkt nach Werten */}
        {brew.data && (
          <div className="bg-surface/50 border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xs uppercase font-black tracking-[0.3em] text-brand mb-4">Details</h2>

            {/* BEER Details */}
            {(!brew.brew_type || brew.brew_type === 'beer') && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* 1. RESULTS / MESSWERTE */}
                <div className="space-y-1">
                  <p className="text-text-muted text-xs uppercase font-bold">Abgefüllt am</p>
                  <p className="text-text-primary font-mono">{displayData.bottling_date || displayData.year}</p>
                </div>

                {displayData.srm && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Farbe (SRM)</p>
                    <p className="text-text-primary font-mono">{displayData.srm}</p>
                  </div>
                )}
                {brew.data.carbonation_g_l && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Karbonisierung</p>
                    <p className="text-text-primary font-mono">{brew.data.carbonation_g_l} g/l</p>
                  </div>
                )}

                {/* 2. ZUTATEN / INGREDIENTS */}
                {brew.data.malts && (
                  <div className="space-y-1 col-span-2 pt-2 border-t border-border/50">
                    <p className="text-text-muted text-xs uppercase font-bold">Malzarten</p>
                    <div className="text-text-primary"><IngredientList items={brew.data.malts} mode={{ type: 'grams_per_liter', volume: batchVolume }} /></div>
                  </div>
                )}
                {brew.data.hops && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-text-muted text-xs uppercase font-bold">Hopfen</p>
                    <div className="text-text-primary"><IngredientList items={brew.data.hops} mode={{ type: 'grams_per_liter', volume: batchVolume }} /></div>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-text-muted text-xs uppercase font-bold">Hefe</p>
                    <div className="text-text-primary"><IngredientList items={brew.data.yeast} mode={{ type: 'grams_per_liter', volume: batchVolume }} /></div>
                  </div>
                )}
                {brew.data.dry_hop_g && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Dry Hop</p>
                    <p className="text-text-primary">{brew.data.dry_hop_g} g</p>
                  </div>
                )}
              </div>
            )}

            {/* WINE Details */}
            {brew.brew_type === 'wine' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.grapes && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-text-muted text-xs uppercase font-bold">Rebsorten</p>
                    <div className="text-text-primary"><IngredientList items={brew.data.grapes} mode="percentage" /></div>
                  </div>
                )}
                {brew.data.region && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Region</p>
                    <p className="text-text-primary">{brew.data.region}</p>
                  </div>
                )}
                {brew.data.vintage && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Jahrgang</p>
                    <p className="text-text-primary">{brew.data.vintage}</p>
                  </div>
                )}
                {brew.data.oak_aged && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-text-muted text-xs uppercase font-bold">Barrique</p>
                    <p className="text-text-primary">
                      {brew.data.oak_months ? `${brew.data.oak_months} Monate im Holzfass` : 'Im Holzfass gereift'}
                    </p>
                  </div>
                )}
                {brew.data.residual_sugar_g_l && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Restzucker</p>
                    <p className="text-text-primary">{brew.data.residual_sugar_g_l} g/L</p>
                  </div>
                )}
                {brew.data.sulfites && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Hinweis</p>
                    <p className="text-text-primary">Enthält Sulfite</p>
                  </div>
                )}
              </div>
            )}

            {/* CIDER Details */}
            {brew.brew_type === 'cider' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.apples && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-text-muted text-xs uppercase font-bold">Apfelsorten</p>
                    <div className="text-text-primary"><IngredientList items={brew.data.apples} mode="percentage" /></div>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Hefe</p>
                    <div className="text-text-primary"><IngredientList items={brew.data.yeast} mode="name_only" /></div>
                  </div>
                )}
                {brew.data.fermentation && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Gärung</p>
                    <p className="text-text-primary capitalize">{brew.data.fermentation === 'wild' ? 'Wild' : 'Reinzucht'}</p>
                  </div>
                )}
                {brew.data.sweetness && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Süßegrad</p>
                    <p className="text-text-primary capitalize">
                      {brew.data.sweetness === 'dry' ? 'Trocken' : brew.data.sweetness === 'semi' ? 'Halbtrocken' : 'Süß'}
                    </p>
                  </div>
                )}
                {brew.data.carbonation_g_l && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Kohlensäure</p>
                    <p className="text-text-primary">{brew.data.carbonation_g_l} g/L</p>
                  </div>
                )}
                {brew.data.pH && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">pH-Wert</p>
                    <p className="text-text-primary">{brew.data.pH}</p>
                  </div>
                )}
              </div>
            )}

            {/* MEAD Details */}
            {brew.brew_type === 'mead' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.honey && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-text-muted text-xs uppercase font-bold">Honigsorten</p>
                    <div className="text-text-primary"><IngredientList items={brew.data.honey} mode="percentage" /></div>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Hefe</p>
                    <div className="text-text-primary"><IngredientList items={brew.data.yeast} mode="name_only" /></div>
                  </div>
                )}
                {brew.data.adjuncts && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-text-muted text-xs uppercase font-bold">Zutaten</p>
                    <div className="text-text-primary"><IngredientList items={brew.data.adjuncts} /></div>
                  </div>
                )}
                {brew.data.aging_months && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Reifung</p>
                    <p className="text-text-primary">{brew.data.aging_months} Monate</p>
                  </div>
                )}
                {brew.data.final_gravity && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Final Gravity</p>
                    <p className="text-text-primary font-mono">{brew.data.final_gravity}</p>
                  </div>
                )}
              </div>
            )}

            {/* SOFTDRINK Details */}
            {brew.brew_type === 'softdrink' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {brew.data.base && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-text-muted text-xs uppercase font-bold">Basis / Geschmack</p>
                    <p className="text-text-primary">{brew.data.base}</p>
                  </div>
                )}
                {brew.data.carbonation_g_l && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Kohlensäure</p>
                    <p className="text-text-primary">{brew.data.carbonation_g_l} g/L</p>
                  </div>
                )}
                {brew.data.acidity_ph && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">pH-Wert</p>
                    <p className="text-text-primary">{brew.data.acidity_ph}</p>
                  </div>
                )}
                {brew.data.natural_flavors && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Aromen</p>
                    <p className="text-text-primary">Natürliche Aromen</p>
                  </div>
                )}
                {brew.data.coloring && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Hinweis</p>
                    <p className="text-text-primary">Mit Farbstoff</p>
                  </div>
                )}
              </div>
            )}

            {/* Phase 4.2: Session-Informationen — Braudatum & Batch-Nummer */}
            {(displayData.brewed_at_display || displayData.batch_number) && (
              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-border/50">
                {displayData.brewed_at_display && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Gebraut am</p>
                    <p className="text-text-primary font-mono">{displayData.brewed_at_display}</p>
                  </div>
                )}
                {displayData.batch_number && (
                  <div className="space-y-1">
                    <p className="text-text-muted text-xs uppercase font-bold">Batch</p>
                    <p className="text-text-primary font-mono">#{displayData.batch_number}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vollständiges Rezept Link */}
        <Link
          href={`/brew/${brew.id}`}
          className="w-full bg-surface-hover hover:bg-border text-text-primary text-center py-4 rounded-xl font-bold transition border border-border shadow-lg flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" /> Vollständiges Rezept
        </Link>

        {/* Phase 2.3: Bewertungen - Horizontal scrollbar, Button oben rechts */}
        {ratingsLoading ? (
          <div className="space-y-3 animate-pulse" aria-label="Bewertungen werden geladen">
            <div className="flex gap-3 overflow-hidden w-full">
              {[1, 2].map(i => (
                <div key={i} className="w-[85%] sm:w-[320px] shrink-0 bg-surface/50 border border-border rounded-xl p-4 space-y-2">
                  <div className="h-3 bg-surface-hover rounded w-1/3" />
                  <div className="h-2 bg-surface-hover rounded w-1/4 mt-1" />
                  <div className="h-3 bg-surface-hover rounded w-3/4 mt-2" />
                </div>
              ))}
            </div>
          </div>
        ) : ratings.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-black tracking-[0.25em] text-text-muted">Bewertungen</p>
              {!hasAlreadyRated && (
                <button 
                  onClick={handleStartRating}
                  className="text-xs font-bold text-brand hover:text-brand-hover transition flex items-center gap-1 bg-brand/10 px-3 py-1.5 rounded-full"
                >
                  <Star className="w-3.5 h-3.5" /> Bewerten
                </button>
              )}
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide w-full">
              {ratings.map(rating => (
                <div key={rating.id} className="snap-start shrink-0 w-[85%] sm:w-[320px] bg-surface/50 border border-border rounded-xl p-4 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-text-primary text-sm truncate max-w-[140px]">{rating.author_name}</p>
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className={`w-3.5 h-3.5 ${star <= rating.rating ? 'fill-amber-400 text-amber-400' : 'text-text-disabled'}`} />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-text-disabled whitespace-nowrap">
                      {new Date(rating.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-text-secondary leading-relaxed line-clamp-4 mt-1">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-surface/50 border border-dashed border-border rounded-2xl p-6 text-center space-y-3">
            <div className="mx-auto w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-border">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Noch keine Bewertungen</p>
              <p className="text-xs text-text-muted mt-1">Wie schmeckt dir dieser Brew? Teile deine Meinung.</p>
            </div>
            {!hasAlreadyRated && (
              <button 
                onClick={handleStartRating}
                className="mt-2 text-xs font-bold bg-brand text-background hover:bg-brand-hover transition px-4 py-2 rounded-xl"
              >
                Erste Bewertung abgeben
              </button>
            )}
          </div>
        )}

        {/* ── Trenner: Inhalt → Interaktion ── */}
        <div className="relative flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-text-disabled select-none">Mitmachen</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* ── Gamification & Community Section ── */}

        <div id="gamification-cta-section" className="scroll-mt-6 space-y-4">
          {/* VibeCheck */}
          {isQrVerified ? (
          <VibeCheck
            brewId={brew.id}
            isLoggedIn={!!user}
            onComplete={() => {
              setRatingCTAHighlight(true);
              setTimeout(() => setRatingCTAHighlight(false), 2000);
            }}
          />
          ) : (
            <div className="bg-surface/50 border border-dashed border-border rounded-2xl p-5 text-center space-y-2">
              <QrCode className="w-6 h-6 mx-auto text-text-disabled" />
              <p className="text-sm text-text-muted">Scanne den QR-Code auf der Flasche, um am VibeCheck teilzunehmen.</p>
            </div>
          )}

          {/* Rating + Cap CTA */}
          <div className={ratingCTAHighlight ? 'ring-2 ring-brand/40 rounded-2xl animate-pulse' : ''}>
          <RatingCTABlock
            avgRating={avgRating}
            ratingCount={ratings.length}
            hasAlreadyRated={hasAlreadyRated}
            capCollected={capCollected}
            capTier={capTier}
            collectingCap={collectingCap}
            capUrl={brew.cap_url}
            onRate={() => {
              // Now we duplicate the check logic here instead directly when clicking in the CTA component
              fetch('/api/ratings/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brew_id: brew.id, ...(user ? { user_id: user.id } : {}) }),
              })
                .then(res => res.json())
                .then(res => {
                  if (res.hasRated && res.ratingId) {
                    setExistingRatingId(res.ratingId);
                    setShowRatingForm(true);
                  } else {
                    setShowRatingForm(true);
                  }
                });
            }}
            onClaim={() => claimCap()}
          />
          {!isQrVerified && !hasAlreadyRated && (
            <p className="text-[10px] text-text-disabled text-center mt-1.5 flex items-center justify-center gap-1">
              <QrCode className="w-3 h-3" /> QR-Scan-verifizierte Bewertungen werden besonders gekennzeichnet
            </p>
          )}
          </div>
        </div>

        {/* Rating Modal */}
        <div id="rating-form-section" className="scroll-mt-6">
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
              onRatingComplete={() => {
                // Phase 12.1: Show GeoConsentPrompt 2s after rating submit
                // Conditions: not already asked, not brewer mode, geolocation API available
                const alreadyAsked = localStorage.getItem('botllab_geo_asked');
                const isBrewer = userAppMode === 'brewer';
                const hasGeoApi = typeof navigator !== 'undefined' && 'geolocation' in navigator;
                if (!alreadyAsked && !isBrewer && hasGeoApi) {
                  setTimeout(() => setShowGeoConsent(true), 2000);
                }
              }}
            />
          )}
        </div>

        {/* Beat the Brewer — sichtbar wenn Server bestätigt, dass Flavor Profile existiert.
            Actual profile values stay server-side until after submit (Late Reveal).
            showBeatTheBrewer steuert nur den Einblende-Effekt nach Rating, nicht die Sichtbarkeit. */}
        {hasFlavorProfile && !isBreweryMember && (
          isQrVerified ? (
          <div className={showBeatTheBrewer ? 'animate-in fade-in slide-in-from-bottom-4 duration-300' : ''}>
            {showBeatTheBrewer && (
              <p className="text-[10px] uppercase font-black tracking-[0.25em] text-brand text-center mb-2">
                Zeig, ob du den Geschmack genauso wahrnimmst wie der Brauer →
              </p>
            )}
            <BeatTheBrewerGame
              brewId={brew.id}
              brewName={brew.name || 'Dieses Bier'}
              isLoggedIn={!!user}
              challengeToken={challengeToken}
              challengerName={challengerName}
              ratingId={existingRatingId}
              qrToken={qrToken}
              bottleId={data?.id}
            />
          </div>
          ) : (
          <div className="bg-surface/50 border border-dashed border-border rounded-2xl p-5 text-center space-y-2">
            <Lock className="w-6 h-6 mx-auto text-text-disabled" />
            <p className="text-sm font-medium text-text-secondary">Beat the Brewer</p>
            <p className="text-xs text-text-muted">Scanne den QR-Code auf der Flasche, um gegen den Brauer anzutreten.</p>
          </div>
          )
        )}

        {/* ── Tier 3 / Tier 4 Trenner ── */}
        <div className="relative flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-text-disabled select-none">Community</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Phase 11.5: Stash & Bounties — direkt sichtbar, kein Accordion */}
        <div className="space-y-3">
          <StashButton
            brewId={brew.id}
            brewName={brew.name || 'Dieses Bier'}
          />
          <BrewBounties brewId={brew.id} />
        </div>

        {/* Phase 13.1: Shop / Website Link — nur wenn Brauerei eine Website hat */}
        {brewery?.website && (
          <ShopLink
            breweryName={brewery.name}
            websiteUrl={brewery.website}
          />
        )}

        {/* --- Link zur Brauerei & Team --- */}
        {brewery && (
          <div className="space-y-4 mt-8">
            <Link
              href={`/brewery/${brewery.id}`}
              className="block group bg-surface border border-border rounded-2xl p-6 hover:bg-surface-hover transition shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full bg-surface-hover border-2 border-border overflow-hidden shrink-0">
                  {brewery.logo_url && brewery.moderation_status !== 'pending' ? (
                    <Image fill src={brewery.logo_url} alt={brewery.name ?? 'Brauerei-Logo'} className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Building2 className="w-6 h-6 text-text-muted" /></div>
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-1">Brauerei</p>
                  <h3 className="font-bold text-xl text-text-primary truncate group-hover:text-brand transition">
                    {brewery.name} ↗
                  </h3>
                  {brewery.location && <p className="text-xs text-text-muted mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {brewery.location}</p>}
                </div>
              </div>
            </Link>

            {/* Team Avatars */}
            {team.length > 0 && (
              <div className="flex flex-col items-center gap-3 py-2">
                <p className="text-[9px] uppercase font-black tracking-[0.2em] text-text-disabled">Das Brau-Team</p>
                <div className="flex -space-x-2">
                  {team.map((m, i) => (
                    <div
                      key={i}
                      className="relative w-8 h-8 rounded-full border-2 border-background bg-surface-hover flex items-center justify-center overflow-hidden"
                      title={m.profiles?.display_name ?? undefined}
                    >
                      {m.profiles?.logo_url ? (
                        <Image fill src={m.profiles.logo_url ?? ''} alt={m.profiles?.display_name ?? ''} className="object-cover" sizes="32px" />
                      ) : (
                        <User className="w-3 h-3 text-text-muted" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Footer variant="minimal" />
      </div>

      {/* Phase 9.4: Drinker-Bestätigungs-Prompt (Smart Sampling) */}
      <DrinkingConfirmationPrompt
        bottleId={data.id}
        isOwner={user?.id === data?.brews?.user_id}
      />

      {/* Phase 12.1: Geo-Consent Prompt (after star rating, 2s delay) */}
      {showGeoConsent && (
        <GeoConsentPrompt
          bottleId={data.id}
          onClose={() => setShowGeoConsent(false)}
        />
      )}
    </div>
  );
}
