'use client';

import { useState, useTransition } from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { markThreadAsSolved } from '@/lib/actions/forum-actions';

interface MarkSolvedButtonProps {
    threadId: string;
    isSolved: boolean;
}

export default function MarkSolvedButton({ threadId, isSolved }: MarkSolvedButtonProps) {
    const [solved, setSolved] = useState(isSolved);
    const [isPending, startTransition] = useTransition();

    function toggle() {
        startTransition(async () => {
            const result = await markThreadAsSolved(threadId, !solved);
            if (result.success) setSolved(prev => !prev);
        });
    }

    return (
        <button
            onClick={toggle}
            disabled={isPending}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition disabled:opacity-50
                ${solved
                    ? 'bg-success/15 border-success/30 text-success hover:bg-success/25'
                    : 'bg-surface-hover/60 border-border-hover text-text-secondary hover:text-foreground hover:border-border-active'
                }`}
        >
            {solved
                ? <><CheckCircle size={13} /> Gelöst</>
                : <><Circle size={13} /> Als Gelöst markieren</>
            }
        </button>
    );
}
