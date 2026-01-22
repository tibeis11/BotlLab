import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getThread, getPosts } from '@/lib/forum-service';
import { MessageSquare, Calendar, User } from 'lucide-react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import ReplyInput from './ReplyInput';
import ReportButton from './ReportButton';
import { getTierConfig } from '@/lib/tier-system';
import { getTierBorderColor } from '@/lib/premium-config';
import ForumPost from './ForumPost';
import ThreadInteractionWrapper from './ThreadInteractionWrapper';

interface PageProps {
    params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ThreadPage({ params }: PageProps) {
    const { id } = await params;
    const thread = await getThread(id);

    if (!thread) {
        notFound();
    }

    const posts = await getPosts(id);

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} }
            }
        }
    );
    const { data: { user } } = await supabase.auth.getUser();

    const tierBorderClass = getTierBorderColor(thread.author?.subscription_tier);

    return (
        <ThreadInteractionWrapper>
            <div className="space-y-6">
            
                {/* Header & Breadcrumbs */}
            <div className="space-y-6 border-b border-zinc-800 pb-8">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Link href="/forum" className="hover:text-white transition">Forum</Link>
                    <span>/</span>
                    <Link href={`/forum/${thread.category.slug}`} className="hover:text-white transition">{thread.category.title}</Link>
                    <span>/</span>
                    <span className="text-zinc-300 truncate max-w-[200px]">{thread.title}</span>
                </div>

                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">{thread.title}</h1>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            <span>Erstellt am {new Date(thread.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MessageSquare size={12} />
                            <span>{posts.length + 1} Beiträge</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* OP (First Post - actually thread content) */}
            <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4 bg-gradient-to-r from-zinc-900/80 via-zinc-900/40 to-transparent border-b border-zinc-800/60 flex items-center justify-between backdrop-blur-md relative">
                    <div className="absolute inset-0 bg-white/5 opacity-50 mix-blend-overlay pointer-events-none"></div>
                    <div className="flex items-center gap-3 relative z-10">
                        {thread.author ? (
                            <Link href={`/brewer/${thread.author.id}`} className="flex items-center gap-3 group/author">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs overflow-hidden relative shadow-lg bg-zinc-900 border-2 transition ${tierBorderClass}`}>
                                    <img 
                                        src={thread.author.avatar_url || getTierConfig(thread.author.tier || 'lehrling').avatarPath} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-white text-base shadow-sm group-hover/author:text-emerald-400 transition">{thread.author.display_name}</span>
                                        {(() => {
                                            if (!thread.author.tier) return null;
                                            const tierConfig = getTierConfig(thread.author.tier);
                                            if (tierConfig.name === 'lehrling') return null;
                                            
                                            return (
                                                <span 
                                                    className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-white/5 backdrop-blur-sm shadow-sm"
                                                    style={{ color: tierConfig.color }} 
                                                >
                                                    {tierConfig.displayName}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 font-medium">Original Poster</div>
                                </div>
                            </Link>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 ring-2 ring-black/50">
                                    <User size={16} />
                                </div>
                                <div>
                                    <span className="font-bold text-white text-base shadow-sm">Unbekannt</span>
                                    <div className="text-[10px] text-zinc-400 font-medium">Original Poster</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {thread.brew && (
                    <div className="mx-4 mt-4 md:mx-6 md:mt-6 max-w-lg">
                         <Link href={`/brew/${thread.brew.id}`} className="flex items-center gap-4 bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 hover:bg-zinc-900 hover:border-zinc-700 transition group/brew">
                             <div className="w-12 h-12 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0 group-hover/brew:border-zinc-600 transition">
                                {thread.brew.image_url ? (
                                    <img 
                                        src={thread.brew.image_url} 
                                        className={`w-full h-full object-cover ${
                                            (thread.brew.moderation_status === 'pending' || thread.brew.moderation_status === 'rejected') && !thread.brew.image_url.startsWith('/default_label')
                                            ? 'filter blur-sm opacity-50' 
                                            : ''
                                        }`} 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl">🍺</div>
                                )}
                             </div>
                             <div>
                                 <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Betrifft Rezept
                                 </div>
                                 <div className="font-bold text-zinc-200 group-hover/brew:text-emerald-400 transition">{thread.brew.name}</div>
                             </div>
                             <div className="ml-auto pr-2 text-zinc-600 group-hover/brew:text-zinc-400 group-hover/brew:translate-x-1 transition">
                                 →
                             </div>
                         </Link>
                    </div>
                )}

                <div className="p-4 md:p-6 text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {thread.content}
                </div>

                <div className="p-3 bg-zinc-950/30 border-t border-zinc-800/50 flex justify-end">
                     <ReportButton targetId={thread.id} targetType="forum_thread" />
                </div>
            </div>

            {/* Replies */}
            {posts.length > 0 && (
                <div className="space-y-4 pt-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 pl-2">Antworten</h3>
                    
                    {posts.map((post) => (
                        <ForumPost key={post.id} post={post} threadAuthorId={thread.author_id} />
                    ))}
                </div>
            )}

            {/* Reply Input or Login Prompt */}
            {user ? (
                 <ReplyInput threadId={thread.id} />
            ) : (
                <div className="mt-8 pt-8 border-t border-zinc-800 sticky bottom-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-center">
                        <h3 className="font-bold text-white mb-2">Du möchtest mitdiskutieren?</h3>
                        <p className="text-zinc-400 text-sm mb-4">Melde dich an, um Antworten zu schreiben und Fragen zu stellen.</p>
                        <Link href={`/login?next=/forum/thread/${thread.id}`} className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold text-sm transition">
                            Einloggen
                        </Link>
                    </div>
                </div>
            )}
            </div>
        </ThreadInteractionWrapper>
    );
}
