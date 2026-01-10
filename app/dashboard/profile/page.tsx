// Dashboard profile page migrated from admin.
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfileCompletionRing from "../components/ProfileCompletionRing";

export default function ProfilePage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [user, setUser] = useState<any>(null);

	const [profile, setProfile] = useState({
		brewery_name: '',
		location: '',
		founded_year: new Date().getFullYear().toString(),
		bio: '',
		website: '',
		logo_url: '',
		banner_url: ''
	});

	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [uploadingBanner, setUploadingBanner] = useState(false);
	const router = useRouter();

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	);

	useEffect(() => {
		checkAuth();
	}, []);

	async function checkAuth() {
		const { data: { user: currentUser } } = await supabase.auth.getUser();
		if (!currentUser) {
			router.push('/login');
			return;
		}
		setUser(currentUser);
		loadProfile(currentUser.id);
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
				banner_url: data.banner_url || ''
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
		<div className="max-w-3xl mx-auto space-y-8">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">Deine Brauerei 🏰</h2>
				<p className="text-zinc-400">Hier verwaltest du die Identität deiner Heimbrauerei.</p>
			</div>

			{/* Profil-Vervollständigungsstatus */}
			{(() => {
				const fields: Array<{ key: keyof typeof profile; label: string }> = [
					{ key: 'location', label: 'Standort' },
					{ key: 'website', label: 'Webseite' },
					{ key: 'bio', label: 'Über uns' },
				];
				const completed = fields.reduce((acc, f) => acc + (profile[f.key] ? 1 : 0), 0);
				const pending = fields.filter(f => !profile[f.key]).map(f => f.label);
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
						<span className="bg-black/70 px-4 py-2 rounded-lg text-sm font-bold border border-white/20">
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
							{profile.logo_url ? (
								<img src={profile.logo_url} className="w-full h-full object-cover" alt="Logo" />
							) : (
								<div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-cyan-600 to-blue-700">
									🏰
								</div>
							)}

							<label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition z-0">
								<span className="text-[10px] bg-black/70 px-2 py-1 rounded text-white font-bold">
									{uploadingLogo ? '...' : '📷'}
								</span>
								<input
									type="file"
									accept="image/*"
									className="hidden"
									onChange={(e) => uploadImage(e, 'logo')}
									disabled={uploadingLogo}
								/>
							</label>

							{profile.logo_url && (
								<button
									onClick={(e) => {
										e.preventDefault();
										deleteImage('logo');
									}}
									className="absolute bottom-2 right-1/2 translate-x-1/2 bg-red-500/80 hover:bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition z-20"
									title="Logo löschen"
								>
									Löschen
								</button>
							)}
						</div>
					</div>

					<div className="mt-12 mb-8 border-b border-zinc-800 pb-8">
						<h3 className="text-2xl font-bold text-white">{profile.brewery_name || user?.email}</h3>
						<p className="text-sm text-zinc-500">Braumeister seit {new Date(user?.created_at).getFullYear()}</p>
					</div>

					<div className="space-y-6">
						<div className="bg-gradient-to-r from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
							<div>
								<h4 className="text-sm font-bold text-white mb-1">🌍 Dein öffentliches Profil</h4>
								<p className="text-xs text-zinc-400">Teile diesen Link mit Freunden.</p>
							</div>
							<Link
								href={`/brewery/${user?.id}`}
								target="_blank"
								className="bg-zinc-950 hover:bg-black text-cyan-400 border border-zinc-700 px-3 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 w-full sm:w-auto"
								aria-label="Öffentliches Profil ansehen (öffnet in neuem Tab)"
							>
								Ansehen ↗
							</Link>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Name der Brauerei</label>
								<input
									type="text"
									value={profile.brewery_name}
									onChange={(e) => setProfile({ ...profile, brewery_name: e.target.value })}
									placeholder="z.B. Kellerbräu 3000"
									className="w-full bg-zinc-800 border-zinc-700 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Gründungsjahr</label>
								<input
									type="number"
									value={profile.founded_year}
									onChange={(e) => setProfile({ ...profile, founded_year: e.target.value })}
									placeholder="2024"
									className="w-full bg-zinc-800 border-zinc-700 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Standort / Stadt</label>
								<input
									type="text"
									value={profile.location}
									onChange={(e) => setProfile({ ...profile, location: e.target.value })}
									placeholder="z.B. München, Giesing"
									className="w-full bg-zinc-800 border-zinc-700 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Webseite / Social</label>
								<input
									type="text"
									value={profile.website}
									onChange={(e) => setProfile({ ...profile, website: e.target.value })}
									placeholder="https://instagram.com/..."
									className="w-full bg-zinc-800 border-zinc-700 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition"
								/>
							</div>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Über uns (Bio)</label>
							<textarea
								value={profile.bio}
								onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
								placeholder="Erzähle etwas über deine Brau-Philosophie..."
								className="w-full h-32 bg-zinc-800 border-zinc-700 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition"
							/>
						</div>

						<div className="pt-4 flex justify-end">
							<button
								id="saveBtn"
								onClick={saveProfile}
								disabled={saving}
								className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg shadow-cyan-900/20 disabled:opacity-50"
							>
								{saving ? 'Speichere...' : 'Profil Speichern'}
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-red-900/10 p-6 rounded-xl border border-red-900/30 flex justify-between items-center">
				<div>
					<h4 className="font-bold text-zinc-400">Account</h4>
					<p className="text-xs text-zinc-600">Du kannst dich jederzeit abmelden.</p>
				</div>
				<button
					onClick={() => supabase.auth.signOut().then(() => (window.location.href = '/login'))}
					className="text-red-400 hover:bg-red-900/20 px-4 py-2 rounded-lg text-sm font-bold transition"
				>
					Abmelden
				</button>
			</div>
		</div>
	);
}
