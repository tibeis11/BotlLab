"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuickSession } from "@/lib/actions/session-actions";
import CustomSelect from "@/app/components/CustomSelect";
import { platoToSG } from "@/lib/brewing-calculations";
import { Beer, BookOpen } from "lucide-react";

interface Brew {
  id: string;
  name: string;
  style: string | null;
  data: any;
  sourceGroup?: 'own' | 'saved';
}

interface Props {
  breweryId: string;
  brews: Brew[];
}

export default function QuickSessionForm({ breweryId, brews }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedBrewId, setSelectedBrewId] = useState<string>(brews[0]?.id || "");
  const [brewedAt, setBrewedAt] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [overrideOG, setOverrideOG] = useState<string>("");
  const [overrideFG, setOverrideFG] = useState<string>("");
  const [overrideVolume, setOverrideVolume] = useState<string>("");
  const [overrideABV, setOverrideABV] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Get Selected Brew Data (for showing defaults)
  const selectedBrew = brews.find((b) => b.id === selectedBrewId);
  const recipeData = selectedBrew?.data as any;

  // Convert recipe values from Plato to SG if needed
  const getRecipeOGinSG = () => {
    if (!recipeData?.og) return null;
    const val = parseFloat(recipeData.og);
    // If value >= 1.5, assume it's Plato and convert to SG
    return val >= 1.5 ? platoToSG(val) : val;
  };

  const getRecipeFGinSG = () => {
    if (!recipeData?.fg) return null;
    const val = parseFloat(recipeData.fg);
    // If value >= 1.5, assume it's Plato and convert to SG
    return val >= 1.5 ? platoToSG(val) : val;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createQuickSession({
        brewId: selectedBrewId,
        breweryId,
        brewedAt,
        measurements: {
          og: overrideOG ? parseFloat(overrideOG) : undefined,
          fg: overrideFG ? parseFloat(overrideFG) : undefined,
          volume: overrideVolume ? parseFloat(overrideVolume) : undefined,
          abv: overrideABV ? parseFloat(overrideABV) : undefined,
        },
        notes,
      });

      if (result.success) {
        // Redirect to session detail page where user can start scanning bottles
        router.push(`/team/${breweryId}/sessions/${result.sessionId}`);
      } else {
        setError(result.error || "Unbekannter Fehler");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Recipe Selection */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Rezept wählen</label>
        <CustomSelect
          value={selectedBrewId}
          onChange={setSelectedBrewId}
          options={brews.map((brew) => ({
            value: brew.id,
            label: `${brew.name}${brew.style ? ` (${brew.style})` : ''}`,
            icon: brew.sourceGroup === 'saved' ? <BookOpen size={16} /> : <Beer size={16} />,
            group: brew.sourceGroup === 'saved' ? 'Gespeicherte Rezepte' : 'Eigene Rezepte'
          }))}
        />
      </div>

      {/* Brew Date */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Brautag</label>
        <input
          type="date"
          value={brewedAt}
          onChange={(e) => setBrewedAt(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-brand transition"
          required
        />
      </div>

      {/* Optional Measurements */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted shrink-0">Messwerte</span>
          <span className="text-[10px] font-bold text-text-disabled shrink-0">— Optional</span>
          <div className="h-px bg-border flex-1" />
        </div>
        <p className="text-sm text-text-muted mb-5">Überschreibe die Rezeptwerte falls nötig.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block min-h-[2.5rem] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">OG</span>
              {getRecipeOGinSG() && (
                <span className="block text-[10px] text-text-disabled mt-0.5">Rezept: {getRecipeOGinSG()!.toFixed(3)}</span>
              )}
            </label>
            <input
              type="number"
              step="0.001"
              min="1.0"
              max="1.2"
              value={overrideOG}
              onChange={(e) => setOverrideOG(e.target.value)}
              placeholder={getRecipeOGinSG()?.toFixed(3) || "1.050"}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition"
            />
          </div>

          <div>
            <label className="block min-h-[2.5rem] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">FG</span>
              {getRecipeFGinSG() && (
                <span className="block text-[10px] text-text-disabled mt-0.5">Rezept: {getRecipeFGinSG()!.toFixed(3)}</span>
              )}
            </label>
            <input
              type="number"
              step="0.001"
              min="0.99"
              max="1.1"
              value={overrideFG}
              onChange={(e) => setOverrideFG(e.target.value)}
              placeholder={getRecipeFGinSG()?.toFixed(3) || "1.012"}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition"
            />
          </div>

          <div>
            <label className="block min-h-[2.5rem] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">ABV %</span>
              {recipeData?.abv && (
                <span className="block text-[10px] text-text-disabled mt-0.5">Rezept: {recipeData.abv}</span>
              )}
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={overrideABV}
              onChange={(e) => setOverrideABV(e.target.value)}
              placeholder={recipeData?.abv || "5.0"}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition"
            />
          </div>

          <div>
            <label className="block min-h-[2.5rem] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Volumen L</span>
              {recipeData?.batchSize && (
                <span className="block text-[10px] text-text-disabled mt-0.5">Rezept: {recipeData.batchSize}</span>
              )}
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="10000"
              value={overrideVolume}
              onChange={(e) => setOverrideVolume(e.target.value)}
              placeholder={recipeData?.batchSize || "20"}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
          Notizen <span className="text-text-disabled normal-case tracking-normal font-normal">— Optional</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition resize-none"
          rows={4}
          maxLength={5000}
          placeholder="Zusätzliche Infos zu dieser Session..."
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:opacity-90 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isPending ? "Erstelle Session..." : "Quick Session erstellen"}
      </button>
    </form>
  );
}
