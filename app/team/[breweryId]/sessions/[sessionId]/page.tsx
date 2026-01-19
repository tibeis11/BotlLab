import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isQuickSession } from '@/lib/types/session';
import SessionClient from './SessionClient';
import QuickSessionClient from './QuickSessionClient';

async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

interface PageProps {
  params: Promise<{ sessionId: string; breweryId: string }>;
}

export default async function SessionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { sessionId, breweryId } = resolvedParams;

  const supabase = await getSupabaseServer();

  const { data: session, error } = await supabase
    .from('brewing_sessions')
    .select(`
      *,
      brew:brews ( name, style )
    `)
    .eq('id', sessionId)
    .single() as { data: any, error: any };

  if (error || !session) {
    return <div className="text-white p-8">Session nicht gefunden.</div>;
  }

  const isQuick = isQuickSession(session);

  // Quick Session: Simplified View
  if (isQuick) {
    return <QuickSessionClient />;
  }

  // Full Session: Use existing Client Component
  return <SessionClient sessionId={sessionId} />;
}

