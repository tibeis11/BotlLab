'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface BrewActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  accent?: boolean;        // cyan gradient (primary action)
  active?: boolean;        // active/toggled state (e.g. liked)
  activeColor?: string;    // e.g. 'text-red-400' for like
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  className?: string;
}

export default function BrewActionButton({
  icon: Icon,
  label,
  onClick,
  href,
  accent = false,
  active = false,
  activeColor = 'text-brand',
  disabled = false,
  loading = false,
  title,
  className = '',
}: BrewActionButtonProps) {
  const sharedClass = [
    'flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl transition-all group w-full',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    accent
      ? 'bg-gradient-to-br from-brand to-blue-600 text-white hover:opacity-90 shadow-lg shadow-brand/20 lg:bg-none lg:bg-transparent lg:text-brand lg:border lg:border-brand/40 lg:hover:bg-brand-bg lg:shadow-none'
      : active
        ? `bg-surface/60 ${activeColor}`
        : 'bg-surface/0 text-text-secondary hover:text-text-primary hover:bg-surface/60',
    className,
  ].join(' ');

  const inner = (
    <>
      <div className="w-9 h-9 flex items-center justify-center">
        {loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-current" />
        ) : (
          <Icon size={20} className="transition-transform group-hover:scale-110" />
        )}
      </div>
      <span className={[
        'text-[10px] font-bold uppercase tracking-wider leading-none',
        accent ? 'text-white lg:text-brand' : active ? activeColor : 'text-text-muted group-hover:text-text-secondary',
      ].join(' ')}>
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} title={title} className={sharedClass}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={sharedClass}
    >
      {inner}
    </button>
  );
}
