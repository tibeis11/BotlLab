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
            authorName: post.author?.display_name || 'Gelöschter Nutzer',
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
            className="flex items-center gap-1.5 py-2 px-2.5 text-text-muted hover:text-success hover:bg-success/10 rounded-lg transition text-xs font-medium"
            title="Auf diesen Beitrag antworten"
        >
            <Reply size={14} />
            <span className="hidden md:inline">Antworten</span>
        </button>
    );
}
