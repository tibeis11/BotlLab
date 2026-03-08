'use client';

import Link from 'next/link';
import Logo from './Logo';

/**
 * Einheitlicher Footer für alle öffentlich zugänglichen Seiten.
 *
 * variant="full"    – Vollständiger Footer mit Logo, Copyright und Links.
 *                    Geeignet für Landing Page, Pricing, Discover, Forum usw.
 *
 * variant="minimal" – Dezenter Footer mit Opacity-Hover-Effekt.
 *                    Geeignet für Detail-Seiten (Brew, Brewer, Brewery, Bottle).
 *
 * Die rechtlich erforderlichen Links (Impressum, Datenschutz, AGB) sind in
 * beiden Varianten enthalten (§ 5 TMG + Art. 13 DSGVO).
 */
export default function Footer({
  variant = 'full',
  className = '',
}: {
  variant?: 'full' | 'minimal';
  className?: string;
}) {
  const year = new Date().getFullYear();

  if (variant === 'minimal') {
    return (
      <footer
        className={`pt-12 pb-6 text-center opacity-40 hover:opacity-100 transition-opacity duration-500 flex flex-col items-center border-t border-border ${className}`}
      >
        <div className="mb-2">
          <Logo className="w-5 h-5" textSize="text-xs" />
        </div>
        <p className="text-[9px] text-text-disabled font-medium mt-1">Digital Brew Lab</p>
        <nav className="mt-4 flex gap-4 flex-wrap justify-center" aria-label="Footer Navigation">
          <Link
            href="/impressum"
            className="text-[10px] text-text-disabled hover:text-text-secondary hover:underline transition"
          >
            Impressum
          </Link>
          <Link
            href="/privacy"
            className="text-[10px] text-text-disabled hover:text-text-secondary hover:underline transition"
          >
            Datenschutz
          </Link>
          <Link
            href="/terms"
            className="text-[10px] text-text-disabled hover:text-text-secondary hover:underline transition"
          >
            AGB
          </Link>
        </nav>
        <p className="text-[8px] text-text-disabled/60 mt-3 font-mono">
          © {year} BotlLab
        </p>
      </footer>
    );
  }

  // variant === 'full'
  return (
    <footer
      className={`border-t border-border bg-surface py-12 px-4 ${className}`}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Left: Logo + Copyright */}
        <div className="flex flex-col items-center md:items-start gap-3">
          <div className="scale-110 origin-left">
            <Logo />
          </div>
          <p className="text-text-muted text-sm">
            © {year} BotlLab. Made with 🍺 in Germany.
          </p>
        </div>

        {/* Right: Links */}
        <nav
          className="flex flex-wrap justify-center gap-6 text-sm font-bold text-text-secondary"
          aria-label="Footer Navigation"
        >
          <Link href="/discover" className="hover:text-text-primary transition">
            Rezepte
          </Link>
          <Link href="/pricing" className="hover:text-text-primary transition">
            Pricing
          </Link>
          <Link href="/forum" className="hover:text-text-primary transition">
            Forum
          </Link>
          <span className="text-border select-none hidden md:inline">|</span>
          <Link href="/privacy" className="hover:text-text-primary transition">
            Datenschutz
          </Link>
          <Link href="/terms" className="hover:text-text-primary transition">
            AGB
          </Link>
          <Link href="/impressum" className="hover:text-text-primary transition">
            Impressum
          </Link>
        </nav>
      </div>
    </footer>
  );
}
