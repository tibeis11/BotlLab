import Link from 'next/link';
import {
    Megaphone,
    Scroll,
    Wrench,
    ShoppingBag,
    Coffee,
    MessageSquare,
    Plus,
    LayoutList,
    Bookmark,
    FlaskConical,
} from 'lucide-react';
import { getForumCategories } from '@/lib/forum-service';

const iconMap: Record<string, React.ElementType> = {
    Megaphone,
    Scroll,
    Wrench,
    ShoppingBag,
    Coffee,
    MessageSquare,
};

const categoryAccents = [
    'text-warning',
    'text-success',
    'text-brand',
    'text-purple-400',
    'text-text-secondary',
];

interface Props {
    /** Slug of the currently active category, used to highlight the nav item. */
    activeSlug?: string;
    /** Set to true when on the /forum/saved page */
    activeSaved?: boolean;
}

export default async function ForumSidebar({ activeSlug, activeSaved }: Props) {
    const categories = await getForumCategories();

    return (
        <aside className="hidden md:flex w-56 lg:w-64 flex-shrink-0 flex-col border-r border-border sticky top-14 self-start pt-8 pb-10 pl-6 md:pl-8 lg:pl-12 pr-6 space-y-6">

            {/* Navigation */}
            <div>
                <h3 className="text-[10px] font-bold text-text-disabled uppercase tracking-widest mb-2">Navigation</h3>
                <div className="flex flex-col">
                    <Link
                        href="/forum"
                        className={`relative text-left py-1.5 text-sm transition-colors ${
                            !activeSlug && !activeSaved
                                ? 'text-text-primary font-semibold'
                                : 'text-text-muted hover:text-text-secondary'
                        }`}
                    >
                        {!activeSlug && !activeSaved && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-success rounded-full" />
                        )}
                        <span className="flex items-center gap-2">
                            <LayoutList className="w-3.5 h-3.5" />
                            Alle Diskussionen
                        </span>
                    </Link>
                    <Link
                        href="/forum/saved"
                        className={`relative text-left py-1.5 text-sm transition-colors ${
                            activeSaved
                                ? 'text-warning font-semibold'
                                : 'text-text-muted hover:text-text-secondary'
                        }`}
                    >
                        {activeSaved && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-warning rounded-full" />
                        )}
                        <span className="flex items-center gap-2">
                            <Bookmark className={`w-3.5 h-3.5 ${activeSaved ? 'fill-warning' : ''}`} />
                            Gespeichert
                        </span>
                    </Link>
                    <Link
                        href="/forum/rezept-kommentare"
                        className={`relative text-left py-1.5 text-sm transition-colors ${
                            activeSlug === 'rezept-kommentare'
                                ? 'text-brand font-semibold'
                                : 'text-text-muted hover:text-brand'
                        }`}
                    >
                        {activeSlug === 'rezept-kommentare' && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-brand rounded-full" />
                        )}
                        <span className="flex items-center gap-2">
                            <FlaskConical className="w-3.5 h-3.5" />
                            Rezept-Kommentare
                        </span>
                    </Link>
                </div>
            </div>

            {/* Kategorien */}
            <div>
                <h3 className="text-[10px] font-bold text-text-disabled uppercase tracking-widest mb-2">Kategorien</h3>
                <div className="flex flex-col">
                    {categories.map((cat: any, i: number) => {
                        const Icon = iconMap[cat.icon ?? ''] ?? MessageSquare;
                        const isActive = cat.slug === activeSlug;
                        const accentColor = categoryAccents[i % categoryAccents.length];
                        return (
                            <Link
                                key={cat.id}
                                href={`/forum/${cat.slug}`}
                                className={`relative text-left py-1.5 text-sm transition-colors group ${
                                    isActive
                                        ? 'text-text-primary font-semibold'
                                        : 'text-text-muted hover:text-text-secondary'
                                }`}
                            >
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-4 bg-success rounded-full" />
                                )}
                                <span className="flex items-center gap-2">
                                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? accentColor : 'text-text-disabled group-hover:text-text-secondary'} transition`} />
                                    <span className="flex-1 truncate">{cat.title}</span>
                                    {cat.thread_count > 0 && (
                                        <span className="text-[10px] tabular-nums text-text-disabled group-hover:text-text-muted transition">
                                            {cat.thread_count}
                                        </span>
                                    )}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* CTA */}
            <Link
                href="/forum/create"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-success hover:bg-success/90 text-white text-sm font-bold transition-colors"
            >
                <Plus className="w-4 h-4" />
                Neues Thema
            </Link>
        </aside>
    );
}
