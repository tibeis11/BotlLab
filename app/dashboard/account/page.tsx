// Dashboard account settings page - merged with Profile settings
'use client';

import { useEffect, useState } from 'react';
import { supabase, getUserBreweries } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import ProfileCompletionRing from "../components/ProfileCompletionRing";
import { getTierConfig } from '@/lib/tier-system';
import PremiumBadge from '@/app/components/PremiumBadge';
import AICreditsDisplay from '@/app/components/AICreditsDisplay';
import PremiumFeatureLock from '@/app/components/PremiumFeatureLock';
import { SubscriptionTier } from '@/lib/premium-config';
import { redeemCode } from '@/lib/actions/premium-actions';

export default function AccountPage() {
	const { user, loading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
    
	// Access Code State
	const [redeemInput, setRedeemInput] = useState('');
	const [redeemLoading, setRedeemLoading] = useState(false);
	const [redeemMessage, setRedeemMessage] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // Global State
	const router = useRouter();

    // Menu State
    const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'access' | 'security' | 'teams' | 'danger' | 'privacy'>('profile');

    // --- PROFILE STATE ---
    const [savingProfile, setSavingProfile] = useState(false);
	const [profile, setProfile] = useState<{
        display_name: string,
        location: string,
        founded_year: string,
        bio: string,
        website: string,
        tier?: string,
        analytics_opt_out: boolean,
        subscription_tier: SubscriptionTier,
        subscription_status: string
    }>({
		display_name: '',
		location: '',
		founded_year: new Date().getFullYear().toString(),
		bio: '',
		website: '',
        tier: 'lehrling',
        analytics_opt_out: false,
        subscription_tier: 'free',
        subscription_status: 'active'
	});
	// Uploading state not needed for tier-based avatar



	// --- ACCOUNT STATE ---
	// Password State
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	// Email State
	const [email, setEmail] = useState('');
	const [newEmail, setNewEmail] = useState('');
	const [emailLoading, setEmailLoading] = useState(false);

    // --- TEAMS STATE ---
    const [myTeams, setMyTeams] = useState<any[]>([]);
    const [joinCode, setJoinCode] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);

    // Derived State
    const currentTier = getTierConfig(profile.tier || 'lehrling');

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
        // Load Account Data
        setEmail(user.email || '');
        
        // Load Profile Data
        await loadProfile(user.id);
        
        // Load Teams
        const teams = await getUserBreweries(user.id);
        setMyTeams(teams);

        setLoading(false);
    }

    // --- PROFILE HANDLERS ---
    async function loadProfile(userId: string) {
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
                tier: data.tier || 'lehrling',
                analytics_opt_out: data.analytics_opt_out || false,
                subscription_tier: (data.subscription_tier as SubscriptionTier) || 'free',
                subscription_status: data.subscription_status || 'active'
			});
		}
	}

    // No uploadImage/deleteImage needed - Avatar controlled by Tier system

	async function saveProfile() {
		if (!user) return;
		setSavingProfile(true);

        // Security Check: Prevent "admin" display name
        if (profile.display_name.trim().toLowerCase() === 'admin') {
            // Check if user is ALREADY admin (allowed to keep it)
            const { data: currentProfile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
            if (currentProfile?.display_name !== 'admin') {
                alert('Der Benutzername "admin" ist reserviert und kann nicht verwendet werden.');
                setSavingProfile(false);
                return;
            }
        }

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
		setSavingProfile(false);
	}


    // --- TEAM HANDLERS ---

    async function handleJoinTeam(e: React.FormEvent) {
        e.preventDefault();
        if(!joinCode.trim() || !user) return;
        setJoinLoading(true);

        try {
             // 1. Check if brewery exists by invite code
             const { data: brewery, error: fetchError } = await supabase
                 .from('breweries')
                 .select('id, name')
                 .eq('invite_code', joinCode.trim())
                 .single();

             if (fetchError || !brewery) throw new Error("Squad nicht gefunden. Code prüfen.");

             // 2. Join as Member
             const { error: joinError } = await supabase
                .from('brewery_members')
                .insert({
                    brewery_id: brewery.id,
                    user_id: user.id,
                    role: 'member'
                });
            
             if (joinError) {
                 if (joinError.code === '23505') throw new Error(`Du bist bereits Mitglied im Team "${brewery.name}".`);
                 throw joinError;
             }

             alert(`Erfolgreich dem Team "${brewery.name}" beigetreten! 🎉`);
             setJoinCode('');
             
             // Refresh list
             const teams = await getUserBreweries(user.id);
             setMyTeams(teams);

        } catch (err: any) {
            alert(err.message || "Fehler beim Beitreten.");
        } finally {
            setJoinLoading(false);
        }
    }

    async function handleLeaveTeam(breweryId: string, breweryName: string) {
        if(!user) return;
        if(!confirm(`Möchtest du das Team "${breweryName}" wirklich verlassen?`)) return;

        try {
            const { error } = await supabase
                .from('brewery_members')
                .delete()
                .eq('brewery_id', breweryId)
                .eq('user_id', user.id);

            if(error) throw error;

            // Optimistic Remove
            setMyTeams(prev => prev.filter(t => t.id !== breweryId));

        } catch(e: any) {
            alert("Fehler: " + e.message);
        }
    }

	async function handleRedeemEnterpriseCode(e: React.FormEvent) {
		e.preventDefault();
		if (!redeemInput.trim()) return;
		setRedeemLoading(true);
		setRedeemMessage(null);

		try {
			const res = await redeemCode(redeemInput);
			if (res.success) {
				setRedeemMessage({ type: 'success', msg: res.message });
				setRedeemInput('');
				if (user) loadProfile(user.id); // Reload to show new status
			} else {
				setRedeemMessage({ type: 'error', msg: res.error || res.message });
			}
		} catch (err) {
			setRedeemMessage({ type: 'error', msg: 'Ein technischer Fehler ist aufgetreten.' });
		} finally {
			setRedeemLoading(false);
		}
	}

    // --- ACCOUNT HANDLERS ---

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

    async function togglePrivacy() {
        if (!user) return;
        const newVal = !profile.analytics_opt_out;
        
        // Optimistic UI update
        setProfile(prev => ({ ...prev, analytics_opt_out: newVal }));
        
        const { error } = await supabase
            .from('profiles')
            .update({ analytics_opt_out: newVal })
            .eq('id', user.id);
            
        if (error) {
            // Revert on error
            setProfile(prev => ({ ...prev, analytics_opt_out: !newVal }));
            alert('Fehler beim Speichern der Einstellung: ' + error.message);
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

    const menuItems = [
        { id: 'profile', label: 'Profil', icon: '👤' },
        { id: 'subscription', label: 'Abo & Premium', icon: '✨' },
        { id: 'teams', label: 'Teams', icon: '🏭' },
        { id: 'access', label: 'Zugangsdaten', icon: '📧' },
        { id: 'security', label: 'Sicherheit', icon: '🔒' },
        { id: 'privacy', label: 'Privatsphäre', icon: '🕵️' },
        { id: 'danger', label: 'Account', icon: '⚠️' }
    ];

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<span className="animate-spin text-4xl">🍺</span>
			</div>
		);
	}

	return (
		<div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
				<h1 className="text-3xl font-black text-white mb-2">Einstellungen</h1>
				<p className="text-zinc-400 font-medium mb-8">Verwalte dein Profil, deine Zugangsdaten und Sicherheitseinstellungen.</p>
			</div>

            <div className="md:flex gap-8 lg:gap-12 items-start">
			
                {/* Sidebar Menu */}
                <div className="w-full md:w-64 flex-shrink-0 mb-8 md:mb-0 md:sticky md:top-32 z-20">
                    <div className="bg-zinc-900/50 md:bg-zinc-900 md:border md:border-zinc-800 rounded-2xl p-1 md:p-3 overflow-x-auto flex md:flex-col gap-2 no-scrollbar border border-zinc-800 md:border-none shadow-xl md:shadow-none backdrop-blur-md">
                        {menuItems.map(item => {
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as any)}
                                    className={`flex whitespace-nowrap items-center gap-3 px-5 py-3 md:py-3.5 rounded-xl text-sm font-bold transition-all duration-200 border ${
                                        isActive 
                                        ? 'bg-zinc-800 md:bg-cyan-950/30 text-white md:text-cyan-400 border-zinc-700 md:border-cyan-500/30 shadow-lg' 
                                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 border-transparent'
                                    }`}
                                >
                                    <span className={`text-lg transition-transform ${isActive ? 'scale-110' : 'grayscale opacity-70'}`}>{item.icon}</span>
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 md:bg-zinc-900/50 md:backdrop-blur-sm md:border md:border-zinc-800 md:rounded-3xl pt-0 md:p-10 min-h-[400px] md:shadow-2xl relative overflow-hidden group">
                     {/* Decorative Gradient Background */}
                    <div className="absolute top-0 right-0 p-40 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -mt-20 -mr-20 group-hover:bg-cyan-500/10 transition-colors duration-1000 hidden md:block"></div>

                    <div className="relative z-10 w-full max-w-2xl">
                        
                        {/* --- SUBSCRIPTION TAB --- */}
                        {activeTab === 'subscription' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">Dein Abonnement</h2>
                                    <p className="text-sm text-zinc-400">Verwalte deinen Premium-Status und AI Credits.</p>
                                </div>

                                <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Aktueller Plan</p>
                                            <div className="flex items-center gap-3">
                                                 <span className="text-2xl font-black text-white capitalize">{profile.subscription_tier}</span>
                                                 <PremiumBadge tier={profile.subscription_tier} size="lg" />
                                            </div>
                                            <p className="text-sm text-zinc-400 mt-1 capitalize">Status: {profile.subscription_status}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-zinc-800">
                                         <AICreditsDisplay userId={user?.id || ''} />
                                    </div>
                                    
                                    {profile.subscription_tier === 'free' && (
                                        <div className="pt-4 border-t border-zinc-800">
                                            <h3 className="font-bold text-white mb-2">Upgrade Möglichkeiten</h3>
                                            <div className="grid gap-3">
                                                <div className="p-4 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-amber-500">Heimbrauer (Brewer)</h4>
                                                        <p className="text-xs text-zinc-400">50 Credits, Custom Logos</p>
                                                    </div>
                                                    <button className="px-4 py-2 bg-amber-500 text-black font-bold text-sm rounded-lg hover:bg-amber-400 transition cursor-not-allowed opacity-75">
                                                        Bald verfügbar
                                                    </button>
                                                </div>
                                                <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-xl flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-indigo-500">Brauerei (Business)</h4>
                                                        <p className="text-xs text-zinc-400">Unbegrenzt Credits, Teams</p>
                                                    </div>
                                                    <button className="px-4 py-2 bg-indigo-500 text-white font-bold text-sm rounded-lg hover:bg-indigo-400 transition cursor-not-allowed opacity-75">
                                                        Bald verfügbar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Code Redemption Section */}
                                    <div className="pt-6 border-t border-zinc-800 space-y-4">
                                        <div>
                                            <h3 className="font-bold text-white mb-1.5 text-sm uppercase tracking-wider">Enterprise-Code einlösen</h3>
                                            <p className="text-xs text-zinc-500">Hast du einen exklusiven Zugangscode erhalten? Gib ihn hier ein.</p>
                                        </div>

                                        <form onSubmit={handleRedeemEnterpriseCode} className="flex flex-col sm:flex-row gap-3">
                                            <div className="flex-1">
                                                <input 
                                                    type="text"
                                                    value={redeemInput}
                                                    onChange={e => setRedeemInput(e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none transition-all placeholder:text-zinc-700 font-mono"
                                                    placeholder="LAB-XXXX-XXXX"
                                                    disabled={redeemLoading}
                                                />
                                            </div>
                                            <button 
                                                type="submit"
                                                disabled={redeemLoading || !redeemInput.trim()}
                                                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold border border-zinc-700 transition disabled:opacity-50 whitespace-nowrap"
                                            >
                                                {redeemLoading ? 'Prüfe...' : 'Aktivieren'}
                                            </button>
                                        </form>

                                        {redeemMessage && (
                                            <div className={`text-xs font-bold px-4 py-2 rounded-lg border animate-in fade-in slide-in-from-top-1 ${
                                                redeemMessage.type === 'success' 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                            }`}>
                                                {redeemMessage.type === 'success' ? '✅ ' : '❌ '}
                                                {redeemMessage.msg}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- PROFILE TAB --- */}
                        {activeTab === 'profile' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">Dein öffentliches Profil</h2>
                                    <p className="text-sm text-zinc-400">So wirst du in der Community gesehen.</p>
                                </div>

                                {/* Profil-Vervollständigungsstatus */}
                                {(() => {
                                    const fields: Array<{ key: keyof typeof profile; label: string; isDone?: (v: any) => boolean }> = [
                                        { key: 'display_name', label: 'Anzeigename' },
                                        { key: 'founded_year', label: 'Dabei seit', isDone: (v) => !!(v && String(v).trim().length > 0) },
                                        { key: 'location', label: 'Standort' },
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
                                
                                <form className="space-y-8">
                                    <div className="md:bg-zinc-950/50 px-0 md:p-8 md:rounded-3xl md:border md:border-zinc-800 space-y-8 md:shadow-inner">
                                        
                                        {/* Avatar Display - Controlled by Tier System */}
                                        <div className="flex flex-col sm:flex-row items-center gap-8">
                                            <div className="relative group">
                                                <div className="w-32 h-32 rounded-full border-4 border-zinc-900 bg-zinc-950 shadow-xl overflow-hidden relative">
                                                    <img src={currentTier.avatarPath} className="w-full h-full object-cover opacity-80" alt={currentTier.displayName} />
                                                    <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" style={{ boxShadow: `inset 0 0 20px ${currentTier.color}20` }}></div>
                                                </div>
                                                {/* Tier Badge */}
                                                <div className="absolute -bottom-2 md:-right-2 right-[25%] bg-zinc-900 text-xs font-black uppercase text-white px-3 py-1 rounded-full border border-zinc-800 shadow-lg">
                                                    {currentTier.displayName}
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 text-center sm:text-left">
                                                <h3 className="font-bold text-white mb-1.5 text-lg">Dein Avatar</h3>
                                                <p className="text-xs font-medium text-zinc-500 mb-2 leading-relaxed max-w-sm mx-auto sm:mx-0">
                                                    Dein Profilbild basiert auf deinem aktuellen Rang im BotlLab System. 
                                                    Braue mehr Sude und engagiere dich, um aufzusteigen!
                                                </p>
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                                                    <span>🔒 Automatisch verwaltet</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-zinc-800/50" />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Anzeigename</label>
                                                <input 
                                                    type="text" 
                                                    value={profile.display_name} 
                                                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-zinc-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition placeholder:text-zinc-600"
                                                    placeholder="Dein Name"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Standort</label>
                                                <input 
                                                    type="text" 
                                                    value={profile.location} 
                                                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-zinc-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition placeholder:text-zinc-600"
                                                    placeholder="z.B. Hamburg"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Gründungsjahr / Start</label>
                                                <input 
                                                    type="number" 
                                                    value={profile.founded_year} 
                                                    onChange={(e) => setProfile({ ...profile, founded_year: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-zinc-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition placeholder:text-zinc-600"
                                                    placeholder="2024"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Webseite</label>
                                                <input 
                                                    type="url" 
                                                    value={profile.website} 
                                                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-zinc-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 font-mono text-sm"
                                                    placeholder="https://..."
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-2 block">Über dich (Bio)</label>
                                                <textarea 
                                                    value={profile.bio} 
                                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-zinc-700/50 focus:border-cyan-500 rounded-xl px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 min-h-[120px] resize-y"
                                                    placeholder="Erzähle etwas über dich und deine Braukünste..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end pt-4">
                                        <button 
                                            id="saveBtn"
                                            type="button"
                                            onClick={saveProfile} 
                                            disabled={savingProfile}
                                            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {savingProfile ? (
                                                <>
                                                    <span className="animate-spin">⏳</span> Speichere...
                                                </>
                                            ) : (
                                                'Änderungen speichern'
                                            )}
                                        </button>
                                    </div>
                                </form>

                                <div className="space-y-8 pt-8 border-t border-zinc-800">
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

                                </div>
                            </div>
                        )}

                        {activeTab === 'teams' && (
                             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                                
                                {/* 1. Join Section */}
                                <div className="bg-gradient-to-br from-cyan-950/20 to-blue-950/20 border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                     
                                     <h2 className="text-xl font-bold text-white mb-2 relative">Team beitreten</h2>
                                     <p className="text-sm text-zinc-400 mb-6 max-w-lg relative">
                                        Gib einen Einladungs-Code ein, um einem bestehenden Squad beizutreten.
                                     </p>

                                     <form onSubmit={handleJoinTeam} className="flex gap-3 relative z-10">
                                        <input
                                            type="text"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value)}
                                            placeholder="Einladungs-Code eingeben..."
                                            className="flex-1 bg-black/50 border border-zinc-700 px-4 py-3 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition text-white placeholder-zinc-600 font-mono text-sm"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!joinCode || joinLoading}
                                            className="bg-cyan-500 text-black font-black px-6 py-3 rounded-xl hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 shadow-lg shadow-cyan-900/20 whitespace-nowrap"
                                        >
                                            {joinLoading ? 'Suche...' : 'Beitreten'}
                                        </button>
                                     </form>
                                     <p className="text-[10px] text-zinc-500 mt-2 pl-1">
                                        Frag den Admin eines Teams nach dem Code.
                                     </p>
                                </div>

                                {/* 2. List Section */}
                                <div>
                                    <h2 className="text-lg font-bold text-white mb-4">Deine Teams</h2>
                                    
                                    {myTeams.length === 0 ? (
                                        <div className="text-center py-10 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-dashed">
                                            <p className="text-4xl mb-3">🏚️</p>
                                            <p className="text-zinc-400 font-medium">Du bist noch in keinem Team.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {myTeams.map(team => (
                                                <div key={team.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group hover:border-zinc-700 transition">
                                                    <div className="flex items-center gap-4">
                                                        {team.logo_url ? (
                                                            <img src={team.logo_url} className="w-12 h-12 rounded-xl object-cover bg-black" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-xl">
                                                                🏭
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h3 className="font-bold text-white group-hover:text-cyan-400 transition">{team.name}</h3>
                                                            <p className="text-xs text-zinc-500 flex items-center gap-2">
                                                                <span className="uppercase tracking-wider font-bold bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-400">
                                                                    {team.userRole === 'admin' ? 'Admin' : 'Mitglied'}
                                                                </span>
                                                                {team.location && <span>• {team.location}</span>}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Link 
                                                            href={`/team/${team.id}`}
                                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                                                            title="Zum Dashboard"
                                                        >
                                                            ➡️
                                                        </Link>
                                                        {team.userRole !== 'owner' && (
                                                            <button
                                                                onClick={() => handleLeaveTeam(team.id, team.name)}
                                                                className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                                                                title="Team verlassen"
                                                            >
                                                                🚪
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'access' && (
                            <form onSubmit={handleUpdateEmail} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">E-Mail Adresse ändern</h2>
                                    <p className="text-sm text-zinc-400">Halte deine Kontaktinformationen aktuell.</p>
                                </div>

                                <div className="text-sm text-zinc-400 mb-6 bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
                                    <span className="font-bold text-zinc-500 text-xs uppercase tracking-wider">Aktuell</span>
                                    <span className="text-white font-mono">{email}</span>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 pl-1">
                                        Neue E-Mail Adresse
                                    </label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="neue@email.de"
                                        className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3.5 rounded-xl focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none transition text-white placeholder-zinc-700 font-medium"
                                    />
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={emailLoading || !newEmail || newEmail === email}
                                        className="bg-zinc-800 text-white font-bold px-6 py-3 rounded-xl hover:bg-zinc-700 hover:text-white border border-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {emailLoading ? 'Sende...' : 'E-Mail ändern'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'security' && (
                            <form onSubmit={handleUpdatePassword} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">Passwort ändern</h2>
                                    <p className="text-sm text-zinc-400">Wähle ein sicheres Passwort mit mind. 6 Zeichen.</p>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 pl-1">
                                        Neues Passwort
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3.5 rounded-xl focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none transition text-white placeholder-zinc-700 font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.243m4.242 4.242L9.88 9.88" />
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
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 pl-1">
                                        Passwort bestätigen
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3.5 rounded-xl focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none transition text-white placeholder-zinc-700 font-medium"
                                    />
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={passwordLoading || !newPassword}
                                        className="bg-cyan-500 text-black font-black px-8 py-3 rounded-xl hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transform active:scale-95"
                                    >
                                        {passwordLoading ? 'Speichere...' : 'Passwort aktualisieren'}
                                    </button>
                                </div>
                            </form>
                        )}
                        
                        {activeTab === 'privacy' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">Privatsphäre & Daten</h2>
                                    <p className="text-sm text-zinc-400">Transparenz darüber, welche Daten wir sammeln.</p>
                                </div>

                                <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-2xl">
                                            📊
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-white mb-1">Produktanalyse verbessern</h3>
                                            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                                                Wir analysieren anonym, wie Features genutzt werden (z.B. "Wie oft wird gedruckt?"), um BotlLab besser zu machen. 
                                                Es werden keine persönlichen Daten an Dritte (Werbenetzwerke) weitergegeben.
                                            </p>
                                            
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className="relative">
                                                    <input 
                                                        type="checkbox" 
                                                        className="peer sr-only" 
                                                        checked={!profile.analytics_opt_out}
                                                        onChange={togglePrivacy}
                                                    />
                                                    <div className="w-11 h-6 bg-zinc-700 rounded-full peer-checked:bg-purple-500 peer-focus:ring-4 peer-focus:ring-purple-500/30 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                                </div>
                                                <span className={`font-bold text-sm ${!profile.analytics_opt_out ? 'text-white' : 'text-zinc-500'}`}>
                                                    {!profile.analytics_opt_out ? 'Aktiv (Empfohlen)' : 'Deaktiviert'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div className="h-px bg-zinc-800 w-full" />
                                    
                                    <div className="text-xs text-zinc-500">
                                        Mehr Details findest du in unserer <Link href="/privacy" className="text-zinc-400 underline hover:text-white">Datenschutzerklärung</Link>.
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'danger' && (
                             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold text-red-400 mb-1 flex items-center gap-2">
                                        ⚠️ Gefahrenzone
                                    </h2>
                                    <p className="text-sm text-zinc-400">Vorsicht! Aktionen hier sind endgültig.</p>
                                </div>

                                <div className="border border-red-900/30 bg-red-950/5 rounded-3xl overflow-hidden space-y-6 p-6">
                                     <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                         <div>
                                            <h4 className="font-bold text-zinc-200">Abmelden</h4>
                                            <p className="text-sm text-zinc-500 mt-1 max-w-sm">Beende deine aktuelle Sitzung auf diesem Gerät.</p>
                                        </div>
                                         <button
                                            onClick={() => supabase.auth.signOut().then(() => (window.location.href = '/login'))}
                                            className="w-full sm:w-auto text-zinc-400 hover:text-white hover:bg-zinc-800 px-6 py-3 rounded-xl text-sm font-bold transition border border-zinc-800 hover:border-zinc-500 whitespace-nowrap"
                                        >
                                            Abmelden
                                        </button>
                                     </div>

                                     <div className="h-px bg-red-900/20 w-full" />

                                     <div className="flex flex-col items-start gap-4">
                                        <div>
                                            <h4 className="font-bold text-red-300">Konto löschen</h4>
                                            <p className="text-sm text-zinc-500 mt-1 max-w-lg">Dies entfernt dauerhaft alle deine Daten: Profil, Rezepte, Flaschen und Medien. Diese Aktion kann nicht rückgängig gemacht werden.</p>
                                        </div>
                                        <button
                                            onClick={deleteAccount}
                                            className="w-full sm:w-auto text-red-400 hover:text-white hover:bg-red-600 px-6 py-3 rounded-xl text-sm font-bold transition border border-red-900/50 hover:border-red-500 whitespace-nowrap bg-red-950/20 shadow-lg"
                                        >
                                            Daten unwiderruflich löschen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
		</div>
	);
}

