// Dashboard profile page migrated from admin.
'use client';

import { useEffect, useState } from 'react';
import { supabase, getActiveBrewery } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfileCompletionRing from "../components/ProfileCompletionRing";
import { useAuth } from '@/app/context/AuthContext';
import { getTierConfig } from '@/lib/tier-system';

export default function ProfilePage() {
	const { user, loading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	
	const [profile, setProfile] = useState<{
        display_name: string,
        location: string,
        founded_year: string,
        bio: string,
        website: string,
        logo_url: string,
        banner_url: string,
        tier?: string
    }>({
		display_name: '',
		location: '',
		founded_year: new Date().getFullYear().toString(),
		bio: '',
		website: '',
		logo_url: '',
		banner_url: '',
        tier: 'lehrling'
	});

	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [uploadingBanner, setUploadingBanner] = useState(false);
	const [activeBrewery, setActiveBrewery] = useState<any>(null);
	const router = useRouter();

	useEffect(() => {
		if (!authLoading) {
			if (!user) {
				router.push('/login');
			} else {
				initPage();
			}
		}
	}, [user, authLoading]);

	async function initPage() {
		if (!user) return;
		loadProfile(user.id);

		// Brauerei laden für den Link
		const brewery = await getActiveBrewery(user.id);
		if (brewery) setActiveBrewery(brewery);
	}

	async function loadProfile(userId: string) {
		setLoading(true);

		const { data } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', userId)
			.single();

		if (data) {
			setProfile({
				display_name: data.display_name || '',
				location: data.location || '',
				founded_year: data.founded_year?.toString() || '',
				bio: data.bio || '',
				website: data.website || '',
				logo_url: data.logo_url || '',
				banner_url: data.banner_url || '',
                tier: data.tier || 'lehrling'
			});
		}
		setLoading(false);
	}

	async function uploadImage(e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') {
		if (!e.target.files || e.target.files.length === 0 || !user) return;

		const file = e.target.files[0];
		const fileExt = file.name.split('.').pop();
		const fileName = `${user.id}-${type}-${Date.now()}.${fileExt}`;
		const filePath = `${fileName}`;

		if (type === 'logo') setUploadingLogo(true);
		else setUploadingBanner(true);

		try {
			const { error: uploadError } = await supabase.storage
				.from('brewery-assets')
				.upload(filePath, file);

			if (uploadError) throw uploadError;

			const { data: { publicUrl } } = supabase.storage
				.from('brewery-assets')
				.getPublicUrl(filePath);

			const updatedProfile = { ...profile, [`${type}_url`]: publicUrl };
			setProfile(updatedProfile);

			await supabase.from('profiles').update({ [`${type}_url`]: publicUrl }).eq('id', user.id);
		} catch (error: any) {
			alert('Upload fehlgeschlagen: ' + error.message);
		} finally {
			if (type === 'logo') setUploadingLogo(false);
			else setUploadingBanner(false);
		}
	}

	async function deleteImage(type: 'logo' | 'banner') {
		if (!user) return;
		if (!confirm(`Möchtest du dein ${type === 'logo' ? 'Logo' : 'Banner'} wirklich löschen?`)) return;

		const url = type === 'logo' ? profile.logo_url : profile.banner_url;
		if (!url) return;

		const fileName = url.split('/').pop();
		if (!fileName) return;

		try {
			const { error: storageError } = await supabase.storage
				.from('brewery-assets')
				.remove([fileName]);

			if (storageError) console.warn('Storage delete warning:', storageError);

			const { error: dbError } = await supabase.from('profiles')
				.update({ [`${type}_url`]: null })
				.eq('id', user.id);

			if (dbError) throw dbError;

			setProfile({ ...profile, [`${type}_url`]: '' });
		} catch (e: any) {
			alert('Fehler beim Löschen: ' + e.message);
		}
	}

	async function saveProfile() {
		if (!user) return;
		setSaving(true);

		const updates = {
			id: user.id,
			display_name: profile.display_name,
			location: profile.location,
			founded_year: parseInt(profile.founded_year) || null,
			bio: profile.bio,
			website: profile.website,
			updated_at: new Date(),
		};

		const { error } = await supabase.from('profiles').upsert(updates);

		if (error) {
			alert('Fehler beim Speichern: ' + error.message);
		} else {
			const btn = document.getElementById('saveBtn');
			if (btn) {
				const oldText = btn.innerText;
				btn.innerText = 'Gespeichert! ✅';
				setTimeout(() => (btn.innerText = oldText), 2000);
			}
		}
		setSaving(false);
	}

	if (loading) return <div className="p-10 text-center animate-pulse text-zinc-500 font-mono">Lade Profil...</div>;

	return (
		<div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
			<div>
				<h2 className="text-3xl font-black tracking-tight text-white mb-2">Dein Community Profil 🌍</h2>
				<p className="text-zinc-400 font-medium">Hier verwaltest du wie dich andere in der Community sehen.</p>
			</div>

			{/* Profil-Vervollständigungsstatus */}
			{(() => {
				const fields: Array<{ key: keyof typeof profile; label: string; isDone?: (v: any) => boolean }> = [
					{ key: 'display_name', label: 'Anzeigename' },
					{ key: 'founded_year', label: 'Dabei seit', isDone: (v) => !!(v && String(v).trim().length > 0) },
					{ key: 'logo_url', label: 'Profilbild' },
					{ key: 'banner_url', label: 'Banner' },
					{ key: 'location', label: 'Standort' },
					{ key: 'website', label: 'Webseite' },
					{ key: 'bio', label: 'Über mich' },
				];
				const isFilled = (key: keyof typeof profile, custom?: (v: any) => boolean) => {
					const val = profile[key];
					return custom ? custom(val) : !!(val && String(val).trim().length > 0);
				};

				const completed = fields.reduce((acc, f) => acc + (isFilled(f.key, f.isDone) ? 1 : 0), 0);
				const pending = fields.filter(f => !isFilled(f.key, f.isDone)).map(f => f.label);
				return (
					<ProfileCompletionRing
						completed={completed}
						total={fields.length}
						label="Profil-Vervollständigung"
						pendingLabels={pending}
					/>
				);
			})()}

			<div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
				{/* Banner Area */}
                <div className="h-56 w-full bg-zinc-900 border-b border-zinc-800 relative group">
					{profile.banner_url ? (
						<img src={profile.banner_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-700" alt="Banner" />
					) : (
						<div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 space-y-2 bg-[url('/brand/grid.svg')] bg-[length:40px_40px] bg-center">
							<span className="text-4xl opacity-20">📷</span>
                            <span className="text-xs uppercase tracking-widest font-bold">Kein Banner</span>
						</div>
					)}
                    
                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80"></div>

					<label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition duration-300 backdrop-blur-[2px]">
						<span className="bg-zinc-950/80 px-6 py-3 rounded-xl text-sm font-bold border border-zinc-700 text-white hover:border-cyan-500 hover:text-cyan-400 transition shadow-lg backdrop-blur-md">
							{uploadingBanner ? 'Lade hoch...' : '📷 Banner ändern'}
						</span>
						<input
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(e) => uploadImage(e, 'banner')}
							disabled={uploadingBanner}
						/>
					</label>

					{profile.banner_url && (
						<button
							onClick={() => deleteImage('banner')}
							className="absolute top-4 right-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition z-10 border border-red-500/20 hover:border-red-500"
							title="Banner löschen"
						>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
						</button>
					)}
				</div>

				<div className="p-8 relative">
                    {/* Avatar Container - Slightly protruding */}
					<div className="absolute -top-16 left-8">
						<div className="w-32 h-32 rounded-3xl border-4 border-zinc-950 bg-zinc-900 relative group overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-all duration-300">
							{(() => {
                                // Dynamic Avatar based on Tier
                                const tierConfig = getTierConfig(profile.tier || 'lehrling');
                                return (
                                    <div className="w-full h-full relative">
                                        <img src={tierConfig.avatarPath} className="w-full h-full object-cover" alt="User Avatar" />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col items-center justify-center h-full backdrop-blur-[1px]">
                                            <p className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Status</p>
                                            <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-950/50 border border-zinc-800" style={{ color: tierConfig.color }}>
                                                {tierConfig.displayName}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
						</div>
					</div>

					<div className="mt-14 mb-10 pb-8 flex justify-between items-end border-b border-zinc-800/50">
						<div>
                            <h3 className="text-3xl font-black text-white mb-1">{profile.display_name || 'Unbekannter Brauer'}</h3>
						    <p className="text-sm font-medium text-zinc-500 font-mono">MITGLIED SEIT {user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear()}</p>
                        </div>
                        {/* Status Badge */}
                         {(() => {
                                const tierConfig = getTierConfig(profile.tier || 'lehrling');
                                return (
                                   <div className="hidden md:flex flex-row-reverse items-center gap-3 pl-5 pr-2 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 shadow-sm">
                                         <div className="w-10 h-10 rounded-full border-2 bg-zinc-950 p-1 shadow-inner relative" style={{ borderColor: `${tierConfig.color}40` }}>
                                             <img src={tierConfig.avatarPath} className="w-full h-full object-cover rounded-full" alt={tierConfig.displayName} />
                                             <div className="absolute inset-0 rounded-full opacity-20" style={{ boxShadow: `0 0 10px ${tierConfig.color}` }}></div>
                                         </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Aktueller Rang</p>
                                            <p className="font-bold text-base leading-none" style={{ color: tierConfig.color }}>{tierConfig.displayName}</p>
                                        </div>
                                   </div>
                                );
                        })()}
					</div>

					<div className="space-y-8">
						<div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 group hover:border-zinc-700 transition">
							<div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                                    🌍
                                </div>
								<div>
									<h4 className="text-sm font-bold text-white mb-0.5">Dein öffentliches Profil</h4>
									<p className="text-xs text-zinc-400">Teile diesen Link mit Freunden.</p>
								</div>
							</div>
							<Link
								href={`/brewer/${user?.id}`}
								target="_blank"
								className="bg-zinc-950 hover:bg-black text-cyan-400 hover:text-cyan-300 border border-zinc-800 hover:border-cyan-900 px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 w-full sm:w-auto"
							>
								Öffnen ↗
							</Link>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
							<div className="space-y-2">
								<label className="text-[10px] items-center flex gap-2 font-black uppercase text-zinc-500 tracking-widest pl-1">
                                    Anzeigename
                                </label>
								<input
									type="text"
									value={profile.display_name}
									onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
									placeholder="Dein Name in der Community"
									className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none transition text-white placeholder-zinc-700 font-medium"
								/>
                                <p className="text-[10px] text-zinc-600 pl-1">So wirst du in den Bestenlisten angezeigt.</p>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] items-center flex gap-2 font-black uppercase text-zinc-500 tracking-widest pl-1">
                                    Dabei seit (Jahr)
                                </label>
								<input
									type="number"
									value={profile.founded_year}
									onChange={(e) => setProfile({ ...profile, founded_year: e.target.value })}
									placeholder="2024"
									className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none transition text-white placeholder-zinc-700 font-mono"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
							<div className="space-y-2">
								<label className="text-[10px] items-center flex gap-2 font-black uppercase text-zinc-500 tracking-widest pl-1">Standort / Homebase</label>
								<input
									type="text"
									value={profile.location}
									onChange={(e) => setProfile({ ...profile, location: e.target.value })}
									placeholder="z.B. München"
									className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none transition text-white placeholder-zinc-700 font-medium"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] items-center flex gap-2 font-black uppercase text-zinc-500 tracking-widest pl-1">Webseite / Social</label>
								<input
									type="text"
									value={profile.website}
									onChange={(e) => setProfile({ ...profile, website: e.target.value })}
									placeholder="https://instagram.com/..."
									className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none transition text-white placeholder-zinc-700 font-medium"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<label className="text-[10px] items-center flex gap-2 font-black uppercase text-zinc-500 tracking-widest pl-1">Über mich (Bio)</label>
							<textarea
								value={profile.bio}
								onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
								placeholder="Erzähle etwas über dich..."
								className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none transition text-white placeholder-zinc-700 resize-none font-medium"
							/>
                            <p className="text-[10px] text-zinc-600 pl-1">Markdown wird unterstützt.</p>
						</div>

						<div className="pt-6 border-t border-zinc-800 flex justify-end">
							<button
								id="saveBtn"
								onClick={saveProfile}
								disabled={saving}
								className="bg-cyan-500 text-black hover:bg-cyan-400 font-black py-3 px-8 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
							>
								{saving ? 'Speichere...' : 'Änderungen speichern'}
							</button>
						</div>
					</div>
				</div>
			</div>

            {/* Danger Zone */}
			<div className="border border-red-900/30 bg-red-950/5 rounded-3xl overflow-hidden mt-8">
                <div className="px-6 py-4 border-b border-red-900/30 bg-red-950/10 flex items-center gap-3">
                    <span className="text-red-500">⚠️</span>
                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest">Gefahrenzone</h3>
                </div>
				<div className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                        <h4 className="font-bold text-zinc-300">Sitzung beenden</h4>
                        <p className="text-xs text-zinc-500 mt-1 max-w-md">Hier meldest du dich von diesem Gerät ab. Deine Daten bleiben erhalten.</p>
                    </div>
                    <button
                        onClick={() => supabase.auth.signOut().then(() => (window.location.href = '/login'))}
                        className="text-red-400 hover:text-white hover:bg-red-600 px-6 py-2.5 rounded-xl text-sm font-bold transition border border-red-900/50 hover:border-red-500 whitespace-nowrap"
                    >
                        Abmelden
                    </button>
				</div>
			</div>
		</div>
	);
}
