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
    // Load profile for asset URLs (personal data to be deleted)
    const { data: profile } = await admin.from('profiles').select('logo_url,banner_url').eq('id', userId).single();

    // ── Handle owned breweries (teams) ──────────────────────────────────────
    // Find all breweries where this user is the owner.
    const { data: ownedMemberships } = await admin
      .from('brewery_members')
      .select('brewery_id')
      .eq('user_id', userId)
      .eq('role', 'owner');

    if (ownedMemberships && ownedMemberships.length > 0) {
      for (const { brewery_id } of ownedMemberships) {
        // Get all OTHER members of this brewery
        const { data: otherMembers } = await admin
          .from('brewery_members')
          .select('user_id, role')
          .eq('brewery_id', brewery_id)
          .neq('user_id', userId)
          .order('role'); // 'admin' < 'member' < 'owner' alphabetically → prefer admin

        if (otherMembers && otherMembers.length > 0) {
          // Transfer ownership: prefer existing admin, else first member
          const nextOwner =
            otherMembers.find((m) => m.role === 'admin') || otherMembers[0];
          await admin
            .from('brewery_members')
            .update({ role: 'owner' })
            .eq('brewery_id', brewery_id)
            .eq('user_id', nextOwner.user_id);
        } else {
          // No other members → dissolve the brewery entirely.
          // brews.brewery_id and bottles.brewery_id have ON DELETE SET NULL,
          // so all associated content is preserved but freed from the team.
          await admin.from('breweries').delete().eq('id', brewery_id);
        }
      }
    }

    // Anonymize brews: set user_id to NULL so recipes remain accessible for
    // other users who based sessions/bottles on them (DSGVO Art. 6 I lit. f).
    // Label images are part of the brew content, not personal data → keep them.
    await admin.from('brews').update({ user_id: null }).eq('user_id', userId);

    // Anonymize bottles: set user_id to NULL to preserve bottle history
    // linked to shared brews and brewing sessions.
    await admin.from('bottles').update({ user_id: null }).eq('user_id', userId);

    // Delete personal profile assets (logo/banner) – these are personal data
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

    // Delete profile row (display_name, bio, location, etc.)
    // Note: brewery_members.user_id → profiles(id) ON DELETE CASCADE, so
    // all remaining memberships (non-owner) are cleaned up automatically.
    await admin.from('profiles').delete().eq('id', userId);

    // Finally, delete auth user (email + credentials)
    await admin.auth.admin.deleteUser(userId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 });
  }
}
