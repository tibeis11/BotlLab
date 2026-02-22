'use client';

import { useState, useEffect } from 'react';
import { getPendingAppeals, resolveAppeal, type AppealItem } from '@/lib/actions/appeal-actions';
import { Scale, CheckCircle, XCircle, Clock, User } from 'lucide-react';

const REASON_LABELS: Record<string, string> = {
    spam: 'Spam / Werbung',
    nsfw: 'NSFW / Gewalt',
    harassment: 'Beleidigung / Mobbing',
    copyright: 'Urheberrecht',
    other: 'Sonstiges',
};

const TYPE_LABELS: Record<string, string> = {
    forum_thread: 'Forum-Thread',
    forum_post: 'Forum-Beitrag',
    brew: 'Rezept',
    brewery: 'Brauerei',
    comment: 'Kommentar',
};

export default function AppealsView() {
    const [appeals, setAppeals] = useState<AppealItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [responding, setResponding] = useState<string | null>(null);
    const [responseText, setResponseText] = useState('');
    const [error, setError] = useState<string | null>(null);

    async function loadAppeals() {
        setLoading(true);
        try {
            const data = await getPendingAppeals();
            setAppeals(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAppeals();
    }, []);

    async function handleResolve(appealId: string, decision: 'accepted' | 'rejected') {
        if (!responseText.trim() || responseText.trim().length < 5) {
            setError('Bitte gib eine Begründung ein (min. 5 Zeichen). Gemäß DSA muss die Entscheidung begründet sein.');
            return;
        }
        setError(null);

        // Optimistic removal
        setAppeals(prev => prev.filter(a => a.id !== appealId));
        setResponding(null);
        setResponseText('');

        try {
            const result = await resolveAppeal(appealId, decision, responseText);
            if (result.error) {
                alert('Fehler: ' + result.error);
                loadAppeals();
            }
        } catch (e) {
            alert('Fehler beim Bearbeiten');
            loadAppeals();
        }
    }

    if (loading) {
        return <div className="p-12 text-center text-zinc-500 animate-pulse">Lade Widersprüche...</div>;
    }

    if (appeals.length === 0) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
                <div className="text-6xl mb-4 opacity-50">⚖️</div>
                <h2 className="text-xl font-bold text-white mb-2">Keine offenen Widersprüche</h2>
                <p className="text-zinc-500">Alle Widersprüche wurden bearbeitet.</p>
                <button
                    onClick={loadAppeals}
                    className="mt-6 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold"
                >
                    Aktualisieren
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Scale size={20} className="text-amber-400" />
                    Widersprüche (DSA Art. 20)
                    <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded-full">{appeals.length}</span>
                </h2>
                <button onClick={loadAppeals} className="text-zinc-500 hover:text-white text-sm">↻ Refresh</button>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                <strong>DSA-Hinweis:</strong> Gemäß Art. 20 DSA müssen Widersprüche zeitnah, nicht-diskriminierend und mit einer begründeten Entscheidung bearbeitet werden.
            </div>

            <div className="grid gap-4">
                {appeals.map((appeal) => (
                    <div key={appeal.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                                    {appeal.user?.logo_url ? (
                                        <img src={appeal.user.logo_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={14} className="text-zinc-500" />
                                    )}
                                </div>
                                <div>
                                    <span className="font-bold text-zinc-200 text-sm">{appeal.user?.display_name || 'Unbekannt'}</span>
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                        <Clock size={10} />
                                        <span>{new Date(appeal.created_at).toLocaleString('de-DE')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {TYPE_LABELS[appeal.target_type] || appeal.target_type}
                                </span>
                                {appeal.moderation_reason && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                        {REASON_LABELS[appeal.moderation_reason] || appeal.moderation_reason}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3">
                            {appeal.target_title && (
                                <div className="text-xs text-zinc-500">
                                    Betroffener Inhalt: <span className="text-zinc-300 font-medium">&quot;{appeal.target_title}&quot;</span>
                                </div>
                            )}

                            <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
                                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-600 mb-1">Begründung des Nutzers:</div>
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{appeal.appeal_text}</p>
                            </div>

                            {/* Response area */}
                            {responding === appeal.id ? (
                                <div className="space-y-3 pt-2">
                                    <textarea
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value)}
                                        placeholder="Begründung deiner Entscheidung (Pflicht gemäß DSA)..."
                                        rows={3}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-y"
                                    />
                                    {error && <p className="text-xs text-red-400">{error}</p>}
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => { setResponding(null); setResponseText(''); setError(null); }}
                                            className="px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white border border-zinc-700 rounded-lg transition"
                                        >
                                            Abbrechen
                                        </button>
                                        <button
                                            onClick={() => handleResolve(appeal.id, 'rejected')}
                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                                        >
                                            <XCircle size={13} /> Ablehnen
                                        </button>
                                        <button
                                            onClick={() => handleResolve(appeal.id, 'accepted')}
                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                                        >
                                            <CheckCircle size={13} /> Stattgeben
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => { setResponding(appeal.id); setResponseText(''); setError(null); }}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition"
                                    >
                                        <Scale size={13} /> Bearbeiten
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
