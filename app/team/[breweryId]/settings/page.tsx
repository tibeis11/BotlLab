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
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(brewery.logo_url);
  const [headerPreview, setHeaderPreview] = useState<string | null>(brewery.header_url);
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  }

  function handleHeaderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setHeaderFile(file);
      setHeaderPreview(URL.createObjectURL(file));
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      let logoUrl = brewery.logo_url;
      let headerUrl = brewery.header_url;

      // Upload logo if changed
      if (logoFile) {
        const fileName = `${brewery.id}/logo_${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('brewery-assets').upload(fileName, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('brewery-assets').getPublicUrl(fileName);
        logoUrl = publicUrl;
      }

      // Upload header if changed
      if (headerFile) {
        const fileName = `${brewery.id}/header_${Date.now()}.${headerFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('brewery-assets').upload(fileName, headerFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('brewery-assets').getPublicUrl(fileName);
        headerUrl = publicUrl;
      }

      // Update brewery
      const { error } = await supabase
        .from('breweries')
        .update({
          name: breweryName,
          logo_url: logoUrl,
          header_url: headerUrl,
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
        
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-zinc-400">Brauerei-Name</label>
            <input 
              type="text"
              value={breweryName}
              onChange={e => setBreweryName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl outline-none focus:border-cyan-500 transition text-white placeholder-zinc-600"
              placeholder="z.B. Hopfenrebellen Crew"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-zinc-400">Profilbild / Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <span className="text-2xl">🏰</span>
                )}
              </div>
              <div className="flex-1">
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-900 file:text-cyan-400 hover:file:bg-cyan-800 file:cursor-pointer transition-colors"
                />
                <p className="text-xs text-zinc-600 mt-2">JPG, PNG oder GIF. Max. 2 MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-zinc-400">Header-Bild</label>
            <div className="space-y-3">
              {headerPreview && (
                <div className="w-full h-32 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <img src={headerPreview} className="w-full h-full object-cover" alt="Header" />
                </div>
              )}
              <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleHeaderChange}
                  className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-900 file:text-cyan-400 hover:file:bg-cyan-800 file:cursor-pointer transition-colors"
              />
              <p className="text-xs text-zinc-600">Empfohlen: 1200x300px. JPG oder PNG. Max. 5 MB.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <button 
                disabled={isSaving}
                className="bg-white text-black font-black py-3 px-8 rounded-xl hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
            {message && (
                <span className={`ml-4 text-sm font-bold ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {message.msg}
                </span>
            )}
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

    const NotificationToggle = ({ label, desc, pKey }: { label: string, desc: string, pKey: keyof typeof prefs }) => (
        <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
            <div className="pr-4">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white text-sm">{label}</h4>
                    {savingKey === pKey && <span className="text-xs text-cyan-500 animate-pulse">Speichert...</span>}
                </div>
                <p className="text-xs text-zinc-500">{desc}</p>
            </div>
            <button
                onClick={() => togglePref(pKey)}
                className={`flex-shrink-0 relative w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${prefs[pKey] ? 'bg-cyan-600' : 'bg-zinc-800'}`}
            >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${prefs[pKey] ? 'translate-x-6' : 'translate-x-0'}`} />
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
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <span className="text-xl">📧</span> E-Mail Benachrichtigungen
                    </h3>
                    <p className="text-zinc-500 text-xs">Werden an deine registrierte E-Mail Adresse gesendet.</p>
                </div>

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
    );
}
