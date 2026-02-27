import Link from 'next/link';
import { Metadata } from 'next';
import {
    Megaphone, Scroll, Wrench, ShoppingBag, Coffee,
    MessageSquare, Flame, Plus, Users, FlaskConical,
} from 'lucide-react';
import { getForumCategories, getRecentThreads, getTrendingThreads, getForumStats } from '@/lib/forum-service';
import ForumSidebar from './_components/ForumSidebar';
import ForumRightRail from './_components/ForumRightRail';
import ForumThreadCard from './_components/ForumThreadCard';

const iconMap: Record<string, React.ElementType> = {
    Megaphone, Scroll, Wrench, ShoppingBag, Coffee, MessageSquare,
};

const categoryAccents = [
    'text-amber-400', 'text-emerald-400', 'text-blue-400', 'text-purple-400', 'text-zinc-400',
];

const TABS = [
    { key: 'new', label: 'Neueste' },
    { key: 'top', label: 'Beliebteste' },
] as const;

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Forum | BotlLab',
    description: 'Diskutiere mit der BotlLab-Community über Rezepte, Zutaten, Technik und alles rund ums Craft Beer brauen.',
    alternates: { canonical: '/forum' },
    openGraph: {
        title: 'Community Forum | BotlLab',
        description: 'Die Community für Craft Beer Brauer. Fragen, Rezepte, Tipps & Tricks.',
        url: 'https://botllab.de/forum',
        siteName: 'BotlLab',
        locale: 'de_DE',
        type: 'website',
    },
};

interface PageProps {
    searchParams: Promise<{ tab?: string }>;
}

export default async function ForumIndexPage({ searchParams }: PageProps) {
    const { tab = 'new' } = await searchParams;
    const sort = tab === 'top' ? 'top' : ('new' as const);

    const [categories, threads, trending, stats] = await Promise.all([
        getForumCategories(),
        getRecentThreads(12, sort),
        getTrendingThreads(6),
        getForumStats(),
    ]);

    return (
        <>
            {/* ── Hero Banner ──────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-zinc-900 border-b border-zinc-800">
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/80 to-emerald-950/20" />
                <div className="relative px-6 md:px-12 lg:px-16 py-6 md:py-10 max-w-screen-2xl mx-auto">
                    <div className="flex items-center justify-between gap-6">
                        <div>
                            <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-2">Community Forum</p>
                            <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 leading-tight">
                                Diskutiere mit{' '}<br className="hidden md:block" />
                                <span className="text-emerald-400">Craft Beer Brauern</span>
                            </h1>
                            <p className="hidden md:block text-zinc-400 max-w-md text-sm mb-4">
                                Fragen, Rezepte, Tipps & Tricks — alles rund ums Heimbrauen.
                            </p>
                        </div>
                    </div>

                    {/* Stats strip */}
                    <div className="flex items-center gap-6 mt-3 flex-wrap">
                        {trending.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                <Flame className="w-3.5 h-3.5 text-orange-400" />
                                <span className="font-bold text-white">{trending.length}</span> Trending
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="font-bold text-white">{stats.threadCount}</span> Threads
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <Users className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="font-bold text-white">{stats.postCount + stats.threadCount}</span> Beiträge
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mobile: horizontal category chips ────────────────────── */}
            <div className="md:hidden overflow-x-auto scrollbar-hide pb-3 pt-4 px-4">
                <div className="flex gap-2 min-w-max">
                    <Link
                        href="/forum"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-full shrink-0"
                    >
                        Alle
                    </Link>
                    {categories.map((cat: any) => (
                        <Link
                            key={cat.id}
                            href={`/forum/${cat.slug}`}
                            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium rounded-full shrink-0 hover:border-zinc-600 transition"
                        >
                            {cat.title}
                        </Link>
                    ))}
                    <Link
                        href="/forum/rezept-kommentare"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-cyan-900/40 text-cyan-400 text-sm font-medium rounded-full shrink-0 hover:border-cyan-700/50 transition"
                    >
                        <FlaskConical className="w-3 h-3" />
                        Rezept-Kommentare
                    </Link>
                </div>
            </div>

            {/* ── Main Layout: Sidebar + Content + RightRail ───────────── */}
            <div className="flex gap-0 max-w-screen-2xl mx-auto">

                {/* ── Left sidebar ──────────────────────────────────────── */}
                <ForumSidebar />

                {/* ── Main feed ─────────────────────────────────────────── */}
                <main className="flex-1 min-w-0 px-6 pt-8 space-y-8">

                    {/* ── Tabbed feed ────────────────────────────────────── */}
                    <section>
                        {/* Tab bar */}
                        <div className="flex gap-4 border-b border-zinc-800/60 mb-5">
                            {TABS.map(t => (
                                <Link
                                    key={t.key}
                                    href={t.key === 'new' ? '/forum' : `/forum?tab=${t.key}`}
                                    className={`relative pb-3 text-sm font-bold transition-colors
                                        ${tab === t.key
                                            ? 'text-white'
                                            : 'text-zinc-500 hover:text-zinc-300'}
                                    `}
                                >
                                    {t.label}
                                    {tab === t.key && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                                    )}
                                </Link>
                            ))}
                        </div>

                        {/* Thread cards */}
                        {threads.length > 0 ? (
                            <div className="space-y-1">
                                {threads.map((thread: any) => (
                                    <ForumThreadCard key={thread.id} thread={thread} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <p className="font-bold text-zinc-400 mb-1">Noch keine Diskussionen</p>
                                <p className="text-sm text-zinc-600 mb-4">Sei der Erste und starte ein Thema!</p>
                                <Link
                                    href="/forum/create"
                                    className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 font-bold transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Thema erstellen
                                </Link>
                            </div>
                        )}
                    </section>


                </main>

                {/* ── Right rail (xl only) ──────────────────────────────── */}
                <ForumRightRail />
            </div>

            {/* ── Mobile FAB ──────────────────────────────────────────────── */}
            <Link
                href="/forum/create"
                className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-900/40 transition"
            >
                <Plus className="w-6 h-6" />
                <span className="sr-only">Neues Thema erstellen</span>
            </Link>
        </>
    );
}
