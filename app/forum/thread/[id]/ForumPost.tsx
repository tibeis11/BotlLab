
import { createClient } from '@/lib/supabase-server';
import { User, MessageSquare, Beaker } from 'lucide-react';
import Link from 'next/link';
import ReportButton from './ReportButton';
import PostReplyButton from './PostReplyButton';
import { getTierBorderColor } from '@/lib/premium-config';
import VoteBar from './VoteBar';
import type { VoteCounts } from '@/lib/forum-service';
import EditDeletePostButtons from './EditDeletePostButtons';
import MarkdownContent from '@/app/forum/_components/MarkdownContent';
import { formatRelativeTime } from '@/app/forum/_components/forum-utils';
import UserAvatar from '@/app/components/UserAvatar';

interface PostAuthor {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    joined_at: string | null;
    subscription_tier: string | null;
}

interface ForumPostData {
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

interface ForumPostProps {
    post: ForumPostData;
    threadAuthorId: string | null;
    initialCounts?: VoteCounts;
    initialUserVotes?: string[];
    currentUserId?: string | null;
    /** Pre-fetched brew data keyed by brew ID — avoids N+1 DB queries */
    brewMap?: Map<string, any>;
}

export default async function ForumPost({ post, threadAuthorId, initialCounts, initialUserVotes, currentUserId, brewMap }: ForumPostProps) {
    const emptyCounts: VoteCounts = { prost: 0, hilfreich: 0, feuer: 0 };

    const isDeleted = !!post.deleted_at;
    const isEdited = !isDeleted && !!post.updated_at &&
        Math.abs(new Date(post.updated_at).getTime() - new Date(post.created_at).getTime()) > 5000;

    // Regex to find brew UUID (matches /brew/UUID)
    const brewRegex = /\/brew\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const match = isDeleted ? null : post.content.match(brewRegex);
    let linkedBrew = null;

    if (match && match[1]) {
        const brewId = match[1];
        // Use pre-fetched brewMap if available (batched on thread page), otherwise fallback to individual query
        if (brewMap && brewMap.has(brewId)) {
            linkedBrew = brewMap.get(brewId);
        } else if (!brewMap) {
            const supabase = await createClient();
            const { data } = await supabase
                .from('brews')
                .select('id, name, image_url, moderation_status, brewery_id, brewery:breweries(name)')
                .eq('id', brewId)
                .single();
            linkedBrew = data;
        }
    }

    const tierBorderClass = getTierBorderColor(post.author?.subscription_tier);

    const contentToRender = (post.content || '').trim();

    // (content is rendered via MarkdownContent below)

    return (
        <div className="group flex gap-3 py-4 border-b border-border/30 last:border-b-0 hover:bg-surface/20 transition-colors rounded px-2">
            {/* Avatar column */}
            <div className="shrink-0 pt-0.5">
                {post.author ? (
                    <Link href={`/brewer/${post.author.id}`}>
                        <UserAvatar src={post.author.avatar_url} name={post.author.display_name} userId={post.author.id} tier={post.author.subscription_tier} sizeClass="w-7 h-7" />
                    </Link>
                ) : (
                    <div className="w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center text-text-disabled">
                        <User size={10} />
                    </div>
                )}
            </div>

            {/* Content column */}
            <div className="flex-1 min-w-0">
                {/* Inline meta: name · badges · time · actions */}
                <div className="flex items-baseline gap-1.5 flex-wrap mb-2">
                    {post.author ? (
                        <Link href={`/brewer/${post.author.id}`} className="font-semibold text-[13px] text-foreground hover:text-success transition leading-none">
                            {post.author.display_name}
                        </Link>
                    ) : (
                        <span className="font-semibold text-[13px] text-text-muted leading-none">Gelöschter Nutzer</span>
                    )}

                    {post.author_id === threadAuthorId && (
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-px rounded bg-brand/10 text-brand border border-brand/20 leading-none">
                            OP
                        </span>
                    )}

                    <span className="text-[11px] text-text-disabled leading-none">
                        {formatRelativeTime(post.created_at)}
                    </span>
                </div>

                {/* Post body */}
                <div className="text-sm leading-relaxed">
                {isDeleted ? (
                    <p className="text-text-disabled text-sm italic">[Dieser Beitrag wurde gelöscht]</p>
                ) : (
                    <>
                <MarkdownContent content={contentToRender} />

                {linkedBrew && (
                    <div className="mt-1.5">
                        <Link href={`/brew/${linkedBrew.id}`} className="inline-flex items-center gap-2.5 bg-background/40 border border-border rounded-lg px-2.5 py-1.5 hover:border-border-hover hover:bg-surface/40 transition group/brew max-w-sm">
                            <div className="w-8 h-8 bg-surface rounded overflow-hidden border border-border flex-shrink-0">
                                {linkedBrew.image_url ? (
                                    <img 
                                        src={linkedBrew.image_url} 
                                        className={`w-full h-full object-cover ${
                                            (linkedBrew.moderation_status === 'pending' || linkedBrew.moderation_status === 'rejected') && !linkedBrew.image_url.startsWith('/default_label')
                                            ? 'filter blur-sm opacity-50' 
                                            : ''
                                        }`} 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-surface">
                                        <Beaker className="w-3.5 h-3.5 text-text-disabled" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] text-text-muted uppercase font-bold tracking-wider leading-none mb-0.5">Erwähntes Rezept</div>
                                <div className="text-xs font-bold text-text-secondary group-hover/brew:text-success transition truncate">{linkedBrew.name}</div>
                            </div>
                            <span className="text-text-disabled group-hover/brew:text-text-secondary text-xs ml-1">→</span>
                        </Link>
                    </div>
                )}

    </>
                )}

                {!isDeleted && isEdited && (
                    <span className="text-[10px] text-text-disabled italic">
                        (bearbeitet)
                    </span>
                )}

                {/* Footer action bar — always visible, mobile-friendly */}
                {!isDeleted && (
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border gap-2">
                        {/* Reactions left */}
                        <VoteBar
                            targetId={post.id}
                            targetType="post"
                            initialCounts={initialCounts ?? emptyCounts}
                            initialUserVotes={initialUserVotes ?? []}
                        />
                        {/* Actions right */}
                        <div className="flex items-center gap-0.5">
                            <PostReplyButton post={{ id: post.id, content: post.content, author: post.author ? { display_name: post.author.display_name ?? 'Unbekannt' } : undefined }} />
                            {currentUserId === post.author_id && (
                                <EditDeletePostButtons
                                    targetId={post.id}
                                    targetType="post"
                                    initialContent={post.content}
                                    createdAt={post.created_at}
                                />
                            )}
                            <ReportButton targetId={post.id} targetType="forum_post" />
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
