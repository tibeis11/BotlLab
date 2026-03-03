import Link from 'next/link';
import { Metadata } from 'next';
import { FlaskConical, MessageSquare, ArrowLeft } from 'lucide-react';
import Footer from '@/app/components/Footer';
import { getRecentBrewCommentThreads } from '@/lib/forum-service';
import ForumSidebar from '../_components/ForumSidebar';
import ForumRightRail from '../_components/ForumRightRail';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Rezept-Kommentare | Forum | BotlLab',
    description: 'Kommentare zu Bier-Rezepten – Community-Diskussionen zu einzelnen Rezepten auf BotlLab.',
    alternates: { canonical: '/forum/rezept-kommentare' },
};

export default async function RezeptKommentarePage() {
    const threads = await getRecentBrewCommentThreads(60);

    return (
        <>
            {/* ── Hero Banner ──────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-zinc-900 border-b border-zinc-800">
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/80 to-cyan-950/20" />
                <div className="relative px-6 md:px-12 lg:px-16 py-6 md:py-10 max-w-screen-2xl mx-auto">
                    {/* Breadcrumb */}
                    <Link
                        href="/forum"
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Forum
                    </Link>

                    <div className="flex items-center gap-3 mb-2">
                        <FlaskConical className="w-5 h-5 text-cyan-400" />
                        <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs">Community Forum</p>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 leading-tight">
                        Rezept-<span className="text-cyan-400">Kommentare</span>
                    </h1>
                    <p className="text-zinc-400 text-sm max-w-md">
                        Diskussionen zu einzelnen Bier-Rezepten der BotlLab-Community.
                    </p>

                    {/* Stats */}
                    {threads.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-4 text-xs text-zinc-500">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                            <span className="font-bold text-white">{threads.length}</span>
                            {threads.length === 1 ? 'Rezept diskutiert' : 'Rezepte diskutiert'}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Main Layout ──────────────────────────────────────────── */}
            <div className="flex gap-0 max-w-screen-2xl mx-auto">

                {/* ── Left sidebar ──────────────────────────────────────── */}
                <ForumSidebar activeSlug="rezept-kommentare" />

                {/* ── Main content ──────────────────────────────────────── */}
                <main className="flex-1 min-w-0 px-6 pt-8 pb-16">

                    {threads.length === 0 ? (
                        <div className="text-center py-20">
                            <FlaskConical className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                            <p className="font-bold text-zinc-400 mb-1">Noch keine Rezept-Diskussionen</p>
                            <p className="text-sm text-zinc-600 mb-5">
                                Kommentiere ein Rezept auf der Brew-Seite, um die erste Diskussion zu starten.
                            </p>
                            <Link
                                href="/discover"
                                className="inline-flex items-center gap-2 text-sm text-cyan-500 hover:text-cyan-400 font-bold transition-colors"
                            >
                                Brews entdecken →
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p className="text-[11px] font-bold text-zinc-700 uppercase tracking-widest mb-4">
                                Zuletzt aktiv
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {threads.map((thread: any) => {
                                    const brew = thread.brew;
                                    const href = brew
                                        ? `/brew/${brew.id}?tab=kommentare`
                                        : `/forum/thread/${thread.id}`;

                                    return (
                                        <Link
                                            key={thread.id}
                                            href={href}
                                            className="flex flex-col gap-2 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-900/50 rounded-2xl p-3 transition-colors group"
                                        >
                                            {/* Brew image */}
                                            <div className="w-full aspect-square rounded-xl bg-zinc-800 border border-zinc-700/30 overflow-hidden flex items-center justify-center">
                                                {brew?.image_url ? (
                                                    <img
                                                        src={brew.image_url}
                                                        alt={brew.name ?? ''}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <FlaskConical className="w-8 h-8 text-cyan-700/30" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="space-y-0.5 flex-1">
                                                <p className="text-xs font-bold text-zinc-200 group-hover:text-white line-clamp-2 leading-snug transition-colors">
                                                    {brew?.name ?? thread.title}
                                                </p>
                                                {(brew?.style || brew?.brew_type) && (
                                                    <p className="text-[10px] text-zinc-600 truncate">
                                                        {brew.style ?? brew.brew_type}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Comment count */}
                                            <div className="flex items-center gap-1 pt-1 border-t border-zinc-800/60">
                                                <MessageSquare className="w-3 h-3 text-zinc-700 group-hover:text-cyan-600 transition-colors" />
                                                <span className="text-[10px] text-zinc-600 tabular-nums">
                                                    {thread.reply_count ?? 0}{' '}
                                                    {(thread.reply_count ?? 0) === 1 ? 'Kommentar' : 'Kommentare'}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </main>

                {/* ── Right rail ────────────────────────────────────────── */}
                <ForumRightRail />
            </div>
            <Footer />
        </>
    );
}
