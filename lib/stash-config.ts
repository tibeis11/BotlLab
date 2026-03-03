// ============================================================================
// Phase 12.2 — Stash Types & Constants (separate from "use server" actions)
//
// Extracted here because "use server" files may only export async functions.
// ============================================================================

export type PurchaseLocation =
  | 'supermarket'
  | 'specialty_store'
  | 'online'
  | 'taproom'
  | 'other';

export const PURCHASE_LOCATION_LABELS: Record<PurchaseLocation, string> = {
  supermarket: '🛒 Supermarkt',
  specialty_store: '🍺 Spezialitäten-Store',
  online: '📦 Online-Shop',
  taproom: '🏭 Direkt am Taproom',
  other: '📍 Anderswo',
};

export interface StashEntry {
  id: string;
  brewId: string;
  addedAt: string;
  purchaseLocation: PurchaseLocation | null;
  notes: string | null;
  // Joined brew info
  brew: {
    name: string;
    style: string | null;
    abv: number | null;
    imageUrl: string | null;
    breweryName: string | null;
    breweryId: string | null;
  };
}
