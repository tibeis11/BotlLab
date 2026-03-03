// ============================================================================
// Phase 12.3 — Create Bounty Page
// Route: /team/[breweryId]/bounties/new
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import NewBountyClient from './NewBountyClient';

interface Props {
  params: Promise<{ breweryId: string }>;
}

export const metadata = { title: 'Neue Bounty | BotlLab' };

export default async function NewBountyPage({ params }: Props) {
  const { breweryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('brewery_members')
    .select('role')
    .eq('brewery_id', breweryId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || !['owner', 'admin'].includes(member.role ?? '')) {
    redirect(`/team/${breweryId}/bounties`);
  }

  const { data: brews } = await supabase
    .from('brews')
    .select('id, name')
    .eq('brewery_id', breweryId)
    .eq('is_active', true)
    .order('name');

  return (
    <NewBountyClient
      breweryId={breweryId}
      brews={(brews ?? []).map(b => ({ id: b.id, name: b.name ?? '' }))}
    />
  );
}
