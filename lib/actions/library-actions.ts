'use server'

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function saveBrewToLibrary(breweryId: string, brewId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('brewery_saved_brews')
    .insert({
      brewery_id: breweryId,
      brew_id: brewId,
      created_by: user.id
    });

  if (error) {
      // Ignore unique violation (already saved)
      if (error.code === '23505') {
          return { success: true, message: 'Bereits gespeichert' };
      }
      console.error('Error saving brew:', error);
      throw new Error('Fehler beim Speichern');
  }

  revalidatePath(`/team/${breweryId}/brews`);
  return { success: true };
}

export async function removeBrewFromLibrary(breweryId: string, brewId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('brewery_saved_brews')
        .delete()
        .match({ brewery_id: breweryId, brew_id: brewId });

    if (error) {
        console.error('Error removing brew:', error);
        throw new Error('Fehler beim Entfernen');
    }
    
    revalidatePath(`/team/${breweryId}/brews`);
    return { success: true };
}
