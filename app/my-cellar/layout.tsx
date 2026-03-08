// ZWEI WELTEN Phase 2 — Consumer Dashboard Layout
// Server Component: Auth guard → /login, keine Brewer-Weiche nötig
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import ConsumerHeader from './components/ConsumerHeader';

export default async function MyCellarLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?callbackUrl=/my-cellar');
  }

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      <Suspense fallback={<div className="h-14 bg-background border-b border-border-subtle" />}>
        <ConsumerHeader />
      </Suspense>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
