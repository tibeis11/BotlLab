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
  
  if (loading) return (
      <div className="flex items-center justify-center min-h-[60vh]"> 
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
  );
  
  if (!activeBrewery) return <div className="p-20 text-center text-red-500 font-bold">Brauerei nicht gefunden.</div>;

  const canManage = ['owner', 'admin'].includes(currentUserRole || '');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- LEFT COLUMN: MEMBER LIST --- */}
      <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/60 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xl min-h-[500px]">
            {/* Gradient Decor */}
            <div className="absolute top-0 right-0 p-32 bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none -mt-10 -mr-10"></div>

            <div className="relative z-10">
                <h2 className="text-3xl font-black mb-1 text-white tracking-tight">Team</h2>
                <div className="flex justify-between items-end mb-8">
                     <p className="text-zinc-400">Verwalte deine Crew und Rollen.</p>
                     <span className="text-xs font-bold bg-zinc-800/50 border border-zinc-700/50 text-emerald-400 px-3 py-1 rounded-full shadow-sm shadow-black/20">
                        {members.length} Mitglied{members.length !== 1 && 'er'}
                     </span>
                </div>
               
                <div className="space-y-4">
                {members.map((m, idx) => {
                    const tier = getTierConfig(m.profiles?.tier || 'lehrling');
                    return (
                        <div key={idx} className="bg-zinc-950/40 border border-zinc-800/50 p-4 rounded-2xl flex items-center justify-between group hover:bg-zinc-900/60 hover:border-zinc-700 transition-all duration-200">
                            {/* Left Side: Avatar & Name + Tier */}
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl overflow-hidden relative shadow-lg shrink-0 transform group-hover:scale-105 transition-transform duration-300"
                                    style={{ backgroundColor: `${tier.color}10`, borderColor: `${tier.color}20`, borderWidth: '1px' }}
                                >
                                    <img src={tier.avatarPath} className="w-full h-full object-cover" alt="" />
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                    <p className="font-bold text-white text-lg leading-none">
                                        {m.profiles?.display_name || 'Unbekannt'}
                                    </p>
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md border backdrop-blur-sm w-fit" style={{ borderColor: `${tier.color}40`, color: tier.color, backgroundColor: `${tier.color}05` }}>
                                        {tier.displayName}
                                    </span>
                                </div>
                            </div>

                            {/* Right Side: Role Badge & Actions */}
                            <div className="flex items-center gap-3">
                                {m.role === 'owner' ? (
                                    <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">Owner</span>
                                ) : (
                                    <span className="text-[10px] font-bold uppercase text-zinc-600 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">{m.role}</span>
                                )}
                                
                                {canManage && m.role !== 'owner' && (
                                    <button 
                                        onClick={() => handleRemoveMember(m.user_id)}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900/50 border border-transparent hover:border-red-500/30 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all"
                                        title="Entfernen"
                                    >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
                </div>
            </div>
          </div>
      </div>

      {/* --- RIGHT COLUMN: INVITE & INFO --- */}
      <div className="space-y-6">
        
        {/* NEW: Squad ID Card */}
        <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 backdrop-blur-lg border border-zinc-800 p-8 rounded-3xl space-y-6 shadow-xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-24 bg-cyan-900/10 blur-[80px] rounded-full pointer-events-none -mt-4 -mr-4 group-hover:bg-cyan-500/10 transition-colors duration-700"></div>

             <div>
                 <div className="flex items-center gap-3 mb-2">
                     <span className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                        {/* Ticket Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v4.072c0 .621.504 1.125 1.125 1.125 0 011.125 1.125v4.072c0 .621.504 1.125.504 1.125.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                        </svg>
                     </span>
                     <h3 className="font-bold text-white text-lg">Invite Code</h3>
                 </div>
                 <p className="text-sm text-zinc-400 leading-relaxed">
                    Teile diesen Code, damit Freunde deinem Squad beitreten können.
                 </p>
             </div>

            <div className="space-y-3">
                <div onClick={() => {}} className="bg-black/50 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-3 group/code cursor-pointer hover:border-cyan-500/50 hover:bg-zinc-900/80 transition-all duration-300 shadow-inner">
                    <code className="font-mono text-cyan-400 text-xs sm:text-sm font-bold tracking-widest break-all select-all">
                        {activeBrewery?.invite_code || '---'}
                    </code>
                    <button 
                    onClick={(e) => { 
                        e.stopPropagation();
                        if(activeBrewery?.invite_code) {
                            navigator.clipboard.writeText(activeBrewery.invite_code); 
                            setMessage({type: 'success', msg: 'Code kopiert!'}); 
                            setTimeout(() => setMessage(null), 3000);
                        }
                    }} 
                    className="p-2 hover:bg-cyan-500/10 rounded-lg text-zinc-500 hover:text-cyan-400 transition"
                    title="Code kopieren"
                    >
                        {/* Simpler Copy Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-7.5" />
                        </svg>
                    </button>
                </div>
                
                {canManage && (
                    <button 
                        onClick={handleRegenerateCode}
                        className="w-full text-xs text-zinc-600 hover:text-red-400 transition-colors font-bold uppercase tracking-widest text-center py-2 flex justify-center items-center gap-2 hover:bg-red-500/5 rounded-xl border border-transparent hover:border-red-500/10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Code erneuern
                    </button>
                )}
            </div>
        </div>

        {/* Legacy Option */}
        {canManage && (
            <div className="p-6 rounded-3xl space-y-3 opacity-60 hover:opacity-100 transition-opacity border border-zinc-800/30 border-dashed">
                <h3 className="font-bold text-zinc-500 text-xs uppercase tracking-widest">Alternativ</h3>
                <div onClick={copyToClipboard} className="bg-zinc-950/50 border border-zinc-800/50 p-3 pl-4 rounded-xl flex items-center justify-between gap-2 overflow-hidden cursor-pointer hover:border-zinc-700 transition">
                    <span className="text-xs text-zinc-500 font-mono truncate select-all">{inviteLink.replace('https://', '')}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded bg-zinc-900 text-zinc-400 ${copied ? 'text-emerald-500' : ''}`}>
                        {copied ? 'Kopiert' : 'Link'}
                    </span>
                </div>
            </div>
        )}

        {message && (
             <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-right-4 fade-in shadow-xl ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                 <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                 {message.msg}
             </div>
        )}
      </div>

    </div>
  );
}
