'use client';

import { Reply } from 'lucide-react';
import { useThreadInteraction } from './ThreadInteractionContext';

interface PostReplyButtonProps {
    post: {
        id: string;
        author?: {
            display_name: string;
        };
        content: string;
    };
}

export default function PostReplyButton({ post }: PostReplyButtonProps) {
    const { setReplyTarget } = useThreadInteraction();

    const handleReply = () => {
        setReplyTarget({
            id: post.id,
            authorName: post.author?.display_name || 'Unbekannt',
            content: post.content
        });
        
        // Scroll to reply input if possible
        const inputElement = document.getElementById('reply-input-area');
        if (inputElement) {
            inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputElement.focus();
        }
    };

    return (
        <button 
            onClick={handleReply}
            className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
            title="Auf diesen Beitrag antworten"
        >
            <Reply size={16} />
        </button>
    );
}
