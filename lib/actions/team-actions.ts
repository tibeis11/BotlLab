'use server';

import { createClient } from '@/lib/supabase-server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export type TeamActionResponse = {
  ok: boolean;
  error?: string;
};

/**
 * Dissolves (permanently deletes) a brewery owned by the current user.
 * - Guards: user must be authenticated + owner of the brewery.
 * - If other members still exist the action is refused — ownership must be
 *   transferred first (or they must be removed).
 * - brews.brewery_id and bottles.brewery_id have ON DELETE SET NULL, so all
 *   content stays intact but loses the team reference.
 */
export async function dissolveBrewery(breweryId: string): Promise<TeamActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: 'Nicht authentifiziert.' };
  }

  // Verify caller is owner
  const { data: membership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'owner') {
    return { ok: false, error: 'Du bist kein Owner dieses Teams.' };
  }

  // Count other members
  const { count } = await supabase
    .from('brewery_members')
    .select('id', { count: 'exact', head: true })
    .eq('brewery_id', breweryId)
    .neq('user_id', user.id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        `Das Team hat noch ${count} weitere(s) Mitglied(er). ` +
        'Bitte übertrage zuerst die Owner-Rolle oder entferne alle Mitglieder.',
    };
  }

  // Use service role to bypass RLS for the brewery deletion
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: deleteError } = await serviceClient
    .from('breweries')
    .delete()
    .eq('id', breweryId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  return { ok: true };
}

/**
 * Transfers owner role from current user to another member.
 * Current owner becomes a regular 'member'.
 */
export async function transferOwnership(
  breweryId: string,
  newOwnerUserId: string
): Promise<TeamActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: 'Nicht authentifiziert.' };
  }

  // Verify caller is owner
  const { data: membership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'owner') {
    return { ok: false, error: 'Du bist kein Owner dieses Teams.' };
  }

  // Verify new owner is a member
  const { data: targetMembership } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', newOwnerUserId)
    .single();

  if (!targetMembership) {
    return { ok: false, error: 'Der ausgewählte Nutzer ist kein Mitglied dieses Teams.' };
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Guard: new owner must not already own another brewery
  const { count: existingOwnerCount } = await serviceClient
    .from('brewery_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', newOwnerUserId)
    .eq('role', 'owner');

  if ((existingOwnerCount ?? 0) > 0) {
    return {
      ok: false,
      error:
        'Dieser Nutzer ist bereits Owner eines anderen Teams. ' +
        'Jeder Nutzer kann nur ein Team besitzen.',
    };
  }

  // Promote new owner
  const { error: promoteError } = await serviceClient
    .from('brewery_members')
    .update({ role: 'owner' })
    .eq('brewery_id', breweryId)
    .eq('user_id', newOwnerUserId);

  if (promoteError) return { ok: false, error: promoteError.message };

  // Demote current owner to member
  const { error: demoteError } = await serviceClient
    .from('brewery_members')
    .update({ role: 'member' })
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id);

  if (demoteError) return { ok: false, error: demoteError.message };

  return { ok: true };
}

/**
 * Returns the subset of the provided userIds that already own at least one brewery.
 * Uses the service role client to bypass RLS.
 */
export async function getMembersOwnerStatus(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await serviceClient
    .from('brewery_members')
    .select('user_id')
    .in('user_id', userIds)
    .eq('role', 'owner');

  return (data ?? []).map((row: { user_id: string }) => row.user_id);
}
