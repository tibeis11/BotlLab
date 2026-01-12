'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function TeamSettingsPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [brewery, setBrewery] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('member');
  
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
        .select('role')
        .eq('brewery_id', breweryId)
        .eq('user_id', user.id)
        .single();
        
      if (membership) {
         setUserRole(membership.role);
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
    { id: 'general', label: 'Allgemein', icon: '⚙️', requiredRole: ['owner', 'admin'] },
    { id: 'notifications', label: 'Benachrichtigungen', icon: '🔔', requiredRole: ['owner', 'admin', 'member', 'moderator'] },
    { id: 'membership', label: 'Mitgliedschaft', icon: '👤', requiredRole: ['owner', 'admin', 'member', 'moderator'] }
  ];

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="md:flex gap-8 items-start">
          
          {/* Sidebar Menu */}
          <div className="w-full md:w-64 flex-shrink-0 mb-8 md:mb-0">
             <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-3xl overflow-hidden sticky top-24 shadow-xl">
                 {/* Header Style Match */}
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
                     <span className="text-cyan-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-cyan-950/30 border border-cyan-500/10 mb-2 inline-block">
                        Konfiguration
                     </span>
                    <h3 className="text-white font-black text-xl tracking-tight">Settings</h3>
                </div>
                <div className="p-3 space-y-1">
                    {menuItems.map(item => {
                        const isAllowed = item.requiredRole.includes(userRole);
                        if (!isAllowed) return null;
                        
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 border ${
                                    isActive 
                                    ? 'bg-zinc-800 text-white shadow-md border-zinc-700' 
                                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 border-transparent'
                                }`}
                            >
                                <span className={`text-lg ${isActive ? 'scale-110' : 'grayscale opacity-70'} transition-transform`}>{item.icon}</span>
                                {item.label}
                            </button>
                        );
                    })}
                </div>
             </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-zinc-900/30 backdrop-blur-md border border-zinc-800/60 rounded-3xl p-6 md:p-10 min-h-[600px] shadow-2xl relative overflow-hidden">
               {/* Decorative Gradient */}
              <div className="absolute top-0 right-0 p-32 bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none -mt-10 -mr-10"></div>
              
              <div className="relative z-10">
                {activeTab === 'general' && isAdmin ? (
                    <GeneralSettings brewery={brewery} onUpdate={() => { loadData(); router.refresh(); }} />
                ) : activeTab === 'notifications' ? (
                    <NotificationSettings breweryId={brewery.id} />
                ) : activeTab === 'membership' ? (
                    <MembershipSettings breweryId={brewery.id} userRole={userRole} />
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
                        <div className="text-4xl opacity-50">🔒</div>
                        <div className="font-bold">Zugriff verweigert</div>
                    </div>
                )}
              </div>
          </div>
      </div>
    </div>
  );
}

// --- Sub-Components ---

function GeneralSettings({ brewery, onUpdate }: { brewery: any, onUpdate: () => void }) {
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

      setMessage({ type: 'success', msg: 'Einstellungen erfolgreich gespeichert!' });
      onUpdate();

    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', msg: error.message || 'Fehler beim Speichern.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
        <div>
            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Allgemein</h2>
            <p className="text-zinc-400 text-base leading-relaxed max-w-xl">Verwalte die öffentlichen Details, wie Name und Logo, deines Squads.</p>
        </div>
        
        <form onSubmit={handleSaveSettings} className="space-y-8 max-w-2xl">
          <div className="bg-zinc-950/30 p-8 rounded-3xl border border-zinc-800 space-y-8 shadow-inner">
              
              {/* Logo Selection */}
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative group cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                    <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center overflow-hidden transition-all shadow-xl ${logoPreview ? 'border-zinc-800 bg-black' : 'border-zinc-800 border-dashed bg-zinc-900 group-hover:border-cyan-500 group-hover:bg-zinc-800'}`}>
                        {logoPreview ? (
                        <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                        <span className="text-4xl opacity-50 grayscale group-hover:grayscale-0 transition-all">🏰</span>
                        )}
                        
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full backdrop-blur-[2px]">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white scale-75 group-hover:scale-100 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-white mb-1.5 text-lg">Dein Markenzeichen</h3>
                    <p className="text-xs font-medium text-zinc-500 mb-4 leading-relaxed">Das Logo erscheint auf deinen öffentlichen Rezepten und im Feed. <br/> Empfohlen: 500x500px (JPG/PNG).</p>
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
                        className="px-5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-black uppercase tracking-wide text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all shadow-sm"
                    >
                        Bild auswählen
                    </button>
                </div>
              </div>

              <div className="h-px bg-zinc-800/50" />

              {/* Name Input */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-widest text-cyan-500 ml-1">Brauerei-Name</label>
                <div className="flex items-center gap-4 bg-zinc-950 border-2 border-zinc-800 rounded-2xl px-5 py-4 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all duration-300 group">
                    <span className="text-xl grayscale opacity-50 group-focus-within:grayscale-0 group-focus-within:opacity-100 transition-all">🏷️</span>
                    <input 
                    type="text"
                    value={breweryName}
                    onChange={e => setBreweryName(e.target.value)}
                    className="bg-transparent border-none outline-none text-white w-full font-bold text-lg placeholder-zinc-700"
                    placeholder="Wie heißt dein Squad?"
                    />
                </div>
              </div>

          </div>

          <div className="pt-2 flex items-center justify-end gap-4">
             {message && (
                <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'} animate-in slide-in-from-right-4 fade-in`}>
                    {message.type === 'success' ? '✅' : '⚠️'} {message.msg}
                </div>
            )}
            <button 
                disabled={isSaving}
                className="bg-cyan-500 text-black font-black py-4 px-10 rounded-xl hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide text-sm"
            >
                {isSaving ? 'Speichert...' : 'Einstellungen speichern'}
            </button>
          </div>
        </form>
    </div>
  );
}

function NotificationSettings({ breweryId }: { breweryId: string }) {
    const { user } = useAuth();
    const [prefs, setPrefs] = useState({
        // E-Mail
        email_new_brew: true,
        email_new_rating: true,
        email_new_message: true,
        // In-App
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
                // Merge loaded prefs with defaults.
                const loaded = data.preferences;
                
                // Compatibility layer: map old keys (notify_*) to new structure if needed
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
        return <div className="text-zinc-500 animate-pulse text-sm">Lade Einstellungen...</div>;
    }

    const NotificationToggle = ({ label, desc, pKey, disabled }: { label: string, desc: string, pKey: keyof typeof prefs, disabled?: boolean }) => (
        <div className={`flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-700'}`}>
            <div className="pr-4">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white text-sm">{label}</h4>
                    {savingKey === pKey && <span className="text-xs text-cyan-500 animate-pulse">Speichert...</span>}
                    {disabled && <span className="text-[10px] uppercase font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Bald verfügbar</span>}
                </div>
                <p className="text-xs text-zinc-500">{desc}</p>
            </div>
            <button
                disabled={disabled}
                onClick={() => !disabled && togglePref(pKey)}
                className={`flex-shrink-0 relative w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${disabled ? 'bg-zinc-800 cursor-not-allowed' : (prefs[pKey] ? 'bg-cyan-600' : 'bg-zinc-800')}`}
            >
                <div className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${disabled ? 'bg-zinc-600 translate-x-0' : (prefs[pKey] ? 'bg-white translate-x-6' : 'bg-white translate-x-0')}`} />
            </button>
        </div>
    );

    return (
        <div className="space-y-10">
            {/* IN-APP SECTION */}
            <div className="space-y-4">
                <div className="mb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <span className="text-xl">🔔</span> In-App Mitteilungen
                    </h3>
                    <p className="text-zinc-500 text-xs">Infos oben rechts in der App (Toasts).</p>
                </div>
                
                <NotificationToggle 
                    label="Neues Rezept" 
                    desc="Wenn jemand ein neues Rezept anlegt."
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

            {/* EMAIL SECTION */}
            <div className="space-y-4">
                <div className="mb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2 opacity-50">
                        <span className="text-xl">📧</span> E-Mail Benachrichtigungen
                    </h3>
                    <p className="text-zinc-500 text-xs">Werden an deine registrierte E-Mail Adresse gesendet.</p>
                </div>

                <NotificationToggle 
                    label="Neues Rezept per Mail" 
                    desc="Lasse dich per E-Mail informieren."
                    pKey="email_new_brew"
                    disabled={true}
                />
                <NotificationToggle 
                    label="Neue Bewertung per Mail" 
                    desc="Erhalte eine Zusammenfassung der Bewertung."
                    pKey="email_new_rating"
                    disabled={true}
                />
                <NotificationToggle 
                    label="Nachrichten per Mail" 
                    desc="Wenn du offline bist, informieren wir dich per Mail."
                    pKey="email_new_message"
                    disabled={true}
                />
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div>
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Mitgliedschaft</h2>
                <p className="text-zinc-400 text-base leading-relaxed max-w-xl">
                    Verwalte deine Zugehörigkeit zu diesem Squad.
                </p>
            </div>

            <div className="bg-red-950/20 border border-red-500/20 rounded-3xl p-8 space-y-6">
                <div>
                    <h3 className="text-red-400 font-bold text-xl mb-2 flex items-center gap-2">
                        <span>⚠️</span> Zone der Gefahr
                    </h3>
                    <p className="text-red-200/70 text-sm leading-relaxed max-w-md">
                        Wenn du den Squad verlässt, verlierst du Zugriff auf alle nicht-öffentlichen Rezepte, Chatverläufe und interne Bereiche dieser Brauerei.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-red-950/30 rounded-2xl border border-red-500/10">
                    <div>
                         <span className="block text-white font-bold mb-0.5">Austritt</span>
                         <span className="text-xs text-red-300/50">Diese Aktion kann nicht rückgängig gemacht werden.</span>
                    </div>
                    <button 
                        onClick={handleLeaveSquad}
                        disabled={isLeaving}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isLeaving ? 'Verlasse...' : 'Squad verlassen'}
                    </button>
                </div>
            </div>
        </div>
    );
}
