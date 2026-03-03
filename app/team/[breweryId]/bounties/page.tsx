// ============================================================================
// Phase 12.3 — Brewer Bounties Dashboard Page
// Route: /team/[breweryId]/bounties
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getBreweryBounties } from '@/lib/actions/bounty-actions';
import BountiesClient from './BountiesClient';

interface Props {
  params: Promise<{ breweryId: string }>;
}

export async function generateMetadata({ params }: Props) {
  return { title: 'Bounties | BotlLab' };
}

export default async function BountiesPage({ params }: Props) {
  const { breweryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify membership
  const { data: member } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) redirect(`/team/${breweryId}`);

  // Load brews for the "assigned brew" dropdown
  const { data: brews } = await supabase
    .from('brews')
    .select('id, name')
    .eq('brewery_id', breweryId)
    .eq('is_active', true)
    .order('name');

  const bounties = await getBreweryBounties(breweryId);

  return (
    <BountiesClient
      breweryId={breweryId}
      bounties={bounties}
      brews={(brews ?? []).map(b => ({ id: b.id, name: b.name ?? '' }))}
      canManage={['owner', 'admin'].includes(member.role ?? '')}
    />
  );
}
