'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import VoteBar from './VoteBar';
import PostReplyButton from './PostReplyButton';
import ReportButton from './ReportButton';
import MarkdownContent from '@/app/forum/_components/MarkdownContent';
import type { VoteCounts } from '@/lib/forum-service';

interface PostAuthor {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    tier: string | null;
    joined_at: string | null;
    subscription_tier: string | null;
}

interface ClientForumPostData {
    id: string;
    content: string;
    author_id: string | null;
    thread_id: string;
    parent_id: string | null;
    created_at: string;
    updated_at: string | null;
    deleted_at: string | null;
    author: PostAuthor | null;
}

interface ClientForumPostProps {
    post: ClientForumPostData;
    threadAuthorId: string | null;
    initialCounts?: VoteCounts;
    initialUserVotes?: string[];
}

/**
 * Client-side version of ForumPost for dynamically loaded posts.
 * Does not do server-side brew lookups (simpler rendering).
 */
export default function ClientForumPost({ post, threadAuthorId, initialCounts, initialUserVotes }: ClientForumPostProps) {
    const emptyCounts: VoteCounts = { prost: 0, hilfreich: 0, feuer: 0 };

    const isDeleted = !!post.deleted_at;
    const isEdited = !isDeleted && !!post.updated_at &&
        Math.abs(new Date(post.updated_at).getTime() - new Date(post.created_at).getTime()) > 5000;

    const contentToRender = (post.content || '').trim();

    return (
        <div className="bg-surface/10 border border-border rounded-2xl ml-0 md:ml-4 overflow-hidden group hover:border-border-hover/50 transition duration-300">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-surface/60 to-transparent border-b border-border flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    {post.author ? (
                        <Link href={`/brewer/${post.author.id}`} className="flex items-center gap-3 group/author">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs overflow-hidden relative shadow-lg bg-surface border-2 border-border-hover transition">
                                <img
                                    src={post.author.avatar_url || '/default_label/default.webp'}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold text-foreground text-sm group-hover/author:text-brand transition">
                                    {post.author.display_name}
                                </span>
                                {post.author_id === threadAuthorId && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
                                        Autor
                                    </span>
                                )}
                            </div>
                        </Link>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted ring-1 ring-white/10">
                                <User size={14} />
                            </div>
                            <span className="font-bold text-foreground text-sm">Gelöschter Nutzer</span>
                        </div>
                    )}
                </div>
                <div className="text-xs text-text-disabled font-medium">
                    {new Date(post.created_at).toLocaleDateString()} <span className="text-text-disabled mx-1">|</span> {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            <div className="p-4 md:p-5">
                {isDeleted ? (
                    <p className="text-text-disabled text-sm italic">[Dieser Beitrag wurde gelöscht]</p>
                ) : (
                    <MarkdownContent content={contentToRender} />
                )}

                {!isDeleted && isEdited && (
                    <p className="mt-2 text-[10px] text-text-disabled italic">
                        Bearbeitet am {new Date(post.updated_at!).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                )}

                {!isDeleted && (
                    <VoteBar
                        targetId={post.id}
                        targetType="post"
                        initialCounts={initialCounts ?? emptyCounts}
                        initialUserVotes={initialUserVotes ?? []}
                    />
                )}

                <div className="mt-4 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {!isDeleted && (
                        <PostReplyButton
                            post={{
                                id: post.id,
                                content: post.content,
                                author: post.author ? { display_name: post.author.display_name ?? 'Unbekannt' } : undefined
                            }}
                        />
                    )}
                    <ReportButton targetId={post.id} targetType="forum_post" />
                </div>
            </div>
        </div>
    );
}
