import { createClient } from '@/lib/supabase-server';
import ClientBrewPage from './ClientBrewPage';

export default async function BrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Try to pre-fetch brew and user
  const { data: { user } } = await supabase.auth.getUser();

  const { data: brewData, error: brewError } = await supabase
    .from('brews')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  let initialError = null;

  if (brewError || !brewData) {
    initialError = "Rezept nicht gefunden";
  } else {
    let hasAccess = brewData.is_public;
    if (!hasAccess && user) {
      if (brewData.user_id === user.id) {
        hasAccess = true;
      } else if (brewData.brewery_id) {
        const { data: member } = await supabase
          .from('brewery_members')
          .select('id')
          .eq('brewery_id', brewData.brewery_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (member) hasAccess = true;
      }
    }
    if (!hasAccess) {
      initialError = "Dieses Rezept ist privat und nur für Team-Mitglieder sichtbar.";
    }
  }

  return (
    <ClientBrewPage 
      initialData={!initialError ? brewData : null} 
      initialError={initialError} 
      initialUser={user}
    />
  );
}
