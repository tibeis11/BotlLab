'use client';

import { useEffect, useState, use } from 'react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useAuth } from '@/app/context/AuthContext';
import { getBreweryFeed, addToFeed, type FeedItem } from '@/lib/feed-service';
import Link from 'next/link';
import { 
  Beer, Crown, MessageSquare, Send, Shield, Star,
  Trophy, UserPlus, Users, Newspaper, Activity, ArrowLeft
} from 'lucide-react';

/* ─── Event config ─────────────────────────────────────────── */
const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; accent: string }> = {
  POST:                  { icon: MessageSquare, color: 'text-blue-400',    accent: 'border-blue-500/20 bg-blue-500/5' },
  BREW_CREATED:          { icon: Beer,          color: 'text-cyan-400',    accent: 'border-cyan-500/20 bg-cyan-500/5' },
  BREW_UPDATED:          { icon: Beer,          color: 'text-cyan-400',    accent: 'border-cyan-500/20 bg-cyan-500/5' },
  BREW_RATED:            { icon: Star,          color: 'text-yellow-400',  accent: 'border-yellow-500/20 bg-yellow-500/5' },
  MEMBER_JOINED:         { icon: UserPlus,      color: 'text-emerald-400', accent: 'border-emerald-500/20 bg-emerald-500/5' },
  ACHIEVEMENT:           { icon: Trophy,        color: 'text-purple-400',  accent: 'border-purple-500/20 bg-purple-500/5' },
  FORUM_THREAD_CREATED:  { icon: Newspaper,     color: 'text-orange-400',  accent: 'border-orange-500/20 bg-orange-500/5' },
};

export default function TeamFeedPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const supabase = useSupabase();
  const { breweryId } = use(params);
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [breweryName, setBreweryName] = useState('');
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && breweryId) {
      loadData();
      
      const channel = supabase
        .channel('feed_updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'brewery_feed', filter: `brewery_id=eq.${breweryId}` },
           () => loadFeedOnly()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, breweryId]);

  async function loadData() {
    setLoading(true);
    
    const { data: b } = await supabase.from('breweries').select('name').eq('id', breweryId).single();
    if(b) setBreweryName(b.name);

    const { data: members } = await supabase.from('brewery_members').select('user_id, role').eq('brewery_id', breweryId);
    if(members) {
        const roles: Record<string, string> = {};
        members.forEach(m => {
          if (m.user_id) roles[m.user_id] = m.role || 'member';
        });
        setMemberRoles(roles);
    }

    await loadFeedOnly();
    setLoading(false);
  }

  async function loadFeedOnly() {
    const items = await getBreweryFeed(supabase, breweryId);
    setFeed(items);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newPost.trim() || !user) return;

    setIsPosting(true);
    await addToFeed(supabase, breweryId, user, 'POST', { message: newPost });
    setNewPost('');
    setIsPosting(false);
    loadFeedOnly();
  }

  /* ─── Time helpers ──────────────────────────────────────── */
  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'gerade eben';
    if (mins < 60) return `vor ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `vor ${days}d`;
    return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  }

  /* ─── Content renderer ─────────────────────────────────── */
  function getSystemContent(item: FeedItem): React.ReactNode {
    switch(item.type) {
      case 'BREW_CREATED':
        return <>hat <Link href={`/team/${breweryId}/brews/editor/${item.content.brew_id}`} className="text-cyan-400 hover:text-cyan-300 font-bold transition">{item.content.brew_name}</Link> entworfen</>;
      case 'BREW_UPDATED':
        return <>hat <Link href={`/team/${breweryId}/brews/editor/${item.content.brew_id}`} className="text-cyan-400 hover:text-cyan-300 font-bold transition">{item.content.brew_name}</Link> aktualisiert</>;
      case 'MEMBER_JOINED':
        return <span className="text-emerald-400 font-bold">ist dem Team beigetreten</span>;
      case 'ACHIEVEMENT':
        return <>hat <span className="text-purple-400 font-bold">{item.content.title}</span> freigeschaltet</>;
      case 'BREW_RATED':
        return <>hat <Link href={`/team/${breweryId}/brews/${item.content.brew_id}`} className="text-cyan-400 hover:text-cyan-300 font-bold transition">{item.content.brew_name}</Link> mit <span className="text-yellow-400 font-bold">{item.content.rating}★</span> bewertet</>;
      case 'FORUM_THREAD_CREATED':
        return <>hat <Link href={`/forum/thread/${item.content.thread_id}`} className="text-emerald-400 hover:text-emerald-300 font-bold transition">{item.content.title}</Link> gestartet</>;
      default:
        return <span className="text-zinc-400">{item.content.message}</span>;
    }
  }

  /* ─── Role badge ────────────────────────────────────────── */
  function RoleBadge({ role }: { role: string | null }) {
    if (role === 'owner') return (
      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider inline-flex items-center gap-0.5">
        <Crown className="w-2.5 h-2.5" /> Owner
      </span>
    );
    if (role === 'admin') return (
      <span className="bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider inline-flex items-center gap-0.5">
        <Shield className="w-2.5 h-2.5" /> Admin
      </span>
    );
    return null;
  }

  /* ─── Group feed by date ────────────────────────────────── */
  function groupByDate(items: FeedItem[]): { label: string; items: FeedItem[] }[] {
    const groups: { label: string; items: FeedItem[] }[] = [];
    let currentLabel = '';
    
    for (const item of items) {
      const label = formatDate(item.created_at);
      if (label !== currentLabel) {
        groups.push({ label, items: [item] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].items.push(item);
      }
    }
    return groups;
  }

  /* ─── Feed item renderer ────────────────────────────────── */
  function renderFeedItem(item: FeedItem) {
    const isPost = item.type === 'POST';
    const roleInBrewery = item.user_id ? memberRoles[item.user_id] : null;
    const avatarUrl = item.profiles?.logo_url || '/tiers/lehrling.png';
    const displayName = item.profiles?.display_name || item.content.author || 'Braumeister';
    const isMe = user?.id === item.user_id;
    const config = EVENT_CONFIG[item.type] || { icon: Activity, color: 'text-zinc-400', accent: 'border-zinc-800 bg-zinc-900/30' };
    const Icon = config.icon;

    return (
      <div 
        key={item.id} 
        className="group animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="shrink-0 pt-0.5">
            <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
              <img src={avatarUrl} className="w-full h-full object-cover" alt={displayName} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold ${isMe ? 'text-cyan-400' : 'text-zinc-200'} truncate`}>
                {displayName}
              </span>
              <RoleBadge role={roleInBrewery} />
              <span className="text-[10px] text-zinc-600 ml-auto shrink-0">{timeAgo(item.created_at)}</span>
            </div>

            {/* Body */}
            {isPost ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                {item.content.message}
              </div>
            ) : (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${config.accent} text-xs text-zinc-400`}>
                <Icon className={`w-3.5 h-3.5 ${config.color} shrink-0`} />
                <span>{getSystemContent(item)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Stats ─────────────────────────────────────────────── */
  const memberCount = Object.keys(memberRoles).length;
  const messageCount = feed.filter(f => f.type === 'POST').length;
  const systemEvents = feed.filter(f => f.type !== 'POST').length;
  const dateGroups = groupByDate(feed);

  return (
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-cyan-400 bg-cyan-950/30 border border-cyan-500/20">
              Team Feed
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">Squad Feed</h1>
          <p className="text-sm text-zinc-500">Euer Stammtisch — Neuigkeiten, Posts und Team-Events an einem Ort.</p>
        </div>
        <Link
          href={`/team/${breweryId}/dashboard`}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-xs font-bold text-zinc-300 hover:text-white transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </header>

      {/* METRICS ROW */}
      <div className="grid grid-cols-3 gap-3">
        <MetricPill icon={<MessageSquare className="w-4 h-4" />} label="Posts" value={messageCount} color="text-blue-400" />
        <MetricPill icon={<Activity className="w-4 h-4" />} label="Events" value={systemEvents} color="text-cyan-400" />
        <MetricPill icon={<Users className="w-4 h-4" />} label="Mitglieder" value={memberCount} color="text-purple-400" />
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start relative">

        {/* LEFT: Feed content */}
        <div className="space-y-6 min-w-0">
          
          {/* Compose box */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden focus-within:border-cyan-500/30 transition-all">
            <div className="absolute top-0 right-0 p-20 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none -mt-8 -mr-8" />
            
            <form onSubmit={handlePost} className="relative z-10">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder={`Was gibt's Neues, ${user?.user_metadata?.display_name || 'Braumeister'}?`}
                className="w-full bg-zinc-950/40 border border-zinc-800/50 focus:border-cyan-500/40 p-4 rounded-xl text-sm text-white placeholder-zinc-600 resize-none focus:outline-none min-h-[80px] transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newPost.trim()) handlePost(e);
                  }
                }}
              />
              <div className="flex justify-between items-center mt-3">
                <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" />
                  Enter zum Senden
                </div>
                <button 
                  type="submit" 
                  disabled={!newPost.trim() || isPosting}
                  className="bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold px-5 py-2 rounded-lg text-xs transition-all flex items-center gap-2 active:scale-95 uppercase tracking-wider"
                >
                  {isPosting ? 'Sende...' : (
                    <>
                      Posten
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Feed items */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
              <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mt-4">Lade Feed...</p>
            </div>
          ) : feed.length === 0 ? (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-12 text-center">
              <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                <MessageSquare className="w-6 h-6 text-zinc-700" />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Noch keine Aktivität</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-6">
                Starte die Unterhaltung — dein Team wird benachrichtigt.
              </p>
              <button 
                onClick={() => document.querySelector('textarea')?.focus()} 
                className="text-cyan-400 hover:text-cyan-300 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Erste Nachricht schreiben →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {dateGroups.map((group) => (
                <div key={group.label}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-zinc-800/50" />
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest shrink-0">
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-zinc-800/50" />
                  </div>
                  
                  <div className="space-y-4">
                    {group.items.map(renderFeedItem)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-8">
          
          {/* Brewery info */}
          {breweryName && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
              <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">Brauerei</div>
              <div className="text-sm font-bold text-white truncate">{breweryName}</div>
            </div>
          )}

          {/* Active members */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-zinc-800/50 bg-zinc-900/50">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                Team ({memberCount})
              </h3>
            </div>
            <div className="p-3">
              <div className="flex flex-wrap gap-1">
                {Object.entries(memberRoles).slice(0, 12).map(([userId, role]) => {
                  const feedItem = feed.find(f => f.user_id === userId);
                  const name = feedItem?.profiles?.display_name || '';
                  const initials = name ? name.slice(0, 2).toUpperCase() : '??';
                  
                  return (
                    <div 
                      key={userId} 
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border ${
                        role === 'owner' 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                          : role === 'admin'
                          ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                          : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400'
                      }`}
                      title={name || userId}
                    >
                      {initials}
                    </div>
                  );
                })}
                {Object.keys(memberRoles).length > 12 && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold bg-zinc-800/50 border border-zinc-700/50 text-zinc-500">
                    +{Object.keys(memberRoles).length - 12}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-zinc-800/50 bg-zinc-900/50">
              <h3 className="text-xs font-bold text-white">Schnellzugriff</h3>
            </div>
            <div className="p-1.5 space-y-0.5">
              <Link
                href={`/team/${breweryId}/members`}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800/50 border border-transparent text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-purple-500/50 group-hover:bg-purple-500/10 transition-colors">
                  <Users className="w-3.5 h-3.5 text-zinc-400 group-hover:text-purple-400" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-zinc-200 group-hover:text-white">Mitglieder</div>
                  <div className="text-[10px] text-zinc-500">Verwalten & einladen</div>
                </div>
              </Link>
              <Link
                href={`/team/${breweryId}/sessions`}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800/50 border border-transparent text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-yellow-500/50 group-hover:bg-yellow-500/10 transition-colors">
                  <Beer className="w-3.5 h-3.5 text-zinc-400 group-hover:text-yellow-400" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-zinc-200 group-hover:text-white">Sessions</div>
                  <div className="text-[10px] text-zinc-500">Brau-Protokolle</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Feed hint */}
          <div className="px-3 py-3 text-center">
            <p className="text-[10px] text-zinc-700 leading-relaxed">
              Der Feed aktualisiert sich automatisch in Echtzeit.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Metric Pill ────────────────────────────────────────── */
function MetricPill({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${color} opacity-60 group-hover:opacity-100 transition-opacity`}>
          {icon}
        </div>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{label}</span>
      </div>
      <span className="text-2xl font-black text-white font-mono tracking-tight">{value}</span>
    </div>
  );
}
