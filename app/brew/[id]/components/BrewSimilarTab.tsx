'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { Shuffle, FlaskConical } from 'lucide-react';

interface SimilarBrew {
  id: string;
  name: string;
  style?: string | null;
  brew_type?: string | null;
  image_url?: string | null;
  quality_score?: number | null;
  avg_rating?: number | null;
  rating_count?: number | null;
  user_id?: string | null;
  brewery_id?: string | null;
  brewer?: { username?: string | null; display_name?: string | null } | null;
}

function BrewCard({ brew }: { brew: SimilarBrew }) {
  return (
    <Link
      href={`/brew/${brew.id}`}
      className="group flex items-center gap-3 bg-surface/60 hover:bg-surface border border-border hover:border-border-hover rounded-xl p-3 transition-colors"
    >
      <div className="w-11 h-11 rounded-lg bg-surface-hover border border-border overflow-hidden shrink-0 flex items-center justify-center">
        {brew.image_url ? (
          <Image src={brew.image_url} alt={brew.name} width={44} height={44} className="object-cover w-full h-full" />
        ) : (
          <FlaskConical className="w-5 h-5 text-text-disabled" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary truncate group-hover:text-rating transition-colors">{brew.name}</p>
        <p className="text-[11px] text-text-muted truncate">
          {brew.style ?? brew.brew_type ?? 'Rezept'}
          {brew.brewer?.display_name ? ` · ${brew.brewer.display_name}` : ''}
        </p>
      </div>
      {brew.avg_rating != null && (
        <div className="shrink-0 text-right">
          <p className="text-xs font-black text-rating tabular-nums">{Number(brew.avg_rating).toFixed(1)}</p>
          <p className="text-[9px] text-text-disabled">{brew.rating_count ?? 0} Bew.</p>
        </div>
      )}
    </Link>
  );
}

interface Props {
  brew: any;
}

export default function BrewSimilarTab({ brew }: Props) {
  const [styleBrews, setStyleBrews] = useState<SimilarBrew[]>([]);
  const [brewerBrews, setBrewerBrews] = useState<SimilarBrew[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brew?.id) return;

    (async () => {

      const SELECT = 'id, name, style, brew_type, image_url, quality_score, avg_rating:ratings(rating.avg()), rating_count:ratings(count), user_id, brewery_id, brewer:profiles(display_name)';

      // Similar by style
      const stylePromise = (brew.style || brew.brew_type)
        ? Promise.resolve(
            brew.style
              ? supabase.from('brews').select(SELECT).neq('id', brew.id).eq('moderation_status', 'approved').eq('style', brew.style).order('quality_score', { ascending: false }).limit(6)
              : supabase.from('brews').select(SELECT).neq('id', brew.id).eq('moderation_status', 'approved').eq('brew_type', brew.brew_type).order('quality_score', { ascending: false }).limit(6)
          )
        : Promise.resolve({ data: [] as any[] });

      // Same brewer
      const brewerId = brew.brewery_id ?? brew.user_id;
      const brewerField = brew.brewery_id ? 'brewery_id' : 'user_id';
      const brewerPromise = brewerId
        ? Promise.resolve(
            supabase.from('brews').select(SELECT).neq('id', brew.id).eq(brewerField, brewerId).eq('moderation_status', 'approved').order('quality_score', { ascending: false }).limit(6)
          )
        : Promise.resolve({ data: [] as any[] });

      const [styleRes, brewerRes] = await Promise.all([stylePromise, brewerPromise]);
      setStyleBrews(styleRes.data ?? []);
      setBrewerBrews(brewerRes.data ?? []);
      setLoading(false);
    })();
  }, [brew?.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-full h-16 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const hasAny = styleBrews.length > 0 || brewerBrews.length > 0;

  if (!hasAny) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <Shuffle className="w-6 h-6 text-text-muted" />
        </div>
        <p className="text-text-primary font-bold">Keine ähnlichen Rezepte gefunden</p>
        <p className="text-sm text-text-disabled max-w-xs">
          Sobald mehr Rezepte im gleichen Stil vorhanden sind, erscheinen sie hier.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {styleBrews.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-4">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-text-muted">
              Ähnliche Rezepte
            </h3>
            <div className="h-px bg-border flex-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {styleBrews.map(b => <BrewCard key={b.id} brew={b} />)}
          </div>
        </section>
      )}
      {brewerBrews.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-4">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-text-muted">
              Vom selben Brauer
            </h3>
            <div className="h-px bg-border flex-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {brewerBrews.map(b => <BrewCard key={b.id} brew={b} />)}
          </div>
        </section>
      )}
    </div>
  );
}
