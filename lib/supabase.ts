import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Das ist unser Funkgerät zur Datenbank
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hilfsfunktionen für das Squad-Modell (Brauerei-Gruppen)

/**
 * Holt die aktive Brauerei für einen User.
 * Falls er in mehreren ist, wird aktuell die erste zurückgegeben.
 */
export async function getActiveBrewery(userId: string) {
  try {
    // Combined query: fetch membership and brewery in one go
    const { data: memberData, error: memberError } = await supabase
      .from('brewery_members')
      .select(`
        brewery_id,
        role,
        breweries (*)
      `)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (memberError) {
      console.error('❌ Error fetching membership:', JSON.stringify(memberError, null, 2));
      return null;
    }
    
    if (!memberData) {
      console.warn('⚠️ No membership found for user:', userId);
      return null;
    }

    const breweryData = Array.isArray(memberData.breweries) 
      ? memberData.breweries[0] 
      : memberData.breweries;

    if (!breweryData) {
      console.warn('⚠️ Membership exists but Brewery not found:', memberData.brewery_id);
      return null;
    }

    return {
      ...breweryData,
      userRole: memberData.role,
    };
  } catch (err) {
    console.error('Error in getActiveBrewery:', err);
    return null;
  }
}

/**
 * Holt alle Brauereien, in denen der User Mitglied ist.
 */
export async function getUserBreweries(userId: string) {
  try {
    const { data: members, error } = await supabase
      .from('brewery_members')
      .select(`
        brewery_id,
        role,
        breweries (*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user breweries:', error);
      return [];
    }

    return members
        .map((m: any) => { // Adding explicit any to avoid TS issues if types aren't perfect
          const brewery = Array.isArray(m.breweries) ? m.breweries[0] : m.breweries;
          if (!brewery) return null;
          return {
            ...brewery,
            userRole: m.role
          };
        })
        .filter((b: any) => b !== null);

  } catch (err) {
    console.error('Error in getUserBreweries:', err);
    return [];
  }
}

/**
 * Listet alle Mitglieder einer Brauerei auf.
 */
export async function getBreweryMembers(breweryId: string) {
  const { data, error } = await supabase
    .from('brewery_members')
    .select(`
      role,
      user_id,
      profiles!brewery_members_user_id_fkey (id, display_name, logo_url, tier)
    `)
    .eq('brewery_id', breweryId);

  if (error) {
    console.error('Error fetching brewery members:', error);
    return [];
  }
  return data || [];
}