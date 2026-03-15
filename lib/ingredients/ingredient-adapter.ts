import { supabase as browserClient } from "@/lib/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { FALLBACK_MASTER_IDS, FALLBACK_MASTER_ID_SET } from "./constants";
import type { Database } from "@/lib/database.types";

// Caller can pass a server-side client; falls back to the browser client.
type AnySupabaseClient = SupabaseClient<Database>;

type RecipeIngredientRow = Database['public']['Tables']['recipe_ingredients']['Row'] & {
  ingredient_master: Pick<Database['public']['Tables']['ingredient_master']['Row'], 'name' | 'color_ebc' | 'alpha_pct' | 'potential_pts'> | null;
  ingredient_products: Pick<Database['public']['Tables']['ingredient_products']['Row'], 'manufacturer' | 'color_ebc' | 'alpha_pct' | 'attenuation_pct' | 'potential_pts'> | null;
};

// Gibt den "besten" Anzeigenamen zurück:
// - Echter Master-Match → ingredient_master.name (sauber, kein Hersteller-Prefix)
// - Fallback/kein Match → raw_name (Original-Eingabe)
function displayName(i: RecipeIngredientRow, fallback: string): string {
  const masterName = i.ingredient_master?.name;
  if (masterName && i.master_id && !FALLBACK_MASTER_ID_SET.has(i.master_id)) {
    return masterName;
  }
  return i.raw_name || masterName || fallback;
}

export interface LegacyMaltItem {
  id?: string;
  master_id?: string;
  product_id?: string;
  name: string;
  manufacturer?: string;
  amount: number | string;
  unit: string;
  color?: number | string;      // legacy: für backward compat + brewing-calculations
  color_ebc?: number | string;  // neu: für MaltListEditor
  potential_pts?: number | string;
}

export interface LegacyHopItem {
  id?: string;
  master_id?: string;
  product_id?: string;
  name: string;
  manufacturer?: string;
  amount: number | string;
  unit: string;
  time: number | string;
  usage: string;
  alpha?: number | string;
}

export interface LegacyYeastItem {
  id?: string;
  master_id?: string;
  product_id?: string;
  name: string;
  manufacturer?: string;
  amount: number | string;
  unit: string;
  attenuation?: number | string;
}

export async function mergeRecipeIngredientsIntoData(
  brewData: any,
  brewId: string,
  client?: AnySupabaseClient
) {
  const sb = client ?? browserClient;
  // Query recipe_ingredients for this brew
  const { data: ingredients, error } = await sb
    .from('recipe_ingredients')
    .select('*, ingredient_master(name, color_ebc, alpha_pct, potential_pts), ingredient_products(manufacturer, color_ebc, alpha_pct, attenuation_pct, potential_pts)')
    .eq('recipe_id', brewId);

  if (error || !ingredients) {
    console.error("Error fetching recipe ingredients for adapter:", error);
    return brewData; // Fallback to current state
  }

  const rows = ingredients as unknown as RecipeIngredientRow[];

  // Group by type and map back to Legacy interfaces
  const malts: LegacyMaltItem[] = rows
    .filter((i) => i.type === 'malt')
    .map((i) => ({
      id: i.id,
      master_id: i.master_id || undefined,
      product_id: i.product_id || undefined,
      name: displayName(i, 'Unbekanntes Malz'),
      manufacturer: i.ingredient_products?.manufacturer || undefined,
      amount: i.amount || 0,
      unit: i.unit || 'kg',
      color: i.override_color_ebc ?? i.ingredient_products?.color_ebc ?? i.ingredient_master?.color_ebc ?? undefined,
      color_ebc: i.override_color_ebc ?? i.ingredient_products?.color_ebc ?? i.ingredient_master?.color_ebc ?? undefined,
      potential_pts: i.ingredient_products?.potential_pts ?? i.ingredient_master?.potential_pts ?? undefined,
    }));

  const hops: LegacyHopItem[] = rows
    .filter((i) => i.type === 'hop')
    .map((i) => ({
      id: i.id,
      master_id: i.master_id || undefined,
      product_id: i.product_id || undefined,
      name: displayName(i, 'Unbekannter Hopfen'),
      manufacturer: i.ingredient_products?.manufacturer || undefined,
      amount: i.amount || 0,
      unit: i.unit || 'g',
      time: i.time_minutes || 0,
      usage: i.usage || 'boil',
      alpha: i.override_alpha ?? i.ingredient_products?.alpha_pct ?? i.ingredient_master?.alpha_pct ?? undefined,
    }));

  const yeast: LegacyYeastItem[] = rows
    .filter((i) => i.type === 'yeast')
    .map((i) => ({
      id: i.id,
      master_id: i.master_id || undefined,
      product_id: i.product_id || undefined,
      name: displayName(i, 'Unbekannte Hefe'),
      manufacturer: i.ingredient_products?.manufacturer || undefined,
      amount: i.amount || 0,
      unit: i.unit || 'pkg',
      attenuation: i.override_attenuation ?? i.ingredient_products?.attenuation_pct ?? undefined,
    }));

  // Re-inject simulating perfectly the old jsonb format for frontend sync math
  // We strictly fall back to brewData arrays in case this is unmigrated seed data!
  return {
    ...brewData,
    malts: malts.length > 0 ? malts : (brewData.malts || []),
    hops: hops.length > 0 ? hops : (brewData.hops || []),
    yeast: yeast.length > 0 ? yeast : (brewData.yeast || [])
  };
}

export async function extractAndSaveRecipeIngredients(
  recipeId: string,
  dataObj: any,
  client?: AnySupabaseClient
) {
  const sb = client ?? browserClient;
  // We extract malts, hops, yeast from the incoming JSONB and save them individually
  // Since we don't have a reliable match right away without rewriting the entire frontend UI,
  // we do the exact inverse of our migration:
  
  if (!dataObj) return { extracted: false, sanitisedData: dataObj, newIngredients: 0 };

  const malts = dataObj.malts || [];
  const hops = dataObj.hops || [];
  const yeast = dataObj.yeast || [];

  // First, delete existing to prevent duplicates on update
  const { error: deleteError } = await sb.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
  if (deleteError) {
    console.error('Failed to clear existing recipe ingredients:', deleteError.message, deleteError.code);
    throw new Error(`Zutaten konnten nicht gespeichert werden: ${deleteError.message}`);
  }

  // Sanitize numeric values: replace German decimal comma with dot, then parse
  const toNum = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? null : n;
  };

  const inserts: any[] = [];

  for (let i = 0; i < malts.length; i++) {
    const m = malts[i];
    inserts.push({
      recipe_id: recipeId,
      master_id: m.master_id || null,
      product_id: m.product_id || null,
      raw_name: m.name || 'Unbekanntes Malz',
      type: 'malt',
      amount: toNum(m.amount),
      unit: m.unit || 'kg',
      override_color_ebc: toNum(m.color_ebc ?? m.color),
      sort_order: i
    });
  }

  for (let i = 0; i < hops.length; i++) {
    const h = hops[i];
    inserts.push({
      recipe_id: recipeId,
      master_id: h.master_id || null,
      product_id: h.product_id || null,
      raw_name: h.name || 'Unbekannter Hopfen',
      type: 'hop',
      amount: toNum(h.amount),
      unit: h.unit || 'g',
      time_minutes: toNum(h.time),
      usage: h.usage || 'boil',
      override_alpha: toNum(h.alpha),
      sort_order: i
    });
  }

  for (let i = 0; i < yeast.length; i++) {
    const y = yeast[i];
    inserts.push({
      recipe_id: recipeId,
      master_id: y.master_id || null,
      product_id: y.product_id || null,
      raw_name: y.name || 'Unbekannte Hefe',
      type: 'yeast',
      amount: toNum(y.amount),
      unit: y.unit || 'pkg',
      override_attenuation: toNum(y.attenuation),
      sort_order: i
    });
  }

  // For inserts without a master_id: try smart-match first, then fall back to fallback UUID
  // and add to import queue so admins can review the new ingredient.
  const unmatchedItems: { raw_name: string; type: string }[] = [];

  for (const insert of inserts) {
    if (insert.master_id) continue;

    const { data: matchResult } = await sb.rpc('match_ingredient', {
      search_term: insert.raw_name,
      search_type: insert.type,
    });

    if (matchResult && matchResult.length > 0) {
      insert.master_id = matchResult[0].master_id;
    } else {
      insert.master_id = FALLBACK_MASTER_IDS[insert.type as keyof typeof FALLBACK_MASTER_IDS]
        ?? FALLBACK_MASTER_IDS.misc;
      unmatchedItems.push({ raw_name: insert.raw_name, type: insert.type });
    }
  }

  if (inserts.length > 0) {
    const { error } = await sb.from('recipe_ingredients').insert(inserts);
    if (error) {
      console.error("Failed to extract ingredients on save:", error.message, error.code, error.details, error.hint);
      throw new Error(`Zutaten konnten nicht gespeichert werden: ${error.message ?? error.code ?? JSON.stringify(error)}`);
    }
  }

  // Write unmatched ingredients to the import queue so admins can review them
  if (unmatchedItems.length > 0) {
    const { data: { user } } = await sb.auth.getUser();
    for (const item of unmatchedItems) {
      const { data: existing } = await sb
        .from('ingredient_import_queue')
        .select('id')
        .eq('status', 'pending')
        .ilike('raw_name', item.raw_name)
        .eq('type', item.type)
        .maybeSingle();

      if (existing) {
        await sb.rpc('increment_import_queue_count', { p_queue_id: existing.id });
      } else {
        await sb.from('ingredient_import_queue').insert({
          raw_name: item.raw_name,
          type: item.type,
          raw_data: {},
          imported_by: user?.id ?? null,
          status: 'pending',
          import_count: 1,
        });
      }
    }
  }

  // Define a new object stripping the arrays so they do not write to the DB JSONB column
  const sanitisedData = { ...dataObj };
  delete sanitisedData.malts;
  delete sanitisedData.hops;
  delete sanitisedData.yeast;

  return { extracted: true, sanitisedData, newIngredients: unmatchedItems.length };
}
