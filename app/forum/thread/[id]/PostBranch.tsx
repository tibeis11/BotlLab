/**
 * PostBranch — recursive server component that renders a ForumPost
 * together with all its threaded child-replies (max 3 levels deep).
 */

import ForumPost from './ForumPost';
import type { VoteCounts, VoteMap } from '@/lib/forum-service';

interface PostAuthor {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    tier: string | null;
    joined_at: string | null;
    subscription_tier: string | null;
}

export interface ForumPostData {
    id: string;
    content: string;
    author_id: string;
    thread_id: string;
    parent_id: string | null;
    created_at: string;
    updated_at: string | null;
    deleted_at: string | null;
    author: PostAuthor | null;
}

interface PostBranchProps {
    post: ForumPostData;
    allPosts: ForumPostData[];
    depth: number;
    threadAuthorId: string;
    voteCounts: VoteMap;
    userVotesArray: string[];
    currentUserId: string | null;
    /** Pre-fetched brew data keyed by brew ID — avoids N+1 DB queries */
    brewMap?: Map<string, any>;
}

/** Maximum visual nesting depth (beyond this we flatten). */
const MAX_DEPTH = 3;

export default async function PostBranch({
    post,
    allPosts,
    depth,
    threadAuthorId,
    voteCounts,
    userVotesArray,
    currentUserId,
    brewMap,
}: PostBranchProps) {
    const children = allPosts.filter(p => p.parent_id === post.id);
    const childDepth = Math.min(depth + 1, MAX_DEPTH);

    return (
        <div className={depth > 0 ? 'mt-0' : undefined}>
            <ForumPost
                post={post}
                threadAuthorId={threadAuthorId}
                initialCounts={voteCounts[post.id] ?? { prost: 0, hilfreich: 0, feuer: 0 }}
                initialUserVotes={userVotesArray}
                currentUserId={currentUserId}
                brewMap={brewMap}
            />

            {children.length > 0 && (
                <div className={`mt-1.5 space-y-1.5 ${
                    depth < MAX_DEPTH
                        ? 'ml-5 md:ml-7 border-l-2 border-zinc-700/50 pl-3'
                        : ''
                }`}>
                    {children.map(child => (
                        <PostBranch
                            key={child.id}
                            post={child}
                            allPosts={allPosts}
                            depth={childDepth}
                            threadAuthorId={threadAuthorId}
                            voteCounts={voteCounts}
                            userVotesArray={userVotesArray}
                            currentUserId={currentUserId}
                            brewMap={brewMap}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
