
import { createClient } from '@/lib/supabase-server';
import { User, MessageSquare, Quote } from 'lucide-react';
import Link from 'next/link';
import ReportButton from './ReportButton';
import PostReplyButton from './PostReplyButton';
import { getTierConfig } from '@/lib/tier-system';
import { getTierBorderColor } from '@/lib/premium-config';

interface ForumPostProps {
    post: any;
    threadAuthorId: string;
}

export default async function ForumPost({ post, threadAuthorId }: ForumPostProps) {
    // Regex to find brew UUID (matches /brew/UUID)
    const brewRegex = /\/brew\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const match = post.content.match(brewRegex);
    let linkedBrew = null;

    if (match && match[1]) {
        const brewId = match[1];
        const supabase = await createClient();
        const { data } = await supabase
            .from('brews')
            .select('id, name, image_url, moderation_status, brewery_id, brewery:breweries(name)')
            .eq('id', brewId)
            .single();
        linkedBrew = data;
    }

    // Tier configuration logic
    const tierConfig = post.author?.tier ? getTierConfig(post.author.tier) : null;
    const showTierBadge = tierConfig && tierConfig.name !== 'lehrling';
    const tierBorderClass = getTierBorderColor(post.author?.subscription_tier);

    // Quote Block Parsing
    let contentToRender = (post.content || '').trim();
    let quoteBlock = null;
    
    // Check if post starts with quote lines (starting with >)
    // Relaxed regex: Matches lines starting with > (optional space after), handling \r\n or \n
    const quoteRegex = /^((?:> ?[^\n\r]*(?:\r?\n|$))+)/;
    const quoteMatch = contentToRender.match(quoteRegex);

    if (quoteMatch) {
         const rawQuote = quoteMatch[1];
         // Remove quote from content
         contentToRender = contentToRender.substring(rawQuote.length).trim();
         
         const lines = rawQuote.trim().split(/\r?\n/);
         let quotedUser = 'Unbekannt';
         let quotedText = '';

         if (lines.length > 0) {
             // Try parse header: > **@User** schrieb:
             const headerMatch = lines[0].match(/> ?\*\*@(.+?)\*\* schrieb:/);
             if (headerMatch) {
                 quotedUser = headerMatch[1];
                 // Content is rest lines
                 quotedText = lines.slice(1).map((l: string) => l.replace(/^> ?/, '')).join('\n');
             } else {
                 // Fallback if format is different
                 quotedText = lines.map((l: string) => l.replace(/^> ?/, '')).join('\n');
             }
         }
         
         quoteBlock = { user: quotedUser, text: quotedText };
    }


    // Linkify content: Detect URLs and @autor mentions
    // Regex for URL detection or @autor (ensure word boundary with \b to avoid matching @autoreifen)
    const tokenRegex = /((?:https?:\/\/[^\s]+)|(?<!\w)(?:@autor)\b)/gi;
    const contentParts = contentToRender.split(tokenRegex);

    return (
        <div className="bg-zinc-900/10 border border-zinc-800/60 rounded-2xl ml-0 md:ml-4 overflow-hidden group hover:border-zinc-700/50 transition duration-300">
            {/* Header / Meta Row with Glass Effect */}
            <div className="px-4 py-3 bg-gradient-to-r from-zinc-900/60 to-transparent border-b border-zinc-800/40 flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    {post.author ? (
                        <Link href={`/brewer/${post.author.id}`} className="flex items-center gap-3 group/author">
                            <div className="flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden relative shadow-lg bg-zinc-900 border-2 transition ${tierBorderClass}`}>
                                    <img 
                                        src={post.author.avatar_url || getTierConfig(post.author.tier || 'lehrling').avatarPath} 
                                        alt="" 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                            </div>
                        
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold text-zinc-200 text-sm group-hover/author:text-emerald-400 transition">{post.author.display_name}</span>
                                
                                {showTierBadge && (
                                    <span 
                                        className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-white/5"
                                        style={{ color: tierConfig.color }} 
                                    >
                                        {tierConfig.displayName}
                                    </span>
                                )}

                                {post.author_id === threadAuthorId && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_-3px_rgba(59,130,246,0.3)]">
                                        Autor
                                    </span>
                                )}
                            </div>
                        </Link>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 ring-1 ring-white/10">
                                    <User size={14} />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold text-zinc-200 text-sm">Unbekannt</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-xs text-zinc-600 font-medium">
                    {new Date(post.created_at).toLocaleDateString()} <span className="text-zinc-700 mx-1">|</span> {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>
            
            <div className="p-4 md:p-5">
                {quoteBlock && (
                    <div className="mb-6 flex gap-3 max-w-2xl group/quote">
                        {/* Quote Line / Indicator */}
                        <div className="w-1 rounded-full bg-emerald-900/50 group-hover/quote:bg-emerald-500/50 transition-colors shrink-0"></div>
                        
                        {/* Quote Content Card */}
                        <div className="flex-1 bg-zinc-950/30 border border-zinc-800/50 rounded-xl p-3 flex gap-3 min-w-0 hover:border-zinc-700 hover:bg-zinc-900/50 transition">
                            {/* Icon Box */}
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-900/80 rounded-lg flex items-center justify-center border border-zinc-800 shrink-0 text-emerald-500/80 group-hover/quote:text-emerald-400 group-hover/quote:border-emerald-500/30 transition">
                                <Quote size={16} className="fill-current opacity-50" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Antwort auf</span>
                                    <span className="text-xs font-bold text-emerald-400">@{quoteBlock.user}</span>
                                </div>
                                <div className="text-sm text-zinc-400 italic line-clamp-3">
                                    "{quoteBlock.text}"
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {/* Basic Linkify & Mentions */}
                    {contentParts.map((part: string, i: number) => {
                        if (part.match(/https?:\/\/[^\s]+/i)) {
                            return (
                                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline break-all">
                                    {part}
                                </a>
                            );
                        }
                        if (part.toLowerCase() === '@autor') {
                            return (
                                <span key={i} className="font-bold text-blue-400 bg-blue-500/10 px-1 rounded mx-0.5">
                                    @Autor
                                </span>
                            )
                        }
                        return <span key={i}>{part}</span>;
                    })}
                </div>

                {linkedBrew && (
                    <div className="mt-4">
                            <Link href={`/brew/${linkedBrew.id}`} className="flex items-center gap-4 bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3 hover:border-zinc-700 hover:bg-zinc-900/40 transition group/brew max-w-lg">
                                <div className="w-12 h-12 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0 group-hover/brew:border-zinc-600 transition">
                                {linkedBrew.image_url ? (
                                    <img 
                                        src={linkedBrew.image_url} 
                                        className={`w-full h-full object-cover ${
                                            (linkedBrew.moderation_status === 'pending' || linkedBrew.moderation_status === 'rejected') && !linkedBrew.image_url.startsWith('/default_label')
                                            ? 'filter blur-sm opacity-50' 
                                            : ''
                                        }`} 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl">🍺</div>
                                )}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Erwähntes Rezept
                                    </div>
                                    <div className="font-bold text-zinc-200 group-hover/brew:text-emerald-400 transition truncate">{linkedBrew.name}</div>
                                    {linkedBrew.brewery && (
                                        <div className="text-[10px] text-zinc-600 truncate">
                                            {Array.isArray(linkedBrew.brewery) 
                                                ? linkedBrew.brewery[0]?.name 
                                                : (linkedBrew.brewery as any).name}
                                        </div>
                                    )}
                                </div>
                                <div className="ml-auto pr-2 text-zinc-600 group-hover/brew:text-zinc-400 group-hover/brew:translate-x-1 transition">
                                    →
                                </div>
                            </Link>
                    </div>
                )}

                <div className="mt-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <PostReplyButton post={post} />
                    <ReportButton targetId={post.id} targetType="forum_post" />
                </div>
            </div>
        </div>
    );
}
