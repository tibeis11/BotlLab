'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { getBreweryFeed, addToFeed, type FeedItem } from '@/lib/feed-service';
import Link from 'next/link';

export default function TeamFeedPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [breweryName, setBreweryName] = useState('');

  useEffect(() => {
    if (user && breweryId) {
      loadData();
      
      const channel = supabase
        .channel('feed_updates')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'brewery_feed', filter: `brewery_id=eq.${breweryId}` },
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
    
    // Load Brewery Info
    const { data: b } = await supabase.from('breweries').select('name').eq('id', breweryId).single();
    if(b) setBreweryName(b.name);

    await loadFeedOnly();
    setLoading(false);
  }

  async function loadFeedOnly() {
    const items = await getBreweryFeed(breweryId);
    setFeed(items);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newPost.trim() || !user) return;

    setIsPosting(true);
    await addToFeed(breweryId, user, 'POST', { message: newPost });
    setNewPost('');
    setIsPosting(false);
    loadFeedOnly();
  }

  function renderFeedItem(item: FeedItem) {
    const date = new Date(item.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    let content = <p className="text-zinc-300">{item.content.message}</p>;
    let icon = '💬';
    let bg = 'bg-zinc-900 border-zinc-800';

    switch(item.type) {
      case 'BREW_CREATED':
        icon = '🍺';
        bg = 'bg-amber-950/20 border-amber-900/30';
        content = (
          <div>
            <span className="text-zinc-400">hat ein neues Rezept erstellt: </span>
            <Link href={`/team/${breweryId}/brews/editor/${item.content.brew_id}`} className="text-amber-400 font-bold hover:underline">
              {item.content.brew_name}
            </Link>
          </div>
        );
        break;
      case 'MEMBER_JOINED':
        icon = '👋';
        bg = 'bg-emerald-950/20 border-emerald-900/30';
        content = <span className="text-emerald-400 font-bold">ist dem Team beigetreten!</span>;
        break;
    }

    return (
      <div key={item.id} className={`p-4 rounded-xl border ${bg} flex gap-4 animate-in slide-in-from-bottom-2 duration-300`}>
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-black border border-zinc-700 overflow-hidden relative">
             {item.profiles?.logo_url ? <img src={item.profiles.logo_url} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-zinc-500">👤</div>}
             <div className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-0.5 text-[10px]">{icon}</div>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
             <span className="font-bold text-white text-sm">{item.profiles?.display_name || 'Unbekannt'}</span>
             <span className="text-[10px] text-zinc-600 font-mono">{date}</span>
          </div>
          <div className="text-sm">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">Aktuelles</h1>
        <p className="text-zinc-400 text-sm">Was passiert gerade in <span className="text-cyan-400 font-bold">{breweryName}</span>?</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Input Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-8 focus-within:ring-2 ring-cyan-500/50 transition shadow-xl">
            <form onSubmit={handlePost}>
            <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Schreib etwas an dein Team... (z.B. 'Bin Samstag im Keller!')"
                className="w-full bg-transparent text-white outline-none resize-none h-20 placeholder-zinc-600 text-sm"
            />
            <div className="flex justify-end mt-2 pt-2 border-t border-zinc-800">
                <button 
                type="submit" 
                disabled={isPosting || !newPost.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {isPosting ? 'Sende...' : 'Posten 🚀'}
                </button>
            </div>
            </form>
        </div>

        {/* Feed List */}
        <div className="space-y-4">
            {loading ? (
                <div className="text-center py-10 text-zinc-600 animate-pulse">Lade Feed...</div>
            ) : feed.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 border-dashed">
                    <div className="text-4xl mb-2">🦗</div>
                    <p className="text-zinc-500 font-bold">Noch nichts los hier.</p>
                    <p className="text-xs text-zinc-600 mt-1">Sei der Erste und schreib was!</p>
                </div>
            ) : (
            feed.map(item => renderFeedItem(item))
            )}
        </div>
      </div>

    </div>
  );
}
