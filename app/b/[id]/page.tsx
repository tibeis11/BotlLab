import { createClient } from '@/lib/supabase-server';
import ClientScanPage from './ClientScanPage';
import { BottleWithBrew } from './types';

export const dynamic = 'force-dynamic';

export default async function PublicPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id: rawId } = await params;
  
  const dotIndex = rawId?.indexOf('.') ?? -1;
  const idStr = dotIndex > 0 ? rawId.substring(0, dotIndex) : rawId;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr);

  let initialData: BottleWithBrew | null = null;
  let errorMsg: string | null = null;

  try {
    let bottleQuery = supabase
      .from('bottles')
      .select('id, bottle_number, brew_id, session_id, filled_at');

    if (isUUID) {
      bottleQuery = bottleQuery.eq('id', idStr);
    } else {
      bottleQuery = bottleQuery.eq('short_code', idStr);
    }

    const { data: bottle, error: bottleError } = await bottleQuery.maybeSingle();

    if (bottleError) throw bottleError;
    
    if (bottle && bottle.brew_id) {
      const [sessionResult, brewResult] = await Promise.all([
        bottle.session_id
          ? supabase.from('brewing_sessions').select('*').eq('id', bottle.session_id).single()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('brews').select('*').eq('id', bottle.brew_id).single(),
      ]);

      initialData = {
        ...(bottle as any),
        brews: brewResult.data || null,
        session: sessionResult.data || null,
      };
    } else if (bottle) {
       initialData = { ...bottle, brews: null, session: null } as any;
    }
  } catch (err: any) {
    console.error('[b/[id]/page.tsx server] Error pre-fetching:', err);
    errorMsg = err.message || 'Ladefehler';
  }

  return <ClientScanPage initialData={initialData} initialError={errorMsg} />;
}
