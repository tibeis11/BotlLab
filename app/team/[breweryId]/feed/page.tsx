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
                        hat ein neues Rezept <Link href={`/team/${breweryId}/brews/editor/${item.content.brew_id}`} className="text-cyan-400 hover:text-cyan-300 transition">{item.content.brew_name}</Link> entworfen.
                    </span>
                );
                break;
            case 'MEMBER_JOINED':
                content = <span className="text-emerald-400 font-bold">ist dem Team beigetreten using the secret handshake.</span>;
                break;
             case 'ACHIEVEMENT':
                content = <span className="text-purple-400 font-bold">hat einen Erfolg freigeschaltet: {item.content.title}</span>;
                break;
            case 'BREW_RATED':
                content = (
                    <span>
                        hat das Rezept <Link href={`/team/${breweryId}/brews/${item.content.brew_id}`} className="text-cyan-400 hover:text-cyan-300 transition">{item.content.brew_name}</Link> mit <span className="text-amber-400 font-bold">{item.content.rating} Sternen</span> bewertet.
                    </span>
                );
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
                    <span className="font-bold text-white">{item.profiles?.display_name || item.content.author || 'Botschafter'}</span>
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
      <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/60 p-6 rounded-3xl mb-12 shadow-2xl relative overflow-hidden group focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
         <div className="absolute top-0 right-0 p-32 bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none -mt-10 -mr-10 transition-opacity opacity-50 group-hover:opacity-100"></div>
         
         <form onSubmit={handlePost} className="relative z-10">
            <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder={`Was gibt's Neues, ${user?.user_metadata?.display_name || 'Braumeister'}?`}
                className="w-full bg-zinc-950/40 border border-zinc-800/50 focus:border-cyan-500/50 p-5 rounded-2xl text-white placeholder-zinc-500 resize-none focus:outline-none min-h-[120px] text-base mb-4 transition-all"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if(newPost.trim()) handlePost(e);
                    }
                }}
            />
            <div className="flex justify-between items-center pl-2">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                    Enter zum Senden
                </div>
                <button 
                    type="submit" 
                    disabled={!newPost.trim() || isPosting}
                    className="bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed font-black px-8 py-3 rounded-xl text-sm transition-all shadow-lg hover:shadow-cyan-500/20 flex items-center gap-2 transform active:scale-95 uppercase tracking-wide"
                >
                    {isPosting ? 'Sende...' : (
                        <>Posten <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" /></svg></>
                    )}
                </button>
            </div>
         </form>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
         {loading ? (
             <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Lade Nachrichten...</p>
             </div>
         ) : feed.length === 0 ? (
             <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-16 text-center relative overflow-hidden">
                 <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-zinc-800">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-zinc-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">Totenstille.</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto mb-8 font-medium">
                        Noch hat niemand was gesagt. Sei der Erste und breche das Eis!
                    </p>
                    <button 
                        onClick={() => document.querySelector('textarea')?.focus()} 
                        className="text-cyan-400 hover:text-cyan-300 text-sm font-bold uppercase tracking-wide border-b-2 border-cyan-500/20 hover:border-cyan-500 transition-all pb-1"
                    >
                        Jetzt Nachricht schreiben
                    </button>
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
