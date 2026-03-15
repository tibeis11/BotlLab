'use server';

import { RecipeImportService, ParsedRecipe, ParsedIngredient } from '@/lib/ingredient-parser';
import { createClient } from '@/lib/supabase-server';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export type MatchedIngredient = ParsedIngredient & (
  | {
      status: 'matched';
      match: {
        master_id: string;
        name: string;
        type: string;
        match_score: number;
        match_level: number;
        color_ebc?: number | null;
        potential_pts?: number | null;
        alpha_pct?: number | null;
        attenuation_pct?: number | null;
      };
    }
  | { status: 'unmatched'; match?: undefined }
);

export type ProcessedRecipe = Omit<ParsedRecipe, 'ingredients'> & {
  ingredients: MatchedIngredient[];
};

export async function importAndMatchRecipe(formData: FormData) {
  try {
    const supabase = await createClient();

    // Auth-Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Nicht authentifiziert. Bitte einloggen.' };
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return { success: false, error: 'Keine gültige Datei hochgeladen.' };
    }

    // Dateigrößen-Limit prüfen
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Datei ist zu groß (max. 2 MB).' };
    }

    // Dateityp-Validierung
    const allowedExtensions = ['.xml', '.json', '.beerxml', '.beerjson'];
    const fileName = file.name.toLowerCase();
    if (!allowedExtensions.some(ext => fileName.endsWith(ext))) {
      return { success: false, error: 'Ungültiger Dateityp. Erlaubt: XML, JSON, BeerXML, BeerJSON.' };
    }

    const content = await file.text();
    const service = new RecipeImportService();
    
    // 1. Rezept parsen
    const recipes = service.parseFileContent(content);
    if (!recipes || recipes.length === 0) {
       return { success: false, error: 'Kein gültiges Rezept in der Datei gefunden.' };
    }

    const recipe = recipes[0]; // Wir nehmen vorerst nur das erste Rezept

    // 2. Zutaten abgleichen (Smart Match) — ein einziger Batch-Call statt N Einzelaufrufe
    const unmatchedForQueue: { raw_name: string; type: string; raw_data: Record<string, unknown> }[] = [];

    // Nur non-water, non-spice Zutaten müssen gematcht werden; originaler Index wird mitgegeben
    const toMatch = recipe.ingredients
      .map((ing, origIdx) => ({ ing, origIdx }))
      .filter(({ ing }) => ing.type !== 'water' && ing.usage !== 'spice');

    // Einen einzigen DB-Call für alle Zutaten
    const { data: batchResults } = await (supabase as any).rpc('match_ingredients_batch', {
      p_terms: toMatch.map(({ ing }) => ({ raw_name: ing.raw_name, type: ing.type })),
    });

    // Ergebnisse nach input_index indexieren (0-basiert = Position in toMatch)
    const matchByBatchIdx = new Map<number, any>();
    for (const row of (batchResults ?? [])) {
      if (!matchByBatchIdx.has(row.input_index)) {
        matchByBatchIdx.set(row.input_index, row);
      }
    }

    const processedIngredients: MatchedIngredient[] = recipe.ingredients.map((ing, origIdx) => {
      if (ing.type === 'water') return { ...ing, status: 'unmatched' as const };

      // Gewürze (spice) werden nie gegen die DB gematcht — sie sind immer freier Text
      if (ing.usage === 'spice') {
        return {
          ...ing,
          status: 'matched' as const,
          match: {
            master_id: '00000000-0000-4000-a000-000000000002', // fallback hop ID
            name: ing.raw_name,
            type: 'hop',
            match_score: 1.0,
            match_level: 99,
          },
        };
      }

      const batchIdx = toMatch.findIndex(t => t.origIdx === origIdx);
      const matchRow = batchIdx >= 0 ? matchByBatchIdx.get(batchIdx) : undefined;

      if (matchRow) {
        return {
          ...ing,
          status: 'matched' as const,
          match: {
            master_id: matchRow.master_id,
            name: matchRow.name,
            type: matchRow.type,
            match_score: matchRow.match_score,
            match_level: matchRow.match_level,
            color_ebc: matchRow.color_ebc,
            potential_pts: matchRow.potential_pts,
            alpha_pct: matchRow.alpha_pct,
            attenuation_pct: matchRow.attenuation_pct,
          },
        };
      }

      // Kein Match → für Import-Queue vormerken
      unmatchedForQueue.push({
        raw_name: ing.raw_name,
        type: ing.type,
        raw_data: {
          amount: ing.amount,
          unit: ing.unit,
          ...(ing.time_minutes != null && { time_minutes: ing.time_minutes }),
          ...(ing.usage != null && { usage: ing.usage }),
          ...(ing.override_alpha != null && { alpha_pct: ing.override_alpha }),
          ...(ing.override_color_ebc != null && { color_ebc: ing.override_color_ebc }),
          ...(ing.override_attenuation != null && { attenuation_pct: ing.override_attenuation }),
        },
      });
      return { ...ing, status: 'unmatched' as const };
    });

    // 3. Unbekannte Zutaten in die Import-Queue schreiben (max. 50 pro Import)
    // Deduplizierung: gleicher raw_name + type → import_count erhöhen statt neue Row
    if (unmatchedForQueue.length > 0) {
      const limitedQueue = unmatchedForQueue.slice(0, 50);
      for (const item of limitedQueue) {
        // Deduplizierung: existierenden pending-Eintrag suchen und Zähler erhöhen
        const { data: existing } = await supabase
          .from('ingredient_import_queue')
          .select('id')
          .eq('status', 'pending')
          .ilike('raw_name', item.raw_name)
          .eq('type', item.type)
          .maybeSingle();

        if (existing) {
          // Atomares Increment via RPC (neue Spalte noch nicht in generierten Typen)
          await supabase.rpc('increment_import_queue_count' as any, {
            p_queue_id: existing.id,
          });
        } else {
          // Neue Row — neue Spalten via Cast einfügen bis Typen regeneriert
          await (supabase.from('ingredient_import_queue') as any).insert({
            raw_name: item.raw_name,
            type: item.type,
            raw_data: item.raw_data,
            imported_by: user.id,
            status: 'pending',
            import_count: 1,
          });
        }
      }
    }

    const processedRecipe: ProcessedRecipe = {
      ...recipe,
      ingredients: processedIngredients
    };

    return { success: true, recipe: processedRecipe };
  } catch (error: any) {
    console.error('Fehler beim Recipe Import:', error);
    return { success: false, error: error.message };
  }
}
