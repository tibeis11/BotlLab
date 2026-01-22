'use client';

import { useActionState, useState, useEffect } from 'react';
import { reportContent } from '@/lib/actions/forum-actions';
import { Flag, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ReportButtonProps {
    targetId: string;
    targetType: 'forum_thread' | 'forum_post';
}

const initialState = {
    message: '',
    success: false,
    error: undefined
}

export default function ReportButton({ targetId, targetType }: ReportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(reportContent, initialState);

    useEffect(() => {
        if (state.success) {
            const timer = setTimeout(() => setIsOpen(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [state.success]);

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="text-xs text-zinc-600 hover:text-rose-500 flex items-center gap-1 transition"
                 title="Beitrag melden"
            >
                <Flag size={12} /> <span className="hidden md:inline">Melden</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95">
                <button 
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                >
                    <X size={20} />
                </button>

                {state.success ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={24} />
                        </div>
                        <h3 className="font-bold text-white mb-2">Vielen Dank!</h3>
                        <p className="text-sm text-zinc-400">Wir werden den Beitrag prüfen.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white leading-tight">Melden</h3>
                                <p className="text-xs text-zinc-500">Warum ist dieser Beitrag unangemessen?</p>
                            </div>
                        </div>

                        {state.error && (
                            <div className="bg-rose-500/10 text-rose-400 text-xs p-3 rounded-lg mb-4 font-bold">
                                {typeof state.error === 'string' ? state.error : 'Fehler aufgetreten'}
                            </div>
                        )}

                        <form action={formAction} className="space-y-4">
                            <input type="hidden" name="targetId" value={targetId} />
                            <input type="hidden" name="targetType" value={targetType} />
                            
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm text-zinc-300 p-2 rounded hover:bg-zinc-800 cursor-pointer">
                                    <input type="radio" name="reason" value="spam" required className="accent-rose-500" /> Spam / Werbung
                                </label>
                                <label className="flex items-center gap-2 text-sm text-zinc-300 p-2 rounded hover:bg-zinc-800 cursor-pointer">
                                    <input type="radio" name="reason" value="harassment" className="accent-rose-500" /> Beleidigung / Mobbing
                                </label>
                                <label className="flex items-center gap-2 text-sm text-zinc-300 p-2 rounded hover:bg-zinc-800 cursor-pointer">
                                    <input type="radio" name="reason" value="nsfw" className="accent-rose-500" /> Nacktheit / Gewalt
                                </label>
                                <label className="flex items-center gap-2 text-sm text-zinc-300 p-2 rounded hover:bg-zinc-800 cursor-pointer">
                                    <input type="radio" name="reason" value="other" className="accent-rose-500" /> Sonstiges
                                </label>
                            </div>

                            <textarea 
                                name="details" 
                                placeholder="Details (optional)..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-zinc-700 min-h-[80px]"
                            />

                            <button 
                                type="submit" 
                                disabled={isPending}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                            >
                                {isPending ? 'Sende...' : 'Meldung absenden'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
