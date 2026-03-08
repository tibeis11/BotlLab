'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';

interface SearchThread {
    id: string;
    title: string;
    content?: string | null;
    reply_count?: number | null;
    is_solved?: boolean | null;
    category?: { title: string; slug: string } | null;
    author?: { id: string; display_name: string | null } | null;
}

interface SearchPost {
    id: string;
    content: string;
    thread?: {
        id: string;
        title: string;
        category?: { title: string; slug: string } | null;
    } | null;
    author?: { id: string; display_name: string | null } | null;
}

interface SearchResults {
    threads: SearchThread[];
    posts: SearchPost[];
}

interface ForumSearchProps {
    compact?: boolean;
}

/** Strip common markdown syntax for clean preview text */
function stripMarkdown(text: string): string {
    return text
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/^>\s+/gm, '')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/\n+/g, ' ')
        .trim();
}

export default function ForumSearch({ compact }: ForumSearchProps = {}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ threads: [], posts: [] });
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Open on Ctrl+K / Cmd+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(true);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery('');
            setResults({ threads: [], posts: [] });
            setHasSearched(false);
        }
    }, [open]);

    const doSearch = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setResults({ threads: [], posts: [] });
            setHasSearched(false);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/forum/search?q=${encodeURIComponent(q)}`);
            const data: SearchResults = await res.json();
            setResults(data);
            setHasSearched(true);
        } catch {
            setResults({ threads: [], posts: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 350);
    };

    const navigate = (path: string) => {
        setOpen(false);
        router.push(path);
    };

    const totalResults = results.threads.length + results.posts.length;

    // ── Trigger ────────────────────────────────────────────────────────
    if (!open) {
        if (compact) {
            return (
                <button
                    onClick={() => setOpen(true)}
                    className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                    aria-label="Forum durchsuchen"
                >
                    <Search className="w-5 h-5" />
                </button>
            );
        }
        return (
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 w-full px-3 py-1.5 bg-surface/80 border border-border rounded-lg text-text-muted hover:border-border-active hover:text-text-secondary transition text-sm cursor-text"
                aria-label="Forum durchsuchen"
            >
                <Search className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left text-text-disabled">Forum durchsuchen…</span>
            </button>
        );
    }

    // ── Open overlay ───────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[100] flex flex-col sm:flex-row sm:items-start sm:justify-center sm:pt-[10vh] sm:px-4">
            {/* Backdrop — only on sm+ (on mobile the overlay IS the full screen) */}
            <div
                className="hidden sm:block absolute inset-0 bg-background/70 backdrop-blur-sm"
                onClick={() => setOpen(false)}
            />

            {/* Panel — full-screen on mobile, modal on desktop */}
            <div className="relative flex-1 flex flex-col w-full sm:flex-none sm:h-auto sm:max-w-xl sm:rounded-2xl bg-background sm:border sm:border-border sm:shadow-2xl sm:overflow-hidden animate-in fade-in sm:zoom-in-95 duration-150">

                {/* ── Input row ── */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0">
                    {loading ? (
                        <Loader2 className="w-5 h-5 text-text-muted shrink-0 animate-spin" />
                    ) : (
                        <Search className="w-5 h-5 text-text-muted shrink-0" />
                    )}
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={handleInput}
                        placeholder="Forum durchsuchen…"
                        className="flex-1 bg-transparent text-text-primary placeholder:text-text-disabled outline-none text-base"
                    />
                    <button
                        onClick={() => {
                            if (query) {
                                setQuery('');
                                setResults({ threads: [], posts: [] });
                                setHasSearched(false);
                                inputRef.current?.focus();
                            } else {
                                setOpen(false);
                            }
                        }}
                        className="text-text-muted hover:text-text-primary transition"
                        aria-label={query ? 'Eingabe löschen' : 'Suche schließen'}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Results ── */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {!query && !hasSearched && (
                        <div className="py-16 text-center text-text-disabled text-sm">
                            Suchbegriff eingeben…
                        </div>
                    )}

                    {query.length > 0 && query.length < 2 && (
                        <div className="py-12 text-center text-text-disabled text-sm">
                            Mindestens 2 Zeichen eingeben
                        </div>
                    )}

                    {hasSearched && !loading && totalResults === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-text-muted font-medium text-sm">
                                Keine Ergebnisse für <span className="text-text-secondary">&quot;{query}&quot;</span>
                            </p>
                        </div>
                    )}

                    {results.threads.length > 0 && (
                        <div className="p-2">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-text-disabled px-3 py-2">
                                Threads ({results.threads.length})
                            </p>
                            {results.threads.map(thread => (
                                <button
                                    key={thread.id}
                                    onClick={() => navigate(`/forum/thread/${thread.id}`)}
                                    className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-surface active:bg-surface transition group"
                                >
                                    <MessageSquare className="w-3.5 h-3.5 text-success shrink-0 mt-1" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                            {thread.category && (
                                                <span className="text-[10px] uppercase font-bold tracking-wide text-text-muted">
                                                    {thread.category.title}
                                                </span>
                                            )}
                                            {thread.is_solved && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-success">
                                                    <CheckCircle2 className="w-3 h-3" /> Gelöst
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-foreground group-hover:text-text-primary transition line-clamp-1">
                                            {thread.title}
                                        </p>
                                        {thread.content && (
                                            <p className="text-xs text-text-disabled line-clamp-1 mt-0.5">
                                                {stripMarkdown(thread.content).slice(0, 120)}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-text-disabled">
                                            {thread.author?.display_name && <span>@{thread.author.display_name}</span>}
                                            {thread.reply_count != null && <span>{thread.reply_count} Antworten</span>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {results.posts.length > 0 && (
                        <div className="p-2 border-t border-border">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-text-disabled px-3 py-2">
                                Beiträge ({results.posts.length})
                            </p>
                            {results.posts.map(post => (
                                <button
                                    key={post.id}
                                    onClick={() => navigate(`/forum/thread/${post.thread?.id}`)}
                                    className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-surface active:bg-surface transition group"
                                >
                                    <MessageSquare className="w-3.5 h-3.5 text-text-muted shrink-0 mt-1" />
                                    <div className="flex-1 min-w-0">
                                        {post.thread && (
                                            <p className="text-xs text-text-muted mb-0.5 line-clamp-1">
                                                in &quot;{post.thread.title}&quot;
                                            </p>
                                        )}
                                        <p className="text-sm text-text-secondary group-hover:text-text-primary transition line-clamp-2">
                                            {stripMarkdown(post.content).slice(0, 160)}
                                        </p>
                                        {post.author?.display_name && (
                                            <p className="text-[11px] text-text-disabled mt-1">@{post.author.display_name}</p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

