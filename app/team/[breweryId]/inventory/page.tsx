'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode'; 
import { jsPDF } from 'jspdf'; 
import Scanner from '@/app/components/Scanner';
import { getBreweryTierConfig, type BreweryTierName } from '@/lib/tier-system';
import { checkAndGrantAchievements } from '@/lib/achievements';
import { useAchievementNotification } from '@/app/context/AchievementNotificationContext';
import { useAuth } from '@/app/context/AuthContext';
import { useNotification } from '@/app/context/NotificationContext';

export default function TeamInventoryPage({ params }: { params: Promise<{ breweryId: string }> }) {
	const { breweryId } = use(params);
	const { user, loading: authLoading } = useAuth();
	
	const [bottles, setBottles] = useState<any[]>([]);
	const [brews, setBrews] = useState<any[]>([]);
	const [amount, setAmount] = useState(10);
	const [isWorking, setIsWorking] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [breweryTier, setBreweryTier] = useState<BreweryTierName>('garage');
	const { showAchievement } = useAchievementNotification();
	const { showToast } = useNotification();

	const [showScanner, setShowScanner] = useState(false);
	const [scanBrewId, setScanBrewId] = useState<string>(""); 
	const [scanFeedback, setScanFeedback] = useState<{type: 'success' | 'error', msg: string} | null>(null);
	const [isProcessingScan, setIsProcessingScan] = useState(false);
	const [lastScannedId, setLastScannedId] = useState<string | null>(null);

	const [viewQr, setViewQr] = useState<{ url: string, bottleNumber: number, id: string } | null>(null);

	// Bulk Selection State
	const [selectedBottles, setSelectedBottles] = useState<Set<string>>(new Set());
	const [showBulkAssign, setShowBulkAssign] = useState(false);
	const [bulkAssignBrewId, setBulkAssignBrewId] = useState("");
	
	const [filterText, setFilterText] = useState("");
	const [sortOption, setSortOption] = useState<"newest" | "number_asc" | "number_desc">("number_asc");
	const [filterStatus, setFilterStatus] = useState<"all" | "filled" | "empty">("all");
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

			const { data: btl } = await supabase
				.from('bottles')
				.select('*, brews(name, style)')
				.eq('brewery_id', brewery.id)
				.order('created_at', { ascending: false });
			
			const { data: brw } = await supabase
				.from('brews')
				.select('id, name')
				.eq('brewery_id', brewery.id); 
			
			if (btl) setBottles(btl);
			if (brw) setBrews(brw);
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
			ctx.quadraticCurveTo(boxX, boxY, boxX, boxY + boxSize - cornerRadius);
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
		const doc = new jsPDF();
		doc.setFont("helvetica", "bold");
		doc.text(title, 20, 20);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		doc.text(`Erstellt am: ${new Date().toLocaleString()}`, 20, 27);
		doc.text(`Anzahl: ${bottlesList.length} Flaschen`, 20, 32);

		let x = 20;
		let y = 45;
		const qrSize = 35;
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botllab.vercel.app';

		for (const bottle of bottlesList) {
			const scanUrl = `${baseUrl}/b/${bottle.id}`;
			const qrDataUrl = await generateQRWithLogo(scanUrl);

			doc.addImage(qrDataUrl, 'PNG', x, y, qrSize, qrSize);
			
			doc.setFontSize(8);
			doc.text(`Nr: #${bottle.bottle_number}`, x, y + qrSize + 5);
			doc.setFontSize(6);
			doc.text(`ID: ${bottle.id.slice(0, 13)}...`, x, y + qrSize + 8);

			x += 45; 
			if (x > 160) {
				x = 20;
				y += 55;
			}

			if (y > 240) {
				doc.addPage();
				y = 20;
				x = 20;
			}
		}
		doc.save(`BotlLab_Codes_${Date.now()}.pdf`);
		showToast("PDF erstellt", "Deine QR-Codes wurden erfolgreich heruntergeladen.", "success");
	}

	async function createBatchAndDownloadPDF() {
		if (amount <= 0 || amount > 100) {
			alert("Bitte eine Anzahl zwischen 1 und 100 wählen.");
			return;
		}

		const tierConfig = getBreweryTierConfig(breweryTier);
		if (bottles.length + amount > tierConfig.limits.maxBottles) {
			alert(
				`🔒 Limit erreicht!\n\n` +
				`Der Brauerei-Status "${tierConfig.displayName}" erlaubt maximal ${tierConfig.limits.maxBottles} Flaschen.\n` +
				`Aktuell: ${bottles.length} Flaschen. Noch möglich: ${tierConfig.limits.maxBottles - bottles.length}.\n\n` +
				`Lösche alte Flaschen, um neue zu erstellen.`
			);
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
					bottle_number: currentNum
				};
			});

			const { data: createdBottles, error } = await supabase
				.from('bottles')
				.insert(newRows)
				.select();

			if (error || !createdBottles) throw error;

			await generatePdfForBottles(createdBottles, "BotlLab QR-Code Batch");
      
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
			const brewIdToSet = bulkAssignBrewId || null;
			const { error } = await supabase
				.from('bottles')
				.update({ brew_id: brewIdToSet })
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
		if (isProcessingScan) return;

		const idMatch = decodedText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
		
		if (!idMatch) {
			if (scanFeedback?.type !== 'success') {
				setScanFeedback({ type: 'error', msg: "❌ Kein gültiger Flaschen-QR erkannt." });
			}
			return;
		}

		const bottleId = idMatch[0];

		if (bottleId === lastScannedId) return;

		if (!scanBrewId) {
			if (scanBrewId !== "EMPTY_ACTION") {
				setScanFeedback({ type: 'error', msg: "⚠️ Bitte wähle eine Aktion (Rezept oder Leeren)!" });
				return;
			}
		}

		setIsProcessingScan(true);
		
		try {
			if (!user) throw new Error("Nicht eingeloggt");

			const { data: maxResult } = await supabase
				.from('bottles')
				.select('bottle_number')
				.eq('brewery_id', activeBrewery.id)
				.order('bottle_number', { ascending: false })
				.limit(1)
				.single();
			
			const nextNumber = (maxResult?.bottle_number || 0) + 1;
			const newBrewId = scanBrewId === "EMPTY_ACTION" ? null : scanBrewId;
			
			const { data: existingBottle } = await supabase
				.from('bottles')
				.select('brewery_id, bottle_number')
				.eq('id', bottleId)
				.single();

			let updatePayload: any = { 
				brew_id: newBrewId,
				brewery_id: activeBrewery.id
			};

			if (existingBottle && existingBottle.brewery_id !== activeBrewery.id) {
				updatePayload.bottle_number = nextNumber;
			}

			const { error } = await supabase
				.from('bottles')
				.update(updatePayload)
				.eq('id', bottleId);

			if (error) {
				console.error(error);
				setScanFeedback({ type: 'error', msg: "Fehler: " + error.message });
			} else {
				setLastScannedId(bottleId);
				
				if (newBrewId === null) {
					setScanFeedback({ type: 'success', msg: `✅ Flasche geleert` });
				} else {
					const bName = brews.find(b => b.id === newBrewId)?.name || 'Bier';
					setScanFeedback({ type: 'success', msg: `✅ Flasche zugewiesen -> ${bName}` });
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
			setScanFeedback({ type: 'error', msg: "Fehler: " + e.message });
		} finally {
			setIsProcessingScan(false);
		}
	}

	async function updateBottleBrew(bottleId: string, brewId: string) {
		const { error } = await supabase
			.from('bottles')
			.update({ brew_id: brewId || null })
			.eq('id', bottleId);

		if (!error) loadData();
	}

	async function showQrModal(bottle: any) {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botllab.vercel.app';
		const scanUrl = `${baseUrl}/b/${bottle.id}`;
		const qrDataUrl = await generateQRWithLogo(scanUrl);
		setViewQr({ url: qrDataUrl, bottleNumber: bottle.bottle_number, id: bottle.id });
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

	return (
		<div className="space-y-12 pb-32">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
        <div>
           <div className="flex items-center gap-2 mb-4">
              <span className="text-cyan-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-cyan-950/30 border border-cyan-500/20 shadow-sm shadow-cyan-900/20">
                  Inventar
              </span>
           </div>
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Flaschen & QR-Codes</h1>
           <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
             Verwalte deine Mehrwegflaschen im Team. Generiere Codes für neue Flaschen oder scanne bestehende, um sie einem Rezept zuzuordnen.
           </p>
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
                                            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-inner">
                                                <span className="text-xl">📷</span>
                                            </div>
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
												<div className="relative">
                                                    <select 
                                                        value={scanBrewId}
                                                        onChange={(e) => setScanBrewId(e.target.value)}
                                                        suppressHydrationWarning
                                                        className="w-full appearance-none bg-zinc-950 border-2 border-zinc-800 rounded-xl p-3 pl-4 pr-10 text-sm font-bold focus:border-cyan-500 outline-none transition-colors"
                                                    >
                                                        <option value="">-- Bitte wählen --</option>
                                                        <option value="EMPTY_ACTION">🗑️ Flasche leeren</option>
                                                        <optgroup label="Rezept zuweisen">
                                                            {brews.map(b => (
                                                                <option key={b.id} value={b.id}>🍺 {b.name}</option>
                                                            ))}
                                                        </optgroup>
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
											</div>

											<div className="rounded-2xl overflow-hidden border-2 border-zinc-800 relative bg-black aspect-square shadow-inner">
												 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                                        <div className="flex flex-col items-center gap-2 opacity-30">
														    <span className="text-4xl animate-pulse">📷</span>
                                                            <span className="text-xs font-mono">Camera inactive</span>
                                                        </div>
												 </div>
												 <Scanner onScanSuccess={handleScan} />
                                                 {/* Overlay Scanner Frame */}
                                                 <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none z-10">
                                                     <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-500 rounded-tl-xl -mt-1 -ml-1"></div>
                                                     <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-500 rounded-tr-xl -mt-1 -mr-1"></div>
                                                     <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-500 rounded-bl-xl -mb-1 -ml-1"></div>
                                                     <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-500 rounded-br-xl -mb-1 -mr-1"></div>
                                                 </div>
											</div>

											{scanFeedback && (
												<div className={`p-4 rounded-xl text-xs font-bold text-center border shadow-lg ${scanFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/20' : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-900/20'}`}>
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

					 <div className="relative group bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl hover:border-cyan-500/30 transition-all duration-300">
                             {/* Decorative gradient */}
                            <div className="absolute bottom-0 left-0 p-24 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none -mb-10 -ml-10"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-inner">
                                        <span className="text-xl">📦</span>
                                    </div>
							        <h3 className="text-lg font-black text-white tracking-tight">Neue Flaschen</h3>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                            <div className="flex justify-between items-center mb-2 px-1">
                                                <label className="text-[10px] font-bold uppercase text-cyan-500 tracking-widest">Anzahl</label>
                                                <span className="text-[10px] font-mono text-zinc-600">MAX 100</span>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    suppressHydrationWarning
                                                    type="number" 
                                                    min="1"
                                                    max="100"
                                                    value={amount} 
                                                    onChange={(e) => setAmount(parseInt(e.target.value))}
                                                    className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-4 text-2xl font-black text-center focus:border-cyan-500 outline-none transition-all shadow-inner"
                                                />
                                            </div>
                                    </div>
                                    
                                    <button 
                                        onClick={createBatchAndDownloadPDF}
                                        disabled={isWorking}
                                        className="relative overflow-hidden w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase tracking-wide rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/30"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>
                                        {isWorking ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                <span>Erstelle...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Generieren & Drucken</span>
                                                <svg className="w-5 h-5 -mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                            </>
                                        )}
                                    </button>
                                    
                                    <p className="text-xs text-zinc-500 text-center leading-relaxed px-4">
                                        Erstellt neue QR-Codes und lädt automatisch ein PDF zum direkten Ausdrucken herunter.
                                    </p>
                                </div>
                            </div>
					 </div>
				</div>

				<div className="lg:col-span-8 flex flex-col gap-6">
           
					{/* Search & Filter Bar */}
                    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-3 rounded-3xl flex flex-col xl:flex-row gap-3 shadow-xl">
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
                        <div className="flex gap-2">
                            <div className="relative group">
                                <select 
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="appearance-none bg-zinc-950 text-white text-xs font-bold pl-4 pr-10 py-3.5 rounded-2xl border-2 border-zinc-800 hover:border-zinc-700 focus:border-cyan-500 focus:ring-0 outline-none transition-all cursor-pointer min-w-[140px]"
                                >
                                    <option value="all">Alle Flaschen</option>
                                    <option value="filled">🟢 Gefüllt</option>
                                    <option value="empty">⚫ Leer</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 group-hover:text-cyan-500 transition-colors">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>

                            <div className="relative group">
                                <select 
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value as any)}
                                    className="appearance-none bg-zinc-950 text-white text-xs font-bold pl-4 pr-10 py-3.5 rounded-2xl border-2 border-zinc-800 hover:border-zinc-700 focus:border-cyan-500 focus:ring-0 outline-none transition-all cursor-pointer min-w-[140px]"
                                >
                                    <option value="number_asc">Nr. ⬆️ (1-9)</option>
                                    <option value="number_desc">Nr. ⬇️ (9-1)</option>
                                    <option value="newest">🕒 Neueste</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 group-hover:text-cyan-500 transition-colors">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
           
					 <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex-1 min-h-[500px] shadow-xl">
							<div className="overflow-x-auto">
								<table className="w-full text-left">
									<thead className="bg-zinc-950 text-zinc-500 text-[10px] uppercase font-bold tracking-widest border-b border-zinc-800">
										<tr>
											<th className="p-5 w-16">
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
											</th>
											<th className="p-5 w-24">Nr.</th>
											<th className="p-5">Inhalt / Status</th>
											<th className="p-5 w-48 hidden sm:table-cell">Schnell-Zuweisung</th>
											<th className="p-5 w-24 text-right"></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-zinc-800">
										{filteredBottles.map((bottle) => (
											<tr key={bottle.id} className={`group transition-colors ${selectedBottles.has(bottle.id) ? 'bg-cyan-900/10 hover:bg-cyan-900/20' : 'hover:bg-zinc-800/30'}`}>
												<td className="p-5">
													<label className="relative flex items-center justify-center cursor-pointer">
														<input 
															type="checkbox" 
															checked={selectedBottles.has(bottle.id)}
															onChange={() => toggleSelection(bottle.id)}
															className="peer sr-only"
														/>
														<div className="w-5 h-5 rounded-md border-2 border-zinc-700 bg-zinc-900 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all duration-200 flex items-center justify-center hover:border-zinc-500">
															<svg className="w-3.5 h-3.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
																<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
															</svg>
														</div>
													</label>
												</td>
												<td className="p-5 font-black text-white text-xl tabular-nums tracking-tight">
													 <span className="text-zinc-600 mr-0.5">#</span>{bottle.bottle_number}
												</td>
												<td className="p-5">
													 {bottle.brews?.name ? (
														 <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
																<div className="font-bold text-white text-base truncate max-w-[120px] sm:max-w-none">{bottle.brews.name}</div>
																{/* Desktop Badge */}
																<span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
																	<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
																	Gefüllt
																</span>
																{/* Mobile Dot */}
																<span className="sm:hidden inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase">
																	<span className="w-2 h-2 rounded-full bg-emerald-400"></span>
																	Gefüllt
																</span>
														 </div>
													 ) : (
														<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
																<div className="font-bold text-zinc-600 text-base">Unbelegt</div>
																{/* Desktop Badge */}
																<span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold uppercase tracking-wide">
																	<span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
																	Leer
																</span>
																{/* Mobile Dot */}
																<span className="sm:hidden inline-flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase">
																	<span className="w-2 h-2 rounded-full bg-zinc-600"></span>
																	Leer
																</span>
														</div>
													 )}
												</td>
												<td className="p-5 hidden sm:table-cell">
                                                    <div className="relative group/select">
                                                        <select 
                                                            value={bottle.brew_id || ""}
                                                            onChange={(e) => updateBottleBrew(bottle.id, e.target.value)}
                                                            suppressHydrationWarning
                                                            className="w-full appearance-none bg-zinc-950/50 border border-zinc-700 rounded-xl pl-3 pr-8 py-2.5 text-sm text-zinc-300 font-medium outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:text-white hover:border-zinc-500 transition-all opacity-70 group-hover:opacity-100"
                                                        >
                                                            <option value="">(Leer)</option>
                                                            {brews.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                        </div>
                                                    </div>
												</td>
												<td className="p-5 text-right">
													 <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
															<button 
																onClick={() => showQrModal(bottle)}
																className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition hover:text-cyan-400 group-hover:bg-zinc-950 shadow-md border border-transparent hover:border-zinc-700"
																title="QR Code anzeigen"
															>
																<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 11h6v6H3v-6zm2 2v2h2v-2H5zm13-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm3-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm-3-5h-3v3h3v-3zm3 3v3h-3v-3h3zm-3-3v3h-3v-3h3z" />
                                                                    <path d="M15 11h2v.01h-2v-.01zm2 2h2v.01h-2v-.01zm-2 2h2v.01h-2v-.01zm2 2h2v.01h-2v-.01z" fill="none"/>
                                                                    <rect x="15" y="11" width="6" height="6" fill="currentColor"/> 
                                                                    {/* Simplified QR Icon Look */}
                                                                </svg>
															</button>
													 </div>
												</td>
											</tr>
										))}
                    
										{filteredBottles.length === 0 && (
											<tr>
												<td colSpan={5} className="p-16 text-center">
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
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
					 </div>

				</div>
			</div>

			{viewQr && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewQr(null)}>
					<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
						<button className="absolute top-3 right-3 text-zinc-500 hover:text-white" onClick={() => setViewQr(null)}>✖</button>
						<h3 className="text-lg font-bold mb-4">QR-Code für Flasche #{viewQr.bottleNumber}</h3>
						<div className="bg-white p-4 rounded-xl">
							<img src={viewQr.url} alt="QR Code" className="w-full" />
						</div>
						<p className="text-xs text-zinc-500 mt-3">Link: <span className="text-cyan-400">{window.location.origin}/b/{viewQr.id}</span></p>
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
						
						<select 
							value={bulkAssignBrewId}
							onChange={(e) => setBulkAssignBrewId(e.target.value)}
							className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:border-cyan-500 outline-none mb-4"
						>
							<option value="">(Leer / Entleeren)</option>
							{brews.map(b => (
								<option key={b.id} value={b.id}>{b.name}</option>
							))}
						</select>

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

		</div>
	);
}
