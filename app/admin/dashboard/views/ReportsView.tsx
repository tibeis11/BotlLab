'use client';

import { useState, useEffect } from 'react';
import { getOpenReports, updateReportStatus, deleteReportedContent, type ReportItem } from '@/lib/actions/content-reporting-actions';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Component to fetch and display small preview of the reported content
function ContentPreview({ type, id }: { type: string, id: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            let table = '';
            let select = 'id';

            if (type === 'brew') {
                table = 'brews';
                select = 'id, name, image_url';
            } else if (type === 'user') {
                table = 'profiles';
                select = 'id, display_name, logo_url';
            } else if (type === 'brewery') {
                table = 'breweries';
                select = 'id, name, logo_url';
            } else if (type === 'forum_thread') {
                table = 'forum_threads';
                select = 'id, title';
            } else if (type === 'forum_post') {
                table = 'forum_posts';
                select = 'id, content, thread_id';
            } else {
                setLoading(false);
                return;
            }

            const { data } = await supabase.from(table).select(select).eq('id', id).maybeSingle();
            setData(data);
            setLoading(false);
        }
        load();
    }, [type, id]);

    if (loading) return <span className="text-zinc-500 text-xs animate-pulse">Lade Inhalt...</span>;
    if (!data) return <span className="text-red-500 text-xs">Inhalt nicht gefunden (Evtl. gelöscht)</span>;

    const name = data.name || data.display_name || data.title || (data.content ? (data.content.substring(0, 30) + (data.content.length > 30 ? '...' : '')) : 'Unbekannt');
    const img = data.image_url || data.logo_url;
    
    let link = '#';
    if (type === 'brew') link = `/brew/${id}`;
    if (type === 'user') link = `/brewer/${id}`;
    if (type === 'brewery') link = `/brewery/${id}`;
    if (type === 'forum_thread') link = `/forum/thread/${id}`;
    if (type === 'forum_post') link = `/forum/thread/${data.thread_id}#post-${id}`;

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

    if (loading) return <div className="p-12 text-center text-zinc-500 animate-pulse">Lade Meldungen...</div>;

    if (reports.length === 0) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
                <div className="text-6xl mb-4 opacity-50">✅</div>
                <h2 className="text-xl font-bold text-white mb-2">Alles sauber!</h2>
                <p className="text-zinc-500">Es gibt aktuell keine offenen Meldungen.</p>
                <button 
                    onClick={loadReports}
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
                <h2 className="text-xl font-bold text-white">Offene Meldungen ({reports.length})</h2>
                <button onClick={loadReports} className="text-zinc-500 hover:text-white text-sm">↻ Refresh</button>
            </div>

            <div className="grid gap-4">
                {reports.map((report) => (
                    <div key={report.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                        
                        {/* Status/Type Indicator */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-2">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg ${
                                report.reason === 'spam' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                report.reason === 'nsfw' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                'bg-zinc-800 text-zinc-400 border border-zinc-700'
                           }`}>
                                {report.reason === 'spam' ? '🗑️' : report.reason === 'nsfw' ? '🔞' : '🚩'}
                           </div>
                        </div>

                        {/* Report Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{report.reason}</span>
                                    <span className="text-zinc-700 text-[10px]">•</span>
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                        {report.reporter?.logo_url && (
                                            <img src={report.reporter.logo_url} className="w-4 h-4 rounded-full object-cover" />
                                        )}
                                        <span>von {report.reporter?.display_name || report.reporter?.email || 'Unbekannt'}</span>
                                    </div>
                                    <span className="text-zinc-700 text-[10px]">•</span>
                                    <span className="text-xs text-zinc-500">{new Date(report.created_at).toLocaleDateString()}</span>
                                </div>
                                {report.details && (
                                    <p className="text-zinc-300 text-sm bg-black/30 p-2 rounded-lg border border-zinc-800/50 inline-block max-w-full">
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
                                🗑️ Löschen
                            </button>
                            <div className="h-4 w-px bg-zinc-800 hidden md:block mx-1"></div>
                            <button
                                onClick={() => handleStatus(report.id, 'dismissed')}
                                className="flex-1 md:flex-none px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white text-xs font-bold transition"
                            >
                                Ignorieren
                            </button>
                            <button
                                onClick={() => handleStatus(report.id, 'resolved')}
                                className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition shadow-lg shadow-green-900/20"
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
