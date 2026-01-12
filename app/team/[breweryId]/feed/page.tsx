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
    const isSystem = item.type !== 'POST';
    const date = new Date(item.created_at);
    const timeString = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const dateString = date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });

    // System Messages (Center aligned, slimmer)
    if (isSystem) {
        let content;
        
        switch(item.type) {
            case 'BREW_CREATED':
                content = (
                    <span>
                        hat ein neues Rezept <Link href={`/team/${breweryId}/brews/editor/${item.content.brew_id}`} className="font-bold underline text-amber-500 hover:text-amber-400">{item.content.brew_name}</Link> entworfen.
                    </span>
                );
                break;
            case 'MEMBER_JOINED':
                content = <span className="text-emerald-400">ist dem Team beigetreten. Willkommen!</span>;
                break;
             case 'ACHIEVEMENT':
                content = <span className="text-purple-400">hat einen Erfolg freigeschaltet: {item.content.title}</span>;
                break;
            default:
                content = <span>{item.content.message}</span>;
        }

        return (
            <div key={item.id} className="flex items-center justify-center gap-3 py-4 text-sm text-zinc-500 animate-in fade-in zoom-in-95 duration-300">
                 <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.profiles?.logo_url ? <img src={item.profiles.logo_url} className="w-full h-full object-cover" alt="" /> : '👤'}
                 </div>
                 <div className="bg-zinc-900/50 px-4 py-1.5 rounded-full border border-zinc-800/50">
                    <span className="font-bold text-zinc-300 mr-1">{item.profiles?.display_name || 'Jemand'}</span>
                    {content}
                    <span className="text-xs text-zinc-600 ml-2">{timeString}</span>
                 </div>
            </div>
        )
    }

    // User Posts (Chat bubble style)
    const isMe = user?.id === item.user_id;

    return (
      <div key={item.id} className={`flex gap-4 mb-6 ${isMe ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 duration-300 group`}>
        {/* Avatar */}
        <div className="flex-shrink-0 -mt-1">
          <div className={`w-10 h-10 rounded-full bg-zinc-900 border-2 ${isMe ? 'border-amber-500/50' : 'border-zinc-700'} overflow-hidden shadow-lg`}>
             {item.profiles?.logo_url ? <img src={item.profiles.logo_url} className="w-full h-full object-cover" alt={item.profiles.display_name} /> : <div className="flex items-center justify-center h-full text-zinc-500 text-xs">?</div>}
          </div>
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
            <div className="flex items-baseline gap-2 mb-1 px-1">
                <span className={`text-xs font-bold ${isMe ? 'text-amber-500' : 'text-zinc-300'}`}>
                    {item.profiles?.display_name || 'Unbekannt'}
                </span>
                <span className="text-[10px] text-zinc-600">{dateString} um {timeString}</span>
            </div>
            
            <div className={`
                p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words border
                ${isMe 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-100 rounded-tr-none' 
                    : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-200 rounded-tl-none'}
            `}>
                {item.content.message}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto pb-20">
      {/* Header Area */}
      <div className="bg-gradient-to-b from-zinc-900 via-zinc-900/50 to-transparent pt-8 pb-4 mb-6 sticky top-0 z-10 backdrop-blur-sm -mx-4 px-4 sm:mx-0 sm:px-0">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 mb-1">
              {breweryName || 'Team Feed'}
          </h1>
          <p className="text-zinc-400 text-sm">
             Neuigkeiten, Brau-Updates und Diskussionen.
          </p>
      </div>

      {/* Input Area */}
      <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl mb-8 shadow-inner">
         <form onSubmit={handlePost}>
            <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder={`Was gibt's Neues, ${user?.user_metadata?.display_name || 'Braumeister'}?`}
                className="w-full bg-transparent text-white placeholder-zinc-600 resize-none focus:outline-none min-h-[80px] text-lg mb-2"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if(newPost.trim()) handlePost(e);
                    }
                }}
            />
            <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50">
                <div className="text-xs text-zinc-600">Enter zum Senden</div>
                <button 
                    type="submit" 
                    disabled={!newPost.trim() || isPosting}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2"
                >
                    {isPosting ? 'Sende...' : (
                        <>Posten <span className="text-amber-200">➤</span></>
                    )}
                </button>
            </div>
         </form>
      </div>

      {/* Feed List */}
      <div className="space-y-2">
         {loading ? (
             <div className="text-center py-20 animate-pulse">
                <div className="w-12 h-12 bg-zinc-800 rounded-full mx-auto mb-4"></div>
                <div className="h-4 bg-zinc-800 rounded w-32 mx-auto"></div>
             </div>
         ) : feed.length === 0 ? (
             <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-2xl">
                 <div className="text-4xl mb-4">🔇</div>
                 <h3 className="text-lg font-bold text-zinc-300">Noch nichts los hier</h3>
                 <p className="text-zinc-500">Schreib den ersten Beitrag!</p>
             </div>
         ) : (
             feed.map(renderFeedItem)
         )}
      </div>
    </div>
  );
}
