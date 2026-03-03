// ZWEI WELTEN Phase 2 + 4.3 — Consumer Dashboard (/my-cellar)
// Server Component: fetches stats + activity feed, then renders
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import {
  Beer,
  FlaskConical,
  ScanLine,
  Clock,
} from 'lucide-react';
import BecomeBrewerCTA from './components/BecomeBrewerCTA';
import ConsumerStatsCard from './components/ConsumerStatsCard';
import DrinkTimeline from './components/DrinkTimeline';
import DiscoverWidgetLoader from './components/DiscoverWidgetLoader';
import { getConsumerStats } from '@/lib/actions/consumer-stats-actions';
import { getConsumerTimeline } from '@/lib/actions/consumer-timeline-actions';

// ─────────────────────────────────────────────────────────────────────────────
// Types for the activity feed
// ─────────────────────────────────────────────────────────────────────────────
type ActivityItem =
  | { kind: 'cap';  id: string; ts: string; brew: string | null; brewId: string | null }
  | { kind: 'scan'; id: string; ts: string; brew: string | null; brewId: string | null };

const KIND_LABEL: Record<ActivityItem['kind'], string> = {
  cap: 'Kronkorken gesammelt',
  scan: 'Flasche gescannt',
};

const KIND_ICON: Record<ActivityItem['kind'], React.ElementType> = {
  cap: Beer,
  scan: ScanLine,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d === 1 ? '' : 'en'}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default async function MyCellarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?callbackUrl=/my-cellar');

  // ── Parallel fetches ──────────────────────────────────────────────────────
  const [
    profileRes,
    activityCapsRes,
    activityScansRes,
    consumerStats,
    timelineMonths,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, tasting_iq')
      .eq('id', user.id)
      .single(),

    // Activity: latest 20 collected caps with brew name
    supabase
      .from('collected_caps')
      .select('id, collected_at, brew_id, brews(name)')
      .eq('user_id', user.id)
      .order('collected_at', { ascending: false })
      .limit(20),

    // Activity: latest 20 bottle scans by this user
    supabase
      .from('bottle_scans')
      .select('id, created_at, brew_id, brews(name)')
      .eq('viewer_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),

    // Consumer stats for the stats card (Phase 4.3)
    getConsumerStats(user.id),

    // Timeline data (Phase 4.4)
    getConsumerTimeline(user.id),
  ]);

  // ── Compute stats ─────────────────────────────────────────────────────────
  const displayName =
    profileRes.data?.display_name ||
    user.email?.split('@')[0] ||
    'Bierfreund';

  // ── Build activity feed ───────────────────────────────────────────────────
  const capItems: ActivityItem[] = (activityCapsRes.data ?? []).map((c) => ({
    kind: 'cap',
    id: c.id,
    ts: c.collected_at ?? '',
    brew: (c.brews as { name: string | null } | null)?.name ?? null,
    brewId: c.brew_id ?? null,
  }));

  const scanItems: ActivityItem[] = (activityScansRes.data ?? []).map((s) => ({
    kind: 'scan',
    id: s.id,
    ts: s.created_at,
    brew: (s.brews as { name: string | null } | null)?.name ?? null,
    brewId: s.brew_id ?? null,
  }));

  // Merge + sort by timestamp DESC, take top 20
  const feed: ActivityItem[] = [...capItems, ...scanItems]
    .filter((item) => !!item.ts)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 20);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Willkommen zurück, {displayName}! 🍻
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Hier ist dein Keller auf einen Blick.
        </p>
      </div>

      {/* Stats Card (Phase 4.3) */}
      <ConsumerStatsCard stats={consumerStats} />

      {/* Two-column grid: Feed + Discover */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Activity Feed — 2/3 width */}
        <section className="lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            Letzte Aktivitäten
          </h2>
          {feed.length === 0 ? (
            <EmptyActivityFeed />
          ) : (
            <div className="space-y-2">
              {feed.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* Discover Sidebar — 1/3 width */}
        <aside>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-zinc-500" />
            Entdecken
          </h2>
          <Suspense fallback={<div className="h-40 bg-zinc-900 rounded-2xl animate-pulse" />}>
            <DiscoverWidgetLoader />
          </Suspense>
        </aside>
      </div>

      {/* Meine Reise Timeline (Phase 4.4) */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🗺️ Meine Reise
        </h2>
        <DrinkTimeline months={timelineMonths} />
      </section>

      {/* Become Brewer Banner */}
      <BecomeBrewerCTA variant="banner" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = KIND_ICON[item.kind];
  const label = KIND_LABEL[item.kind];

  let detail: React.ReactNode = null;
  if (item.brew && item.brewId) {
    detail = (
      <Link href={`/brew/${item.brewId}`} className="text-zinc-300 hover:text-white transition font-medium">
        {item.brew}
      </Link>
    );
  } else {
    detail = <span className="text-zinc-500">Unbekanntes Getränk</span>;
  }

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
      <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <div className="text-sm truncate">{detail}</div>
      </div>
      <span className="text-xs text-zinc-600 flex-shrink-0 mt-0.5">{timeAgo(item.ts)}</span>
    </div>
  );
}

function EmptyActivityFeed() {
  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center">
      <Beer className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
      <p className="text-sm font-medium text-zinc-400">Noch keine Aktivitäten</p>
      <p className="text-xs text-zinc-600 mt-1">
        Scanne deinen ersten Kronkorken, um zu starten!
      </p>
    </div>
  );
}
