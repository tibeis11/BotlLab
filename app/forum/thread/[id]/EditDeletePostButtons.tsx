'use client';

import { useRef, useState, useTransition } from 'react';
import { Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import { editPost, deletePost, editThread } from '@/lib/actions/forum-actions';
import { useRouter } from 'next/navigation';

interface EditDeletePostButtonsProps {
    targetId: string;
    targetType: 'post' | 'thread';
    initialContent: string;
    createdAt: string;
    /** If provided, the content display can be updated optimistically. */
    onContentUpdate?: (newContent: string) => void;
}

const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

export default function EditDeletePostButtons({
    targetId,
    targetType,
    initialContent,
    createdAt,
    onContentUpdate,
}: EditDeletePostButtonsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [mode, setMode] = useState<'idle' | 'editing' | 'confirming-delete'>('idle');
    const [editContent, setEditContent] = useState(initialContent);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isExpired = Date.now() - new Date(createdAt).getTime() > EDIT_WINDOW_MS;

    function openEdit() {
        setEditContent(initialContent);
        setError(null);
        setMode('editing');
        setTimeout(() => textareaRef.current?.focus(), 50);
    }

    function handleSave() {
        if (isPending) return;
        setError(null);
        startTransition(async () => {
            const action = targetType === 'post' ? editPost : editThread;
            const result = await action(targetId, editContent);
            if ('error' in result) {
                const msg = result.error;
                setError(typeof msg === 'string' ? msg : 'Fehler beim Speichern.');
            } else {
                onContentUpdate?.(editContent);
                setMode('idle');
                router.refresh();
            }
        });
    }

    function handleDelete() {
        if (isPending) return;
        setError(null);
        startTransition(async () => {
            const result = await deletePost(targetId);
            if ('error' in result) {
                const msg = result.error;
                setError(typeof msg === 'string' ? msg : 'Fehler beim Löschen.');
                setMode('idle');
            } else {
                setMode('idle');
                router.refresh();
            }
        });
    }

    if (mode === 'editing') {
        return (
            <div className="mt-3 space-y-2">
                <textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={5}
                    className="w-full bg-zinc-950/60 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 leading-relaxed"
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => setMode('idle')}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X size={12} /> Abbrechen
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isPending || editContent.trim().length < 2}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Speichern
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'confirming-delete') {
        return (
            <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs text-zinc-400">Beitrag wirklich löschen? Dies kann nicht rückgängig gemacht werden.</p>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => setMode('idle')}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X size={12} /> Abbrechen
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Löschen
                    </button>
                </div>
            </div>
        );
    }

    // idle
    return (
        <div className="flex gap-0.5">
            {!isExpired && (
                <button
                    onClick={openEdit}
                    title="Bearbeiten"
                    className="flex items-center gap-1.5 py-2 px-2.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 text-xs font-medium transition-colors"
                >
                    <Pencil size={13} />
                    <span className="hidden md:inline">Bearbeiten</span>
                </button>
            )}
            {targetType === 'post' && (
                <button
                    onClick={() => setMode('confirming-delete')}
                    title="Löschen"
                    className="flex items-center gap-1.5 py-2 px-2.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors"
                >
                    <Trash2 size={13} />
                    <span className="hidden md:inline">Löschen</span>
                </button>
            )}
        </div>
    );
}
