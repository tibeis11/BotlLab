'use server';

// ============================================================================
// Phase 12.2 — Stash Server Actions (Digitaler Kühlschrank / POS-Erfassung)
//
// Allows users to add brews to their personal stash (digital fridge) and
// optionally log *where* they purchased the beer (POS data for breweries).
// Rewards: +5 Tasting IQ for providing a purchase location.
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { Json } from '@/lib/database.types';
import type { PurchaseLocation, StashEntry } from '@/lib/stash-config';

// Re-export types only (no value exports allowed in "use server" files)
export type { PurchaseLocation, StashEntry } from '@/lib/stash-config';

// ─── addToStash ──────────────────────────────────────────────────────────────
export async function addToStash(
  brewId: string,
  purchaseLocation: PurchaseLocation | null = null,
  notes: string | null = null,
): Promise<{ success: boolean; alreadyInStash?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nicht angemeldet' };

  // Upsert (do nothing if already exists)
  const { error, data } = await supabase
    .from('user_stash')
    .upsert(
      {
        user_id: user.id,
        brew_id: brewId,
        purchase_location: purchaseLocation,
        notes,
        added_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,brew_id', ignoreDuplicates: false },
    )
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { success: true, alreadyInStash: true };
    return { success: false, error: error.message };
  }

  // Award +5 IQ for providing purchase location
  if (purchaseLocation) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tasting_iq')
      .eq('id', user.id)
      .single();
    const currentIQ = profile?.tasting_iq ?? 0;
    await supabase
      .from('profiles')
      .update({ tasting_iq: currentIQ + 5 })
      .eq('id', user.id);
    await supabase.from('tasting_score_events').insert({
      user_id: user.id,
      brew_id: brewId,
      event_type: 'bonus',
      points_delta: 5,
      metadata: {
        reason: 'stash_location',
        purchase_location: purchaseLocation,
      } as unknown as Json,
    });
  }

  revalidatePath('/my-cellar/stash');
  return { success: true };
}

// ─── removeFromStash ─────────────────────────────────────────────────────────
export async function removeFromStash(
  brewId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nicht angemeldet' };

  const { error } = await supabase
    .from('user_stash')
    .delete()
    .eq('user_id', user.id)
    .eq('brew_id', brewId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/my-cellar/stash');
  return { success: true };
}

// ─── isInStash ───────────────────────────────────────────────────────────────
export async function isInStash(brewId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_stash')
    .select('id')
    .eq('user_id', user.id)
    .eq('brew_id', brewId)
    .maybeSingle();

  return !!data;
}

// ─── getStash ────────────────────────────────────────────────────────────────
export async function getStash(): Promise<StashEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_stash')
    .select(`
      id,
      brew_id,
      added_at,
      purchase_location,
      notes,
      brews (
        name,
        style,
        abv,
        image_url,
        breweries (
          name,
          id
        )
      )
    `)
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    brewId: row.brew_id,
    addedAt: row.added_at,
    purchaseLocation: row.purchase_location as PurchaseLocation | null,
    notes: row.notes,
    brew: {
      name: row.brews?.name ?? 'Unbekanntes Bier',
      style: row.brews?.style ?? null,
      abv: row.brews?.abv ?? null,
      imageUrl: row.brews?.image_url ?? null,
      breweryName: row.brews?.breweries?.name ?? null,
      breweryId: row.brews?.breweries?.id ?? null,
    },
  }));
}

// ─── getStashPOSStats (for brewery analytics) ────────────────────────────────
export async function getStashPOSStats(
  breweryId: string,
): Promise<{ location: PurchaseLocation; count: number }[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Verify membership
  const { data: member } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) return [];

  // Fetch POS breakdown for all brews of this brewery
  const { data } = await supabase
    .from('user_stash')
    .select('purchase_location, brews!inner(brewery_id)')
    .eq('brews.brewery_id', breweryId)
    .not('purchase_location', 'is', null);

  if (!data) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    const loc = (row as any).purchase_location as string;
    counts[loc] = (counts[loc] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([location, count]) => ({ location: location as PurchaseLocation, count }))
    .sort((a, b) => b.count - a.count);
}
