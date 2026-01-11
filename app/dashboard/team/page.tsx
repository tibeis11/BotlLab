'use client';

import { useEffect } from 'react';
import { supabase, getActiveBrewery } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function TeamRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const brewery = await getActiveBrewery(user.id);
      if (brewery) {
        // Redirect to new management page
        router.push(`/team/${brewery.id}/settings`);
      } else {
        // User has no brewery? Redirect to dashboard root or create page
        router.push('/dashboard');
      }
    }
    
    redirect();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-zinc-500 animate-pulse">Leite zur Team-Verwaltung weiter...</div>
    </div>
  );
}
