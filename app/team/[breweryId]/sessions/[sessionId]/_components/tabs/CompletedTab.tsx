'use client';

import { useSession } from '../../SessionContext';
import { PhaseCard, PhaseTitle, PhaseDescription, InputField } from './PhaseLayout';
import { calculateABVFromSG } from '@/lib/brewing-calculations';
import { 
    Beer, 
    FileText, 
    Archive, 
    Star, 
    Trash2, 
    Edit2, 
    Check, 
    X,
    Printer,
    Download
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { BotlGuideTrigger } from '@/app/components/BotlGuideTrigger';
import { useRouter } from 'next/navigation';

function TastingNoteForm({ initialData, onSubmit, onCancel }: { initialData?: any, onSubmit: (data: any) => void, onCancel: () => void }) {
    const [rating, setRating] = useState(initialData?.rating || 3);
    const [srm, setSrm] = useState(initialData?.srm || 8);
    const [clarity, setClarity] = useState(initialData?.clarity || 'clear');
    const [head, setHead] = useState(initialData?.head || 'medium');
    const [carbonation, setCarbonation] = useState(initialData?.carbonation || 'medium');
    const [aroma, setAroma] = useState(initialData?.aroma || '');
    const [taste, setTaste] = useState(initialData?.taste || '');
    const [mouthfeel, setMouthfeel] = useState(initialData?.mouthfeel || '');
    const [comments, setComments] = useState(initialData?.comments || '');

    const handleSubmit = () => {
        onSubmit({
            rating,
            srm: Number(srm),
            clarity,
            head,
            carbonation,
            aroma,
            taste,
            mouthfeel,
            comments
        });
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6 animate-in slide-in-from-bottom-2">
            <h3 className="text-white font-bold flex items-center gap-2">
                <Beer className="w-4 h-4 text-amber-500" />
                Tasting Notiz erfassen
            </h3>

            {/* Rating & Color */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                     <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider">Gesamtbewertung</label>
                     <div className="flex gap-1">
                         {[1, 2, 3, 4, 5].map((star) => (
                             <button 
                                key={star}
                                onClick={() => setRating(star)}
                                className={`transition-transform hover:scale-110 ${star <= rating ? 'text-amber-400' : 'text-zinc-700'}`}
                             >
                                 <Star className="w-8 h-8" fill={star <= rating ? "currentColor" : "none"} strokeWidth={1.5} />
                             </button>
                         ))}
                     </div>
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider flex justify-between">
                        <span>Farbe (SRM: {srm})</span>
                        <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: getSrmColor(srm) }}></div>
                    </label>
                    <input 
                        type="range" 
                        min="1" 
                        max="40" 
                        value={srm} 
                        onChange={(e) => setSrm(Number(e.target.value))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-1">
                        <span>Pale</span>
                        <span>Amber</span>
                        <span>Brown</span>
                        <span>Black</span>
                    </div>
                </div>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider">Klarheit</label>
                    <div className="flex flex-wrap gap-2">
                        {['brilliant', 'clear', 'hazy', 'cloudy', 'opaque'].map(opt => (
                            <button
                                key={opt}
                                onClick={() => setClarity(opt)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${clarity === opt ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider">Schaum</label>
                    <div className="flex flex-wrap gap-2">
                        {['none', 'low', 'medium', 'high', 'persistent'].map(opt => (
                            <button
                                key={opt}
                                onClick={() => setHead(opt)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${head === opt ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider">Karbonisierung</label>
                    <div className="flex flex-wrap gap-2">
                        {['flat', 'low', 'medium', 'high'].map(opt => (
                            <button
                                key={opt}
                                onClick={() => setCarbonation(opt)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${carbonation === opt ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Text Inputs */}
            <div className="space-y-4">
                <InputField 
                    label="Aroma" 
                    placeholder="Fruchtig, malzig, zitrus..." 
                    value={aroma} 
                    onChange={(e) => setAroma(e.target.value)} 
                />
                <InputField 
                    label="Geschmack" 
                    placeholder="Bitterkeit, Körper, Abgang..." 
                    value={taste} 
                    onChange={(e) => setTaste(e.target.value)} 
                />
                <InputField 
                    label="Mundgefühl" 
                    placeholder="Vollmundig, wässrig, cremig..." 
                    value={mouthfeel} 
                    onChange={(e) => setMouthfeel(e.target.value)} 
                />
                <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider">Gesamt-Fazit</label>
                    <textarea 
                        className="w-full bg-black border border-zinc-800 rounded-md p-3 text-sm text-white focus:border-zinc-600 outline-none min-h-[80px]"
                        placeholder="Zusammenfassende Meinung..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button onClick={onCancel} className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors">Abbrechen</button>
                <button onClick={handleSubmit} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2">
                    <Check className="w-4 h-4" /> Speichern
                </button>
            </div>
        </div>
    );
}

// Helper to get hex color from SRM
const getSrmColor = (srm: number) => {
    const srmColors: Record<number, string> = {
        1: '#FFE699', 2: '#FFD878', 3: '#FFCA5A', 4: '#FFBF42', 5: '#FBB123',
        6: '#F8A600', 7: '#F39C00', 8: '#EA8F00', 9: '#E58500', 10: '#DE7C00',
        11: '#D77200', 12: '#CF6900', 13: '#CB6200', 14: '#C35900', 15: '#BB5100',
        16: '#B54C00', 17: '#B04500', 18: '#A63E00', 19: '#A13700', 20: '#9B3200',
        21: '#952D00', 22: '#8E2900', 23: '#882300', 24: '#821E00', 25: '#7B1A00',
        26: '#771900', 27: '#701400', 28: '#6A0E00', 29: '#660D00', 30: '#5E0B00',
        35: '#530B00', 40: '#470900' // Approximation for higher values
    };
    // Map to closest key or cap at 40
    const key = Math.min(40, Math.max(1, Math.round(srm)));
    return srmColors[key] || srmColors[30]; // Fallback
};

export function CompletedTab() {
    const { session, measurements, addEvent, removeEvent: deleteEvent, updateSessionData } = useSession();
    const router = useRouter();
    const [isEditingNote, setIsEditingNote] = useState(false);

    // Get Final Stats
    const stats = useMemo(() => {
        let og = session?.measured_og;
        if (!og && session?.timeline) {
            const ogEvent = session.timeline.find(e => e.type === 'MEASUREMENT_OG');
            if (ogEvent && (ogEvent as any).data?.gravity) og = (ogEvent as any).data.gravity;
        }

        const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
        const fg = latestMeasurement ? latestMeasurement.gravity : null;

        let abv = 0;
        let attenuation = 0;
        if (og && fg && og > 1 && fg <= og) {
            const helperAbv = calculateABVFromSG(og, fg);
            abv = parseFloat(helperAbv.toFixed(2));
            attenuation = parseFloat((((og - fg) / (og - 1)) * 100).toFixed(0));
        }

        return { og, fg, abv, attenuation };
    }, [session, measurements]);

    // Get existing Note
    const tastingNote = useMemo(() => {
        return session?.timeline?.find(e => e.type === 'TASTING_NOTE');
    }, [session?.timeline]);

    const handleSaveNote = async (data: any) => {
        if (tastingNote) {
            await deleteEvent(tastingNote.id); // Simple replace logic
        }
        await addEvent({
            type: 'TASTING_NOTE',
            title: `Tasting Notiz: ${data.rating}/5 Sterne`,
            description: data.comments?.substring(0, 50) + '...',
            data: data
        });
        setIsEditingNote(false);
    };

    const handleDeleteNote = async () => {
        if (tastingNote && confirm('Notiz wirklich löschen?')) {
            await deleteEvent(tastingNote.id);
        }
    };

    const handleArchive = async () => {
         if(confirm('Session ins Archiv verschieben? Sie erscheint nicht mehr in der Übersicht.')) {
            try {
                // Save final stats and mark as archived
                await updateSessionData({
                    status: 'ARCHIVED',
                    completed_at: new Date().toISOString(),
                    measured_abv: stats.abv,
                    apparent_attenuation: stats.attenuation
                } as any); 
                
                router.push(`/team/${session?.brewery_id}/sessions`);
            } catch (e) {
                console.error("Archiving failed", e);
                alert("Fehler beim Archivieren.");
            }
         }
    };

    const handleDownloadPDF = async () => {
         try {
             // Dynamic import to avoid SSR issues with jsPDF
             const pdfModule = await import('../../../../../../../lib/pdf-session-export');
             const generateSessionPDF = pdfModule.generateSessionPDF;
             
             if (!session) return;
             
             const reportData = {
                  breweryName: `Brewery #${session?.brewery_id?.substring(0,8)}`, // Fallback, normally fetch brewery name
                  sessionName: session?.brew?.name || 'Unbenannte Session',
                  date: new Date(session?.created_at ?? Date.now()).toLocaleDateString(),
                  batchCode: session?.batch_code || '-',
                  style: session?.brew?.style || 'Unbekannter Stil',
                  stats: {
                      og: stats.og,
                      fg: stats.fg,
                      abv: stats.abv,
                      ibu: session?.brew?.recipe_data?.ibu || 0
                  },
                  recipe: {
                      malts: session?.brew?.recipe_data?.malts || [],
                      hops: session?.brew?.recipe_data?.hops || [],
                      yeast: session?.brew?.recipe_data?.yeast?.name || session?.brew?.recipe_data?.yeast || '-'
                  },
                  timeline: session?.timeline || [],
                  tastingNote: tastingNote
             };
             
             generateSessionPDF(reportData as any);
         } catch (e) {
             console.error("PDF generation failed", e);
             alert("PDF Konnte nicht erstellt werden.");
         }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <PhaseTitle>Abgeschlossen</PhaseTitle>
            <PhaseDescription>Fasse deine Ergebnisse zusammen, bewerte das Bier und archiviere den Sud.</PhaseDescription>

            {/* Final Stats Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 <div className="md:bg-zinc-900 md:border md:border-zinc-800 md:p-4 md:rounded-lg py-2 px-1 border-b border-zinc-800 md:border-b-0">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Stammwürze (OG)</div>
                    <div className="text-xl font-mono font-bold text-white">{stats.og?.toFixed(3) || '—'}</div>
                 </div>
                 <div className="md:bg-zinc-900 md:border md:border-zinc-800 md:p-4 md:rounded-lg py-2 px-1 border-b border-zinc-800 md:border-b-0">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Restextrakt (FG)</div>
                    <div className="text-xl font-mono font-bold text-white">{stats.fg?.toFixed(3) || '—'}</div>
                 </div>
                 <div className="md:bg-zinc-900 md:border md:border-zinc-800 md:p-4 md:rounded-lg py-2 px-1 border-b border-zinc-800 md:border-b-0">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Alkohol (ABV)</div>
                    <div className="text-xl font-mono font-bold text-emerald-400">{stats.abv}%</div>
                 </div>
                 <div className="md:bg-zinc-900 md:border md:border-zinc-800 md:p-4 md:rounded-lg py-2 px-1 border-b border-zinc-800 md:border-b-0 md:last:border-0">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Vergärungsgrad</div>
                    <div className="text-xl font-mono font-bold text-cyan-400">{stats.attenuation}%</div>
                    <BotlGuideTrigger guideKey="effizienz.sudhausausbeute" />
                 </div>
            </div>

            {/* Tasting Notes */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-zinc-400" /> Tasting Report
                </h3>
                
                {isEditingNote ? (
                    <TastingNoteForm 
                        initialData={(tastingNote as any)?.data} 
                        onSubmit={handleSaveNote} 
                        onCancel={() => setIsEditingNote(false)} 
                    />
                ) : tastingNote ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="flex text-amber-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="w-4 h-4" fill={i < (tastingNote as any).data.rating ? "currentColor" : "none"} />
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-zinc-400">{(tastingNote as any).data.rating}/5</span>
                                </div>
                                <div className="text-xs text-zinc-500">Erfasst am {new Date(tastingNote.date).toLocaleDateString()}</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditingNote(true)} className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={handleDeleteNote} className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        {/* Body */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                 <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-4 tracking-wider">Profil</h4>
                                 <div className="space-y-4">
                                     <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                         <span className="text-sm text-zinc-400">Farbe</span>
                                         <div className="flex items-center gap-2">
                                             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getSrmColor((tastingNote as any).data.srm) }}></div>
                                             <span className="text-sm font-mono font-bold text-white">{(tastingNote as any).data.srm} SRM</span>
                                         </div>
                                     </div>
                                     <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                         <span className="text-sm text-zinc-400">Klarheit</span>
                                         <span className="text-sm font-bold text-white capitalize">{(tastingNote as any).data.clarity}</span>
                                     </div>
                                     <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                         <span className="text-sm text-zinc-400">Schaum</span>
                                         <span className="text-sm font-bold text-white capitalize">{(tastingNote as any).data.head}</span>
                                     </div>
                                     <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                         <span className="text-sm text-zinc-400">Karbonisierung</span>
                                         <span className="text-sm font-bold text-white capitalize">{(tastingNote as any).data.carbonation}</span>
                                     </div>
                                 </div>
                             </div>
                             <div>
                                 <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-4 tracking-wider">Notizen</h4>
                                 <div className="space-y-4">
                                     <div>
                                         <span className="text-xs font-bold text-zinc-600 block mb-1">Aroma</span>
                                         <p className="text-sm text-zinc-300">{(tastingNote as any).data.aroma || '—'}</p>
                                     </div>
                                     <div>
                                         <span className="text-xs font-bold text-zinc-600 block mb-1">Geschmack</span>
                                         <p className="text-sm text-zinc-300">{(tastingNote as any).data.taste || '—'}</p>
                                     </div>
                                     <div>
                                         <span className="text-xs font-bold text-zinc-600 block mb-1">Mundgefühl</span>
                                         <p className="text-sm text-zinc-300">{(tastingNote as any).data.mouthfeel || '—'}</p>
                                     </div>
                                     <div>
                                         <span className="text-xs font-bold text-zinc-600 block mb-1">Gesamt-Fazit</span>
                                         <p className="text-sm text-zinc-300 italic">"{(tastingNote as any).data.comments || '—'}"</p>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsEditingNote(true)}
                        className="w-full h-32 border border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 hover:bg-zinc-900/50 transition-all gap-2 group"
                    >
                        <div className="p-3 bg-zinc-900 rounded-full group-hover:bg-zinc-800 transition-colors">
                            <Beer className="w-5 h-5 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                        </div>
                        <span className="text-sm font-medium">Tasting Note hinzufügen</span>
                    </button>
                )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-zinc-900">
                <button 
                    onClick={handleDownloadPDF}
                    className="flex flex-col items-center justify-center p-6 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all group"
                >
                    <Download className="w-6 h-6 text-zinc-500 group-hover:text-cyan-400 mb-2 transition-colors" />
                    <span className="text-sm font-bold text-white">Logbuch exportieren (PDF)</span>
                    <span className="text-xs text-zinc-600 mt-1">Lade eine Zusammenfassung herunter</span>
                </button>

                <button 
                    onClick={handleArchive}
                    className="flex flex-col items-center justify-center p-6 bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900/50 rounded-lg transition-all group"
                >
                    <Archive className="w-6 h-6 text-zinc-500 group-hover:text-red-500 mb-2 transition-colors" />
                    <span className="text-sm font-bold text-white group-hover:text-red-400">Session archivieren</span>
                    <span className="text-xs text-zinc-600 mt-1 group-hover:text-red-500/50">Markiere diesen Sud als abgeschlossen</span>
                </button>
            </div>
        </div>
    );
}
