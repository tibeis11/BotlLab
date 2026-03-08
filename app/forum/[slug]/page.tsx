import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
    Megaphone, Scroll, Wrench, ShoppingBag, Coffee,
    MessageSquare, Plus, Clock, TrendingUp, Tag,
} from 'lucide-react';
import { getCategoryWithStats, getThreadsByCategory } from '@/lib/forum-service';
import ForumSidebar from '../_components/ForumSidebar';
import ThreadListLoadMore from '../_components/ThreadListLoadMore';

const iconMap: Record<string, React.ElementType> = {
    Megaphone, Scroll, Wrench, ShoppingBag, Coffee, MessageSquare,
};

const categoryAccents = [
    { iconColor: 'text-warning',   gradient: 'from-amber-950/30' },
    { iconColor: 'text-success', gradient: 'from-emerald-950/30' },
    { iconColor: 'text-brand',    gradient: 'from-blue-950/30' },
    { iconColor: 'text-purple-400',  gradient: 'from-purple-950/30' },
    { iconColor: 'text-text-secondary',    gradient: 'from-surface/50' },
];

const SORT_TABS = [
    { key: 'new',         label: 'Neueste' },
    { key: 'top',         label: 'Beliebteste' },
    { key: 'replies',     label: 'Meiste Antworten' },
    { key: 'unanswered',  label: 'Unbeantwortet' },
    { key: 'solved',      label: 'Gelöst' },
] as const;

const AVAILABLE_TAGS = [
    'Frage','Rezept','Showcase','Equipment','Tipp','Problem','Diskussion','Neuigkeit',
];

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug } = await params;
    const category = await getCategoryWithStats(slug);
    if (!category) return { title: 'Forum | BotlLab' };
    const description = (category.description as string | null) ?? `Diskussionen in ${category.title} auf BotlLab.`;
    return {
        title: `${category.title} | BotlLab Forum`,
        description,
        alternates: { canonical: `/forum/${slug}` },
        openGraph: {
            title: `${category.title} | BotlLab Forum`,
            description,
            url: `https://botllab.de/forum/${slug}`,
            siteName: 'BotlLab',
            locale: 'de_DE',
            type: 'website',
        },
    };
}

interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ sort?: string; tag?: string }>;
}

export const revalidate = 60;

export default async function ForumCategoryPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const { sort = 'new', tag } = await searchParams;
    const sortParam = (['new','top','replies','unanswered','solved'] as const).includes(sort as any)
        ? sort as 'new' | 'top' | 'replies' | 'unanswered' | 'solved'
        : 'new' as const;

    const category = await getCategoryWithStats(slug);
    if (!category) notFound();

    // Find accent for this category based on its sort_order (0-based index)
    const accentIdx = ((category.sort_order ?? 1) - 1) % categoryAccents.length;
    const accent = categoryAccents[accentIdx];
    const Icon = iconMap[category.icon ?? ''] ?? MessageSquare;

    const threads = await getThreadsByCategory(category.id, sortParam, 20, 0, tag);

    return (
        <>
            {/* ── Category Hero Banner ─────────────────────────────────── */}
            <div className="relative overflow-hidden bg-surface border-b border-border">
                <div className={`absolute inset-0 bg-gradient-to-r ${accent.gradient} via-background/80 to-transparent`} />
                <div className="relative px-6 md:px-12 lg:px-16 py-5 md:py-8 max-w-screen-2xl mx-auto">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="hidden md:flex p-3 rounded-xl bg-surface-hover/50 border border-border-hover shrink-0">
                                <Icon className={`w-6 h-6 ${accent.iconColor}`} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
                                    <Link href="/forum" className="hover:text-text-secondary transition">Forum</Link>
                                    <span>/</span>
                                    <span className="text-text-secondary font-medium">{category.title}</span>
                                </div>
                                <h1 className="text-xl md:text-3xl font-black tracking-tight">{category.title}</h1>
                                {category.description && (
                                    <p className="hidden md:block text-sm text-text-secondary leading-relaxed max-w-lg mt-1">{category.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                                    <span className="tabular-nums">
                                        {(category.thread_count as number).toLocaleString('de-DE')} Threads
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* ── Main Layout ──────────────────────────────────────────── */}
            <div className="flex gap-0 max-w-screen-2xl mx-auto">

                {/* ── Left sidebar ──────────────────────────────────────── */}
                <ForumSidebar activeSlug={slug} />

                {/* ── Main content ──────────────────────────────────────── */}
                <main className="flex-1 min-w-0 px-6 pt-6 space-y-5">

                    {/* ── Sort tabs (underline style) ─────────────────────── */}
                    <div className="flex gap-4 border-b border-border overflow-x-auto scrollbar-hide">
                        {SORT_TABS.map(t => (
                            <Link
                                key={t.key}
                                href={t.key === 'new' ? `/forum/${slug}` : `/forum/${slug}?sort=${t.key}`}
                                className={`relative pb-3 text-sm font-bold transition-colors whitespace-nowrap shrink-0
                                    ${sortParam === t.key
                                        ? 'text-text-primary'
                                        : 'text-text-muted hover:text-text-secondary'}
                                `}
                            >
                                {t.label}
                                {sortParam === t.key && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-success rounded-full" />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* ── Tag filter pills ────────────────────────────── */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-text-disabled flex items-center gap-1 mr-1">
                            <Tag className="w-3 h-3" /> Tags:
                        </span>
                        {AVAILABLE_TAGS.map(t => (
                            <Link
                                key={t}
                                href={tag === t
                                    ? `/forum/${slug}${sortParam !== 'new' ? `?sort=${sortParam}` : ''}`
                                    : `/forum/${slug}?${sortParam !== 'new' ? `sort=${sortParam}&` : ''}tag=${encodeURIComponent(t)}`
                                }
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition ${
                                    tag === t
                                        ? 'bg-surface-hover border-border-active text-text-primary'
                                        : 'bg-transparent border-border text-text-muted hover:text-text-secondary hover:border-border-hover'
                                }`}
                            >
                                {t}
                            </Link>
                        ))}
                    </div>

                    {/* ── Thread list (client, handles load-more) ────────── */}
                    {threads.length > 0 ? (
                        <ThreadListLoadMore
                            initialThreads={threads as any}
                            categoryId={category.id}
                            sort={sortParam}
                            pageSize={20}
                            tag={tag}
                        />
                    ) : (
                        <div className="text-center py-16">
                            <h3 className="font-bold text-text-secondary mb-1">Hier ist es noch still</h3>
                            <p className="text-sm text-text-disabled mb-5">Keine Threads in dieser Kategorie.</p>
                            <Link
                                href={`/forum/create?categorySlug=${category.slug}`}
                                className="inline-flex items-center gap-2 bg-success hover:bg-success/90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Ersten Thread erstellen
                            </Link>
                        </div>
                    )}

                    {/* Mobile CTA */}
                    <Link
                        href={`/forum/create?categorySlug=${category.slug}`}
                        className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-success hover:bg-success/90 text-white rounded-full flex items-center justify-center shadow-xl shadow-success/30 transition"
                    >
                        <Plus className="w-6 h-6" />
                        <span className="sr-only">Neues Thema erstellen</span>
                    </Link>
                </main>
            </div>
        </>
    );
}
