'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getBreweryTierConfig } from '@/lib/tier-system';
import { MapPin, Globe, Building2, User, BookOpen } from 'lucide-react';

import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ReportButton from '@/app/components/reporting/ReportButton';
import DiscoverBrewCard from '@/app/components/DiscoverBrewCard';

/* ── Tiny stat pill used in the KPI grid ───────────────── */
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-surface border border-border hover:border-border-hover rounded-2xl p-4 flex flex-col justify-center min-h-[88px] transition-colors">
      <div className={`text-[10px] uppercase font-bold mb-1 tracking-wider ${color}`}>{label}</div>
      <div className="font-black text-2xl text-text-primary">{value}</div>
    </div>
  );
}

// Read-only Client für öffentliche Daten
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PublicBreweryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [brewery, setBrewery] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [brews, setBrews] = useState<any[]>([]);
  const [brewRatings, setBrewRatings] = useState<{[key: string]: {avg: number, count: number}}>({});
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
        // 1. Brauerei laden
        const { data: breweryData, error } = await supabase
            .from('breweries')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error || !breweryData) {
            console.error(error);
            setLoading(false);
            return;
        }

        setBrewery(breweryData);

        // 2. Mitglieder laden (mit Profilen)
        const { data: memberData } = await supabase
            .from('brewery_members')
            .select(`
                role,
                profiles (id, display_name, logo_url, tier)
            `)
            .eq('brewery_id', id);
        
        if (memberData) {
            // Flatten structure
            const team = memberData.map((m: any) => ({
                role: m.role,
                ...m.profiles
            }));
            setMembers(team);
        }

        // 3. Öffentliche Rezepte laden
        const { data: brewsData } = await supabase
            .from('brews')
            .select('*')
            .eq('brewery_id', id)
            .eq('is_public', true)
            .neq('moderation_status', 'pending') // Hide pending, show rest (approved or rejected defaults)
            .order('created_at', { ascending: false });

        if (brewsData) {
            setBrews(brewsData);

            // 4. Ratings für die Rezepte holen
            const ratingsMap: {[key: string]: {avg: number, count: number}} = {};
            
            // Parallel fetch ratings to save time
            await Promise.all(brewsData.map(async (brew) => {
                const { data: ratings } = await supabase
                    .from('ratings')
                    .select('rating')
                    .eq('brew_id', brew.id)
                    .eq('moderation_status', 'auto_approved'); // Nur bestätigte Bewertungen

                if (ratings && ratings.length > 0) {
                    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
                    ratingsMap[brew.id] = {
                        avg: Math.round(avg * 10) / 10,
                        count: ratings.length
                    };
                }
            }));
            setBrewRatings(ratingsMap);
        }

    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-text-disabled mx-auto mb-4" />
          <p className="text-text-muted">Lade Brauerei...</p>
        </div>
      </div>
    );
  }

  if (!brewery) {
    return (
      <div className="min-h-screen bg-background text-text-muted flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-4xl font-black mb-4 text-text-primary">404</h1>
        <p className="text-lg mb-8">Diese Brauerei existiert nicht.</p>
        <Link href="/discover" className="text-brand hover:text-brand-hover transition">← Zum Entdecken</Link>
      </div>
    );
  }

  /* ── Derived values ────────────────────────────────────────────── */
  const tierConfig = getBreweryTierConfig(brewery.tier || 'garage');
  const totalRatings = Object.values(brewRatings).reduce((sum, r) => sum + r.count, 0);
  const avgOverallRating =
    totalRatings > 0
      ? (Object.values(brewRatings).reduce((sum, r) => sum + r.avg * r.count, 0) / totalRatings).toFixed(1)
      : null;

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Header />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Blurred background */}
        {brewery.logo_url && brewery.moderation_status !== 'pending' && (
          <img
            src={brewery.logo_url}
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
            {/* Logo */}
            <div className="shrink-0 w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden border border-border/60 shadow-2xl bg-surface">
              {brewery.logo_url && brewery.moderation_status !== 'pending' ? (
                <img src={brewery.logo_url} className="w-full h-full object-cover" alt={brewery.name} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-surface-hover to-surface flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-text-disabled" />
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg border"
                  style={{
                    borderColor: tierConfig?.color ? `${tierConfig.color}40` : undefined,
                    color: tierConfig?.color || undefined,
                    backgroundColor: tierConfig?.color ? `${tierConfig.color}10` : undefined,
                  }}
                >
                  {tierConfig?.displayName || 'Brauerei'}
                </span>
                <ReportButton targetId={brewery.id} targetType="brewery" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-text-primary tracking-tight drop-shadow-md leading-tight">
                {brewery.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {brewery.location && (
                  <span className="text-sm text-text-secondary flex items-center gap-1.5">
                    <MapPin size={12} className="text-text-disabled" />
                    {brewery.location}
                  </span>
                )}
                {brewery.website_url && (
                  <a
                    href={brewery.website_url.includes('http') ? brewery.website_url : `https://${brewery.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand hover:text-brand-hover transition flex items-center gap-1.5 truncate max-w-xs"
                  >
                    <Globe size={12} className="text-text-disabled shrink-0" />
                    {brewery.website_url.replace(/https?:\/\//, '')}
                  </a>
                )}
                {brews.length > 0 && (
                  <span className="text-sm text-text-muted">{brews.length} öffentliche Rezepte</span>
                )}
              </div>
            </div>
          </div>

          {/* Description (mobile) */}
          {brewery.description && (
            <p className="lg:hidden text-sm text-text-secondary leading-relaxed mt-4 max-w-2xl">
              {brewery.description}
            </p>
          )}

          {/* KPI stats row — inline in hero */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
            <StatCard label="Rezepte" value={brews.length} color="text-brand" />
            <StatCard label="Ø Bewertung" value={avgOverallRating || '–'} color="text-rating" />
            <StatCard
              label="Gegründet"
              value={brewery.founded_year || new Date(brewery.created_at || Date.now()).getFullYear()}
              color="text-text-secondary"
            />
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── DESKTOP SIDEBAR ──────────────────────────────────────── */}
          <aside className="hidden lg:flex flex-col gap-3 w-52 flex-shrink-0 sticky top-20 self-start">
            {brewery.description && (
              <div className="bg-surface border border-border rounded-2xl p-4">
                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-2">Über</p>
                <p className="text-xs text-text-secondary leading-relaxed">{brewery.description}</p>
              </div>
            )}

            {members.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-4">
                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-2">Das Team</p>
                <div className="space-y-1">
                  {members.map((member: any) => (
                    <Link key={member.id} href={`/brewer/${member.id}`} className="block group">
                      <div className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-hover/50 transition">
                        <div className="w-6 h-6 rounded-full bg-surface-hover overflow-hidden shrink-0 border border-border-hover">
                          {member.logo_url ? (
                            <img src={member.logo_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-text-disabled" />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-text-secondary group-hover:text-brand transition text-xs truncate">
                          {member.display_name}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ── CONTENT AREA ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Team (mobile) */}
            {members.length > 0 && (
              <div className="lg:hidden bg-surface border border-border rounded-2xl p-4">
                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-3">Das Team</p>
                <div className="flex flex-wrap gap-2">
                  {members.map((member: any) => (
                    <Link
                      key={member.id}
                      href={`/brewer/${member.id}`}
                      className="flex items-center gap-2 bg-surface-hover rounded-full pl-1 pr-3 py-1 border border-border hover:border-brand/20 transition group"
                    >
                      <div className="w-6 h-6 rounded-full bg-surface overflow-hidden shrink-0 border border-border-hover">
                        {member.logo_url ? (
                          <img src={member.logo_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-3 h-3 text-text-disabled" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-text-secondary group-hover:text-brand transition text-xs">
                        {member.display_name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recipes */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-muted mb-4">
                Öffentliche Rezepte
              </h3>
              {brews.length === 0 ? (
                <div className="bg-surface/30 border border-dashed border-border rounded-2xl p-12 text-center">
                  <BookOpen className="w-8 h-8 text-text-disabled mx-auto mb-3" />
                  <p className="text-text-muted">Diese Brauerei hat noch keine öffentlichen Rezepte.</p>
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
                        original_gravity:
                          brew.data?.original_gravity || brew.data?.og || brew.data?.plato
                            ? parseFloat(String(brew.data.original_gravity || brew.data.og || brew.data.plato))
                            : undefined,
                        brewery: brewery
                          ? { id: brewery.id, name: brewery.name, logo_url: brewery.logo_url }
                          : null,
                        ratings: brewRatings[brew.id]
                          ? Array(brewRatings[brew.id].count).fill({ rating: brewRatings[brew.id].avg })
                          : [],
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <Footer variant="minimal" />
    </div>
  );
}
