'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Star, Shuffle, Library, Share2, Heart, CheckCircle2, MessageCircle, Download, FileCode, FileJson, FileText } from 'lucide-react';
import BrewActionButton from './BrewActionButton';
import LikeButton from '@/app/components/LikeButton';
import ReportButton from '@/app/components/reporting/ReportButton';
import { exportBrew } from '@/lib/recipe-export';
import { exportBrewPDF } from '@/lib/brew-pdf';

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
        <div className="relative w-full aspect-square bg-background">
          {imageVisible ? (
            <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover" />
          ) : imagePending ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-surface to-background">
              <span className="text-5xl">⏳</span>
              <p className="text-warning font-bold uppercase tracking-wider text-xs">Wird geprüft</p>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-surface to-background flex items-center justify-center">
              <span className="text-8xl opacity-10">🍺</span>
            </div>
          )}
          {/* Bottom gradient for readability */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Meta below image */}
        <div className="px-4 pt-5 pb-2 space-y-3">
          <HeroBadges brew={brew} brewTypeLabel={brewTypeLabel} />
          <h1 className="text-3xl font-black text-text-primary leading-tight tracking-tight">{brew.name}</h1>
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
        <div className="group/hero relative shrink-0 w-72 xl:w-80 aspect-square rounded-2xl overflow-hidden shadow-2xl bg-background">
          {imageVisible ? (
            <img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/hero:scale-105" />
          ) : imagePending ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-surface to-background">
              <span className="text-5xl">⏳</span>
              <p className="text-warning font-bold uppercase tracking-wider text-xs">Wird geprüft</p>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-surface to-background flex items-center justify-center">
              <span className="text-8xl opacity-10">🍺</span>
            </div>
          )}
        </div>

        {/* Content right */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-4">
          <HeroBadges brew={brew} brewTypeLabel={brewTypeLabel} />
          <h1 className="text-5xl xl:text-6xl font-black text-text-primary leading-none tracking-tight">{brew.name}</h1>
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
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-2.5 py-1 rounded-full bg-surface">
        {brewTypeLabel}
      </span>
      {brew.remix_parent_id && (
        <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/30">
          Remix
        </span>
      )}
      {brew.style && (
        <span className="text-[10px] font-black tracking-normal text-brand px-2.5 py-1 rounded-full bg-brand-bg">
          {brew.style.toUpperCase()}
        </span>
      )}
      <span className="ml-auto text-[10px] text-text-disabled shrink-0">
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
            <Star className="text-rating fill-rating shrink-0" size={16} />
            <span className="font-black text-text-primary text-lg tabular-nums leading-none">{avgRating}</span>
            <span className="text-text-disabled text-sm">({ratingsCount})</span>
          </div>
          <span className="text-border" aria-hidden>·</span>
        </>
      ) : null}

      <LikeButton
        brewId={brewId}
        initialCount={likesCount}
        initialIsLiked={userHasLiked}
      />

      {(brew.times_brewed ?? 0) > 0 && (
        <>
          <span className="text-border" aria-hidden>·</span>
          <span className="text-sm text-text-secondary">
            <span className="font-bold text-text-primary tabular-nums">{brew.times_brewed}×</span> gebraut
          </span>
        </>
      )}

      {(brew.view_count ?? 0) > 0 && (
        <>
          <span className="text-border" aria-hidden>·</span>
          <span className="text-text-disabled text-sm tabular-nums">{brew.view_count} Aufrufe</span>
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
    <div className="grid grid-cols-5 gap-1 w-full pt-2 lg:max-w-sm">
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
        activeColor="text-emerald-600 dark:text-emerald-400"
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
        activeColor="text-brand"
        title="Rezept teilen"
      />
      <BrewActionButton
        icon={MessageCircle}
        label="Forum"
        onClick={undefined}
        href={`/forum/create?categorySlug=rezepte&brewId=${brew.id}&title=${encodeURIComponent('Diskussion: ' + brew.name)}`}
        title="Im Forum diskutieren"
      />
      <ExportDropdown brew={brew} />
    </div>
  );
}

function ExportDropdown({ brew }: { brew: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative flex flex-col items-center">
      <button
        onClick={() => setOpen(v => !v)}
        title="Rezept exportieren"
        className={[
          'flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl transition-all group w-full',
          open
            ? 'bg-surface/60 text-text-primary'
            : 'bg-surface/0 text-text-secondary hover:text-text-primary hover:bg-surface/60',
        ].join(' ')}
      >
        <div className="w-9 h-9 flex items-center justify-center">
          <Download size={20} className="transition-transform group-hover:scale-110" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider leading-none text-text-muted group-hover:text-text-secondary">
          Export
        </span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-[60] w-48 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => { exportBrew(brew, 'beerxml'); setOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors group/item"
          >
            <FileCode size={16} className="shrink-0 text-brand" />
            <div className="text-left">
              <p className="font-semibold leading-none text-text-primary">BeerXML</p>
              <p className="text-[10px] text-text-muted mt-0.5">BeerSmith, Craftbeerpi</p>
            </div>
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={() => { exportBrew(brew, 'beerjson'); setOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors group/item"
          >
            <FileJson size={16} className="shrink-0 text-brand" />
            <div className="text-left">
              <p className="font-semibold leading-none text-text-primary">BeerJSON</p>
              <p className="text-[10px] text-text-muted mt-0.5">Brewfather, BrewTracker</p>
            </div>
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={() => { exportBrewPDF(brew); setOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors group/item"
          >
            <FileText size={16} className="shrink-0 text-brand" />
            <div className="text-left">
              <p className="font-semibold leading-none text-text-primary">PDF</p>
              <p className="text-[10px] text-text-muted mt-0.5">Drucken, Archivieren</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function BreweryLink({ profile }: { profile: any }) {
  return (
    <Link
      href={`/brewery/${profile.id}`}
      className="inline-flex items-center gap-2.5 group w-fit"
    >
      <div className="w-7 h-7 rounded-full border border-border overflow-hidden shrink-0 bg-surface-hover flex items-center justify-center group-hover:border-brand transition-colors">
        {profile.logo_url ? (
          <img src={profile.logo_url} alt={profile.display_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm">🏭</span>
        )}
      </div>
      <span className="text-sm font-semibold text-text-secondary group-hover:text-brand transition-colors">
        {profile.display_name}
      </span>
      {profile.bio && (
        <span className="text-xs text-text-disabled truncate max-w-[180px] hidden sm:block">
          {profile.bio}
        </span>
      )}
    </Link>
  );
}

function RemixBadge({ parent }: { parent: any }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/20">
      <span className="text-lg shrink-0">♻️</span>
      <p className="text-sm text-text-secondary">
        Basiert auf{' '}
        <Link href={`/brew/${parent.id}`} className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition underline decoration-purple-300/30 dark:decoration-purple-400/30">
          {parent.name}
        </Link>
        {parent.profiles?.display_name && (
          <> von{' '}
            <Link href={`/brewer/${parent.user_id}`} className="text-text-secondary hover:underline">
              {parent.profiles.display_name}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
