'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function NewSessionPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [recipes, setRecipes] = useState<any[]>([]); // Contains group property: 'own' | 'saved'
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form State
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [batchCode, setBatchCode] = useState('');
  const [brewedAt, setBrewedAt] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function loadRecipes() {
      if (authLoading) return;
      if (!user) {
          setLoading(false);
          return;
      }

      try {
        setLoading(true);

        // 1. Fetch Own Recipes
        const { data: ownData, error: ownError } = await supabase
            .from('brews')
            .select('*')
            .eq('brewery_id', breweryId)
            .order('name', { ascending: true });

        // 2. Fetch Saved Brews from Library
        const { data: savedData, error: savedError } = await supabase
            .from('brewery_saved_brews')
            .select(`
                brew_id,
                brews (*)
            `)
            .eq('brewery_id', breweryId);

        const ownBrews = (ownData || []).map(b => ({ ...b, sourceGroup: 'own' }));
        
        // Extract brews from library and filter out nulls or deleted ones
        const savedBrewsRaw = savedData?.map((item: any) => item.brews).filter(b => b !== null) || [];
        
        // Filter out duplicates (though unlikely logic, saved brews are distinct)
        const ownIds = new Set(ownBrews.map(b => b.id));
        const savedBrews = savedBrewsRaw
            .filter((b: any) => !ownIds.has(b.id))
            .map((b: any) => ({ ...b, sourceGroup: 'saved' }));

        const allRecipes = [...ownBrews, ...savedBrews];

        setRecipes(allRecipes);
        
        if (allRecipes.length > 0) {
            setSelectedRecipeId(allRecipes[0].id);
        }
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
    }
    loadRecipes();
  }, [breweryId, user, authLoading]);

  useEffect(() => {
    // Auto-generate batch code based on date or count? 
    // For now simple default
    const year = new Date().getFullYear().toString().slice(-2);
    setBatchCode(`B${year}-001`); 
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRecipeId) return;

    try {
      setCreating(true);

      const { data, error } = await supabase
        .from('brewing_sessions')
        .insert({
          brewery_id: breweryId,
          brew_id: selectedRecipeId,
          batch_code: batchCode,
          brewed_at: brewedAt,
          status: 'planned',
          measurements: {}, // empty structure
          notes: ''
        })
        .select()
        .single();
      
      if (error) throw error;

      router.push(`/team/${breweryId}/sessions/${data.id}`);

    } catch (err: any) {
      console.error(err);
      alert('Fehler beim Erstellen: ' + err.message);
      setCreating(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-zinc-500">Lade Rezepte...</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link 
            href={`/team/${breweryId}/sessions`} 
            className="text-zinc-500 hover:text-white transition"
        >
            ← Zurück
        </Link>
        <h1 className="text-2xl font-black text-white">Neuen Brautag starten</h1>
      </div>

      <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-6">
        
        {/* Recipe Selection */}
        <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider">Rezept auswählen</label>
            <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                
                {/* Group 1: Own Recipes */}
                {recipes.filter(r => r.sourceGroup === 'own').length > 0 && (
                     <div className="space-y-2">
                        <div className="text-xs font-bold text-zinc-500 uppercase px-1 sticky top-0 bg-zinc-900 pb-1 z-10 flex items-center gap-2">
                            <span>🏭</span> Eigene Rezepte
                        </div>
                        {recipes.filter(r => r.sourceGroup === 'own').map(recipe => (
                            <RecipeOption key={recipe.id} recipe={recipe} selectedId={selectedRecipeId} onChange={setSelectedRecipeId} />
                        ))}
                     </div>
                )}

                {/* Group 2: Saved Recipes */}
                {recipes.filter(r => r.sourceGroup === 'saved').length > 0 && (
                     <div className="space-y-2 pt-4 border-t border-zinc-800/50">
                        <div className="text-xs font-bold text-zinc-500 uppercase px-1 sticky top-0 bg-zinc-900 pb-1 z-10 flex items-center gap-2">
                             <span>📚</span> Bibliothek
                        </div>
                        {recipes.filter(r => r.sourceGroup === 'saved').map(recipe => (
                             <RecipeOption key={recipe.id} recipe={recipe} selectedId={selectedRecipeId} onChange={setSelectedRecipeId} />
                        ))}
                     </div>
                )}

            </div>
            {recipes.length === 0 && (
                <div className="text-zinc-500 text-sm">
                    Keine Rezepte gefunden. <Link href={`/team/${breweryId}/brews/new`} className="text-cyan-400 underline">Erstelle zuerst ein Rezept.</Link>
                </div>
            )}
        </div>

        <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider">Batch Code</label>
                <input 
                    type="text" 
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none font-mono"
                    placeholder="e.g. B24-001"
                    required
                />
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider">Braudatum</label>
                <input 
                    type="date" 
                    value={brewedAt}
                    onChange={(e) => setBrewedAt(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                    required
                />
            </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex justify-end">
            <button 
                type="submit" 
                disabled={creating || !selectedRecipeId}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
                {creating ? 'Erstelle...' : 'Brausession starten'}
            </button>
        </div>

      </form>
    </div>
  );
}

function RecipeOption({ recipe, selectedId, onChange }: { recipe: any, selectedId: string, onChange: (id: string) => void }) {
    const isSelected = selectedId === recipe.id;
    return (
        <label 
            className={`
                flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all
                ${isSelected 
                    ? 'bg-cyan-900/20 border-cyan-500/50 ring-1 ring-cyan-500/50' 
                    : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                }
            `}
        >
            <input 
                type="radio" 
                name="recipe" 
                value={recipe.id} 
                checked={isSelected}
                onChange={(e) => onChange(e.target.value)}
                className="hidden" 
            />
            <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                {recipe.image_url ? (
                    <img src={recipe.image_url} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-xs bg-zinc-900">N/A</div>
                )}
                        {/* Badge if saved */}
                {recipe.sourceGroup === 'saved' && (
                    <div className="absolute top-0 right-0 bg-blue-600 w-3 h-3 rounded-bl-md" title="Gespeichert"></div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{recipe.name}</div>
                <div className="flex items-center gap-1 text-xs text-zinc-500 truncate">
                    <span>{recipe.style}</span>
                    {recipe.sourceGroup === 'saved' && (
                        <>
                           <span>•</span>
                           <span className="text-zinc-600">aus Bibliothek</span>
                        </>
                    )}
                </div>
            </div>
            {isSelected && <span className="text-cyan-400 text-xl">✓</span>}
        </label>
    );
}
