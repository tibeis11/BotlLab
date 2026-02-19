'use client';

import { useEffect, useState, use } from 'react';
import { getBreweryMembers } from '@/lib/supabase';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { addToFeed } from '@/lib/feed-service';
import { getTierConfig, getBreweryTierConfig, BreweryTierName } from '@/lib/tier-system';
import { trackEvent } from '@/lib/actions/analytics-actions';
import { Users, Shield, Copy, RefreshCcw, Trash2, Crown, Sparkles, Check, Search } from 'lucide-react';

export default function TeamMembersPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const supabase = useSupabase();
  const { breweryId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [activeBrewery, setActiveBrewery] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [memberLimit, setMemberLimit] = useState(3);
  
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
      const { data: brewery } = await supabase
        .from('breweries')
        .select('*')
        .eq('id', breweryId)
        .single();
      
      if (brewery) {
        setActiveBrewery(brewery);
        const config = getBreweryTierConfig((brewery.tier || 'garage') as BreweryTierName);
        setMemberLimit(config.limits.maxMembers);
      }

      // Get Members
      const memberList = await getBreweryMembers(breweryId, supabase);
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

  async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setMessage({type: 'success', msg: 'Kopiert!'});
        setTimeout(() => setMessage(null), 2000);
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
      await addToFeed(supabase, breweryId, user, 'POST', {
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
      <div className="flex items-center justify-center py-20"> 
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
  );
  
  if (!activeBrewery) return <div className="p-20 text-center text-red-500 font-bold">Brauerei nicht gefunden.</div>;

  const canManage = ['owner', 'admin'].includes(currentUserRole || '');
  const limitReached = members.length >= memberLimit;

  return (
    <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-8">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Team & Rollen</h1>
                     {limitReached && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-amber-500 bg-amber-500/10 border border-amber-500/20">
                            Crew Voll
                        </span>
                    )}
                </div>
                <p className="text-sm text-zinc-500">Verwalte deine Brau-Crew, verteile Rollen und lade neue Mitglieder ein.</p>
            </div>

            <div className="flex items-center gap-4">
                 <div className="h-8 w-px bg-zinc-800 hidden md:block"></div>
                 <div className="text-right hidden md:block">
                    <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-0.5">Crew Kapazität</p>
                    <div className="text-zinc-300 font-mono text-xs text-right flex items-center justify-end gap-2">
                        <span className={limitReached ? "text-amber-500" : ""}>{members.length} / {memberLimit}</span>
                    </div>
                 </div>
            </div>
        </header>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start relative">
      
      {/* --- LEFT COLUMN: SIDEBAR --- */}
      <div className="space-y-6 lg:sticky lg:top-8 z-20">
          
          {/* Stats Card */}
          <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="text-purple-500 text-xs font-bold uppercase tracking-wider relative z-10">Mitglieder</div>
                <div className="text-2xl font-mono font-bold text-purple-400 relative z-10">{members.length}</div>
          </div>

          {/* Invite Card */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors">
                <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/50">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Invite Friends
                    </h3>
                </div>
                <div className="p-4 space-y-4">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Teile diesen Code, damit Freunde deinem Squad beitreten können.
                    </p>

                    {limitReached ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded text-center">
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Limit erreicht</p>
                            <p className="text-[10px] text-amber-400/80 mt-1">Upgrade für mehr Slots.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <div 
                                onClick={() => copyToClipboard(activeBrewery?.invite_code || '')}
                                className="bg-black border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between cursor-pointer group/code hover:border-emerald-500/50 transition-colors"
                             >
                                <code className="font-mono text-emerald-400 text-xs font-bold tracking-widest truncate">
                                    {activeBrewery?.invite_code || '---'}
                                </code>
                                <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover/code:text-emerald-400" />
                             </div>
                             
                             <button 
                                onClick={() => copyToClipboard(inviteLink)}
                                className="w-full text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg font-bold transition-colors"
                             >
                                Link kopieren
                             </button>
                        </div>
                    )}

                    {canManage && (
                         <button 
                            onClick={handleRegenerateCode}
                            className="flex items-center justify-center gap-1.5 w-full text-[10px] text-zinc-600 hover:text-zinc-400 py-1"
                        >
                            <RefreshCcw className="w-3 h-3" /> Neues Token
                        </button>
                    )}
                </div>
          </div>

          {message && (
             <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-left-4 fade-in ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                 <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                 {message.msg}
             </div>
          )}

      </div>

      {/* --- RIGHT COLUMN: MEMBER LIST --- */}
      <div className="space-y-6">
        
        {/* Toolbar */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative group w-full sm:w-auto flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                <input 
                    type="text" 
                    placeholder="Mitglied suchen..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
                />
            </div>
        </div>

        {/* Member Grid */}
        <div className="grid grid-cols-1 gap-4">
                {members.filter(m => (m.profiles?.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())).map((m, idx) => {
                    const tier = getTierConfig(m.profiles?.tier || 'lehrling');
                    const isOwner = m.role === 'owner';
                    const isAdmin = m.role === 'admin';
                    
                    return (
                    <div key={idx} className="bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700/80 p-4 rounded-2xl flex items-center justify-between group transition-all duration-200">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="relative">
                                <div 
                                    className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shadow-inner border"
                                    style={{ backgroundColor: `${tier.color}10`, borderColor: `${tier.color}30` }}
                                >
                                    <img src={tier.avatarPath} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="" />
                                </div>
                                {isOwner && (
                                    <div className="absolute -top-2 -right-2 bg-zinc-950 rounded-full p-1 border border-amber-500/30">
                                        <Crown className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="font-bold text-white text-base leading-none">
                                        {m.profiles?.display_name || 'Unbekannt'}
                                    </h3>
                                    {isOwner && (
                                        <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded tracking-wider">Owner</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800/80">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tier.color }}></div>
                                        <span className="text-[10px] font-bold uppercase text-zinc-400">
                                            {tier.displayName}
                                        </span>
                                    </div>
                                    {!isOwner && (
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${isAdmin ? 'text-cyan-500 bg-cyan-500/10' : 'text-zinc-600 bg-zinc-900'}`}>
                                            {m.role}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Actions */}
                        {canManage && m.role !== 'owner' && (
                            <button 
                                onClick={() => handleRemoveMember(m.user_id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900/50 border border-transparent hover:border-red-500/30 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                title="Entfernen"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )})}

                {members.length === 0 && (
                     <div className="p-12 text-center text-zinc-500 bg-zinc-900/20 border border-zinc-800 rounded-2xl border-dashed">
                        Keine Mitglieder gefunden.
                    </div>
                )}
        </div>

      </div>
    </div>
    </div>
  );
}

