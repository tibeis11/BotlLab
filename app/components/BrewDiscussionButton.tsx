'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { checkThreadForBrew } from '@/lib/actions/forum-actions';
import { MessageSquare, MessageCirclePlus } from 'lucide-react';

export default function BrewDiscussionButton({ brewId, brewName }: { brewId: string, brewName: string }) {
    const [threadId, setThreadId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkThreadForBrew(brewId).then(data => {
            if (data) setThreadId(data.id);
            setLoading(false);
        });
    }, [brewId]);

    if (loading) return null; // Or skeleton

    if (threadId) {
        return (
            <Link 
                href={`/forum/thread/${threadId}`}
                className="w-full bg-emerald-900/30 border border-emerald-500/30 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-100 rounded-2xl py-3 font-bold transition flex items-center justify-center gap-2 group mb-2"
            >
                <MessageSquare size={18} />
                <span>Diskussion ansehen</span>
            </Link>
        );
    }

    return (
        <Link 
            href={`/forum/create?categoryId=30f4a869-7953-48b4-8395-978051790928&brewId=${brewId}&title=Diskussion: ${encodeURIComponent(brewName)}`}
            className="w-full bg-zinc-900 border border-zinc-700/50 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-2xl py-3 font-bold transition flex items-center justify-center gap-2 group mb-2"
        >
             <MessageCirclePlus size={18} />
             <span>Rezept diskutieren</span>
        </Link>
    );
}
