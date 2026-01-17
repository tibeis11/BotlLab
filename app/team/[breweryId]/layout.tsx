'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { NotificationProvider } from '@/app/context/NotificationContext';
import SquadHeader from '../components/SquadHeader';

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const [brewery, setBrewery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  
  const pathname = usePathname();
  
  // Use a state latch to keep the ID even if useParams flickers
  const params = useParams();
  // Initialize lazily to avoid "Waiting" state on first render if params are ready
  const [breweryId, setBreweryId] = useState<string | null>(() => {
    const initialId = params?.breweryId as string;
    return (initialId && initialId !== 'undefined') ? initialId : null;
  });

  useEffect(() => {
    const freshId = params?.breweryId as string;
    if (freshId && freshId !== 'undefined') {
      setBreweryId(freshId);
    }
  }, [params]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
        return;
    }

    if (breweryId) {
        loadBrewery(breweryId);
    } 
    // Do NOT set loading=false here if ID is missing. Wait for the ID latch.
    
  }, [breweryId, user, authLoading]);

  async function loadBrewery(id: string) {
    setLoading(true);
    // Use the shared supabase client which should have the session
    const { data, error } = await supabase
      .from('breweries')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (data) {
      setBrewery(data);
      
      if (user) {
          const { data: member } = await supabase
              .from('brewery_members')
              .select('id')
              .eq('brewery_id', id)
              .eq('user_id', user.id)
              .maybeSingle();
          
          setIsMember(!!member);

          // Update active brewery preference in background
          if (member) {
             supabase.rpc('update_active_brewery', { brewery_id: id }).then(({ error }) => {
                if (error) console.error("Failed to set active brewery context", error);
             });
          }
      }
    } else {
        console.warn(`Brewery not found in DB. ID: "${id}"`); // Warn instead of Error for 404s
        if (error) console.error("Supabase Error:", error);
    }
    setLoading(false);
  }

  if (loading) {
      if (!breweryId && !authLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Warte auf ID...</div>;
      return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Lade Team...</div>;
  }
  
  if (!brewery) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500 gap-4">
        <p>Brauerei nicht gefunden.</p>
        <p className="text-xs font-mono opacity-50">ID: {breweryId || 'unbekannt'}</p>
        <Link href="/dashboard" className="text-white underline">Zurück zum Dashboard</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <NotificationProvider>
        {breweryId && <SquadHeader breweryId={breweryId} isMember={isMember} />}

        <main className="max-w-6xl mx-auto px-4 py-8">
            {/* Context Banner - Simplified since Nav is now in Header */}
            {pathname === `/team/${breweryId}` && (
                <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-24 h-24 bg-zinc-900 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl border border-zinc-800 shadow-xl relative overflow-hidden ring-4 ring-black">
                        {brewery.logo_url ? (
                            <img src={brewery.logo_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <span>🍺</span>
                        )}
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">{brewery.name}</h1>
                    <p className="text-zinc-500 flex items-center justify-center gap-2">
                        Brauerei Profil
                        {isMember && <span className="bg-cyan-950 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-cyan-900">Member</span>}
                    </p>
                </div>
            )}

            {children}
        </main>
      </NotificationProvider>
    </div>
  );
}
