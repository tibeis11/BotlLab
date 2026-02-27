'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getTierConfig, getBreweryTierConfig } from '@/lib/tier-system';
import Header from '@/app/components/Header';
import Logo from '@/app/components/Logo';
import { calculateWaterProfile } from '@/lib/brewing-calculations';
import { type EquipmentProfile, profileToConfig, DEFAULT_EQUIPMENT_CONFIG } from '@/lib/types/equipment';
import { CheckCircle2 } from 'lucide-react';
import { saveBrewToLibrary } from '@/lib/actions/library-actions';
import { useGlobalToast } from '@/app/context/AchievementNotificationContext';
import { getPremiumStatus } from '@/lib/actions/premium-actions';
import { getBrewTasteProfile, getBrewFlavorDistribution, TasteProfile, FlavorDistribution } from '@/lib/rating-analytics';
import BrewHero from './components/BrewHero';
import BrewTabNav from './components/BrewTabNav';
import BrewRecipeTab from './components/BrewRecipeTab';
import BrewRatingsTab from './components/BrewRatingsTab';
import BrewSimilarTab from './components/BrewSimilarTab';
import BrewCommentsTab from './components/BrewCommentsTab';
import MinimalStickyHeader from './components/MinimalStickyHeader';

type BrewTab = 'rezept' | 'bewertungen' | 'kommentare' | 'ähnliche';

const TAB_LABELS: Array<{ id: BrewTab; label: string }> = [
  { id: 'rezept', label: 'Rezept' },
  { id: 'bewertungen', label: 'Bew.' },
  { id: 'kommentare', label: 'Komm.' },
  { id: 'ähnliche', label: 'Ähnl.' },
];



// Helper components (MaltView, HopView, MashScheduleView, IngredientView) moved to BrewRecipeTab.tsx

export default function BrewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [brew, setBrew] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [bottles, setBottles] = useState<any[]>([]);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [flavorTags, setFlavorTags] = useState<FlavorDistribution[]>([]);
  const [parent, setParent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [remixLoading, setRemixLoading] = useState(false);
  const [remixMessage, setRemixMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<BrewTab>(
    (searchParams.get('tab') as BrewTab) ?? 'rezept',
  );

  function handleTabChange(tab: BrewTab) {
    setActiveTab(tab);
    router.replace(`?tab=${tab}`, { scroll: false });
  }

  const { showToast } = useGlobalToast();

  // Save to Library State
  const [userBreweries, setUserBreweries] = useState<any[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedInBreweryIds, setSavedInBreweryIds] = useState<Set<string>>(new Set());

  // Like System State
  const [likesCount, setLikesCount] = useState(0);
  const [userHasLiked, setUserHasLiked] = useState(false);

  // Scaling State
  const [scaleVolume, setScaleVolume] = useState<number>(20);
  const [scaleEfficiency, setScaleEfficiency] = useState<number>(65);
  const [originalVolume, setOriginalVolume] = useState<number>(20);
  const [originalEfficiency, setOriginalEfficiency] = useState<number>(65);

  // Equipment-Profil des eingeloggten Users (Wasserberechnung)
  const [userEquipmentConfig, setUserEquipmentConfig] = useState<ReturnType<typeof profileToConfig>>(DEFAULT_EQUIPMENT_CONFIG);
  const [userEquipmentName, setUserEquipmentName] = useState<string | null>(null);
  const [userBreweryId, setUserBreweryId] = useState<string | null>(null);
  const [userHasNoProfile, setUserHasNoProfile] = useState(false);

  useEffect(() => {
    async function loadEquipmentProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Brewery des Users finden
      const { data: membership } = await supabase
        .from('brewery_members')
        .select('brewery_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      if (!membership) return;
      setUserBreweryId(membership.brewery_id);
      const { data: profiles } = await (supabase as any)
        .from('equipment_profiles')
        .select('*')
        .eq('brewery_id', membership.brewery_id)
        .order('is_default', { ascending: false })
        .limit(1);
      const p: EquipmentProfile | undefined = profiles?.[0];
      if (p) {
        setUserEquipmentConfig(profileToConfig(p));
        setUserEquipmentName(p.name);
      } else {
        // User ist eingeloggt, hat aber noch kein Profil hinterlegt
        setUserHasNoProfile(true);
      }
    }
    loadEquipmentProfile();
  }, []);

  const handleShare = async () => {
    const shareData = {
        title: `BotlLab: ${brew.name}`,
        text: `Schau dir dieses Rezept an: ${brew.name} (${brew.style}).`,
        url: window.location.href
    };

    if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
         try {
             await navigator.share(shareData);
         } catch (e) {
             console.log('Share cancelled');
         }
    } else {
         // Desktop Fallback
         try {
             await navigator.clipboard.writeText(window.location.href);
             setCopied(true);
             setTimeout(() => setCopied(false), 2000);
         } catch (e) {
             console.error('Clipboard failed');
         }
    }
  };

  useEffect(() => {
    async function loadBreweries() {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        
        const { data } = await supabase.from('brewery_members').select('brewery:breweries(id, name, logo_url)').eq('user_id', user.id);
        if(data) {
            setUserBreweries(data.map((item:any) => item.brewery));
        }
    }
    loadBreweries();
  }, []);

  // Check if already saved
  useEffect(() => {
    async function checkSavedStatus() {
        if (!userBreweries || userBreweries.length === 0 || !id) return;
        
        try {
            const breweryIds = userBreweries.map((b: any) => b.id);
            const { data } = await supabase
                .from('brewery_saved_brews')
                .select('brewery_id')
                .eq('brew_id', id)
                .in('brewery_id', breweryIds);
            
            if (data && data.length > 0) {
                const savedIds = new Set(data.map((d: any) => d.brewery_id));
                setSavedInBreweryIds(savedIds);
            }
        } catch (e) {
            console.error(e);
        }
    }
    checkSavedStatus();
  }, [userBreweries, id]);

  async function handleSaveToTeam(targetBreweryId?: string | any) {
    if (!targetBreweryId || typeof targetBreweryId !== 'string') {
        // If multiple breweries, always open modal to allow selection
        if (userBreweries.length > 1) {
            setSaveModalOpen(true);
            return;
        } else if (userBreweries.length === 1) {
            targetBreweryId = userBreweries[0].id;
        } else {
            showToast("Fehler", "Du musst Mitglied einer Brauerei sein, um Rezepte zu speichern.", "warning");
            return;
        }
    }

    setSaveLoading(true);
    try {
        // Ensure arguments act as primitives to avoid potential proxy issues
        // Sanitize inputs strongly
        const inputBreweryId = targetBreweryId && typeof targetBreweryId === 'string' 
            ? targetBreweryId 
            : "";
        const inputBrewId = String(id || "");

        if (!inputBreweryId || !inputBrewId) {
             console.error("Invalid IDs in handleSaveToTeam:", { targetBreweryId, id });
             throw new Error("Ungültige IDs beim Speichern");
        }
        
        console.log("Saving with IDs (Primitive Check):", typeof inputBreweryId, inputBreweryId, typeof inputBrewId, inputBrewId);
        
        // Ensure we are passing ONLY strings, no proxy objects whatsoever
        const res = await saveBrewToLibrary(inputBreweryId, inputBrewId);
        
        console.log("Speichern Ergebnis:", res);

        if (res.success) {
             if (res.message === 'Bereits gespeichert') {
                showToast("Info", "Dieses Rezept befindet sich bereits in der Bibliothek.", "info");
            } else {
                showToast("Gespeichert", "Rezept zur Team-Bibliothek hinzugefügt", "success");
            }
            setSavedInBreweryIds(prev => new Set(prev).add(targetBreweryId!));
        } else {
            // Safe error handling for Server Action response
            const errorMessage = (res as any).error || "Unbekannter Fehler beim Speichern";
            showToast("Fehler", errorMessage, "warning");
        }
    } catch (e: any) {
        console.error("Client Error during save:", e);
        showToast("Fehler", e.message || "Fehler beim Speichern", "warning");
    } finally {
        setSaveLoading(false);
        setSaveModalOpen(false);
    }
  }

  async function handleRemix() {
    setRemixMessage(null);
    setRemixLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRemixLoading(false);
      router.push(`/login?redirect=/brew/${id}`);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .maybeSingle();

    const { data: myBrews } = await supabase
      .from('brews')
      .select('id')
      .eq('user_id', user.id);

    const tierConfig = getTierConfig(profileData?.tier || 'lehrling');
    
    // Limits are now on Team/Brewery level, not User.
    // For individual "Remix" actions into a personal context (if supported), we should check the target brewery limit.
    // However, since we now strictly create brews inside a Brewery Context, this "Remix to Personal" flow needs adjustment.
    // For now, removing the user-level limit check as it no longer exists on ReputationLevelConfig.
    
    // Use first brewery if available or force user to pick one
    const { data: member } = await supabase.from('brewery_members').select('brewery_id').eq('user_id', user.id).limit(1).maybeSingle();
    
    if (!member) {
        setRemixMessage("Du musst Mitglied einer Brauerei sein, um Rezepte zu remixen.");
        setRemixLoading(false);
        return;
    }
    
    // Check Brewery Limits
    const { data: brewery } = await supabase.from('breweries').select('tier').eq('id', member.brewery_id).single();
    const { data: brews } = await supabase.from('brews').select('id', { count: 'exact', head: true }).eq('brewery_id', member.brewery_id);
    
    // Check if user has premium status that allows bypassing limits
    const premiumStatus = await getPremiumStatus();
    const shouldBypass = premiumStatus?.features.bypassBrewLimits ?? false;
    
    const breweryTierConfig = getBreweryTierConfig((brewery?.tier || 'garage') as any);
    
    if (!shouldBypass && (brews?.length || 0) >= breweryTierConfig.limits.maxBrews) {
         setRemixMessage(`Brauerei-Limit erreicht: ${breweryTierConfig.displayName} erlaubt maximal ${breweryTierConfig.limits.maxBrews} Rezepte.`);
         setRemixLoading(false);
         return;
    }

    const payload = {
      name: `${brew.name} (Remix)`,
      style: brew.style || '',
      description: brew.description || '',
      brew_type: brew.brew_type || 'beer',
      data: brew.data || {},
      image_url: brew.image_url || null,
      is_public: false,
      user_id: user.id,
      brewery_id: member.brewery_id,
      remix_parent_id: brew.id,
    };

    const { error } = await supabase
      .from('brews')
      .insert([payload]);

    if (error) {
      setRemixMessage(error.message || 'Konnte Remix nicht anlegen.');
      setRemixLoading(false);
      return;
    }

    setRemixLoading(false);
    router.push('/dashboard');
  }



  useEffect(() => {
    async function fetchBrewInfo() {
      try {
        // Auth holen — bei Lock-Timeout oder Auth-Fehler als anonymous weiterladen
        let user = null;
        try {
          const { data } = await supabase.auth.getUser();
          user = data?.user ?? null;
        } catch (authErr) {
          console.warn('Auth check failed (lock timeout?), continuing as anonymous:', authErr);
        }

        // Rezept laden (RLS kümmert sich um harte DB-Security, hier prüfen wir Logik)
        const { data: brewData, error: brewError } = await supabase
          .from('brews')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (brewError || !brewData) {
          setErrorMsg("Rezept nicht gefunden");
          setLoading(false);
          return;
        }

        // Access Control Logic
        // 1. Öffentlich? -> OK
        // 2. Ersteller? -> OK
        // 3. Brauerei-Mitglied? -> OK (bei Team-Brews)
        let hasAccess = brewData.is_public;
        
        if (!hasAccess) {
             if (user && brewData.user_id === user.id) {
                 hasAccess = true;
             } else if (user && brewData.brewery_id) {
                 const { data: member } = await supabase
                    .from('brewery_members')
                    .select('id')
                    .eq('brewery_id', brewData.brewery_id)
                    .eq('user_id', user.id)
                    .maybeSingle();
                 if (member) hasAccess = true;
             }
        }

        if (!hasAccess) {
            setErrorMsg("Dieses Rezept ist privat und nur für Team-Mitglieder sichtbar.");
            setLoading(false);
            return;
        }

        setBrew(brewData);

        // ── Seitenaufruf zählen ──────────────────────────────────
        // Einmalig pro Browser-Session pro Rezept. Die RPC handhabt
        // den view_count-Inkremente (auch anonym) und schreibt
        // optional einen brew_views-Eintrag für die Personalisierung.
        if (brewData.is_public && typeof sessionStorage !== 'undefined') {
          const sessionKey = `botllab_pv_${id}`;
          if (!sessionStorage.getItem(sessionKey)
              && sessionStorage.getItem('botllab_analytics_opt_out') !== 'true') {
            sessionStorage.setItem(sessionKey, '1');
            (supabase as any).rpc('record_brew_page_view', {
              p_brew_id: id,
              ...(user?.id ? { p_user_id: user.id } : {}),
            }).then(() => {}).catch(() => {});
          }
        }
        // ─────────────────────────────────────────────────────────
        try {
            // Check both potential field names
            const rawVol = brewData.data?.batch_size_liters || brewData.data?.batch_size || 20;
            const bVol = parseFloat(String(rawVol).replace(',', '.'));
            
            const rawEff = brewData.data?.efficiency || 75; // Default to 75% if missing
            const bEff = parseFloat(String(rawEff).replace(',', '.'));

            setOriginalVolume(bVol || 20);
            setOriginalEfficiency(bEff || 75);
            setScaleVolume(bVol || 20);
            setScaleEfficiency(bEff || 75);
        } catch (e) {
            console.warn("Scaling init failed", e);
        }

        // Logic Switch: Team vs Personal
        if (brewData.brewery_id) {
             const { data: breweryData } = await supabase
              .from('breweries')
              .select('id, name, description, logo_url, moderation_status') 
              .eq('id', brewData.brewery_id)
              .maybeSingle();

             if (breweryData) {
                 setProfile({
                     id: breweryData.id,
                     display_name: breweryData.name,
                     logo_url: breweryData.moderation_status === 'pending' ? null : breweryData.logo_url,
                     bio: breweryData.description,
                     location: null
                 });
             }
        } else {
            // Profile laden (Personal)
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, display_name, location, bio, logo_url, tier')
              .eq('id', brewData.user_id)
              .maybeSingle();
            setProfile(profileData);
        }

        // Parent laden (wenn Remix)
        if (brewData.remix_parent_id) {
          const { data: parentData } = await supabase
            .from('brews')
            .select('id, name, user_id, profiles!inner(display_name)')
            .eq('id', brewData.remix_parent_id)
            .maybeSingle();
          setParent(parentData);
        }

        // Ratings laden
        const { data: ratingData } = await supabase
          .from('ratings')
          .select('*')
          .eq('brew_id', brewData.id)
          .order('created_at', { ascending: false });
        setRatings(ratingData || []);

        // Likes laden (Count & HasLiked)
        // Optimized: Uses denormalized count from brews table
        setLikesCount(brewData.likes_count || 0);

        if (user) {
          const { data: myLike } = await supabase
            .from('likes')
            .select('id')
            .eq('brew_id', brewData.id)
            .eq('user_id', user.id)
            .maybeSingle();
          setUserHasLiked(!!myLike);
        }

        // Bottles laden
        const { data: bottleData } = await supabase
          .from('bottles')
          .select('id, bottle_number')
          .eq('brew_id', brewData.id)
          .order('bottle_number');
        setBottles(bottleData || []);

        // Analytics (Geschmacksprofil & Tags)
        const [taste, tags] = await Promise.all([
          getBrewTasteProfile(brewData.id),
          getBrewFlavorDistribution(brewData.id),
        ]);
        setTasteProfile(taste);
        setFlavorTags(tags);

        setLoading(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Fehler beim Laden");
        setLoading(false);
      }
    }

    fetchBrewInfo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍺</div>
          <p className="text-zinc-500">Lade Rezept...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !brew) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Rezept nicht gefunden</h1>
          <p className="text-zinc-500 mb-6">{errorMsg || "Dieses Rezept existiert nicht oder wurde gelöscht."}</p>
          <Link href="/" className="text-cyan-500 hover:underline">← Zurück zur Startseite</Link>
        </div>
      </div>
    );
  }

  const avgRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  // Scaling Factors
  // Volume Scaling: Simple linear (New / Old)
  const volFactor = (scaleVolume && originalVolume && originalVolume > 0) ? scaleVolume / originalVolume : 1;
  
  // Efficiency Scaling: Inverse (Old / New) - Higher Efficiency = Less Malt needed
  const effFactor = (scaleEfficiency && originalEfficiency && scaleEfficiency > 0) ? originalEfficiency / scaleEfficiency : 1;
  
  // Malt needs both adjustments
  const maltFactor = volFactor * effFactor;
  
  // Hops/Water only need Volume adjustment
  const generalFactor = volFactor;

  // Scale Water Calculation (Accurate)
  const totalScaledGrain = brew.data.malts 
    ? brew.data.malts.reduce((sum: number, m: any) => {
        const rawAmount = parseFloat(String(m.amount).replace(',', '.')) || 0;
        return sum + (rawAmount * maltFactor);
    }, 0)
    : 0;
  
  const boilTime = parseFloat(String(brew.data.boil_time || 60));
  
  // Calculate original mash thickness if possible to preserve ratio
  let originalMashThickness = 3.5;
  if (brew.data.mash_water_liters && brew.data.malts) {
    const originalGrainWeight = brew.data.malts.reduce((sum: number, m: any) => sum + (parseFloat(String(m.amount).replace(',', '.')) || 0), 0);
    const originalMashWater = parseFloat(String(brew.data.mash_water_liters).replace(',', '.'));
    if (originalGrainWeight > 0 && originalMashWater > 0) {
        originalMashThickness = originalMashWater / originalGrainWeight;
    }
  }

  const waterProfile = calculateWaterProfile(scaleVolume, totalScaledGrain, boilTime / 60, {
    ...userEquipmentConfig,
    // Rezept-eigene Maischedicke hat Vorrang vor dem Anlage-Profil
    mashThickness: originalMashThickness,
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <Header breweryId={brew.brewery_id} />

      <BrewHero
        brew={brew}
        profile={profile}
        parent={parent}
        avgRating={avgRating}
        ratingsCount={ratings.length}
        likesCount={likesCount}
        userHasLiked={userHasLiked}
        handleShare={handleShare}
        handleRemix={handleRemix}
        handleSaveToTeam={handleSaveToTeam}
        remixLoading={remixLoading}
        saveLoading={saveLoading}
        savedInBreweryIds={savedInBreweryIds}
        userBreweries={userBreweries}
        copied={copied}
      />

      {/* Minimal sticky header appears when hero scrolls out of view */}
      <MinimalStickyHeader
        brewName={brew.name ?? ''}
        activeTab={activeTab}
        onTabClick={(tab) => handleTabChange(tab as BrewTab)}
        tabs={TAB_LABELS}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 border-b border-zinc-800">
        <BrewTabNav
          activeTab={activeTab}
          onChange={handleTabChange}
          ratingsCount={ratings.length}
        />
      </div>

      {activeTab === 'rezept' && (
        <BrewRecipeTab
          brew={brew}
          scaleVolume={scaleVolume}
          scaleEfficiency={scaleEfficiency}
          originalVolume={originalVolume}
          originalEfficiency={originalEfficiency}
          setScaleVolume={setScaleVolume}
          setScaleEfficiency={setScaleEfficiency}
          userEquipmentName={userEquipmentName}
          userHasNoProfile={userHasNoProfile}
          userBreweryId={userBreweryId}
          waterProfile={waterProfile}
          maltFactor={maltFactor}
          volFactor={volFactor}
        />
      )}

      {activeTab === 'bewertungen' && (
        <BrewRatingsTab
          ratings={ratings}
          tasteProfile={tasteProfile}
          flavorTags={flavorTags}
          avgRating={avgRating ? parseFloat(String(avgRating)) : 0}
        />
      )}

      {activeTab === 'kommentare' && <BrewCommentsTab brew={brew} />}
      {activeTab === 'ähnliche' && <BrewSimilarTab brew={brew} />}

      <footer className="pt-12 pb-6 text-center opacity-40 hover:opacity-100 transition-opacity duration-500 flex flex-col items-center border-t border-zinc-900">
        <div className="mb-2">
          <Logo className="w-5 h-5" textSize="text-xs" />
        </div>
        <p className="text-[9px] text-zinc-700 font-medium">Digital Brew Lab</p>
        <div className="mt-4">
          <Link href="/impressum" className="text-[10px] text-zinc-600 hover:text-zinc-400 hover:underline transition">
            Impressum
          </Link>
        </div>
        <p className="text-[8px] text-zinc-800 mt-2 font-mono">{id}</p>
      </footer>

      {/* Save to Team Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">In Team-Bibliothek speichern</h3>
              <button onClick={() => setSaveModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {userBreweries.map(b => (
                <button
                  key={b.id}
                  disabled={saveLoading || savedInBreweryIds.has(b.id)}
                  onClick={() => handleSaveToTeam(b.id)}
                  className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 group disabled:opacity-50 transition-all ${
                    savedInBreweryIds.has(b.id)
                      ? 'bg-emerald-900/10 border-emerald-500/20 cursor-default'
                      : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 hover:shadow-lg'
                  }`}
                >
                  {b.logo_url ? (
                    <img src={b.logo_url} className="w-12 h-12 rounded-full object-cover border border-zinc-800" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl">🏭</div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-lg block transition ${savedInBreweryIds.has(b.id) ? 'text-emerald-500' : 'text-white group-hover:text-cyan-400'}`}>
                        {b.name}
                      </span>
                      {savedInBreweryIds.has(b.id) && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {savedInBreweryIds.has(b.id) ? 'Bereits gespeichert' : 'Klicken zum Speichern'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


