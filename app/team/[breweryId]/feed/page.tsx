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
                        hat ein neues Rezept <Link href={`/team/${breweryId}/brews/editor/${item.content.brew_id}`} className="font-bold underline text-cyan-400 hover:text-cyan-300 transition">{item.content.brew_name}</Link> entworfen.
                    </span>
                );
                break;
            case 'MEMBER_JOINED':
                content = <span className="text-emerald-400 font-bold">ist dem Team beigetreten using the secret handshake.</span>;
                break;
             case 'ACHIEVEMENT':
                content = <span className="text-purple-400 font-bold">hat einen Erfolg freigeschaltet: {item.content.title}</span>;
                break;
            default:
                content = <span className="text-zinc-400">{item.content.message}</span>;
        }

        return (
            <div key={item.id} className="flex flex-col items-center justify-center gap-1 py-6 text-sm text-zinc-500 animate-in fade-in zoom-in-95 duration-300">
                 <div className="flex items-center gap-2 bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800 shadow-sm backdrop-blur-sm">
                    <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.profiles?.logo_url ? <img src={item.profiles.logo_url} className="w-full h-full object-cover" alt="" /> : '👤'}
                    </div>
                    <span className="font-bold text-white">{item.profiles?.display_name || 'Botschafter'}</span>
                    {content}
                    <span className="text-[10px] text-zinc-600 border-l border-zinc-700 pl-2 ml-1">{timeString}</span>
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
          <div className={`w-10 h-10 rounded-full bg-zinc-900 border-2 ${isMe ? 'border-cyan-500/50' : 'border-zinc-700'} overflow-hidden shadow-lg`}>
             {item.profiles?.logo_url ? <img src={item.profiles.logo_url} className="w-full h-full object-cover" alt={item.profiles.display_name} /> : <div className="flex items-center justify-center h-full text-zinc-500 text-xs">?</div>}
          </div>
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
            <div className="flex items-baseline gap-2 mb-1 px-1">
                <span className={`text-xs font-bold ${isMe ? 'text-cyan-500' : 'text-zinc-300'}`}>
                    {item.profiles?.display_name || 'Unbekannt'}
                </span>
                <span className="text-[10px] text-zinc-600">{dateString} um {timeString}</span>
            </div>
            
            <div className={`
                p-4 rounded-3xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words border
                ${isMe 
                    ? 'bg-cyan-950/30 border-cyan-500/20 text-cyan-50 rounded-tr-none' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-200 rounded-tl-none'}
            `}>
                {item.content.message}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-20 space-y-12">
      {/* Header Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
        <div>
           <div className="flex items-center gap-2 mb-4">
              <span className="text-cyan-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-cyan-950/30 border border-cyan-500/20 shadow-sm shadow-cyan-900/20">
                  Squad Feed
              </span>
              <span className="text-[10px] font-black px-2 py-1 rounded-lg uppercase border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 tracking-wider shadow-[0_0_10px_rgba(34,211,238,0.2)] animate-pulse">
                LIVE
              </span>
           </div>
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                {breweryName || 'Lade Team...'}
           </h1>
           <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
             Der Stammtisch für deinen Squad. Diskutiere Rezepte, teile Erfolge oder schnack einfach.
           </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
      {/* Input Area */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl mb-10 shadow-xl relative overflow-hidden">
         <form onSubmit={handlePost} className="relative z-10">
            <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder={`Was gibt's Neues, ${user?.user_metadata?.display_name || 'Braumeister'}?`}
                className="w-full bg-zinc-950/50 border border-zinc-800/50 focus:border-cyan-500/50 p-4 rounded-xl text-white placeholder-zinc-600 resize-none focus:outline-none min-h-[100px] text-base mb-4 transition-colors"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if(newPost.trim()) handlePost(e);
                    }
                }}
            />
            <div className="flex justify-between items-center">
                <div className="text-xs text-zinc-500 font-medium">Enter zum Senden</div>
                <button 
                    type="submit" 
                    disabled={!newPost.trim() || isPosting}
                    className="bg-brand text-black hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed font-black px-6 py-3 rounded-2xl text-sm transition-all shadow-lg shadow-cyan-900/20 flex items-center gap-2 transform active:scale-95"
                >
                    {isPosting ? 'Sende...' : (
                        <>Posten <span className="text-black/50">➤</span></>
                    )}
                </button>
            </div>
         </form>
      </div>

      {/* Feed List */}
      <div className="space-y-2">
         {loading ? (
             <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-10 animate-pulse text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-full mx-auto"></div>
                <div className="h-4 bg-zinc-800 rounded w-1/3 mx-auto"></div>
                <div className="h-4 bg-zinc-800/50 rounded w-1/4 mx-auto"></div>
             </div>
         ) : feed.length === 0 ? (
             <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none grayscale">📣</div>
                 <div className="relative z-10">
                    <span className="text-4xl mb-6 block grayscale opacity-50">🦗</span>
                    <h3 className="text-2xl font-black text-white mb-2">Totenstille.</h3>
                    <p className="text-zinc-400 max-w-sm mx-auto mb-6">
                        Noch hat niemand was gesagt. Sei der Erste und breche das Eis!
                    </p>
                 </div>
             </div>
         ) : (
             feed.map(renderFeedItem)
         )}
      </div>
     </div>
    </div>
  );
}
