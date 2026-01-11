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
  // 1. Simple Abfrage: Bin ich Mitglied?
  // benutze maybeSingle() statt single(), damit kein Fehler fliegt wenn nichts gefunden wird
  const { data: memberData, error: memberError } = await supabase
    .from('brewery_members')
    .select('brewery_id, role')
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

  // 2. Simple Abfrage: Brauerei-Daten laden
  const { data: breweryData, error: breweryError } = await supabase
    .from('breweries')
    .select('*')
    .eq('id', memberData.brewery_id)
    .maybeSingle();

  if (breweryError) {
    console.error('❌ Error fetching brewery details:', JSON.stringify(breweryError, null, 2));
    return null;
  }

  if (!breweryData) {
     console.warn('⚠️ Membership exists but Brewery not found:', memberData.brewery_id);
     return null;
  }

  return {
    ...breweryData,
    userRole: memberData.role,
  };
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
      profiles!brewery_members_user_id_fkey (id, display_name, brewery_name, logo_url)
    `)
    .eq('brewery_id', breweryId);

  if (error) {
    console.error('Error fetching brewery members:', error);
    return [];
  }
  return data || [];
}