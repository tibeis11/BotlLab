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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Password reset flow → send to the new-password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/auth/reset-password', request.url));
      }
      // All other confirmations (signup, email change, …) → dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Error or no code → back to login
  return NextResponse.redirect(new URL('/login', request.url));
}
