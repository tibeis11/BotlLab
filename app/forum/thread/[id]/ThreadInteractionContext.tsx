'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ReplyTarget = {
    id: string;
    authorName: string;
    content: string;
};

interface ThreadInteractionContextType {
    replyTarget: ReplyTarget | null;
    setReplyTarget: (target: ReplyTarget | null) => void;
}

const ThreadInteractionContext = createContext<ThreadInteractionContextType | undefined>(undefined);

export function ThreadInteractionProvider({ children }: { children: ReactNode }) {
    const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

    return (
        <ThreadInteractionContext.Provider value={{ replyTarget, setReplyTarget }}>
            {children}
        </ThreadInteractionContext.Provider>
    );
}

export function useThreadInteraction() {
    const context = useContext(ThreadInteractionContext);
    if (!context) {
        throw new Error('useThreadInteraction must be used within a ThreadInteractionProvider');
    }
    return context;
}
