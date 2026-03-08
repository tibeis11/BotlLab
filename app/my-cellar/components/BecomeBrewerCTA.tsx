import Link from 'next/link';
import { Beaker, ArrowRight, Rocket, Star } from 'lucide-react';

type Variant = 'banner' | 'inline' | 'card';

interface BecomeBrewerCTAProps {
  variant?: Variant;
  className?: string;
}

export default function BecomeBrewerCTA({ variant = 'banner', className = '' }: BecomeBrewerCTAProps) {
  if (variant === 'inline') {
    return (
      <Link
        href="/team/create"
        className={`inline-flex items-center gap-1.5 text-brand hover:text-brand-hover text-sm font-medium transition-colors group ${className}`}
      >
        <Beaker className="w-4 h-4" />
        Brauer werden
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    );
  }

  if (variant === 'card') {
    return (
      <Link
        href="/team/create"
        className={`block p-5 rounded-2xl bg-brand-bg border border-brand/30 hover:border-brand/60 transition group ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-bg border border-brand/30 flex items-center justify-center flex-shrink-0 group-hover:opacity-80 transition">
            <Beaker className="w-5 h-5 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-text-primary text-sm mb-1">Brauer werden</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Gründe deine eigene Brauerei-Seite, veröffentliche Rezepte und bau deine Community auf.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-brand flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    );
  }

  // banner (default)
  return (
    <div className={`w-full rounded-2xl overflow-hidden bg-surface border border-border ${className}`}>
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-6">
        {/* Icon + Text */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-brand-bg border border-brand/30 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-6 h-6 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-text-primary text-base sm:text-lg leading-tight">
              Vom Genießer zum Macher
            </p>
            <p className="text-sm text-text-muted mt-0.5 leading-snug">
              Gründe deine Brauerei, publiziere Rezepte und baue deine Craft-Beer-Community auf.
            </p>
            {/* Social proof */}
            <div className="flex items-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs text-text-disabled ml-1">Kostenlos starten</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/team/create"
          className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm transition-colors group whitespace-nowrap"
        >
          Jetzt gründen
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
