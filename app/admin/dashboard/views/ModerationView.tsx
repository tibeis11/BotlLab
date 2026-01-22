'use client';

import { useEffect, useState } from 'react';
import { getPendingItems, approveItem, rejectItem, type PendingItem } from '@/lib/actions/moderation-actions';
import { Check, X, AlertTriangle, ImageOff, ExternalLink } from 'lucide-react';
import Image from 'next/image';

export default function ModerationView() {
    const [queue, setQueue] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadQueue();
    }, []);

    async function loadQueue() {
        setLoading(true);
        try {
            const data = await getPendingItems();
            setQueue(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(item: PendingItem) {
        setProcessing(item.id);
        try {
            await approveItem(item.id, item.type);
            setQueue(prev => prev.filter(b => b.id !== item.id));
        } catch (err) {
            alert('Fehler beim Freigeben');
        } finally {
            setProcessing(null);
        }
    }

    async function handleRejectConfirm() {
        if (!selectedItem) return;
        setProcessing(selectedItem.id);
        setRejectModalOpen(false); // Close modal immediately for UX
        try {
            await rejectItem(selectedItem.id, selectedItem.type, rejectReason, selectedItem.image_url);
            setQueue(prev => prev.filter(b => b.id !== selectedItem.id));
        } catch (err) {
            alert('Fehler beim Ablehnen');
        } finally {
            setProcessing(null);
            setSelectedItem(null);
            setRejectReason('');
        }
    }

    function openRejectModal(item: PendingItem) {
        setSelectedItem(item);
        setRejectReason('Unangemessener Inhalt (NSFW / Gewalt)'); // Default
        setRejectModalOpen(true);
    }


    if (loading) {
        return <div className="p-8 text-center text-zinc-500 animate-pulse">Lade Warteschlange...</div>;
    }

    if (queue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-500 border border-zinc-800 border-dashed rounded-2xl h-64">
                <div className="text-4xl mb-4">✨</div>
                <h3 className="text-lg font-bold text-white">Alles erledigt!</h3>
                <p>Keine offenen Prüfungen in der Warteschlange.</p>
                <button 
                    onClick={loadQueue} 
                    className="mt-4 text-xs text-cyan-500 hover:text-cyan-400 underline"
                >
                    Neu laden
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    🛡️ Moderation Queue
                    <span className="bg-cyan-500/10 text-cyan-500 text-xs px-2 py-1 rounded-full">{queue.length}</span>
                </h2>
                <button onClick={loadQueue} className="text-sm text-zinc-400 hover:text-white">↻ Refresh</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {queue.map(item => (
                    <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col group hover:border-zinc-700 transition">
                        
                        {/* Image Preview Area */}
                        <div className="relative aspect-video bg-black flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
                             {/* Label / Logo */}
                             {item.image_url ? (
                                <div className={`relative ${item.cap_url ? 'w-1/2' : 'w-full'} h-full`}> 
                                    <Image 
                                        src={item.image_url} 
                                        alt="Label Check" 
                                        fill 
                                        className="object-contain p-2"
                                        unoptimized // Important for external storage urls
                                    />
                                    <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 text-[10px] text-white rounded">
                                        {item.type === 'brewery' ? 'Logo' : 'Label'}
                                    </div>
                                </div>
                             ) : (
                                <div className={`${item.cap_url ? 'w-1/2' : 'w-full'} h-full flex items-center justify-center text-zinc-700`}>
                                    <ImageOff size={24} />
                                </div>
                             )}

                             {/* Cap (Only for Brews) */}
                              {item.cap_url && (
                                <div className="relative w-1/2 h-full border-l border-zinc-800">
                                     {/* Simply display cap as image or component if complex */}
                                     {/* Assuming cap_url is image path or emoji */}
                                     {item.cap_url.startsWith('http') || item.cap_url.startsWith('/') ? (
                                         <Image 
                                         src={item.cap_url} 
                                         alt="Cap Check" 
                                         fill 
                                         className="object-contain p-4"
                                         unoptimized
                                     />
                                     ) : (
                                        <div className="flex items-center justify-center h-full text-4xl">
                                            {item.cap_url}
                                        </div>
                                     )}
                                     <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 text-[10px] text-white rounded">Cap</div>
                                </div>
                              )}
                        </div>

                        {/* Meta Data */}
                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-white truncate pr-2" title={item.name}>{item.name}</h3>
                                    <p className="text-xs text-zinc-400 flex items-center gap-1">
                                        {item.type === 'brewery' ? (
                                            <span className="text-purple-400">Brauerei Profil</span>
                                        ) : (
                                            <>
                                                by <span className="text-cyan-400">{item.brewery?.name || 'Unknown'}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <span className="text-[10px] text-zinc-600 font-mono">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="mt-auto pt-4 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => openRejectModal(item)}
                                    disabled={!!processing}
                                    className="px-4 py-2 bg-red-950/20 text-red-500 hover:bg-red-900/40 border border-red-900/30 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                                >
                                    <X size={16} /> Ablehnen
                                </button>
                                <button
                                    onClick={() => handleApprove(item)}
                                    disabled={!!processing}
                                    className="px-4 py-2 bg-emerald-950/20 text-emerald-500 hover:bg-emerald-900/40 border border-emerald-900/30 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                                >
                                    {processing === item.id ? (
                                        <span className="animate-spin">⏳</span>
                                    ) : (
                                        <Check size={16} />
                                    )}
                                    Freigeben
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Reject Modal */}
            {rejectModalOpen && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="text-red-500" />
                            Upload ablehnen
                        </h3>
                        <p className="text-sm text-zinc-400">
                            Das Bild wird <strong>unwiderruflich gelöscht</strong>. Welchen Grund soll der User erhalten?
                        </p>
                        
                        <div className="space-y-2">
                            <button onClick={() => setRejectReason('Urheberrechtsverletzung')} className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${rejectReason === 'Urheberrechtsverletzung' ? 'bg-red-500/10 border-red-500 text-white' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}>©️ Urheberrechtsverletzung (Copyright)</button>
                            <button onClick={() => setRejectReason('Unangemessener Inhalt (NSFW / Gewalt)')} className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${rejectReason === 'Unangemessener Inhalt (NSFW / Gewalt)' ? 'bg-red-500/10 border-red-500 text-white' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}>🔞 Unangemessener Inhalt (NSFW / Gewalt)</button>
                            <button onClick={() => setRejectReason('Qualität ungenügend / Spam')} className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${rejectReason === 'Qualität ungenügend / Spam' ? 'bg-red-500/10 border-red-500 text-white' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}>📉 Qualität ungenügend / Spam</button>
                            
                            <input 
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Anderer Grund..."
                                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white mt-2"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setRejectModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800">Abbrechen</button>
                            <button onClick={handleRejectConfirm} className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold">Löschen bestätigen</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
