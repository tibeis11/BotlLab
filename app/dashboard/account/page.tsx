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
import ResponsiveTabs from '@/app/components/ResponsiveTabs';
import { User, CreditCard, Users, Key, ShieldCheck, Eye, AlertTriangle, Menu, Settings, Lock, Mail, ShieldAlert, Loader2, Construction, Check, CheckCircle, Infinity, X, Globe, Home, Factory, ArrowRight, LogOut, BarChart3 } from 'lucide-react';

export default function AccountPage() {
	const { user, loading: authLoading } = useAuth();
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
        tier?: string,
        analytics_opt_out: boolean,
        subscription_tier: SubscriptionTier,
        subscription_status: string
    }>({
		display_name: '',
		location: '',
		founded_year: new Date().getFullYear().toString(),
        bio: '',
        birthdate: '',
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
    const [createName, setCreateName] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [createMessage, setCreateMessage] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

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
                    // Normalize birthdate to YYYY-MM-DD so <input type="date"> shows it correctly
                    birthdate: data.birthdate ? (typeof data.birthdate === 'string' ? data.birthdate.split('T')[0] : new Date(data.birthdate).toISOString().split('T')[0]) : '',
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
            birthdate: profile.birthdate || null,
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
			const { error } = await supabase.auth.updateUser(
                { email: newEmail },
                { emailRedirectTo: `${window.location.origin}/dashboard/account` }
            );

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
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'subscription', label: 'Abo & Premium', icon: CreditCard },
        { id: 'teams', label: 'Teams', icon: Users },
        { id: 'access', label: 'Zugangsdaten', icon: Key },
        { id: 'security', label: 'Sicherheit', icon: ShieldCheck },
        { id: 'privacy', label: 'Privatsphäre', icon: Eye },
        { id: 'danger', label: 'Account', icon: AlertTriangle }
    ];

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<Loader2 className="animate-spin w-12 h-12 text-zinc-600" />
			</div>
		);
	}

	return (
		<div className="animate-in fade-in duration-500">
             <div className="w-full space-y-8">
                
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-white tracking-tight">Einstellungen</h1>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wide">
                                Account
                            </span>
                        </div>
                        <p className="text-sm text-zinc-500">Verwalte dein Profil, deine Zugangsdaten und Sicherheitseinstellungen.</p>
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
                                    <h2 className="text-xl font-bold text-white mb-1">Dein Abonnement</h2>
                                    <p className="text-sm text-zinc-400">Verwalte deinen Premium-Status und AI Credits.</p>
                                </div>

                                <div className="space-y-6">
                                    {/* Main Plan Card */}
                                    <div className={`relative overflow-hidden rounded-xl border p-6 md:p-8 ${
                                        profile.subscription_tier === 'enterprise' ? 'bg-purple-950/10 border-purple-500/20' :
                                        profile.subscription_tier === 'brewery' ? 'bg-amber-950/10 border-amber-500/20' :
                                        profile.subscription_tier === 'brewer' ? 'bg-blue-950/10 border-blue-500/20' :
                                        'bg-zinc-900 border-zinc-800'
                                    }`}>
                                         {/* Background Gradient/Glow */}
                                        <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none ${
                                             profile.subscription_tier === 'enterprise' ? 'bg-purple-500' :
                                             profile.subscription_tier === 'brewery' ? 'bg-amber-500' :
                                             profile.subscription_tier === 'brewer' ? 'bg-blue-500' :
                                             'bg-zinc-500'
                                        }`} />

                                        <div className="relative z-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                                                             profile.subscription_tier === 'enterprise' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                             profile.subscription_tier === 'brewery' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                             profile.subscription_tier === 'brewer' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                             'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                        }`}>
                                                            Aktueller Plan
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            {profile.subscription_status}
                                                        </span>
                                                    </div>
                                                    <h3 className={`text-4xl font-black capitalize ${
                                                         profile.subscription_tier === 'enterprise' ? 'text-purple-400' :
                                                         profile.subscription_tier === 'brewery' ? 'text-amber-400' :
                                                         profile.subscription_tier === 'brewer' ? 'text-blue-400' :
                                                         'text-white'
                                                    }`}>
                                                        {profile.subscription_tier}
                                                    </h3>
                                                </div>
                                                
                                                {/* Action Buttons for Active Plan */}
                                                 {(profile.subscription_tier !== 'free') && (
                                                    <div className="flex gap-3">
                                                         <button 
                                                            onClick={() => setShowCancelModal(true)}
                                                            className="px-4 py-2 bg-black/40 hover:bg-rose-950/30 text-zinc-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 rounded-lg text-xs font-bold transition backdrop-blur-sm"
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
                                            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-blue-500">Brewer Plan</h4>
                                                        <p className="text-zinc-400 text-sm">Für Hobbybrauer mit Ambitionen.</p>
                                                    </div>
                                                    <span className="text-white font-bold">€4.99<span className="text-zinc-500 text-xs font-normal">/Monat</span></span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                                     <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                        <span>50 AI Credits & Analytics</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                        <span>Erweiterte Statistiken</span>
                                                    </div>
                                                </div>

                                                <button 
                                                    disabled
                                                    className="w-full py-3 bg-zinc-800 text-zinc-500 font-bold rounded-lg border border-zinc-700 cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <Construction className="w-4 h-4" />
                                                    Momentan nicht verfügbar
                                                </button>
                                            </div>

                                             <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-amber-500">Brewery Plan</h4>
                                                        <p className="text-zinc-400 text-sm">Für Teams und Mikrobrauereien.</p>
                                                    </div>
                                                    <span className="text-white font-bold">€14.99<span className="text-zinc-500 text-xs font-normal">/Monat</span></span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                                     <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                        <span className="font-bold text-white">Unbegrenzte Rezepte</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                        <span>200 AI Credits</span>
                                                    </div>
                                                     <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                        <span>Eigenes Branding (PDFs)</span>
                                                    </div>
                                                     <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <Users className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                        <span>Team Feature (Owner-Pays)</span>
                                                    </div>
                                                </div>

                                                <button 
                                                    disabled
                                                    className="w-full py-3 bg-zinc-800 text-zinc-500 font-bold rounded-lg border border-zinc-700 cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <Construction className="w-4 h-4" />
                                                    Momentan nicht verfügbar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Code Redemption Section */}
                                    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                                        <div className="flex flex-col md:flex-row gap-6 items-start">
                                             <div className="flex-1">
                                                <h3 className="font-bold text-white mb-1.5 flex items-center gap-2">
                                                    <Key className="w-4 h-4 text-zinc-500" />
                                                    Enterprise Code
                                                </h3>
                                                <p className="text-xs text-zinc-500 leading-relaxed">
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
                                                        className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none transition-all placeholder:text-zinc-700 font-mono"
                                                        placeholder="LAB-XXXX-XXXX"
                                                        disabled={redeemLoading}
                                                    />
                                                    <button 
                                                        type="submit"
                                                        disabled={redeemLoading || !redeemInput.trim()}
                                                        className="px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-bold transition disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                        {redeemLoading ? '...' : 'Einlösen'}
                                                    </button>
                                                </form>

                                                {redeemMessage && (
                                                    <div className={`mt-3 text-xs font-bold px-3 py-2 rounded border animate-in fade-in slide-in-from-top-1 ${
                                                        redeemMessage.type === 'success' 
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
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
                                    {/* Avatar Display - Controlled by Tier System */}
                                    <div className="md:bg-black md:border md:border-zinc-800 rounded-lg p-6 md:p-8 flex flex-col sm:flex-row items-center gap-8">
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
                                                <Lock className="w-3 h-3" />
                                                <span>Automatisch verwaltet</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:bg-black md:border md:border-zinc-800 rounded-lg p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Anzeigename</label>
                                                <input 
                                                    type="text" 
                                                    value={profile.display_name} 
                                                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                                                    className="w-full px-3 py-2 rounded bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 sm:text-sm"
                                                    placeholder="Dein Name"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Standort</label>
                                                <input 
                                                    type="text" 
                                                    value={profile.location} 
                                                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                                    className="w-full px-3 py-2 rounded bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 sm:text-sm"
                                                    placeholder="z.B. Hamburg"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Gründungsjahr / Start</label>
                                                <input 
                                                    type="number" 
                                                    value={profile.founded_year} 
                                                    onChange={(e) => setProfile({ ...profile, founded_year: e.target.value })}
                                                    className="w-full px-3 py-2 rounded bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 sm:text-sm"
                                                    placeholder="2024"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Geburtsdatum</label>
                                                <input
                                                    type="date"
                                                    value={profile.birthdate || ''}
                                                    onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
                                                    className="w-full px-3 py-2 rounded bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 sm:text-sm"
                                                    placeholder=""
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Webseite</label>
                                                <input 
                                                    type="url" 
                                                    value={profile.website} 
                                                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                                    className="w-full px-3 py-2 rounded bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 sm:text-sm font-mono"
                                                    placeholder="https://..."
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Über dich (Bio)</label>
                                                <textarea 
                                                    value={profile.bio} 
                                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                                    className="w-full px-3 py-2 rounded bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 sm:text-sm min-h-[120px] resize-y"
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
                                            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

                                <div className="space-y-8 pt-8 border-t border-zinc-800">
                                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 group hover:border-zinc-700 transition">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:scale-110 transition">
                                                        <Globe className="w-6 h-6" />
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
                                <div className="md:bg-black md:border md:border-zinc-800 rounded-lg p-4 md:p-8 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                     
                                     <h2 className="text-xl font-bold text-white mb-2 relative">Team beitreten</h2>
                                     <p className="text-sm text-zinc-400 mb-6 max-w-lg relative">
                                        Gib einen Einladungs-Code ein, um einem bestehenden Squad beizutreten.
                                     </p>

                                     <form onSubmit={handleJoinTeam} className="flex flex-col sm:flex-row gap-3 relative z-10 text-white">
                                        <input
                                            type="text"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value)}
                                            placeholder="Einladungs-Code eingeben..."
                                            className="w-full sm:flex-1 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded focus:border-zinc-600 outline-none transition text-white placeholder-zinc-600 font-mono text-sm"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!joinCode || joinLoading}
                                            className="w-full sm:w-auto bg-zinc-100 text-black font-bold px-6 py-2 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                                        >
                                            {joinLoading ? 'Suche...' : 'Beitreten'}
                                        </button>
                                     </form>
                                     <p className="text-[10px] text-zinc-500 mt-2 pl-1">
                                        Frag den Admin eines Teams nach dem Code.
                                     </p>
                                </div>

                                {/* 1.5 Create Section */}
                                <div className="md:bg-black md:border md:border-zinc-800 rounded-lg p-4 md:p-8">
                                    <h3 className="text-lg font-bold text-white mb-2">Neues Team erstellen</h3>
                                    <p className="text-sm text-zinc-400 mb-4">Gründe ein neues Team — du kannst nur ein Team besitzen.</p>

                                    {createMessage && (
                                        <div className={`text-xs font-bold px-4 py-2 rounded-lg mb-3 flex items-center gap-2 ${createMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'}`}>
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
                                            className="w-full sm:flex-1 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded focus:border-zinc-600 outline-none transition text-white placeholder-zinc-600 text-sm"
                                            disabled={createLoading}
                                        />
                                        <button
                                            type="submit"
                                            disabled={createLoading}
                                            className="w-full sm:w-auto bg-emerald-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                                        >
                                            {createLoading ? 'Erstelle...' : 'Team erstellen'}
                                        </button>
                                    </form>

                                    {/* If user already owns a team, show info */}
                                    {myTeams.some(t => t.userRole === 'owner') && (
                                        <p className="text-[12px] text-zinc-500 mt-3">Du bist bereits Besitzer eines Teams. Pro Benutzer ist nur ein eigenes Team erlaubt.</p>
                                    )}
                                </div>

                                {/* 2. List Section */}
                                <div>
                                    <h2 className="text-lg font-bold text-white mb-4">Deine Teams</h2>
                                    
                                    {myTeams.length === 0 ? (
                                        <div className="text-center py-10 bg-zinc-900/30 rounded-lg border border-zinc-800/50 border-dashed flex flex-col items-center">
                                            <Home className="w-12 h-12 text-zinc-700 mb-3" />
                                            <p className="text-zinc-400 font-medium">Du bist noch in keinem Team.</p>
                                        </div>
                                    ) : (

                                        <div className="grid gap-4">
                                            {myTeams.map(team => (
                                                <div key={team.id} className="md:bg-black md:border md:border-zinc-800 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-zinc-700 transition">
                                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                                        {team.logo_url ? (
                                                            <img src={team.logo_url} className="w-12 h-12 rounded-lg object-cover bg-black flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 flex-shrink-0">
                                                                <Factory className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-bold text-white group-hover:text-cyan-400 transition truncate">{team.name}</h3>
                                                            <p className="text-xs text-zinc-500 flex items-center gap-2 flex-wrap">
                                                                <span className="uppercase tracking-wider font-bold bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 border border-zinc-700 whitespace-nowrap">
                                                                    {team.userRole === 'admin' ? 'Admin' : 'Mitglied'}
                                                                </span>
                                                                {team.location && <span className="truncate max-w-[120px]">• {team.location}</span>}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t border-zinc-800/50 pt-3 sm:pt-0 sm:border-0">
                                                        <Link 
                                                            href={`/team/${team.id}`}
                                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
                                                            title="Zum Dashboard"
                                                        >
                                                            <span className="sr-only">Dashboard</span>
                                                            <ArrowRight className="w-4 h-4" />
                                                        </Link>
                                                        {team.userRole !== 'owner' && (
                                                            <button
                                                                onClick={() => handleLeaveTeam(team.id, team.name)}
                                                                className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded transition"
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
                                    <h2 className="text-xl font-bold text-white mb-1">E-Mail Adresse ändern</h2>
                                    <p className="text-sm text-zinc-400">Halte deine Kontaktinformationen aktuell.</p>
                                </div>

                                <div className="md:bg-black md:border md:border-zinc-800 rounded-lg p-6 md:p-8 space-y-6">
                                    <div className="text-sm text-zinc-400 bg-zinc-900 p-3 rounded border border-zinc-800 flex items-center justify-between">
                                        <span className="font-medium text-zinc-500 text-xs">Aktuell</span>
                                        <span className="text-white font-mono">{email}</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                            Neue E-Mail Adresse
                                        </label>
                                        <input
                                            type="email"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            placeholder="neue@email.de"
                                            className="w-full px-3 py-2 rounded bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 sm:text-sm"
                                        />
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={emailLoading || !newEmail || newEmail === email}
                                            className="bg-zinc-800 text-white font-bold px-6 py-2 rounded-lg hover:bg-zinc-700 hover:text-white border border-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            {emailLoading ? 'Sende...' : 'E-Mail ändern'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {activeTab === 'security' && (
                            <form onSubmit={handleUpdatePassword} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">Passwort ändern</h2>
                                    <p className="text-sm text-zinc-400">Wähle ein sicheres Passwort mit mind. 6 Zeichen.</p>
                                </div>

                                <div className="md:bg-black md:border md:border-zinc-800 rounded-lg p-6 md:p-8 space-y-6">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                            Neues Passwort
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full px-3 py-2 rounded bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 sm:text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                                            >
                                                {showPassword ? (
                                                    <Eye className="w-4 h-4" />
                                                ) : (
                                                    <div className="relative">
                                                        <Eye className="w-4 h-4 opacity-50" />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-full h-0.5 bg-zinc-500 rotate-45"></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                            Passwort bestätigen
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full px-3 py-2 rounded bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 sm:text-sm"
                                        />
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={passwordLoading || !newPassword}
                                            className="bg-zinc-800 text-white font-bold px-6 py-2 rounded-lg hover:bg-zinc-700 hover:text-white border border-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            {passwordLoading ? 'Speichere...' : 'Passwort aktualisieren'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                        
                        {activeTab === 'privacy' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">Privatsphäre & Daten</h2>
                                    <p className="text-sm text-zinc-400">Transparenz darüber, welche Daten wir sammeln.</p>
                                </div>

                                <div className="md:bg-black md:border md:border-zinc-800 rounded-lg p-6 md:p-8 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400">
                                            <BarChart3 className="w-6 h-6" />
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
                                    
                                    <div className="text-xs text-zinc-500 pt-6 border-t border-zinc-800">
                                        Mehr Details findest du in unserer <Link href="/privacy" className="text-zinc-400 underline hover:text-white">Datenschutzerklärung</Link>.
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'danger' && (
                             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold text-red-400 mb-1 flex items-center gap-2">
                                        <AlertTriangle className="w-6 h-6" />
                                        Gefahrenzone
                                    </h2>
                                    <p className="text-sm text-zinc-400">Vorsicht! Aktionen hier sind endgültig.</p>
                                </div>

                                <div className="border border-red-900/30 bg-red-950/5 rounded-lg overflow-hidden space-y-6 p-6 md:p-8">
                                     <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                         <div>
                                            <h4 className="font-bold text-zinc-200">Abmelden</h4>
                                            <p className="text-sm text-zinc-500 mt-1 max-w-sm">Beende deine aktuelle Sitzung auf diesem Gerät.</p>
                                        </div>
                                         <button
                                            onClick={() => supabase.auth.signOut().then(() => (window.location.href = '/login'))}
                                            className="w-full sm:w-auto text-zinc-400 hover:text-white hover:bg-zinc-800 px-6 py-2 rounded-lg text-sm font-bold transition border border-zinc-800 hover:border-zinc-500 whitespace-nowrap"
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
                                            className="w-full sm:w-auto text-red-400 hover:text-white hover:bg-red-600 px-6 py-2 rounded-lg text-sm font-bold transition border border-red-900/50 hover:border-red-500 whitespace-nowrap bg-red-950/20 shadow-lg"
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
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-white mb-2">Abo kündigen?</h2>
                        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                            Dein Abo bleibt bis zum Ende der aktuellen Laufzeit aktiv. 
                            Danach wirst du automatisch auf den kostenlosen Plan zurückgestuft.
                        </p>
                        
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                            <p className="text-amber-400 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Diese Aktion kann nicht rückgängig gemacht werden.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowCancelModal(false)}
                                disabled={cancelLoading}
                                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold border border-zinc-700 transition disabled:opacity-50"
                            >
                                Abbrechen
                            </button>
                            <button 
                                onClick={handleCancelSubscription}
                                disabled={cancelLoading}
                                className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
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

