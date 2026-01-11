'use client';

import { useEffect, useState, use } from 'react';
import { supabase, getBreweryMembers } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { addToFeed } from '@/lib/feed-service';

export default function TeamMembersPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [activeBrewery, setActiveBrewery] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      loadData();
      if (typeof window !== 'undefined') {
        setInviteLink(`${window.location.origin}/team/join/${breweryId}`);
      }
    }
  }, [breweryId, authLoading]);

  async function loadData() {
    try {
      setLoading(true);

      // Get Brewery Info
      
      // Get Brewery Info
      const { data: brewery } = await supabase
        .from('breweries')
        .select('*')
        .eq('id', breweryId)
        .single();
      
      setActiveBrewery(brewery);

      // Get Members
      const memberList = await getBreweryMembers(breweryId);
      setMembers(memberList);

      if (user) {
        const myMembership = memberList.find((m: any) => m.user_id === user.id);
        setCurrentUserRole(myMembership?.role || null);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch (err) {
        console.error("Copy failed", err);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Möchtest du dieses Mitglied wirklich entfernen?')) return;
    if (!user) return;

    try {
      const { error } = await supabase
        .from('brewery_members')
        .delete()
        .eq('brewery_id', breweryId)
        .eq('user_id', userId);

      if (error) throw error;

      // Feed Update
      await addToFeed(breweryId, user, 'POST', {
        message: 'hat ein Mitglied aus dem Team entfernt.'
      });
      
      setMessage({ type: 'success', msg: 'Mitglied entfernt.' });
      loadData(); // Reload list
    } catch (error: any) {
        setMessage({ type: 'error', msg: 'Fehler beim Entfernen: ' + error.message });
    }
  }

  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-500">Lade Mitglieder...</div>;
  if (!activeBrewery) return <div className="p-20 text-center text-red-500">Brauerei nicht gefunden.</div>;

  const canManage = ['owner', 'admin'].includes(currentUserRole || '');

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      
      {/* Member List */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
        <h2 className="text-2xl font-black mb-6 text-white">Mitglieder ({members.length})</h2>
        <div className="space-y-3">
          {members.map((m, idx) => (
            <div key={idx} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between group transition hover:border-zinc-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl overflow-hidden border border-zinc-700 shrink-0">
                  {m.profiles?.logo_url ? (
                    <img src={m.profiles.logo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span>👤</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-white">
                    {m.profiles?.display_name || m.profiles?.brewery_name || 'Unbekannt'}
                  </p>
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">{m.role}</p>
                </div>
              </div>
              
              {canManage && m.role !== 'owner' && (
                <button 
                    onClick={() => handleRemoveMember(m.user_id)}
                    className="text-xs text-zinc-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100 px-3 py-1 font-medium bg-zinc-900/50 rounded-lg border border-transparent hover:border-red-500/20"
                >
                  Entfernen
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite Link */}
      {canManage && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
            <h2 className="text-2xl font-black mb-4 text-white">Brauer einladen</h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
                Kopiere diesen Link und sende ihn an deine Freunde. Sie können dem Team dann sofort beitreten.
            </p>
            
            <div className="bg-zinc-950 border border-zinc-800 p-2 pl-4 rounded-xl flex items-center justify-between gap-2 overflow-hidden">
                <code className="text-xs text-cyan-400 font-mono truncate">{inviteLink}</code>
                <button 
                    onClick={copyToClipboard}
                    className="bg-white hover:bg-zinc-200 text-black font-bold px-4 py-2 rounded-lg text-xs transition"
                >
                    {copied ? 'Kopiert!' : 'Kopieren'}
                </button>
            </div>

            <div className="mt-6 p-4 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/30">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-emerald-500">💡</span>
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Tipp</p>
            </div>
            <p className="text-xs text-zinc-500">Wenn jemand dem Link folgt, wird automatisch eine Nachricht im Team-Feed gepostet.</p>
            </div>
        </div>
      )}
    </div>
  );
}
