import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategory, getThreadsByCategory } from '@/lib/forum-service';
import { MessageSquare, ArrowLeft, Pin } from 'lucide-react';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export default async function ForumCategoryPage({ params }: PageProps) {
    const { slug } = await params;
    const category = await getCategory(slug);

    if (!category) {
        notFound();
    }

    const threads = await getThreadsByCategory(category.id);

    return (
        <div className="space-y-8">
            
            {/* Header & Breadcrumbs */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Link href="/forum" className="hover:text-white transition">Forum</Link>
                    <span>/</span>
                    <span className="text-zinc-300">{category.title}</span>
                </div>

                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-2">{category.title}</h1>
                        <p className="text-zinc-400">{category.description}</p>
                    </div>
                </div>
            </div>

            {/* Thread List */}
            <div className="space-y-4">
                {threads.length > 0 ? (
                    threads.map((thread) => (
                        <div 
                            key={thread.id} 
                            className={`relative block bg-zinc-900/20 border p-5 rounded-2xl hover:bg-zinc-900/40 transition group
                                ${thread.is_pinned ? 'border-emerald-500/20 bg-emerald-900/5' : 'border-zinc-800/50 hover:border-zinc-700'}
                            `}
                        >
                            <Link 
                                href={`/forum/thread/${thread.id}`}
                                className="absolute inset-0 z-10"
                            >
                                <span className="sr-only">View Thread</span>
                            </Link>

                            <div className="flex items-start justify-between gap-4 relative z-0">
                                <div className="pointer-events-none">
                                    <div className="flex items-center gap-2 mb-2 pointer-events-auto">
                                        {thread.author ? (
                                            <Link href={`/brewer/${thread.author.id}`} className="flex items-center gap-2 group/author relative z-20">
                                                {thread.author.avatar_url ? (
                                                    <img src={thread.author.avatar_url} alt="" className="w-5 h-5 rounded-full bg-zinc-800 object-cover ring-1 ring-zinc-800 group-hover/author:ring-emerald-500 transition" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-zinc-800 ring-1 ring-zinc-800 group-hover/author:ring-emerald-500 transition" />
                                                )}
                                                <span className="text-xs font-bold text-zinc-400 group-hover/author:text-emerald-400 transition">{thread.author.display_name}</span>
                                            </Link>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-zinc-800" />
                                                <span className="text-xs font-bold text-zinc-400">Unbekannt</span>
                                            </div>
                                        )}
                                        <span className="text-zinc-600">•</span>
                                        <span className="text-xs text-zinc-500">{new Date(thread.last_reply_at).toLocaleDateString()}</span>
                                    </div>

                                    <h3 className="text-lg font-bold text-zinc-200 group-hover:text-white mb-1 flex items-center gap-2">
                                        {thread.is_pinned && <Pin size={16} className="text-emerald-500 fill-emerald-500/20" />}
                                        {thread.title}
                                    </h3>
                                    <p className="text-sm text-zinc-500 line-clamp-2">{thread.content.substring(0, 140)}...</p>
                                </div>
                                
                                <div className="text-center min-w-[3rem] pointer-events-none">
                                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-zinc-950/50 border border-zinc-900">
                                        <span className="text-sm font-bold text-zinc-300">{thread.reply_count}</span>
                                        <MessageSquare size={12} className="text-zinc-600 mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl border border-zinc-800 text-zinc-600">
                           🦗
                        </div>
                        <h3 className="text-white font-bold mb-2">Hier ist es noch still</h3>
                        <p className="text-zinc-500 mb-6">Keine Diskussionen in dieser Kategorie.</p>
                        <button disabled className="px-6 py-2 bg-zinc-800 text-zinc-500 rounded-lg text-sm font-bold border border-zinc-700 cursor-not-allowed">
                            Erste Diskussion starten
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
