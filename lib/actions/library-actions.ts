'use server'

import { createAdminClient, createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function saveBrewToLibrary(breweryId: string, brewId: string) {
  try {
    // Verify user is authenticated
    const supabaseUser = await createClient();
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
        console.error("Auth Error:", userError);
        return { success: false, error: 'Nicht eingeloggt' };
    }

    // Verify membership
    const { data: membership, error: memberError } = await supabaseUser
      .from('brewery_members')
      .select('id')
      .eq('brewery_id', breweryId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) {
         console.error("Membership Check Error:", memberError);
         return { success: false, error: `DB Fehler (Check): ${memberError.message}` };
    }

    if (!membership) return { success: false, error: 'Nicht berechtigt' };

    // Use admin client to bypass RLS for the insert
    const supabase = createAdminClient();
    
    // Explicitly create plain object for insert to avoid any hidden getters/proxies
    const insertData = {
        brewery_id: String(breweryId),
        brew_id: String(brewId),
        created_by: String(user.id),
    };

    const { error } = await supabase
      .from('brewery_saved_brews')
      .insert(insertData);

    if (error) {
      if (error.code === '23505') return { success: true, message: 'Bereits gespeichert' };
      console.error('Error saving brew:', error);
      // Safe error serialization
      return { success: false, error: `DB Fehler: ${error.message}` };
    }

    try {
        // revalidatePath(`/team/${breweryId}/brews`);
        console.log("Revalidation skipped for testing");
    } catch (revalError) {
        console.error("Revalidation failed:", revalError);
        // Do not fail the operation just because revalidation failed
    }

    return { success: true };
  } catch (e: any) {
    // Attempt to safely extract error message without triggering Server/Client boundary issues
    let msg = 'Unbekannter Fehler';
    try {
        if (typeof e === 'string') msg = e;
        else if (e instanceof Error) msg = e.message;
        else if (e && typeof e === 'object' && 'message' in e) msg = String(e.message);
    } catch {
        msg = 'Fehler konnte nicht serialisiert werden';
    }
    
    console.error('saveBrewToLibrary unexpected error:', msg);
    return { success: false, error: `Server Fehler: ${msg}` };
  }
}

export async function removeBrewFromLibrary(breweryId: string, brewId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('brewery_saved_brews')
      .delete()
      .match({ brewery_id: breweryId, brew_id: brewId });

    if (error) {
      console.error('Error removing brew:', error);
      return { success: false, error: error.message || 'Fehler beim Entfernen' };
    }

    revalidatePath(`/team/${breweryId}/brews`);
    return { success: true };
  } catch (e: any) {
    console.error('removeBrewFromLibrary unexpected error:', e);
    return { success: false, error: 'Unbekannter Fehler beim Entfernen' };
  }
}
