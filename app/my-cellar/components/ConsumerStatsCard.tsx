// ZWEI WELTEN Phase 4.3 — Gamification-Stats-Karte (Consumer Dashboard)
// Server Component: renders stats from pre-fetched data

import { Beer, Factory, Star, MessageSquare, Calendar, Award } from 'lucide-react';

export interface ConsumerStats {
  totalCaps: number;
  uniqueBreweries: number;
  totalRatings: number;
  averageRating: number | null;
  tastingIq: number;
  forumPosts: number;
  memberSince: string; // ISO date string from profiles.created_at
}

function formatMemberSince(isoDate: string): string {
  const d = new Date(isoDate);
  const months = [
    'Jan.', 'Feb.', 'Mär.', 'Apr.', 'Mai', 'Jun.',
    'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.',
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ConsumerStatsCard({ stats }: { stats: ConsumerStats }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-disabled mb-4">
        Meine Statistiken
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Kronkorken */}
        <StatItem
          icon={Beer}
          value={stats.totalCaps}
          label="Kronkorken"
          color="cyan"
        />

        {/* Brauereien */}
        <StatItem
          icon={Factory}
          value={stats.uniqueBreweries}
          label="Brauereien"
          color="amber"
        />

        {/* Bewertungen */}
        <StatItem
          icon={Star}
          value={stats.totalRatings}
          label="Bewertungen"
          color="emerald"
        />

        {/* Ø Bewertung */}
        <StatItem
          icon={Award}
          value={stats.averageRating !== null ? stats.averageRating.toFixed(1) : '–'}
          label="Ø Note"
          color="purple"
        />

        {/* Forum */}
        <StatItem
          icon={MessageSquare}
          value={stats.forumPosts}
          label="Forum-Beiträge"
          color="emerald"
        />

        {/* Mitglied seit */}
        <StatItem
          icon={Calendar}
          value={formatMemberSince(stats.memberSince)}
          label="Dabei seit"
          color="zinc"
          small
        />
      </div>
    </div>
  );
}

function StatItem({
  icon: Icon,
  value,
  label,
  color,
  small = false,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
  small?: boolean;
}) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-500',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
    purple: 'text-purple-500',
    zinc: 'text-text-muted',
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-hover/30 border border-border/50">
      <div className={`w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0 ${colorMap[color] || 'text-text-muted'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className={`font-bold text-text-primary leading-tight ${small ? 'text-sm' : 'text-lg'}`}>
          {value}
        </p>
        <p className="text-[10px] text-text-disabled uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
