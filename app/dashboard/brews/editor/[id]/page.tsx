// Full brew editor implementation migrated from admin.
'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { getTierConfig } from '@/lib/tier-system';
import { checkAndGrantAchievements } from '@/lib/achievements';
import { useAchievementNotification } from '@/app/context/AchievementNotificationContext';

interface BrewForm {
	id?: string;
	name: string;
	style: string;
	brew_type: string;
	description?: string;
	image_url?: string | null;
	is_public: boolean;
	data?: any;
	remix_parent_id?: string | null;
}

export default function BrewEditorPage() {
	const params = useParams();
	const router = useRouter();
	const id = params.id as string;
	const { showAchievement } = useAchievementNotification();

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	);

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [generatingName, setGeneratingName] = useState(false);
	const [generatingDescription, setGeneratingDescription] = useState(false);
	const [analyzingRecipe, setAnalyzingRecipe] = useState(false);
	const [optimizationSuggestions, setOptimizationSuggestions] = useState<string[]>([]);
	const [message, setMessage] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'editor' | 'label' | 'ratings'>('editor');
	const [extraPrompt, setExtraPrompt] = useState('');
	const [ratings, setRatings] = useState<any[]>([]);
	const [ratingsLoading, setRatingsLoading] = useState(false);
	const [ratingsMessage, setRatingsMessage] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [brew, setBrew] = useState<BrewForm>({
		name: '',
		style: '',
		brew_type: 'beer',
		description: '',
		image_url: null,
		is_public: false,
		data: {}
	});

	function updateData(key: string, value: any) {
		setBrew(prev => ({ ...prev, data: { ...(prev.data || {}), [key]: value } }));
	}

	useEffect(() => {
		init();
	}, [id]);

	async function init() {
		setLoading(true);
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			router.push(`/login?redirect=/dashboard/brews/editor/${id}`);
			return;
		}

		if (id !== 'new') {
			const { data, error } = await supabase
				.from('brews')
				.select('*')
				.eq('id', id)
				.eq('user_id', user.id)
				.maybeSingle();

			if (error || !data) {
				router.push('/dashboard/brews');
				return;
			}

			setBrew({ ...data, data: data.data || {} });
			await loadRatings(data.id);
		}

		setLoading(false);
	}

	async function loadRatings(brewId: string) {
		try {
			setRatingsLoading(true);
			const { data } = await supabase
				.from('ratings')
				.select('*')
				.eq('brew_id', brewId)
				.order('created_at', { ascending: false });
			setRatings(data || []);
		} finally {
			setRatingsLoading(false);
		}
	}

	async function handleSave() {
		setMessage(null);
		setSaving(true);
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			router.push(`/login?redirect=/dashboard/brews/editor/${id}`);
			return;
		}

		if (id === 'new') {
			const { data: profile } = await supabase
				.from('profiles')
				.select('tier')
				.eq('id', user.id)
				.maybeSingle();

			const tierConfig = getTierConfig(profile?.tier || 'bronze');
			const { count } = await supabase
				.from('brews')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', user.id);

			if ((count || 0) >= tierConfig.limits.maxBrews) {
				setMessage(`Limit erreicht: ${tierConfig.displayName} erlaubt ${tierConfig.limits.maxBrews} Rezepte.`);
				setSaving(false);
				return;
			}

			const payload = {
				name: brew.name,
				style: brew.style,
				brew_type: brew.brew_type,
				description: brew.description,
				image_url: brew.image_url,
				is_public: brew.is_public || false,
				data: brew.data || {},
				user_id: user.id,
			};

			const { data, error } = await supabase
				.from('brews')
				.insert([payload])
				.select()
				.single();

			if (error || !data) {
				setMessage(error?.message || 'Speichern fehlgeschlagen.');
				setSaving(false);
				return;
			}

			setBrew({ ...data, data: data.data || {} });
			setSaving(false);
			router.replace(`/dashboard/brews/editor/${data.id}`);
			await loadRatings(data.id);
			
			// Achievements im Hintergrund prüfen
			checkAndGrantAchievements(user.id).then(newAchievements => {
				newAchievements.forEach(achievement => showAchievement(achievement));
			}).catch(console.error);
			
			return;
		}

		const { data, error } = await supabase
			.from('brews')
			.update({
				name: brew.name,
				style: brew.style,
				brew_type: brew.brew_type,
				description: brew.description,
				image_url: brew.image_url,
				is_public: brew.is_public,
				data: brew.data || {},
			})
			.eq('id', id)
			.eq('user_id', user.id)
			.select()
			.single();

		if (error || !data) {
			setMessage(error?.message || 'Speichern fehlgeschlagen.');
		} else {
			setBrew({ ...data, data: data.data || {} });
			setMessage('Gespeichert.');
			if (data.id) await loadRatings(data.id);
			
			// Achievements im Hintergrund prüfen
			checkAndGrantAchievements(user.id).then(newAchievements => {
				newAchievements.forEach(achievement => showAchievement(achievement));
			}).catch(console.error);
		}
		setSaving(false);
	}

	async function moderateRating(ratingId: string, status: 'auto_approved' | 'rejected') {
		setRatingsMessage(null);
		const { data: { session } } = await supabase.auth.getSession();
		if (!session || !brew.id) {
			setRatingsMessage('Nicht angemeldet.');
			return;
		}

		try {
			const res = await fetch('/api/ratings/moderate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ ratingId, brewId: brew.id, status })
			});

			const payload = await res.json();
			if (!res.ok) {
				setRatingsMessage(payload.error || 'Aktion fehlgeschlagen');
				return;
			}

			setRatingsMessage(status === 'auto_approved' ? 'Bewertung freigegeben.' : 'Bewertung abgelehnt.');
			await loadRatings(brew.id!);
		} catch (err: any) {
			setRatingsMessage(err?.message || 'Aktion fehlgeschlagen');
		}
	}

	async function removeRating(ratingId: string) {
		setRatingsMessage(null);
		const { data: { user } } = await supabase.auth.getUser();
		if (!user || !brew.id) return;
		try {
			const { error } = await supabase
				.from('ratings')
				.delete()
				.eq('id', ratingId)
				.eq('brew_id', brew.id);
			if (error) {
				setRatingsMessage(error.message);
				return;
			}
			setRatingsMessage('Bewertung gelöscht.');
			await loadRatings(brew.id!);
		} catch (err: any) {
			setRatingsMessage(err?.message || 'Aktion fehlgeschlagen');
		}
	}

	async function handleGenerate() {
		if (!brew.id) {
			setMessage('Bitte zuerst speichern, bevor du ein Label generierst.');
			return;
		}

		setGenerating(true);
		setMessage(null);

		const typePrompt: string[] = [];
		const d = brew.data || {};
		if (brew.brew_type === 'beer') {
			if (d.abv) typePrompt.push(`ABV ${d.abv}%`);
			if (d.ibu) typePrompt.push(`IBU ${d.ibu}`);
			if (d.srm) typePrompt.push(`SRM ${d.srm}`);
			if (d.malts) typePrompt.push(`Malts: ${d.malts}`);
			if (d.hops) typePrompt.push(`Hops: ${d.hops}`);
			if (d.yeast) typePrompt.push(`Yeast: ${d.yeast}`);
			if (d.og && d.fg) typePrompt.push(`OG ${d.og}, FG ${d.fg}`);
		} else if (brew.brew_type === 'wine') {
			if (d.abv) typePrompt.push(`ABV ${d.abv}%`);
			if (d.grapes) typePrompt.push(`Grapes: ${d.grapes}`);
			if (d.vintage) typePrompt.push(`Vintage ${d.vintage}`);
			if (d.region) typePrompt.push(`Region ${d.region}`);
			if (d.oak_aged) typePrompt.push(`Oak aged${d.oak_months ? ` ${d.oak_months} months` : ''}`);
			if (d.residual_sugar_g_l) typePrompt.push(`Residual sugar ${d.residual_sugar_g_l} g/l`);
			if (d.acidity_g_l) typePrompt.push(`Acidity ${d.acidity_g_l} g/l`);
			if (d.sulfites) typePrompt.push(`Contains sulfites`);
		} else if (brew.brew_type === 'cider') {
			if (d.abv) typePrompt.push(`ABV ${d.abv}%`);
			if (d.apples) typePrompt.push(`Apples: ${d.apples}`);
			if (d.yeast) typePrompt.push(`Yeast: ${d.yeast}`);
			if (d.fermentation) typePrompt.push(`Fermentation: ${d.fermentation}`);
			if (d.sweetness) typePrompt.push(`Sweetness: ${d.sweetness}`);
			if (d.carbonation_g_l) typePrompt.push(`Carbonation ${d.carbonation_g_l} g/l`);
			if (d.pH) typePrompt.push(`pH ${d.pH}`);
		} else if (brew.brew_type === 'mead') {
			if (d.abv) typePrompt.push(`ABV ${d.abv}%`);
			if (d.honey) typePrompt.push(`Honey: ${d.honey}`);
			if (d.adjuncts) typePrompt.push(`Adjuncts: ${d.adjuncts}`);
			if (d.yeast) typePrompt.push(`Yeast: ${d.yeast}`);
			if (d.final_gravity) typePrompt.push(`FG ${d.final_gravity}`);
			if (d.aging_months) typePrompt.push(`Aging ${d.aging_months} months`);
		} else if (brew.brew_type === 'softdrink') {
			if (d.base) typePrompt.push(`Base flavor: ${d.base}`);
			if (d.sugar_g_l) typePrompt.push(`Sugar ${d.sugar_g_l} g/l`);
			if (d.acidity_ph) typePrompt.push(`pH ${d.acidity_ph}`);
			if (d.carbonation_g_l) typePrompt.push(`Carbonation ${d.carbonation_g_l} g/l`);
			if (d.natural_flavors) typePrompt.push(`Natural flavors`);
			if (d.coloring) typePrompt.push(`Coloring used`);
		}

		const promptParts = [
			`Create a pure illustration label design for ${brew.name || 'dein Brew'}.`,
			brew.style ? `Style: ${brew.style}.` : '',
			brew.description ? `Visual theme: ${brew.description}.` : '',
			typePrompt.length ? `Context: ${typePrompt.join(', ')}.` : '',
			extraPrompt ? `Additional style: ${extraPrompt}` : '',
			'IMPORTANT: Pure illustration artwork only, absolutely NO TEXT, NO LETTERS, NO WORDS, NO TYPOGRAPHY on the label.',
			'Text-free design, visual artwork only.',
			'High detail, vibrant colors, artistic illustration, 1:1 aspect ratio.'
		].filter(Boolean);

		try {
			const response = await fetch('/api/generate-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: promptParts.join(' '),
					brewId: brew.id
				})
			});

			const data = await response.json();
			if (data.imageUrl) {
				setBrew(prev => ({ ...prev, image_url: data.imageUrl }));
				setMessage('Label aktualisiert.');
			} else {
				setMessage(data.error || 'Generierung fehlgeschlagen.');
			}
		} catch (e: any) {
			setMessage(e?.message || 'Generierung fehlgeschlagen.');
		} finally {
			setGenerating(false);
		}
	}

	async function handleField<K extends keyof BrewForm>(key: K, value: BrewForm[K]) {
		setBrew(prev => ({ ...prev, [key]: value }));
	}

	async function handleGenerateName() {
		setGeneratingName(true);
		setMessage(null);

		try {
			const d = brew.data || {};
			const context: string[] = [];
			
			if (brew.style) context.push(`Style: ${brew.style}`);
			if (brew.brew_type) context.push(`Type: ${brew.brew_type}`);
			
			if (brew.brew_type === 'beer') {
				if (d.hops) context.push(`Hops: ${d.hops}`);
				if (d.malts) context.push(`Malts: ${d.malts}`);
				if (d.abv) context.push(`ABV: ${d.abv}%`);
				if (d.ibu) context.push(`IBU: ${d.ibu}`);
			} else if (brew.brew_type === 'wine') {
				if (d.grapes) context.push(`Grapes: ${d.grapes}`);
				if (d.region) context.push(`Region: ${d.region}`);
				if (d.vintage) context.push(`Vintage: ${d.vintage}`);
			} else if (brew.brew_type === 'cider') {
				if (d.apples) context.push(`Apples: ${d.apples}`);
			} else if (brew.brew_type === 'mead') {
				if (d.honey) context.push(`Honey: ${d.honey}`);
				if (d.adjuncts) context.push(`Adjuncts: ${d.adjuncts}`);
			} else if (brew.brew_type === 'softdrink') {
				if (d.base) context.push(`Base: ${d.base}`);
			}

			const response = await fetch('/api/generate-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'name',
					context: context.join(', '),
					brewType: brew.brew_type,
					style: brew.style
				})
			});

			const data = await response.json();
			if (data.text) {
				setBrew(prev => ({ ...prev, name: data.text }));
				setMessage('Name generiert! 🎉');
			} else {
				setMessage(data.error || 'Name-Generierung fehlgeschlagen.');
			}
		} catch (e: any) {
			setMessage(e?.message || 'Name-Generierung fehlgeschlagen.');
		} finally {
			setGeneratingName(false);
		}
	}

	async function handleOptimizeRecipe() {
		setAnalyzingRecipe(true);
		setMessage(null);
		setOptimizationSuggestions([]);

		try {
			const d = brew.data || {};
			const recipeData: any = {
				name: brew.name,
				style: brew.style,
				brewType: brew.brew_type,
				description: brew.description
			};

			// Type-specific data
			if (brew.brew_type === 'beer') {
				recipeData.abv = d.abv;
				recipeData.ibu = d.ibu;
				recipeData.srm = d.srm;
				recipeData.og = d.og;
				recipeData.fg = d.fg;
				recipeData.malts = d.malts;
				recipeData.hops = d.hops;
				recipeData.yeast = d.yeast;
				recipeData.dryHop = d.dry_hop_g;
				recipeData.boilMinutes = d.boil_minutes;
				recipeData.mashTemp = d.mash_temp_c;
			} else if (brew.brew_type === 'wine') {
				recipeData.abv = d.abv;
				recipeData.grapes = d.grapes;
				recipeData.vintage = d.vintage;
				recipeData.region = d.region;
				recipeData.oakAged = d.oak_aged;
				recipeData.oakMonths = d.oak_months;
			} else if (brew.brew_type === 'cider') {
				recipeData.abv = d.abv;
				recipeData.apples = d.apples;
				recipeData.sweetness = d.sweetness;
				recipeData.yeast = d.yeast;
			} else if (brew.brew_type === 'mead') {
				recipeData.abv = d.abv;
				recipeData.honey = d.honey;
				recipeData.adjuncts = d.adjuncts;
				recipeData.yeast = d.yeast;
			}

			const response = await fetch('/api/generate-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'optimization',
					recipeData
				})
			});

			const data = await response.json();
			if (data.suggestions && Array.isArray(data.suggestions)) {
				setOptimizationSuggestions(data.suggestions);
				setMessage('Rezept analysiert! ✨');
			} else {
				setMessage(data.error || 'Analyse fehlgeschlagen.');
			}
		} catch (e: any) {
			setMessage(e?.message || 'Analyse fehlgeschlagen.');
		} finally {
			setAnalyzingRecipe(false);
		}
	}

	async function handleGenerateDescription() {
		setGeneratingDescription(true);
		setMessage(null);

		try {
			const d = brew.data || {};
			const details: string[] = [];
			
			if (brew.name) details.push(`Name: ${brew.name}`);
			if (brew.style) details.push(`Style: ${brew.style}`);
			if (brew.brew_type) details.push(`Type: ${brew.brew_type}`);
			
			if (brew.brew_type === 'beer') {
				if (d.abv) details.push(`ABV: ${d.abv}%`);
				if (d.ibu) details.push(`IBU: ${d.ibu}`);
				if (d.srm) details.push(`SRM: ${d.srm}`);
				if (d.malts) details.push(`Malts: ${d.malts}`);
				if (d.hops) details.push(`Hops: ${d.hops}`);
				if (d.yeast) details.push(`Yeast: ${d.yeast}`);
				if (d.og && d.fg) details.push(`OG: ${d.og}, FG: ${d.fg}`);
			} else if (brew.brew_type === 'wine') {
				if (d.abv) details.push(`ABV: ${d.abv}%`);
				if (d.grapes) details.push(`Grapes: ${d.grapes}`);
				if (d.vintage) details.push(`Vintage: ${d.vintage}`);
				if (d.region) details.push(`Region: ${d.region}`);
				if (d.oak_aged) details.push(`Oak aged`);
			} else if (brew.brew_type === 'cider') {
				if (d.abv) details.push(`ABV: ${d.abv}%`);
				if (d.apples) details.push(`Apples: ${d.apples}`);
				if (d.sweetness) details.push(`Sweetness: ${d.sweetness}`);
			} else if (brew.brew_type === 'mead') {
				if (d.abv) details.push(`ABV: ${d.abv}%`);
				if (d.honey) details.push(`Honey: ${d.honey}`);
				if (d.adjuncts) details.push(`Adjuncts: ${d.adjuncts}`);
			} else if (brew.brew_type === 'softdrink') {
				if (d.base) details.push(`Base flavor: ${d.base}`);
				if (d.natural_flavors) details.push(`Natural flavors`);
			}

			const response = await fetch('/api/generate-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'description',
					details: details.join(', '),
					brewType: brew.brew_type,
					style: brew.style
				})
			});

			const data = await response.json();
			if (data.text) {
				setBrew(prev => ({ ...prev, description: data.text }));
				setMessage('Beschreibung generiert! ✨');
			} else {
				setMessage(data.error || 'Beschreibungs-Generierung fehlgeschlagen.');
			}
		} catch (e: any) {
			setMessage(e?.message || 'Beschreibungs-Generierung fehlgeschlagen.');
		} finally {
			setGeneratingDescription(false);
		}
	}

	async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			setMessage('Bitte nur Bilder hochladen (PNG, JPG, etc.)');
			return;
		}

		if (!brew.id) {
			setMessage('Bitte zuerst speichern, bevor du ein Label hochlädst.');
			return;
		}

		setUploading(true);
		setMessage(null);

		try {
			const fileName = `${brew.id}-${Date.now()}.${file.name.split('.').pop()}`;
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('labels')
				.upload(fileName, file, { upsert: true });

			if (uploadError) throw uploadError;

			const { data: urlData } = supabase.storage.from('labels').getPublicUrl(fileName);
			const imageUrl = urlData?.publicUrl;

			if (!imageUrl) throw new Error('Keine URL erhalten');

			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('Nicht authentifiziert');

			const { data, error } = await supabase
				.from('brews')
				.update({ image_url: imageUrl })
				.eq('id', brew.id)
				.eq('user_id', user.id)
				.select()
				.single();

			if (error) throw error;

			setBrew(prev => ({ ...prev, image_url: imageUrl }));
			setMessage('Label hochgeladen und gespeichert.');
		} catch (err: any) {
			setMessage(err?.message || 'Upload fehlgeschlagen.');
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center">
				<div className="text-center">
					<div className="text-5xl mb-4 animate-pulse">🧪</div>
					<p className="text-zinc-400">Lade Rezeptdaten...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen text-white py-8">
			<div className="max-w-6xl mx-auto px-4 space-y-8">
<div className="flex items-center justify-between gap-3 mb-6">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<span className="text-2xl">🧪</span>
						<p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold">Rezept Editor</p>
					</div>
					<h1 className="text-3xl md:text-4xl font-black">{id === 'new' ? 'Neues Rezept anlegen' : brew.name || 'Rezept bearbeiten'}</h1>
					<p className="text-zinc-400 mt-1">Hier entstehen deine Brau-Kreationen</p>
				</div>
				<div className="flex items-center gap-3">
					<label className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm cursor-pointer hover:border-cyan-500/50 transition">
						<input
							type="checkbox"
							checked={brew.is_public}
							onChange={(e) => handleField('is_public', e.target.checked)}
							className="h-5 w-5 rounded-lg border border-zinc-800 bg-zinc-900 accent-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
						/>
						<span>Öffentlich</span>
					</label>
					<button
						onClick={handleSave}
						disabled={saving}
						className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold px-5 py-2 rounded-xl hover:shadow-lg hover:shadow-cyan-500/30 transition disabled:opacity-60"
					>
						{saving ? 'Speichern...' : 'Speichern'}
					</button>
					<Link href="/dashboard/brews" className="text-zinc-400 hover:text-cyan-400 text-sm transition">Zurück</Link>
					</div>
				</div>

				{message && (
					<div className="bg-zinc-900 border border-cyan-500/30 rounded-xl px-4 py-3 text-sm text-zinc-200">
						{message}
					</div>
				)}

				<div className="flex gap-2 border-b border-zinc-800 mb-6 overflow-x-auto">
					<button
						onClick={() => setActiveTab('editor')}
						className={`px-4 py-3 font-semibold text-sm transition relative whitespace-nowrap ${
							activeTab === 'editor' 
								? 'text-cyan-400' 
								: 'text-zinc-500 hover:text-zinc-300'
						}`}
					>
						⚗️ Eingabe & Analyse
						{activeTab === 'editor' && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
						)}
					</button>
					<button
						onClick={() => setActiveTab('label')}
						className={`px-4 py-3 font-semibold text-sm transition relative whitespace-nowrap ${
							activeTab === 'label' 
								? 'text-cyan-400' 
								: 'text-zinc-500 hover:text-zinc-300'
						}`}
					>
						🏷️ Label
						{activeTab === 'label' && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
						)}
					</button>
					{id !== 'new' && (
						<button
							onClick={() => setActiveTab('ratings')}
							className={`px-4 py-3 font-semibold text-sm transition relative whitespace-nowrap ${
								activeTab === 'ratings' 
									? 'text-cyan-400' 
									: 'text-zinc-500 hover:text-zinc-300'
							}`}
						>
							⭐ Bewertungen (Mods)
							{activeTab === 'ratings' && (
								<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
							)}
						</button>
					)}
				</div>

				{activeTab === 'editor' && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="space-y-5 bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
						<div>
							<label className="text-xs uppercase font-bold text-cyan-400 mb-2 flex items-center justify-between">
								<span>Name</span>
								<button
									onClick={handleGenerateName}
									disabled={generatingName}
									className="text-[10px] bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-2 py-1 rounded-lg transition disabled:opacity-50 flex items-center gap-1"
								>
									{generatingName ? '⚡ Generiert...' : '✨ KI-Name'}
								</button>
							</label>
							<input
								value={brew.name}
								onChange={(e) => handleField('name', e.target.value)}
								className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
								placeholder="z.B. Galaxy IPA"
							/>
						</div>
						<div>
							<label className="text-xs uppercase font-bold text-cyan-400">Stil</label>
							<input
								value={brew.style}
								onChange={(e) => handleField('style', e.target.value)}
								className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
								placeholder="z.B. Hazy IPA, Rotwein"
							/>
						</div>
						<div>
							<label className="text-xs uppercase font-bold text-cyan-400 mb-2 block">Getränkeart</label>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{[
									{ key: 'beer', label: '🍺 Bier' },
									{ key: 'wine', label: '🍷 Wein' },
									{ key: 'cider', label: '🍎 Cider' },
									{ key: 'mead', label: '🍯 Met' },
									{ key: 'softdrink', label: '🥤 Softdrink' },
								].map((opt) => (
									<button
										key={opt.key}
										onClick={() => handleField('brew_type', opt.key)}
										className={`px-3 py-2 rounded-xl border text-sm font-bold transition text-left ${
											brew.brew_type === opt.key 
												? 'border-cyan-500 bg-cyan-500/10 text-white' 
												: 'border-zinc-800 text-zinc-400 hover:border-cyan-500/50'
										}`}
									>
										{opt.label}
									</button>
								))}
							</div>
						</div>
						{brew.brew_type === 'beer' && (
							<div className="space-y-4">
								<p className="text-xs uppercase font-bold text-zinc-400">Bier Details</p>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">ABV (%)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.abv || ''} onChange={(e) => updateData('abv', e.target.value)} placeholder="z.B. 5.6" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">IBU</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.ibu || ''} onChange={(e) => updateData('ibu', e.target.value)} placeholder="z.B. 35" />
									</div>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Original Gravity</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.og || ''} onChange={(e) => updateData('og', e.target.value)} placeholder="z.B. 1.056" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Final Gravity</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.fg || ''} onChange={(e) => updateData('fg', e.target.value)} placeholder="z.B. 1.012" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Farbe (SRM)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.srm || ''} onChange={(e) => updateData('srm', e.target.value)} placeholder="z.B. 8" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Hefe</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.yeast || ''} onChange={(e) => updateData('yeast', e.target.value)} placeholder="z.B. US-05" />
									</div>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Malzarten</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.malts || ''} onChange={(e) => updateData('malts', e.target.value)} placeholder="z.B. Pilsner, Cara" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Hopfenarten</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.hops || ''} onChange={(e) => updateData('hops', e.target.value)} placeholder="z.B. Citra, Mosaic" />
									</div>
								</div>
								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Dry Hop (g)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.dry_hop_g || ''} onChange={(e) => updateData('dry_hop_g', e.target.value)} placeholder="z.B. 120" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Kochzeit (min)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.boil_minutes || ''} onChange={(e) => updateData('boil_minutes', e.target.value)} placeholder="z.B. 60" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Maischetemp (°C)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.mash_temp_c || ''} onChange={(e) => updateData('mash_temp_c', e.target.value)} placeholder="z.B. 66" />
									</div>
								</div>
							</div>
						)}

						{brew.brew_type === 'wine' && (
							<div className="space-y-4">
								<p className="text-xs uppercase font-bold text-zinc-500">Wein Details</p>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">ABV (%)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.abv || ''} onChange={(e) => updateData('abv', e.target.value)} placeholder="z.B. 12.5" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Rebsorte(n)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.grapes || ''} onChange={(e) => updateData('grapes', e.target.value)} placeholder="z.B. Riesling, Merlot" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Jahrgang</label>
										<input type="number" className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.vintage ?? ''} onChange={(e) => updateData('vintage', e.target.value)} placeholder="z.B. 2024" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Region</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.region || ''} onChange={(e) => updateData('region', e.target.value)} placeholder="z.B. Pfalz" />
									</div>
									<div className="flex items-center gap-2 mt-6">
										<input type="checkbox" checked={!!brew.data?.oak_aged} onChange={(e) => updateData('oak_aged', e.target.checked)} className="h-5 w-5 rounded-lg border border-zinc-800 bg-zinc-900 accent-cyan-700 focus:ring-2 focus:ring-cyan-600/30" />
										<span className="text-sm text-zinc-300">Barrique (Holzfass)</span>
									</div>
								</div>
								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Fasslager (Monate)</label>
										<input type="number" className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.oak_months ?? ''} onChange={(e) => updateData('oak_months', e.target.value)} placeholder="z.B. 6" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Restzucker (g/l)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.residual_sugar_g_l || ''} onChange={(e) => updateData('residual_sugar_g_l', e.target.value)} placeholder="z.B. 6.5" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Säure (g/l)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.acidity_g_l || ''} onChange={(e) => updateData('acidity_g_l', e.target.value)} placeholder="z.B. 5.8" />
									</div>
								</div>
								<div className="flex items-center gap-2">
									<input type="checkbox" checked={!!brew.data?.sulfites} onChange={(e) => updateData('sulfites', e.target.checked)} className="h-5 w-5 rounded-lg border border-zinc-800 bg-zinc-900 accent-cyan-700 focus:ring-2 focus:ring-cyan-600/30" />
									<span className="text-sm text-zinc-300">Enthält Sulfite</span>
								</div>
							</div>
						)}

						{brew.brew_type === 'cider' && (
							<div className="space-y-4">
								<p className="text-xs uppercase font-bold text-zinc-500">Cider Details</p>
								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">ABV (%)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.abv || ''} onChange={(e) => updateData('abv', e.target.value)} placeholder="z.B. 6.2" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Apfelsorten</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.apples || ''} onChange={(e) => updateData('apples', e.target.value)} placeholder="z.B. Boskoop, Elstar" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Hefe</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.yeast || ''} onChange={(e) => updateData('yeast', e.target.value)} placeholder="z.B. Cider Yeast" />
									</div>
								</div>
								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Gärung</label>
										<select className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.fermentation || ''} onChange={(e) => updateData('fermentation', e.target.value)}>
											<option value="">– bitte wählen –</option>
											<option value="wild">Wild</option>
											<option value="cultured">Reinzucht</option>
										</select>
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Süßegrad</label>
										<select className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.sweetness || ''} onChange={(e) => updateData('sweetness', e.target.value)}>
											<option value="dry">Trocken</option>
											<option value="semi">Halbtrocken</option>
											<option value="sweet">Süß</option>
										</select>
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Kohlensäure (g/l)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.carbonation_g_l || ''} onChange={(e) => updateData('carbonation_g_l', e.target.value)} placeholder="z.B. 6" />
									</div>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">pH</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.pH || ''} onChange={(e) => updateData('pH', e.target.value)} placeholder="z.B. 3.5" />
									</div>
								</div>
							</div>
						)}

						{brew.brew_type === 'mead' && (
							<div className="space-y-4">
								<p className="text-xs uppercase font-bold text-zinc-500">Met Details</p>
								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">ABV (%)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.abv || ''} onChange={(e) => updateData('abv', e.target.value)} placeholder="z.B. 12.0" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Honigsorten</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.honey || ''} onChange={(e) => updateData('honey', e.target.value)} placeholder="z.B. Akazie, Waldhonig" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Hefe</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.yeast || ''} onChange={(e) => updateData('yeast', e.target.value)} placeholder="z.B. QA23" />
									</div>
								</div>
								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Zutaten (Frucht/Gewürz)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.adjuncts || ''} onChange={(e) => updateData('adjuncts', e.target.value)} placeholder="z.B. Zimt, Himbeere" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Aging (Monate)</label>
										<input type="number" className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.aging_months ?? ''} onChange={(e) => updateData('aging_months', e.target.value)} placeholder="z.B. 9" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Final Gravity</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.final_gravity || ''} onChange={(e) => updateData('final_gravity', e.target.value)} placeholder="z.B. 1.010" />
									</div>
								</div>
							</div>
						)}

						{brew.brew_type === 'softdrink' && (
							<div className="space-y-4">
								<p className="text-xs uppercase font-bold text-zinc-500">Softdrink Details</p>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Basis / Geschmack</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.base || ''} onChange={(e) => updateData('base', e.target.value)} placeholder="z.B. Zitrone & Ingwer" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Kohlensäure (g/l)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.carbonation_g_l || ''} onChange={(e) => updateData('carbonation_g_l', e.target.value)} placeholder="z.B. 5" />
									</div>
								</div>
								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Zucker (g/l)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.sugar_g_l || ''} onChange={(e) => updateData('sugar_g_l', e.target.value)} placeholder="z.B. 40" />
									</div>
									<div>
										<label className="text-xs uppercase font-bold text-zinc-500">Säure (pH)</label>
										<input className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white" value={brew.data?.acidity_ph || ''} onChange={(e) => updateData('acidity_ph', e.target.value)} placeholder="z.B. 3.2" />
									</div>
									<div className="flex items-center gap-2 mt-6">
										<input type="checkbox" checked={!!brew.data?.natural_flavors} onChange={(e) => updateData('natural_flavors', e.target.checked)} className="h-5 w-5 rounded-lg border border-zinc-800 bg-zinc-900 accent-cyan-700 focus:ring-2 focus:ring-cyan-600/30" />
										<span className="text-sm text-zinc-300">Natürliche Aromen</span>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<input type="checkbox" checked={!!brew.data?.coloring} onChange={(e) => updateData('coloring', e.target.checked)} className="h-5 w-5 rounded-lg border border-zinc-800 bg-zinc-900 accent-cyan-700 focus:ring-2 focus:ring-cyan-600/30" />
									<span className="text-sm text-zinc-300">Farbstoff verwendet</span>
								</div>
							</div>
						)}

						<div>
							<label className="text-xs uppercase font-bold text-cyan-400 mb-2 flex items-center justify-between">
								<span>Beschreibung</span>
								<button
									onClick={handleGenerateDescription}
									disabled={generatingDescription}
									className="text-[10px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-2 py-1 rounded-lg transition disabled:opacity-50 flex items-center gap-1"
								>
									{generatingDescription ? '⚡ Generiert...' : '✨ KI-Text'}
								</button>
							</label>
							<textarea
								value={brew.description || ''}
								onChange={(e) => handleField('description', e.target.value)}
								className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white min-h-[140px] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
								placeholder="Aromen, Malz, Hopfen, Frucht, Farbe..."
							/>
						</div>
					</div>

					<div className="space-y-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs uppercase tracking-[0.2em] text-blue-400 font-bold">KI-Assistent</p>
								<p className="text-lg font-bold">Rezept-Optimierung</p>
							</div>
							<button
								onClick={handleOptimizeRecipe}
								disabled={analyzingRecipe || !brew.name || !brew.style}
								className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-4 py-2 rounded-xl transition disabled:opacity-50 text-sm"
							>
								{analyzingRecipe ? '🔍 Analysiere...' : '🔬 Rezept analysieren'}
							</button>
						</div>

						<p className="text-sm text-zinc-400">
							Lass die KI dein Rezept analysieren und erhalte Verbesserungsvorschläge für Balance, Stil-Konformität und Zutaten.
						</p>

						{optimizationSuggestions.length > 0 && (
							<div className="space-y-3">
								<p className="text-xs uppercase tracking-[0.2em] text-blue-300 font-bold">Vorschläge</p>
								{optimizationSuggestions.map((suggestion, idx) => (
									<div
										key={idx}
										className="bg-zinc-900 border border-blue-500/20 rounded-xl p-4 flex gap-3"
									>
										<span className="text-blue-400 text-xl flex-shrink-0">💡</span>
										<p className="text-sm text-zinc-300 leading-relaxed">{suggestion}</p>
									</div>
								))}
							</div>
						)}

						{optimizationSuggestions.length === 0 && !analyzingRecipe && (
							<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
								<div className="text-4xl mb-3">🔬</div>
								<p className="text-sm text-zinc-500">Noch keine Analyse durchgeführt</p>
							</div>
						)}
					</div>
				</div>

				)}

				{activeTab === 'label' && (
					<div className="max-w-2xl mx-auto space-y-6">
						{!brew.id && (
							<div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 p-4 rounded-xl flex gap-3 items-center">
								<span className="text-2xl">⚠️</span>
								<p className="text-sm">Bitte speichere dein Rezept zuerst, um ein Label zu generieren.</p>
							</div>
						)}
						
						<div className={`space-y-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-5 ${!brew.id ? 'opacity-50 pointer-events-none' : ''}`}>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-bold">Label Design</p>
									<p className="text-lg font-bold">Vorschau & Generator</p>
								</div>
								{brew.id && (
									<Link href={`/brew/${brew.id}`} className="text-sm text-cyan-400 hover:text-cyan-300 transition">
										Öffentlich ansehen
									</Link>
								)}
							</div>

							<div className="aspect-square bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center">
								{brew.image_url ? (
									<img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover" />
								) : (
									<div className="text-center text-zinc-600">
										<div className="text-4xl mb-2">🏷️</div>
										<p className="text-sm">Noch kein Label generiert</p>
									</div>
								)}
							</div>

							<div className="space-y-2">
								<label className="text-xs uppercase font-bold text-purple-400">Zusatz-Prompt (optional)</label>
								<textarea
									value={extraPrompt}
									onChange={(e) => setExtraPrompt(e.target.value)}
									className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white min-h-[80px] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
									placeholder="z.B. Illustrativer Retro-Stil, satten Farben, florale Ornamente"
								/>
								<div className="flex gap-2">
									<button
										onClick={handleGenerate}
										disabled={generating || uploading}
										className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition disabled:opacity-60"
									>
										{generating ? 'Label wird generiert...' : 'KI-Label generieren'}
									</button>
									<button
										onClick={() => fileInputRef.current?.click()}
										disabled={uploading || generating}
										className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition disabled:opacity-60"
									>
										{uploading ? 'Upload...' : '📂 Eigenes hochladen'}
									</button>
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										className="hidden"
										onChange={handleFileUpload}
									/>
									<button
										onClick={() => setBrew(prev => ({ ...prev, image_url: null }))}
										disabled={uploading || generating}
										className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 hover:border-zinc-700 disabled:opacity-60"
									>
										Reset
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{activeTab === 'ratings' && (
					<div className="max-w-2xl mx-auto space-y-6">
						<div className="space-y-4 bg-zinc-950/60 border border-zinc-900 rounded-2xl p-5">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs uppercase tracking-[0.2em] text-green-400 font-bold">Bewertungen</p>
									<p className="text-lg font-bold">Verwalten & Moderieren</p>
								</div>
								<button
									onClick={() => loadRatings(brew.id!)}
									className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 hover:border-zinc-700"
								>
									Aktualisieren
								</button>
							</div>

							{ratingsMessage && (
								<div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200">
									{ratingsMessage}
								</div>
							)}

							{ratingsLoading ? (
								<div className="text-zinc-500">Lade Bewertungen…</div>
							) : ratings.length === 0 ? (
								<div className="text-zinc-500">Noch keine Bewertungen vorhanden.</div>
							) : (
								<div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
									{ratings.map((r) => (
										<div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
											<div className="flex items-start justify-between">
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
														{((r.author_name || r.name || 'A') as string)[0].toUpperCase()}
													</div>
													<div>
														<p className="font-bold text-white text-sm">{r.author_name || r.name || 'Anonym'}</p>
														<p className="text-[11px] text-zinc-500">
															{new Date(r.created_at).toLocaleDateString('de-DE')}
														</p>
													</div>
												</div>
												<div className="flex items-center gap-2">
													<div className="flex text-yellow-500">
														{[1,2,3,4,5].map(s => (
															<span key={s} className={r.rating >= s ? 'opacity-100' : 'opacity-30'}>★</span>
														))}
													</div>
													<span className="text-sm font-bold text-white">{r.rating}</span>
												</div>
											</div>

											{r.comment && (
												<p className="text-zinc-300 leading-relaxed mt-3">{r.comment}</p>
											)}

											<div className="flex items-center justify-between mt-4">
												<span className="text-[11px] uppercase tracking-widest text-zinc-500">Status: {r.moderation_status || 'pending'}</span>
												<div className="flex gap-2">
													<button
														onClick={() => moderateRating(r.id, 'auto_approved')}
														className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-xs font-bold hover:bg-emerald-500/30"
													>
														Freigeben
													</button>
													<button
														onClick={() => moderateRating(r.id, 'rejected')}
														className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-xs font-bold hover:bg-red-500/30"
													>
														Ablehnen
													</button>
													<button
														onClick={() => removeRating(r.id)}
														className="px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded text-xs font-bold hover:bg-zinc-700"
													>
														Löschen
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
