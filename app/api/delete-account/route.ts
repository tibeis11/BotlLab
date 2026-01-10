import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase env vars missing' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Load profile for asset URLs
    const { data: profile } = await admin.from('profiles').select('logo_url,banner_url').eq('id', userId).single();

    // Delete bottles owned by user
    await admin.from('bottles').delete().eq('user_id', userId);

    // Collect brews to clean labels
    const { data: brews } = await admin.from('brews').select('id,image_url').eq('user_id', userId);

    // Delete label images from storage bucket
    if (brews && brews.length > 0) {
      const toRemove: string[] = [];
      for (const b of brews) {
        if (b.image_url) {
          const name = (b.image_url as string).split('/').pop();
          if (name) toRemove.push(name);
        }
      }
      if (toRemove.length > 0) {
        await admin.storage.from('labels').remove(toRemove.map((n) => n));
      }
    }

    // Delete brews
    await admin.from('brews').delete().eq('user_id', userId);

    // Delete brewery-assets (logo/banner)
    if (profile) {
      const assetNames: string[] = [];
      for (const url of [profile.logo_url, profile.banner_url]) {
        if (url) {
          const name = (url as string).split('/').pop();
          if (name) assetNames.push(name);
        }
      }
      if (assetNames.length > 0) {
        await admin.storage.from('brewery-assets').remove(assetNames);
      }
    }

    // Delete profile row
    await admin.from('profiles').delete().eq('id', userId);

    // Finally, delete auth user
    await admin.auth.admin.deleteUser(userId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 });
  }
}
