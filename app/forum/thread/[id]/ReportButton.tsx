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
                className="flex items-center gap-1.5 py-2 px-2.5 rounded-lg text-text-disabled hover:text-error hover:bg-error/10 text-xs font-medium transition"
                title="Beitrag melden"
            >
                <Flag size={13} />
                <span className="hidden md:inline">Melden</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95">
                <button 
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
                >
                    <X size={20} />
                </button>

                {state.success ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={24} />
                        </div>
                        <h3 className="font-bold text-text-primary mb-2">Vielen Dank!</h3>
                        <p className="text-sm text-text-secondary">Wir werden den Beitrag prüfen.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-error/10 text-error rounded-full flex items-center justify-center">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-text-primary leading-tight">Melden</h3>
                                <p className="text-xs text-text-muted">Warum ist dieser Beitrag unangemessen?</p>
                            </div>
                        </div>

                        {state.error && (
                            <div className="bg-error/10 text-error text-xs p-3 rounded-lg mb-4 font-bold">
                                {typeof state.error === 'string' ? state.error : 'Fehler aufgetreten'}
                            </div>
                        )}

                        <form action={formAction} className="space-y-4">
                            <input type="hidden" name="targetId" value={targetId} />
                            <input type="hidden" name="targetType" value={targetType} />
                            
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm text-text-secondary p-2 rounded hover:bg-surface-hover cursor-pointer">
                                    <input type="radio" name="reason" value="spam" required className="accent-error" /> Spam / Werbung
                                </label>
                                <label className="flex items-center gap-2 text-sm text-text-secondary p-2 rounded hover:bg-surface-hover cursor-pointer">
                                    <input type="radio" name="reason" value="harassment" className="accent-error" /> Beleidigung / Mobbing
                                </label>
                                <label className="flex items-center gap-2 text-sm text-text-secondary p-2 rounded hover:bg-surface-hover cursor-pointer">
                                    <input type="radio" name="reason" value="nsfw" className="accent-error" /> Nacktheit / Gewalt
                                </label>
                                <label className="flex items-center gap-2 text-sm text-text-secondary p-2 rounded hover:bg-surface-hover cursor-pointer">
                                    <input type="radio" name="reason" value="other" className="accent-error" /> Sonstiges
                                </label>
                            </div>

                            <textarea 
                                name="details" 
                                placeholder="Details (optional)..."
                                className="w-full bg-background border border-border rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:border-border-hover min-h-[80px]"
                            />

                            <button 
                                type="submit" 
                                disabled={isPending}
                                className="w-full bg-error hover:bg-error/90 text-text-primary font-bold py-3 rounded-xl transition disabled:opacity-50"
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
