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
			if (sortOption === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			if (sortOption === "number_desc") return b.bottle_number - a.bottle_number;
			if (sortOption === "number_asc") return a.bottle_number - b.bottle_number;
			return 0;
		});

	const stats = {
		total: bottles.length,
		full: bottles.filter(b => b.brew_id).length,
		empty: bottles.filter(b => !b.brew_id).length
	};

	return (
		<div className="space-y-8 pb-32">
      
			<div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
				<div>
					<h2 className="text-4xl font-black text-foreground tracking-tight">Inventar</h2>
					<p className="text-zinc-400 mt-2 max-w-lg">
						Verwalte deine Mehrwegflaschen im Team. Generiere Codes für neue Flaschen oder scanne bestehende, um sie einem Rezept zuzuordnen.
					</p>
				</div>
        
					<div className="flex gap-4">
						<div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl w-32 shadow-lg">
							<div className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-1">Gesamt</div>
							<div className="text-3xl font-black text-cyan-500">{stats.total}</div>
						</div>
						<div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl w-32 shadow-lg">
							<div className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-1">Gefüllt</div>
							<div className="text-3xl font-black text-emerald-300">{stats.full}</div>
						</div>
						<div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl w-32 shadow-lg">
							<div className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-1">Leer</div>
							<div className="text-3xl font-black text-amber-200">{stats.empty}</div>
						</div>
					</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
				<div className="lg:col-span-4 space-y-6">
           
					 <div className={`bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden transition-all duration-300 shadow-xl ${showScanner ? 'ring-2 ring-cyan-500/50' : ''}`}>
							<div className="p-6">
								 <div className="flex justify-between items-center mb-4">
										<h3 className="text-lg font-bold flex items-center gap-2">📷 &nbsp;Scanner</h3>
										<button 
											onClick={() => setShowScanner(!showScanner)} 
											className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border transition ${showScanner ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
										>
											{showScanner ? 'Schließen' : 'Starten'}
										</button>
								 </div>
                 
								 {showScanner ? (
									 <div className="space-y-4 animate-in fade-in">
											<div>
												<label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest block mb-2">Rezept füllen / Leeren</label>
												<select 
													 value={scanBrewId}
													 onChange={(e) => setScanBrewId(e.target.value)}
													suppressHydrationWarning
													className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm focus:border-cyan-500 outline-none"
												>
													<option value="">-- Aktion wählen --</option>
													<option value="EMPTY_ACTION">🗑️ Flasche leeren</option>
													<optgroup label="Rezepte zuweisen">
														{brews.map(b => (
															<option key={b.id} value={b.id}>{b.name}</option>
														))}
													</optgroup>
												</select>
											</div>

											<div className="rounded-xl overflow-hidden border border-zinc-700 relative bg-black aspect-square">
												 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
														<span className="text-zinc-800 text-4xl">📷</span>
												 </div>
												 <Scanner onScanSuccess={handleScan} />
											</div>

											{scanFeedback && (
												<div className={`p-3 rounded-lg text-xs font-bold text-center border ${scanFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
													 {scanFeedback.msg}
												</div>
											)}
									 </div>
								 ) : (
									 <p className="text-zinc-500 text-sm">
										 Verwende die Kamera deines Geräts, um Flaschencodes blitzschnell zu scannen und einem Rezept zuzuordnen.
									 </p>
								 )}
							</div>
					 </div>

					 <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
							<h3 className="text-lg font-bold mb-4 flex items-center gap-2">📦 &nbsp;Neue Flaschen</h3>
							<div className="space-y-4">
								 <div>
										<label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest block mb-2">Anzahl</label>
										<input 
											suppressHydrationWarning
											type="number" 
											min="1"
											max="100"
											value={amount} 
											onChange={(e) => setAmount(parseInt(e.target.value))}
											className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-lg font-bold focus:border-cyan-500 outline-none"
										/>
								 </div>
								 <button 
									 onClick={createBatchAndDownloadPDF}
									 disabled={isWorking}
									 className="w-full py-4 bg-cyan-500 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition flex items-center justify-center gap-2"
								 >
									 {isWorking ? <span className="animate-pulse">Erstelle...</span> : <span>Generieren & Drucken</span>}
								 </button>
								 <p className="text-xs text-zinc-600 text-center leading-relaxed">
									 Erstellt neue QR-Codes und lädt ein PDF zum Ausdrucken herunter.
								 </p>
							</div>
					 </div>
				</div>

				<div className="lg:col-span-8 flex flex-col gap-6">
           
					 <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-2xl flex flex-col sm:flex-row gap-2 shadow-lg">
							<div className="flex-1 relative">
								 <span className="absolute left-4 top-3.5 text-zinc-500">🔍</span>
								 <input 
									 type="text" 
									 placeholder="Suchen..." 
									 value={filterText}
									 onChange={e => setFilterText(e.target.value)}
									 suppressHydrationWarning
									 className="w-full bg-transparent pl-10 pr-4 py-3 text-sm font-bold text-white outline-none placeholder:font-normal placeholder:text-zinc-600"
								 />
							</div>
							<div className="flex gap-2">
								<div className="relative">
									<select 
										value={filterStatus}
										onChange={(e) => setFilterStatus(e.target.value as any)}
										suppressHydrationWarning
										className="appearance-none bg-zinc-800 text-white text-xs font-bold pl-4 pr-8 py-3 rounded-xl outline-none hover:bg-zinc-700 focus:ring-2 focus:ring-cyan-500 transition cursor-pointer border border-zinc-700"
									>
										<option value="all" className="bg-zinc-900">Alle Flaschen</option>
										<option value="filled" className="bg-zinc-900">Nur Gefüllte</option>
										<option value="empty" className="bg-zinc-900">Nur Leere</option>
									</select>
									<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
										<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
									</div>
								</div>

								<div className="relative">
									<select 
										value={sortOption}
										onChange={(e) => setSortOption(e.target.value as any)}
										suppressHydrationWarning
										className="appearance-none bg-zinc-800 text-white text-xs font-bold pl-4 pr-8 py-3 rounded-xl outline-none hover:bg-zinc-700 focus:ring-2 focus:ring-cyan-500 transition cursor-pointer border border-zinc-700"
									>
										<option value="number_asc" className="bg-zinc-900">Nr. Aufsteigend</option>
										<option value="number_desc" className="bg-zinc-900">Nr. Absteigend</option>
										<option value="newest" className="bg-zinc-900">Neueste zuerst</option>
									</select>
									<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
										<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
									</div>
								</div>
							</div>
					 </div>
           
					 <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex-1 min-h-[500px] shadow-xl">
							<div className="overflow-x-auto">
								<table className="w-full text-left">
									<thead className="bg-black/20 text-zinc-500 text-[10px] uppercase font-bold tracking-widest border-b border-zinc-800">
										<tr>
											<th className="p-5 w-10">
												<label className="relative flex items-center justify-center cursor-pointer group">
													<input 
														type="checkbox" 
														checked={filteredBottles.length > 0 && selectedBottles.size === filteredBottles.length}
														onChange={toggleAll}
														className="peer sr-only"
													/>
													<div className="w-5 h-5 rounded-full border-2 border-zinc-600 bg-transparent peer-checked:bg-zinc-500 peer-checked:border-zinc-500 transition-all duration-200 flex items-center justify-center group-hover:border-zinc-500">
														<svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
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
											<tr key={bottle.id} className={`group transition-colors ${selectedBottles.has(bottle.id) ? 'bg-zinc-500/10' : 'hover:bg-zinc-800/30'}`}>
												<td className="p-5">
													<label className="relative flex items-center justify-center cursor-pointer">
														<input 
															type="checkbox" 
															checked={selectedBottles.has(bottle.id)}
															onChange={() => toggleSelection(bottle.id)}
															className="peer sr-only"
														/>
														<div className="w-5 h-5 rounded-full border-2 border-zinc-600 bg-transparent peer-checked:bg-zinc-500 peer-checked:border-zinc-500 transition-all duration-200 flex items-center justify-center hover:border-zinc-500">
															<svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
																<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
															</svg>
														</div>
													</label>
												</td>
												<td className="p-5 font-black text-cyan-500 text-lg">
													 #{bottle.bottle_number}
												</td>
												<td className="p-5">
													 {bottle.brews?.name ? (
														 <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
																<div className="font-bold text-white text-base truncate max-w-[120px] sm:max-w-none">{bottle.brews.name}</div>
																{/* Desktop Badge */}
																<span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
																	<span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
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
													 <select 
														value={bottle.brew_id || ""}
														onChange={(e) => updateBottleBrew(bottle.id, e.target.value)}
													 suppressHydrationWarning
													 className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 hover:border-cyan-500/40 transition shadow-sm"
													 >
															<option value="">(Leer)</option>
															{brews.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
													 </select>
												</td>
												<td className="p-5 text-right">
													 <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
															<button 
																onClick={() => showQrModal(bottle)}
																className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition"
																title="QR Code"
															>
																📱
															</button>
													 </div>
												</td>
											</tr>
										))}
                    
										{filteredBottles.length === 0 && (
											<tr>
												<td colSpan={4} className="p-12 text-center">
													 <div className="text-4xl mb-4">🫙</div>
													 <h3 className="text-white font-bold mb-2">Keine Flaschen gefunden</h3>
													 <p className="text-zinc-500 text-sm">Passe deine Filter an oder erstelle neue Flaschen.</p>
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
