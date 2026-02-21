import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client for Server Side Usage (Admin/Public read)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Shared data fetch ────────────────────────────────────────────────────────
async function getBrew(id: string) {
  const { data } = await supabase
    .from('brews')
    .select('*, profiles(display_name), ratings(rating)')
    .eq('id', id)
    .single();
  return data;
}

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

// ─── SEO Metadata ─────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: Pick<Props, 'params'>
): Promise<Metadata> {
  const { id } = await params;
  const brew = await getBrew(id);

  if (!brew) {
    return { title: 'BotlLab – Rezept nicht gefunden' };
  }

  const volume = brew.data?.batch_size_liters ? `${brew.data.batch_size_liters}L` : '';
  const abv = brew.data?.abv ? `${brew.data.abv}% ABV` : '';
  const style = brew.style || 'Handcrafted';
  const brewer = brew.profiles?.display_name || 'BotlLab Brewer';
  const description = `Ein ${volume} ${style} Rezept von ${brewer}. ${abv}${brew.data?.ibu ? ` • ${brew.data.ibu} IBU` : ''}. Entdecke Details und Bewertungen auf BotlLab.`;

  return {
    title: `${brew.name} | Rezept auf BotlLab`,
    description,
    alternates: { canonical: `/brew/${id}` },
    openGraph: {
      title: `${brew.name} 🍺`,
      description,
      url: `https://botllab.de/brew/${id}`,
      siteName: 'BotlLab',
      images: [
        {
          url: brew.image_url || 'https://botllab.de/brand/og-default.jpg',
          width: 1200,
          height: 630,
          alt: brew.name,
        },
      ],
      locale: 'de_DE',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: brew.name,
      description,
      images: [brew.image_url || ''],
    },
  };
}

// ─── Layout + schema.org/Recipe JSON-LD ───────────────────────────────────────
export default async function Layout({ params, children }: Props) {
  const { id } = await params;
  const brew = await getBrew(id);

  let jsonLd: Record<string, unknown> | null = null;

  if (brew) {
    const brewer = brew.profiles?.display_name || 'BotlLab Brewer';
    const style = brew.style || '';
    const volume = brew.data?.batch_size_liters ? `${brew.data.batch_size_liters} Liter` : '';
    const description = `Ein ${volume} ${style} Rezept von ${brewer}.`.trim();

    // Build ingredient list from JSONB data
    const malts: string[] = (brew.data?.malts ?? []).map(
      (m: { name?: string; amount?: string | number; unit?: string }) =>
        [m.amount, m.unit, m.name].filter(Boolean).join(' ')
    );
    const hops: string[] = (brew.data?.hops ?? []).map(
      (h: { name?: string; amount?: string | number; unit?: string }) =>
        [h.amount, h.unit, h.name].filter(Boolean).join(' ')
    );
    const yeast: string[] = Array.isArray(brew.data?.yeast)
      ? brew.data.yeast.map((y: { name?: string }) => y.name).filter(Boolean)
      : brew.data?.yeast
      ? [String(brew.data.yeast)]
      : [];
    const ingredients = [...malts, ...hops, ...yeast];

    // Aggregate rating
    const ratings: { rating: number }[] = brew.ratings ?? [];
    const ratingCount = ratings.length;
    const ratingValue =
      ratingCount > 0
        ? Math.round((ratings.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / ratingCount) * 10) / 10
        : null;

    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: brew.name,
      description,
      author: {
        '@type': 'Person',
        name: brewer,
      },
      url: `https://botllab.de/brew/${id}`,
      ...(brew.image_url && { image: brew.image_url }),
      recipeCategory: style || 'Bier',
      recipeYield: volume || '20 Liter',
      ...(ingredients.length > 0 && { recipeIngredient: ingredients }),
      ...(ratingValue !== null && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue,
          ratingCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
      ...(brew.data?.abv && {
        nutrition: {
          '@type': 'NutritionInformation',
          alcoholContent: `${brew.data.abv}%`,
        },
      }),
      publisher: {
        '@type': 'Organization',
        name: 'BotlLab',
        url: 'https://botllab.de',
      },
    };
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
