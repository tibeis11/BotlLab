'use client';

import { ThreadInteractionProvider } from './ThreadInteractionContext';

export default function ThreadInteractionWrapper({ children }: { children: React.ReactNode }) {
    return (
        <ThreadInteractionProvider>
            {children}
        </ThreadInteractionProvider>
    );
}
