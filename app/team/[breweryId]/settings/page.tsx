'use client';

import { useEffect, useState, use } from 'react';
import { supabase, getBreweryMembers } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function TeamSettingsPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [brewery, setBrewery] = useState<any>(null);
  const [canEdit, setCanEdit] = useState(false);
  
  // Form state
  const [breweryName, setBreweryName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  
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
        // Redirection handled by layout or middleware usually, but good fallback by layout or middleware usually, but good fallback
        router.push('/login');
        return;
      }

      // Load specific brewery by ID instead of "active"
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

      // Security check: Is user actually a member/admin?
      // Since specific permissions aren't fully detailed yet, 
      // we assume if RLS lets us read/update, it's fine. 
      // Ideally we check the `brewery_members` table here too.
      const { data: membership } = await supabase
        .from('brewery_members')
        .select('role')
        .eq('brewery_id', breweryId)
        .eq('user_id', user.id)
        .single();
        
      if (!membership || !['owner', 'admin'].includes(membership.role)) {
         setCanEdit(false);
         setMessage({ type: 'error', msg: 'Nur Admins können Team-Einstellungen ändern.' });
      } else {
         setCanEdit(true);
      }

      setBrewery(breweryData);
      setBreweryName(breweryData.name || "");
      setLogoPreview(breweryData.logo_url || null);
      setHeaderPreview(breweryData.header_url || null);

    } finally {
      setLoading(false);
    }
  }

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
    if (!brewery) return;

    setIsSaving(true);
    setMessage(null);

    try {
      let logoUrl = brewery.logo_url;
      let headerUrl = brewery.header_url;

      // Upload logo if changed
      if (logoFile) {
        const fileName = `${brewery.id}/logo_${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { data, error } = await supabase.storage
          .from('brewery-assets')
          .upload(fileName, logoFile, { upsert: true });
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('brewery-assets')
          .getPublicUrl(fileName);
        
        logoUrl = publicUrl;
      }

      // Upload header if changed
      if (headerFile) {
        const fileName = `${brewery.id}/header_${Date.now()}.${headerFile.name.split('.').pop()}`;
        const { data, error } = await supabase.storage
          .from('brewery-assets')
          .upload(fileName, headerFile, { upsert: true });
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('brewery-assets')
          .getPublicUrl(fileName);
        
        headerUrl = publicUrl;
      }

      // Update brewery
      const { error } = await supabase
        .from('breweries')
        .update({
          name: breweryName, // Note: We might want distinct display_name vs internal name later
          logo_url: logoUrl,
          header_url: headerUrl,
        })
        .eq('id', brewery.id);

      if (error) throw error;

      setMessage({ type: 'success', msg: 'Einstellungen erfolgreich gespeichert!' });
      
      // Reload to ensure sync
      await loadData();
      router.refresh(); 

    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', msg: error.message || 'Fehler beim Speichern.' });
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) return <div className="p-20 text-center animate-pulse text-zinc-500">Lade Einstellungen...</div>;
  if (!brewery) return <div className="p-20 text-center text-red-500">Brauerei nicht gefunden oder Zugriff verweigert.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
        <h2 className="text-2xl font-black mb-6 text-white">Brauerei-Einstellungen</h2>
        
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold mb-2 text-zinc-400">Brauerei-Name</label>
            <input 
              type="text"
              value={breweryName}
              disabled={!canEdit}
              onChange={e => setBreweryName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl outline-none focus:border-cyan-500 transition text-white placeholder-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="z.B. Hopfenrebellen Crew"
            />
          </div>

          {/* Logo */}
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
                {canEdit && (
                    <>
                    <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-900 file:text-cyan-400 hover:file:bg-cyan-800 file:cursor-pointer transition-colors"
                    />
                    <p className="text-xs text-zinc-600 mt-2">JPG, PNG oder GIF. Max. 2 MB.</p>
                    </>
                )}
                {!canEdit && <p className="text-zinc-500 text-sm italic">Änderungen nur durch Admin möglich.</p>}
              </div>
            </div>
          </div>

          {/* Header */}
          <div>
            <label className="block text-sm font-bold mb-2 text-zinc-400">Header-Bild</label>
            <div className="space-y-3">
              {headerPreview && (
                <div className="w-full h-32 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <img src={headerPreview} className="w-full h-full object-cover" alt="Header" />
                </div>
              )}
              {canEdit && (
                <>
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleHeaderChange}
                    className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-900 file:text-cyan-400 hover:file:bg-cyan-800 file:cursor-pointer transition-colors"
                />
                <p className="text-xs text-zinc-600">Empfohlen: 1200x300px. JPG oder PNG. Max. 5 MB.</p>
                </>
              )}
            </div>
          </div>

          <div className="pt-4">
            {canEdit && (
                <button 
                    disabled={isSaving}
                    className="w-full bg-white text-black font-black py-3 rounded-xl hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                    {isSaving ? 'Speichern...' : 'Änderungen speichern'}
                </button>
            )}
          </div>

          {message && (
            <div className={`text-sm p-4 rounded-xl font-medium border ${
                message.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {message.msg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
