'use client';

import { useState, useTransition } from 'react';
import { Check, Clock } from 'lucide-react';
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

        if (!poll.multiple_choice) {
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
        <div className="space-y-3">
            {/* Header */}
            <div>
                <p className="font-bold text-text-primary text-sm leading-snug">{poll.question}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                    <span className="font-semibold tabular-nums">{totalVotes} {totalVotes === 1 ? 'Stimme' : 'Stimmen'}</span>
                    {poll.multiple_choice && <span className="text-text-disabled">· Mehrfachauswahl</span>}
                    {poll.ends_at && (
                        <span className="flex items-center gap-1 text-text-disabled">
                            <Clock size={9} />
                            {isExpired ? 'Beendet' : `bis ${new Date(poll.ends_at).toLocaleDateString('de-DE')}`}
                        </span>
                    )}
                </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
                {poll.options
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(option => {
                        const count = counts[option.id] ?? 0;
                        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        const voted = userVotes.has(option.id);
                        const canVote = !!currentUserId && !isExpired;
                        const showBar = hasVoted || isExpired;

                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={!canVote || isPending}
                                onClick={() => handleVote(option.id)}
                                className={`w-full text-left group transition-opacity disabled:cursor-default
                                    ${canVote && !isPending ? 'hover:opacity-80' : ''}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Large tap-target circle — WhatsApp style */}
                                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition-colors ${
                                        voted
                                            ? 'bg-success'
                                            : 'border-2 border-border-active bg-transparent'
                                    }`}>
                                        {voted && <Check size={14} className="text-text-primary" strokeWidth={3} />}
                                    </div>

                                    {/* Label + bar */}
                                    <div className="flex-1 min-w-0">
                                        {/* Label row */}
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className={`text-sm font-medium truncate ${voted ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                {option.label}
                                            </span>
                                            {showBar && (
                                                <span className={`text-xs font-bold tabular-nums ml-3 shrink-0 ${voted ? 'text-success' : 'text-text-muted'}`}>
                                                    {pct}%
                                                </span>
                                            )}
                                        </div>

                                        {/* Thin progress bar */}
                                        <div className="w-full h-1 rounded-full bg-surface-hover overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                                    voted ? 'bg-success' : 'bg-text-disabled'
                                                }`}
                                                style={{ width: showBar ? `${pct}%` : '0%' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
            </div>

            {!currentUserId && (
                <p className="text-[11px] text-text-disabled text-center pt-1">Einloggen, um abzustimmen</p>
            )}
        </div>
    );
}
