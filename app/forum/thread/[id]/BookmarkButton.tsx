'use client';

import { useTransition, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { toggleForumBookmark } from '@/lib/actions/forum-actions';

interface BookmarkButtonProps {
    targetId: string;
    targetType: 'thread' | 'post';
    initialBookmarked: boolean;
}

export default function BookmarkButton({ targetId, targetType, initialBookmarked }: BookmarkButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [bookmarked, setBookmarked] = useState(initialBookmarked);

    function handleToggle() {
        if (isPending) return;
        // Optimistic update
        setBookmarked(prev => !prev);
        startTransition(async () => {
            const result = await toggleForumBookmark(targetId, targetType);
            if ('error' in result) {
                // Revert on error
                setBookmarked(prev => !prev);
            }
        });
    }

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            title={bookmarked ? 'Lesezeichen entfernen' : 'Als Lesezeichen speichern'}
            className={`
                flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-150 disabled:opacity-60
                ${bookmarked
                    ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                }
            `}
        >
            <Bookmark
                size={14}
                className={`transition-all ${bookmarked ? 'fill-amber-400' : ''}`}
            />
            <span className="hidden sm:inline">{bookmarked ? 'Gespeichert' : 'Merken'}</span>
        </button>
    );
}
