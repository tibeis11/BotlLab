'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { submitAppeal } from '@/lib/actions/appeal-actions';
import { Scale, Send, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const REASON_LABELS: Record<string, string> = {
    spam: 'Spam / Werbung',
    nsfw: 'NSFW / Gewalt',
    harassment: 'Beleidigung / Mobbing',
    copyright: 'Urheberrecht',
    other: 'Sonstiges',
};

function AppealForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const targetType = searchParams.get('type') || '';
    const targetTitle = searchParams.get('title') || '';
    const moderationReason = searchParams.get('reason') || '';
    const reportId = searchParams.get('reportId') || undefined;

    const [appealText, setAppealText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (appealText.trim().length < 10) {
            setError('Bitte beschreibe ausführlicher, warum du Widerspruch einlegst (min. 10 Zeichen).');
            return;
        }
        setError(null);
        setSubmitting(true);

        try {
            const result = await submitAppeal(targetType, targetTitle, moderationReason, appealText, reportId);
            if (result.error) {
                setError(result.error);
            } else {
                setSuccess(true);
            }
        } catch (e) {
            setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.');
        } finally {
            setSubmitting(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={32} />
                    </div>
                    <h1 className="text-2xl font-black mb-2">Widerspruch eingereicht</h1>
                    <p className="text-zinc-400 mb-6 text-sm">
                        Dein Widerspruch wurde erfolgreich eingereicht und wird von unserem Team geprüft. 
                        Du erhältst eine Benachrichtigung, sobald eine Entscheidung getroffen wurde.
                    </p>
                    <p className="text-xs text-zinc-600 mb-6">
                        Gemäß EU Digital Services Act (DSA) Art. 20 wird dein Widerspruch zeitnah und unparteiisch bearbeitet.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-block w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition text-center"
                    >
                        Zurück zum Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-8 transition">
                    <ArrowLeft size={16} /> Zurück zum Dashboard
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <Scale className="text-amber-400" size={24} />
                    <h1 className="text-2xl font-black">Widerspruch einlegen</h1>
                </div>
                <p className="text-zinc-400 text-sm mb-8">
                    Wenn du der Meinung bist, dass dein Inhalt zu Unrecht entfernt wurde, kannst du hier Widerspruch einlegen. 
                    Dein Widerspruch wird gemäß EU Digital Services Act (DSA Art. 20) von einem Moderator geprüft.
                </p>

                {/* Moderation summary */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 space-y-2">
                    <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-500">Moderationsentscheidung</h3>
                    {targetTitle && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-zinc-500">Inhalt:</span>
                            <span className="text-white font-medium">&quot;{targetTitle}&quot;</span>
                        </div>
                    )}
                    {moderationReason && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-zinc-500">Grund:</span>
                            <span className="text-amber-400">{REASON_LABELS[moderationReason] || moderationReason}</span>
                        </div>
                    )}
                </div>

                {/* Appeal form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="appeal-text" className="block text-sm font-bold text-zinc-300 mb-2">
                            Begründung deines Widerspruchs *
                        </label>
                        <textarea
                            id="appeal-text"
                            value={appealText}
                            onChange={(e) => setAppealText(e.target.value)}
                            placeholder="Erkläre, warum du denkst, dass die Moderationsentscheidung nicht gerechtfertigt war..."
                            rows={6}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-y"
                            maxLength={2000}
                        />
                        <div className="flex justify-between mt-1">
                            <p className="text-xs text-zinc-600">
                                {appealText.length < 10 ? `Min. 10 Zeichen (noch ${10 - appealText.length})` : '✓ Ausreichend'}
                            </p>
                            <p className="text-xs text-zinc-600">{appealText.length}/2000</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-500">
                        <strong>Hinweis:</strong> Du kannst maximal 5 Widersprüche pro Tag einlegen. 
                        Die Entscheidung über deinen Widerspruch wird dir per Benachrichtigung mitgeteilt.
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || appealText.trim().length < 10}
                        className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 rounded-xl transition"
                    >
                        {submitting ? (
                            <span className="animate-pulse">Wird eingereicht...</span>
                        ) : (
                            <>
                                <Send size={16} /> Widerspruch einreichen
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function AppealPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-pulse text-zinc-500">Lade...</div>
            </div>
        }>
            <AppealForm />
        </Suspense>
    );
}
