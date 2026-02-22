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
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                    : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                }`}
        >
            {solved
                ? <><CheckCircle size={13} /> Gelöst</>
                : <><Circle size={13} /> Als Gelöst markieren</>
            }
        </button>
    );
}
