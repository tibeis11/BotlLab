'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Beer, Star, TrendingUp, ChevronRight } from 'lucide-react';

interface BrewSummary {
  id: string;
  name: string;
  style: string | null;
  avg_rating: number;
  rating_count: number;
  created_at: string;
}

export default function TopBrewsWidget({ breweryId }: { breweryId: string }) {
  const [brews, setBrews] = useState<BrewSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopBrews();
  }, [breweryId]);

  async function loadTopBrews() {
    try {
      // Get all brews
      const { data: allBrews } = await supabase
        .from('brews')
        .select('id, name, style, created_at')
        .eq('brewery_id', breweryId)
        .order('created_at', { ascending: false });

      if (!allBrews || allBrews.length === 0) {
        setLoading(false);
        return;
      }

      const brewIds = allBrews.map((b: { id: string }) => b.id);

      // Get ratings for all brews
      const { data: ratings } = await supabase
        .from('ratings')
        .select('brew_id, rating')
        .in('brew_id', brewIds)
        .eq('moderation_status', 'auto_approved');

      // Aggregate ratings per brew
      const ratingMap = new Map<string, { sum: number; count: number }>();
      ratings?.forEach((r: { brew_id: string; rating: number }) => {
        const current = ratingMap.get(r.brew_id) || { sum: 0, count: 0 };
        current.sum += r.rating;
        current.count++;
        ratingMap.set(r.brew_id, current);
      });

      // Build summaries
      const summaries: BrewSummary[] = allBrews.map((b: { id: string; name: string; style: string | null; created_at: string }) => {
        const stats = ratingMap.get(b.id) || { sum: 0, count: 0 };
        return {
          id: b.id,
          name: b.name,
          style: b.style,
          avg_rating: stats.count > 0 ? Math.round((stats.sum / stats.count) * 10) / 10 : 0,
          rating_count: stats.count,
          created_at: b.created_at,
        };
      });

      // Sort by rating (with count tiebreaker), pick top 5
      summaries.sort((a, b) => {
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.rating_count - a.rating_count;
      });

      setBrews(summaries.slice(0, 5));
    } catch (e) {
      console.error('Failed to load top brews', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-32 bg-surface-hover rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-surface-hover/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (brews.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 text-center">
        <Beer className="w-8 h-8 text-text-disabled mx-auto mb-2" />
        <p className="text-xs text-text-disabled">Noch keine Rezepte angelegt</p>
        <Link 
          href={`/team/${breweryId}/brews/new`}
          className="text-xs text-brand hover:text-brand-hover mt-2 inline-block font-bold"
        >
          Erstes Rezept anlegen →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border-subtle bg-surface-hover/50 flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-rating" />
          Top Rezepte
        </h3>
        <Link
          href={`/team/${breweryId}/analytics`}
          className="text-[10px] text-brand hover:text-brand-hover font-bold uppercase tracking-wider transition-colors"
        >
          Analytics
        </Link>
      </div>

      <div className="divide-y divide-border-subtle">
        {brews.map((brew, i) => (
          <Link
            key={brew.id}
            href={`/team/${breweryId}/analytics/brew/${brew.id}`}
            className="px-4 py-3 flex items-center gap-3 hover:bg-surface-hover/50 transition-colors group"
          >
            {/* Rank */}
            <span className={`text-sm font-black w-6 text-center shrink-0 ${
              i === 0 ? 'text-yellow-500 dark:text-yellow-400' : 
              i === 1 ? 'text-text-secondary dark:text-text-secondary' : 
              i === 2 ? 'text-orange-600 dark:text-amber-600' : 'text-text-disabled'
            }`}>
              {i + 1}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-secondary group-hover:text-text-primary truncate transition-colors">
                {brew.name}
              </p>
              {brew.style && (
                <p className="text-[10px] text-text-disabled truncate">{brew.style}</p>
              )}
            </div>

            {/* Rating */}
            <div className="text-right shrink-0">
              {brew.rating_count > 0 ? (
                <>
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="w-3 h-3 text-rating fill-rating" />
                    <span className="text-sm font-bold text-text-primary">{brew.avg_rating}</span>
                  </div>
                  <span className="text-[10px] text-text-disabled">{brew.rating_count} Votes</span>
                </>
              ) : (
                <span className="text-[10px] text-text-disabled">Noch keine Votes</span>
              )}
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-text-disabled group-hover:text-text-muted transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
