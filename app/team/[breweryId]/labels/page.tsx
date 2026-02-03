'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Tag, Trash2, Edit3, Check, RectangleVertical, RectangleHorizontal, Search, Crown, ChevronRight, Info, Lock, Palette, Infinity as InfinityIcon, Filter, Calendar, ArrowUpDown } from 'lucide-react';
import { LabelDesign } from '@/lib/types/label-system';
import { useRouter } from 'next/navigation';
import { getSmartLabelConfig, DEFAULT_FORMAT_ID, LABEL_FORMATS } from '@/lib/smart-labels-config';
import LabelCanvas from '@/app/components/label-editor/LabelCanvas';
import { getBreweryPremiumStatus } from '@/lib/actions/premium-actions';
import { PremiumStatus } from '@/lib/premium-config';
import CustomSelect from '@/app/components/CustomSelect';

// Default Template Factory
const createDefaultTemplate = (breweryId: string, formatId: string, orientation: 'p' | 'l'): Partial<LabelDesign> => {
    const format = LABEL_FORMATS[formatId] || LABEL_FORMATS[DEFAULT_FORMAT_ID];
    
    // Determine dimensions based on selected orientation
    let width = format.width;
    let height = format.height;

    // Normalize: max dim is usually "height" in portrait perception if we talk about paper, 
    // but here we talk about Label Dimensions.
    // If user says "Portrait", they mean Height > Width.
    // If user says "Landscape", they mean Width > Height.
    
    const maxDim = Math.max(format.width, format.height);
    const minDim = Math.min(format.width, format.height);

    if (orientation === 'l') {
        width = maxDim;
        height = minDim;
    } else {
        width = minDim;
        height = maxDim;
    }

    // Helper to get default layout based on dimensions
    const getLayout = (w: number, h: number) => {
        // 1. 37x70 Hochformat
        if (Math.abs(w - 37) < 1 && Math.abs(h - 70) < 1) return {
            logo: { x: 7.5, y: 5, w: 22, h: 5.5 },
            footer: { x: 5, y: 60.5, w: 27, h: 4.32 },
            qr: { x: 6, y: 11.8, w: 25, h: 25 }
        };
        // 2. 70x37 Querformat
        if (Math.abs(w - 70) < 1 && Math.abs(h - 37) < 1) return {
            logo: { x: 9.5, y: 5, w: 22, h: 5.5 },
            footer: { x: 6.8, y: 27.7, w: 27, h: 4.32 },
            qr: { x: 40, y: 6, w: 25, h: 25 }
        };
        // 3. 67,7x97 Hochformat
        if (Math.abs(w - 67.7) < 1 && Math.abs(h - 97) < 1) return {
            logo: { x: 18.9, y: 5, w: 30, h: 7.5 },
            footer: { x: 18.2, y: 87, w: 31.25, h: 5 },
            qr: { x: 16.4, y: 18.5, w: 35, h: 35 }
        };
        // 4. 97x67,7 Querformat
        if (Math.abs(w - 97) < 1 && Math.abs(h - 67.7) < 1) return {
            logo: { x: 55.2, y: 5, w: 30, h: 7.5 },
            footer: { x: 54.2, y: 57.7, w: 31.25, h: 5 },
            qr: { x: 52.2, y: 16.4, w: 35, h: 35 }
        };
        // 5. 57x105 Hochformat
        if (Math.abs(w - 57) < 1 && Math.abs(h - 105) < 1) return {
            logo: { x: 13.5, y: 5, w: 30, h: 7.5 },
            footer: { x: 12.9, y: 95, w: 31.25, h: 5 },
            qr: { x: 11, y: 17, w: 35, h: 35 }
        };
        // 6. 105x57 Querformat
        if (Math.abs(w - 105) < 1 && Math.abs(h - 57) < 1) return {
            logo: { x: 65, y: 5, w: 30, h: 7.5 },
            footer: { x: 64.3, y: 47, w: 31.25, h: 5 },
            qr: { x: 65, y: 13.5, w: 30, h: 30 }
        };
        // 7. 74x105 Hochformat
        if (Math.abs(w - 74) < 1 && Math.abs(h - 105) < 1) return {
            logo: { x: 22, y: 5, w: 30, h: 7.5 },
            footer: { x: 21.4, y: 95, w: 31.25, h: 5 },
            qr: { x: 19.5, y: 15, w: 35, h: 35 }
        };
        // 8. 105x74 Querformat
        if (Math.abs(w - 105) < 1 && Math.abs(h - 74) < 1) return {
            logo: { x: 62.5, y: 5, w: 30, h: 7.5 },
            footer: { x: 61.3, y: 64, w: 31.25, h: 5 },
            qr: { x: 60, y: 15, w: 35, h: 35 }
        };

        // Fallback
        return {
            logo: { x: (w - 30) / 2, y: 5, w: 30, h: 7.5 },
            footer: { x: (w - 31.25) / 2, y: h - 10, w: 31.25, h: 5 },
            qr: { x: (w - 30) / 2, y: (h - 30) / 2, w: 30, h: 30 }
        };
    };

    const layout = getLayout(width, height);

    return {
        breweryId,
        formatId: formatId,
        orientation: orientation, 
        width: width,
        height: height,
        background: { type: 'color', value: '#ffffff' },
        elements: [
            // Background Color (bottom-most) - locked
            {
                id: crypto.randomUUID(),
                type: 'shape',
                x: 0,
                y: 0,
                width: width,
                height: height,
                rotation: 0,
                zIndex: 0,
                content: '',
                style: {
                    fontFamily: 'Helvetica',
                    fontSize: 0,
                    fontWeight: 'normal',
                    color: '#000000',
                    textAlign: 'left',
                    backgroundColor: '#ffffff'
                },
                isLocked: false,
                isCanvasLocked: true,
                isDeletable: false,
                isVariable: false,
                name: 'Background Color'
            },
            // Background Image (above color) - locked, empty by default
            {
                id: crypto.randomUUID(),
                type: 'image',
                x: 0,
                y: 0,
                width: width,
                height: height,
                rotation: 0,
                zIndex: 1,
                content: '',
                style: {
                    fontFamily: 'Helvetica',
                    fontSize: 0,
                    fontWeight: 'normal',
                    color: '#000000',
                    textAlign: 'left'
                },
                isLocked: false,
                isCanvasLocked: true,
                isDeletable: false,
                isVariable: false,
                name: 'Background Image'
            },
            // Default Brand Logo
            {
                id: crypto.randomUUID(),
                type: 'brand-logo',
                x: layout.logo.x,
                y: layout.logo.y,
                width: layout.logo.w,
                height: layout.logo.h,
                rotation: 0,
                zIndex: 2,
                content: '',
                style: {
                    fontFamily: 'Helvetica',
                    fontSize: 0,
                    fontWeight: 'normal',
                    color: '#000000',
                    textAlign: 'center'
                },
                isLocked: false,
                isCanvasLocked: false,
                isDeletable: true,
                isVariable: true,
                name: 'brand-logo'
            },
            // Default Brand Footer
            {
                id: crypto.randomUUID(),
                type: 'brand-footer',
                x: layout.footer.x,
                y: layout.footer.y,
                width: layout.footer.w,
                height: layout.footer.h,
                rotation: 0,
                zIndex: 2,
                content: 'BotlLab | Digital Brew Lab\nbotllab.de',
                style: {
                    fontFamily: 'Helvetica',
                    fontSize: width < 40 ? 5 : 6,
                    fontWeight: 'normal',
                    color: '#666666',
                    textAlign: 'center'
                },
                isLocked: false,
                isCanvasLocked: false,
                isDeletable: true,
                isVariable: false,
                name: 'brand-footer'
            },
            {
                id: crypto.randomUUID(),
                type: 'qr-code',
                x: layout.qr.x,
                y: layout.qr.y,
                width: layout.qr.w,
                height: layout.qr.h,
                rotation: 0,
                zIndex: 2,
                content: '{{qr_code}}',
                style: {
                    fontFamily: 'Helvetica', // Not used for QR but required by type
                    fontSize: 0,
                    fontWeight: 'normal',
                    color: '#000000',
                    textAlign: 'center'
                },
                isLocked: false,
                isVariable: true
            }
        ],
        isDefault: false
    };
};

export default function LabelsPage({ params }: { params: Promise<{ breweryId: string }> }) {
    const { breweryId } = use(params);
    const router = useRouter();
    
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [forceOrientation, setForceOrientation] = useState<'p' | 'l'>('p');
    const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterFormat, setFilterFormat] = useState('ALL');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFormat = filterFormat === 'ALL' || t.format_id === filterFormat;
        return matchesSearch && matchesFormat;
    }).sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortOrder === 'name') return a.name.localeCompare(b.name);
        return 0;
    });

    useEffect(() => {
        loadTemplates();
        getBreweryPremiumStatus(breweryId).then(setPremiumStatus);
    }, [breweryId]);

    // Brewery Tier aus DB holen
    const [breweryTier, setBreweryTier] = useState('garage');
    useEffect(() => {
        async function fetchTier() {
            const { data: brewery } = await supabase
                .from('breweries')
                .select('tier')
                .eq('id', breweryId)
                .single();
            setBreweryTier(brewery?.tier || 'garage');
        }
        fetchTier();
    }, [breweryId]);
    const isFreeTier = premiumStatus?.tier === 'free';

    async function loadTemplates() {
        setLoading(true);
        const { data, error } = await supabase
            .from('label_templates')
            .select('*')
            .eq('brewery_id', breweryId)
            .order('created_at', { ascending: false });
        
        if (error) console.error(error);
        setTemplates(data || []);
        setLoading(false);
    }

    async function handleCreate(formatId: string) {
        setCreating(true);
        setShowFormatModal(false);
        try {
            // Use forced orientation if selected, otherwise undefined (will use format default)
            const defaultConfig = createDefaultTemplate(breweryId, formatId, forceOrientation);
            
            const { data, error } = await supabase
                .from('label_templates')
                .insert({
                    brewery_id: breweryId,
                    name: `Neues Design (${LABEL_FORMATS[formatId]?.name || 'Custom'})`,
                    format_id: formatId,
                    config: defaultConfig
                })
                .select()
                .single();

            if (error) throw error;
            
            // Redirect to editor
            router.push(`/team/${breweryId}/labels/editor/${data.id}`);

        } catch (e) {
            console.error(e);
            setCreating(false);
        }
    }

    async function handleDelete(id: string) {
        // Prevent deleting default template
        const template = templates.find(t => t.id === id);
        if (template && template.is_default) {
            alert("Das Standard-Etikett kann nicht gelöscht werden. Bitte setze zuerst ein anderes Design als Standard.");
            return;
        }

        if(!confirm("Möchtest du dieses Design wirklich löschen?")) return;
        
        const { error } = await supabase.from('label_templates').delete().eq('id', id);
        if(!error) {
            setTemplates(prev => prev.filter(t => t.id !== id));
        }
    }

    async function handleSetDefault(id: string) {
        // Transaction-like logic: unset all others, set this one
        // Supabase doesn't support easy bulk updates in client without RLS tricky
        // So we do it optimistic or via iterating if needed, but better:
        // Set all to false first? Or just set this one true and handle logic in retrieval?
        // Let's keep it simple: Just mark this as default. Ideally backend trigger ensures only one default.
        
        // Reset local state for UI feedback
        const newTemplates = templates.map(t => ({
            ...t,
            is_default: t.id === id
        }));
        setTemplates(newTemplates);

        // Reset others (Server side trigger would be better but we do it manually for now)
        await supabase.from('label_templates').update({ is_default: false }).eq('brewery_id', breweryId);
        await supabase.from('label_templates').update({ is_default: true }).eq('id', id);
    }

    if (loading) {
        return <div className="p-12 text-center text-zinc-500">Lade Designs...</div>;
    }

    // Limits & Progressbar: Dynamisch aus tier-system
    const { getBreweryTierConfig } = require('@/lib/tier-system');
    const tierConfig = getBreweryTierConfig(breweryTier);
    const LABEL_LIMIT = (premiumStatus?.tier === 'brewery' || premiumStatus?.tier === 'enterprise') ? Infinity : (tierConfig?.limits?.maxLabels ?? 1);
    const labelCount = templates.length;
    const limitReached = LABEL_LIMIT !== Infinity && labelCount >= LABEL_LIMIT;
    
    // Find default template
    const defaultTemplate = templates.find(t => t.is_default);

    return (
        <div className="space-y-12 pb-24">
                {/* HEADER SECTION */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-8">
                     <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-white tracking-tight">Etiketten Studio</h1>
                             {limitReached && (
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-amber-500 bg-amber-500/10 border border-amber-500/20">
                                    Limit erreicht
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-zinc-500">Verwalte deine Etiketten-Designs, dokumentiere Vorlagen und behalte den Überblick.</p>
                     </div>

                     <div className="flex items-center gap-4">
                         {limitReached ? (
                             <button 
                                disabled
                                className="px-4 py-2 rounded-lg font-bold text-sm bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-800 flex items-center gap-2"
                                title="Limit erreicht oder Upgrade nötig"
                            >
                                <Lock className="w-4 h-4 text-amber-500" />
                                <span>Neues Etikett</span>
                            </button>
                         ) : (
                             <button
                                onClick={() => setShowFormatModal(true)}
                                disabled={creating}
                                className="px-4 py-2 rounded-md font-bold text-sm bg-white hover:bg-zinc-200 text-black border border-transparent transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {creating ? <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full"/> : <Plus size={16} />}
                                <span>Neues Etikett</span>
                            </button>
                         )}

                         <div className="h-8 w-px bg-zinc-800 hidden md:block"></div>
                         <div className="text-right hidden md:block">
                            <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-0.5">Kapazität</p>
                            <div className="text-zinc-300 font-mono text-xs text-right flex items-center justify-end gap-2">
                                {(premiumStatus?.tier === 'brewer' || isFreeTier) ? (
                                    <>
                                        <span className={limitReached ? "text-amber-500" : ""}>{labelCount} / {LABEL_LIMIT}</span>
                                    </>
                                ) : (
                                    <span className="text-emerald-500"><InfinityIcon size={14} /></span>
                                )}
                            </div>
                         </div>
                     </div>
                </header>

                {/* MAIN LAYOUT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start relative">
                    
                    {/* LEFT COLUMN: Sidebar (Sticky) */}
                    <div className="space-y-6 lg:sticky lg:top-8 z-20">
                        {/* Templates Stats */}
                         <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div className="text-cyan-500 text-xs font-bold uppercase tracking-wider relative z-10">Vorlagen</div>
                            <div className="text-2xl font-mono font-bold text-cyan-400 relative z-10">{templates.length}</div>
                        </div>

                        {/* Sortieren - Sidebar */}
                        <div className="hidden lg:block md:bg-black border border-zinc-800 rounded-lg overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-zinc-400" />
                                    Sortieren
                                </h3>
                            </div>
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => setSortOrder('newest')}
                                    className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${sortOrder === 'newest' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Neueste zuerst
                                    </div>
                                    {sortOrder === 'newest' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                                </button>
                                <button
                                    onClick={() => setSortOrder('oldest')}
                                    className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${sortOrder === 'oldest' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Älteste zuerst
                                    </div>
                                    {sortOrder === 'oldest' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                                </button>
                                <button
                                    onClick={() => setSortOrder('name')}
                                    className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${sortOrder === 'name' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <ArrowUpDown className="w-3.5 h-3.5" />
                                        Name (A-Z)
                                    </div>
                                    {sortOrder === 'name' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                                </button>
                            </div>
                        </div>

                         {/* Filter - Sidebar */}
                        <div className="hidden lg:block md:bg-black border border-zinc-800 rounded-lg overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-zinc-400" />
                                    Formate
                                </h3>
                            </div>
                            <div className="p-2 space-y-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                <button
                                    onClick={() => setFilterFormat('ALL')}
                                    className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${filterFormat === 'ALL' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <RectangleVertical className="w-3.5 h-3.5" />
                                        Alle Formate
                                    </div>
                                    {filterFormat === 'ALL' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                                </button>
                                {Object.entries(LABEL_FORMATS).map(([id, fmt]) => (
                                    <button
                                        key={id}
                                        onClick={() => setFilterFormat(id)}
                                        className={`w-full flex items-center justify-between p-2.5 rounded text-xs font-bold transition-all ${filterFormat === id ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <div className="flex items-center gap-3 truncate">
                                            <RectangleHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="truncate">{fmt.name}</span>
                                        </div>
                                        {filterFormat === id && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Content */}
                    <div className="space-y-6">

                        {/* Toolbar */}
                        <div className="flex flex-col gap-4 bg-zinc-900/30 p-1 rounded-xl border border-zinc-800/50">
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <div className="relative group w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Design suchen..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-transparent text-sm text-white pl-9 pr-3 py-2 focus:outline-none placeholder:text-zinc-600 rounded-lg"
                                    />
                                </div>
                            </div>
                            
                             {/* Mobile Filters */}
                            <div className="grid grid-cols-2 gap-2 lg:hidden px-1 pb-1">
                                <CustomSelect
                                    value={sortOrder}
                                    onChange={(val: any) => setSortOrder(val)}
                                    options={[
                                        { value: 'newest', label: 'Neueste zuerst' },
                                        { value: 'oldest', label: 'Älteste zuerst' },
                                        { value: 'name', label: 'Name (A-Z)' }
                                    ]}
                                />
                                 <CustomSelect
                                    value={filterFormat}
                                    onChange={(val: any) => setFilterFormat(val)}
                                    options={[
                                        { value: 'ALL', label: 'Alle Formate' },
                                        ...Object.entries(LABEL_FORMATS).map(([id, fmt]) => ({
                                            value: id,
                                            label: fmt.name
                                        }))
                                    ]}
                                />
                            </div>
                        </div>

            {templates.length === 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center text-4xl mb-2">
                        <Palette className="w-10 h-10 text-cyan-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Noch keine Designs</h3>
                    <p className="text-zinc-500 max-w-sm">
                        Erstelle deine erste Vorlage, um beim nächsten Abfüllen Zeit zu sparen.
                    </p>
                    {isFreeTier ? (
                        <div className="mt-4 p-4 bg-zinc-950/80 rounded-xl border border-amber-900/30 max-w-sm">
                            <p className="text-amber-500 font-bold text-sm mb-1">Upgrade benötigt</p>
                            <p className="text-zinc-400 text-xs">
                                Im Free-Tier kannst du nur das Standard-Design nutzen. 
                                <Link href="/pricing" className="text-white hover:underline ml-1">Zum Upgrade →</Link>
                            </p>
                        </div>
                    ) : (
                        <button onClick={() => setShowFormatModal(true)} className="text-cyan-500 hover:underline font-bold mt-2">
                            Jetzt erstellen →
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {filteredTemplates.map(template => {
                        const config = template.config as LabelDesign;
                        // Determine scale to fit in a box (e.g. 200px width/height max)
                        // 1mm = approx 3.7795px
                        const MM_TO_PX = 3.7795;
                        const PREVIEW_SIZE = 180;
                        const pixelWidth = config.width * MM_TO_PX;
                        const pixelHeight = config.height * MM_TO_PX;
                        
                        const aspectRatio = config.width / config.height;
                        
                        // We want the final rendered size (in px) to fit within PREVIEW_SIZE
                        // scale = TargetSize / NativePixelSize
                        const scale = aspectRatio > 1 
                            ? PREVIEW_SIZE / pixelWidth 
                            : PREVIEW_SIZE / pixelHeight;

                        // Dimensions for the wrapper container
                        const containerWidth = pixelWidth * scale;
                        const containerHeight = pixelHeight * scale;

                        // Format name helper (e.g. "57 x 105 mm")
                        const formatName = `${config.width} x ${config.height} mm`;

                        return (
                            <div key={template.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-600 transition flex flex-col relative">
                                {/* Preview Area (Mini Canvas) */}
                                <div className="aspect-[4/3] bg-zinc-950 relative p-6 flex items-center justify-center overflow-hidden border-b border-zinc-800/50">
                                    <div 
                                        className="relative shadow-2xl origin-center transition-transform group-hover:scale-105 duration-500 pointer-events-none"
                                        style={{
                                            width: containerWidth,
                                            height: containerHeight,
                                        }}
                                    >
                                        <LabelCanvas 
                                            design={config}
                                            scale={scale}
                                            selectedId={null}
                                            onSelect={() => {}}
                                            onUpdate={() => {}}
                                        />
                                    </div>
                                    
                                    {template.is_default && (
                                        <div className="absolute top-3 right-3 bg-cyan-500 text-black text-[10px] font-black uppercase px-2 py-1 rounded shadow-md z-10">
                                            Standard
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="mb-4">
                                        <h3 className="font-bold text-white text-lg group-hover:text-cyan-400 transition truncate" title={template.name}>
                                            {template.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                                                {formatName}
                                            </span>
                                            <span className="text-[10px] text-zinc-600">
                                                {new Date(template.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto grid grid-cols-3 gap-2">
                                        <Link 
                                            href={`/team/${breweryId}/labels/editor/${template.id}`}
                                            className="col-span-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition"
                                        >
                                            <Edit3 size={14} /> Bearbeiten
                                        </Link>
                                        <div className="flex gap-2">
                                            {!template.is_default && (
                                                <button 
                                                    onClick={() => handleSetDefault(template.id)}
                                                    title="Als Standard setzen"
                                                    className="flex-1 bg-zinc-950 border border-zinc-800 hover:border-cyan-500 text-zinc-500 hover:text-cyan-500 rounded-lg flex items-center justify-center transition"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDelete(template.id)}
                                                disabled={template.is_default}
                                                title={template.is_default ? "Standard-Design kann nicht gelöscht werden" : "Löschen"}
                                                className={`flex-1 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center transition ${template.is_default ? 'text-zinc-700 cursor-not-allowed border-zinc-800/50' : 'hover:border-red-500 text-zinc-500 hover:text-red-500'}`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            </div>
            </div>

            {/* Format Selection Modal */}
            {showFormatModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setShowFormatModal(false)}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full relative overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        
                        {/* Decorative Background Element */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="mb-8 text-center relative z-10">
                            <h2 className="text-2xl font-black text-white mb-2">Format wählen</h2>
                            <p className="text-zinc-400">Welches Etiketten-Format möchtest du verwenden?</p>
                        </div>

                        {/* Orientation Toggle */}
                        <div className="relative z-10 grid grid-cols-2 gap-2 bg-zinc-950/50 p-1.5 rounded-xl border border-zinc-800/50 mb-8">
                            <button 
                                onClick={() => setForceOrientation('p')}
                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 ${
                                    forceOrientation === 'p' 
                                    ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10' 
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                                }`}
                            >
                                <RectangleVertical size={16} />
                                <span className="hidden sm:inline">Hochformat</span>
                                <span className="sm:hidden">Portrait</span>
                            </button>
                            <button 
                                onClick={() => setForceOrientation('l')}
                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 ${
                                    forceOrientation === 'l' 
                                    ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10' 
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                                }`}
                            >
                                <RectangleHorizontal size={16} />
                                <span className="hidden sm:inline">Querformat</span>
                                <span className="sm:hidden">Landscape</span>
                            </button>
                        </div>
                        
                        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1 customize-scrollbar">
                            {Object.values(LABEL_FORMATS).map((fmt) => {
                                // Calculate display dimensions based on selection
                                const maxD = Math.max(fmt.width, fmt.height);
                                const minD = Math.min(fmt.width, fmt.height);
                                const w = forceOrientation === 'l' ? maxD : minD;
                                const h = forceOrientation === 'l' ? minD : maxD;
                                
                                // Clean name for display by removing the ID and dimensions from string like "Standard (6137) - 57x105"
                                const displayName = fmt.name.split(' - ')[0] || fmt.name;

                                return (
                                    <button
                                        key={fmt.id}
                                        onClick={() => handleCreate(fmt.id)}
                                        disabled={creating}
                                        className="group relative flex flex-col p-5 bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-900/80 rounded-2xl transition-all duration-200 text-left"
                                    >
                                        <div className="flex justify-between items-start w-full mb-4">
                                            <div>
                                                <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">{displayName}</h3>
                                                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 mt-1 inline-block">ID: {fmt.id}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-zinc-300">{w} × {h} mm</div>
                                            </div>
                                        </div>

                                        <div className="mt-auto flex items-center justify-between text-xs text-zinc-500 group-hover:text-zinc-400">
                                            <div className="flex items-center gap-1.5">
                                                <Tag size={12} />
                                                {fmt.rows * fmt.cols} / Bogen
                                            </div>
                                            
                                            {/* Visual helper for orientation */}
                                            <div className="w-8 h-8 flex items-center justify-center opacity-30 group-hover:opacity-100 transition-opacity">
                                                <div 
                                                    className="border-2 border-current rounded-sm transition-all duration-300"
                                                    style={{
                                                        width: forceOrientation === 'l' ? '24px' : '14px',
                                                        height: forceOrientation === 'l' ? '14px' : '24px'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-8 flex justify-center relative z-10">
                            <button 
                                onClick={() => setShowFormatModal(false)}
                                className="px-6 py-2 text-zinc-500 hover:text-white text-sm font-bold transition-colors hover:bg-zinc-800 rounded-full"
                            >
                                Abbrechen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
