// Account settings page — mode-neutral (accessible by brewer & drinker)
// ZWEI WELTEN Phase 1.6a: Extracted from /dashboard/account
'use client';

import { useEffect, useState } from 'react';
import { updateProfile } from '@/lib/actions/profile-actions';
import { supabase, getUserBreweries } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import ProfileCompletionRing from '@/app/dashboard/components/ProfileCompletionRing';
import PremiumBadge from '@/app/components/PremiumBadge';
import AICreditsDisplay from '@/app/components/AICreditsDisplay';
import PremiumFeatureLock from '@/app/components/PremiumFeatureLock';
import { SubscriptionTier } from '@/lib/premium-config';
import { redeemCode } from '@/lib/actions/premium-actions';
import ResponsiveTabs from '@/app/components/ResponsiveTabs';
import { AppMode } from '@/lib/types/user-mode';
import LegalConsentModal from '@/app/components/LegalConsentModal';
import { User, CreditCard, Users, Key, ShieldCheck, Eye, AlertTriangle, Menu, Settings, Lock, Mail, ShieldAlert, Loader2, Construction, Check, CheckCircle, Infinity, X, Globe, Home, Factory, ArrowRight, LogOut, BarChart3, Sparkles } from 'lucide-react';

export default function AccountPage() {
	const { user, loading: authLoading, signOut } = useAuth();
	const [loading, setLoading] = useState(true);
    
	// Access Code State
	const [redeemInput, setRedeemInput] = useState('');
	const [redeemLoading, setRedeemLoading] = useState(false);
	const [redeemMessage, setRedeemMessage] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

	// Cancel Subscription State
	const [cancelLoading, setCancelLoading] = useState(false);
	const [showCancelModal, setShowCancelModal] = useState(false);

	// Upgrade State
	const [upgradeLoading, setUpgradeLoading] = useState(false);

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
        birthdate?: string,
        website: string,
        analytics_opt_out: boolean,
        botlguide_insights_enabled: boolean,
        subscription_tier: SubscriptionTier,
        subscription_status: string
    }>({
		display_name: '',
		location: '',
		founded_year: new Date().getFullYear().toString(),
        bio: '',
        birthdate: '',
		website: '',
        analytics_opt_out: false,
        botlguide_insights_enabled: true,
        subscription_tier: 'free',
        subscription_status: 'active'
	});
	// Avatar state
	const [logoUrl, setLogoUrl] = useState<string | null>(null);
	const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null);
	const [avatarUploading, setAvatarUploading] = useState(false);
	const [avatarMessage, setAvatarMessage] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [showAvatarConsent, setShowAvatarConsent] = useState(false);

	// --- ACCOUNT STATE ---
	// Password State
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

	// Email State
	const [email, setEmail] = useState('');
	const [newEmail, setNewEmail] = useState('');
	const [emailLoading, setEmailLoading] = useState(false);
	const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // --- TEAMS STATE ---
    const [myTeams, setMyTeams] = useState<any[]>([]);
    const [joinCode, setJoinCode] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [createMessage, setCreateMessage] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // ZWEI WELTEN: app_mode for conditional UI
    const [appMode, setAppMode] = useState<AppMode>('drinker');

	useEffect(() => {
		if (!authLoading) {
			if (!user) {
				router.push('/login?callbackUrl=/account');
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

        // ZWEI WELTEN: app_mode laden
        const { data: modeData } = await supabase
            .from('profiles')
            .select('app_mode')
            .eq('id', user.id)
            .single();
        if (modeData?.app_mode) setAppMode(modeData.app_mode as AppMode);
        
        // Load Teams (only relevant for brewers, but load anyway for mode-switch)
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
                    // Normalize birthdate to YYYY-MM-DD so <input type="date"> shows it correctly
                    birthdate: data.birthdate ? (typeof data.birthdate === 'string' ? data.birthdate.split('T')[0] : new Date(data.birthdate).toISOString().split('T')[0]) : '',
				website: data.website || '',
                analytics_opt_out: data.analytics_opt_out || false,
                botlguide_insights_enabled: data.botlguide_insights_enabled !== false,
                subscription_tier: (data.subscription_tier as SubscriptionTier) || 'free',
                subscription_status: data.subscription_status || 'active'
			});
			setLogoUrl(data.logo_url || null);
			setPendingAvatarUrl((data as any).pending_avatar_url || null);
		}
	}

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset input so same file can be re-selected after closing modal
        e.target.value = '';
        setPendingFile(file);
        setShowAvatarConsent(true);
    }

    async function doUpload(file: File) {
        setAvatarUploading(true);
        setAvatarMessage(null);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Upload fehlgeschlagen');
            setPendingAvatarUrl(json.pending_avatar_url);
            setAvatarMessage({ type: 'success', msg: 'Bild hochgeladen. Warte auf Freigabe durch einen Moderator.' });
        } catch (err: any) {
            setAvatarMessage({ type: 'error', msg: err.message });
        } finally {
            setAvatarUploading(false);
        }
    }

	async function saveProfile() {
		if (!user) return;
		setSavingProfile(true);

        const updates = {
			display_name: profile.display_name,
			location: profile.location,
			founded_year: profile.founded_year ? parseInt(String(profile.founded_year)) : null,
            bio: profile.bio,
            birthdate: profile.birthdate || null,
			website: profile.website || "",
        };

        const { error } = await updateProfile(updates);

		if (error) {
             const msg = typeof error === 'string' ? error : Object.values(error).flat().join(', ');
			alert('Fehler beim Speichern: ' + msg);
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

    async function handleCreateTeam(e: React.FormEvent) {
        e.preventDefault();
        if (!createName.trim() || !user) return;
        setCreateLoading(true);
        setCreateMessage(null);

        try {
            // Owner check: user can only own one team
            const alreadyOwner = myTeams.some(t => t.userRole === 'owner');
            if (alreadyOwner) {
                setCreateMessage({ type: 'error', msg: 'Du kannst nur ein Team gründen. Du bist bereits Besitzer eines Teams.' });
                setCreateLoading(false);
                return;
            }

            // Generate a short invite code
            const inviteCode = ('LAB' + Math.random().toString(36).slice(2, 8)).toUpperCase();

            // 1) Create brewery
            const { data: newBrewery, error: brewErr } = await supabase
                .from('breweries')
                .insert({ name: createName.trim(), invite_code: inviteCode, created_at: new Date() })
                .select('id, name')
                .single();

            if (brewErr || !newBrewery) throw new Error('Fehler beim Erstellen des Teams.');

            // 2) Add membership as owner
            const { error: memberErr } = await supabase
                .from('brewery_members')
                .insert({ brewery_id: newBrewery.id, user_id: user.id, role: 'owner' });

            if (memberErr) throw memberErr;

            setCreateMessage({ type: 'success', msg: `Team "${newBrewery.name}" erfolgreich erstellt!` });
            setCreateName('');

            // Refresh teams
            const teams = await getUserBreweries(user.id);
            setMyTeams(teams);

        } catch (err: any) {
            setCreateMessage({ type: 'error', msg: err?.message || 'Fehler beim Erstellen des Teams.' });
        } finally {
            setCreateLoading(false);
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

	async function handleCancelSubscription() {
		if (!user) return;
		
		setCancelLoading(true);
		
		try {
			const response = await fetch('/api/subscriptions/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			
			const result = await response.json();
			
			if (result.success) {
				alert('Dein Abo wurde erfolgreich gekündigt. Du erhältst eine Bestätigungs-Email.');
				setShowCancelModal(false);
				// Refresh profile
				await loadProfile(user.id);
			} else {
				alert('Fehler: ' + result.error);
			}
		} catch (error) {
			alert('Fehler beim Kündigen: ' + error);
		} finally {
			setCancelLoading(false);
		}
	}

	async function handleUpgrade(tier: 'brewer' | 'brewery') {
		if (!user) return;
		
		setUpgradeLoading(true);
		
		try {
			const response = await fetch('/api/stripe/create-checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tier }),
			});
			
			const result = await response.json();
			
			if (result.url) {
				// Redirect to Stripe Checkout
				window.location.href = result.url;
			} else {
				// Payments not enabled yet (Commercial Barrier)
				alert(result.error || 'Danke für dein Interesse! Wir bereiten gerade den Launch vor. Sobald wir startklar sind, wirst du hier upgraden können.');
				setUpgradeLoading(false);
			}
		} catch (error) {
			alert('Fehler beim Upgrade: ' + error);
			setUpgradeLoading(false);
		}
	}

    // --- ACCOUNT HANDLERS ---

	async function handleUpdatePassword(e: React.FormEvent) {
		e.preventDefault();
		setPasswordMessage(null);
		if (newPassword !== confirmPassword) {
			setPasswordMessage({ type: 'error', msg: 'Die Passwörter stimmen nicht überein.' });
			return;
		}
		if (newPassword.length < 8) {
			setPasswordMessage({ type: 'error', msg: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
			return;
		}
		try {
			setPasswordLoading(true);
			const { error } = await supabase.auth.updateUser({ password: newPassword });
			if (error) throw error;
			setPasswordMessage({ type: 'success', msg: 'Passwort erfolgreich geändert! 🔒' });
			setNewPassword('');
			setConfirmPassword('');
		} catch (error: any) {
			setPasswordMessage({ type: 'error', msg: error.message });
		} finally {
			setPasswordLoading(false);
		}
	}

	async function handleUpdateEmail(e: React.FormEvent) {
		e.preventDefault();
		setEmailMessage(null);
		if (!newEmail || newEmail === email) return;
		try {
			setEmailLoading(true);
			const { error } = await supabase.auth.updateUser(
                { email: newEmail },
                { emailRedirectTo: `${window.location.origin}/account` }
            );
			if (error) throw error;
			setEmailMessage({ type: 'success', msg: 'Fast geschafft! Wir haben zwei Bestätigungs-Links verschickt: einen an deine alte Adresse und einen an die neue. Bitte bestätige beide.' });
			setNewEmail('');
		} catch (error: any) {
			setEmailMessage({ type: 'error', msg: error.message });
		} finally {
			setEmailLoading(false);
		}
	}

    async function togglePrivacy() {
        if (!user) return;
        const newVal = !profile.analytics_opt_out;
        setProfile(prev => ({ ...prev, analytics_opt_out: newVal }));
        const { error } = await supabase
            .from('profiles')
            .update({ analytics_opt_out: newVal })
            .eq('id', user.id);
        if (error) {
            setProfile(prev => ({ ...prev, analytics_opt_out: !newVal }));
            alert('Fehler beim Speichern der Einstellung: ' + error.message);
        }
    }

    async function toggleBotlGuideInsights() {
        if (!user) return;
        const newVal = !profile.botlguide_insights_enabled;
        setProfile(prev => ({ ...prev, botlguide_insights_enabled: newVal }));
        const { error } = await supabase
            .from('profiles')
            .update({ botlguide_insights_enabled: newVal })
            .eq('id', user.id);
        if (error) {
            setProfile(prev => ({ ...prev, botlguide_insights_enabled: !newVal }));
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

    // ZWEI WELTEN: Teams-Tab nur für Brauer sichtbar
    const menuItems = [
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'subscription', label: 'Abo & Premium', icon: CreditCard },
        ...(appMode === 'brewer'
            ? [{ id: 'teams', label: 'Teams', icon: Users }]
            : []),
        { id: 'access', label: 'Zugangsdaten', icon: Key },
        { id: 'security', label: 'Sicherheit', icon: ShieldCheck },
        { id: 'privacy', label: 'Privatsphäre', icon: Eye },
        { id: 'danger', label: 'Account', icon: AlertTriangle }
    ];

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<Loader2 className="animate-spin w-12 h-12 text-text-disabled" />
			</div>
		);
	}

	return (
		<div className="animate-in fade-in duration-500">
            <LegalConsentModal
                isOpen={showAvatarConsent}
                type="avatar"
                onClose={() => { setShowAvatarConsent(false); setPendingFile(null); }}
                onConfirm={() => {
                    setShowAvatarConsent(false);
                    if (pendingFile) doUpload(pendingFile);
                    setPendingFile(null);
                }}
            />
             <div className="w-full space-y-8">
                
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Einstellungen</h1>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-hover text-text-secondary border border-border-hover uppercase tracking-wide">
                                Account
                            </span>
                        </div>
                        <p className="text-sm text-text-muted">Verwalte dein Profil, deine Zugangsdaten und Sicherheitseinstellungen.</p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] uppercase font-bold text-text-disabled tracking-wider mb-0.5">Angemeldet als</p>
                        <div className="flex items-center gap-1.5 justify-end">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>
                            <p className="text-text-secondary font-mono text-xs">{profile.display_name || user?.email}</p>
                        </div>
                    </div>
                </header>

                <div className="flex flex-col lg:flex-row gap-6">
                     {/* Sidebar */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                         <ResponsiveTabs 
                            items={menuItems}
                            activeTab={activeTab}
                            onTabChange={(id) => setActiveTab(id as any)}
                            variant='sidebar'
                         />
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">


                    <div className="relative z-10 w-full">
                        
                        {/* --- SUBSCRIPTION TAB --- */}
                        {activeTab === 'subscription' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary mb-1">Dein Abonnement</h2>
                                    <p className="text-sm text-text-secondary">Verwalte deinen Premium-Status und AI Credits.</p>
                                </div>

                                <div className="space-y-6">
                                    {/* Main Plan Card */}
                                    <div className={`relative overflow-hidden rounded-xl border p-6 md:p-8 ${
                                        profile.subscription_tier === 'enterprise' ? 'bg-purple-950/10 border-purple-500/20' :
                                        profile.subscription_tier === 'brewery' ? 'bg-amber-950/10 border-amber-500/20' :
                                        profile.subscription_tier === 'brewer' ? 'bg-blue-950/10 border-blue-500/20' :
                                        'bg-surface border-border'
                                    }`}>
                                         {/* Background Gradient/Glow */}
                                        <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none ${
                                             profile.subscription_tier === 'enterprise' ? 'bg-purple-500' :
                                             profile.subscription_tier === 'brewery' ? 'bg-amber-500' :
                                             profile.subscription_tier === 'brewer' ? 'bg-blue-500' :
                                             'bg-text-disabled'
                                        }`} />

                                        <div className="relative z-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                                                             profile.subscription_tier === 'enterprise' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                             profile.subscription_tier === 'brewery' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                             profile.subscription_tier === 'brewer' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                             'bg-surface-hover text-text-secondary border-border-hover'
                                                        }`}>
                                                            Aktueller Plan
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-success">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                                            {profile.subscription_status}
                                                        </span>
                                                    </div>
                                                    <h3 className={`text-4xl font-black capitalize ${
                                                         profile.subscription_tier === 'enterprise' ? 'text-purple-400' :
                                                         profile.subscription_tier === 'brewery' ? 'text-amber-400' :
                                                         profile.subscription_tier === 'brewer' ? 'text-blue-400' :
                                                         'text-text-primary'
                                                    }`}>
                                                        {profile.subscription_tier}
                                                    </h3>
                                                </div>
                                                
                                                {/* Action Buttons for Active Plan */}
                                                 {(profile.subscription_tier !== 'free') && (
                                                    <div className="flex gap-3">
                                                         <button 
                                                            onClick={() => setShowCancelModal(true)}
                                                            className="px-4 py-2 bg-surface/40 hover:bg-error-bg text-text-secondary hover:text-error border border-border/20 hover:border-error/30 rounded-lg text-xs font-bold transition backdrop-blur-sm"
                                                         >
                                                             Kündigen
                                                         </button>
                                                    </div>
                                                 )}
                                            </div>

                                            {/* AI Credits Section */}
                                            <div className="mt-8">
                                                <AICreditsDisplay userId={user?.id || ''} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                     {/* Upgrade Options (If Free) */}
                                    {profile.subscription_tier === 'free' && (
                                        <div className="grid gap-4">
                                            <div className="p-6 bg-surface border border-border rounded-2xl">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-blue-500">Brewer Plan</h4>
                                                        <p className="text-text-secondary text-sm">Für Hobbybrauer mit Ambitionen.</p>
                                                    </div>
                                                    <span className="text-text-primary font-bold">€4.99<span className="text-text-muted text-xs font-normal">/Monat</span></span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                                     <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                                                        <span>50 AI Credits & Analytics</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                                                        <span>Erweiterte Statistiken</span>
                                                    </div>
                                                </div>

                                                <button 
                                                    disabled
                                                    className="w-full py-3 bg-surface-hover text-text-disabled font-bold rounded-lg border border-border cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <Construction className="w-4 h-4" />
                                                    Momentan nicht verfügbar
                                                </button>
                                            </div>

                                             <div className="p-6 bg-surface border border-border rounded-2xl">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-amber-500">Brewery Plan</h4>
                                                        <p className="text-text-secondary text-sm">Für Teams und Mikrobrauereien.</p>
                                                    </div>
                                                    <span className="text-text-primary font-bold">€14.99<span className="text-text-muted text-xs font-normal">/Monat</span></span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                                     <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                                                        <span className="font-bold text-text-primary">Unbegrenzte Rezepte</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                                                        <span>200 AI Credits</span>
                                                    </div>
                                                     <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                                                        <span>Eigenes Branding (PDFs)</span>
                                                    </div>
                                                     <div className="flex items-center gap-2 text-sm text-text-secondary">
                                                        <Users className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                        <span>Team Feature (Owner-Pays)</span>
                                                    </div>
                                                </div>

                                                <button 
                                                    disabled
                                                    className="w-full py-3 bg-surface-hover text-text-disabled font-bold rounded-lg border border-border cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <Construction className="w-4 h-4" />
                                                    Momentan nicht verfügbar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Code Redemption Section */}
                                    <div className="p-6 bg-surface border border-border rounded-2xl">
                                        <div className="flex flex-col md:flex-row gap-6 items-start">
                                             <div className="flex-1">
                                                <h3 className="font-bold text-text-primary mb-1.5 flex items-center gap-2">
                                                    <Key className="w-4 h-4 text-text-muted" />
                                                    Enterprise Code
                                                </h3>
                                                <p className="text-xs text-text-muted leading-relaxed">
                                                    Hast du einen exklusiven Zugangscode von einem Event oder Partner erhalten? 
                                                    Löse ihn hier ein, um Premium-Funktionen freizuschalten.
                                                </p>
                                            </div>

                                            <div className="w-full md:w-auto flex-1">
                                                <form onSubmit={handleRedeemEnterpriseCode} className="flex gap-2">
                                                    <input 
                                                        type="text"
                                                        value={redeemInput}
                                                        onChange={e => setRedeemInput(e.target.value)}
                                                        className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm text-text-primary focus:border-brand outline-none transition-all placeholder:text-text-disabled font-mono"
                                                        placeholder="LAB-XXXX-XXXX"
                                                        disabled={redeemLoading}
                                                    />
                                                    <button 
                                                        type="submit"
                                                        disabled={redeemLoading || !redeemInput.trim()}
                                                        className="px-4 py-2 bg-brand text-white hover:opacity-90 rounded-lg text-sm font-bold transition disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                        {redeemLoading ? '...' : 'Einlösen'}
                                                    </button>
                                                </form>

                                                {redeemMessage && (
                                                    <div className={`mt-3 text-xs font-bold px-3 py-2 rounded-lg border animate-in fade-in slide-in-from-top-1 ${
                                                        redeemMessage.type === 'success' 
                                                        ? 'bg-success-bg border-success/20 text-success' 
                                                        : 'bg-error-bg border-error/20 text-error'
                                                    }`}>
                                                        <div className="flex items-center gap-2">
                                                            {redeemMessage.type === 'success' 
                                                                ? <Check className="w-3 h-3" /> 
                                                                : <X className="w-3 h-3" />
                                                            }
                                                            {redeemMessage.msg}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- PROFILE TAB --- */}
                        {activeTab === 'profile' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary mb-1">Dein öffentliches Profil</h2>
                                    <p className="text-sm text-text-secondary">So wirst du in der Community gesehen.</p>
                                </div>

                                {/* Profil-Vervollständigungsstatus */}
                                {(() => {
                                    const fields: Array<{ key: keyof typeof profile | '__avatar'; label: string; isDone?: (v: any) => boolean }> = [
                                        { key: '__avatar', label: 'Profilbild', isDone: () => !!logoUrl },
                                        { key: 'display_name', label: 'Anzeigename' },
                                        { key: 'bio', label: 'Über mich' },
                                        { key: 'location', label: 'Standort' },
                                        { key: 'website', label: 'Website' },
                                        { key: 'founded_year', label: 'Dabei seit', isDone: (v: any) => !!(v && String(v).trim().length > 0) },
                                    ];
                                    const isFilled = (key: keyof typeof profile | '__avatar', custom?: (v: any) => boolean) => {
                                        if (key === '__avatar') return custom ? custom(null) : false;
                                        const val = profile[key as keyof typeof profile];
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
                                    {/* Avatar Upload */}
                                    <div className="md:bg-surface md:border md:border-border rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-center gap-8">
                                        {/* Avatar preview */}
                                        <div className="relative shrink-0">
                                            <div className="w-32 h-32 rounded-full border-4 border-border bg-surface-hover shadow-xl overflow-hidden flex items-center justify-center">
                                                {logoUrl ? (
                                                    <img src={logoUrl} className="w-full h-full object-cover" alt="Avatar" />
                                                ) : pendingAvatarUrl ? (
                                                    <img src={pendingAvatarUrl} className="w-full h-full object-cover opacity-50" alt="Ausstehend" />
                                                ) : (
                                                    <span className="text-4xl font-bold text-text-primary select-none">
                                                        {(profile.display_name || user?.email || '?')[0].toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            {pendingAvatarUrl && !logoUrl && (
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
                                                    In Prüfung
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 text-center sm:text-left">
                                            <h3 className="font-bold text-text-primary mb-1.5 text-lg">Dein Profilbild</h3>
                                            {logoUrl ? (
                                                <p className="text-xs text-text-secondary mb-3">Dein Profilbild ist aktiv und sichtbar.</p>
                                            ) : pendingAvatarUrl ? (
                                                <p className="text-xs text-warning mb-3">Dein Bild wartet auf Freigabe durch einen Moderator.</p>
                                            ) : (
                                                <p className="text-xs text-text-muted mb-3">Lade ein Bild hoch. Es wird nach der Prüfung freigeschaltet.</p>
                                            )}

                                            <label className={`inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg text-sm font-bold transition ${
                                                avatarUploading
                                                    ? 'bg-surface-hover text-text-disabled cursor-not-allowed'
                                                    : 'bg-surface-hover hover:bg-border-hover text-text-primary'
                                            }`}>
                                                {avatarUploading ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Wird hochgeladen...</>
                                                ) : (
                                                    <><User className="w-4 h-4" /> Bild auswählen</>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                                    className="hidden"
                                                    disabled={avatarUploading}
                                                    onChange={handleAvatarUpload}
                                                />
                                            </label>

                                            {avatarMessage && (
                                                <p className={`mt-2 text-xs ${ avatarMessage.type === 'success' ? 'text-success' : 'text-error' }`}>
                                                    {avatarMessage.msg}
                                                </p>
                                            )}
                                            <p className="mt-2 text-[10px] text-text-disabled">Max. 5 MB · JPEG, PNG, WebP, GIF</p>
                                        </div>
                                    </div>

                                    <div className="md:bg-surface md:border md:border-border rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-text-secondary mb-1.5">Anzeigename</label>
                                                <input 
                                                    type="text" 
                                                    value={profile.display_name} 
                                                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg bg-surface text-text-primary border border-border focus:outline-none focus:border-border-hover transition-colors placeholder:text-text-disabled sm:text-sm"
                                                    placeholder="Dein Name"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary mb-1.5">Standort</label>
                                                <input 
                                                    type="text" 
                                                    value={profile.location} 
                                                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg bg-surface text-text-primary border border-border focus:outline-none focus:border-border-hover transition-colors placeholder:text-text-disabled sm:text-sm"
                                                    placeholder="z.B. Hamburg"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary mb-1.5">Gründungsjahr / Start</label>
                                                <input 
                                                    type="number" 
                                                    value={profile.founded_year} 
                                                    onChange={(e) => setProfile({ ...profile, founded_year: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg bg-surface text-text-primary border border-border focus:outline-none focus:border-border-hover transition-colors placeholder:text-text-disabled sm:text-sm"
                                                    placeholder="2024"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary mb-1.5">Geburtsdatum</label>
                                                <input
                                                    type="date"
                                                    value={profile.birthdate || ''}
                                                    onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg bg-surface text-text-primary border border-border focus:outline-none focus:border-border-hover transition-colors placeholder:text-text-disabled sm:text-sm"
                                                    placeholder=""
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-text-secondary mb-1.5">Webseite</label>
                                                <input 
                                                    type="url" 
                                                    value={profile.website} 
                                                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg bg-surface text-text-primary border border-border focus:outline-none focus:border-border-hover transition-colors placeholder:text-text-disabled sm:text-sm font-mono"
                                                    placeholder="https://..."
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-text-secondary mb-1.5">Über dich (Bio)</label>
                                                <textarea 
                                                    value={profile.bio} 
                                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg bg-surface text-text-primary border border-border focus:outline-none focus:border-border-hover transition-colors placeholder:text-text-disabled sm:text-sm min-h-[120px] resize-y"
                                                    placeholder="Erzähle etwas über dich und deine Braukünste..."
                                                />
                                            </div>
                                        </div>
                                    
                                    <div className="flex justify-end pt-4">
                                        <button 
                                            id="saveBtn"
                                            type="button"
                                            onClick={saveProfile} 
                                            disabled={savingProfile}
                                            className="bg-brand text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {savingProfile ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Speichere...
                                                </>
                                            ) : (
                                                'Änderungen speichern'
                                            )}
                                        </button>
                                    </div>
                                </form>

                                <div className="space-y-8 pt-8 border-t border-border">
                                            <div className="bg-surface/40 border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 group hover:border-border-hover transition">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center text-text-muted group-hover:text-brand group-hover:scale-110 transition">
                                                        <Globe className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-text-primary mb-0.5">Dein öffentliches Profil</h4>
                                                        <p className="text-xs text-text-secondary">Teile diesen Link mit Freunden.</p>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/brewer/${user?.id}`}
                                                    target="_blank"
                                                    className="bg-background hover:bg-surface text-brand border border-border hover:border-brand/30 px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 w-full sm:w-auto"
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
                                <div className="md:bg-surface md:border md:border-border rounded-2xl p-4 md:p-8 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                     
                                     <h2 className="text-xl font-bold text-text-primary mb-2 relative">Team beitreten</h2>
                                     <p className="text-sm text-text-secondary mb-6 max-w-lg relative">
                                        Gib einen Einladungs-Code ein, um einem bestehenden Squad beizutreten.
                                     </p>

                                     <form onSubmit={handleJoinTeam} className="flex flex-col sm:flex-row gap-3 relative z-10">
                                        <input
                                            type="text"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value)}
                                            placeholder="Einladungs-Code eingeben..."
                                            className="w-full sm:flex-1 bg-surface border border-border px-3 py-2 rounded-lg focus:border-border-hover outline-none transition text-text-primary placeholder-text-disabled font-mono text-sm"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!joinCode || joinLoading}
                                            className="w-full sm:w-auto bg-surface-hover text-text-primary font-bold px-6 py-2 rounded-lg border border-border hover:bg-border transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                                        >
                                            {joinLoading ? 'Suche...' : 'Beitreten'}
                                        </button>
                                     </form>
                                     <p className="text-[10px] text-text-muted mt-2 pl-1">
                                        Frag den Admin eines Teams nach dem Code.
                                     </p>
                                </div>

                                {/* 1.5 Create Section */}
                                <div className="md:bg-surface md:border md:border-border rounded-2xl p-4 md:p-8">
                                    <h3 className="text-lg font-bold text-text-primary mb-2">Neues Team erstellen</h3>
                                    <p className="text-sm text-text-secondary mb-4">Gründe ein neues Team — du kannst nur ein Team besitzen.</p>

                                    {createMessage && (
                                        <div className={`text-xs font-bold px-4 py-2 rounded-lg mb-3 flex items-center gap-2 ${createMessage.type === 'success' ? 'bg-success-bg border border-success/20 text-success' : 'bg-error-bg border border-error/20 text-error'}`}>
                                            {createMessage.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                            {createMessage.msg}
                                        </div>
                                    )}

                                    <form onSubmit={handleCreateTeam} className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="text"
                                            value={createName}
                                            onChange={(e) => setCreateName(e.target.value)}
                                            placeholder="Team-Name"
                                            className="w-full sm:flex-1 bg-surface border border-border px-3 py-2 rounded-lg focus:border-border-hover outline-none transition text-text-primary placeholder-text-disabled text-sm"
                                            disabled={createLoading}
                                        />
                                        <button
                                            type="submit"
                                            disabled={createLoading}
                                            className="w-full sm:w-auto bg-brand text-white font-bold px-6 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                                        >
                                            {createLoading ? 'Erstelle...' : 'Team erstellen'}
                                        </button>
                                    </form>

                                    {/* If user already owns a team, show info */}
                                    {myTeams.some(t => t.userRole === 'owner') && (
                                        <p className="text-[12px] text-text-muted mt-3">Du bist bereits Besitzer eines Teams. Pro Benutzer ist nur ein eigenes Team erlaubt.</p>
                                    )}
                                </div>

                                {/* 2. List Section */}
                                <div>
                                    <h2 className="text-lg font-bold text-text-primary mb-4">Deine Teams</h2>
                                    
                                    {myTeams.length === 0 ? (
                                        <div className="text-center py-10 bg-surface/30 rounded-2xl border border-border/50 border-dashed flex flex-col items-center">
                                            <Home className="w-12 h-12 text-text-disabled mb-3" />
                                            <p className="text-text-secondary font-bold">Du bist noch in keinem Team.</p>
                                        </div>
                                    ) : (

                                        <div className="grid gap-4">
                                            {myTeams.map(team => (
                                                <div key={team.id} className="md:bg-surface md:border md:border-border p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-border-hover transition">
                                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                                        {team.logo_url ? (
                                                            <img src={team.logo_url} className="w-12 h-12 rounded-lg object-cover bg-background flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted flex-shrink-0">
                                                                <Factory className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-bold text-text-primary group-hover:text-brand transition truncate">{team.name}</h3>
                                                            <p className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
                                                                <span className="uppercase tracking-wider font-bold bg-surface-hover px-1.5 py-0.5 rounded-full text-[10px] text-text-secondary border border-border whitespace-nowrap">
                                                                    {team.userRole === 'admin' ? 'Admin' : 'Mitglied'}
                                                                </span>
                                                                {team.location && <span className="truncate max-w-[120px]">• {team.location}</span>}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t border-border/50 pt-3 sm:pt-0 sm:border-0">
                                                        <Link 
                                                            href={`/team/${team.id}`}
                                                            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition"
                                                            title="Zum Dashboard"
                                                        >
                                                            <span className="sr-only">Dashboard</span>
                                                            <ArrowRight className="w-4 h-4" />
                                                        </Link>
                                                        {team.userRole !== 'owner' && (
                                                            <button
                                                                onClick={() => handleLeaveTeam(team.id, team.name)}
                                                                className="p-2 text-text-disabled hover:text-error hover:bg-error-bg rounded-lg transition"
                                                                title="Team verlassen"
                                                            >
                                                                <LogOut className="w-4 h-4" />
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
                                    <h2 className="text-xl font-bold text-text-primary mb-1">E-Mail Adresse ändern</h2>
                                    <p className="text-sm text-text-secondary">Halte deine Kontaktinformationen aktuell.</p>
                                </div>

                                <div className="md:bg-surface md:border md:border-border rounded-2xl p-6 md:p-8 space-y-6">
                                    <div className="text-sm text-text-secondary bg-surface p-3 rounded-lg border border-border flex items-center justify-between">
                                        <span className="font-bold text-text-muted text-xs">Aktuell</span>
                                        <span className="text-text-primary font-mono">{email}</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-1.5">
                                            Neue E-Mail Adresse
                                        </label>
                                        <input
                                            type="email"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            placeholder="neue@email.de"
                                            className="w-full px-3 py-2 rounded-lg bg-surface text-text-primary border border-border focus:outline-none focus:border-border-hover transition-colors placeholder:text-text-disabled sm:text-sm"
                                        />
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={emailLoading || !newEmail || newEmail === email}
                                            className="bg-surface-hover text-text-primary font-bold px-6 py-2 rounded-lg hover:bg-border border border-border transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            {emailLoading ? 'Sende...' : 'E-Mail ändern'}
                                        </button>
                                    </div>
                                    {emailMessage && (
                                        <div className={`p-3 rounded-lg text-sm border ${
                                            emailMessage.type === 'success'
                                                ? 'bg-success-bg border-success/20 text-success'
                                                : 'bg-error-bg border-error/20 text-error'
                                        }`}>
                                            {emailMessage.msg}
                                        </div>
                                    )}
                                </div>
                            </form>
                        )}

                        {activeTab === 'security' && (
                            <form onSubmit={handleUpdatePassword} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary mb-1">Passwort ändern</h2>
                                    <p className="text-sm text-text-secondary">Wähle ein sicheres Passwort mit mind. 8 Zeichen.</p>
                                </div>

                                <div className="md:bg-surface md:border md:border-border rounded-2xl p-6 md:p-8 space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-1.5">
                                            Neues Passwort
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full px-3 py-2 rounded-lg bg-surface text-text-primary border border-border focus:outline-none focus:border-border-hover transition-colors placeholder:text-text-disabled sm:text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
                                            >
                                                {showPassword ? (
                                                    <Eye className="w-4 h-4" />
                                                ) : (
                                                    <div className="relative">
                                                        <Eye className="w-4 h-4 opacity-50" />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-full h-0.5 bg-text-muted rotate-45"></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-1.5">
                                            Passwort bestätigen
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full px-3 py-2 rounded-lg bg-surface text-text-primary border border-border focus:outline-none focus:border-border-hover transition-colors placeholder:text-text-disabled sm:text-sm"
                                        />
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={passwordLoading || !newPassword}
                                            className="bg-surface-hover text-text-primary font-bold px-6 py-2 rounded-lg hover:bg-border border border-border transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            {passwordLoading ? 'Speichere...' : 'Passwort aktualisieren'}
                                        </button>
                                    </div>
                                    {passwordMessage && (
                                        <div className={`p-3 rounded-lg text-sm border ${
                                            passwordMessage.type === 'success'
                                                ? 'bg-success-bg border-success/20 text-success'
                                                : 'bg-error-bg border-error/20 text-error'
                                        }`}>
                                            {passwordMessage.msg}
                                        </div>
                                    )}
                                </div>
                            </form>
                        )}
                        
                        {activeTab === 'privacy' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary mb-1">Privatsphäre & Daten</h2>
                                    <p className="text-sm text-text-secondary">Transparenz darüber, welche Daten wir sammeln.</p>
                                </div>

                                <div className="md:bg-surface md:border md:border-border rounded-2xl p-6 md:p-8 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-accent-purple/10 rounded-lg border border-accent-purple/20 text-accent-purple">
                                            <BarChart3 className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-text-primary mb-1">Produktanalyse verbessern</h3>
                                            <p className="text-text-secondary text-sm leading-relaxed mb-4">
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
                                                    <div className="w-11 h-6 bg-surface-hover rounded-full peer-checked:bg-accent-purple peer-focus:ring-4 peer-focus:ring-accent-purple/30 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                                </div>
                                                <span className={`font-bold text-sm ${!profile.analytics_opt_out ? 'text-text-primary' : 'text-text-muted'}`}>
                                                    {!profile.analytics_opt_out ? 'Aktiv (Empfohlen)' : 'Deaktiviert'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div className="text-xs text-text-muted pt-6 border-t border-border">
                                        Mehr Details findest du in unserer <Link href="/privacy" className="text-text-secondary underline hover:text-text-primary">Datenschutzerklärung</Link>.
                                    </div>

                                    {/* BotlGuide Insights Toggle */}
                                    <div className="flex items-start gap-4 pt-6 border-t border-border">
                                        <div className="p-3 bg-accent-purple/10 rounded-lg border border-accent-purple/20 text-accent-purple">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-text-primary mb-1">BotlGuide Proaktive Insights</h3>
                                            <p className="text-text-secondary text-sm leading-relaxed mb-4">
                                                BotlGuide beobachtet automatisch deine aktiven Gärungen und warnt dich, wenn sich etwas Ungewöhnliches tut (z.B. Stuck Fermentation, Temperatur-Anomalien). Nur für Brewery+ verfügbar.
                                            </p>
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={profile.botlguide_insights_enabled}
                                                        onChange={toggleBotlGuideInsights}
                                                    />
                                                    <div className="w-11 h-6 bg-surface-hover rounded-full peer-checked:bg-accent-purple peer-focus:ring-4 peer-focus:ring-accent-purple/30 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                                </div>
                                                <span className={`font-bold text-sm ${profile.botlguide_insights_enabled ? 'text-text-primary' : 'text-text-muted'}`}>
                                                    {profile.botlguide_insights_enabled ? 'Aktiviert' : 'Deaktiviert'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'danger' && (
                             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
                                        <AlertTriangle className="w-6 h-6 text-error" />
                                        Gefahrenzone
                                    </h2>
                                    <p className="text-sm text-text-secondary">Vorsicht! Aktionen hier sind endgültig.</p>
                                </div>

                                <div className="bg-surface border border-error/20 rounded-2xl p-6 md:p-8 space-y-6">
                                    <h3 className="text-error text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
                                    </h3>

                                     <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                         <div>
                                            <h4 className="font-bold text-text-primary text-sm mb-1">Abmelden</h4>
                                            <p className="text-text-muted text-xs mt-1 max-w-sm">Beende deine aktuelle Sitzung auf diesem Gerät.</p>
                                        </div>
                                         <button
                                            onClick={() => signOut()}
                                            className="w-full sm:w-auto text-text-secondary hover:text-text-primary hover:bg-surface-hover px-6 py-2 rounded-lg text-xs font-bold transition border border-border hover:border-border-hover whitespace-nowrap"
                                        >
                                            Abmelden
                                        </button>
                                     </div>

                                     <div className="h-px bg-error/10 w-full" />

                                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-bold text-text-primary text-sm mb-1">Konto löschen</h4>
                                            <p className="text-text-muted text-xs mt-1 max-w-lg">Dies entfernt dauerhaft alle deine Daten: Profil, Rezepte, Flaschen und Medien. Diese Aktion kann nicht rückgängig gemacht werden.</p>
                                        </div>
                                        <button
                                            onClick={deleteAccount}
                                            className="w-full sm:w-auto bg-red-900 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-lg text-xs transition whitespace-nowrap"
                                        >
                                            Daten unwiderruflich löschen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    </main>
                </div>
            </div>

            {/* Cancel Subscription Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-text-primary mb-2">Abo kündigen?</h2>
                        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                            Dein Abo bleibt bis zum Ende der aktuellen Laufzeit aktiv. 
                            Danach wirst du automatisch auf den kostenlosen Plan zurückgestuft.
                        </p>
                        
                        <div className="bg-warning-bg border border-warning/30 rounded-xl p-4 mb-6">
                            <p className="text-warning text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Diese Aktion kann nicht rückgängig gemacht werden.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowCancelModal(false)}
                                disabled={cancelLoading}
                                className="flex-1 px-6 py-3 bg-surface-hover hover:bg-border text-text-primary rounded-xl text-sm font-bold border border-border transition disabled:opacity-50"
                            >
                                Abbrechen
                            </button>
                            <button 
                                onClick={handleCancelSubscription}
                                disabled={cancelLoading}
                                className="flex-1 px-6 py-3 bg-red-900 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
                            >
                                {cancelLoading ? 'Kündige...' : 'Jetzt kündigen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
		</div>
	);
}

