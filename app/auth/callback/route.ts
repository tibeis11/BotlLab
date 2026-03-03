import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type'); // 'recovery' | 'signup' | 'email_change' | ...

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Password reset flow → send to the new-password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/auth/reset-password', request.url));
      }

      const callbackUrl = searchParams.get('callbackUrl');
      const intent = searchParams.get('intent');
      const userId = sessionData.session?.user?.id;

      // Phase 8.2: intent=drink oder callbackUrl auf /b/-Seite → app_mode auf 'drinker' setzen
      // (nur wenn User kein Brauer ist — Brauer behalten immer ihren Modus)
      const isBottleScanContext =
        intent === 'drink' ||
        (callbackUrl && decodeURIComponent(callbackUrl).startsWith('/b/'));
      if (isBottleScanContext && userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('app_mode')
          .eq('id', userId)
          .single();
        if (profile?.app_mode !== 'brewer') {
          await supabase.from('profiles').update({ app_mode: 'drinker' }).eq('id', userId);
        }
      }

      // ZWEI WELTEN: callbackUrl aus Query-Param (von Signup durchgereicht)
      if (callbackUrl) {
        return NextResponse.redirect(new URL(decodeURIComponent(callbackUrl), request.url));
      }

      // Kein Callback: Mode-basierter Redirect
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('app_mode')
          .eq('id', userId)
          .single();

        const target = profile?.app_mode === 'brewer' ? '/dashboard' : '/my-cellar';
        return NextResponse.redirect(new URL(target, request.url));
      }

      // Fallback: dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Error or no code → back to login
  return NextResponse.redirect(new URL('/login', request.url));
}
