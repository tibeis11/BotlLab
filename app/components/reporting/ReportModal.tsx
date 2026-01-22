'use client';

import { useState } from 'react';
import { X, AlertTriangle, Flag } from 'lucide-react';
import { submitContentReport, type ReportTargetType, type ReportReason } from '@/lib/actions/content-reporting-actions';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetId: string;
    targetType: ReportTargetType;
}

const REASONS: { value: ReportReason; label: string }[] = [
    { value: 'spam', label: 'Spam oder Werbung' },
    { value: 'nsfw', label: 'Unangemessene Inhalte (NSFW / Gewalt)' },
    { value: 'harassment', label: 'Belästigung oder Hate Speech' },
    { value: 'copyright', label: 'Urheberrechtsverletzung' },
    { value: 'other', label: 'Sonstiges' }
];

export default function ReportModal({ isOpen, onClose, targetId, targetType }: ReportModalProps) {
    const [reason, setReason] = useState<ReportReason>('spam');
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    async function handleSubmit() {
        setSubmitting(true);
        try {
            await submitContentReport(targetId, targetType, reason, details);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setDetails('');
                setReason('spam');
            }, 2000);
        } catch (err) {
            alert('Fehler beim Senden der Meldung.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                
                {success ? (
                    <div className="p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-3xl border border-emerald-500/20">
                            ✓
                        </div>
                        <h3 className="text-xl font-bold text-white">Vielen Dank!</h3>
                        <p className="text-zinc-400">Wir haben deine Meldung erhalten und werden sie prüfen.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Flag size={20} className="text-red-500" />
                                Inhalt melden
                            </h3>
                            <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <label className="block text-xs font-bold uppercase text-zinc-500">Grund für die Meldung</label>
                                <div className="space-y-2">
                                    {REASONS.map((r) => (
                                        <button
                                            key={r.value}
                                            onClick={() => setReason(r.value)}
                                            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition flex items-center gap-3 ${
                                                reason === r.value 
                                                ? 'bg-red-500/10 border-red-500 text-white' 
                                                : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${reason === r.value ? 'border-red-500' : 'border-zinc-600'}`}>
                                                {reason === r.value && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                            </div>
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase text-zinc-500">Zusätzliche Infos (Optional)</label>
                                <textarea 
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Beschreibe das Problem genauer..."
                                    rows={3}
                                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none transition resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex gap-3">
                            <button 
                                onClick={onClose} 
                                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-bold text-sm"
                            >
                                Abbrechen
                            </button>
                            <button 
                                onClick={handleSubmit} 
                                disabled={submitting}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <span className="animate-spin">⏳</span> : 'Meldung absenden'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
