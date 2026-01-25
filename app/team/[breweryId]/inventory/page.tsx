'use client';

import { useEffect, useState, use, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode'; 
import { jsPDF } from 'jspdf'; 
import JSZip from 'jszip';
import Scanner from '@/app/components/Scanner';
import CustomSelect from '@/app/components/CustomSelect';
import { getBreweryTierConfig, type BreweryTierName } from '@/lib/tier-system';
import { checkAndGrantAchievements } from '@/lib/achievements';
import { useAchievementNotification } from '@/app/context/AchievementNotificationContext';
import { useAuth } from '@/app/context/AuthContext';
import { useNotification } from '@/app/context/NotificationContext';
import { generateSmartLabelPDF } from '@/lib/pdf-generator';
import { renderLabelToDataUrl } from '@/lib/label-renderer';
import { LABEL_FORMATS, DEFAULT_FORMAT_ID } from '@/lib/smart-labels-config';
import { getBreweryPremiumStatus } from '@/lib/actions/premium-actions';
import { type PremiumStatus } from '@/lib/premium-config';

const playBeep = (type: 'success' | 'error') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        }
    } catch(e) {
        console.warn("AudioContext error:", e);
    }
};

const BottleListItem = ({ 
    bottle, 
    isSelected, 
    onToggle, 
    onAssign, 
    onShowQr, 
    onDelete,
    openActionMenuId,
    setOpenActionMenuId
}: any) => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [swipedLeft, setSwipedLeft] = useState(false);
    const minSwipeDistance = 50;
    
    const onTouchStart = (e: any) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    }
    
    const onTouchMove = (e: any) => setTouchEnd(e.targetTouches[0].clientX);
    
    const onTouchEndHandler = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        
        if (isLeftSwipe) {
            setSwipedLeft(true);
            setTimeout(() => setSwipedLeft(false), 3000); // Reset after 3s
        }
        if (isRightSwipe) {
            if (swipedLeft) setSwipedLeft(false);
            else onToggle();
        }
    }

    return (
        <div 
            onTouchStart={onTouchStart} 
            onTouchMove={onTouchMove} 
            onTouchEnd={onTouchEndHandler}
            className={`relative ${openActionMenuId === bottle.id ? 'overflow-visible z-[100]' : 'overflow-hidden z-0'} rounded-2xl transition-all focus-within:z-10 focus-within:scale-[1.01] ${isSelected ? 'bg-cyan-500/10 shadow-[0_0_0_1px_rgba(6,182,212,0.3)]' : 'bg-zinc-900/40 hover:bg-zinc-900 hover:shadow-lg hover:scale-[1.01]'}`}
        >   
            {/* Swipe Backgrounds */}
            <div className={`absolute inset-0 z-0 bg-red-500/20 items-center justify-end pr-8 flex transition-opacity duration-300 pointer-events-none ${swipedLeft ? 'opacity-100' : 'opacity-0'}`}>
                <span className="font-bold text-red-500">Löschen?</span>
            </div>
            
            {/* Content Container */}
            <div 
                className={`relative z-10 flex items-center transition-transform duration-300 ${swipedLeft ? '-translate-x-24' : 'translate-x-0'}`}
                style={{ backgroundColor: swipedLeft ? 'transparent' : '' }}
            >
                <div className="hidden sm:block w-16 pl-4 sm:pl-8 pr-2 sm:pr-5 py-5 shrink-0">
                    <label className="relative flex items-center justify-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => onToggle()}
                            className="peer sr-only"
                        />
                        <div className="w-5 h-5 rounded-md border-2 border-zinc-700 bg-zinc-900 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all duration-200 flex items-center justify-center hover:border-zinc-500">
                            <svg className="w-3.5 h-3.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </label>
                </div>
                <div className="w-20 pl-4 sm:pl-0 sm:w-24 px-2 sm:px-5 py-5 font-black text-white text-xl tabular-nums tracking-tight shrink-0 flex flex-col justify-center">
                    <div><span className="text-zinc-600 mr-0.5">#</span>{bottle.bottle_number}</div>
                    {bottle.size_l && <div className="text-[10px] text-zinc-500 font-mono font-normal tracking-wide">{bottle.size_l}L</div>}
                </div>
                <div className="flex-1 px-2 sm:px-5 py-5 min-w-0">
                    {bottle.brews?.name ? (
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                bottle.brewing_sessions?.phase === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                                bottle.brewing_sessions?.phase === 'conditioning' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)] animate-pulse' :
                                bottle.brewing_sessions?.phase === 'fermenting' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]' :
                                bottle.brewing_sessions?.phase === 'brewing' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' :
                                'bg-zinc-500'
                            }`}></div>
                            <div className="font-bold text-white text-base truncate">
                                <div className="flex items-center gap-2">
                                    <span>{bottle.brews.name}</span>
                                    {/* Phase Badge Inline */}
                                    {bottle.brewing_sessions?.phase === 'conditioning' && (
                                            <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider text-amber-400 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-500/20">Reifung</span>
                                    )}
                                    {bottle.brewing_sessions?.phase === 'completed' && (
                                            <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-500/20">Fertig</span>
                                    )}
                                    {bottle.brewing_sessions?.phase === 'fermenting' && (
                                            <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-500/20">Gärung</span>
                                    )}
                                    {bottle.brewing_sessions?.phase === 'brewing' && (
                                            <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider text-orange-400 bg-orange-950/30 px-1.5 py-0.5 rounded border border-orange-500/20">Brautag</span>
                                    )}
                                </div>
                                {bottle.brewing_sessions?.batch_code && <div className="text-zinc-500 text-xs font-mono mt-0.5">Batch {bottle.brewing_sessions.batch_code}</div>}
                                {!bottle.brewing_sessions?.batch_code && bottle.brewing_sessions?.brewed_at && <div className="text-zinc-500 text-xs font-mono mt-0.5">Gebraut: {new Date(bottle.brewing_sessions.brewed_at).toLocaleDateString()}</div>}
                            </div>
                        </div>
                    ) : (
                    <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 shrink-0"></div>
                            <div className="font-bold text-zinc-600 text-base">Unbelegt</div>
                    </div>
                    )}
                </div>
                <div className="hidden lg:block w-32 px-5 py-5 shrink-0 text-right text-sm font-mono text-zinc-400">
                    {bottle.filled_at ? new Date(bottle.filled_at).toLocaleDateString() : '-'}
                </div>
                
                <div className="w-32 pr-4 sm:pr-8 pl-2 sm:pl-5 py-5 text-right shrink-0 relative">
                        {/* Desktop Actions */}
                        <div className="hidden lg:flex justify-end gap-2">
                            <button
                                onClick={() => onAssign(bottle)}
                                className="w-10 h-10 aspect-square flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-cyan-400 transition shadow-md border border-transparent hover:border-zinc-700"
                                title="Sud zuweisen"
                            >
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </button>
                            <button 
                                onClick={() => onShowQr(bottle)}
                                className="w-10 h-10 aspect-square flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition hover:text-cyan-400 shadow-md border border-transparent hover:border-zinc-700"
                                title="QR Code anzeigen"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                                </svg>
                            </button>
                        </div>
                        {/* Mobile Dropdown Menu */}
                        <div className="flex lg:hidden justify-end">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionMenuId(openActionMenuId === bottle.id ? null : bottle.id);
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                </svg>
                            </button>
                            {openActionMenuId === bottle.id && (
                                <>
                                    <div className="fixed inset-0 z-40 bg-black/20" onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(null); }} />
                                    <div className="absolute right-4 top-12 z-50 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                                            <button onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(null); onAssign(bottle); }} className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-white font-bold flex items-center gap-3"><span>🍺</span> Inhalt ändern</button>
                                            <button onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(null); onShowQr(bottle); }} className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-white font-bold flex items-center gap-3"><span>📱</span> QR Code</button>
                                            <div className="h-px bg-zinc-800 my-1"></div>
                                            <button onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(null); onDelete(bottle.id); }} className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-red-500 font-bold flex items-center gap-3"><span>🗑️</span> Löschen</button>
                                    </div>
                                </>
                            )}
                        </div>
                </div>
            </div>
            
             {/* Delete Action Behind Swipe */}
             {swipedLeft && (
                <button 
                    onClick={() => onDelete(bottle.id)}
                    className="absolute right-0 top-0 bottom-0 w-24 bg-red-500 text-white font-bold flex items-center justify-center z-20 animate-in slide-in-from-right"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            )}
        </div>
    )
}

export default function TeamInventoryPage({ params }: { params: Promise<{ breweryId: string }> }) {
	const { breweryId } = use(params);
	const { user, loading: authLoading } = useAuth();
	
	const [bottles, setBottles] = useState<any[]>([]);
	const [brews, setBrews] = useState<any[]>([]);
	const [sessions, setSessions] = useState<any[]>([]);
	const [amount, setAmount] = useState(10);
	const [bottleSize, setBottleSize] = useState<number>(0.5);
	const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'zip' | 'png'>('pdf');
    const [selectedLabelFormat, setSelectedLabelFormat] = useState<string>(DEFAULT_FORMAT_ID);
	const [isWorking, setIsWorking] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [breweryTier, setBreweryTier] = useState<BreweryTierName>('garage');
    const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
	const { showAchievement } = useAchievementNotification();
	const { showToast } = useNotification();

    // Load Label Preference
    useEffect(() => {
        const savedFormat = localStorage.getItem('botllab_label_format');
        if (savedFormat && LABEL_FORMATS[savedFormat]) {
            setSelectedLabelFormat(savedFormat);
        }
    }, []);

    const handleLabelFormatChange = (val: string) => {
        setSelectedLabelFormat(val);
        localStorage.setItem('botllab_label_format', val);
    };

	const [showScanner, setShowScanner] = useState(false);
	const [scanBrewId, setScanBrewId] = useState<string>(""); 
	const [scanFilledDate, setScanFilledDate] = useState<string>(new Date().toISOString().split('T')[0]);
	const [scanFeedback, setScanFeedback] = useState<{type: 'success' | 'error', msg: string, id: number} | null>(null);
	const [isProcessingScan, setIsProcessingScan] = useState(false);
	const [lastScannedId, setLastScannedId] = useState<string | null>(null);
    const [showFlash, setShowFlash] = useState<'success' | 'error' | null>(null);
    const lastScanTime = useRef<number>(0);

	const [viewQr, setViewQr] = useState<{ url: string, bottleNumber: number, id: string } | null>(null);
	const [assignTargetBottle, setAssignTargetBottle] = useState<any>(null);
	const [assignSessionId, setAssignSessionId] = useState<string>("");
	const [assignFilledDate, setAssignFilledDate] = useState<string>(new Date().toISOString().split('T')[0]);

	// Bulk Selection State
	const [selectedBottles, setSelectedBottles] = useState<Set<string>>(new Set());
	const [showBulkAssign, setShowBulkAssign] = useState(false);
	const [bulkAssignBrewId, setBulkAssignBrewId] = useState("");
	const [bulkAssignFilledDate, setBulkAssignFilledDate] = useState<string>(new Date().toISOString().split('T')[0]);
	
	const [filterText, setFilterText] = useState("");
	const [sortOption, setSortOption] = useState<"newest" | "oldest" | "number_asc" | "number_desc">("number_asc");
	const [filterStatus, setFilterStatus] = useState<"all" | "filled" | "empty">("all");
	const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
	
	// New Bottle Creation Modal State
	const [showCreateBottlesModal, setShowCreateBottlesModal] = useState(false);
	const [useCustomBranding, setUseCustomBranding] = useState(true);
	
	const router = useRouter();

	const [activeBrewery, setActiveBrewery] = useState<any>(null);

	useEffect(() => {
		setIsMounted(true);
		if (!authLoading) {
			if (!user) {
				router.push(`/login?redirect=/team/${breweryId}/inventory`);
			} else {
				loadData();
			}
		}
	}, [user, authLoading, breweryId]);

	async function loadData() {
		if (!user) return;

		// 1. Validate Brewery Access (Team Context)
		const { data: brewery, error } = await supabase
			.from('breweries')
			.select('*, brewery_members!inner(user_id)')
			.eq('id', breweryId)
			.eq('brewery_members.user_id', user.id) // Ensure user is a member
			.maybeSingle();

		if (error || !brewery) {
			console.error("Access denied or brewery not found");
			router.push('/dashboard'); 
			return;
		}

		setActiveBrewery(brewery);

		if (brewery) {
			// Get Brewery Tier
			setBreweryTier((brewery.tier as BreweryTierName) || 'garage');
            
            // Get Premium Status
            const status = await getBreweryPremiumStatus(brewery.id);
            setPremiumStatus(status);

			const { data: btl } = await supabase
				.from('bottles')
				.select('*, brews(name, style), brewing_sessions(id, brewed_at, batch_code, phase)')
				.eq('brewery_id', brewery.id)
				.order('created_at', { ascending: false });
			
			const { data: brw } = await supabase
				.from('brews')
				.select('id, name')
				.eq('brewery_id', brewery.id); 
				
			const { data: sess } = await supabase
				.from('brewing_sessions')
				.select('id, brew_id, brewed_at, batch_code, phase, brews(name)')
				.eq('brewery_id', brewery.id)
				.order('brewed_at', { ascending: false });
			
			if (btl) setBottles(btl);
			if (brw) setBrews(brw);
			if (sess) setSessions(sess);
		}
	}

	async function generateQRWithLogo(text: string) {
		try {
			const brand = (typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() : '') || '#06b6d4';

			const qrUrl = await QRCode.toDataURL(text, {
				errorCorrectionLevel: 'H',
				margin: 1,
				width: 500,
				color: { dark: '#000000', light: '#ffffff' }
			});

			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			const img = new Image();
      
			await new Promise((resolve) => {
				img.onload = resolve;
				img.src = qrUrl;
			});

			canvas.width = img.width;
			canvas.height = img.height;
			if (!ctx) return qrUrl;

			ctx.drawImage(img, 0, 0);

			const logoSize = img.width * 0.22;
			const center = img.width / 2;

			const boxSize = logoSize;
			const boxX = center - (boxSize / 2);
			const boxY = center - (boxSize / 2);
			const cornerRadius = 8;

			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.moveTo(boxX + cornerRadius, boxY);
			ctx.lineTo(boxX + boxSize - cornerRadius, boxY);
			ctx.quadraticCurveTo(boxX + boxSize, boxY, boxX + boxSize, boxY + cornerRadius);
			ctx.lineTo(boxX + boxSize, boxY + boxSize - cornerRadius);
			ctx.quadraticCurveTo(boxX + boxSize, boxY + boxSize, boxX + boxSize - cornerRadius, boxY + boxSize);
			ctx.lineTo(boxX + cornerRadius, boxY + boxSize);
			ctx.quadraticCurveTo(boxX, boxY + boxSize, boxX, boxY + boxSize - cornerRadius);
			ctx.lineTo(boxX, boxY + cornerRadius);
			ctx.quadraticCurveTo(boxX, boxY, boxX + cornerRadius, boxY);
			ctx.closePath();
			ctx.fill();

			const logoImg = new Image();
			logoImg.crossOrigin = 'anonymous';
      
			await new Promise((resolve, reject) => {
				logoImg.onload = resolve;
				logoImg.onerror = reject;
				logoImg.src = '/brand/logo.png';
			});

			const iconSize = logoSize * 0.7; 
			const iconX = center - (iconSize / 2);
			const iconY = center - (iconSize / 2);

			ctx.drawImage(logoImg, iconX, iconY, iconSize, iconSize);

			return canvas.toDataURL('image/png');
		} catch (e) {
			console.error("QR Gen Error", e);
			return await QRCode.toDataURL(text);
		}
	}

	async function generatePdfForBottles(bottlesList: any[], title: string) {
		try {
			const baseUrl = window.location.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://botllab.vercel.app';
            
            // Premium Branding - Fetch directly via client supabase
            let customSlogan: string | undefined;
            let customLogo: string | undefined;
            let breweryName: string | undefined;
            let isPremiumBranding = false;

            if (breweryId && useCustomBranding) {
                try {
                     // Fetch brewery data directly
                     const { data: breweryData } = await supabase
                        .from('breweries')
                        .select('name, logo_url, custom_slogan')
                        .eq('id', breweryId)
                        .single();
                     
                     if (breweryData) {
                         breweryName = breweryData.name;
                         customSlogan = breweryData.custom_slogan;
                         customLogo = breweryData.logo_url;
                         // Simple check: if they have custom values, assume premium
                         isPremiumBranding = !!(customSlogan || customLogo);
                     }
                } catch (e) {
                    console.warn("Branding fetch failed", e);
                }
            }

			// Using the new Smart Label System
			const doc = await generateSmartLabelPDF(bottlesList, { 
				baseUrl, 
				useHighResQR: true,
                formatId: selectedLabelFormat,
                customSlogan,
                customLogo,
                breweryName,
                isPremiumBranding
			});
			doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`);
			showToast("PDF erstellt", "Deine Smart Labels wurden erfolgreich generiert (A4 Landscape).", "success");
		} catch (e) {
			console.error("PDF Fail", e);
			showToast("Fehler", "PDF konnte nicht erstellt werden.", "warning");
		}
	}

	function downloadBlob(blob: Blob, fileName: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function generateZipForBottles(bottlesList: any[], title: string) {
		const zip = new JSZip();
		const folder = zip.folder(title.replace(/\s+/g, '_')) || zip;

		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botllab.vercel.app';

        // Fetch Premium Branding - Directly via client supabase
        let brOptions: { customSlogan?: string; customLogo?: string; breweryName?: string; isPremiumBranding?: boolean } | undefined;
        if (breweryId && useCustomBranding) {
             try {
                 // Fetch brewery data directly
                 const { data: breweryData } = await supabase
                    .from('breweries')
                    .select('name, logo_url, custom_slogan')
                    .eq('id', breweryId)
                    .single();
                 
                 if (breweryData) {
                     brOptions = {
                         breweryName: breweryData.name,
                         customSlogan: breweryData.custom_slogan,
                         customLogo: breweryData.logo_url,
                         isPremiumBranding: !!(breweryData.custom_slogan || breweryData.logo_url)
                     };
                 }
             } catch (e) {
                 console.warn("Branding fetch failed", e);
             }
        }

		for (const bottle of bottlesList) {
            try {
                // Use the new single label renderer
                const labelDataUrl = await renderLabelToDataUrl(bottle, selectedLabelFormat, baseUrl, brOptions);
                const base64Data = labelDataUrl.split(',')[1];
                folder.file(`Label_${bottle.bottle_number}.png`, base64Data, { base64: true });
            } catch (e) {
                console.error("Label Gen Error for ZIP", e);
                // Fallback to simple QR if complex render fails
                const scanUrl = `${baseUrl}/b/${bottle.id}`;
			    const qrDataUrl = await generateQRWithLogo(scanUrl);
			    const base64Data = qrDataUrl.split(',')[1];
			    folder.file(`QR_Fallback_${bottle.bottle_number}.png`, base64Data, { base64: true });
            }
		}

		const blob = await zip.generateAsync({ type: 'blob' });
		downloadBlob(blob, `BotlLab_Labels_${Date.now()}.zip`); // Updated filename
		showToast("ZIP erstellt", "Deine individuellen Etiketten wurden als ZIP heruntergeladen.", "success");
	}

	async function createBatchAndDownloadPDF() {
		if (amount <= 0 || amount > 100) {
			alert("Bitte eine Anzahl zwischen 1 und 100 wählen.");
			return;
		}

		const tierConfig = getBreweryTierConfig(breweryTier);
		const bypassed = premiumStatus?.features.bypassBottleLimits ?? false;

        if (!bypassed && (bottles.length + amount > tierConfig.limits.maxBottles)) {
            let errorMsg = `🔒 Limit erreicht!\n\n` +
				`Der Brauerei-Status "${tierConfig.displayName}" erlaubt maximal ${tierConfig.limits.maxBottles} Flaschen.\n` +
				`Aktuell: ${bottles.length}. Noch möglich: ${tierConfig.limits.maxBottles - bottles.length}.`;
            
            if (premiumStatus?.tier === 'brewer') {
                errorMsg += `\n\nHINWEIS: Dein 'Brewer'-Plan schaltet AI-Features frei, hebt aber keine Flaschen-Limits auf. Upgrade auf 'Brewery' nötig.`;
            } else {
                errorMsg += `\n\nUpgrade auf den 'Brewery' Plan für unbegrenzte Flaschen oder steigere dein Brauerei-Level.`;
            }
			
            alert(errorMsg);
			return;
		}

		setIsWorking(true);
		try {
			if (!user) return;

			// Aktuelle Max-Nummer holen
			const { data: maxResult } = await supabase
				.from('bottles')
				.select('bottle_number')
				.eq('brewery_id', activeBrewery?.id)
				.order('bottle_number', { ascending: false })
				.limit(1)
				.single();
			
			let currentNum = maxResult?.bottle_number || 0;

			const newRows = Array.from({ length: amount }).map(() => {
				currentNum++;
				return {
					brew_id: null,
					user_id: user?.id,
					brewery_id: activeBrewery?.id, 
					bottle_number: currentNum,
					size_l: bottleSize
				};
			});

			const { data: createdBottles, error } = await supabase
				.from('bottles')
				.insert(newRows)
				.select();

			if (error || !createdBottles) throw error;

			if (downloadFormat === 'pdf') {
				await generatePdfForBottles(createdBottles, "BotlLab QR-Code Batch");
			} else if (downloadFormat === 'zip') {
				await generateZipForBottles(createdBottles, "BotlLab Labels");
			}
      
			await loadData();
			
			// Achievements
			if (user?.id) {
				checkAndGrantAchievements(user.id).then(newAchievements => {
					newAchievements.forEach(achievement => showAchievement(achievement));
				}).catch(console.error);
			}

		} catch (err: any) {
			console.error(err);
			alert("Fehler: " + err.message);
		} finally {
			setIsWorking(false);
		}
	}

	// Bulk Actions Logic
	const toggleSelection = (id: string) => {
		const newSelection = new Set(selectedBottles);
		if (newSelection.has(id)) newSelection.delete(id);
		else newSelection.add(id);
		setSelectedBottles(newSelection);
	};

	const toggleAll = () => {
		if (selectedBottles.size === filteredBottles.length && filteredBottles.length > 0) {
			setSelectedBottles(new Set());
		} else {
			setSelectedBottles(new Set(filteredBottles.map(b => b.id)));
		}
	};

	async function renumberBottles() {
		if (!user || !activeBrewery) return;

		// 1. Alle Flaschen holen, sortiert nach aktueller Nummer (Brauerei)
		const { data: allBottles } = await supabase
			.from('bottles')
			.select('id')
			.eq('brewery_id', activeBrewery.id)
			.order('bottle_number', { ascending: true });

		if (!allBottles) return;

		// 2. Updates vorbereiten
		const updates = allBottles.map((b, index) => ({
			id: b.id,
			bottle_number: index + 1,
			brewery_id: activeBrewery.id
		}));

		const { error } = await supabase
			.from('bottles')
			.upsert(updates, { onConflict: 'id' });

		if (error) console.error("Renumber Error", error);
	}

	async function handleBulkDelete() {
		if (!confirm(`${selectedBottles.size} Flaschen wirklich löschen?`)) return;
		setIsWorking(true);
		try {
			const { error } = await supabase.from('bottles').delete().in('id', Array.from(selectedBottles));
			if (error) throw error;
			
			await renumberBottles();

			setSelectedBottles(new Set());
			loadData();
		} catch (e: any) {
			alert("Fehler: " + e.message);
		} finally {
			setIsWorking(false);
		}
	}

	async function handleBulkAssign() {
		setIsWorking(true);
		try {
			const sessionIdToSet = bulkAssignBrewId || null;
			let brewIdToSet = null;

			if (sessionIdToSet) {
				const s = sessions.find(sess => sess.id === sessionIdToSet);
				if (s) brewIdToSet = s.brew_id;
			}

			const updates: any = { 
				session_id: sessionIdToSet,
				brew_id: brewIdToSet 
			};

			if (sessionIdToSet) {
				updates.filled_at = bulkAssignFilledDate ? new Date(bulkAssignFilledDate).toISOString() : new Date().toISOString();
			} else {
				updates.filled_at = null;
			}

			const { error } = await supabase
				.from('bottles')
				.update(updates)
				.in('id', Array.from(selectedBottles));
			
			if (error) throw error;
			
			setShowBulkAssign(false);
			setSelectedBottles(new Set());
			loadData();
		} catch (e: any) {
			alert("Fehler: " + e.message);
		} finally {
			setIsWorking(false);
		}
	}

	async function handleBulkQrExport() {
		setIsWorking(true);
		try {
			const selectedData = bottles.filter(b => selectedBottles.has(b.id));
			await generatePdfForBottles(selectedData, "BotlLab Auswahl Export");
		} catch (e: any) {
			alert("Fehler: " + e.message);
		} finally {
			setIsWorking(false);
		}
	}

	async function handleScan(decodedText: string) {
        const now = Date.now();
        if (now - lastScanTime.current < 800) return; // 0.8s cooldown
		if (isProcessingScan) return;

		const idMatch = decodedText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
		if (!idMatch) {
            if (now - lastScanTime.current > 2000) {
                lastScanTime.current = now;
                playBeep('error');
			    setScanFeedback({ type: 'error', msg: "❌ Ungültiger Code", id: now });
            }
			return;
		}

		const bottleId = idMatch[0];

        // Prevent duplicate scan in UI
        if (scanFeedback?.type === 'success' && scanFeedback.msg.includes(bottleId)) return;

		setIsProcessingScan(true);
        lastScanTime.current = now;

		try {
            if (!user) throw new Error("Nicht eingeloggt");
            if (!activeBrewery) throw new Error("Brauerei noch nicht geladen");
            
			// Find Bottle locally first
			let existingBottle = bottles.find(b => b.id === bottleId);

			if (!existingBottle) {
				// If not loaded, check server
				const { data, error } = await supabase
					.from('bottles')
					.select('*')
					.eq('id', bottleId)
					.single();
				
				if (error || !data) {
                    playBeep('error');
                    setShowFlash('error');
					setScanFeedback({ type: 'error', msg: "❌ Flasche nicht gefunden", id: now });
					setIsProcessingScan(false);
					return;
				}
				existingBottle = data;
			}

			// Check Ownership
			if (existingBottle.brewery_id !== activeBrewery.id) {
                playBeep('error');
                setShowFlash('error');
				setScanFeedback({ type: 'error', msg: "⚠️ Flasche gehört anderer Brauerei", id: now });
				setIsProcessingScan(false);
				return;
			}

			// Determine target state
			let newSessionId: string | null = null;
			let newBrewId: string | null = null;
			
			if (scanBrewId && scanBrewId !== "EMPTY_ACTION") {
				// Find active session for brew
				const s = sessions.find(sess => sess.brew_id === scanBrewId && sess.status === 'active');
				newBrewId = scanBrewId;
				if (s) newSessionId = s.id;
			} else {
				// Emptying
				newSessionId = null;
				newBrewId = null;
			}
            
            // Check duplicate state (already in this state)
            if (existingBottle.brew_id === newBrewId && existingBottle.session_id === newSessionId) {
                 playBeep('error');
                 setShowFlash('error');
                 setScanFeedback({ type: 'error', msg: "ℹ️ Bereits erledigt", id: now });
                 setIsProcessingScan(false);
                 return;
            }

			// Get next bottle number if needed (not implemented here for speed, assuming existing keeps number)
			let nextNumber = existingBottle.bottle_number;

			const updatePayload: any = {
				session_id: newSessionId,
				brew_id: newBrewId,
				brewery_id: activeBrewery.id
			};

			if (newSessionId) {
				updatePayload.filled_at = scanFilledDate ? new Date(scanFilledDate).toISOString() : new Date().toISOString();
			} else {
				updatePayload.filled_at = null;
			}

			if (existingBottle && existingBottle.brewery_id !== activeBrewery.id) {
				updatePayload.bottle_number = nextNumber;
			}

			const { error } = await supabase
				.from('bottles')
				.update(updatePayload)
				.eq('id', bottleId);

			if (error) {
				console.error(error);
                playBeep('error');
                setShowFlash('error');
				setScanFeedback({ type: 'error', msg: "Fehler: " + error.message, id: now });
			} else {
				setLastScannedId(bottleId);
                playBeep('success');
                setShowFlash('success');
				
				if (newSessionId === null) {
					setScanFeedback({ type: 'success', msg: `✅ Flasche geleert`, id: now });
				} else {
					const bName = sessions.find(s => s.id === newSessionId)?.brews?.name || 'Sud';
					setScanFeedback({ type: 'success', msg: `✅ Zugewiesen an ${bName}`, id: now });
				}
				
				loadData();
				
				if (newBrewId) {
					checkAndGrantAchievements(user.id).then(newAchievements => {
						newAchievements.forEach(achievement => showAchievement(achievement));
					}).catch(console.error);
				}

				setTimeout(() => setLastScannedId(null), 1000); 
			}
		} catch (e: any) {
			console.error(e);
            playBeep('error');
			setScanFeedback({ type: 'error', msg: "Fehler: " + e.message, id: now });
		} finally {
            setTimeout(() => {
			    setIsProcessingScan(false);
                setShowFlash(null);
            }, 500);
		}
	}

	function openAssignModal(bottle: any) {
		setAssignTargetBottle(bottle);
		setAssignSessionId(bottle.session_id || "");
		const dateStr = bottle.filled_at ? new Date(bottle.filled_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
		setAssignFilledDate(dateStr);
	}

	async function updateBottleBrew(bottleId: string, sessionId: string, filledAtDate?: string) {
		let brewId = null;
		
		if (sessionId) {
			const s = sessions.find(sess => sess.id === sessionId);
			if (s) brewId = s.brew_id;
		}

		const updates: any = { 
			session_id: sessionId || null,
			brew_id: brewId 
		};

		if (sessionId) {
			// Set filled_at if provided, otherwise now
			updates.filled_at = filledAtDate ? new Date(filledAtDate).toISOString() : new Date().toISOString();
		} else {
			// Clear filled_at when emptying
			updates.filled_at = null;
		}

		const { error } = await supabase
			.from('bottles')
			.update(updates)
			.eq('id', bottleId);

		if (!error) loadData();
	}

	async function showQrModal(bottle: any) {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botllab.vercel.app';
		const scanUrl = `${baseUrl}/b/${bottle.id}`;
		const qrDataUrl = await generateQRWithLogo(scanUrl);
		setViewQr({ url: qrDataUrl, bottleNumber: bottle.bottle_number, id: bottle.id });
	}

    async function handleSingleDelete(id: string) {
        if(!confirm("Flasche wirklich löschen?\nAktion kann nicht rückgängig gemacht werden.")) return;
        setIsWorking(true);
        try {
            const { error } = await supabase.from('bottles').delete().eq('id', id);
            if (error) throw error;
            
            // Renumber if needed, currently we assume gaps are okay or addressed by bulk renumbering
            setSelectedBottles(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            loadData();
        } catch(e: any) {
            alert("Fehler: " + e.message);
        } finally {
            setIsWorking(false);
        }
    }

	const filteredBottles = bottles
		.filter(b => {
			const term = filterText.toLowerCase();
			const brewName = b.brews ? b.brews.name.toLowerCase() : "";
			const brewStyle = b.brews ? b.brews.style.toLowerCase() : "";
			const matchesSearch = term === "" || brewName.includes(term) || brewStyle.includes(term) || b.bottle_number.toString().includes(term);

			const matchesStatus = 
				filterStatus === "all" ? true :
				filterStatus === "filled" ? !!b.brew_id :
				!b.brew_id;

			return matchesSearch && matchesStatus;
		})
		.sort((a, b) => {
			if (sortOption === "newest") {
				return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
			}
			if (sortOption === "oldest") {
				return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
			}
			if (sortOption === "number_desc") {
				return Number(b.bottle_number) - Number(a.bottle_number);
			}
			if (sortOption === "number_asc") {
				return Number(a.bottle_number) - Number(b.bottle_number);
			}
			return 0;
		});

	const stats = {
		total: bottles.length,
		full: bottles.filter(b => b.brew_id).length,
		empty: bottles.filter(b => !b.brew_id).length
	};

	// Options for CustomSelects
	const scanOptions = [
		{ value: "EMPTY_ACTION", label: "Flasche leeren", icon: "🗑️" },
		...sessions.map(s => {
			const date = s.brewed_at ? new Date(s.brewed_at).toLocaleDateString() : 'Unbekannt';
			const name = s.brews?.name || 'Unbekannt';
			const code = s.batch_code ? ` #${s.batch_code}` : '';
            
            let phaseLabel = '';
            if (s.phase === 'planning') phaseLabel = ' [Geplant]';
            else if (s.phase === 'brewing') phaseLabel = ' [Am Brauen]';
            else if (s.phase === 'fermenting') phaseLabel = ' [Gärung]';
            else if (s.phase === 'conditioning') phaseLabel = ' [Reifung]';
            else if (s.phase === 'completed') phaseLabel = ' [Fertig]';

			return { 
				value: s.id, 
				label: `${name} (${date}${code})${phaseLabel}`, 
				icon: "🍺", 
				group: "Session (Sud)" 
			};
		})
	];

	const formatOptions = [
		{ value: "pdf", label: "PDF (Druckoptimiert)", icon: "📄" },
		{ value: "zip", label: "ZIP (Einzelne PNGs)", icon: "📦" }
	];

    const labelOptions = Object.values(LABEL_FORMATS).map(fmt => ({
        value: fmt.id,
        label: fmt.name, // e.g. "Standard (6137) - 57x105 (Landscape)"
        icon: "🏷️"
    }));

	const filterStatusOptions = [
		{ value: "all", label: "Alle Flaschen" },
		{ value: "filled", label: "Gefüllt" },
		{ value: "empty", label: "Leer" }
	];

	const sortOptions = [
		{ value: "number_asc", label: "Aufsteigend" },
		{ value: "number_desc", label: "Absteigend" },
		{ value: "newest", label: "Neueste" },
		{ value: "oldest", label: "Älteste" }
	];

	const brewOptions = [
		{ value: "", label: "(Leer)" },
		...sessions.map(s => {
			const date = s.brewed_at ? new Date(s.brewed_at).toLocaleDateString() : 'Unbekannt';
			const name = s.brews?.name || 'Unbekannt';
            
            let phaseLabel = '';
            if (s.phase === 'planning') phaseLabel = ' [Geplant]';
            else if (s.phase === 'brewing') phaseLabel = ' [Am Brauen]';
            else if (s.phase === 'fermenting') phaseLabel = ' [Gärung]';
            else if (s.phase === 'conditioning') phaseLabel = ' [Reifung]';
            else if (s.phase === 'completed') phaseLabel = ' [Fertig]';

			return { value: s.id, label: `${name} ${date}${phaseLabel}` };
		})
	];

    const tierConfig = getBreweryTierConfig(breweryTier);
    const bypassed = premiumStatus?.features.bypassBottleLimits ?? false;
    const limitReached = !bypassed && (stats.total >= tierConfig.limits.maxBottles);

	return (
		<div className="space-y-12 pb-32">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
        <div>
           <div className="flex items-center gap-2 mb-4">
              <span className="text-cyan-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-cyan-950/30 border border-cyan-500/20 shadow-sm shadow-cyan-900/20">
                  Inventar
              </span>
              {limitReached && (
                  <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-amber-950/30 border border-amber-500/20">
                    Limit erreicht
                  </span>
              )}
           </div>
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Flaschen & QR-Codes</h1>
           
           <div className="text-zinc-400 text-lg leading-relaxed max-w-xl space-y-4">
             <p>Verwalte deine Mehrwegflaschen im Team. Generiere Codes für neue Flaschen oder scanne bestehende, um sie einem Rezept zuzuordnen.</p>
             
             <div className="text-base font-bold rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 shadow-inner">
                {bypassed ? (
                   <span className="text-emerald-400 flex items-center gap-2">
                      <span className="text-xl">∞</span> 
                      <span>Unlimitierte Flaschen ({premiumStatus?.tier === 'enterprise' ? 'Enterprise' : 'Brewery'} Plan)</span>
                   </span>
                ) : (
                   <div className="space-y-3">
                       <div className="flex items-center justify-between text-zinc-400 text-sm">
                           <span>Auslastung ({tierConfig.displayName}):</span>
                           <span className={limitReached ? "text-amber-500" : "text-white"}>
                             {stats.total} / {tierConfig.limits.maxBottles}
                           </span>
                       </div>
                       
                       <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-zinc-800">
                          <div 
                             className={`h-full transition-all duration-500 ${limitReached ? 'bg-amber-500' : 'bg-cyan-500'}`} 
                             style={{ width: `${Math.min(100, (stats.total / tierConfig.limits.maxBottles) * 100)}%` }}
                          />
                       </div>

                       {premiumStatus?.tier === 'brewer' && (
                           <div className="text-xs font-normal text-blue-300 bg-blue-950/40 border border-blue-500/20 p-3 rounded-lg leading-relaxed">
                               <p><strong className="text-blue-200">Hinweis zum Abo:</strong> Dein 'Brewer'-Plan schaltet AI-Features frei, hebt aber keine Flaschen-Limits auf.</p>
                               <p className="mt-1 opacity-75">Für unbegrenzte Flaschen-Slots wähle den <strong>Brewery</strong> Plan.</p>
                           </div>
                       )}
                   </div>
                )}
             </div>
           </div>
        </div>
        
        <div className="lg:justify-self-end flex flex-wrap gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex flex-col min-w-[120px] flex-1 lg:flex-none shadow-lg">
                <span className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-1">Gesamt</span>
                <span className="text-4xl font-black text-cyan-500">{stats.total}</span>
            </div>
             <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex flex-col min-w-[120px] flex-1 lg:flex-none shadow-lg">
                <span className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-1">Gefüllt</span>
                <span className="text-4xl font-black text-emerald-400">{stats.full}</span>
            </div>
             <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex flex-col min-w-[120px] flex-1 lg:flex-none shadow-lg">
                <span className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-1">Leer</span>
                <span className="text-4xl font-black text-amber-200">{stats.empty}</span>
            </div>
        </div>
      </div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
				<div className="lg:col-span-4 space-y-6">
           
					 <div className={`relative group bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm rounded-3xl overflow-hidden transition-all duration-300 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-900/10 ${showScanner ? 'ring-1 ring-cyan-500/50 border-cyan-500/30' : ''}`}>
                            {/* Decorative gradient */}
                            <div className="absolute top-0 right-0 p-20 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none -mt-10 -mr-10"></div>

							<div className="p-6 relative z-10">
								 <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
										    <h3 className="text-lg font-black text-white tracking-tight">Scanner</h3>
                                        </div>
										<button 
											onClick={() => setShowScanner(!showScanner)} 
											className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border transition-all ${showScanner ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 hover:border-zinc-600'}`}
										>
											{showScanner ? 'Schließen' : 'Starten'}
										</button>
								 </div>
                 
								 {showScanner ? (
									 <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
											<div>
												<label className="text-[10px] font-bold uppercase text-cyan-500 tracking-widest block mb-2 px-1">Aktion wählen</label>
												<CustomSelect
													value={scanBrewId}
													onChange={setScanBrewId}
													options={scanOptions}
													placeholder="-- Bitte wählen --"
												/>
											</div>

											{scanBrewId && scanBrewId !== "EMPTY_ACTION" && (
												<div className="animate-in fade-in slide-in-from-top-1">
													<label className="text-[10px] font-bold uppercase text-cyan-500 tracking-widest block mb-2 px-1">Abgefüllt am</label>
													<input 
														type="date"
														value={scanFilledDate}
														onChange={(e) => setScanFilledDate(e.target.value)}
														className="w-full bg-black/40 border border-zinc-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all [color-scheme:dark]"
													/>
												</div>
											)}

											<div className="rounded-2xl overflow-hidden border-2 border-zinc-800 relative bg-black aspect-square shadow-inner">
												 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                                        <div className="flex flex-col items-center gap-2 opacity-30">
														    <span className="text-4xl animate-pulse">📷</span>
                                                            <span className="text-xs font-mono">Camera inactive</span>
                                                        </div>
												 </div>
												 <Scanner onScanSuccess={handleScan} />
                                                 {/* Visual Flash Overlay */}
                                                 {showFlash && (
                                                    <div className={`absolute inset-0 z-20 pointer-events-none animate-out fade-out duration-300 ${
                                                        showFlash === 'success' ? 'bg-emerald-500/50' : 'bg-red-500/50'
                                                    }`} />
                                                 )}
                                                 {/* Overlay Scanner Frame */}
                                                 <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none z-10 transition-colors duration-300">
                                                     <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl -mt-1 -ml-1 transition-colors duration-200 ${showFlash === 'success' ? 'border-emerald-400' : 'border-cyan-500'}`}></div>
                                                    <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl -mt-1 -mr-1 transition-colors duration-200 ${showFlash === 'success' ? 'border-emerald-400' : 'border-cyan-500'}`}></div>
                                                    <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl -mb-1 -ml-1 transition-colors duration-200 ${showFlash === 'success' ? 'border-emerald-400' : 'border-cyan-500'}`}></div>
                                                    <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl -mb-1 -mr-1 transition-colors duration-200 ${showFlash === 'success' ? 'border-emerald-400' : 'border-cyan-500'}`}></div>
                                                 </div>
											</div>

											{scanFeedback && (
												<div 
                                                    key={scanFeedback.id}
                                                    className={`p-4 rounded-xl text-xs font-bold text-center border shadow-lg animate-in zoom-in-95 slide-in-from-top-2 duration-300 ${scanFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/20' : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-900/20'}`}>
													 {scanFeedback.msg}
												</div>
											)}
									 </div>
								 ) : (
									 <p className="text-zinc-500 text-sm leading-relaxed px-1">
										 Verwende die Kamera deines Geräts, um Flaschencodes blitzschnell zu scannen und einem Rezept zuzuordnen.
									 </p>
								 )}
							</div>
					 </div>

					 <div className="relative group bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl hover:border-cyan-500/30 transition-all duration-300 cursor-pointer"
					      onClick={() => setShowCreateBottlesModal(true)}>
                             {/* Decorative gradient */}
                            <div className="absolute bottom-0 left-0 p-24 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none -mb-10 -ml-10"></div>
                            
                            <div className="relative z-10 text-center py-8">
                                <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-cyan-500/20 transition-colors">
                                    <span className="text-3xl">🏷️</span>
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight mb-2">Neue Flaschen</h3>
                                <p className="text-sm text-zinc-400 mb-4">Etiketten erstellen & drucken</p>
                                
                                <div className="inline-flex items-center gap-2 text-cyan-400 text-sm font-bold">
                                    <span>Konfigurieren</span>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
					 </div>
				</div>

				<div className="lg:col-span-8 flex flex-col gap-6">
           
					{/* Search & Filter Bar */}
                    <div className="relative z-30 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-3 rounded-3xl flex flex-col xl:flex-row gap-3 shadow-xl">
                        {/* Search Input */}
                        <div className="flex-1 relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-zinc-500 group-focus-within:text-cyan-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Flaschen suchen (Nr, Inhalt)..." 
                                value={filterText}
                                onChange={e => setFilterText(e.target.value)}
                                suppressHydrationWarning
                                className="block w-full pl-11 pr-4 py-3 bg-zinc-950 border-2 border-transparent focus:border-cyan-500 rounded-2xl text-sm font-bold text-white placeholder-zinc-600 focus:ring-0 transition-all outline-none"
                            />
                        </div>
                        
                        {/* Filters */}
                        <div className="flex gap-2 min-w-[300px]">
                           <div className="flex-1">
                                <CustomSelect
                                    value={filterStatus}
                                    onChange={(v) => setFilterStatus(v as any)}
                                    options={filterStatusOptions}
                                />
                           </div>
                           <div className="flex-1">
                                <CustomSelect
                                    value={sortOption}
                                    onChange={(v) => setSortOption(v as any)}
                                    options={sortOptions}
                                />
                           </div>
                        </div>
                    </div>
           
					 <div className="bg-transparent rounded-3xl overflow-hidden flex-1 min-h-[500px]">
							<div className="overflow-x-auto p-1">
								{/* Header */}
								<div className="flex items-center text-zinc-500 text-xs uppercase font-bold tracking-wider mb-2">
									<div className="hidden sm:block w-16 pl-4 sm:pl-8 pr-2 sm:pr-5 py-3 shrink-0">
										<label className="relative flex items-center justify-center cursor-pointer group">
											<input 
												type="checkbox" 
												checked={filteredBottles.length > 0 && selectedBottles.size === filteredBottles.length}
												onChange={toggleAll}
												className="peer sr-only"
											/>
											<div className="w-5 h-5 rounded-md border-2 border-zinc-700 bg-zinc-900 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all duration-200 flex items-center justify-center group-hover:border-zinc-500">
												<svg className="w-3.5 h-3.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
													<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											</div>
										</label>
									</div>
									<div className="w-20 pl-4 sm:pl-0 sm:w-24 px-2 sm:px-5 py-3 shrink-0">Nr.</div>
									<div className="flex-1 px-2 sm:px-5 py-3">Inhalt / Status</div>
									<div className="hidden lg:block w-32 px-5 py-3 shrink-0 text-right">Abgefüllt</div>
									<div className="w-32 pr-4 sm:pr-8 pl-2 sm:pl-5 py-3 text-right shrink-0">Aktionen</div>
								</div>

								{/* Body */}
								<div className="space-y-2">
									{filteredBottles.map((bottle) => (
                                        <BottleListItem 
                                            key={bottle.id}
                                            bottle={bottle}
                                            isSelected={selectedBottles.has(bottle.id)}
                                            onToggle={() => toggleSelection(bottle.id)}
                                            onAssign={openAssignModal}
                                            onShowQr={showQrModal}
                                            onDelete={handleSingleDelete}
                                            openActionMenuId={openActionMenuId}
                                            setOpenActionMenuId={setOpenActionMenuId}
                                        />
									))}
			
									{filteredBottles.length === 0 && (
										<div className="p-16 text-center">
												<div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
													<div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-md border border-zinc-800">
														<span className="text-4xl opacity-50 grayscale">🍶</span>
													</div>
													<h3 className="text-2xl font-black text-white mb-2">Keine Flaschen gefunden</h3>
													<p className="text-zinc-500 text-base max-w-sm mx-auto mb-8">
														Wir konnten keine Flaschen finden, die deinen aktuellen Filtern entsprechen.
													</p>
													<button 
														onClick={() => {
															setAmount(10);
															window.scrollTo({ top: 0, behavior: 'smooth' });
														}}
														className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition flex items-center gap-2 border border-zinc-700 hover:border-zinc-600"
													>
														<span>📦</span> Neue Flaschen erstellen
													</button>
												</div>
										</div>
									)}
								</div>
							</div>
					 </div>

				</div>
			</div>

			{viewQr && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewQr(null)}>
					<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
						<h3 className="text-lg font-bold mb-4">QR-Code für Flasche #{viewQr.bottleNumber}</h3>
						<div className="bg-white p-4 rounded-xl">
							<img src={viewQr.url} alt="QR Code" className="w-full" />
						</div>
						<p className="text-xs text-zinc-500 mt-3 overflow-hidden text-ellipsis whitespace-nowrap">
							Link: <a href={`${window.location.origin}/b/${viewQr.id}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline hover:text-cyan-300 transition-colors">{window.location.origin}/b/{viewQr.id}</a>
						</p>
					</div>
				</div>
			)}

			{/* Bulk Action Bar */}
			{selectedBottles.size > 0 && (
				<div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between z-40 animate-in slide-in-from-bottom shadow-2xl">
					<div className="flex items-center gap-4">
						<div className="bg-cyan-500 text-black font-bold px-3 py-1 rounded-full text-xs">
							{selectedBottles.size} ausgewählt
						</div>
						<div className="hidden sm:block text-xs text-zinc-400">
							Aktionen für Auswahl:
						</div>
					</div>
					<div className="flex gap-2">
						<button 
							onClick={() => setShowBulkAssign(true)}
							disabled={isWorking}
							className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-2"
						>
							<span>🍺</span> <span className="hidden sm:inline">Zuweisen</span>
						</button>
						<button 
							onClick={handleBulkQrExport}
							disabled={isWorking}
							className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-2"
						>
							<span>🖨️</span> <span className="hidden sm:inline">Codes</span>
						</button>
						<button 
							onClick={handleBulkDelete}
							disabled={isWorking}
							className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-bold transition flex items-center gap-2"
						>
							<span>🗑️</span> <span className="hidden sm:inline">Löschen</span>
						</button>
					</div>
				</div>
			)}

			{/* Bulk Assign Modal */}
			{showBulkAssign && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowBulkAssign(false)}>
					<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
						<button className="absolute top-3 right-3 text-zinc-500 hover:text-white" onClick={() => setShowBulkAssign(false)}>✖</button>
						<h3 className="text-lg font-bold mb-4">Massen-Zuweisung</h3>
						<p className="text-sm text-zinc-400 mb-4">Wähle ein Rezept für die {selectedBottles.size} ausgewählten Flaschen.</p>
						
						<div className="space-y-4 mb-6">
							<div>
								<label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block mb-1">Inhalt</label>
								<CustomSelect 
									value={bulkAssignBrewId}
									onChange={setBulkAssignBrewId}
									options={brewOptions}
								/>
							</div>
							
							{bulkAssignBrewId && (
								<div className="animate-in fade-in slide-in-from-top-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block mb-1">Abgefüllt am</label>
                                    <input 
                                        type="date" 
                                        value={bulkAssignFilledDate}
                                        onChange={(e) => setBulkAssignFilledDate(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500 transition font-mono"
                                    />
                                </div>
							)}
						</div>

						<div className="flex gap-3">
							<button 
								onClick={() => setShowBulkAssign(false)}
								className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-sm"
							>
								Abbrechen
							</button>
							<button 
								onClick={handleBulkAssign}
								disabled={isWorking}
								className="flex-1 py-3 bg-cyan-500 hover:brightness-110 text-black rounded-xl font-bold text-sm"
							>
								{isWorking ? 'Speichere...' : 'Anwenden'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Single Assign Modal */}
			{assignTargetBottle && (
				<div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
                    onClick={() => setAssignTargetBottle(null)}
                >
					<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
						<h3 className="text-lg font-bold mb-4">Sud zuweisen</h3>
						<p className="text-sm text-zinc-400 mb-4">
                            Wähle den Inhalt für Flasche <span className="text-white font-mono">#{assignTargetBottle.bottle_number}</span>.
                        </p>
						
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block mb-1">Inhalt</label>
                                <CustomSelect 
                                    value={assignSessionId}
                                    onChange={setAssignSessionId}
                                    options={brewOptions}
                                    placeholder="-- Leer / Unbekannt --"
                                />
                            </div>

                            {assignSessionId && (
                                <div className="animate-in fade-in slide-in-from-top-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block mb-1">Abgefüllt am</label>
                                    <input 
                                        type="date" 
                                        value={assignFilledDate}
                                        onChange={(e) => setAssignFilledDate(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500 transition font-mono"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                onClick={() => setAssignTargetBottle(null)}
                                className="py-2 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-sm text-zinc-300"
                            >
                                Abbrechen
                            </button>
                             <button 
                                onClick={() => {
                                    updateBottleBrew(assignTargetBottle.id, assignSessionId, assignFilledDate);
                                    setAssignTargetBottle(null);
                                }}
                                className="py-2 px-6 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold text-sm shadow-lg shadow-cyan-900/20"
                            >
                                Speichern
                            </button>
                        </div>
					</div>
				</div>
			)}

			{/* Create Bottles Modal */}
			{showCreateBottlesModal && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
						<div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 p-6 flex items-center justify-between z-10">
							<div>
								<h2 className="text-2xl font-black text-white">Neue Flaschen erstellen</h2>
								<p className="text-sm text-zinc-400 mt-1">Konfiguriere deine Etiketten und generiere QR-Codes</p>
							</div>
							<button 
								onClick={() => setShowCreateBottlesModal(false)}
								className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition"
							>
								<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<div className="p-6 space-y-6">
							{/* Amount & Size */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="flex justify-between items-center mb-2 px-1">
										<label className="text-[10px] font-bold uppercase text-cyan-500 tracking-widest">Anzahl</label>
										<span className="text-[10px] font-mono text-zinc-600">MAX 100</span>
									</div>
									<input 
										suppressHydrationWarning
										type="number" 
										min="1"
										max="100"
										value={amount} 
										onChange={(e) => setAmount(parseInt(e.target.value))}
										className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl py-3 px-4 text-xl font-black text-center focus:border-cyan-500 outline-none transition-all shadow-inner"
									/>
								</div>

								<div>
									<div className="flex justify-between items-center mb-2 px-1">
										<label className="text-[10px] font-bold uppercase text-cyan-500 tracking-widest">Inhalt (L)</label>
									</div>
									<div className="relative group/size">
										<input 
											type="number"
											step="0.01"
											value={bottleSize}
											onChange={(e) => setBottleSize(parseFloat(e.target.value) || 0)}
											className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl py-3 px-4 text-xl font-black text-center focus:border-cyan-500 outline-none transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
											placeholder="0.0"
										/>
										
										<div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden hidden group-focus-within/size:block z-50">
											{[0.33, 0.5, 0.75].map(s => (
												<button 
													key={s}
													type="button"
													onMouseDown={(e) => {
														e.preventDefault();
														setBottleSize(s);
													}}
													className="w-full text-left px-4 py-3 hover:bg-zinc-800 font-bold text-zinc-300 hover:text-white flex justify-between items-center group transition"
												>
													<span>{s} L</span>
													{bottleSize === s && <span className="text-cyan-500">✓</span>}
												</button>
											))}
										</div>
										
										<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
										</div>
									</div>
								</div>
							</div>

							{/* Format Selection */}
							<div className="space-y-2">
								<label className="text-[10px] font-bold uppercase tracking-widest text-cyan-500 px-1">Format</label>
								<CustomSelect
									value={downloadFormat}
									onChange={(val) => setDownloadFormat(val as any)}
									options={formatOptions}
								/>
								<p className="text-[10px] text-zinc-500 leading-tight px-1">
									{downloadFormat === 'pdf' && 'Erzeugt ein A4 PDF mit QR-Codes zum direkten Ausdrucken.'}
									{downloadFormat === 'zip' && 'Lädt ein Archiv mit einzelnen Bilddateien für jeden Code herunter.'}
									{downloadFormat === 'png' && 'Erstellt ein Übersichtsbild mit allen Codes.'}
								</p>
							</div>

							{/* Label Format (PDF only) */}
							{downloadFormat === 'pdf' && (
								<div className="space-y-2">
									<label className="text-[10px] font-bold uppercase tracking-widest text-cyan-500 px-1">Etikett-Größe</label>
									<CustomSelect
										value={selectedLabelFormat}
										onChange={handleLabelFormatChange}
										options={labelOptions}
									/>
									<p className="text-[10px] text-zinc-500 leading-tight px-1">
										Wähle das passende Avery Zweckform Format (z.B. 6137). Das PDF wird im Querformat erstellt.
									</p>
								</div>
							)}

							{/* Premium Branding Options */}
							{activeBrewery && (activeBrewery.logo_url || activeBrewery.custom_slogan) && (
								<div className="border border-amber-500/20 bg-amber-950/20 rounded-2xl p-4 space-y-4">
									<div className="flex items-center gap-2 mb-2">
										<span className="text-lg">👑</span>
										<h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Premium Branding</h3>
									</div>

									<label className="flex items-center gap-3 cursor-pointer group">
										<input 
											type="checkbox"
											checked={useCustomBranding}
											onChange={(e) => setUseCustomBranding(e.target.checked)}
											className="w-5 h-5 rounded border-2 border-zinc-700 bg-zinc-900 checked:bg-cyan-500 checked:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
										/>
										<div className="flex-1">
											<div className="text-sm font-bold text-white group-hover:text-cyan-400 transition">
												Eigenes Branding verwenden
											</div>
											<div className="text-xs text-zinc-400 mt-1">
												{activeBrewery.logo_url && 'Eigenes Logo'}
												{activeBrewery.logo_url && activeBrewery.custom_slogan && ' & '}
												{activeBrewery.custom_slogan && 'Eigener Slogan'}
											</div>
										</div>
									</label>

									{useCustomBranding && (
										<div className="pl-8 space-y-2 text-xs">
											{activeBrewery.logo_url && (
												<div className="flex items-center gap-2 text-zinc-400">
													<svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
													</svg>
													<span>Logo: {activeBrewery.name}</span>
												</div>
											)}
											{activeBrewery.custom_slogan && (
												<div className="flex items-center gap-2 text-zinc-400">
													<svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
													</svg>
													<span>Slogan: "{activeBrewery.custom_slogan}"</span>
												</div>
											)}
										</div>
									)}
								</div>
							)}

							{/* Action Button */}
							<button 
								onClick={() => {
									setShowCreateBottlesModal(false);
									createBatchAndDownloadPDF();
								}}
								disabled={isWorking}
								className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase tracking-wide rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
							>
								{isWorking ? (
									<>
										<svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
										<span>Erstelle...</span>
									</>
								) : (
									<>
										<span>📦 Generieren & Drucken</span>
										<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
									</>
								)}
							</button>

							<p className="text-xs text-zinc-500 text-center leading-relaxed">
								Erstellt {amount} neue Datenbank-Einträge und generiert die Dateien lokal ({downloadFormat.toUpperCase()}).
							</p>
						</div>
					</div>
				</div>
			)}

		</div>
	);
}
