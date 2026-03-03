// ============================================================================
// Taste DNA — Consumer Page (Phase 11.2)
// Server Component: Fetches user's aggregated flavor profile + tasting stats
// ============================================================================

import { getTasteDNA } from '@/lib/actions/taste-dna-actions';
import TasteDNAClient from './TasteDNAClient';

export default async function TasteDNAPage() {
  const dna = await getTasteDNA();

  return <TasteDNAClient dna={dna} />;
}
