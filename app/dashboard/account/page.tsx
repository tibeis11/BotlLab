// Dashboard account settings page migrated from admin.
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function AccountPage() {
	const { user, loading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);

	// Password State
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	// Email State
	const [email, setEmail] = useState('');
	const [newEmail, setNewEmail] = useState('');
	const [emailLoading, setEmailLoading] = useState(false);

	const router = useRouter();

	useEffect(() => {
		if (!authLoading) {
			if (!user) {
				router.push('/login');
			} else {
				setEmail(user.email || '');
				setLoading(false);
			}
		}
	}, [user, authLoading]);

	async function handleUpdatePassword(e: React.FormEvent) {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			alert('Die Passwörter stimmen nicht überein!');
			return;
		}

		if (newPassword.length < 6) {
			alert('Das Passwort muss mindestens 6 Zeichen lang sein.');
			return;
		}

		try {
			setPasswordLoading(true);
			const { error } = await supabase.auth.updateUser({ password: newPassword });

			if (error) throw error;

			alert('Passwort erfolgreich geändert! 🔒');
			setNewPassword('');
			setConfirmPassword('');
		} catch (error: any) {
			alert('Fehler beim Ändern des Passworts: ' + error.message);
		} finally {
			setPasswordLoading(false);
		}
	}

	async function handleUpdateEmail(e: React.FormEvent) {
		e.preventDefault();
		if (!newEmail || newEmail === email) return;

		try {
			setEmailLoading(true);
			const { error } = await supabase.auth.updateUser({ email: newEmail });

			if (error) throw error;

			alert('Bestätigungs-Link wurde an die neue E-Mail-Adresse gesendet! 📧 Bitte überprüfe dein Postfach.');
			setNewEmail('');
		} catch (error: any) {
			alert('Fehler beim Ändern der E-Mail: ' + error.message);
		} finally {
			setEmailLoading(false);
		}
	}

	async function deleteAccount() {
		if (!confirm('Willst du dein Konto endgültig löschen? Dies kann nicht rückgängig gemacht werden.')) return;
		const { data: sessionData } = await supabase.auth.getSession();
		const token = sessionData?.session?.access_token;
		if (!token) { alert('Kein Token gefunden. Bitte neu einloggen.'); return; }
		try {
			const res = await fetch('/api/delete-account', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body?.error || 'Löschen fehlgeschlagen');
			}
			await supabase.auth.signOut();
			router.push('/login');
		} catch (e: any) {
			alert(e.message);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<div className="animate-spin text-4xl">🍺</div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto py-8 space-y-8">
			<div>
				<h1 className="text-3xl font-black text-foreground mb-2">Kontoeinstellungen</h1>
				<p className="text-zinc-400">Verwalte deine Zugangsdaten und Sicherheitseinstellungen.</p>
			</div>

			<div className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
				<h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
					<span>🔒</span> Passwort ändern
				</h2>

				<form onSubmit={handleUpdatePassword} className="space-y-4">
					<div>
						<label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
							Neues Passwort
						</label>
						<div className="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="••••••••"
								className="w-full bg-background/50 border border-border p-4 pr-12 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition text-foreground placeholder:text-zinc-600"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground transition"
							>
								{showPassword ? (
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
										<path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
									</svg>
								) : (
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
										<path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
										<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
									</svg>
								)}
							</button>
						</div>
					</div>

					<div>
						<label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
							Passwort bestätigen
						</label>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="••••••••"
							className="w-full bg-background/50 border border-border p-4 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition text-foreground placeholder:text-zinc-600"
						/>
					</div>

					<button
						type="submit"
						disabled={passwordLoading || !newPassword}
						className="bg-brand text-black font-bold px-6 py-2.5 rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{passwordLoading ? 'Speichere...' : 'Passwort aktualisieren'}
					</button>
				</form>
			</div>

			<div className="bg-surface border border-border rounded-2xl p-6 opacity-80 hover:opacity-100 transition shadow-xl">
				<h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
					<span>📧</span> E-Mail Adresse
				</h2>

				<p className="text-sm text-zinc-400 mb-4 bg-background/50 p-3 rounded-lg border border-border">
					Aktuelle E-Mail: <span className="text-white font-mono ml-2">{email}</span>
				</p>

				<form onSubmit={handleUpdateEmail} className="space-y-4">
					<div>
						<label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
							Neue E-Mail Adresse
						</label>
						<input
							type="email"
							value={newEmail}
							onChange={(e) => setNewEmail(e.target.value)}
							placeholder="neue@email.de"
							className="w-full bg-background/50 border border-border p-4 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition text-foreground placeholder:text-zinc-600"
						/>
					</div>

					<button
						type="submit"
						disabled={emailLoading || !newEmail || newEmail === email}
						className="bg-zinc-800 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{emailLoading ? 'Sende...' : 'E-Mail ändern'}
					</button>
				</form>
			</div>

			<div className="bg-red-950/20 border border-red-800/40 rounded-2xl p-6 shadow-xl">
				<h2 className="text-xl font-bold mb-2 text-red-400 flex items-center gap-2">
					<span>🗑️</span> Konto löschen
				</h2>
				<p className="text-sm text-red-300 mb-4">Dies entfernt dauerhaft alle deine Daten: Profil, Rezepte, Flaschen und Medien.</p>
				<button onClick={deleteAccount} className="px-4 py-3 rounded-xl bg-red-500 text-black font-bold hover:bg-red-400 transition">
					Konto endgültig löschen
				</button>
			</div>

		</div>
	);
}
