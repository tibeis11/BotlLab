import { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';

import { calcWeightedAvg } from '@/lib/rating-utils';
import { mergeRecipeIngredientsIntoData } from '@/lib/ingredients/ingredient-adapter';

// ─── Shared data fetch ────────────────────────────────────────────────────────
async function getBrew(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('brews')
    .select('*, profiles(display_name), ratings(rating)')
    .eq('id', id)
    .single();
    
  if (data && data.data) {
    try {
      data.data = await mergeRecipeIngredientsIntoData(data.data, data.id, supabase);
    } catch(e) { console.error("Adapter error", e); }
  }
  
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = brew.data as Record<string, any> | null;
  const volume = d?.batch_size_liters ? `${d.batch_size_liters}L` : '';
  const abv = d?.abv ? `${d.abv}% ABV` : '';
  const style = brew.style || 'Handcrafted';
  const brewer = brew.profiles?.display_name || 'BotlLab Brewer';
  const description = `Ein ${volume} ${style} Rezept von ${brewer}. ${abv}${d?.ibu ? ` • ${d.ibu} IBU` : ''}. Entdecke Details und Bewertungen auf BotlLab.`;

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
          alt: brew.name ?? 'Brew',
        },
      ],
      locale: 'de_DE',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: brew.name ?? 'Brew',
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bd = brew.data as Record<string, any> | null;
    const brewer = brew.profiles?.display_name || 'BotlLab Brewer';
    const style = brew.style || '';
    const volume = bd?.batch_size_liters ? `${bd.batch_size_liters} Liter` : '';
    const description = `Ein ${volume} ${style} Rezept von ${brewer}.`.trim();

    // Build ingredient list from recipe_ingredients (merged by adapter)
    const malts: string[] = (bd?.malts ?? []).map(
      (m: { name?: string; amount?: string | number; unit?: string }) =>
        [m.amount, m.unit, m.name].filter(Boolean).join(' ')
    );
    const hops: string[] = (bd?.hops ?? []).map(
      (h: { name?: string; amount?: string | number; unit?: string }) =>
        [h.amount, h.unit, h.name].filter(Boolean).join(' ')
    );
    const yeast: string[] = Array.isArray(bd?.yeast)
      ? bd.yeast.map((y: { name?: string }) => y.name).filter((n: unknown): n is string => !!n)
      : bd?.yeast
      ? [String(bd.yeast)]
      : [];
    const ingredients = [...malts, ...hops, ...yeast];

    // Aggregate rating
    const ratings: { rating: number }[] = brew.ratings ?? [];
    const ratingCount = ratings.length;
    const ratingValue =
      ratingCount > 0
        ? Math.round((calcWeightedAvg(ratings)) * 10) / 10
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
      ...(bd?.abv && {
        nutrition: {
          '@type': 'NutritionInformation',
          alcoholContent: `${bd.abv}%`,
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
