import { Suspense } from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { getDiscoverSettings } from '@/lib/actions/brew-admin-actions';
import DiscoverClient from './DiscoverClient';

// ─── SEO ──────────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'Rezepte entdecken – BotlLab',
  description:
    'Die besten Heimbrau-Rezepte der Community: All-Grain, Extrakt, Teilmaische – nach Stil, Qualität oder Bewertung gefiltert. Finde dein nächstes Brau-Projekt.',
  openGraph: {
    title: 'Heimbrau-Rezepte entdecken – BotlLab',
    description:
      'Entdecke hunderte Heimbrau-Rezepte: IPA, Weizen, Pils, Stout, Saison und mehr.',
    url: 'https://botllab.de/discover',
    siteName: 'BotlLab',
    type: 'website',
  },
  alternates: {
    canonical: '/discover',
  },
};

// ─── SSR: Brew-Daten serverseitig laden ───────────────────────────────────────
export const BREW_PAGE_SIZE = 20;

export const BREW_SELECT =
  'id,name,style,image_url,created_at,user_id,brew_type,mash_method,fermentation_type,copy_count,times_brewed,view_count,trending_score,quality_score,is_featured,abv,ibu,data,remix_parent_id,moderation_status,breweries!left(id,name,logo_url),ratings(rating),likes_count';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBrew(b: any) {
  const bData = b.data as any;
  return {
    ...b,
    // Prefer dedicated columns (kept in sync by trigger), fall back to JSON
    abv: b.abv != null ? Number(b.abv)
       : bData?.abv  ? parseFloat(bData.abv)  : undefined,
    ibu: b.ibu != null ? Number(b.ibu)
       : bData?.ibu  ? parseInt(bData.ibu, 10) : undefined,
    ebc: bData?.color ? parseInt(bData.color, 10) : undefined,
    original_gravity:
      bData?.original_gravity || bData?.og || bData?.plato
        ? parseFloat(String(bData.original_gravity || bData.og || bData.plato))
        : undefined,
    brewery: Array.isArray(b.breweries) ? b.breweries[0] : b.breweries,
    user_has_liked: false,
  };
}

async function getInitialBrews() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('brews')
    .select(BREW_SELECT)
    .eq('is_public', true)
    .order('quality_score', { ascending: false })
    .range(0, BREW_PAGE_SIZE - 1);
  if (error) { console.error('[SSR] Error loading brews:', error.message); return []; }
  return (data || []).map(mapBrew);
}

// Top-10 nach trending_score — DB-seitig sortiert, vollständig unabhängig vom
// Infinite-Scroll-Batch (der nach quality_score paginiert)
async function getTrendingBrews() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('brews')
    .select(BREW_SELECT)
    .eq('is_public', true)
    .order('trending_score', { ascending: false })
    .limit(10);
  if (error) { console.error('[SSR] Error loading trending:', error.message); return []; }
  return (data || []).map(mapBrew);
}

// Featured Brews — manuell vom Admin als empfohlen markierte Brews
async function getFeaturedBrews() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('brews')
    .select(BREW_SELECT)
    .eq('is_public', true)
    .eq('is_featured', true)
    .order('quality_score', { ascending: false })
    .limit(12);
  if (error) { console.error('[SSR] Error loading featured:', error.message); return []; }
  return (data || []).map(mapBrew);
}

// ─── Skeleton (wird während Suspense-Fallback gezeigt) ────────────────────────
function DiscoverSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-20">
      <div className="h-10 w-64 bg-zinc-900 rounded-xl animate-pulse mb-4" />
      <div className="h-14 bg-zinc-900 rounded-2xl animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-72 bg-zinc-900/40 rounded-2xl border border-zinc-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

const FACTS = [
  "Wusstest du schon? Hopfen gehört zur Familie der Hanfgewächse und sorgt nicht nur für Bitterkeit, sondern macht das Bier auch haltbarer.",
  "Der älteste überlieferte Brau-Code ist das Reinheitsgebot von 1516. Es erlaubte nur Wasser, Malz und Hopfen – Hefe war damals noch unbekannt!",
  "Licht ist der Feind des Bieres. UV-Strahlen reagieren mit der Hopfensäure und erzeugen einen unangenehmen Geschmack. Deshalb sind Bierflaschen meist braun.",
  "Die älteste noch aktive Brauerei der Welt ist die Bayerische Staatsbrauerei Weihenstephan, gegründet im Jahr 1040."
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DiscoverPage() {
  // Parallel — unabhängige Queries, kein Waterfall
  const [initialBrews, initialTrending, initialFeatured, settings] = await Promise.all([
    getInitialBrews(),
    getTrendingBrews(),
    getFeaturedBrews(),
    getDiscoverSettings().catch(() => ({ collab_diversity_cap: 3 })),
  ]);

  const randomFact = FACTS[Math.floor(Math.random() * FACTS.length)];

  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverClient 
        initialBrews={initialBrews} 
        initialTrending={initialTrending} 
        initialFeatured={initialFeatured} 
        initialRandomFact={randomFact}
        collabDiversityCap={settings.collab_diversity_cap ?? 3}
      />
    </Suspense>
  );
}
