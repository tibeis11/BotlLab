export type IngredientType = 'malt' | 'hop' | 'yeast' | 'misc' | 'water'

export interface ImportQueueItem {
  id: string
  raw_name: string
  type: IngredientType
  raw_data: Record<string, unknown> | null
  suggested_master_id: string | null
  suggested_master: { name: string } | null
  imported_by: string | null
  status: 'pending' | 'merged' | 'rejected'
  import_count: number
  rejection_reason: string | null
  created_at: string
}

export interface QueueStats {
  pending: number
  merged: number
  rejected: number
  byType: {
    malt: number
    hop: number
    yeast: number
    misc: number
    water: number
  }
}

export interface MergeQueueOptions {
  queueId: string
  mode: 'link_existing' | 'create_new'
  /** Für mode "link_existing": UUID eines vorhandenen ingredient_master */
  masterId?: string
  /** Für mode "create_new": Daten für neuen ingredient_master */
  newMaster?: {
    name: string
    type: string
    aliases: string[]
  }
  /** Optional in beiden Modi: neues ingredient_product anlegen */
  product?: {
    name: string
    manufacturer?: string
    color_ebc?: number | null
    potential_pts?: number | null
    alpha_pct?: number | null
    beta_pct?: number | null
    attenuation_pct?: number | null
    notes?: string | null
  }
}

export interface DuplicateCheckResult {
  product_id: string
  master_name: string
  product_name: string
  manufacturer: string | null
  similarity_score: number
}

export interface IngredientMasterSearchResult {
  id: string
  name: string
  type: IngredientType
  aliases: string[]
}
