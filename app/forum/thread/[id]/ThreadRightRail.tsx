/**
 * ThreadRightRail — intelligent desktop sidebar for thread detail.
 * Shown only on xl+ screens. Displays (in priority order):
 *  1. Poll — interactive if one exists on this thread
 *  2. Linked brew — rich preview card
 *  3. Tags — subdued pill list
 */

import Link from 'next/link';
import { Beaker, Heart, Tag } from 'lucide-react';
import PollBlock, { type PollData } from './PollBlock';

interface Brew {
    id: string;
    name: string | null;
    image_url?: string | null;
    moderation_status?: string | null;
    style?: string | null;
    brew_type?: string | null;
    description?: string | null;
    likes_count?: number | null;
    brewery?: { name: string } | null;
}

interface ThreadRightRailProps {
    poll: PollData | null;
    brew: Brew | null;
    tags: string[] | null;
    currentUserId: string | null;
}

export default function ThreadRightRail({ poll, brew, tags, currentUserId }: ThreadRightRailProps) {
    const hasSomething = !!(poll || brew || (tags && tags.length > 0));
    if (!hasSomething) return null;

    const imageBlurred = brew?.image_url &&
        (brew.moderation_status === 'pending' || brew.moderation_status === 'rejected') &&
        !brew.image_url.startsWith('/default_label');

    return (
        <aside className="hidden xl:flex w-72 flex-shrink-0 flex-col border-l border-zinc-800/60 sticky top-14 self-start pt-6 pb-10 pr-6 lg:pr-10 pl-6 space-y-7 max-h-[calc(100vh-56px)] overflow-y-auto">

            {/* ── Poll ─────────────────────────────────────────────────── */}
            {poll && (
                <div>
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">
                        Abstimmung
                    </h3>
                    <PollBlock poll={poll} currentUserId={currentUserId} />
                </div>
            )}

            {/* ── Verlinktes Rezept ────────────────────────────────────── */}
            {brew && (
                <div>
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">
                        Verlinktes Rezept
                    </h3>
                    <Link href={`/brew/${brew.id}`} className="block rounded-xl overflow-hidden hover:bg-zinc-900/50 transition group -mx-2 px-2 pb-2">
                        {/* Image */}
                        <div className="w-full h-32 rounded-lg bg-zinc-900 overflow-hidden mb-3">
                            {brew.image_url ? (
                                <img
                                    src={brew.image_url}
                                    alt={brew.name ?? ''}
                                    className={`w-full h-full object-cover transition group-hover:scale-[1.02] duration-300 ${imageBlurred ? 'filter blur-sm opacity-50' : ''}`}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Beaker className="w-8 h-8 text-zinc-700" />
                                </div>
                            )}
                        </div>

                        {/* Name + brewery */}
                        <p className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition leading-snug">
                            {brew.name}
                        </p>
                        {brew.brewery?.name && (
                            <p className="text-[11px] text-zinc-500 mt-0.5">{brew.brewery.name}</p>
                        )}

                        {/* Style + type pills */}
                        {(brew.style || brew.brew_type) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {brew.style && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                                        {brew.style}
                                    </span>
                                )}
                                {brew.brew_type && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                                        {brew.brew_type}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Description snippet */}
                        {brew.description && (
                            <p className="text-[11px] text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                                {brew.description}
                            </p>
                        )}

                        {/* Likes */}
                        {(brew.likes_count ?? 0) > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-[11px] text-zinc-600">
                                <Heart size={10} />
                                <span>{brew.likes_count} Likes</span>
                            </div>
                        )}
                    </Link>
                </div>
            )}

            {/* ── Tags ─────────────────────────────────────────────────── */}
            {tags && tags.length > 0 && (
                <div>
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">
                        Tags
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                        {tags.map(tag => (
                            <span
                                key={tag}
                                className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-500"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}
