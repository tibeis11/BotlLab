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
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
        >
            {subscribed ? <BellOff size={13} /> : <Bell size={13} />}
            {subscribed ? 'Abo' : 'Abonnieren'}
        </button>
    );
}
