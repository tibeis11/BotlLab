import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ breweryId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { breweryId } = await params;

  const { data, error } = await supabase
    .from('label_templates')
    .select('*')
    .eq('brewery_id', breweryId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ templates: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ breweryId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { breweryId } = await params;
  const body = await req.json();

  // Minimal server-side validation
  if (!body?.name || !body?.config) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const insertPayload = {
    brewery_id: breweryId,
    name: body.name,
    description: body.description || null,
    format_id: body.formatId || body.format_id || 'custom',
    config: body.config,
    is_default: body.is_default || false,
  };

  const { data, error } = await supabase.from('label_templates').insert(insertPayload).select().single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ template: data }, { status: 201 });
}
