import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client for Server Side Usage (Admin/Public read)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  // fetch data
  const { data: brew } = await supabase
    .from('brews')
    .select('*, profiles(display_name)')
    .eq('id', id)
    .single();
  
  if (!brew) {
      return {
          title: 'BotlLab - Rezept nicht gefunden',
      }
  }

  const volume = brew.data?.batch_size_liters ? `${brew.data.batch_size_liters}L` : '';
  const abv = brew.data?.abv ? `${brew.data.abv}% ABV` : '';
  const style = brew.style || 'Handcrafted';
  const brewer = brew.profiles?.display_name || 'BotlLab Brewer';

  // Construct a nice description
  const description = `Ein ${volume} ${style} Rezept von ${brewer}. ${abv} ${brew.data?.ibu ? `• ${brew.data.ibu} IBU` : ''}. Entdecke Details und Bewertungen auf BotlLab.`;

  return {
    title: `${brew.name} | Rezept auf BotlLab`,
    description: description,
    openGraph: {
      title: `${brew.name} 🍺`,
      description: description,
      url: `https://botllab.app/brew/${id}`, // Adjust domain if known, defaulting to probable prod
      siteName: 'BotlLab',
      images: [
        {
          url: brew.image_url || 'https://botllab.de/brand/og-default.jpg', // Fallback or brew image
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
      description: description,
      images: [brew.image_url || ''],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
