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
        brewery_name: string,
        location: string,
        founded_year: string,
        bio: string,
        website: string,
        logo_url: string,
        banner_url: string,
        tier?: string
    }>({
		brewery_name: '',
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
				brewery_name: data.brewery_name || '',
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
			brewery_name: profile.brewery_name,
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

	if (loading) return <div className="p-10 text-center animate-pulse">Lade Profil...</div>;

	return (
		<div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
			<div>
				<h2 className="text-3xl font-bold tracking-tight text-white">Dein Community Profil 🌍</h2>
				<p className="text-zinc-400">Hier verwaltest du wie dich andere in der Community sehen.</p>
			</div>

			{/* Profil-Vervollständigungsstatus */}
			{(() => {
				const fields: Array<{ key: keyof typeof profile; label: string; isDone?: (v: any) => boolean }> = [
					{ key: 'brewery_name', label: 'Anzeigename' },
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

			<div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
				<div className="h-48 w-full bg-zinc-800 relative group">
					{profile.banner_url ? (
						<img src={profile.banner_url} className="w-full h-full object-cover" alt="Banner" />
					) : (
						<div className="w-full h-full flex items-center justify-center text-zinc-600">
							<span className="text-sm uppercase tracking-widest font-bold">Kein Banner</span>
						</div>
					)}

					<label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition">
						<span className="bg-black/70 px-4 py-2 rounded-lg text-sm font-bold border border-white/20 text-white">
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
							className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition z-10"
							title="Banner löschen"
						>
							🗑️
						</button>
					)}
				</div>

				<div className="p-8 relative">
					<div className="absolute -top-16 left-8">
						<div className="w-32 h-32 rounded-full border-4 border-zinc-900 bg-zinc-800 relative group overflow-hidden shadow-2xl">
							{(() => {
                                // Dynamic Avatar based on Tier
                                const tierConfig = getTierConfig(profile.tier || 'lehrling');
                                return (
                                    <div className="w-full h-full relative">
                                        <img src={tierConfig.avatarPath} className="w-full h-full object-cover" alt="User Avatar" />
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                            <p className="text-[10px] text-white text-center px-2 font-bold leading-tight">
                                                Automatisch durch<br/>
                                                <span style={{ color: tierConfig.color }}>{tierConfig.displayName}</span><br/>
                                                Status
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
						</div>
					</div>

					<div className="mt-12 mb-8 border-b border-zinc-800 pb-8">
						<h3 className="text-2xl font-bold text-white">{profile.brewery_name || user?.email}</h3>
						<p className="text-sm text-zinc-500">Community Mitglied seit {user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear()}</p>
					</div>

					<div className="space-y-6">
						<div className="bg-gradient-to-r from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
							<div>
								<h4 className="text-sm font-bold text-white mb-1">🌍 Dein öffentliches Community Profil</h4>
								<p className="text-xs text-zinc-400">Teile diesen Link mit Freunden.</p>
							</div>
							<Link
								href={`/brewer/${user?.id}`}
								target="_blank"
								className="bg-zinc-950 hover:bg-black text-cyan-400 border border-zinc-700 px-3 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 w-full sm:w-auto"
								aria-label="Öffentliches Profil ansehen (öffnet in neuem Tab)"
							>
								Ansehen ↗
							</Link>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Anzeigename</label>
								<input
									type="text"
									value={profile.brewery_name}
									onChange={(e) => setProfile({ ...profile, brewery_name: e.target.value })}
									placeholder="Dein Name in der Community"
									className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition text-white placeholder-zinc-700"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Dabei seit</label>
								<input
									type="number"
									value={profile.founded_year}
									onChange={(e) => setProfile({ ...profile, founded_year: e.target.value })}
									placeholder="2024"
									className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition text-white placeholder-zinc-700"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Standort / Homebase</label>
								<input
									type="text"
									value={profile.location}
									onChange={(e) => setProfile({ ...profile, location: e.target.value })}
									placeholder="z.B. München"
									className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition text-white placeholder-zinc-700"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Webseite / Social</label>
								<input
									type="text"
									value={profile.website}
									onChange={(e) => setProfile({ ...profile, website: e.target.value })}
									placeholder="https://instagram.com/..."
									className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition text-white placeholder-zinc-700"
								/>
							</div>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Über mich (Bio)</label>
							<textarea
								value={profile.bio}
								onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
								placeholder="Erzähle etwas über dich..."
								className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition text-white placeholder-zinc-700"
							/>
						</div>

						<div className="pt-4 flex justify-end">
							<button
								id="saveBtn"
								onClick={saveProfile}
								disabled={saving}
								className="bg-white hover:bg-gray-200 text-black font-black py-3 px-8 rounded-xl transition disabled:opacity-50"
							>
								{saving ? 'Speichere...' : 'Profil Speichern'}
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-red-500/5 p-6 rounded-xl border border-red-500/10 flex justify-between items-center">
				<div>
					<h4 className="font-bold text-zinc-400">Abmelden</h4>
					<p className="text-xs text-zinc-600">Sitzung beenden.</p>
				</div>
				<button
					onClick={() => supabase.auth.signOut().then(() => (window.location.href = '/login'))}
					className="text-red-400 hover:bg-red-950/30 px-4 py-2 rounded-lg text-sm font-bold transition border border-transparent hover:border-red-900"
				>
					Abmelden
				</button>
			</div>
		</div>
	);
}
