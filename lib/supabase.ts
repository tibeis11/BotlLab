import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Das ist unser Funkgerät zur Datenbank
// Use createBrowserClient for client-side usage (handles cookies automatically)
// Use createClient for server-side usage (fallback, no automatic auth)
/**
 * @deprecated DO NOT USE THIS SINGLETON IN NEW CODE.
 * Use `useSupabase` hook for Client Components.
 * Use `createClient` from `@/lib/supabase-server` for Server Components/Actions.
 */
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createClient(supabaseUrl, supabaseAnonKey);

// Hilfsfunktionen für das Squad-Modell (Brauerei-Gruppen)

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Holt die aktive Brauerei für einen User.
 * Priorisiert die zuletzt besuchte (active_brewery_id im Profil).
 */
export async function getActiveBrewery(userId: string, existingClient?: SupabaseClient) {
  const client = existingClient || supabase;
  try {
    // 1. Hole Preferred ID aus Profil
    const { data: profile } = await client
        .from('profiles')
        .select('active_brewery_id')
        .eq('id', userId)
        .maybeSingle();
    
    const preferredId = profile?.active_brewery_id;

    // 2. Hole alle Mitgliedschaften
    const { data: members, error: memberError } = await client
      .from('brewery_members')
      .select(`
        brewery_id,
        role,
        breweries (*)
      `)
      .eq('user_id', userId);

    if (memberError) {
      console.error('❌ Error fetching membership:', memberError);
      return null;
    }
    
    if (!members || members.length === 0) {
      return null;
    }

    // 3. Wähle die passende Brauerei
    let selectedMember = null;
    
    if (preferredId) {
        selectedMember = members.find((m: any) => m.brewery_id === preferredId);
    }
    
    // Fallback: Nimm die erste, wenn keine Preference oder Preference ungültig
    if (!selectedMember) {
        selectedMember = members[0];
    }

    const breweryData = Array.isArray(selectedMember.breweries) 
      ? selectedMember.breweries[0] 
      : selectedMember.breweries;

    if (!breweryData) {
      return null;
    }

    return {
      ...breweryData,
      userRole: selectedMember.role,
    };
  } catch (err) {
    console.error('Error in getActiveBrewery:', err);
    return null;
  }
}

/**
 * Holt alle Brauereien, in denen der User Mitglied ist.
 */
export async function getUserBreweries(userId: string, existingClient?: SupabaseClient) {
  const client = existingClient || supabase;
  try {
    const { data: members, error } = await client
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
export async function getBreweryMembers(breweryId: string, existingClient?: SupabaseClient) {
  const client = existingClient || supabase;
  const { data, error } = await client
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