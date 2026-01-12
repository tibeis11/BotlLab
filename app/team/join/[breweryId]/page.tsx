'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { addToFeed } from '@/lib/feed-service';
import Link from 'next/link';

export default function JoinBreweryPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [brewery, setBrewery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
       loadInfo();
    }
  }, [breweryId, authLoading, user]);

  async function loadInfo() {
    setLoading(true);
    
    // 1. Get Brewery by Invite Code (parameter "breweryId" contains the code now)
    const { data, error } = await supabase
        .from('breweries')
        .select('*')
        .eq('invite_code', breweryId)
        .maybeSingle();
        
    if (error || !data) {
        // Fallback for old links (Support transition phase) -> check if it's a UUID
        // But for security, we might want to disable ID lookup eventually.
        // For now, strict mode: Code only.
        setError("Einladung ungültig oder abgelaufen (Code nicht gefunden).");
        setLoading(false);
        return;
    }
    setBrewery(data);
    
    // Real ID is data.id
    const realBreweryId = data.id;

    // 2. Check if already member
    if (user) {
        const { data: member } = await supabase
            .from('brewery_members')
            .select('role')
            .eq('brewery_id', realBreweryId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (member) {
            // Already member -> redirect
            router.replace(`/team/${realBreweryId}`);
            return;
        }
    }

    setLoading(false);
  }

  async function handleJoin() {
    if (!user || !brewery) return;
    setJoining(true);
    
    try {
        // Insert Member
        const { error: joinError } = await supabase
            .from('brewery_members')
            .insert({
                brewery_id: brewery.id,
                user_id: user.id,
                role: 'brewer' // Default role
            });

        if (joinError) throw joinError;

        // Feed Update
        await addToFeed(brewery.id, user, 'MEMBER_JOINED', {
            member_name: 'Ein neuer Brauer'
        });

        // Redirect
        router.push(`/team/${brewery.id}`);

    } catch (err: any) {
        setError(err.message);
        setJoining(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center animate-pulse">Lade...</div>;
  if (error) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Fehler</h1>
        <p className="text-zinc-400 mb-6">{error}</p>
        <Link href="/dashboard" className="underline">Zum Dashboard</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
         
         <div className="w-20 h-20 bg-zinc-800 rounded-full mx-auto mb-4 border-2 border-zinc-700 overflow-hidden flex items-center justify-center text-3xl">
            {brewery.logo_url ? <img src={brewery.logo_url} className="w-full h-full object-cover" /> : '🍻'}
         </div>

         <h1 className="text-2xl font-black mb-2">Einladung zu &quot;{brewery.name}&quot;</h1>
         <p className="text-zinc-400 mb-8">
            Du wurdest eingeladen, diesem Brau-Team beizutreten. Du erhältst Zugriff auf alle Rezepte und das Inventar.
         </p>

         {!user ? (
            <Link 
                href={`/login?redirect=/team/join/${breweryId}`}
                className="block w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition"
            >
                Erst einloggen
            </Link>
         ) : (
            <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {joining ? 'Trete bei...' : 'Team beitreten 🚀'}
            </button>
         )}
         
         <div className="mt-6">
            <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-white transition">Nein, danke. Zurück zum Dashboard.</Link>
         </div>

      </div>
    </div>
  );
}
