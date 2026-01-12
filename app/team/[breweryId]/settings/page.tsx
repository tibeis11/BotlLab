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
  const [activeTab, setActiveTab] = useState<'general' | 'notifications'>('general');

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
    { id: 'notifications', label: 'Benachrichtigungen', icon: '🔔', requiredRole: ['owner', 'admin', 'member', 'moderator'] }
  ];

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="md:flex gap-8 items-start">
          
          {/* Sidebar Menu */}
          <div className="w-full md:w-64 flex-shrink-0 mb-8 md:mb-0">
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden sticky top-24">
                <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Einstellungen</h3>
                </div>
                <div className="p-2 space-y-1">
                    {menuItems.map(item => {
                        const isAllowed = item.requiredRole.includes(userRole);
                        if (!isAllowed) return null;
                        
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                    isActive 
                                    ? 'bg-cyan-950/50 text-cyan-400 shadow-inner' 
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </button>
                        );
                    })}
                </div>
             </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-6 md:p-8 min-h-[500px]">
              {activeTab === 'general' && isAdmin ? (
                  <GeneralSettings brewery={brewery} onUpdate={() => { loadData(); router.refresh(); }} />
              ) : activeTab === 'notifications' ? (
                  <NotificationSettings breweryId={brewery.id} />
              ) : (
                  <div className="text-zinc-500 text-center py-20">Zugriff verweigert</div>
              )}
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
    <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-black text-white mb-2">Allgemein</h2>
            <p className="text-zinc-500 text-sm">Verwalte die öffentlichen Details deines Squads.</p>
        </div>
        
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
          <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800 space-y-6">
              
              {/* Logo Selection */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                    <div className={`w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${logoPreview ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-700 bg-zinc-900 group-hover:border-cyan-500 group-hover:bg-zinc-800'}`}>
                        {logoPreview ? (
                        <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                        <span className="text-3xl">🏰</span>
                        )}
                        
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-white mb-1">Brauerei Logo</h3>
                    <p className="text-xs text-zinc-500 mb-3">Empfohlen: Quadratisch, mind. 500x500px.</p>
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
                        className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:border-zinc-600 transition"
                    >
                        Bild auswählen
                    </button>
                </div>
              </div>

              <div className="h-px bg-zinc-800/50" />

              {/* Name Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-zinc-400">Brauerei-Name</label>
                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-cyan-900/50 focus-within:border-cyan-500/50 transition duration-300">
                    <span className="text-zinc-500">🏷️</span>
                    <input 
                    type="text"
                    value={breweryName}
                    onChange={e => setBreweryName(e.target.value)}
                    className="bg-transparent border-none outline-none text-white w-full font-bold placeholder-zinc-700"
                    placeholder="Name eingeben..."
                    />
                </div>
              </div>

          </div>

          <div className="pt-2 flex items-center justify-end gap-4">
             {message && (
                <span className={`text-sm font-bold ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'} animate-in fade-in`}>
                    {message.msg}
                </span>
            )}
            <button 
                disabled={isSaving}
                className="bg-cyan-500 text-black font-black py-3 px-8 rounded-xl hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? 'Speichern...' : 'Speichern'}
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
