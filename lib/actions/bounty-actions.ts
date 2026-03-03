'use server';

// ============================================================================
// Phase 12.3 — Brewer Bounties Server Actions
//
// Breweries create challenges (bounties) — e.g. "score >95% in Beat the Brewer".
// Consumers who meet the condition get a digital reward (discount code / free beer).
// The loop closes digital analytics to physical brewery revenue.
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export type RewardType = 'discount' | 'free_beer' | 'merchandise' | 'other';
export type ConditionType = 'match_score' | 'vibe_check' | 'rating_count';

export interface BrewerBounty {
  id: string;
  breweryId: string;
  brewId: string | null;
  title: string;
  description: string;
  rewardType: RewardType;
  rewardValue: string;
  conditionType: ConditionType;
  conditionValue: number;
  maxClaims: number | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  claimCount: number;
  userClaimed: boolean;
  // Joined brew info (optional)
  brewName?: string | null;
}

export interface CreateBountyInput {
  brewId?: string | null;
  title: string;
  description: string;
  rewardType: RewardType;
  rewardValue: string;
  rewardCode?: string | null;
  conditionType: ConditionType;
  conditionValue: number;
  maxClaims?: number | null;
  expiresAt?: string | null;
}

// ─── getBrewBounties (consumer — shown on /b/[id]) ───────────────────────────
export async function getBrewBounties(brewId: string): Promise<BrewerBounty[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: bounties, error } = await supabase
    .from('brewer_bounties')
    .select(`
      id, brewery_id, brew_id, title, description, reward_type,
      reward_value, condition_type, condition_value, max_claims,
      expires_at, is_active, created_at,
      brews ( name ),
      bounty_claims ( id, user_id )
    `)
    .eq('brew_id', brewId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (error || !bounties) return [];

  return bounties.map((b: any) => ({
    id: b.id,
    breweryId: b.brewery_id,
    brewId: b.brew_id,
    title: b.title,
    description: b.description,
    rewardType: b.reward_type as RewardType,
    rewardValue: b.reward_value,
    conditionType: b.condition_type as ConditionType,
    conditionValue: Number(b.condition_value),
    maxClaims: b.max_claims,
    expiresAt: b.expires_at,
    isActive: b.is_active,
    createdAt: b.created_at,
    claimCount: (b.bounty_claims ?? []).length,
    userClaimed: user
      ? (b.bounty_claims ?? []).some((c: any) => c.user_id === user.id)
      : false,
    brewName: b.brews?.name ?? null,
  }));
}

// ─── getBreweryBounties (brewer — shown in team dashboard) ───────────────────
export async function getBreweryBounties(breweryId: string): Promise<BrewerBounty[]> {
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

  const { data, error } = await supabase
    .from('brewer_bounties')
    .select(`
      id, brewery_id, brew_id, title, description, reward_type,
      reward_value, condition_type, condition_value, max_claims,
      expires_at, is_active, created_at,
      brews ( name ),
      bounty_claims ( id )
    `)
    .eq('brewery_id', breweryId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((b: any) => ({
    id: b.id,
    breweryId: b.brewery_id,
    brewId: b.brew_id,
    title: b.title,
    description: b.description,
    rewardType: b.reward_type as RewardType,
    rewardValue: b.reward_value,
    conditionType: b.condition_type as ConditionType,
    conditionValue: Number(b.condition_value),
    maxClaims: b.max_claims,
    expiresAt: b.expires_at,
    isActive: b.is_active,
    createdAt: b.created_at,
    claimCount: (b.bounty_claims ?? []).length,
    userClaimed: false,
    brewName: b.brews?.name ?? null,
  }));
}

// ─── createBounty ────────────────────────────────────────────────────────────
export async function createBounty(
  breweryId: string,
  input: CreateBountyInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nicht angemeldet' };

  // Check role
  const { data: member } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || !['owner', 'admin'].includes(member.role ?? '')) {
    return { success: false, error: 'Keine Berechtigung' };
  }

  const { data, error } = await supabase
    .from('brewer_bounties')
    .insert({
      brewery_id: breweryId,
      brew_id: input.brewId || null,
      title: input.title.trim(),
      description: input.description.trim(),
      reward_type: input.rewardType,
      reward_value: input.rewardValue.trim(),
      reward_code: input.rewardCode || null,
      condition_type: input.conditionType,
      condition_value: input.conditionValue,
      max_claims: input.maxClaims || null,
      expires_at: input.expiresAt || null,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/team/${breweryId}/bounties`);
  return { success: true, id: data.id };
}

// ─── toggleBountyActive ───────────────────────────────────────────────────────
export async function toggleBountyActive(
  bountyId: string,
  active: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nicht angemeldet' };

  const { error } = await supabase
    .from('brewer_bounties')
    .update({ is_active: active })
    .eq('id', bountyId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── claimBounty (consumer) ────────────────────────────────────────────────
// Called when a consumer meets the bounty condition (validated app-side).
export async function claimBounty(
  bountyId: string,
  qualifyingEventId?: string,
): Promise<{ success: boolean; rewardCode?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nicht angemeldet' };

  // Check: bounty still active, not expired, not over max claims
  const { data: bounty } = await supabase
    .from('brewer_bounties')
    .select('id, is_active, expires_at, max_claims, reward_code, bounty_claims(id)')
    .eq('id', bountyId)
    .single();

  if (!bounty || !bounty.is_active) {
    return { success: false, error: 'Bounty nicht mehr aktiv' };
  }
  if (bounty.expires_at && new Date(bounty.expires_at) < new Date()) {
    return { success: false, error: 'Bounty abgelaufen' };
  }
  const claimCount = (bounty as any).bounty_claims?.length ?? 0;
  if (bounty.max_claims && claimCount >= bounty.max_claims) {
    return { success: false, error: 'Alle Rewards vergeben' };
  }

  // Insert claim
  const { error } = await supabase
    .from('bounty_claims')
    .insert({
      bounty_id: bountyId,
      user_id: user.id,
      qualifying_event_id: qualifyingEventId || null,
    });

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Bereits beansprucht' };
    return { success: false, error: error.message };
  }

  return { success: true, rewardCode: bounty.reward_code ?? undefined };
}