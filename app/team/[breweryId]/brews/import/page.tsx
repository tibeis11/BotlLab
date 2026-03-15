'use client';

import { use, useState, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileJson, AlertCircle, Loader2 } from 'lucide-react';
import BrewEditor from '@/app/team/[breweryId]/brews/components/BrewEditor';
import ImportMatchPreview from './ImportMatchPreview';
import { importAndMatchRecipe } from '@/lib/actions/recipe-import';
import type { ProcessedRecipe, MatchedIngredient } from '@/lib/actions/recipe-import';
import type { BrewForm } from '@/app/team/[breweryId]/brews/components/BrewEditor';

type WizardStep = 'upload' | 'preview' | 'editor';

function mapRecipeToBrewForm(recipe: ProcessedRecipe): Partial<BrewForm> {
  const malts = recipe.ingredients
    .filter(i => i.type === 'malt')
    .map(i => ({
      id: crypto.randomUUID(),
      master_id: i.match?.master_id || undefined,
      name: i.match ? i.match.name : i.raw_name,
      amount: i.amount.toString(),
      unit: 'kg',
      color_ebc: i.match?.color_ebc?.toString() || i.override_color_ebc?.toString() || '',
      usage: i.usage || 'mash',
    }));

  const hops = recipe.ingredients
    .filter(i => i.type === 'hop')
    .map(i => ({
      id: crypto.randomUUID(),
      master_id: i.match?.master_id || undefined,
      name: i.match ? i.match.name : i.raw_name,
      amount: i.amount.toString(),
      unit: 'g',
      alpha: i.match?.alpha_pct?.toString() || i.override_alpha?.toString() || '',
      time: i.time_minutes?.toString() || '',
      usage: i.usage || 'boil',
    }));

  const yeasts = recipe.ingredients
    .filter(i => i.type === 'yeast')
    .map(i => ({
      id: crypto.randomUUID(),
      master_id: i.match?.master_id || undefined,
      name: i.match ? i.match.name : i.raw_name,
      amount: i.amount.toString(),
      unit: 'pkg',
      attenuation: i.override_attenuation?.toString()
        || (i.status === 'matched' ? i.match.attenuation_pct?.toString() : undefined)
        || '',
    }));

  return {
    name: recipe.name || 'Importiertes Rezept',
    style: recipe.style_name || '',
    brew_type: 'beer' as const,
    description: recipe.description || '',
    data: {
      batch_size_liters: recipe.batch_size_liters?.toString() || '',
      boil_time: recipe.boil_time_minutes?.toString() || '',
      primary_temp: recipe.fermentation_temp_c?.toString() || '',
      efficiency: recipe.efficiency?.toString() || '',
      mash_process: !recipe.mash_process ? ''
        : recipe.mash_process === 'decoction' ? 'decoction'
        : (recipe.mash_steps?.length ?? 0) > 1 ? 'step_mash'
        : 'infusion',
      carbonation_g_l: recipe.carbonation_g_l?.toString() || '',
      notes: recipe.notes || '',
      malts,
      hops,
      yeast: yeasts,
      mash_steps: (recipe.mash_steps ?? []).map(s => ({
        name: s.name || 'Rast',
        temperature: s.temperature_c.toString(),
        duration: s.duration_minutes.toString(),
        step_type: (s.step_type ?? 'rest') as 'rest' | 'decoction' | 'mashout' | 'strike',
        ...(s.volume_liters != null && { volume_liters: s.volume_liters.toString() }),
        ...(s.decoction_form != null && { decoction_form: s.decoction_form }),
        ...(s.decoction_rest_temp != null && { decoction_rest_temp: s.decoction_rest_temp.toString() }),
        ...(s.decoction_rest_time != null && { decoction_rest_time: s.decoction_rest_time.toString() }),
        ...(s.decoction_boil_time != null && { decoction_boil_time: s.decoction_boil_time.toString() }),
      })),
    },
  };
}

export default function ImportWizardPage({ params }: { params: Promise<{ breweryId: string }> }) {
  const { breweryId } = use(params);
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>('upload');
  const [matchedRecipe, setMatchedRecipe] = useState<ProcessedRecipe | null>(null);
  const [importedData, setImportedData] = useState<Partial<BrewForm> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Schritt 1 → 2: Datei parsen + Smart Match, dann Preview zeigen
  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await importAndMatchRecipe(formData);

      if (!result.success || !result.recipe) {
        throw new Error(result.error || 'Fehler beim Analysieren des Rezepts.');
      }

      setMatchedRecipe(result.recipe);
      setStep('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Schritt 2 → 3: Match-Ergebnis bestätigen → BrewEditor befüllen
  const confirmImport = () => {
    if (!matchedRecipe) return;
    setImportedData(mapRecipeToBrewForm(matchedRecipe));
    setStep('editor');
  };

  const resetToUpload = () => {
    setStep('upload');
    setMatchedRecipe(null);
    setImportedData(null);
    setError(null);
  };

  const handleIngredientUpdate = (index: number, updated: MatchedIngredient) => {
    setMatchedRecipe(prev => {
      if (!prev) return prev;
      const ingredients = [...prev.ingredients];
      ingredients[index] = updated;
      return { ...prev, ingredients };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const allowed = ['.json', '.xml', '.beerxml', '.beerjson'];
    if (allowed.some(ext => file.name.toLowerCase().endsWith(ext))) {
      await processFile(file);
    } else {
      setError('Bitte lade nur .json oder .xml Dateien hoch.');
    }
  };

  // ── Schritt 3: BrewEditor ───────────────────────────────────────────────────
  if (step === 'editor' && importedData) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-80px)]">
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center justify-center gap-2 text-sm text-white shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Importiertes Rezept:</strong> Bitte überprüfe die extrahierten Daten. Beim Speichern wird der Sud in deiner Datenbank angelegt.
          </span>
          <button
            onClick={resetToUpload}
            className="ml-4 underline text-zinc-400 hover:text-white font-bold whitespace-nowrap transition-colors"
          >
            Abbrechen
          </button>
        </div>
        <div className="flex-1">
          <BrewEditor breweryId={breweryId} initialData={importedData} />
        </div>
      </div>
    );
  }

  // ── Schritt 2: Match-Preview ────────────────────────────────────────────────
  if (step === 'preview' && matchedRecipe) {
    return (
      <main className="min-h-[calc(100vh-80px)] p-4 md:p-8 max-w-3xl mx-auto pb-24">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={resetToUpload}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Zutaten-Analyse
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              Überprüfe die erkannten Zutaten vor dem Import.
            </p>
          </div>
        </div>

        <ImportMatchPreview
          recipe={matchedRecipe}
          onConfirm={confirmImport}
          onCancel={resetToUpload}
          onIngredientUpdate={handleIngredientUpdate}
        />
      </main>
    );
  }

  // ── Schritt 1: Upload ───────────────────────────────────────────────────────
  return (
    <main
      className="min-h-[calc(100vh-80px)] p-4 md:p-8 max-w-5xl mx-auto pb-40"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.push(`/team/${breweryId}/brews`)}
          className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Rezept Import Wizard
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Importiere fertige Rezepte (BeerJSON, BeerXML). Unbekannte Zutaten werden automatisch markiert.
          </p>
        </div>
      </div>

      <div
        className={`bg-zinc-900 border-2 ${
          isDragging
            ? 'border-white bg-zinc-800 scale-[1.01]'
            : 'border-dashed border-zinc-800'
        } p-8 rounded-3xl flex flex-col items-center justify-center min-h-[400px] text-center shadow-sm transition-all duration-200`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border transition-colors ${
          isDragging ? 'bg-white border-white' : 'bg-zinc-800 border-zinc-700'
        }`}>
          <Upload className={`w-8 h-8 ${isDragging ? 'text-black' : 'text-zinc-400'}`} />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Datei auswählen oder reinziehen</h2>
        <p className="text-zinc-500 max-w-md mx-auto mb-8 flex flex-col gap-1.5 text-sm">
          <span>Unterstützt <strong className="text-zinc-300">BeerJSON (.json, .beerjson)</strong> und <strong className="text-zinc-300">BeerXML (.xml, .beerxml)</strong>.</span>
          <span>Die Ingredient Engine versucht deine Zutaten direkt mit der BotlLab-Datenbank zu verknüpfen.</span>
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl max-w-md w-full text-sm flex items-center gap-3 text-left">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <label className={`px-8 py-4 bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold rounded-2xl cursor-pointer hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all inline-flex items-center gap-3 shadow-lg shadow-cyan-500/20 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          {loading
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Upload className="w-5 h-5" />
          }
          <span>{loading ? 'Wird analysiert & gematcht...' : 'Rezept hochladen'}</span>
          <input
            type="file"
            className="hidden"
            accept=".json,.xml,.beerxml,.beerjson"
            onChange={handleFileUpload}
            disabled={loading}
          />
        </label>

        <div className="mt-8 text-zinc-600 text-sm flex items-center gap-1.5">
          <FileJson className="w-4 h-4" />
          Unterstützt BeerJSON & BeerXML · Max. 2 MB
        </div>
      </div>
    </main>
  );
}
