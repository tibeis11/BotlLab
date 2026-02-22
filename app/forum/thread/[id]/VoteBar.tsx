'use client';

import { useTransition, useState } from 'react';
import { toggleForumVote } from '@/lib/actions/forum-actions';
import type { VoteCounts } from '@/lib/forum-service';
import { Beer, Lightbulb, Flame } from 'lucide-react';

type ReactionType = 'prost' | 'hilfreich' | 'feuer';

interface VoteBarProps {
    targetId: string;
    targetType: 'thread' | 'post';
    initialCounts: VoteCounts;
    /** Array of `${targetId}:${reactionType}` strings – pass empty array for anonymous visitors */
    initialUserVotes: string[];
}

const REACTIONS: { type: ReactionType; icon: typeof Beer; label: string }[] = [
    { type: 'prost', icon: Beer, label: 'Prost' },
    { type: 'hilfreich', icon: Lightbulb, label: 'Hilfreich' },
    { type: 'feuer', icon: Flame, label: 'Feuer' },
];

export default function VoteBar({ targetId, targetType, initialCounts, initialUserVotes }: VoteBarProps) {
    const [isPending, startTransition] = useTransition();
    const [counts, setCounts] = useState<VoteCounts>({ ...initialCounts });
    const [userVotes, setUserVotes] = useState<Set<string>>(() => new Set(initialUserVotes));

    const totalCount = counts.prost + counts.hilfreich + counts.feuer;
    const hasAnyVotes = totalCount > 0;
    const hasUserVoted = REACTIONS.some(r => userVotes.has(`${targetId}:${r.type}`));

    function handleVote(reactionType: ReactionType) {
        if (isPending) return;

        const key = `${targetId}:${reactionType}`;
        const alreadyVoted = userVotes.has(key);

        // Optimistic update
        setCounts(prev => ({
            ...prev,
            [reactionType]: prev[reactionType] + (alreadyVoted ? -1 : 1),
        }));
        setUserVotes(prev => {
            const next = new Set(prev);
            if (alreadyVoted) next.delete(key);
            else next.add(key);
            return next;
        });

        startTransition(async () => {
            const result = await toggleForumVote(targetId, targetType, reactionType);
            if ('error' in result) {
                // Revert optimistic update on error
                setCounts(prev => ({
                    ...prev,
                    [reactionType]: prev[reactionType] + (alreadyVoted ? 1 : -1),
                }));
                setUserVotes(prev => {
                    const next = new Set(prev);
                    if (alreadyVoted) next.add(key);
                    else next.delete(key);
                    return next;
                });
            }
        });
    }

    return (
        <div className="flex items-center gap-1">
            {REACTIONS.map(({ type, icon: Icon, label }) => {
                const voted = userVotes.has(`${targetId}:${type}`);
                const count = counts[type];
                // Only show reactions that have votes OR if user is hovering (handled by group-hover)
                // Always show all three as tiny icons, highlight active ones
                return (
                    <button
                        key={type}
                        onClick={() => handleVote(type)}
                        disabled={isPending}
                        title={label}
                        className={`
                            inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium
                            transition-all duration-100 select-none
                            ${voted
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
                            }
                            disabled:opacity-60 disabled:cursor-not-allowed
                        `}
                    >
                        <Icon size={12} className={voted ? 'text-emerald-400' : ''} />
                        {count > 0 && (
                            <span className={`tabular-nums ${voted ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
