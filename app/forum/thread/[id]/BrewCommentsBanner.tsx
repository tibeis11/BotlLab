import Link from 'next/link';
import { FlaskConical, ArrowRight } from 'lucide-react';

interface BrewCommentsBannerProps {
  brew: {
    id: string;
    name?: string | null;
    image_url?: string | null;
  } | null;
}

/**
 * Shown at the top of a forum thread with thread_type='brew_comments' to
 * indicate this is the comment section for a specific brew and provide a
 * direct link back to the brew detail page.
 */
export default function BrewCommentsBanner({ brew }: BrewCommentsBannerProps) {
  if (!brew) return null;

  return (
    <div className="bg-cyan-950/30 border-b border-cyan-900/40 px-6 md:px-12 lg:px-16 py-3 max-w-screen-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-cyan-900/50 border border-cyan-700/40 flex items-center justify-center shrink-0">
          <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <p className="text-xs text-cyan-300/80">
          Dies ist der Kommentar-Thread für das Rezept{' '}
          <span className="font-bold text-cyan-200">{brew.name ?? brew.id}</span>.
        </p>
        <Link
          href={`/brew/${brew.id}?tab=kommentare`}
          className="ml-auto shrink-0 flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition"
        >
          Zum Rezept <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
