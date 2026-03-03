'use server';

// ============================================================================
// Phase 12.4 — Beat a Friend Server Actions
//
// "Beat the Brewer" macht Spaß, aber "Beat a Friend" baut Reichweite (K-Faktor).
//
// Flow:
//   1. User A plays Beat the Brewer → calls createFriendChallenge()
//      → gets a token / share URL
//   2. User A shares link: /b/[brewId]?challenge=[token]
//   3. User B opens the URL → plays Beat the Brewer
//   4. After submit, BeatTheBrewerGame calls acceptFriendChallenge()
//   5. App shows head-to-head RadarChart overlay
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import type { FlavorProfile } from '@/lib/flavor-profile-config';
import type { Json } from '@/lib/database.types';

export interface FriendChallenge {
  id: string;
  token: string;
  challengerId: string;
  challengerDisplayName: string | null;
  brewId: string;
  challengerProfile: FlavorProfile;
  challengerScore: number;
  expiresAt: string;
  // Filled once accepted:
  challengedId: string | null;
  challengedDisplayName: string | null;
  challengedProfile: FlavorProfile | null;
  challengedScore: number | null;
  completedAt: string | null;
}

// ─── createFriendChallenge ────────────────────────────────────────────────────
export async function createFriendChallenge(
  brewId: string,
  challengerProfile: FlavorProfile,
  matchScore: number,
): Promise<{ success: boolean; token?: string; shareUrl?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nicht angemeldet' };

  // Deactivate existing challenges for this user+brew (prevent duplicates)
  await supabase
    .from('beat_friend_challenges')
    .delete()
    .eq('challenger_id', user.id)
    .eq('brew_id', brewId)
    .is('challenged_id', null); // only delete unclaimed ones

  const { data, error } = await supabase
    .from('beat_friend_challenges')
    .insert({
      challenger_id: user.id,
      brew_id: brewId,
      challenger_profile: challengerProfile as unknown as Json,
      challenger_score: matchScore,
    })
    .select('token')
    .single();

  if (error || !data) return { success: false, error: error?.message };

  const token = data.token as string;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://botllab.de';
  const shareUrl = `${baseUrl}/b/${brewId}?challenge=${token}`;

  return { success: true, token, shareUrl };
}

// ─── getFriendChallenge ───────────────────────────────────────────────────────
export async function getFriendChallenge(
  token: string,
): Promise<FriendChallenge | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('beat_friend_challenges')
    .select(`
      id, token, challenger_id, brew_id,
      challenger_profile, challenger_score,
      expires_at, challenged_id, challenged_profile,
      challenged_score, completed_at
    `)
    .eq('token', token)
    .single();

  if (error || !data) return null;

  // Expired?
  if (new Date(data.expires_at) < new Date()) return null;

  // Fetch display names from profiles
  const profileIds = [data.challenger_id, data.challenged_id].filter(Boolean) as string[];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', profileIds);

  const profileMap: Record<string, string | null> = {};
  for (const p of (profiles ?? [])) {
    profileMap[p.id] = p.display_name;
  }

  return {
    id: data.id,
    token: data.token,
    challengerId: data.challenger_id,
    challengerDisplayName: profileMap[data.challenger_id] ?? null,
    brewId: data.brew_id,
    challengerProfile: data.challenger_profile as unknown as FlavorProfile,
    challengerScore: data.challenger_score,
    expiresAt: data.expires_at,
    challengedId: data.challenged_id,
    challengedDisplayName: data.challenged_id ? (profileMap[data.challenged_id] ?? null) : null,
    challengedProfile: data.challenged_profile as unknown as FlavorProfile | null,
    challengedScore: data.challenged_score,
    completedAt: data.completed_at,
  };
}

// ─── acceptFriendChallenge ─────────────────────────────────────────────────
export async function acceptFriendChallenge(
  token: string,
  challengedProfile: FlavorProfile,
  matchScore: number,
): Promise<{ success: boolean; challenge?: FriendChallenge; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nicht angemeldet' };

  // Fetch challenge
  const { data: row } = await supabase
    .from('beat_friend_challenges')
    .select('id, challenger_id, expires_at, challenged_id')
    .eq('token', token)
    .single();

  if (!row) return { success: false, error: 'Challenge nicht gefunden' };
  if (new Date(row.expires_at) < new Date()) return { success: false, error: 'Challenge abgelaufen' };
  if (row.challenger_id === user.id) return { success: false, error: 'Das bist du selbst!' };
  if (row.challenged_id) return { success: false, error: 'Challenge bereits angenommen' };

  const { error } = await supabase
    .from('beat_friend_challenges')
    .update({
      challenged_id: user.id,
      challenged_profile: challengedProfile as unknown as Json,
      challenged_score: matchScore,
      completed_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  if (error) return { success: false, error: error.message };

  // Re-fetch the full challenge for the reveal
  const full = await getFriendChallenge(token);
  return { success: true, challenge: full ?? undefined };
}
