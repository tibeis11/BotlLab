'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import Logo from '../../components/Logo';
import { checkAndGrantAchievements } from '@/lib/achievements';
import CrownCap from '../../components/CrownCap';
import { trackBottleScan, trackConversion } from '@/lib/actions/analytics-actions';
import { useAuth } from '@/app/context/AuthContext';
import RateBrewModal from './components/RateBrewModal';
import { RatingSubmission } from '@/lib/types/rating';

const renderIngredientList = (items: any, mode: 'absolute' | 'percentage' | 'name_only' | { type: 'grams_per_liter', volume: number } = 'absolute') => {
  if (!items) return null;
  
  // Handle string (legacy/simple)
  if (typeof items === 'string') return items;
  
  // Handle array
  if (Array.isArray(items)) {
    // Check if it's an array of objects or strings
    if (items.length === 0) return null;
    
    // If elements are strings, join them
    if (typeof items[0] === 'string') return items.join(', ');

    let total = 0;
    // Calculation Logic for Percentage Type
    if (mode === 'percentage') {
        const parseAmount = (val: any) => {
             if (typeof val === 'number') return val;
             if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
             return 0;
        };

        const units = new Set(items.filter((i:any) => i?.amount && i?.unit).map((i:any) => i.unit.toLowerCase()));
        
        items.forEach((item: any) => {
             let val = parseAmount(item.amount);
             const u = item.unit ? item.unit.toLowerCase() : '';
             if (u === 'kg' && (units.has('g') || units.has('gramm') || units.has('gram'))) val *= 1000;
             else if ((u === 'g' || u === 'gramm' || u === 'gram') && units.has('kg')) val /= 1000; // Unlikely but possible
             total += val;
        });
        // If calc failed, fallback to absolute
        if (total <= 0) mode = 'absolute';
    }
    
    // If elements are objects with name (and potentially amount/unit)
    return (
      <div className="flex flex-col gap-1.5">
        {items.map((item: any, idx: number) => {
          if (typeof item === 'string') return <span key={idx}>{item}</span>;
          if (item?.name) {
            let details = "";
            let highlight = false;

            if (mode === 'name_only') {
                 // No details, just name
                 details = "";
            } else {
                const parseAmount = (val: any) => {
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
                    return 0;
                };

                if (mode === 'percentage') {
                     let val = parseAmount(item.amount);
                     const units = new Set(items.filter((i:any) => i?.amount && i?.unit).map((i:any) => i.unit.toLowerCase()));
                     const u = item.unit ? item.unit.toLowerCase() : '';

                     if (u === 'kg' && (units.has('g') || units.has('gramm') || units.has('gram'))) val *= 1000;
                     else if ((u === 'g' || u === 'gramm' || u === 'gram') && units.has('kg')) val /= 1000;
                     
                     const pct = (val / total) * 100;
                     if (pct > 0) {
                         details = `${Math.round(pct)}%`;
                         highlight = true;
                     }
                } else if (typeof mode === 'object' && mode.type === 'grams_per_liter' && mode.volume > 0) {
                     // Calculate g/L
                     let valInGrams = parseAmount(item.amount);
                     // Normalize to grams
                     const u = item.unit ? item.unit.toLowerCase().trim() : '';
                     
                     // Strict check: Only show amount if it is a weight unit
                     const weightUnits = ['g', 'gram', 'gramm', 'grams', 'kg', 'kilogram', 'kilogramm'];
                     const isWeight = weightUnits.includes(u);

                     if (isWeight) {
                         if (u.startsWith('k') && item.amount) valInGrams *= 1000; // Correct kg to g
                         
                         const gPerL = valInGrams / mode.volume;
                         
                         if (gPerL > 0) {
                             // Determine precision
                             if (gPerL < 0.1) details = `< 0.1 g/L`;
                             else if (gPerL < 10) details = `${gPerL.toFixed(1)} g/L`;
                             else details = `${Math.round(gPerL)} g/L`;
                             highlight = true;
                         }
                     }
                     // If not weight or calc failed, details remains empty (Only Name)

                } else {
                     if (item.amount) details += item.amount;
                     if (item.unit) details += " " + item.unit;
                }
            }

            return (
              <div key={idx} className="flex justify-between items-start text-sm group">
                <span className="text-zinc-300 font-medium leading-tight">{item.name}</span>
                {details && (
                  <span className={`text-zinc-500 text-xs font-mono ml-3 shrink-0 whitespace-nowrap ${highlight ? 'text-cyan-500 font-bold' : ''}`}>
                    {details}
                  </span>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }
  
  // Handle single object
  if (typeof items === 'object') {
    if (items.name) {
      if (mode === 'name_only') {
           return (
            <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-300 font-medium">{items.name}</span>
            </div>
           );
      }
      return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-300 font-medium">{items.name}</span>
            {(items.amount || items.unit) && mode === 'absolute' && (
              <span className="text-zinc-500 text-xs font-mono ml-3 shrink-0">
                {items.amount && `${items.amount}`}
                {items.unit && ` ${items.unit}`}
              </span>
            )}
        </div>
       );
    }
  }
  
  return null;
};

export default function PublicScanPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string; 
  const { user } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [brewery, setBrewery] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rating States
  const [ratings, setRatings] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userIp, setUserIp] = useState<string | null>(null);
  const [hasAlreadyRated, setHasAlreadyRated] = useState(false);

  // Cap Collection
  const [collectingCap, setCollectingCap] = useState(false);
  const [capCollected, setCapCollected] = useState(false);

  // Tracking: Use ref to prevent multiple tracking calls
  const hasTrackedScan = useRef(false);

  // Supabase singleton imported


  useEffect(() => {
    async function fetchBottleInfo() {
      if (!id) return;
      
      console.log("Fetching bottle:", id);

      // IP-Adresse abrufen
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        setUserIp(ipData.ip);
        console.log('User IP:', ipData.ip);
      } catch (err) {
        console.warn('Could not fetch IP:', err);
      }

      // Zunächst die Flasche laden mit der brew_id und session_id
      const { data: bottle, error: bottleError } = await supabase
        .from('bottles')
        .select('id, bottle_number, brew_id, session_id, filled_at')
        .eq('id', id)
        .maybeSingle();

      if (bottleError) {
        console.error("Supabase Error (bottle):", bottleError);
        setErrorMsg(bottleError.message);
        setLoading(false);
        return;
      }

      console.log("Bottle loaded:", bottle);

      if (!bottle) {
        setErrorMsg("Flasche nicht gefunden");
        setLoading(false);
        return;
      }

      if (!bottle.brew_id) {
        console.warn("⚠️ Flasche hat keine brew_id!");
        setData(bottle);
        setLoading(false);
        return;
      }

      // Session laden falls vorhanden
      let sessionData = null;
      if (bottle.session_id) {
         const { data: s } = await supabase.from('brewing_sessions').select('*').eq('id', bottle.session_id).single();
         sessionData = s;
      }

      // Jetzt das Rezept laden
      const { data: brew, error: brewError } = await supabase
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
        .maybeSingle();

      if (brewError) {
        console.error("Supabase Error (brew):", brewError);
      }

      console.log("Brew loaded:", brew, "Session:", sessionData);
      setData(bottle ? { ...bottle, brews: brew, session: sessionData } : null);

      // ===== TRACKING: Track bottle scan (only once!) =====
      if (bottle && brew && !hasTrackedScan.current) {
        hasTrackedScan.current = true; // Set immediately to prevent race conditions
        try {
          await trackBottleScan(bottle.id, {
            brewId: brew.id,
            breweryId: brew.brewery_id || undefined,
            viewerUserId: user?.id || undefined,
            scanSource: 'qr_code'
          });
        } catch (trackError) {
          console.error('[Analytics] Failed to track scan:', trackError);
          hasTrackedScan.current = false; // Reset on error to allow retry
        }
      }

      // Brauerei und Team laden
      if (brew?.brewery_id) {
        const { data: breweryData } = await supabase
          .from('breweries')
          .select('*')
          .eq('id', brew.brewery_id)
          .single();
        setBrewery(breweryData);

        const { data: memberData } = await supabase
          .from('brewery_members')
          .select('role, profiles:user_id(display_name, logo_url)')
          .eq('brewery_id', brew.brewery_id);
        setTeam(memberData || []);
      }

      // Falls wir einen User (Brauer) haben, laden wir dessen Profil
      if (brew?.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', brew.user_id)
          .maybeSingle();
        setProfile(profileData);

        // Profile View zählen
        await supabase
          .from('profiles')
          .update({ total_profile_views: (profileData?.total_profile_views || 0) + 1 })
          .eq('id', brew.user_id);
      }

      // Ratings laden (wenn brew vorhanden)
      if (brew?.id) {
        console.log("Loading ratings for brew:", brew.id);
        loadRatings(brew.id);
        checkCapCollected(brew.id);
      }

      setLoading(false);
    }

    fetchBottleInfo();
  }, [id]); // Only re-run when bottle ID changes

  async function loadRatings(brewId: string) {
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

    // Checken ob dieser Nutzer (IP) bereits eine Bewertung hat
    if (userIp) {
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('brew_id', brewId)
        .eq('ip_address', userIp)
        .maybeSingle();
      
      setHasAlreadyRated(!!existingRating);
      if (existingRating) {
        console.log('User hat bereits bewertet');
      }
    }
  }

  async function submitRating(submissionData: RatingSubmission): Promise<string | null> {
    if (hasAlreadyRated) {
      alert('Du hast bereits eine Bewertung für dieses Rezept eingegeben! 🚫');
      return null;
    }

    const brewId = data?.brews?.id;
    if (!brewId) {
      alert('Fehler: Rezept nicht geladen. Bitte Seite neu laden.');
      return null;
    }

    if (!userIp) {
      alert('Fehler: IP-Adresse konnte nicht ermittelt werden');
      return null;
    }

    try {
      setSubmitting(true);
      const payload = {
         ...submissionData,
         brew_id: brewId,
         ip_address: userIp
      };
      console.log('Sende Rating:', payload);

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
            console.log("Benutzer hat bereits bewertet. Lade existierendes Rating...");
            setHasAlreadyRated(true);
            
            // Try to recover the existing rating ID so the user can still claim the cap
            const { data: existing } = await supabase
                .from('ratings')
                .select('id')
                .eq('brew_id', brewId)
                .eq('ip_address', userIp)
                .maybeSingle();
            
            if (existing) {
                // Return existing ID to simulate success -> Modal moves to "Cap Claim" screen
                return existing.id;
            }
            
            // Fallback if retrieval fails
            alert('Du hast bereits eine Bewertung für dieses Rezept eingegeben! 🚫');
            setShowRatingForm(false);
            return null;
        }

        console.error('API Error:', result.error);
        alert('Fehler: ' + result.error);
        return null;
      } else {
        console.log('Rating erfolgreich eingefügt:', result.rating);
        // Removed setShowRatingForm(false) to allow success screen
        setHasAlreadyRated(true);
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
      console.error('Exception:', err);
      alert('Ein Fehler ist aufgetreten: ' + err.message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClaimCap(ratingId: string) {
    if (!user) {
        // Redirect to Login with Context - Preserve Params in Callback URL
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('action', 'claim_cap');
        currentUrl.searchParams.set('rating_id', ratingId);
        
        const callbackUrl = encodeURIComponent(currentUrl.toString());
        router.push(`/login?callbackUrl=${callbackUrl}`);
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Sitzung abgelaufen. Bitte neu einloggen.");
            window.location.reload();
            return;
        }

        console.log("Claiming Cap - Sending:", { brew_id: data.brews.id, rating_id: ratingId });

        const response = await fetch('/api/bottle-caps/claim', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ brew_id: data.brews.id, rating_id: ratingId })
        });
        
        const res = await response.json();
        
        if (response.ok) {
            // Trigger Confetti
            setShowRatingForm(false); // Close modal
            setCapCollected(true);
            
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function() {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
            
            alert("Kronkorken erfolgreich gesammelt!");
        } else {
            alert("Fehler beim Sammeln: " + res.error);
        }

    } catch (e: any) {
        alert("Fehler: " + e.message);
    }
  }

  // --- Auto-Claim Logic after Login ---
  useEffect(() => {
    if (!user || !data?.brews?.id) return;

    const action = searchParams.get('action');
    const claimRatingId = searchParams.get('rating_id');

    if (action === 'claim_cap' && claimRatingId) {
        console.log("Auto-claiming cap for rating:", claimRatingId);
        
        // Clean URL first
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('action');
        newParams.delete('rating_id');
        router.replace(`/b/${id}?${newParams.toString()}`, { scroll: false });

        // Trigger Claim
        handleClaimCap(claimRatingId);
    }
  }, [user, data, searchParams, id]);

  async function checkCapCollected(brewId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('collected_caps')
      .select('id')
      .eq('user_id', user.id)
      .eq('brew_id', brewId)
      .maybeSingle();

    setCapCollected(!!data);
  }

  async function collectCap() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Bitte logge dich ein, um diesen Kronkorken zu sammeln!");
      return;
    }

    setCollectingCap(true);
    try {
      const { error } = await supabase
        .from('collected_caps')
        .insert([{ user_id: user.id, brew_id: data.brews.id }]);
      
      if (error) throw error;
      setCapCollected(true);
      
      // Effect
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

    } catch (err: any) {
      alert("Fehler beim Sammeln: " + err.message);
    } finally {
      setCollectingCap(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
      </div>
    );
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
  const m = session?.measurements || {};

  // Merge Session Data over Recipe Data for Display
  const displayData = {
      ...brew.data,
      abv: m.abv || brew.data?.abv,
      ibu: m.ibu || brew.data?.ibu, // Session might not have IBU usually
      og: m.og || brew.data?.og,
      fg: m.fg || brew.data?.fg,
      vintage: session?.brewed_at ? new Date(session.brewed_at).getFullYear() : (brew.data?.vintage || new Date(brew.created_at).getFullYear()),
      year: session?.brewed_at ? new Date(session.brewed_at).getFullYear() : new Date(brew.created_at).getFullYear(),
      bottling_date: (data.filled_at || m.bottling_date || session?.bottling_date)
        ? new Date(data.filled_at || m.bottling_date || session.bottling_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : null,
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center">
      {/* Moderation Alerts */}
      {/* Pending Banner */}
      {brew.moderation_status === 'pending' && (
        <div className="w-full bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3 flex items-center justify-center gap-2 text-yellow-500 text-sm font-medium">
             <span>⏳</span> Dieses Bild wird geprüft und ist noch nicht öffentlich sichtbar (Dauer ca. 24h).
        </div>
      )}
      
      {/* Rejected Banner */}
      {brew.moderation_status === 'rejected' && (
        <div className="w-full bg-red-900/20 border-b border-red-900/40 px-4 py-4 flex flex-col md:flex-row items-center justify-center gap-2 text-red-500 text-sm font-medium text-center">
             <span className="font-bold flex items-center gap-2">
                ⚠️ Bild abgelehnt: 
             </span>
             <span>{brew.moderation_rejection_reason || 'Verstoß gegen die Richtlinien'}</span>
        </div>
      )}

      {/* 1. Das KI-Label als Hero-Bild - GRÖSSER */}
      <div className="relative w-full max-w-2xl mx-auto overflow-hidden">
        <div className="aspect-square w-full shadow-2xl relative">
          {brew.image_url ? (
            <img 
              src={brew.image_url} 
              alt={brew.name} 
              className={`w-full h-full object-cover ${(brew.moderation_status === 'pending' || brew.moderation_status === 'rejected') ? 'filter blur-md brightness-50' : ''}`}
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
        </div>
      </div>

      {/* 2. Content Container */}
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <span className="inline-block text-cyan-400 text-xs font-black uppercase tracking-[0.3em] px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            {brew.style || 'Handcrafted'}
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
            {brew.name}
          </h1>
          {brew.description && (
            <p className="text-zinc-400 text-lg leading-relaxed max-w-xl mx-auto italic">
              {brew.description}
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
                    <div className="text-white">{renderIngredientList(brew.data.malts, { type: 'grams_per_liter', volume: estimatedBatchVolume })}</div>
                  </div>
                )}
                {brew.data.hops && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hopfen</p>
                    <div className="text-white">{renderIngredientList(brew.data.hops, { type: 'grams_per_liter', volume: estimatedBatchVolume })}</div>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hefe</p>
                    <div className="text-white">{renderIngredientList(brew.data.yeast, { type: 'grams_per_liter', volume: estimatedBatchVolume })}</div>
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
                    <div className="text-white">{renderIngredientList(brew.data.grapes, 'percentage')}</div>
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
                    <div className="text-white">{renderIngredientList(brew.data.apples, 'percentage')}</div>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hefe</p>
                    <div className="text-white">{renderIngredientList(brew.data.yeast, 'name_only')}</div>
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
                    <div className="text-white">{renderIngredientList(brew.data.honey, 'percentage')}</div>
                  </div>
                )}
                {brew.data.yeast && (
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Hefe</p>
                    <div className="text-white">{renderIngredientList(brew.data.yeast, 'name_only')}</div>
                  </div>
                )}
                {brew.data.adjuncts && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Zutaten</p>
                    <div className="text-white">{renderIngredientList(brew.data.adjuncts)}</div>
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
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link 
            href={`/brew/${brew.id}`}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-center py-4 rounded-xl font-bold transition border border-zinc-700 shadow-lg"
          >
            📖 Vollständiges Rezept
          </Link>
          
          {/* Cap Collection Section - Integrated */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 pt-24 text-center space-y-6 relative overflow-visible group mt-32">
            {/* Background Light */}
            <div className={`absolute -top-12 -left-12 w-32 h-32 blur-3xl transition-opacity duration-1000 ${capCollected ? 'bg-cyan-500/20 opacity-100' : 'bg-zinc-500/10 opacity-50'}`} />
            
            <div className="absolute left-1/2 -ml-20 -top-20 z-10 w-40 h-40 flex items-center justify-center">
              <CrownCap 
                content={brew.cap_url} 
                tier={capCollected ? "gold" : "zinc"} 
                size="lg"
                className={`transition-all duration-700 ${capCollected ? 'scale-110 drop-shadow-[0_0_25px_rgba(6,182,212,0.5)]' : 'grayscale contrast-75 drop-shadow-2xl'}`}
              />
            </div>
            
            <div className="space-y-1 relative z-10 pt-4">
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-cyan-500 mb-1">
                {capCollected ? 'Digitale Sammlung' : 'Bewerten & Sammeln'}
              </p>
              <h3 className="text-xl font-black">
                {capCollected ? 'Abzeichen gesammelt!' : 'Sichere dir den Kronkorken'}
              </h3>
              <p className="text-zinc-500 text-xs max-w-[200px] mx-auto leading-relaxed">
                {capCollected 
                  ? 'Dieser Kronkorken ist sicher in deiner Sammlung verwahrt.'
                  : 'Teile kurz deine Meinung zum Geschmack und erhalte als Belohnung diesen digitalen Kronkorken.'}
              </p>
            </div>

            <div className="relative z-10 pt-2">
              {!capCollected ? (
                <button
                  onClick={() => {
                      if (hasAlreadyRated && !capCollected) {
                          collectCap();
                      } else {
                          setShowRatingForm(true);
                      }
                  }}
                  disabled={collectingCap}
                  className="w-full bg-white text-black hover:bg-cyan-400 font-black py-4 rounded-xl hover:scale-[1.02] active:scale-95 transition shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {collectingCap ? (
                    <span className="animate-spin text-xl">🧪</span>
                  ) : (
                    <>
                      <span className="text-xl">
                        {hasAlreadyRated ? '🥇' : '💬'}
                      </span>
                      <span>
                        {hasAlreadyRated ? 'Jetzt Sammeln' : 'Bewerten & Sammeln'}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <Link 
                  href="/dashboard/collection"
                  className="flex items-center justify-center gap-2 bg-zinc-950 border border-zinc-800 text-cyan-400 text-xs font-black uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-900 transition"
                >
                  ✨ In der Sammlung ansehen
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* === BEWERTUNGEN SECTION === */}
        <div className="pt-8 space-y-6">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          
          {/* Durchschnitt & Button */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {avgRating > 0 && (
                  <>
                    <span className="text-4xl font-black text-cyan-500">{avgRating}</span>
                    <div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(star => (
                          <span key={star} className={star <= Math.round(avgRating) ? 'text-yellow-500' : 'text-zinc-700'}>★</span>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500">{ratings.length} {ratings.length === 1 ? 'Bewertung' : 'Bewertungen'}</p>
                    </div>
                  </>
                )}
                {avgRating === 0 && <p className="text-zinc-500 text-sm">Noch keine Bewertungen</p>}
              </div>
            </div>
          </div>

          {/* Rating Form */}
          {showRatingForm && (
            <RateBrewModal
                brewId={data?.brews?.id || ''}
                onSubmit={submitRating}
                onCancel={() => setShowRatingForm(false)}
                isSubmitting={submitting}
                onClaimCap={handleClaimCap}
            />
          )}

          {/* Ratings List */}
          {ratings.length > 0 && (
            <div className="space-y-3">
              {ratings.map(rating => (
                <div key={rating.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-white">{rating.author_name}</p>
                      <div className="flex gap-0.5 mt-1">
                        {[1,2,3,4,5].map(star => (
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
            </div>
          )}
        </div>        
        {/* --- Link zur Brauerei & Team --- */}
        {brewery && (
          <div className="space-y-4 mt-8">
            <Link 
              href={`/brewery/${brewery.id}`}
              className="block group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:bg-zinc-800 transition shadow-lg"
            >
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden shrink-0">
                    {brewery.logo_url && brewery.moderation_status !== 'pending' ? (
                      <img src={brewery.logo_url} className="w-full h-full object-cover" />
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
                        className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center overflow-hidden"
                        title={m.profiles?.display_name}
                      >
                        {m.profiles?.logo_url ? (
                          <img src={m.profiles.logo_url} className="w-full h-full object-cover" />
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

    </div>
  );
}
