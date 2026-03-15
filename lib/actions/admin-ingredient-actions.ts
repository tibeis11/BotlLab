'use server';

import { createClient } from '@/lib/supabase-server';
import { checkAdminAccess } from '@/lib/admin-auth';
import type {
  ImportQueueItem,
  QueueStats,
  MergeQueueOptions,
  DuplicateCheckResult,
  IngredientMasterSearchResult,
} from '@/lib/types/ingredients';

async function requireAdmin() {
  const { isAdmin } = await checkAdminAccess();
  if (!isAdmin) throw new Error('Kein Admin-Zugang.');
}

// ── Queue-Listen-Abfragen ─────────────────────────────────────────────────────

export async function getIngredientQueueItems(params: {
  status?: 'pending' | 'merged' | 'rejected';
  type?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: ImportQueueItem[]; total: number }> {
  await requireAdmin();
  const supabase = await createClient();

  const { status = 'pending', type, page = 1, pageSize = 20 } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Neue Spalten (import_count, rejection_reason) via Cast abfragen
  let query = (supabase as any)
    .from('ingredient_import_queue')
    .select(
      'id, raw_name, type, raw_data, suggested_master_id, imported_by, status, import_count, rejection_reason, created_at, suggested_master:ingredient_master(name)',
      { count: 'exact' }
    )
    .eq('status', status)
    .order('import_count', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (type) query = query.eq('type', type);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    items: (data as ImportQueueItem[]) ?? [],
    total: count ?? 0,
  };
}

export async function getQueueStats(): Promise<QueueStats> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ingredient_import_queue')
    .select('status, type');

  if (error) throw new Error(error.message);

  const stats: QueueStats = {
    pending: 0,
    merged: 0,
    rejected: 0,
    byType: { malt: 0, hop: 0, yeast: 0, misc: 0, water: 0 },
  };

  for (const row of data ?? []) {
    if (row.status === 'pending' || row.status === 'merged' || row.status === 'rejected') {
      stats[row.status]++;
    }
    if (row.status === 'pending' && row.type && row.type in stats.byType) {
      (stats.byType as Record<string, number>)[row.type]++;
    }
  }

  return stats;
}

/** Leichtgewichtige Variante für den Sidebar-Badge */
export async function getIngredientQueueCount(): Promise<number> {
  await requireAdmin();
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('ingredient_import_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) return 0;
  return count ?? 0;
}

// ── Merge ─────────────────────────────────────────────────────────────────────

export async function mergeQueueItem(
  options: MergeQueueOptions
): Promise<{ masterId: string; productId: string | null; recipesUpdated: number }> {
  await requireAdmin();
  const supabase = await createClient();

  const { queueId, mode, masterId, newMaster, product } = options;

  const { data, error } = await supabase.rpc('merge_queue_item' as any, {
    p_queue_id:        queueId,
    p_master_id:       mode === 'link_existing' ? (masterId ?? null) : null,
    p_master_name:     newMaster?.name ?? null,
    p_master_type:     newMaster?.type ?? null,
    p_master_aliases:  newMaster?.aliases ?? [],
    p_manufacturer:    product?.manufacturer ?? null,
    p_product_name:    product?.name ?? null,
    p_color_ebc:       product?.color_ebc ?? null,
    p_potential_pts:   product?.potential_pts ?? null,
    p_alpha_pct:       product?.alpha_pct ?? null,
    p_beta_pct:        product?.beta_pct ?? null,
    p_attenuation_pct: product?.attenuation_pct ?? null,
    p_notes:           product?.notes ?? null,
  });

  if (error) throw new Error(error.message);

  const result = data as { master_id: string; product_id: string | null; recipes_updated: number };
  return {
    masterId:       result.master_id,
    productId:      result.product_id ?? null,
    recipesUpdated: result.recipes_updated ?? 0,
  };
}

// ── Ablehnen ──────────────────────────────────────────────────────────────────

export async function rejectQueueItem(queueId: string, reason?: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('reject_queue_item' as any, {
    p_queue_id: queueId,
    p_reason:   reason ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function bulkRejectQueueItems(ids: string[]): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await (supabase.from('ingredient_import_queue') as any).update({
    status:           'rejected',
    rejection_reason: 'Massenablehnung durch Admin',
  }).in('id', ids);

  if (error) throw new Error(error.message);
}

// ── Duplikat-Check & Suche ────────────────────────────────────────────────────

export async function checkIngredientDuplicate(
  name: string,
  type: string,
  manufacturer?: string
): Promise<DuplicateCheckResult[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('check_ingredient_duplicate' as any, {
    p_name:         name,
    p_type:         type,
    p_manufacturer: manufacturer ?? null,
  });

  if (error) throw new Error(error.message);
  return (data as DuplicateCheckResult[]) ?? [];
}

export async function searchIngredientMaster(
  query: string,
  type?: string
): Promise<IngredientMasterSearchResult[]> {
  await requireAdmin();
  const supabase = await createClient();

  let q = supabase
    .from('ingredient_master')
    .select('id, name, type, aliases')
    .ilike('name', `%${query}%`)
    .limit(10);

  if (type) q = q.eq('type', type);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as IngredientMasterSearchResult[]) ?? [];
}
