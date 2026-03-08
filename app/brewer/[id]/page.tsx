'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import DiscoverBrewCard from '@/app/components/DiscoverBrewCard';
import ReportButton from '@/app/components/reporting/ReportButton';
import DrinkTimeline from '@/app/my-cellar/components/DrinkTimeline';
import MinimalStickyHeader from '@/app/brew/[id]/components/MinimalStickyHeader';
import { buildTimelineFromData } from '@/lib/timeline-types';
import {
  MessageSquare,
  Calendar,
  Star,
  Beer,
  MapPin,
  BookOpen,
  BarChart2,
  Archive,
  ChevronRight,
  User,
  Building2,
} from 'lucide-react';

/* ── Tiny stat pill used in the KPI grid ─────────────────────── */
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-surface border border-border hover:border-border-hover rounded-2xl p-4 flex flex-col justify-center min-h-[88px] transition-colors">
      <div className={`text-[10px] uppercase font-bold mb-1 tracking-wider ${color}`}>{label}</div>
      <div className="font-black text-2xl text-text-primary">{value}</div>
    </div>
  );
}

export default function PublicBrewerPage() {
  const params = useParams();
  const id = params?.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [brews, setBrews] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [forumReputation, setForumReputation] = useState(0);
  const [brewRatings, setBrewRatings] = useState<{ [key: string]: { avg: number; count: number } }>({});
  const [consumerCaps, setConsumerCaps] = useState<any[]>([]);
  const [consumerRatings, setConsumerRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
      const isDrinkerMode = profileData.app_mode === 'drinker';
      // Set default tab based on mode
      setActiveTab(isDrinkerMode ? 'sammlung' : 'rezepte');

      if (isDrinkerMode) {
        const [capsResult, userRatingsResult] = await Promise.all([
          supabase
            .from('collected_caps')
            .select('id, collected_at, brew_id, brews(id, name, cap_url, image_url, style, brewery_id, breweries(id, name))')
            .eq('user_id', id)
            .order('collected_at', { ascending: false }),
          supabase
            .from('ratings')
            .select('id, rating, comment, author_name, created_at, brew_id, brews(id, name, cap_url)')
            .eq('user_id', id)
            .eq('moderation_status', 'auto_approved')
            .order('created_at', { ascending: false }),
        ]);
        if (capsResult.data) setConsumerCaps(capsResult.data);
        if (userRatingsResult.data) setConsumerRatings(userRatingsResult.data);
      } else {
        const { data: membersData } = await supabase
          .from('brewery_members')
          .select('role, breweries(id, name, logo_url, moderation_status)')
          .eq('user_id', id);

        if (membersData) {
          setTeams(membersData.map((m: any) => m.breweries).filter(Boolean));
        }

        const { data: brewsData } = await supabase
          .from('brews')
          .select('*')
          .eq('user_id', id)
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (brewsData) {
          setBrews(brewsData);
          const ratingsMap: { [key: string]: { avg: number; count: number } } = {};
          for (const brew of brewsData) {
            const { data: ratings } = await supabase
              .from('ratings')
              .select('rating')
              .eq('brew_id', brew.id)
              .eq('moderation_status', 'auto_approved');
            if (ratings && ratings.length > 0) {
              const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
              ratingsMap[brew.id] = { avg: Math.round(avg * 10) / 10, count: ratings.length };
            }
          }
          setBrewRatings(ratingsMap);
        }
      }

      const [threadsResult, postsResult] = await Promise.all([
        supabase
          .from('forum_threads')
          .select('*, category:forum_categories(title, slug), posts:forum_posts(count)')
          .eq('author_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('forum_posts')
          .select('id, content, created_at, thread_id, deleted_at, thread:forum_threads(id, title)')
          .eq('author_id', id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (threadsResult.data) {
        setForumThreads(threadsResult.data.map((t: any) => ({ ...t, reply_count: t.posts?.[0]?.count || 0 })));
      }
      if (postsResult.data) setForumPosts(postsResult.data);

      const allIds = [
        ...(threadsResult.data ?? []).map((t: any) => t.id),
        ...(postsResult.data ?? []).map((p: any) => p.id),
      ];
      if (allIds.length > 0) {
        const { count: repCount } = await supabase
          .from('forum_votes')
          .select('id', { count: 'exact', head: true })
          .in('target_id', allIds);
        setForumReputation(repCount ?? 0);
      }
    } else {
      console.error('Profil nicht gefunden:', profileError);
    }

    setLoading(false);
  }

  /* ── Guard states ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-text-disabled mx-auto mb-4" />
          <p className="text-text-muted">Lade Profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-text-muted flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-4xl font-black mb-4 text-text-primary">404</h1>
        <p className="text-lg mb-8">Dieser Nutzer existiert nicht.</p>
        <Link href="/" className="text-brand hover:text-brand transition">← Zur Startseite</Link>
      </div>
    );
  }

  /* ── Derived values ──────────────────────────────────────────── */
  const isDrinker = profile.app_mode === 'drinker';

  const totalRatings = Object.values(brewRatings).reduce((sum, r) => sum + r.count, 0);
  const avgOverallRating =
    totalRatings > 0
      ? (Object.values(brewRatings).reduce((sum, r) => sum + r.avg * r.count, 0) / totalRatings).toFixed(1)
      : null;

  const totalConsumerRatings = consumerRatings.length;
  const avgConsumerRating =
    totalConsumerRatings > 0
      ? (consumerRatings.reduce((s: number, r: any) => s + r.rating, 0) / totalConsumerRatings).toFixed(1)
      : null;
  const uniqueBreweries = new Set(
    consumerCaps.map((c: any) => (c.brews as any)?.brewery_id).filter(Boolean),
  ).size;

  /* ── Tab definitions ─────────────────────────────────────────── */
  const tabs = isDrinker
    ? [
        { id: 'sammlung', label: 'Sammlung', icon: <Archive size={14} /> },
        { id: 'bewertungen', label: 'Bewertungen', icon: <Star size={14} /> },
        { id: 'aktivität', label: 'Aktivität', icon: <MessageSquare size={14} /> },
      ]
    : [
        { id: 'rezepte', label: 'Rezepte', icon: <BookOpen size={14} /> },
        { id: 'stats', label: 'Statistiken', icon: <BarChart2 size={14} /> },
        { id: 'aktivität', label: 'Aktivität', icon: <MessageSquare size={14} /> },
      ];

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background text-text-primary">

      <Header />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Blurred background */}
        {profile.logo_url && (
          <img
            src={profile.logo_url}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-[0.12] blur-3xl scale-110 pointer-events-none"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-transparent" />

        {/* Hero content */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-8 md:pt-10 pb-6">
          <div className="flex items-end gap-5 md:gap-8">
            {/* Avatar */}
            <div className="shrink-0 w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden border border-border/60 shadow-2xl bg-surface">
              {profile.logo_url ? (
                <img src={profile.logo_url} className="w-full h-full object-cover" alt={profile.display_name} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-surface-hover to-surface flex items-center justify-center">
                  <User className="w-10 h-10 text-text-disabled" />
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                    isDrinker
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/30 text-rating'
                      : 'bg-brand-bg border-brand/30 text-brand'
                  }`}
                >
                  {isDrinker ? 'Bierfreund' : 'Brauer'}
                </span>
                <ReportButton targetId={profile.id} targetType="user" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-text-primary tracking-tight drop-shadow-md leading-tight">
                {profile.display_name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {profile.location && (
                  <span className="text-sm text-text-secondary flex items-center gap-1.5">
                    <MapPin size={12} className="text-text-disabled" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website.includes('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand hover:text-brand-hover transition truncate max-w-xs"
                  >
                    {profile.website.replace(/https?:\/\//, '')}
                  </a>
                )}
                {!isDrinker && brews.length > 0 && (
                  <span className="text-sm text-text-muted">{brews.length} öffentliche Rezepte</span>
                )}
              </div>
            </div>
          </div>

          {/* Bio (mobile) */}
          {profile.bio && (
            <p className="lg:hidden text-sm text-text-secondary leading-relaxed mt-4 max-w-2xl">{profile.bio}</p>
          )}

          {/* KPI stats row — inline in hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {isDrinker ? (
              <>
                <StatCard label="Kronkorken" value={consumerCaps.length} color="text-brand" />
                <StatCard label="Brauereien" value={uniqueBreweries} color="text-rating" />
                <StatCard label="Bewertungen" value={totalConsumerRatings} color="text-success" />
                <StatCard label="Ø Bewertung" value={avgConsumerRating || '–'} color="text-rating" />
              </>
            ) : (
              <>
                <StatCard label="Rezepte" value={brews.length} color="text-brand" />
                <StatCard label="Ø Bewertung" value={avgOverallRating || '–'} color="text-rating" />
                <StatCard label="Aktiv seit" value={profile.founded_year || new Date(profile.created_at || Date.now()).getFullYear()} color="text-text-secondary" />
                <StatCard label="Reputation" value={forumReputation} color="text-success" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Minimal sticky header — sentinel placed here so it triggers when hero leaves viewport */}
      <MinimalStickyHeader
        brewName={profile.display_name}
        activeTab={activeTab}
        onTabClick={setActiveTab}
        tabs={tabs.map(t => ({ id: t.id, label: t.label }))}
      />

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16">

        {/* Mobile tab bar */}
        <div className="lg:hidden border-b border-border mb-6 flex overflow-x-auto snap-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold whitespace-nowrap snap-start transition-colors relative ${
                activeTab === tab.id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── DESKTOP SIDEBAR ──────────────────────────────────── */}
          <nav className="hidden lg:flex flex-col gap-1 w-52 flex-shrink-0 sticky top-20 self-start">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-text-disabled px-3 mb-1">Profil</p>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-surface-hover text-text-primary'
                    : 'text-text-muted hover:text-text-secondary hover:bg-surface'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-brand' : ''}>{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && <ChevronRight size={12} className="ml-auto text-text-disabled" />}
              </button>
            ))}

            {/* Bio card */}
            {profile.bio && (
              <div className="mt-4 bg-surface border border-border rounded-2xl p-4">
                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-2">Über</p>
                <p className="text-xs text-text-secondary leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Teams */}
            {teams.length > 0 && (
              <div className="mt-3 bg-surface border border-border rounded-2xl p-4">
                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-2">Mitglied bei</p>
                <div className="space-y-1">
                  {teams.map((team: any) => (
                    <Link key={team.id} href={`/brewery/${team.id}`} className="block group">
                      <div className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-hover/50 transition">
                        <div className="w-6 h-6 rounded-full bg-surface-hover overflow-hidden shrink-0 border border-border-hover">
                          {team.logo_url && team.moderation_status !== 'pending' ? (
                            <img src={team.logo_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-3.5 h-3.5 text-text-disabled" />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-text-secondary group-hover:text-brand transition text-xs truncate">
                          {team.name}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* ── CONTENT AREA ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0 w-full space-y-8">

            {/* ── REZEPTE TAB (brewer) ─────────────────────────── */}
            {activeTab === 'rezepte' && !isDrinker && (
              brews.length === 0 ? (
                <div className="bg-surface/30 border border-dashed border-border rounded-2xl p-12 text-center">
                  <BookOpen className="w-8 h-8 text-text-disabled mx-auto mb-3" />
                  <p className="text-text-muted">Dieser Brauer hat noch keine öffentlichen Rezepte.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {brews.map(brew => (
                    <DiscoverBrewCard
                      key={brew.id}
                      brew={{
                        ...brew,
                        abv: brew.data?.abv ? parseFloat(brew.data.abv) : undefined,
                        ibu: brew.data?.ibu ? parseInt(brew.data.ibu, 10) : undefined,
                        ebc: brew.data?.color ? parseInt(brew.data.color, 10) : undefined,
                        original_gravity: brew.data?.original_gravity || brew.data?.og || brew.data?.plato
                          ? parseFloat(String(brew.data.original_gravity || brew.data.og || brew.data.plato))
                          : undefined,
                        brewery: profile
                          ? { id: profile.id, name: profile.display_name, logo_url: profile.logo_url }
                          : null,
                        ratings: brewRatings[brew.id]
                          ? Array(brewRatings[brew.id].count).fill({ rating: brewRatings[brew.id].avg })
                          : [],
                      }}
                    />
                  ))}
                </div>
              )
            )}

            {/* ── STATS TAB (brewer) ──────────────────────────── */}
            {activeTab === 'stats' && !isDrinker && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-surface border border-border hover:border-border-hover rounded-2xl p-5 transition-colors col-span-2 sm:col-span-3">
                  <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-3">Alle Bewertungen</p>
                  <div className="flex items-end gap-4">
                    <div className="font-black text-5xl text-text-primary">{avgOverallRating || '–'}</div>
                    <div className="pb-1 text-text-secondary text-sm">
                      <div className="text-rating font-bold">
                        {'★'.repeat(Math.round(Number(avgOverallRating || 0)))}{'☆'.repeat(5 - Math.round(Number(avgOverallRating || 0)))}
                      </div>
                      <div>{totalRatings} Bewertungen gesamt</div>
                    </div>
                  </div>
                </div>

                {brews.slice(0, 6).map(brew => {
                  const r = brewRatings[brew.id];
                  return (
                    <Link key={brew.id} href={`/brew/${brew.id}`} className="block bg-surface border border-border hover:border-border-hover rounded-2xl p-4 transition-colors group">
                      <p className="font-bold text-text-secondary group-hover:text-text-primary transition text-sm truncate mb-1">{brew.name}</p>
                      {r ? (
                        <div className="flex items-center gap-2">
                          <span className="text-rating font-black">{r.avg.toFixed(1)}</span>
                          <span className="text-[10px] text-text-disabled">({r.count})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-disabled">Noch keine Bewertungen</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* ── SAMMLUNG TAB (drinker) ───────────────────────── */}
            {activeTab === 'sammlung' && isDrinker && (
              consumerCaps.length === 0 ? (
                <div className="bg-surface/30 border border-dashed border-border rounded-2xl p-12 text-center">
                  <Beer className="w-8 h-8 text-text-disabled mx-auto mb-3" />
                  <p className="text-text-muted">Noch keine Kronkorken gesammelt.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {consumerCaps.map((cap: any) => {
                      const brew = cap.brews as any;
                      const brewery = brew?.breweries as any;
                      return (
                        <Link
                          key={cap.id}
                          href={cap.brew_id ? `/brew/${cap.brew_id}` : '#'}
                          className="block bg-surface border border-border rounded-2xl p-4 hover:bg-surface hover:border-border-hover transition group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-surface-hover border border-border-hover overflow-hidden flex items-center justify-center shrink-0">
                              {brew?.cap_url ? (
                                <img src={brew.cap_url} className="w-full h-full object-cover" alt="" />
                              ) : brew?.image_url ? (
                                <img src={brew.image_url} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <Beer className="w-5 h-5 text-text-disabled" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-text-secondary group-hover:text-text-primary transition text-sm truncate">
                                {brew?.name || 'Unbekanntes Bier'}
                              </p>
                              {brewery?.name && <p className="text-[11px] text-text-muted truncate">{brewery.name}</p>}
                              {brew?.style && <p className="text-[10px] text-text-disabled truncate">{brew.style}</p>}
                            </div>
                          </div>
                          {cap.collected_at && (
                            <div className="mt-2 text-[10px] text-text-disabled flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(cap.collected_at).toLocaleDateString()}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>

                  {/* Reise Timeline */}
                  {(consumerCaps.length > 0 || consumerRatings.length > 0) && (
                    <div className="pt-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-muted mb-6">Reise</h3>
                      <DrinkTimeline months={buildTimelineFromData(consumerCaps, consumerRatings)} />
                    </div>
                  )}
                </>
              )
            )}

            {/* ── BEWERTUNGEN TAB (drinker) ────────────────────── */}
            {activeTab === 'bewertungen' && isDrinker && (
              consumerRatings.length === 0 ? (
                <div className="bg-surface/30 border border-dashed border-border rounded-2xl p-12 text-center">
                  <Star className="w-8 h-8 text-text-disabled mx-auto mb-3" />
                  <p className="text-text-muted">Noch keine Bewertungen.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consumerRatings.slice(0, 20).map((rating: any) => {
                    const brew = rating.brews as any;
                    return (
                      <Link
                        key={rating.id}
                        href={rating.brew_id ? `/brew/${rating.brew_id}` : '#'}
                        className="block bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-rating font-black text-sm">
                              {'★'.repeat(Math.round(rating.rating))}{'☆'.repeat(5 - Math.round(rating.rating))}
                            </span>
                            <span className="text-xs font-bold text-text-secondary">{rating.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-[10px] text-text-disabled flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(rating.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-bold text-text-secondary group-hover:text-text-primary transition text-sm truncate">
                          {brew?.name || 'Unbekanntes Bier'}
                        </p>
                        {rating.comment && (
                          <p className="text-xs text-text-muted mt-1 line-clamp-2">{rating.comment}</p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )
            )}

            {/* ── AKTIVITÄT TAB (both modes) ───────────────────── */}
            {activeTab === 'aktivität' && (
              <div className="space-y-8">
                {/* Forum threads */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-muted mb-4">
                    Diskussionen ({forumThreads.length})
                  </h3>
                  {forumThreads.length === 0 ? (
                    <div className="bg-surface/30 border border-dashed border-border rounded-2xl p-10 text-center">
                      <p className="text-text-muted">Keine öffentlichen Diskussionen gestartet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {forumThreads.map(thread => (
                        <Link
                          key={thread.id}
                          href={`/forum/thread/${thread.id}`}
                          className="block bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition group"
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-success bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                {thread.category?.title}
                              </span>
                              <span className="text-[10px] text-text-muted flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(thread.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-muted flex items-center gap-1 bg-background px-2 py-1 rounded-lg border border-border group-hover:border-border transition whitespace-nowrap">
                              {thread.reply_count} <MessageSquare size={10} />
                            </span>
                          </div>
                          <h4 className="font-bold text-text-secondary group-hover:text-text-primary transition line-clamp-1">
                            {thread.title}
                          </h4>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent replies */}
                {forumPosts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-muted mb-4">
                      Neueste Antworten ({forumPosts.length})
                    </h3>
                    <div className="space-y-3">
                      {forumPosts.slice(0, 10).map((post: any) => (
                        <Link
                          key={post.id}
                          href={`/forum/thread/${post.thread_id}`}
                          className="block bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition group"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare size={11} className="text-text-disabled" />
                            <span className="text-xs font-bold text-text-secondary group-hover:text-text-primary transition line-clamp-1">
                              {(post.thread as any)?.title ?? 'Thread'}
                            </span>
                            <span className="ml-auto text-[10px] text-text-disabled flex items-center gap-1 whitespace-nowrap">
                              <Calendar size={10} />
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted line-clamp-2">{post.content}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
