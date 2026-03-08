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
import UserAvatar from '@/app/components/UserAvatar';

/* ─── Event config ─────────────────────────────────────────── */
const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  POST:                  { icon: MessageSquare, color: 'text-text-muted'    },
  BREW_CREATED:          { icon: Beer,          color: 'text-brand'         },
  BREW_UPDATED:          { icon: Beer,          color: 'text-brand'         },
  BREW_RATED:            { icon: Star,          color: 'text-rating'        },
  MEMBER_JOINED:         { icon: UserPlus,      color: 'text-success'       },
  ACHIEVEMENT:           { icon: Trophy,        color: 'text-accent-purple' },
  FORUM_THREAD_CREATED:  { icon: Newspaper,     color: 'text-accent-orange' },
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
        return <>hat <Link href={`/team/${breweryId}/brews/editor/${item.content.brew_id}`} className="text-brand hover:text-brand/80 font-bold transition">{item.content.brew_name}</Link> entworfen</>;
      case 'BREW_UPDATED':
        return <>hat <Link href={`/team/${breweryId}/brews/editor/${item.content.brew_id}`} className="text-brand hover:text-brand/80 font-bold transition">{item.content.brew_name}</Link> aktualisiert</>;
      case 'MEMBER_JOINED':
        return <span className="text-success font-bold">ist dem Team beigetreten</span>;
      case 'ACHIEVEMENT':
        return <>hat <span className="text-accent-purple font-bold">{item.content.title}</span> freigeschaltet</>;
      case 'BREW_RATED':
        return <>hat <Link href={`/team/${breweryId}/brews/${item.content.brew_id}`} className="text-brand hover:text-brand/80 font-bold transition">{item.content.brew_name}</Link> mit <span className="text-rating font-bold">{item.content.rating}★</span> bewertet</>;
      case 'FORUM_THREAD_CREATED':
        return <>hat <Link href={`/forum/thread/${item.content.thread_id}`} className="text-success hover:text-success/80 font-bold transition">{item.content.title}</Link> gestartet</>;
      default:
        return <span className="text-text-muted">{item.content.message}</span>;
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
      <span className="bg-brand/10 text-brand border border-brand/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider inline-flex items-center gap-0.5">
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
    const displayName = item.profiles?.display_name || item.content.author || 'Braumeister';
    const isMe = user?.id === item.user_id;
    const config = EVENT_CONFIG[item.type] || { icon: Activity, color: 'text-text-muted' };
    const Icon = config.icon;

    return (
      <div 
        key={item.id} 
        className="group animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="shrink-0 pt-0.5">
            <div className="w-9 h-9 rounded-full bg-surface border border-border overflow-hidden">
              <UserAvatar src={item.profiles?.logo_url} name={item.profiles?.display_name} userId={item.user_id ?? undefined} sizeClass="w-9 h-9" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold ${isMe ? 'text-brand' : 'text-text-primary'} truncate`}>
                {displayName}
              </span>
              <RoleBadge role={roleInBrewery} />
              <span className="text-[10px] text-text-disabled ml-auto shrink-0">{timeAgo(item.created_at)}</span>
            </div>

            {/* Body */}
            {isPost ? (
              <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                {item.content.message}
              </div>
            ) : (
              <p className="text-xs text-text-secondary leading-relaxed flex items-center gap-1.5 flex-wrap">
                <Icon className={`w-3.5 h-3.5 ${config.color} shrink-0`} />
                <span>{getSystemContent(item)}</span>
              </p>
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-brand bg-brand/10 border border-brand/20">
              Team Feed
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase border border-success/30 text-success bg-success/10 tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight leading-none mb-2">Squad Feed</h1>
          <p className="text-sm text-text-muted">Euer Stammtisch — Neuigkeiten, Posts und Team-Events an einem Ort.</p>
        </div>
        <Link
          href={`/team/${breweryId}/dashboard`}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-hover/50 hover:bg-surface-hover border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </header>

      {/* METRICS ROW */}
      <div className="grid grid-cols-3 gap-3">
        <MetricPill icon={<MessageSquare className="w-4 h-4" />} label="Posts" value={messageCount} />
        <MetricPill icon={<Activity className="w-4 h-4" />} label="Events" value={systemEvents} />
        <MetricPill icon={<Users className="w-4 h-4" />} label="Mitglieder" value={memberCount} />
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex gap-6 items-start">

        {/* LEFT: Feed content */}
        <div className="flex-1 min-w-0 space-y-6">
          
          {/* Compose box */}
          <div className="bg-surface border border-border rounded-2xl p-4 relative overflow-hidden focus-within:border-brand/30 transition-all">
            <div className="absolute top-0 right-0 p-20 bg-brand/5 blur-[80px] rounded-full pointer-events-none -mt-8 -mr-8" />
            
            <form onSubmit={handlePost} className="relative z-10">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder={`Was gibt's Neues, ${user?.user_metadata?.display_name || 'Braumeister'}?`}
                className="w-full bg-surface-sunken border border-border-subtle focus:border-brand/40 p-4 rounded-xl text-sm text-text-primary placeholder-text-disabled resize-none focus:outline-none min-h-[80px] transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newPost.trim()) handlePost(e);
                  }
                }}
              />
              <div className="flex justify-between items-center mt-3">
                <div className="text-[10px] text-text-disabled font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-brand animate-pulse" />
                  Enter zum Senden
                </div>
                <button 
                  type="submit" 
                  disabled={!newPost.trim() || isPosting}
                  className="bg-brand text-black hover:bg-brand/80 disabled:opacity-40 disabled:cursor-not-allowed font-bold px-5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 active:scale-95 uppercase tracking-wider"
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
              <p className="text-xs font-bold text-text-disabled uppercase tracking-widest mt-4">Lade Feed...</p>
            </div>
          ) : feed.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center">
              <div className="w-14 h-14 bg-surface-sunken rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                <MessageSquare className="w-6 h-6 text-text-disabled" />
              </div>
              <h3 className="text-lg font-black text-text-primary mb-1">Noch keine Aktivität</h3>
              <p className="text-xs text-text-muted max-w-xs mx-auto mb-6">
                Starte die Unterhaltung — dein Team wird benachrichtigt.
              </p>
              <button 
                onClick={() => document.querySelector('textarea')?.focus()} 
                className="text-brand hover:text-brand/80 text-xs font-bold uppercase tracking-wider transition-colors"
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
                    <div className="h-px flex-1 bg-border-subtle" />
                    <span className="text-[10px] text-text-disabled font-bold uppercase tracking-widest shrink-0">
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-border-subtle" />
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
        <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 sticky top-8 space-y-4">
          
          {/* Brewery info */}
          {breweryName && (
            <div className="bg-surface border border-border rounded-2xl p-4">
              <div className="text-[10px] text-text-disabled font-bold uppercase tracking-widest mb-1">Brauerei</div>
              <div className="text-sm font-bold text-text-primary truncate">{breweryName}</div>
            </div>
          )}

          {/* Active members */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-3 border-b border-border-subtle bg-surface-hover/50">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-accent-purple" />
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
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                          : role === 'admin'
                          ? 'bg-brand/10 border-brand/20 text-brand'
                          : 'bg-surface-hover border-border text-text-muted'
                      }`}
                      title={name || userId}
                    >
                      {initials}
                    </div>
                  );
                })}
                {Object.keys(memberRoles).length > 12 && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold bg-surface-hover border border-border text-text-disabled">
                    +{Object.keys(memberRoles).length - 12}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-3 border-b border-border-subtle bg-surface-hover/50">
              <h3 className="text-xs font-bold text-text-primary">Schnellzugriff</h3>
            </div>
            <div className="p-1.5 space-y-0.5">
              <Link
                href={`/team/${breweryId}/members`}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover/50 hover:border-border border border-transparent text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-surface-sunken flex items-center justify-center border border-border group-hover:border-accent-purple/50 group-hover:bg-accent-purple/10 transition-colors">
                  <Users className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-purple" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-text-secondary group-hover:text-text-primary">Mitglieder</div>
                  <div className="text-[10px] text-text-muted group-hover:text-text-secondary">Verwalten & einladen</div>
                </div>
              </Link>
              <Link
                href={`/team/${breweryId}/sessions`}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover/50 hover:border-border border border-transparent text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-surface-sunken flex items-center justify-center border border-border group-hover:border-brand/50 group-hover:bg-brand/10 transition-colors">
                  <Beer className="w-3.5 h-3.5 text-text-muted group-hover:text-brand" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-text-secondary group-hover:text-text-primary">Sessions</div>
                  <div className="text-[10px] text-text-muted group-hover:text-text-secondary">Brau-Protokolle</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Feed hint */}
          <div className="px-3 py-3 text-center">
            <p className="text-[10px] text-text-disabled leading-relaxed">
              Der Feed aktualisiert sich automatisch in Echtzeit.
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
}

/* ─── Metric Pill ────────────────────────────────────────── */
function MetricPill({ icon, label, value }: {
  icon: React.ReactNode; label: string; value: number;
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-text-muted">
          {icon}
        </div>
        <span className="text-[10px] text-text-disabled uppercase tracking-wider font-bold">{label}</span>
      </div>
      <span className="text-2xl font-black text-text-primary font-mono tracking-tight">{value}</span>
    </div>
  );
}
