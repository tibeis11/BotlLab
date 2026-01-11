'use client';

import { useEffect } from 'react';
import { supabase, getActiveBrewery } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function TeamRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      if (!user) return;

      const brewery = await getActiveBrewery(user.id);
      if (brewery) {
        // Redirect to new management page
        router.push(`/team/${brewery.id}/settings`);
      } else {
        // User has no brewery? Redirect to dashboard root or create page
        router.push('/dashboard');
      }
    }
    
    if (!loading) {
       if (!user) {
         router.push('/login');
       } else {
         redirect();
       }
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-zinc-500 animate-pulse">Leite zur Team-Verwaltung weiter...</div>
    </div>
  );
}
