'use client';

import { useEffect, useState, use } from 'react';
import { supabase, getBreweryMembers } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { addToFeed } from '@/lib/feed-service';
import { getTierConfig } from '@/lib/tier-system';

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
    }
  }, [breweryId, authLoading]);

  useEffect(() => {
    if (activeBrewery?.invite_code && typeof window !== 'undefined') {
        setInviteLink(`${window.location.origin}/team/join/${activeBrewery.invite_code}`);
    }
  }, [activeBrewery]);

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

  async function handleRegenerateCode() {
    if (!confirm('ACHTUNG: Wenn du einen neuen Code generierst, wird der alte ungültig. Möchtest du fortfahren?')) return;
    try {
        const newCode = crypto.randomUUID();
        const { error } = await supabase
            .from('breweries')
            .update({ invite_code: newCode })
            .eq('id', breweryId);
            
        if(error) throw error;
        
        // Update local state
        setActiveBrewery((prev: any) => prev ? ({...prev, invite_code: newCode}) : null);
        setMessage({ type: 'success', msg: 'Neuer Code generiert!' });
        setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
        setMessage({ type: 'error', msg: 'Fehler: ' + e.message });
    }
  }
  
  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-500">Lade Mitglieder...</div>;
  if (!activeBrewery) return <div className="p-20 text-center text-red-500">Brauerei nicht gefunden.</div>;

  const canManage = ['owner', 'admin'].includes(currentUserRole || '');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      
      {/* --- LEFT COLUMN: MEMBER LIST --- */}
      <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
            <h2 className="text-2xl font-black mb-6 text-white flex justify-between items-center">
                <span>Mitglieder</span>
                <span className="text-sm bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full">{members.length}</span>
            </h2>
            <div className="space-y-3">
              {members.map((m, idx) => {
                const tier = getTierConfig(m.profiles?.tier || 'lehrling');
                return (
                <div key={idx} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between group transition hover:border-zinc-700">
                  <div className="flex items-center gap-4">
                    <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl overflow-hidden relative shadow-lg shrink-0"
                        style={{ backgroundColor: `${tier.color}20` }}
                    >
                        <div className="absolute inset-0 border-2 rounded-full opacity-50" style={{ borderColor: tier.color }}></div>
                        <img src={tier.avatarPath} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                          <p className="font-bold text-white">
                            {m.profiles?.display_name || 'Unbekannt'}
                          </p>
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded border" style={{ borderColor: `${tier.color}40`, color: tier.color, backgroundColor: `${tier.color}10` }}>
                             {tier.displayName}
                          </span>
                      </div>
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
              )})}
            </div>
          </div>
      </div>

      {/* --- RIGHT COLUMN: INVITE & INFO --- */}
      <div className="space-y-6">
        
        {/* NEW: Squad ID Card */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4 shadow-xl">
             <div className="flex items-center justify-between mb-2">
                 <h3 className="font-bold text-white">Squad ID</h3>
                 <span className="text-2xl opacity-20 grayscale">🎟️</span>
             </div>
             
             <p className="text-xs text-zinc-500 mb-2">
                Teile diesen Code, damit Freunde deinem Squad beitreten können.
             </p>

            <div className="bg-black border border-zinc-800/50 p-3 rounded-xl flex items-center gap-3 group hover:border-cyan-900/50 transition">
                <code className="flex-1 font-mono text-cyan-400 text-sm text-center tracking-wider select-all truncate">
                    {activeBrewery?.invite_code || '---'}
                </code>
                <button 
                  onClick={() => { 
                      if(activeBrewery?.invite_code) {
                        navigator.clipboard.writeText(activeBrewery.invite_code); 
                        setMessage({type: 'success', msg: 'Code kopiert!'}); 
                        setTimeout(() => setMessage(null), 3000);
                      }
                  }} 
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                  title="Code kopieren"
                >
                    📋
                </button>
            </div>
            
            {canManage && (
                <button 
                    onClick={handleRegenerateCode}
                    className="w-full text-[10px] text-zinc-600 hover:text-red-400 transition font-bold uppercase tracking-widest text-center py-1 flex justify-center items-center gap-1"
                >
                    <span>Code neu generieren?</span>
                    <span className="text-sm">↻</span>
                </button>
            )}
        </div>

        {/* Existing: Direct Link (Legacy / Option) */}
        {canManage && (
            <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl space-y-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-widest text-zinc-500">Oder per Link</h3>
                <div className="bg-zinc-950 border border-zinc-800 p-2 pl-3 rounded-xl flex items-center gap-2 overflow-hidden">
                    <code className="text-[10px] text-zinc-500 font-mono truncate flex-1">{inviteLink}</code>
                    <button 
                        onClick={copyToClipboard}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-2 rounded-lg font-bold transition shrink-0"
                    >
                        {copied ? 'Check!' : 'Copy'}
                    </button>
                </div>
            </div>
        )}

        {message && (
             <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold p-3 rounded-xl text-center animate-in fade-in">
                 {message.msg}
             </div>
        )}
      </div>

    </div>
  );
}
