'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import PremiumFeatureLock from '@/app/components/PremiumFeatureLock';
import { SubscriptionTier } from '@/lib/premium-config';
import { Settings, Bell, Users, Lock, Factory, Mail, ShieldAlert } from 'lucide-react';
import ResponsiveTabs from '@/app/components/ResponsiveTabs';

export default function TeamSettingsPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [brewery, setBrewery] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [ownerPremiumTier, setOwnerPremiumTier] = useState<SubscriptionTier>('free');
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'membership'>('general');

  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [breweryId, authLoading]);

  async function loadData() {
    try {
      setLoading(true);
      if (!user) {
        router.push('/login');
        return;
      }

      // Load specific brewery
      const { data: breweryData, error } = await supabase
        .from('breweries')
        .select('*')
        .eq('id', breweryId)
        .single();

      if (error || !breweryData) {
        console.error('Error loading brewery:', error);
        router.push('/dashboard'); 
        return;
      }

      // Check role
      const { data: membership } = await supabase
        .from('brewery_members')
        .select('role, profiles(subscription_tier)')
        .eq('brewery_id', breweryId)
        .eq('user_id', user.id)
        .single();
        
      if (membership) {
         setUserRole(membership.role);
         
         // Fetch owner's tier (only owners determine premium features for brewery)
         const { data: ownerMember } = await supabase
           .from('brewery_members')
           .select('profiles(subscription_tier)')
           .eq('brewery_id', breweryId)
           .eq('role', 'owner')
           .single();
           
         if (ownerMember) {
           setOwnerPremiumTier((ownerMember.profiles as any).subscription_tier);
         }

         // If regular member, default to notifications tab since they can't edit general
         if (!['owner', 'admin'].includes(membership.role)) {
             setActiveTab('notifications');
         }
      }

      setBrewery(breweryData);

    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-500">Lade Einstellungen...</div>;
  if (!brewery) return <div className="p-20 text-center text-red-500">Brauerei nicht gefunden oder Zugriff verweigert.</div>;

  const isAdmin = ['owner', 'admin'].includes(userRole);

  const menuItems = [
    { id: 'general', label: 'Allgemein', icon: Settings, requiredRole: ['owner', 'admin'] },
    { id: 'notifications', label: 'Benachrichtigungen', icon: Bell, requiredRole: ['owner', 'admin', 'member', 'moderator'] },
    { id: 'membership', label: 'Mitgliedschaft', icon: Users, requiredRole: ['owner', 'admin', 'member', 'moderator'] }
  ];

  const filteredItems = menuItems.filter(item => item.requiredRole.includes(userRole));

  return (
    <div className="text-white font-sans antialiased animate-in fade-in duration-500">
      
      <div className="w-full space-y-8">
        
        {/* Header Section like Admin Dashboard */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Brauerei Einstellungen
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wide">
                  Settings
                </span>
              </div>
              <p className="text-sm text-zinc-500">Verwalte deinen Squad und deine Präferenzen.</p>
            </div>
            
             <div className="hidden md:block text-right">
                <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-0.5">Current Context</p>
                <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                    <p className="text-zinc-300 font-mono text-xs">{brewery.name}</p>
                </div>
            </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          
          <div className="w-full lg:w-64 flex-shrink-0">
             <ResponsiveTabs 
                items={filteredItems} 
                activeTab={activeTab} 
                onTabChange={(id) => setActiveTab(id as any)} 
                variant='sidebar'
                className="w-full"
             />
          </div>

          {/* Main Content Area - Matching DashboardClient layout */}
          <main className="flex-1 min-w-0">
                {activeTab === 'general' && isAdmin ? (
                    <GeneralSettings 
                      brewery={brewery} 
                      onUpdate={() => { loadData(); router.refresh(); }} 
                      ownerPremiumTier={ownerPremiumTier}
                    />
                ) : activeTab === 'notifications' ? (
                    <NotificationSettings breweryId={brewery.id} />
                ) : activeTab === 'membership' ? (
                    <MembershipSettings breweryId={brewery.id} userRole={userRole} />
                ) : (
                    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center flex flex-col items-center">
                        <Lock className="w-12 h-12 text-zinc-700 mb-4" />
                         <h3 className="text-white font-bold mb-2">Zugriff verweigert</h3>
                         <p className="text-zinc-500 text-sm">Du hast keine Berechtigung für diesen Bereich.</p>
                    </div>
                )}
          </main>
      </div>
      </div>
    </div>
  );
}

// --- Sub-Components ---

function GeneralSettings({ 
  brewery, 
  onUpdate,
  ownerPremiumTier
}: { 
  brewery: any, 
  onUpdate: () => void,
  ownerPremiumTier: SubscriptionTier
}) {
  const [breweryName, setBreweryName] = useState(brewery.name || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(brewery.logo_url);
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      let logoUrl = brewery.logo_url;

      // Upload logo if changed
      if (logoFile) {
        const fileName = `${brewery.id}/logo_${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('brewery-assets').upload(fileName, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('brewery-assets').getPublicUrl(fileName);
        logoUrl = publicUrl;
      }

      // Update brewery
      const { error } = await supabase
        .from('breweries')
        .update({
          name: breweryName,
          logo_url: logoUrl,
        })
        .eq('id', brewery.id);

      if (error) throw error;

      setMessage({ type: 'success', msg: 'Einstellungen gespeichert!' });
      onUpdate();

    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', msg: error.message || 'Fehler beim Speichern.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
        
        <form onSubmit={handleSaveSettings} className="space-y-6">
              
             {/* Card Style matching MetricCard/Admin Panels */}
             <div className="md:bg-black md:border md:border-zinc-800 md:rounded-lg md:p-6">
                <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-6">Allgemein</h3>
                
                <div className="space-y-6">
                    {/* Logo Section */}
                    <div className="flex items-start gap-6">
                         <div className="relative group cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                            <div className={`w-20 h-20 rounded-lg border flex items-center justify-center overflow-hidden transition-all ${logoPreview ? 'border-zinc-700 bg-black' : 'border-dashed border-zinc-700 bg-zinc-900 hover:border-zinc-500 group'}`}>
                                {logoPreview ? (
                                <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                                ) : (
                                <Factory className="w-8 h-8 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-1">
                             <label className="block text-sm font-medium text-white mb-1">Brand Identity</label>
                             <p className="text-xs text-zinc-500 mb-3">Das Logo für Rezepte & Feed. Empfohlen: 500x500px.</p>
                             
                              <input 
                                id="logo-upload"
                                type="file" 
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="hidden"
                            />
                            <button 
                                type="button" 
                                onClick={() => document.getElementById('logo-upload')?.click()}
                                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-1.5 px-3 rounded border border-zinc-700 transition-colors"
                            >
                                Bild hochladen
                            </button>
                        </div>
                    </div>

                    {/* Name Input - Matching AdminPlanSwitcher INPUT style */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Brauerei Name</label>
                        <input 
                            type="text"
                            value={breweryName}
                            onChange={e => setBreweryName(e.target.value)}
                            className="w-full px-3 py-2 rounded bg-zinc-900 text-white border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700 sm:text-sm"
                            placeholder="E.g. CyberBrew Labs"
                        />
                    </div>
                </div>
              </div>


            <div className="flex items-center justify-end gap-3">
                {message && (
                    <span className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                        {message.msg}
                    </span>
                )}
                <button 
                    disabled={isSaving}
                    className="bg-white text-black hover:bg-zinc-200 font-bold py-2 px-4 rounded text-sm transition-colors disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    </div>
  );
}

function NotificationSettings({ breweryId }: { breweryId: string }) {
    const { user } = useAuth();
    const [prefs, setPrefs] = useState({
        email_new_brew: true,
        email_new_rating: true,
        email_new_message: true,
        in_app_new_brew: true,
        in_app_new_rating: true,
        in_app_new_message: true
    });
    const [isLoading, setIsLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadPrefs();
        }
    }, [user, breweryId]);

    async function loadPrefs() {
        try {
            const { data, error } = await supabase
                .from('brewery_members')
                .select('preferences')
                .eq('brewery_id', breweryId)
                .eq('user_id', user!.id)
                .single();
            
            if (data?.preferences) {
                const loaded = data.preferences;
                if (loaded.notify_new_brew !== undefined && loaded.email_new_brew === undefined) {
                     loaded.email_new_brew = loaded.notify_new_brew;
                     loaded.in_app_new_brew = loaded.notify_new_brew;
                }
                if (loaded.notify_new_rating !== undefined && loaded.email_new_rating === undefined) {
                     loaded.email_new_rating = loaded.notify_new_rating;
                     loaded.in_app_new_rating = loaded.notify_new_rating;
                }
                 if (loaded.notify_new_message !== undefined && loaded.email_new_message === undefined) {
                     loaded.email_new_message = loaded.notify_new_message;
                     loaded.in_app_new_message = loaded.notify_new_message;
                }

                setPrefs(prev => ({ ...prev, ...loaded }));
            }
        } catch (e) {
            console.error("Error loading preferences:", e);
        } finally {
            setIsLoading(false);
        }
    }

    async function togglePref(key: keyof typeof prefs) {
        if (!user) return;
        
        const newVal = !prefs[key];
        const newPrefs = { ...prefs, [key]: newVal };
        
        setPrefs(newPrefs);
        setSavingKey(key);

        try {
            const { error } = await supabase
                .from('brewery_members')
                .update({ preferences: newPrefs })
                .eq('brewery_id', breweryId)
                .eq('user_id', user.id);

            if (error) throw error;
        } catch (e) {
            console.error("Error saving preference:", e);
            setPrefs(prev => ({ ...prev, [key]: !newVal }));
        } finally {
            setSavingKey(null);
        }
    }

    if (isLoading) {
        return <div className="text-zinc-500 animate-pulse text-sm font-mono p-4">LOADING_PREFS...</div>;
    }

    const NotificationToggle = ({ label, desc, pKey, disabled }: { label: string, desc: string, pKey: keyof typeof prefs, disabled?: boolean }) => (
        <div className="flex items-center justify-between py-3">
            <div className="pr-4">
                <div className="flex items-center gap-3 mb-0.5">
                    <span className={`text-sm font-medium ${disabled ? 'text-zinc-500' : 'text-zinc-300'}`}>{label}</span>
                    {savingKey === pKey && <span className="text-[10px] font-mono text-cyan-500 animate-pulse">SAVING</span>}
                    {disabled && <span className="text-[9px] uppercase font-bold bg-zinc-900 border border-zinc-800 text-zinc-600 px-1 rounded">Soon</span>}
                </div>
                <p className="text-xs text-zinc-500">{desc}</p>
            </div>
            <button
                disabled={disabled}
                onClick={() => !disabled && togglePref(pKey)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    disabled ? (prefs[pKey] ? 'bg-cyan-900' : 'bg-zinc-800') : (prefs[pKey] ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-zinc-700 hover:bg-zinc-600')
                }`}
            >
                <span
                    className={`${
                        prefs[pKey] ? 'translate-x-4' : 'translate-x-1'
                    } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`}
                />
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            
            {/* IN-APP SECTION */}
            <div className="md:bg-black md:border md:border-zinc-800 md:rounded-lg md:p-6">
                <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
                     <Bell className="w-3.5 h-3.5" />
                     In-App Mitteilungen
                </h3>
                
                <div className="divide-y divide-zinc-900">
                    <NotificationToggle 
                        label="Neues Rezept" 
                        desc="Wenn jemand ein neues Rezept anglegt."
                        pKey="in_app_new_brew"
                    />
                    <NotificationToggle 
                        label="Neue Bewertung" 
                        desc="Bei neuen Bewertungen zu deinen Bieren."
                        pKey="in_app_new_rating"
                    />
                    <NotificationToggle 
                        label="Neue Nachricht" 
                        desc="Kommentare im Feed oder Chat."
                        pKey="in_app_new_message"
                    />
                </div>
            </div>

            {/* EMAIL SECTION */}
            <div className="md:bg-black md:border md:border-zinc-800 md:rounded-lg md:p-6">
                 <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
                     <Mail className="w-3.5 h-3.5" />
                     E-Mail Alerts
                </h3>

                <div className="divide-y divide-zinc-900">
                    <NotificationToggle 
                        label="Neues Rezept per Mail" 
                        desc="Lasse dich per E-Mail informieren."
                        pKey="email_new_brew"
                    />
                    <NotificationToggle 
                        label="Neue Bewertung per Mail" 
                        desc="Erhalte eine Zusammenfassung der Bewertung."
                        pKey="email_new_rating"
                    />
                    <NotificationToggle 
                        label="Nachrichten per Mail" 
                        desc="Wenn du offline bist, informieren wir dich per Mail."
                        pKey="email_new_message"
                    />
                </div>
            </div>
        </div>
    );
}

function MembershipSettings({ breweryId, userRole }: { breweryId: string, userRole: string }) {
    const { user } = useAuth();
    const router = useRouter();
    const [isLeaving, setIsLeaving] = useState(false);

    async function handleLeaveSquad() {
        if (!user) return;
        
        if (userRole === 'owner') {
             alert("Du bist der Owner dieses Squads. Bitte übertrage zuerst die Eigentumsrechte oder lösche den Squad, um auszutreten.");
             return;
        }

        if (!confirm("Bist du sicher, dass du diesen Squad verlassen möchtest? Dein Zugriff auf interne Rezepte und Inhalte geht sofort verloren.")) {
            return;
        }

        setIsLeaving(true);
        try {
            const { error } = await supabase
                .from('brewery_members')
                .delete()
                .eq('brewery_id', breweryId)
                .eq('user_id', user.id);

            if (error) throw error;
            
            // Success
            window.location.href = '/dashboard'; 
        } catch (e: any) {
            console.error(e);
            alert("Fehler beim Austreten: " + e.message);
            setIsLeaving(false);
        }
    }

    return (
        <div className="space-y-6">
             <div className="md:bg-black md:border md:border-red-900/30 md:rounded-lg md:p-6">
                <h3 className="text-red-500 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Danger Zone
                </h3>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                         <h4 className="text-white font-medium text-sm mb-1">Squad verlassen</h4>
                         <p className="text-zinc-500 text-xs max-w-md">
                            Du verlierst Zugriff auf alle internen Rezepte, den Chatverlauf sowie exklusive Inhalte dieses Squads.
                         </p>
                    </div>
                    <button 
                        onClick={handleLeaveSquad}
                        disabled={isLeaving}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-xs transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        {isLeaving ? 'Verlasse...' : 'Squad verlassen'}
                    </button>
                </div>
            </div>
        </div>
    );
}
