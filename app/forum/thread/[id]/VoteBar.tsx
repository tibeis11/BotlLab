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
    /** Array of `${targetId}:${reactionType}` strings */
    initialUserVotes: string[];
}

const REACTIONS: { type: ReactionType; icon: typeof Beer; label: string; tooltip: string }[] = [
    { type: 'prost',     icon: Beer,      label: 'Prost',     tooltip: 'Das gefällt mir' },
    { type: 'hilfreich', icon: Lightbulb, label: 'Hilfreich', tooltip: 'Das hat mir geholfen' },
    { type: 'feuer',     icon: Flame,     label: 'Feuer',     tooltip: 'Das ist begeisternd' },
];

export default function VoteBar({ targetId, targetType, initialCounts, initialUserVotes }: VoteBarProps) {
    const [isPending, startTransition] = useTransition();
    const [counts, setCounts] = useState<VoteCounts>({ ...initialCounts });
    const [userVotes, setUserVotes] = useState<Set<string>>(() => new Set(initialUserVotes));

    function handleVote(reactionType: ReactionType) {
        if (isPending) return;

        const key = `${targetId}:${reactionType}`;
        const alreadyVoted = userVotes.has(key);

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
        <div className="flex items-center gap-1.5">
            {REACTIONS.map(({ type, icon: Icon, label, tooltip }) => {
                const voted = userVotes.has(`${targetId}:${type}`);
                const count = counts[type];
                return (
                    <button
                        key={type}
                        onClick={() => handleVote(type)}
                        disabled={isPending}
                        title={tooltip}
                        aria-label={tooltip}
                        className={`
                            inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium
                            transition-all duration-100 select-none
                            ${voted
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60'
                            }
                            disabled:opacity-60 disabled:cursor-not-allowed
                        `}
                    >
                        <Icon size={12} />
                        <span className="hidden sm:inline">{label}</span>
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
