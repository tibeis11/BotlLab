import Link from 'next/link';
import { getForumCategories, getRecentThreads } from '@/lib/forum-service';
import { 
    LucideIcon, 
    Megaphone, 
    Scroll, 
    Wrench, 
    ShoppingBag, 
    Coffee, 
    MessageSquare,
    Hash,
    Flame,
    Pin,
    Plus 
} from 'lucide-react';

const iconMap: Record<string, any> = {
    Megaphone,
    Scroll,
    Wrench,
    ShoppingBag,
    Coffee
};

// export const revalidate = 60; // Removed to fix staleness issues

export default async function ForumIndexPage() {
    const [categories, recentThreads] = await Promise.all([
        getForumCategories(),
        getRecentThreads(6)
    ]);

    return (
        <div className="space-y-12">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-800 pb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Community Forum</h1>
                    <p className="text-zinc-400 max-w-xl">
                        Diskutiere mit anderen Brauern, teile deine Rezepte oder finde Hilfe bei Problemen.
                        Bitte beachte unsere Netiquette.
                    </p>
                </div>
                <Link 
                    href="/forum/create" 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Neues Thema
                </Link>
            </div>

            {/* Categories Grid */}
            <section>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                        <Hash className="w-5 h-5 text-emerald-500" />
                    </div> 
                    Kategorien
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => {
                        const Icon = iconMap[cat.icon || 'MessageSquare'] || MessageSquare;
                        return (
                            <Link 
                                key={cat.id} 
                                href={`/forum/${cat.slug}`}
                                className="group bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl hover:bg-zinc-900/50 hover:border-zinc-700 transition flex items-start gap-4"
                            >
                                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 group-hover:border-zinc-700 group-hover:bg-zinc-900 transition text-zinc-400 group-hover:text-emerald-400">
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-zinc-200 group-hover:text-white transition">{cat.title}</h3>
                                    <p className="text-sm text-zinc-500 leading-relaxed mt-1">{cat.description}</p>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </section>

            {/* Recent Discussions */}
            <section>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                        <Flame className="w-5 h-5 text-amber-500" />
                    </div>
                    Aktuelle Diskussionen
                </h2>
                
                {recentThreads.length > 0 ? (
                    <div className="space-y-3">
                        {recentThreads.map((thread) => (
                            <div 
                                key={thread.id} 
                                className="relative block bg-zinc-900/20 border border-zinc-800/50 p-4 rounded-xl hover:bg-zinc-900/40 hover:border-zinc-700 transition group"
                            >
                                <Link 
                                    href={`/forum/thread/${thread.id}`}
                                    className="absolute inset-0 z-10"
                                >
                                    <span className="sr-only">View Thread</span>
                                </Link>

                                <div className="flex items-start justify-between gap-4 relative z-0">
                                    <div className="pointer-events-none">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                                {thread.category?.title}
                                            </span>
                                            {thread.is_pinned && <Pin className="w-3 h-3 text-emerald-500 fill-emerald-500/20" />}
                                        </div>
                                        <h3 className="font-bold text-zinc-200 group-hover:text-white mb-1">
                                            {thread.title}
                                        </h3>
                                        <div className="text-xs text-zinc-500 flex items-center gap-1 pointer-events-auto">
                                            <span>von</span>
                                            {thread.author ? (
                                                <Link 
                                                    href={`/brewer/${thread.author.id}`}
                                                    className="text-zinc-400 hover:text-emerald-400 hover:underline relative z-20"
                                                >
                                                    {thread.author.display_name}
                                                </Link>
                                            ) : (
                                                 <span className="text-zinc-400">Unbekannt</span>
                                            )}
                                            <span>• {new Date(thread.last_reply_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 text-zinc-500 pointer-events-none">
                                        <div className="flex items-center gap-1 text-xs bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                                            <MessageSquare size={12} />
                                            <span>{thread.reply_count}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                        <p className="text-zinc-500">Noch keine Diskussionen.</p>
                        <p className="text-sm text-zinc-600">Sei der Erste!</p>
                    </div>
                )}
            </section>
        </div>
    );
}
