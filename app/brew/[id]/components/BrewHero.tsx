'use client';

import Link from 'next/link';
import { Star, Shuffle, Library, Share2, Heart, CheckCircle2, MessageCircle } from 'lucide-react';
import BrewActionButton from './BrewActionButton';
import LikeButton from '@/app/components/LikeButton';
import ReportButton from '@/app/components/reporting/ReportButton';

interface BrewHeroProps {
  brew: any;
  profile: any;
  parent: any;
  avgRating: string | null;
  ratingsCount: number;
  likesCount: number;
  userHasLiked: boolean;
  // Handlers
  handleShare: () => void;
  handleRemix: () => void;
  handleSaveToTeam: () => void;
  remixLoading: boolean;
  saveLoading: boolean;
  savedInBreweryIds: Set<string>;
  userBreweries: any[];
  copied: boolean;
}

export default function BrewHero({
  brew,
  profile,
  parent,
  avgRating,
  ratingsCount,
  likesCount,
  userHasLiked,
  handleShare,
  handleRemix,
  handleSaveToTeam,
  remixLoading,
  saveLoading,
  savedInBreweryIds,
  userBreweries,
  copied,
}: BrewHeroProps) {
  const isSaved = userBreweries.length === 1 && savedInBreweryIds.has(userBreweries[0]?.id);
  const canSave = userBreweries.length > 0;

  const brewTypeLabel =
    brew.brew_type === 'wine' ? 'Wein' :
    brew.brew_type === 'cider' ? 'Cider' :
    brew.brew_type === 'mead' ? 'Met' :
    brew.brew_type === 'softdrink' ? 'Softdrink' : 'Bier';

  const imageVisible =
    brew.image_url &&
    (brew.moderation_status === 'approved' ||
      brew.image_url.startsWith('/default_label/') ||
      brew.image_url.startsWith('/brand/'));

  const imagePending = brew.image_url && brew.moderation_status === 'pending';

  return (
    <div className="max-w-7xl mx-auto">
      {/* ──── MOBILE: stacked layout ──── */}
      <div className="lg:hidden">
        {/* Full-width image */}
        <div className="relative w-full aspect-square bg-zinc-950">
          {imageVisible ? (
            <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover" />
          ) : imagePending ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 to-zinc-950">
              <span className="text-5xl">⏳</span>
              <p className="text-yellow-500 font-bold uppercase tracking-wider text-xs">Wird geprüft</p>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center">
              <span className="text-8xl opacity-10">🍺</span>
            </div>
          )}
          {/* Bottom gradient for readability */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
        </div>

        {/* Meta below image */}
        <div className="px-4 pt-5 pb-2 space-y-3">
          <HeroBadges brew={brew} brewTypeLabel={brewTypeLabel} />
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight">{brew.name}</h1>
          <HeroStats avgRating={avgRating} ratingsCount={ratingsCount} brew={brew} brewId={brew.id} likesCount={likesCount} userHasLiked={userHasLiked} />
          <HeroActionBar
            brew={brew}
            handleShare={handleShare}
            handleRemix={handleRemix}
            handleSaveToTeam={handleSaveToTeam}
            remixLoading={remixLoading}
            saveLoading={saveLoading}
            isSaved={isSaved}
            canSave={canSave}
            copied={copied}
          />
          {profile?.display_name && <BreweryLink profile={profile} />}
        </div>
      </div>

      {/* ──── DESKTOP: side-by-side ──── */}
      <div className="hidden lg:flex gap-10 px-6 py-10 items-start">
        {/* Image — fixed square */}
        <div className="relative shrink-0 w-72 xl:w-80 aspect-square rounded-2xl overflow-hidden shadow-2xl bg-zinc-950">
          {imageVisible ? (
            <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover" />
          ) : imagePending ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 to-zinc-950">
              <span className="text-5xl">⏳</span>
              <p className="text-yellow-500 font-bold uppercase tracking-wider text-xs">Wird geprüft</p>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center">
              <span className="text-8xl opacity-10">🍺</span>
            </div>
          )}
        </div>

        {/* Content right */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-4">
          <HeroBadges brew={brew} brewTypeLabel={brewTypeLabel} />
          <h1 className="text-5xl xl:text-6xl font-black text-white leading-none tracking-tight">{brew.name}</h1>
          {profile?.display_name && <BreweryLink profile={profile} />}
          <HeroStats avgRating={avgRating} ratingsCount={ratingsCount} brew={brew} brewId={brew.id} likesCount={likesCount} userHasLiked={userHasLiked} />
          <HeroActionBar
            brew={brew}
            handleShare={handleShare}
            handleRemix={handleRemix}
            handleSaveToTeam={handleSaveToTeam}
            remixLoading={remixLoading}
            saveLoading={saveLoading}
            isSaved={isSaved}
            canSave={canSave}
            copied={copied}
          />
          {/* Remix origin */}
          {parent && <RemixBadge parent={parent} />}
        </div>
      </div>

      {/* Mobile: remix origin below actionbar */}
      {parent && (
        <div className="lg:hidden px-4 pb-4">
          <RemixBadge parent={parent} />
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function HeroBadges({ brew, brewTypeLabel }: { brew: any; brewTypeLabel: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-900">
        {brewTypeLabel}
      </span>
      {brew.remix_parent_id && (
        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 px-2.5 py-1 rounded-lg bg-purple-950/30 border border-purple-900/30">
          Remix
        </span>
      )}
      {brew.style && (
        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 px-2.5 py-1 rounded-lg bg-cyan-950/20">
          {brew.style}
        </span>
      )}
      <span className="ml-auto text-[10px] text-zinc-600 shrink-0">
        {new Date(brew.created_at).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' })}
      </span>
      <ReportButton targetId={brew.id} targetType="brew" />
    </div>
  );
}

function HeroStats({ avgRating, ratingsCount, brew, brewId, likesCount, userHasLiked }: {
  avgRating: string | null;
  ratingsCount: number;
  brew: any;
  brewId: string;
  likesCount: number;
  userHasLiked: boolean;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {avgRating ? (
        <>
          <div className="flex items-center gap-1.5">
            <Star className="text-amber-400 fill-amber-400 shrink-0" size={16} />
            <span className="font-black text-white text-lg tabular-nums leading-none">{avgRating}</span>
            <span className="text-zinc-600 text-sm">({ratingsCount})</span>
          </div>
          <span className="text-zinc-800" aria-hidden>·</span>
        </>
      ) : null}

      <LikeButton
        brewId={brewId}
        initialCount={likesCount}
        initialIsLiked={userHasLiked}
      />

      {(brew.times_brewed ?? 0) > 0 && (
        <>
          <span className="text-zinc-800" aria-hidden>·</span>
          <span className="text-sm text-zinc-400">
            <span className="font-bold text-white tabular-nums">{brew.times_brewed}×</span> gebraut
          </span>
        </>
      )}

      {(brew.view_count ?? 0) > 0 && (
        <>
          <span className="text-zinc-800" aria-hidden>·</span>
          <span className="text-zinc-600 text-sm tabular-nums">{brew.view_count} Aufrufe</span>
        </>
      )}
    </div>
  );
}

function HeroActionBar({
  brew,
  handleShare,
  handleRemix,
  handleSaveToTeam,
  remixLoading,
  saveLoading,
  isSaved,
  canSave,
  copied,
}: {
  brew: any;
  handleShare: () => void;
  handleRemix: () => void;
  handleSaveToTeam: () => void;
  remixLoading: boolean;
  saveLoading: boolean;
  isSaved: boolean;
  canSave: boolean;
  copied: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-1 w-full pt-2 lg:max-w-xs">
      <BrewActionButton
        icon={Shuffle}
        label="Remix"
        onClick={handleRemix}
        loading={remixLoading}
        accent
        title="Dieses Rezept remixen"
      />
      <BrewActionButton
        icon={isSaved ? CheckCircle2 : Library}
        label={isSaved ? 'Gespeichert' : 'Speichern'}
        onClick={canSave ? handleSaveToTeam : undefined}
        loading={saveLoading}
        active={isSaved}
        activeColor="text-emerald-400"
        disabled={!canSave && !isSaved}
        title={
          isSaved ? 'Bereits in der Bibliothek' :
          canSave ? 'Zur Team-Bibliothek hinzufügen' :
          'Du musst Mitglied einer Brauerei sein'
        }
      />
      <BrewActionButton
        icon={Share2}
        label={copied ? 'Kopiert!' : 'Teilen'}
        onClick={handleShare}
        active={copied}
        activeColor="text-cyan-400"
        title="Rezept teilen"
      />
      <BrewActionButton
        icon={MessageCircle}
        label="Forum"
        onClick={undefined}
        href={`/forum/create?categorySlug=rezepte&brewId=${brew.id}&title=${encodeURIComponent('Diskussion: ' + brew.name)}`}
        title="Im Forum diskutieren"
      />
    </div>
  );
}

function BreweryLink({ profile }: { profile: any }) {
  return (
    <Link
      href={`/brewery/${profile.id}`}
      className="inline-flex items-center gap-2.5 group w-fit"
    >
      <div className="w-7 h-7 rounded-full border border-zinc-800 overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center group-hover:border-cyan-700 transition-colors">
        {profile.logo_url ? (
          <img src={profile.logo_url} alt={profile.display_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm">🏭</span>
        )}
      </div>
      <span className="text-sm font-semibold text-zinc-400 group-hover:text-cyan-400 transition-colors">
        {profile.display_name}
      </span>
      {profile.bio && (
        <span className="text-xs text-zinc-600 truncate max-w-[180px] hidden sm:block">
          {profile.bio}
        </span>
      )}
    </Link>
  );
}

function RemixBadge({ parent }: { parent: any }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-purple-950/20 border border-purple-900/20">
      <span className="text-lg shrink-0">♻️</span>
      <p className="text-sm text-zinc-400">
        Basiert auf{' '}
        <Link href={`/brew/${parent.id}`} className="text-purple-400 hover:text-purple-300 transition underline decoration-purple-400/30">
          {parent.name}
        </Link>
        {parent.profiles?.display_name && (
          <> von{' '}
            <Link href={`/brewer/${parent.user_id}`} className="text-zinc-300 hover:underline">
              {parent.profiles.display_name}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
