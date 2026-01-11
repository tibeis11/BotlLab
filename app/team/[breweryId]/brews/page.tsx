'use client';

import { useEffect, useState, use } from 'react';
import { supabase, getBreweryMembers } from '@/lib/supabase';
import Link from 'next/link';

// Simple Icon Components
const PlusIconSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const PencilIconSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
  </svg>
);

export default function TeamBrewsPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const [brews, setBrews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    checkPermissionAndLoad();
  }, [breweryId]);

  async function checkPermissionAndLoad() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();

      let memberStatus = false;

      if (user) {
        const members = await getBreweryMembers(breweryId);
        const isUserMember = members.some((m: any) => m.user_id === user.id);
        setIsMember(isUserMember);
        memberStatus = isUserMember;
      } else {
        setIsMember(false);
      }

      let query = supabase
        .from('brews')
        .select('*')
        .eq('brewery_id', breweryId)
        .order('created_at', { ascending: false });

      if (!memberStatus) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setBrews(data || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <span className="loading loading-spinner text-primary"></span> Lädt Rezepte...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Rezepte</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {isMember 
              ? 'Verwalte die Rezepte deiner Brauerei' 
              : 'Öffentliche Rezepte dieser Brauerei'}
          </p>
        </div>
        
        {isMember && (
          <Link
            href={`/team/${breweryId}/brews/new`}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <PlusIconSVG />
            Neues Rezept
          </Link>
        )}
      </div>

      {brews.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/30 rounded-xl border border-zinc-800/50 border-dashed">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-zinc-300">Keine Rezepte gefunden</h3>
          <p className="text-zinc-500 mt-2 max-w-sm mx-auto">
            {isMember 
              ? 'Es wurden noch keine Rezepte angelegt. Starte jetzt mit deinem ersten Sud!' 
              : 'Diese Brauerei hat noch keine öffentlichen Rezepte geteilt.'}
          </p>
          {isMember && (
            <div className="mt-6">
               <Link
                href={`/team/${breweryId}/brews/new`}
                className="text-amber-500 hover:text-amber-400 font-medium inline-flex items-center gap-1"
              >
                Rezept erstellen &rarr;
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brews.map((brew) => (
            <div key={brew.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all group hover:shadow-lg hover:shadow-black/40 flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono text-amber-500 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">
                    {brew.style || 'Unbekannter Stil'}
                  </span>
                  {isMember && (
                    <div className="flex gap-1 group-hover:opacity-100 opacity-0 transition-opacity">
                      <Link 
                        href={`/team/${breweryId}/brews/${brew.id}/edit`}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md"
                        title="Bearbeiten"
                      >
                         <PencilIconSVG />
                      </Link>
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-zinc-100 mb-1 line-clamp-1 group-hover:text-amber-500 transition-colors">
                  <Link href={`/brew/${brew.id}`} className="hover:underline decoration-amber-500/50">
                    {brew.name}
                  </Link>
                </h3>
                
                <div className="flex items-center gap-3 text-sm text-zinc-400 mt-3">
                  {brew.abv && (
                    <span className="flex items-center gap-1" title="Alcohol by Volume">
                      <span className="text-zinc-600">ABV</span>
                      <span className="text-zinc-200">{brew.abv}%</span>
                    </span>
                  )}
                  {brew.ibu && (
                    <span className="flex items-center gap-1" title="International Bitterness Units">
                      <span className="text-zinc-600">IBU</span>
                      <span className="text-zinc-200">{brew.ibu}</span>
                    </span>
                  )}
                </div>
                
                {brew.description && (
                  <p className="text-zinc-500 text-sm mt-3 line-clamp-2">
                    {brew.description}
                  </p>
                )}
              </div>
              
              <div className="px-5 py-3 bg-zinc-950/30 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
                <span>{new Date(brew.inserted_at).toLocaleDateString('de-DE')}</span>
                <div className="flex gap-2">
                  {!brew.is_public && isMember && (
                    <span className="flex items-center gap-1 text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      Privat
                    </span>
                  )}
                  {brew.is_public && (
                     <span className="flex items-center gap-1 text-green-500/70 bg-green-950/20 px-2 py-0.5 rounded border border-green-900/20">
                      Öffentlich
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
