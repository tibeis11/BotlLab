'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  MessageSquare, Beer, UserPlus, Trophy, Star, 
  Newspaper, Activity 
} from 'lucide-react';

interface FeedEntry {
  id: string;
  event_type: string;
  content: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  POST:                  { icon: MessageSquare, color: 'text-blue-400',    label: 'Post' },
  BREW_CREATED:          { icon: Beer,          color: 'text-cyan-400',    label: 'Neues Rezept' },
  BREW_UPDATED:          { icon: Beer,          color: 'text-cyan-400',    label: 'Rezept aktualisiert' },
  BREW_RATED:            { icon: Star,          color: 'text-yellow-400',  label: 'Bewertung' },
  MEMBER_JOINED:         { icon: UserPlus,      color: 'text-emerald-400', label: 'Neues Mitglied' },
  ACHIEVEMENT:           { icon: Trophy,        color: 'text-purple-400',  label: 'Achievement' },
  FORUM_THREAD_CREATED:  { icon: Newspaper,     color: 'text-orange-400',  label: 'Forum-Thread' },
};

export default function RecentActivityWidget({ breweryId }: { breweryId: string }) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, [breweryId]);

  async function loadFeed() {
    try {
      const { data } = await supabase
        .from('brewery_feed')
        .select('id, event_type, content, metadata, created_at, user_id, profiles(display_name, avatar_url)')
        .eq('brewery_id', breweryId)
        .order('created_at', { ascending: false })
        .limit(6);

      if (data) {
        setEntries(data as unknown as FeedEntry[]);
      }
    } catch (e) {
      console.error('Failed to load feed', e);
    } finally {
      setLoading(false);
    }
  }

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

  function getEventText(entry: FeedEntry): string {
    const name = entry.profiles?.display_name || 'Jemand';
    switch (entry.event_type) {
      case 'POST': return entry.content || `${name} hat gepostet`;
      case 'BREW_CREATED': return `${name} hat ein neues Rezept erstellt`;
      case 'BREW_UPDATED': return `${name} hat ein Rezept aktualisiert`;
      case 'BREW_RATED': {
        const rating = (entry.metadata as any)?.rating;
        return rating ? `${name} hat mit ${rating}★ bewertet` : `${name} hat bewertet`;
      }
      case 'MEMBER_JOINED': return `${name} ist dem Team beigetreten`;
      case 'ACHIEVEMENT': return `${name} hat ein Achievement freigeschaltet`;
      case 'FORUM_THREAD_CREATED': return `${name} hat einen Thread erstellt`;
      default: return `${name} — ${entry.event_type}`;
    }
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-40 bg-zinc-800 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-zinc-800/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/50 flex justify-between items-center">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Letzte Aktivitäten
        </h3>
        <Link 
          href={`/team/${breweryId}/feed`}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider transition-colors"
        >
          Alle anzeigen
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="p-6 text-center">
          <Activity className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-600">Noch keine Aktivitäten</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {entries.map((entry) => {
            const config = EVENT_CONFIG[entry.event_type] || { 
              icon: Activity, color: 'text-zinc-400', label: entry.event_type 
            };
            const Icon = config.icon;

            return (
              <div 
                key={entry.id} 
                className="px-4 py-3 flex items-start gap-3 hover:bg-zinc-800/20 transition-colors"
              >
                <div className={`mt-0.5 w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                    {getEventText(entry)}
                  </p>
                  <span className="text-[10px] text-zinc-600 mt-0.5 block">
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
