'use client';

import { useState, useTransition } from 'react';
import { BarChart2, CheckCircle2, Clock } from 'lucide-react';
import { voteOnPoll } from '@/lib/actions/forum-actions';

export interface PollOption {
    id: string;
    label: string;
    sort_order: number;
    voteCount: number;
}

export interface PollData {
    id: string;
    question: string;
    multiple_choice: boolean;
    ends_at: string | null;
    options: PollOption[];
    totalVotes: number;
    userVotedOptionIds: string[];
}

interface PollBlockProps {
    poll: PollData;
    currentUserId: string | null;
}

export default function PollBlock({ poll, currentUserId }: PollBlockProps) {
    const [userVotes, setUserVotes] = useState<Set<string>>(new Set(poll.userVotedOptionIds));
    const [counts, setCounts] = useState<Record<string, number>>(
        Object.fromEntries(poll.options.map(o => [o.id, o.voteCount]))
    );
    const [isPending, startTransition] = useTransition();

    const totalVotes = Object.values(counts).reduce((s, c) => s + c, 0);
    const isExpired = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;
    const hasVoted = userVotes.size > 0;

    function handleVote(optionId: string) {
        if (!currentUserId || isPending || isExpired) return;
        const alreadyVoted = userVotes.has(optionId);

        // Optimistic update
        if (!poll.multiple_choice) {
            // Single choice: remove all previous votes, add new
            const prev = [...userVotes][0];
            setUserVotes(new Set([optionId]));
            setCounts(c => {
                const next = { ...c, [optionId]: (c[optionId] ?? 0) + 1 };
                if (prev && prev !== optionId) next[prev] = Math.max(0, (c[prev] ?? 1) - 1);
                return next;
            });
        } else {
            if (alreadyVoted) {
                setUserVotes(s => { const n = new Set(s); n.delete(optionId); return n; });
                setCounts(c => ({ ...c, [optionId]: Math.max(0, (c[optionId] ?? 1) - 1) }));
            } else {
                setUserVotes(s => new Set([...s, optionId]));
                setCounts(c => ({ ...c, [optionId]: (c[optionId] ?? 0) + 1 }));
            }
        }

        startTransition(() => { voteOnPoll(optionId); });
    }

    return (
        <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
                <BarChart2 size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <p className="font-bold text-white text-sm">{poll.question}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-zinc-500">
                        <span>{totalVotes} {totalVotes === 1 ? 'Stimme' : 'Stimmen'}</span>
                        {poll.multiple_choice && <span>· Mehrfachauswahl</span>}
                        {poll.ends_at && (
                            <span className="flex items-center gap-1">
                                <Clock size={9} />
                                {isExpired ? 'Beendet' : `bis ${new Date(poll.ends_at).toLocaleDateString()}`}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {poll.options
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(option => {
                        const count = counts[option.id] ?? 0;
                        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        const voted = userVotes.has(option.id);
                        const canVote = !!currentUserId && !isExpired;

                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={!canVote || isPending}
                                onClick={() => handleVote(option.id)}
                                className={`w-full text-left rounded-lg overflow-hidden border transition disabled:cursor-default ${
                                    voted
                                        ? 'border-emerald-500/50 bg-emerald-950/30'
                                        : 'border-zinc-700/60 bg-zinc-900/60 hover:border-zinc-600'
                                }`}
                            >
                                <div className="relative px-3 py-2">
                                    {/* Progress bar */}
                                    {(hasVoted || isExpired) && (
                                        <div
                                            className={`absolute inset-0 transition-all duration-500 ${voted ? 'bg-emerald-500/10' : 'bg-zinc-700/20'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    )}
                                    <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {voted && <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />}
                                            <span className={`text-sm font-medium ${voted ? 'text-emerald-300' : 'text-zinc-300'}`}>
                                                {option.label}
                                            </span>
                                        </div>
                                        {(hasVoted || isExpired) && (
                                            <span className={`text-xs font-bold ${voted ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                {pct}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
            </div>

            {!currentUserId && (
                <p className="text-[11px] text-zinc-500 text-center">Einloggen um abzustimmen</p>
            )}
        </div>
    );
}
