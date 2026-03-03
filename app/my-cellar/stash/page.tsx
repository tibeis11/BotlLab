// ============================================================================
// Phase 12.2 — My Stash Page
// Route: /my-cellar/stash
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getStash } from '@/lib/actions/stash-actions';
import StashClient from './StashClient';

export const metadata = {
  title: 'Mein Stash | BotlLab',
  description: 'Dein digitaler Kühlschrank — alle Biere, die du auf Vorrat hast.',
};

export default async function StashPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const stash = await getStash();

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <StashClient initialStash={stash} />
    </main>
  );
}
