'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Trash2, ShieldOff, Flag } from 'lucide-react';
import { getOpenReports, updateReportStatus, deleteReportedContent, type ReportItem } from '@/lib/actions/content-reporting-actions';
import { getContentPreviewForAdmin } from '@/lib/actions/analytics-admin-actions';
import Link from 'next/link';

// Component to fetch content preview via Server Action (Service Role) — no direct client SDK
function ContentPreview({ type, id }: { type: string, id: string }) {
    const [data, setData] = useState<{ name: string | null; img: string | null; link: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getContentPreviewForAdmin(type as any, id)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [type, id]);

    if (loading) return <span className="text-zinc-500 text-xs animate-pulse">Lade Inhalt...</span>;
    if (!data) return <span className="text-red-500 text-xs">Inhalt nicht gefunden (Evtl. gelöscht)</span>;

    const { name, img, link } = data;

    return (
        <a href={link} target="_blank" className="flex items-center gap-3 bg-zinc-900/50 hover:bg-zinc-800 p-2 rounded-lg border border-zinc-700/50 transition group">
            <div className="w-10 h-10 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                {img ? <img src={img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">?</div>}
            </div>
            <div className="min-w-0">
                <p className="font-bold text-sm text-zinc-200 truncate group-hover:text-cyan-400 max-w-[200px]">{name}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{type}</p>
            </div>
            <span className="ml-auto text-zinc-600 text-xs">↗</span>
        </a>
    );
}

export default function ReportsView() {
    const [reports, setReports] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadReports() {
        setLoading(true);
        try {
            const data = await getOpenReports();
            setReports(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadReports();
    }, []);

    async function handleStatus(reportId: string, status: 'resolved' | 'dismissed') {
        // Optimistic update
        setReports(prev => prev.filter(r => r.id !== reportId));
        try {
            await updateReportStatus(reportId, status);
        } catch (e) {
            alert('Fehler beim Aktualisieren: ' + e);
            loadReports(); // Revert on error
        }
    }

    async function handleDeleteContent(report: ReportItem) {
        if (!confirm(`WARNUNG: Bist du sicher, dass du diesen Inhalt (${report.target_type}) UNWIDERRUFLICH löschen willst?\n\nDies kann nicht rückgängig gemacht werden.`)) {
            return;
        }

        // Optimistic hide
        setReports(prev => prev.filter(r => r.id !== report.id));
        
        try {
            await deleteReportedContent(report.target_id, report.target_type, report.id);
        } catch(e: any) {
             alert('Fehler beim Löschen: ' + e.message);
             loadReports();
        }
    }

    if (loading) return <div className="p-12 text-center text-(--text-muted) animate-pulse">Lade Meldungen...</div>;

    if (reports.length === 0) {
        return (
            <div className="bg-(--surface) border border-(--border) rounded-3xl p-12 text-center">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-50 text-green-500 mx-auto" />
                <h2 className="text-xl font-bold text-(--text-primary) mb-2">Alles sauber!</h2>
                <p className="text-(--text-muted)">Es gibt aktuell keine offenen Meldungen.</p>
                <button 
                    onClick={loadReports}
                    className="mt-6 px-4 py-2 rounded-xl bg-(--surface-hover) hover:bg-(--border-hover) text-(--text-secondary) text-sm font-bold"
                >
                    Aktualisieren
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-(--text-primary)">Offene Meldungen ({reports.length})</h2>
                <button onClick={loadReports} className="text-(--text-muted) hover:text-(--text-primary) text-sm">⇻ Refresh</button>
            </div>

            <div className="grid gap-4">
                {reports.map((report) => (
                    <div key={report.id} className="bg-(--surface) border border-(--border) rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                        
                        {/* Status/Type Indicator */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-2">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg ${
                                report.reason === 'spam' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                report.reason === 'nsfw' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                'bg-(--surface-hover) text-(--text-secondary) border border-(--border-hover)'
                           }`}>
                                {report.reason === 'spam' ? <Trash2 className="w-5 h-5" /> : report.reason === 'nsfw' ? <ShieldOff className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
                           </div>
                        </div>

                        {/* Report Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">{report.reason}</span>
                                    <span className="text-(--text-disabled) text-[10px]">•</span>
                                    <div className="flex items-center gap-1.5 text-xs text-(--text-muted)">
                                        {report.reporter?.logo_url && (
                                            <img src={report.reporter.logo_url} className="w-4 h-4 rounded-full object-cover" />
                                        )}
                                        <span>von {report.reporter?.display_name || report.reporter?.email || 'Unbekannt'}</span>
                                    </div>
                                    <span className="text-(--text-disabled) text-[10px]">•</span>
                                    <span className="text-xs text-(--text-muted)">{new Date(report.created_at).toLocaleDateString()}</span>
                                </div>
                                {report.details && (
                                    <p className="text-(--text-secondary) text-sm bg-(--surface-sunken)/30 p-2 rounded-lg border border-(--border)/50 inline-block max-w-full">
                                        "{report.details}"
                                    </p>
                                )}
                            </div>
                            
                            {/* Content Preview */}
                             <div className="max-w-md">
                                <ContentPreview type={report.target_type} id={report.target_id} />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                            <button
                                onClick={() => handleDeleteContent(report)}
                                className="w-full md:w-auto px-4 py-2 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 text-red-500 text-xs font-bold transition flex items-center justify-center gap-2"
                                title="Inhalt endgültig löschen"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Löschen
                            </button>
                            <div className="h-4 w-px bg-(--border) hidden md:block mx-1"></div>
                            <button
                                onClick={() => handleStatus(report.id, 'dismissed')}
                                className="flex-1 md:flex-none px-4 py-2 rounded-lg border border-(--border-hover) text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary) text-xs font-bold transition"
                            >
                                Ignorieren
                            </button>
                            <button
                                onClick={() => handleStatus(report.id, 'resolved')}
                                className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-(--text-primary) text-xs font-bold transition shadow-lg shadow-green-900/20"
                            >
                                Erledigt
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
