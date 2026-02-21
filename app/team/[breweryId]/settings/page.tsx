'use client';

import { useEffect, useState, use } from 'react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import PremiumFeatureLock from '@/app/components/PremiumFeatureLock';
import { SubscriptionTier } from '@/lib/premium-config';
import { Settings, Bell, Users, Lock, Factory, Mail, ShieldAlert, FlaskConical, Plus, Trash2, Pencil, Check, Star, X, Loader2 } from 'lucide-react';
import ResponsiveTabs from '@/app/components/ResponsiveTabs';
import { EquipmentProfile, BREW_METHOD_LABELS } from '@/lib/types/equipment';

export default function TeamSettingsPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const supabase = useSupabase();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [brewery, setBrewery] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [ownerPremiumTier, setOwnerPremiumTier] = useState<SubscriptionTier>('free');
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'membership' | 'equipment'>('general');

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
         setUserRole(membership.role || 'member');

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
         if (!['owner', 'admin'].includes(membership.role || '')) {
             setActiveTab('notifications' as any);
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
    { id: 'equipment', label: 'Brauanlage', icon: FlaskConical, requiredRole: ['owner', 'admin'] },
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
                ) : activeTab === 'equipment' && isAdmin ? (
                    <EquipmentSettings breweryId={brewery.id} />
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
  const supabase = useSupabase();
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

// ─────────────────────────────────────────────────────────────────────────────
// EquipmentSettings — Brauanlage-Profile verwalten
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<EquipmentProfile, 'id' | 'brewery_id' | 'created_at' | 'updated_at'> = {
  name:               '',
  brew_method:        'all_grain',
  batch_volume_l:     20,
  boil_off_rate:      3.5,
  trub_loss:          0.5,
  grain_absorption:   0.96,
  cooling_shrinkage:  0.04,
  mash_thickness:     3.5,
  default_efficiency: 75,
  is_default:         false,
};

function EquipmentSettings({ breweryId }: { breweryId: string }) {
  const supabase = useSupabase();

  const [profiles, setProfiles]         = useState<EquipmentProfile[]>([]);
  const [loading, setLoading]           = useState(true);
  const [editingId, setEditingId]       = useState<string | 'new' | null>(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [message, setMessage]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => { loadProfiles(); }, [breweryId]);

  async function loadProfiles() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('equipment_profiles')
      .select('*')
      .eq('brewery_id', breweryId)
      .order('created_at', { ascending: true });
    if (!error) setProfiles(data ?? []);
    setLoading(false);
  }

  function openNew() {
    setForm({ ...EMPTY_FORM });
    setEditingId('new');
    setMessage(null);
  }

  function openEdit(p: EquipmentProfile) {
    setForm({
      name:               p.name,
      brew_method:        p.brew_method,
      batch_volume_l:     p.batch_volume_l,
      boil_off_rate:      p.boil_off_rate,
      trub_loss:          p.trub_loss,
      grain_absorption:   p.grain_absorption,
      cooling_shrinkage:  p.cooling_shrinkage,
      mash_thickness:     p.mash_thickness,
      default_efficiency: p.default_efficiency ?? 75,
      is_default:         p.is_default,
    });
    setEditingId(p.id);
    setMessage(null);
  }

  function cancelEdit() { setEditingId(null); setMessage(null); }

  async function handleSave() {
    if (!form.name.trim()) {
      setMessage({ type: 'error', msg: 'Name darf nicht leer sein.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      if (editingId === 'new') {
        const { error } = await (supabase as any)
          .from('equipment_profiles')
          .insert({ ...form, brewery_id: breweryId });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('equipment_profiles')
          .update({ ...form })
          .eq('id', editingId)
          .eq('brewery_id', breweryId);
        if (error) throw error;
      }
      setMessage({ type: 'success', msg: 'Gespeichert!' });
      setTimeout(() => { setEditingId(null); setMessage(null); }, 800);
      await loadProfiles();
    } catch (e: any) {
      setMessage({ type: 'error', msg: e.message ?? 'Fehler beim Speichern.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(profileId: string) {
    setSettingDefault(profileId);
    try {
      await (supabase as any).rpc('set_default_equipment_profile', {
        p_profile_id: profileId,
        p_brewery_id: breweryId,
      });
      await loadProfiles();
    } finally {
      setSettingDefault(null);
    }
  }

  async function handleDelete(profileId: string) {
    if (!confirm('Anlage-Profil wirklich löschen?')) return;
    setDeletingId(profileId);
    await (supabase as any)
      .from('equipment_profiles')
      .delete()
      .eq('id', profileId)
      .eq('brewery_id', breweryId);
    setDeletingId(null);
    await loadProfiles();
  }

  const numField = (
    label: string,
    key: keyof typeof form,
    step = 0.1,
    placeholder = ''
  ) => (
    <div>
      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        type="number"
        step={step}
        placeholder={placeholder}
        value={form[key] as number}
        onChange={e => setForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition"
      />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="md:bg-black md:border md:border-zinc-800 md:rounded-lg md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5" />
            Brauanlage-Profile
          </h3>
          {editingId === null && (
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3 h-3" /> Neue Anlage
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-zinc-500 text-sm animate-pulse font-mono">Lade Profile...</div>
        ) : (
          <div className="space-y-3">

            {/* Profile-Liste */}
            {profiles.length === 0 && editingId === null && (
              <div className="text-center py-10 text-zinc-600 text-sm">
                <FlaskConical className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Noch keine Brauanlage konfiguriert.</p>
                <p className="text-xs mt-1">Erstelle ein Profil um Verdampfung, Trubverlust und Co. einmalig zu hinterlegen.</p>
              </div>
            )}

            {profiles.map(p => (
              <div key={p.id} className={`border rounded-lg p-4 transition ${p.is_default ? 'border-cyan-700 bg-cyan-950/20' : 'border-zinc-800 bg-zinc-900/30'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {p.is_default && <Star className="w-3 h-3 text-cyan-400 fill-cyan-400 flex-shrink-0" />}
                      <span className="font-semibold text-white text-sm truncate">{p.name}</span>
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 rounded font-mono uppercase">{BREW_METHOD_LABELS[p.brew_method]}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500 font-mono">
                      <span>{p.batch_volume_l} L</span>
                      <span>{p.boil_off_rate} L/h Verdampfung</span>
                      <span>{p.trub_loss} L Trub</span>
                      <span>{p.grain_absorption} L/kg Absorption</span>
                      <span>{p.mash_thickness} L/kg Maische</span>
                      <span className="text-cyan-600">{p.default_efficiency ?? 75} % SHA</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!p.is_default && (
                      <button
                        onClick={() => handleSetDefault(p.id)}
                        disabled={settingDefault === p.id}
                        title="Als Standard setzen"
                        className="p-1.5 rounded text-zinc-500 hover:text-cyan-400 hover:bg-cyan-950/30 transition disabled:opacity-50"
                      >
                        {settingDefault === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(p)}
                      title="Bearbeiten"
                      className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      title="Löschen"
                      className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition disabled:opacity-50"
                    >
                      {deletingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Edit / New Form */}
            {editingId !== null && (
              <div className="border border-cyan-800/50 bg-cyan-950/10 rounded-xl p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  {editingId === 'new' ? 'Neue Brauanlage' : 'Anlage bearbeiten'}
                </h4>

                {/* Name + Braumethode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Name *</label>
                    <input
                      type="text"
                      placeholder="z.B. Grainfather 35L"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Braumethode</label>
                    <select
                      value={form.brew_method}
                      onChange={e => setForm(prev => ({ ...prev, brew_method: e.target.value as EquipmentProfile['brew_method'] }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none transition appearance-none"
                    >
                      <option value="all_grain">All-Grain</option>
                      <option value="extract">Extrakt</option>
                      <option value="biab">BIAB</option>
                    </select>
                  </div>
                </div>

                {/* Parameter-Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {numField('Zielvolumen (L)', 'batch_volume_l', 0.5, '20')}
                  {numField('Verdampfung (L/h)', 'boil_off_rate', 0.5, '3.5')}
                  {numField('Trubverlust (L)', 'trub_loss', 0.1, '0.5')}
                  {numField('Kornabsorption (L/kg)', 'grain_absorption', 0.05, '0.96')}
                  {numField('Kühlschwand (0.04 = 4%)', 'cooling_shrinkage', 0.01, '0.04')}
                  {form.brew_method !== 'extract' && numField('Maischedicke (L/kg)', 'mash_thickness', 0.1, '3.5')}
                  {numField('Typische SHA (%)', 'default_efficiency', 1, '75')}
                </div>
                <p className="text-[10px] text-zinc-600 italic -mt-2">
                  SHA = Sudhausausbeute. Wird als Vorschlagswert im Rezept-Editor und bei neuen Sessions verwendet. Kann pro Rezept überschrieben werden.
                </p>

                {/* Als Standard */}
                <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={e => setForm(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="accent-cyan-500 w-4 h-4 rounded"
                  />
                  Als Standardanlage für neue Sude verwenden
                </label>

                {/* Feedback */}
                {message && (
                  <p className={`text-xs font-medium ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {message.msg}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Speichern
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
                  >
                    <X className="w-3.5 h-3.5" /> Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationSettings({ breweryId }: { breweryId: string }) {
    const supabase = useSupabase();
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
                const loaded = data.preferences as any;
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
    const supabase = useSupabase();
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
