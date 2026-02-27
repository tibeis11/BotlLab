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
  activeColor = 'text-cyan-400',
  disabled = false,
  loading = false,
  title,
  className = '',
}: BrewActionButtonProps) {
  const sharedClass = [
    'flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-xl transition-all group w-full',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    accent
      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-cyan-500/20 lg:bg-none lg:bg-transparent lg:text-cyan-400 lg:border lg:border-cyan-500/40 lg:hover:bg-cyan-950/40 lg:shadow-none'
      : active
        ? `bg-zinc-900/60 ${activeColor}`
        : 'bg-zinc-900/0 text-zinc-400 hover:text-white hover:bg-zinc-900/60',
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
        accent ? 'text-white lg:text-cyan-400' : active ? activeColor : 'text-zinc-500 group-hover:text-zinc-300',
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
