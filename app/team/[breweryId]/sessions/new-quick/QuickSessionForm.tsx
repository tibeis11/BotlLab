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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Recipe Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-white">Rezept</label>
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
        <label className="block text-sm font-medium mb-2 text-white">Brautag</label>
        <input
          type="date"
          value={brewedAt}
          onChange={(e) => setBrewedAt(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-600 transition"
          required
        />
      </div>

      {/* Optional Measurements */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
        <h3 className="font-semibold mb-3 text-white">Messwerte (Optional)</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Überschreibe die Rezeptwerte falls nötig.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs mb-1 text-zinc-400 min-h-[2.5rem]">
              OG (Stammwürze)
              {getRecipeOGinSG() && (
                <span className="text-zinc-600 ml-1">
                  (Rezept: {getRecipeOGinSG()!.toFixed(3)})
                </span>
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
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-zinc-400 min-h-[2.5rem]">
              FG (Endvergärung)
              {getRecipeFGinSG() && (
                <span className="text-zinc-600 ml-1">
                  (Rezept: {getRecipeFGinSG()!.toFixed(3)})
                </span>
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
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-zinc-400 min-h-[2.5rem]">
              ABV (Alkohol %)
              {recipeData?.abv && (
                <span className="text-zinc-600 ml-1">
                  (Rezept: {recipeData.abv})
                </span>
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
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-zinc-400 min-h-[2.5rem]">
              Volumen (L)
              {recipeData?.batchSize && (
                <span className="text-zinc-600 ml-1">
                  (Rezept: {recipeData.batchSize})
                </span>
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
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-600 transition"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-2 text-white">Notizen (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-600 transition"
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
        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Erstelle Session..." : "Quick Session erstellen"}
      </button>
    </form>
  );
}
