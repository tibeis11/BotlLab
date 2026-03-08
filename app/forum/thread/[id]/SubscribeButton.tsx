'use client';

import { useState, useTransition } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toggleThreadSubscription } from '@/lib/actions/forum-actions';

interface SubscribeButtonProps {
    threadId: string;
    initialSubscribed: boolean;
}

export default function SubscribeButton({ threadId, initialSubscribed }: SubscribeButtonProps) {
    const [subscribed, setSubscribed] = useState(initialSubscribed);
    const [isPending, startTransition] = useTransition();

    function handleClick() {
        startTransition(async () => {
            const result = await toggleThreadSubscription(threadId);
            if ('action' in result) {
                setSubscribed(result.action === 'subscribed');
            }
        });
    }

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            title={subscribed ? 'Benachrichtigungen deaktivieren' : 'Benachrichtigungen aktivieren'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-50 border ${
                subscribed
                    ? 'bg-success/10 border-success/30 text-success hover:bg-error/10 hover:border-error/30 hover:text-error'
                    : 'bg-surface-hover border-border-hover text-text-secondary hover:bg-surface-hover/80 hover:text-text-primary'
            }`}
        >
            {subscribed ? <BellOff size={13} /> : <Bell size={13} />}
            {subscribed ? 'Abo' : 'Abonnieren'}
        </button>
    );
}
