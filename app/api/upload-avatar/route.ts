import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
        return NextResponse.json({ error: 'Keine Datei übermittelt' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Datei ist zu groß (max. 5 MB)' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Ungültiges Dateiformat (JPEG, PNG, WebP oder GIF)' }, { status: 400 });
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const fileName = `${user.id}/avatar_${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Delete old pending avatar if it exists
    const { data: existing } = await (supabase
        .from('profiles')
        .select('pending_avatar_url')
        .eq('id', user.id)
        .single() as any);

    if (existing?.pending_avatar_url) {
        try {
            const url = new URL(existing.pending_avatar_url);
            const pathParts = url.pathname.split('/public/');
            if (pathParts.length > 1) {
                const fullPath = pathParts[1];
                const bucket = fullPath.split('/')[0];
                const filePath = fullPath.substring(bucket.length + 1);
                await supabase.storage.from(bucket).remove([filePath]);
            }
        } catch (_) {
            // Non-critical, continue
        }
    }

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, buffer, {
            contentType: file.type,
            upsert: true,
        });

    if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        return NextResponse.json({ error: 'Upload fehlgeschlagen' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

    const { error: dbError } = await (supabase
        .from('profiles')
        .update({ pending_avatar_url: publicUrl } as any)
        .eq('id', user.id) as any);

    if (dbError) {
        return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
    }

    return NextResponse.json({ pending_avatar_url: publicUrl });
}
