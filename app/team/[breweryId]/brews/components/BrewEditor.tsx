'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getBreweryTierConfig } from '@/lib/tier-system';
import { checkAndGrantAchievements } from '@/lib/achievements';
import { useAchievementNotification } from '@/app/context/AchievementNotificationContext';
import { useAuth } from '@/app/context/AuthContext';
import { addToFeed } from '@/lib/feed-service';
import CrownCap from '@/app/components/CrownCap';

// Simple SVG Component to replace Heroicons
function ArrowLeftIcon({ className }: { className?: string }) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
			<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
		</svg>
	);
}

interface BrewForm {
	id?: string;
	name: string;
	style: string;
	brew_type: string;
	description?: string;
	image_url?: string | null;
	cap_url?: string | null;
	is_public: boolean;
	data?: any;
	remix_parent_id?: string | null;
}

function NumberInput({ 
  value, 
  onChange, 
  step = 1, 
  min = 0, 
  placeholder, 
  label 
}: { 
  value: any, 
  onChange: (val: string) => void, 
  step?: number, 
  min?: number, 
  placeholder?: string,
  label?: string
}) {
  const val = parseFloat(value) || 0;

  const update = (newVal: number) => {
    if (newVal < min) newVal = min;
    const precision = step.toString().split('.')[1]?.length || 0;
    onChange(newVal.toFixed(precision));
  };

  return (
    <div className="w-full">
      {label && <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">{label}</label>}
      <div className="flex items-center w-full bg-zinc-900 border border-zinc-800 rounded-xl transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 overflow-hidden">
        <button 
          onClick={() => update(val - step)}
          className="w-12 h-12 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition active:scale-90 flex-shrink-0"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
          </svg>
        </button>
        <input 
          type="number"
          step={step}
          className="flex-1 bg-transparent border-none text-center text-white font-bold text-lg h-12 focus:ring-0 outline-none placeholder:font-normal placeholder:text-zinc-700 appearance-none min-w-0" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)} 
          placeholder={placeholder} 
        />
        <button 
          onClick={() => update(val + step)}
          className="w-12 h-12 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition active:scale-90 flex-shrink-0"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Toggle({ 
  checked, 
  onChange, 
  label 
}: { 
  checked: boolean; 
  onChange: (checked: boolean) => void; 
  label: string; 
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 cursor-pointer hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200 group select-none outline-none w-full"
      type="button"
    >
      <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${checked ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
        {label}
      </span>
      
      <div className={`relative w-11 h-6 rounded-full transition-all duration-300 ease-in-out p-1 ${
        checked 
          ? 'bg-cyan-950/40 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
          : 'bg-zinc-950 border-zinc-800 shadow-inner'
      } border flex-shrink-0`}>
        <div className={`h-full aspect-square rounded-full transition-all duration-300 shadow-sm flex items-center justify-center ${
          checked 
            ? 'translate-x-5 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]' 
            : 'translate-x-0 bg-zinc-700'
        }`} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.25, 0.64, 1)' }}>
          <div className={`w-0.5 h-1.5 rounded-full transition-colors ${checked ? 'bg-white/50' : 'bg-zinc-800'}`} />
        </div>
      </div>
    </button>
  );
}

const CAP_ICONS = ['🍺', '🍷', '🍎', '🍯', '🥤', '🔥', '🌊', '🧬', '🚀', '🧪', '💎', '🎨', '🦴', '🌿', '🍄', '🍋'];

export default function BrewEditor({ breweryId, brewId }: { breweryId: string, brewId?: string }) {
	const router = useRouter();
	const { user, loading: authLoading } = useAuth();
	const id = brewId || 'new';
	const { showAchievement } = useAchievementNotification();

	const [loading, setLoading] = useState(true);
	const [breweryTier, setBreweryTier] = useState<string>('garage');
	const [saving, setSaving] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [generatingCap, setGeneratingCap] = useState(false);
	const [uploadingCap, setUploadingCap] = useState(false);
	const [generatingName, setGeneratingName] = useState(false);
	const [generatingDescription, setGeneratingDescription] = useState(false);
	const [analyzingRecipe, setAnalyzingRecipe] = useState(false);
	const [optimizationSuggestions, setOptimizationSuggestions] = useState<string[]>([]);
	const [message, setMessage] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'input' | 'label' | 'caps' | 'optimization' | 'ratings'>('input');
	const [extraPrompt, setExtraPrompt] = useState('');
	const [ratings, setRatings] = useState<any[]>([]);
	const [ratingsLoading, setRatingsLoading] = useState(false);
	const [ratingsMessage, setRatingsMessage] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const fileInputCapRef = useRef<HTMLInputElement>(null);
	const [brew, setBrew] = useState<BrewForm>({
		name: '',
		style: '',
		brew_type: 'beer',
		description: '',
		image_url: null,
		cap_url: null,
		is_public: false,
		data: {}
	});

	function updateData(key: string, value: any) {
		setBrew(prev => ({ ...prev, data: { ...(prev.data || {}), [key]: value } }));
	}

	useEffect(() => {
		if (!authLoading) {
			init();
		}
	}, [id, breweryId, authLoading]);

	async function init() {
		setLoading(true);
		
		if (!user) {
			const redirectPath = id === 'new' 
                ? `/team/${breweryId}/brews/new` 
                : `/team/${breweryId}/brews/${id}/edit`;
			router.push(`/login?redirect=${redirectPath}`);
			return;
		}
        
        // Fetch Brewery Tier
        const { data: bData } = await supabase.from('breweries').select('tier').eq('id', breweryId).maybeSingle();
        if (bData) setBreweryTier(bData.tier || 'garage');

		if (id !== 'new') {
			const { data, error } = await supabase
				.from('brews')
				.select('*')
				.eq('id', id)
				.eq('brewery_id', breweryId)
				.maybeSingle();

			if (error || !data) {
				router.push(`/team/${breweryId}/brews`);
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
		
		if (!user) return;

		if (id === 'new') {
			const tierConfig = getBreweryTierConfig(breweryTier as any);
			const { count } = await supabase
				.from('brews')
				.select('*', { count: 'exact', head: true })
				.eq('brewery_id', breweryId);

			if ((count || 0) >= tierConfig.limits.maxBrews) {
				setMessage(`Brauerei-Limit erreicht: ${tierConfig.displayName} erlaubt ${tierConfig.limits.maxBrews} Rezepte.`);
				setSaving(false);
				return;
			}

			const payload = {
				name: brew.name,
				style: brew.style,
				brew_type: brew.brew_type,
				description: brew.description,
				image_url: brew.image_url,
				cap_url: brew.cap_url,
				is_public: brew.is_public || false,
				data: brew.data || {},
				user_id: user.id,
				brewery_id: breweryId,
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

			// Feed Post
			addToFeed(breweryId, user, 'BREW_CREATED', {
				brew_id: data.id,
				brew_name: data.name
			});

			setBrew({ ...data, data: data.data || {} });
			setSaving(false);
			router.replace(`/team/${breweryId}/brews/${data.id}/edit`);
			await loadRatings(data.id);
			
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
				cap_url: brew.cap_url,
				is_public: brew.is_public,
				data: brew.data || {},
			})
			.eq('id', id)
            .eq('brewery_id', breweryId)
			.select()
			.single();

		if (error || !data) {
			setMessage(error?.message || 'Speichern fehlgeschlagen.');
		} else {
			setBrew({ ...data, data: data.data || {} });
			setMessage('Gespeichert.');

			if (data.id) await loadRatings(data.id);
			
			checkAndGrantAchievements(user.id).then(newAchievements => {
				newAchievements.forEach(achievement => showAchievement(achievement));
			}).catch(console.error);
		}
		setSaving(false);
	}

	async function moderateRating(ratingId: string, status: 'approved' | 'auto_approved' | 'rejected') {
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

			setRatingsMessage(status === 'approved' || status === 'auto_approved' ? 'Bewertung freigegeben.' : 'Bewertung abgelehnt.');
			await loadRatings(brew.id!);
		} catch (err: any) {
			setRatingsMessage(err?.message || 'Aktion fehlgeschlagen');
		}
	}

	async function removeRating(ratingId: string) {
		setRatingsMessage(null);
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

	async function deleteBrew() {
		if (!user || !brew.id) return;
		if (!confirm("Möchtest du dieses Rezept wirklich unwiderruflich löschen? \n\nHINWEIS: Alle befüllten Flaschen werden zurückgesetzt (auf 'Leer' gesetzt).")) return;

		setSaving(true);
		
		// Unlink bottles
		const { error: bottlesError } = await supabase
			.from('bottles')
			.update({ brew_id: null })
			.eq('brew_id', brew.id);
		
		if (bottlesError) console.error('Fehler beim Zurücksetzen der Flaschen:', bottlesError);

		// Remove Image if exists
		if (brew.image_url) {
			try {
				const url = new URL(brew.image_url);
				const fileName = url.pathname.split('/').pop();
				if (fileName) await supabase.storage.from('labels').remove([fileName]);
			} catch (e) {
				console.warn('Konnte Bild-URL nicht parsen:', e);
			}
		}

		// Delete Brew
		const { error } = await supabase.from('brews').delete().eq('id', brew.id);
		
		if (!error) {
			router.replace(`/team/${breweryId}/brews`);
		} else {
			setMessage('Fehler beim Löschen: ' + error.message);
			setSaving(false);
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
		setBrew(prev => {
			const next = { ...prev, [key]: value };
			
			if (key === 'brew_type' && (!prev.cap_url || CAP_ICONS.includes(prev.cap_url))) {
				const iconMap: Record<string, string> = {
					beer: '🍺',
					wine: '🍷',
					cider: '🍎',
					mead: '🍯',
					softdrink: '🥤'
				};
				next.cap_url = iconMap[value as string] || '🍺';
			}
			
			return next;
		});
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

			if (!user) throw new Error('Nicht authentifiziert');

			const { data, error } = await supabase
				.from('brews')
				.update({ image_url: imageUrl })
				.eq('id', brew.id)
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

	async function handleCapUpload(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!brew.id) {
			setMessage('Bitte zuerst speichern.');
			return;
		}

		setUploadingCap(true);
		try {
			const fileName = `cap-${brew.id}-${Date.now()}.${file.name.split('.').pop()}`;
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('labels')
				.upload(fileName, file, { upsert: true });

			if (uploadError) throw uploadError;

			const { data: urlData } = supabase.storage.from('labels').getPublicUrl(fileName);
			const imageUrl = urlData?.publicUrl;

			const { error } = await supabase
				.from('brews')
				.update({ cap_url: imageUrl })
				.eq('id', brew.id);

			if (error) throw error;

			setBrew(prev => ({ ...prev, cap_url: imageUrl }));
			setMessage('Kronkorken-Design hochgeladen!');
		} catch (err: any) {
			setMessage(err.message);
		} finally {
			setUploadingCap(false);
			if (fileInputCapRef.current) fileInputCapRef.current.value = '';
		}
	}

	async function handleGenerateCap() {
		if (!brew.id) {
			setMessage('Bitte zuerst speichern.');
			return;
		}

		setGeneratingCap(true);
		setMessage(null);

		try {
			const prompt = `A minimalist flat vector icon for a ${brew.brew_type} named "${brew.name}", style: ${brew.style}. Clean graphic on solid black background, highly iconic.`;
			
			const response = await fetch('/api/generate-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt,
					brewId: brew.id,
					type: 'cap'
				})
			});

			const data = await response.json();
			if (data.imageUrl) {
				setBrew(prev => ({ ...prev, cap_url: data.imageUrl }));
				setMessage('KI-Kronkorken generiert! ✨');
			} else {
				throw new Error(data.error || 'Fehler');
			}
		} catch (err: any) {
			setMessage('KI-Generierung fehlgeschlagen: ' + err.message);
		} finally {
			setGeneratingCap(false);
		}
	}

	if (loading) {
		return (
			<div className="bg-black text-white flex items-center justify-center p-20">
				<div className="text-center">
					<div className="text-5xl mb-4 animate-pulse">🧪</div>
					<p className="text-zinc-400">Lade Rezeptdaten...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="text-white min-h-screen pb-20">
			<div className="max-w-7xl mx-auto space-y-8">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div>
						<div className="flex items-center gap-2 mb-1">
							<p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold">Rezept Editor</p>
						</div>
						<h1 className="text-3xl md:text-5xl font-black tracking-tight">{id === 'new' ? 'Neues Rezept' : brew.name || 'Rezept bearbeiten'}</h1>
						<p className="text-zinc-400 mt-2">Hier entstehen deine Brau-Kreationen</p>
					</div>
					<div className="flex items-center gap-3 w-full md:w-auto">
						<button
							onClick={handleSave}
							disabled={saving}
							className="hidden md:flex flex-1 md:flex-none bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-cyan-500/30 transition disabled:opacity-60 text-center justify-center items-center"
						>
							{saving ? 'Speichern...' : 'Speichern'}
						</button>
					</div>
				</div>

				{message && (
					<div className="bg-zinc-900 border border-cyan-500/30 rounded-xl px-4 py-3 text-sm text-zinc-200">
						{message}
					</div>
				)}

				<div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start mt-4">
                    {/* Sidebar */}
                    <nav className="w-full md:w-64 flex-shrink-0 flex md:flex-col overflow-x-auto md:overflow-visible gap-2 md:sticky md:top-32 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-1 md:p-3 shadow-xl z-40 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                        {[
                            { id: 'input', label: 'Eingabe', icon: '📋' },
                            { id: 'label', label: 'Label', icon: '🏷️', hidden: id === 'new' },
                            { id: 'caps', label: 'Kronkorken', icon: '🟡', hidden: id === 'new' },
                            { id: 'optimization', label: 'Optimierung', icon: '🔬', hidden: id === 'new' },
                            { id: 'ratings', label: 'Bewertung', icon: '⭐', hidden: id === 'new' }
                        ].filter(t => !t.hidden).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-3 md:py-3.5 rounded-xl text-sm font-bold transition-all flex items-center gap-3 whitespace-nowrap flex-shrink-0 ${
                                    activeTab === tab.id
                                        ? 'bg-zinc-800 md:bg-cyan-950/30 text-white md:text-cyan-400 border border-zinc-700 md:border-cyan-500/30 shadow-lg'
                                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
                                }`}
                            >
                                <span className="text-lg">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Content Area */}
                    <main className="flex-1 w-full bg-zinc-900/50 rounded-3xl p-6 md:p-10 border border-zinc-800 space-y-8">
                        
                        {activeTab === 'input' && (
                            <div className="space-y-8">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold mb-1">Rezept</p>
                                    <h2 className="text-lg font-bold text-white">Basisdaten bearbeiten</h2>
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                        <div className="lg:col-span-8">
                                            <label className="text-xs uppercase font-bold text-cyan-400 mb-2 block">Name</label>
                                            <div className="flex items-center w-full bg-zinc-900 border border-zinc-800 rounded-xl transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 overflow-hidden pr-1.5">
                                                <input
                                                    value={brew.name}
                                                    onChange={(e) => handleField('name', e.target.value)}
                                                    className="flex-1 bg-transparent border-none px-3 py-2.5 text-white outline-none placeholder:text-zinc-600 min-w-0"
                                                    placeholder="z.B. Galaxy IPA"
                                                />
                                                <button
                                                    onClick={handleGenerateName}
                                                    disabled={generatingName}
                                                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold w-9 h-9 rounded-lg transition disabled:opacity-50 flex items-center justify-center whitespace-nowrap"
                                                    title={generatingName ? 'Wird generiert...' : 'KI-Name generieren'}
                                                >
                                                    {generatingName ? '⚡' : '✨'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="lg:col-span-4">
                                            <label className="text-xs uppercase font-bold text-cyan-400 mb-2 block">Stil</label>
                                            <input
                                                value={brew.style}
                                                onChange={(e) => handleField('style', e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600"
                                                placeholder="z.B. Hazy IPA, Rotwein"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-zinc-500 mb-2 block">Beschreibung</label>
                                        <div className="relative flex flex-col w-full bg-zinc-900 border border-zinc-800 rounded-xl transition focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 overflow-hidden">
                                            <textarea
                                                value={brew.description || ''}
                                                onChange={(e) => handleField('description', e.target.value)}
                                                className="w-full bg-transparent border-none px-3 py-3 text-white min-h-[120px] outline-none placeholder:text-zinc-600 resize-none flex-1 pb-12"
                                                placeholder="Aromen, Malz, Hopfen, Frucht, Farbe..."
                                            />
                                            <div className="absolute bottom-2 right-2">
                                                <button
                                                    onClick={handleGenerateDescription}
                                                    disabled={generatingDescription}
                                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold w-9 h-9 rounded-lg transition disabled:opacity-50 flex items-center justify-center shadow-lg"
                                                    title={generatingDescription ? 'Wird generiert...' : 'KI-Beschreibung generieren'}
                                                >
                                                    {generatingDescription ? '⚡' : '✨'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                                         <div className="flex-1">
                                             <div className="text-sm font-bold text-white mb-0.5">Sichtbarkeit</div>
                                             <div className="text-xs text-zinc-500">Öffentliche Rezepte sind für alle Nutzer & Brauereien sichtbar.</div>
                                         </div>
                                         <div className="w-full sm:w-auto">
                                             <Toggle label="Öffentlich" checked={brew.is_public} onChange={(val) => setBrew(prev => ({ ...prev, is_public: val }))} />
                                         </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <label className="text-xs uppercase font-bold text-zinc-500 mb-3 block">Getränke-Typ</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {[
                                            { key: 'beer', label: 'Bier', icon: '🍺' },
                                            { key: 'wine', label: 'Wein', icon: '🍷' },
                                            { key: 'cider', label: 'Cider', icon: '🍎' },
                                            { key: 'mead', label: 'Met', icon: '🍯' },
                                            { key: 'softdrink', label: 'Limo', icon: '🥤' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.key}
                                                onClick={() => handleField('brew_type', opt.key)}
                                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 active:scale-95 ${
                                                    brew.brew_type === opt.key 
                                                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500' 
                                                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                                                }`}
                                            >
                                                <span className="text-3xl mb-2 filter drop-shadow-md">{opt.icon}</span>
                                                <span className="text-xs font-bold uppercase tracking-wider">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic Fields based on Type */}
                                {brew.brew_type === 'beer' && (
                                    <div className="space-y-10 pt-4 border-t border-zinc-900">
                                        {/* Section: Messwerte */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">📊</div>
                                                Messwerte
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                <NumberInput label="Menge (Liter)" value={brew.data?.batch_size_liters || ''} onChange={(val) => updateData('batch_size_liters', val)} placeholder="20" step={0.5} />
                                                <NumberInput label="Ausbeute (%)" value={brew.data?.efficiency || ''} onChange={(val) => updateData('efficiency', val)} placeholder="75" />
                                                <NumberInput label="ABV (%)" value={brew.data?.abv || ''} onChange={(val) => updateData('abv', val)} placeholder="0.0" step={0.1} />
                                                <NumberInput label="IBU" value={brew.data?.ibu || ''} onChange={(val) => updateData('ibu', val)} placeholder="0" />
                                                <NumberInput label="Stammwürze (°P)" value={brew.data?.og || ''} onChange={(val) => updateData('og', val)} placeholder="12.0" step={0.1}/>
                                                <NumberInput label="Restextrakt (°P)" value={brew.data?.fg || ''} onChange={(val) => updateData('fg', val)} placeholder="3.0" step={0.1}/>
                                                <NumberInput label="Farbe (EBC)" value={brew.data?.color || ''} onChange={(val) => updateData('color', val)} placeholder="10" />
                                            </div>
                                        </div>

                                        {/* Section: Brauprozess */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">🌡️</div>
                                                Brauprozess
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Brautag</label>
                                                    <input 
                                                        type="date" 
                                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none"
                                                        value={brew.data?.brewed_at || ''} 
                                                        onChange={(e) => updateData('brewed_at', e.target.value)} 
                                                    />
                                                </div>
                                                <NumberInput label="Kochzeit (min)" value={brew.data?.boil_time || ''} onChange={(val) => updateData('boil_time', val)} placeholder="60" />
                                                <NumberInput label="Maischetemp. (°C)" value={brew.data?.mash_temp || ''} onChange={(val) => updateData('mash_temp', val)} placeholder="67" />
                                            </div>
                                        </div>

                                        {/* Section: Zutaten */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">🌾</div>
                                                Zutaten
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Malz</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.malts || ''} onChange={(e) => updateData('malts', e.target.value)} placeholder="z.B. Pilsner, Münchner..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Hefe</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.yeast || ''} onChange={(e) => updateData('yeast', e.target.value)} placeholder="z.B. Fermentis US-05" />
                                                </div>
                                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Hopfen</label>
                                                        <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.hops || ''} onChange={(e) => updateData('hops', e.target.value)} placeholder="z.B. Citra, Mosaic, Galaxy..." />
                                                        <p className="text-[10px] text-zinc-600 mt-1.5 ml-1">Mehrere Sorten mit Komma trennen</p>
                                                    </div>
                                                    <div>
                                                        <NumberInput label="Dry Hop (g)" value={brew.data?.dry_hop_g || ''} onChange={(val) => updateData('dry_hop_g', val)} placeholder="0" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {brew.brew_type === 'wine' && (
                                    <div className="space-y-10 pt-4 border-t border-zinc-900">
                                         {/* Section: Messwerte */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">📊</div>
                                                Messwerte
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                <NumberInput label="Menge (Liter)" value={brew.data?.batch_size_liters || ''} onChange={(val) => updateData('batch_size_liters', val)} placeholder="15" step={0.5} />
                                                <NumberInput label="Start-Dichte (Öchsle)" value={brew.data?.original_gravity || ''} onChange={(val) => updateData('original_gravity', val)} placeholder="85" />
                                                <NumberInput label="ABV (%)" value={brew.data?.abv || ''} onChange={(val) => updateData('abv', val)} placeholder="12.5" step={0.1} />
                                                <NumberInput label="Restzucker (g/l)" value={brew.data?.residual_sugar_g_l || ''} onChange={(val) => updateData('residual_sugar_g_l', val)} placeholder="6.5" step={0.1} />
                                                <NumberInput label="Säure (g/l)" value={brew.data?.acidity_g_l || ''} onChange={(val) => updateData('acidity_g_l', val)} placeholder="5.8" step={0.1} />
                                                <NumberInput label="Jahrgang" value={brew.data?.vintage || ''} onChange={(val) => updateData('vintage', val)} placeholder="2024" step={1} />
                                            </div>
                                        </div>

                                        {/* Section: Zutaten & Herkunft */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">🍇</div>
                                                Reben & Herkunft
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Rebsorte(n)</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.grapes || ''} onChange={(e) => updateData('grapes', e.target.value)} placeholder="z.B. Riesling, Merlot..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Region / Lage</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.region || ''} onChange={(e) => updateData('region', e.target.value)} placeholder="z.B. Pfalz, Mosel..." />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Ausbau */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">🍷</div>
                                                Ausbau
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="md:col-span-1">
                                                    <NumberInput label="Fasslager (Monate)" value={brew.data?.oak_months || ''} onChange={(val) => updateData('oak_months', val)} placeholder="0" />
                                                </div>
                                                <div className="flex flex-col gap-4 justify-end md:col-span-2">
                                                    <Toggle label="Barrique (Holzfass)" checked={!!brew.data?.oak_aged} onChange={(val) => updateData('oak_aged', val)} />
                                                    <Toggle label="Enthält Sulfite" checked={!!brew.data?.sulfites} onChange={(val) => updateData('sulfites', val)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {brew.brew_type === 'cider' && (
                                    <div className="space-y-10 pt-4 border-t border-zinc-900">
                                         {/* Section: Messwerte */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">📊</div>
                                                Messwerte
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                <NumberInput label="Menge (Liter)" value={brew.data?.batch_size_liters || ''} onChange={(val) => updateData('batch_size_liters', val)} placeholder="10" step={0.5} />
                                                <NumberInput label="Start-Dichte (SG)" value={brew.data?.original_gravity || ''} onChange={(val) => updateData('original_gravity', val)} placeholder="1.050" step={0.001} />
                                                <NumberInput label="ABV (%)" value={brew.data?.abv || ''} onChange={(val) => updateData('abv', val)} placeholder="6.2" step={0.1} />
                                                <NumberInput label="Kohlensäure (g/l)" value={brew.data?.carbonation_g_l || ''} onChange={(val) => updateData('carbonation_g_l', val)} placeholder="6" step={0.1} />
                                                <NumberInput label="pH-Wert" value={brew.data?.pH || ''} onChange={(val) => updateData('pH', val)} placeholder="3.5" step={0.1} />
                                            </div>
                                        </div>

                                        {/* Section: Zutaten */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">🍏</div>
                                                Zutaten
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Apfelsorten</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.apples || ''} onChange={(e) => updateData('apples', e.target.value)} placeholder="z.B. Boskoop, Elstar..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Hefe</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.yeast || ''} onChange={(e) => updateData('yeast', e.target.value)} placeholder="z.B. Cider Yeast" />
                                                </div>
                                            </div>
                                        </div>
                                         {/* Section: Prozess */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">⚙️</div>
                                                Verarbeitung
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Gärung</label>
                                                    <select className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none appearance-none" value={brew.data?.fermentation || ''} onChange={(e) => updateData('fermentation', e.target.value)}>
                                                        <option value="">– bitte wählen –</option>
                                                        <option value="wild">Wild (Spontan)</option>
                                                        <option value="cultured">Reinzucht (Kulturhefe)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Süßegrad</label>
                                                    <select className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none appearance-none" value={brew.data?.sweetness || ''} onChange={(e) => updateData('sweetness', e.target.value)}>
                                                        <option value="dry">Trocken</option>
                                                        <option value="semi">Halbtrocken</option>
                                                        <option value="sweet">Süß</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {brew.brew_type === 'mead' && (
                                    <div className="space-y-10 pt-4 border-t border-zinc-900">
                                         {/* Section: Messwerte */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">📊</div>
                                                Messwerte
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                <NumberInput label="Menge (Liter)" value={brew.data?.batch_size_liters || ''} onChange={(val) => updateData('batch_size_liters', val)} placeholder="10" step={0.5} />
                                                <NumberInput label="Start-Dichte (SG)" value={brew.data?.original_gravity || ''} onChange={(val) => updateData('original_gravity', val)} placeholder="1.100" step={0.001} />
                                                <NumberInput label="ABV (%)" value={brew.data?.abv || ''} onChange={(val) => updateData('abv', val)} placeholder="14.0" step={0.1} />
                                                <NumberInput label="Final Gravity" value={brew.data?.final_gravity || ''} onChange={(val) => updateData('final_gravity', val)} placeholder="1.010" step={0.001} />
                                                <NumberInput label="Reifezeit (Monate)" value={brew.data?.aging_months || ''} onChange={(val) => updateData('aging_months', val)} placeholder="6" />
                                            </div>
                                        </div>
                                         {/* Section: Zutaten */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">🍯</div>
                                                Zutaten
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Honigsorte(n)</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.honey || ''} onChange={(e) => updateData('honey', e.target.value)} placeholder="z.B. Akazie, Waldhonig..." />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Hefe</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.yeast || ''} onChange={(e) => updateData('yeast', e.target.value)} placeholder="z.B. Lalvin D-47, QA23" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Zusätze (Früchte / Gewürze)</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.adjuncts || ''} onChange={(e) => updateData('adjuncts', e.target.value)} placeholder="z.B. Himbeeren, Zimt, Vanille..." />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Nährstoffplan</label>
                                                    <textarea 
                                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600 min-h-[80px]" 
                                                        value={brew.data?.nutrient_schedule || ''} 
                                                        onChange={(e) => updateData('nutrient_schedule', e.target.value)} 
                                                        placeholder="z.B. TOSNA Schema: 24h, 48h, 72h und beim 1/3 Zuckerabbau..." 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {brew.brew_type === 'softdrink' && (
                                    <div className="space-y-10 pt-4 border-t border-zinc-900">
                                         {/* Section: Messwerte */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">📊</div>
                                                Messwerte
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                <NumberInput label="Menge (Liter)" value={brew.data?.batch_size_liters || ''} onChange={(val) => updateData('batch_size_liters', val)} placeholder="10" step={0.5} />
                                                <NumberInput label="Zucker (g/l)" value={brew.data?.sugar_g_l || ''} onChange={(val) => updateData('sugar_g_l', val)} placeholder="40" step={1} />
                                                <NumberInput label="Säure (pH)" value={brew.data?.acidity_ph || ''} onChange={(val) => updateData('acidity_ph', val)} placeholder="3.2" step={0.1} />
                                                <NumberInput label="Kohlensäure (g/l)" value={brew.data?.carbonation_g_l || ''} onChange={(val) => updateData('carbonation_g_l', val)} placeholder="5" step={0.1} />
                                            </div>
                                        </div>
                                         {/* Section: Zutaten */}
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">🍋</div>
                                                Inhalt
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Basis / Geschmack</label>
                                                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600" value={brew.data?.base || ''} onChange={(e) => updateData('base', e.target.value)} placeholder="z.B. Zitrone-Ingwer, Cola..." />
                                                </div>
                                                <div className="flex flex-col gap-4">
                                                    <Toggle label="Natürliche Aromen" checked={!!brew.data?.natural_flavors} onChange={(val) => updateData('natural_flavors', val)} />
                                                    <Toggle label="Farbstoff verwendet" checked={!!brew.data?.coloring} onChange={(val) => updateData('coloring', val)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                

                                <div className="pt-8 border-t border-zinc-900">
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm border border-zinc-700">📝</div>
                                        Sonstiges
                                    </h3>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Notizen / Details</label>
                                        <textarea 
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition outline-none placeholder:text-zinc-600 min-h-[120px]" 
                                            value={brew.data?.notes || ''} 
                                            onChange={(e) => updateData('notes', e.target.value)} 
                                            placeholder="Hier ist Platz für alles Weitere: Wasserprofil, Maischestruktur, pH-Wert Anpassungen, Pannen, Verkostungsnotizen..." 
                                        />
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                {brew.id && (
                                    <div className="pt-8 border-t border-zinc-800">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-red-950/10 border border-red-900/20 rounded-2xl p-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-red-500">Rezept löschen</h3>
                                                <p className="text-sm text-zinc-400 mt-1">
                                                    Diese Aktion kann nicht rückgängig gemacht werden. Alle verknüpften Flaschen werden zurückgesetzt.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={deleteBrew}
                                                disabled={saving}
                                                className="px-6 py-3 bg-red-950/30 border border-red-900/50 hover:bg-red-900/30 text-red-500 rounded-xl text-sm font-bold transition flex items-center gap-2 whitespace-nowrap w-full md:w-auto justify-center"
                                            >
                                                <span>🗑️</span>
                                                <span>Löschen</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'optimization' && (
                             <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-blue-400 font-bold mb-1">KI-Assistent</p>
                                        <h2 className="text-lg font-bold text-white">Rezept-Optimierung</h2>
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
                        )}

                        {activeTab === 'label' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-bold mb-1">Label Design</p>
                                        <h2 className="text-lg font-bold text-white">Vorschau & Generator</h2>
                                    </div>
                                    {brew.id && (
                                        <Link 
                                            href={`/brew/${brew.id}`} 
                                            target="_blank"
                                            className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-400 transition disabled:opacity-50"
                                            title="Öffentlich ansehen"
                                        >
                                            <span>🌍</span>
                                            <span className="hidden sm:inline text-sm font-bold">Ansehen</span>
                                        </Link>
                                    )}
                                </div>

                                <div className="aspect-square bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center max-w-sm mx-auto">
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
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <button
                                            onClick={handleGenerate}
                                            disabled={generating || uploading}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition disabled:opacity-60 flex items-center justify-center gap-2 min-h-[50px]"
                                        >
                                            {generating ? (
                                                <>
                                                    <span className="animate-spin">⏳</span>
                                                    <span>Wird generiert...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>✨</span>
                                                    <span>KI-Label generieren</span>
                                                </>
                                            )}
                                        </button>
                                        <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading || generating}
                                                className="px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition disabled:opacity-60 flex items-center justify-center gap-2 min-h-[50px] whitespace-nowrap"
                                            >
                                                {uploading ? 'Upload...' : '📂 Upload'}
                                            </button>
                                            <button
                                                onClick={() => setBrew(prev => ({ ...prev, image_url: null }))}
                                                disabled={uploading || generating || !brew.image_url}
                                                className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-400 hover:text-red-400 hover:border-red-900/50 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[50px]"
                                                title="Label entfernen"
                                            >
                                                🗑️ <span className="sm:hidden lg:inline">Reset</span>
                                            </button>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'caps' && (
                             <div className="space-y-6 text-center text-white">
                                <div className="space-y-8 relative overflow-hidden">
                                     {/* Header Info */}
                                    <div className="text-left">
                                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold mb-1">Digitale Abzeichen</p>
                                        <h2 className="text-lg font-bold text-white">Kronkorken-Designer</h2>
                                        <p className="text-zinc-500 text-sm mt-1 max-w-md leading-relaxed">
                                            Wähle ein Symbol für dein digitales Sammlerstück. Dieses Abzeichen wird an User vergeben, die deine Flaschen scannen.
                                        </p>
                                    </div>

                                    <div className="flex justify-center py-6 bg-zinc-950/50 rounded-2xl border border-zinc-900">
                                        <CrownCap 
                                            content={brew.cap_url} 
                                            tier="gold" 
                                            size="lg"
                                            className="hover:scale-105 transition-transform duration-500 cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-8 relative z-10 text-left">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-4">Standard Symbole</p>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                                                {CAP_ICONS.map(icon => (
                                                    <button
                                                        key={icon}
                                                        onClick={() => setBrew(prev => ({ ...prev, cap_url: icon }))
                                                        }
                                                        className={`h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                                                            brew.cap_url === icon 
                                                                ? 'bg-cyan-500 text-black scale-110 shadow-lg shadow-cyan-500/20' 
                                                                : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                                        }`}
                                                    >
                                                        <span className="text-xl">{icon}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <button 
                                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-4 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition disabled:opacity-60 flex items-center justify-center gap-3 min-h-[60px]"
                                                onClick={handleGenerateCap}
                                                disabled={generatingCap || uploadingCap}
                                            >
                                                {generatingCap ? (
                                                    <>
                                                        <span className="animate-spin text-xl">🧪</span>
                                                        <span className="uppercase text-xs font-black tracking-widest">Generiere...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-xl">✨</span>
                                                        <span className="text-xs font-black uppercase tracking-wider">mit KI generieren</span>
                                                    </>
                                                )}
                                            </button>
                                            
                                            <button 
                                                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 rounded-xl transition-all group flex items-center justify-center gap-3 text-zinc-400 hover:text-white disabled:opacity-50"
                                                onClick={() => fileInputCapRef.current?.click()}
                                                disabled={generatingCap || uploadingCap}
                                            >
                                                {uploadingCap ? (
                                                    <span className="animate-spin text-xl">⏳</span>
                                                ) : (
                                                    <>
                                                        <span className="text-xl">📂</span>
                                                        <span className="text-xs font-bold uppercase tracking-wider text-inherit">Eigener Icon-Upload</span>
                                                    </>
                                                )}
                                            </button>
                                            <input
                                                ref={fileInputCapRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleCapUpload}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ratings' && (
                             <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-green-400 font-bold mb-1">Bewertungen</p>
                                        <h2 className="text-lg font-bold text-white">Verwalten & Moderieren</h2>
                                    </div>
                                    <button
                                        onClick={() => loadRatings(brew.id!)}
                                        disabled={ratingsLoading}
                                        className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition disabled:opacity-50"
                                        title="Bewertungen aktualisieren"
                                    >
                                        <span className={`text-lg ${ratingsLoading ? 'animate-spin' : ''}`}>🔄</span>
                                        <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Aktualisieren</span>
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

                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 gap-4 pt-4 border-t border-zinc-800/50">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            r.moderation_status === 'auto_approved' || r.moderation_status === 'approved' 
                                                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                                                                : r.moderation_status === 'rejected'
                                                                ? 'bg-red-500'
                                                                : 'bg-amber-500 animate-pulse'
                                                        }`} />
                                                        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
                                                            {r.moderation_status || 'pending'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 sm:flex items-stretch gap-2 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => moderateRating(r.id, 'approved')}
                                                            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${
                                                                r.moderation_status === 'approved' || r.moderation_status === 'auto_approved'
                                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                                                    : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-400'
                                                            }`}
                                                        >
                                                            <span className="text-sm">✓</span>
                                                            <span>Freigeben</span>
                                                        </button>
                                                        <button
                                                            onClick={() => moderateRating(r.id, 'rejected')}
                                                            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${
                                                                r.moderation_status === 'rejected'
                                                                    ? 'bg-zinc-800 text-red-400 border-red-500/50'
                                                                    : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-red-500/50 hover:text-red-400'
                                                            }`}
                                                        >
                                                            <span className="text-sm">✕</span>
                                                            <span>Ablehnen</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if(confirm('Möchtest du diese Bewertung wirklich permanent löschen?')) removeRating(r.id);
                                                            }}
                                                            className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-2.5 bg-zinc-900/50 text-zinc-600 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-950/20 hover:text-red-500 hover:border-red-900/50 transition-all duration-300"
                                                        >
                                                            <span className="text-sm">🗑️</span>
                                                            <span>Löschen</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
				</div>
                 {/* Sticky Action Bar for Mobile */}
                <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-4 md:hidden z-50 flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/team/${breweryId}/brews`)}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                    >
                        ❌
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition disabled:opacity-60"
                    >
                        {saving ? 'Speichere...' : 'Speichern'}
                    </button>
                </div>
			</div>
		</div>
	);
}
