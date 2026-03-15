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

    // 2. Zutaten abgleichen (Smart Match)
    const processedIngredients: MatchedIngredient[] = [];
    const unmatchedForQueue: { raw_name: string; type: string; raw_data: Record<string, unknown> }[] = [];

    for (const ing of recipe.ingredients) {
      if (ing.type === 'water') {
        processedIngredients.push({ ...ing, status: 'unmatched' });
        continue;
      }

      const { data, error } = await supabase.rpc('match_ingredient', {
        search_term: ing.raw_name,
        search_type: ing.type
      });

      if (!error && data && data.length > 0) {
        processedIngredients.push({
          ...ing,
          status: 'matched',
          match: {
             master_id: data[0].master_id,
             name: data[0].name,
             type: data[0].type,
             match_score: data[0].match_score,
             match_level: data[0].match_level,
             color_ebc: data[0].color_ebc,
             potential_pts: data[0].potential_pts,
             alpha_pct: data[0].alpha_pct,
             attenuation_pct: (data[0] as any).attenuation_pct
          }
        });
      } else {
        processedIngredients.push({
          ...ing,
          status: 'unmatched'
        });
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
      }
    }

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
