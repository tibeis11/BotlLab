import { useState, useEffect } from 'react';
import { useSupabase } from "@/lib/hooks/useSupabase";
import { useAuth } from "@/app/context/AuthContext";
import { getUserBreweries, getActiveBrewery } from "@/lib/supabase";

export function useHeaderData(breweryId?: string) {
  const supabase = useSupabase();
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [userBreweries, setUserBreweries] = useState<any[]>([]);
  const [activeBreweryId, setActiveBreweryId] = useState<string | null>(breweryId || null);
  const [activeBreweryName, setActiveBreweryName] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollbarCompensation, setScrollbarCompensation] = useState(0);

  // Manage body scroll and padding when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      setScrollbarCompensation(scrollbarWidth);
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
      setScrollbarCompensation(0);
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, [isMobileMenuOpen]);

  // Fetch header data: Profile (w/ PGRST116 fallback) and Breweries
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (user) {
        // 1. Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('logo_url, display_name, subscription_tier, app_mode, id')
          .eq('id', user.id)
          .single();
        
        if (!cancelled) {
          if (profileData) {
            setProfile(profileData);
          } else if (profileError && profileError.code === 'PGRST116') {
            console.warn("User has no profile, attempting to cure...");
            const fallbackName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Brewer';
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                display_name: fallbackName,
                subscription_tier: 'free',
                subscription_status: 'active',
                ai_credits_used_this_month: 0
              });
            
            if (!createError) {
              setProfile({ 
                id: user.id,
                display_name: fallbackName, 
                logo_url: null, 
                subscription_tier: 'free' 
              });
            } else {
              console.error("Failed to auto-create profile", createError);
            }
          }
        }

        // 2. Fetch User Breweries
        const allBreweries = await getUserBreweries(user.id, supabase);
        if (!cancelled && allBreweries) {
          setUserBreweries(allBreweries);
        }

        // 3. Determine Active Brewery
        let selectedBrewery = null;
        if (breweryId && allBreweries) {
             selectedBrewery = allBreweries.find(b => b.id === breweryId);
        }
        
        if (!selectedBrewery && allBreweries && allBreweries.length > 0) {
             const dbActive = await getActiveBrewery(user.id, supabase);
             selectedBrewery = dbActive || allBreweries[0];
        }

        if (!cancelled && selectedBrewery) {
             setActiveBreweryId(selectedBrewery.id);
             setActiveBreweryName(selectedBrewery.name);
        }

      } else {
        if (!cancelled) {
            setProfile(null);
            setUserBreweries([]);
            setActiveBreweryId(null);
            setActiveBreweryName(null);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user, breweryId, supabase]);

  async function handleLogout() {
    await signOut();
  }

  return {
    profile,
    userBreweries,
    activeBreweryId,
    activeBreweryName,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    scrollbarCompensation,
    handleLogout
  };
}
