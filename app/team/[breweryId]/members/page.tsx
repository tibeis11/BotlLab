'use client';

import { useEffect, useState, use } from 'react';
import { supabase, getBreweryMembers } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function TeamMembersPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [activeBrewery, setActiveBrewery] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [breweryId]);

  async function loadData() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    setMessage(null);

    try {
      // Logic for adding a member by email will go here.
      // Usually: 
      // 1. Look up user by email in profiles (if public emails) or auth (admin only).
      // 2. Or create an 'invitation' record.
      // For now, we keep the mock message or partial implementation.
      
      // Attempt to find user by email (assuming accessible profiles table has email, often it doesn't for security)
      // Since we can't easily look up user ID by email client-side without a specific RPC or generic search,
      // we will just show the placeholder message as requested/present in the old dashboard.
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Fake delay
      setMessage({ type: 'error', msg: 'Das Einladungs-System erfordert eine API-Route für E-Mails. (Prototype)' });

    } catch (error: any) {
      setMessage({ type: 'error', msg: error.message });
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Möchtest du dieses Mitglied wirklich entfernen?')) return;

    try {
      const { error } = await supabase
        .from('brewery_members')
        .delete()
        .eq('brewery_id', breweryId)
        .eq('user_id', userId);

      if (error) throw error;
      
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

      {/* Invite Form */}
      {canManage && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
            <h2 className="text-2xl font-black mb-4 text-white">Brauer einladen</h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
            Teile den Namen oder die E-Mail eines anderen BotlLab Nutzers, um ihn zu deinem Team hinzuzufügen.
            </p>
            
            <form onSubmit={handleInvite} className="space-y-4">
            <input 
                type="email" 
                placeholder="E-Mail Adresse"
                className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl outline-none focus:border-cyan-500 transition text-white placeholder-zinc-600"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
            />
            <button 
                disabled={isInviting}
                className="w-full bg-white text-black font-black py-3 rounded-xl hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
                {isInviting ? 'Sende Einladung...' : 'Einladung senden'}
            </button>
            </form>

            {message && (
            <div className={`text-sm p-4 rounded-xl font-medium mt-4 border ${
                message.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
                {message.msg}
            </div>
            )}

            <div className="mt-6 p-4 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/30">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-500">⚠️</span>
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Wichtig</p>
            </div>
            <p className="text-xs text-zinc-500">Teammitglieder können Rezepte bearbeiten und Flaschen abfüllen.</p>
            </div>
        </div>
      )}
    </div>
  );
}
