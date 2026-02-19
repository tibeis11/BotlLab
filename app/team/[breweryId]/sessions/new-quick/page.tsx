import { redirect } from "next/navigation";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import QuickSessionForm from "./QuickSessionForm";
import { Zap } from "lucide-react";

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
  params: Promise<{ breweryId: string }>;
}

export default async function NewQuickSessionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { breweryId } = resolvedParams;

  const supabase = await getSupabaseServer();
  
  // Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch User's Brews (for Recipe Selection)
  const { data: ownBrews, error: ownError } = await supabase
    .from("brews")
    .select("id, name, style, data")
    .eq("brewery_id", breweryId)
    .order("created_at", { ascending: false });

  // Fetch Saved Brews from Library
  const { data: savedData, error: savedError } = await supabase
    .from('brewery_saved_brews')
    .select(`
        brew_id,
        brews!inner (id, name, style, data)
    `)
    .eq('brewery_id', breweryId);

  
  const savedBrews = (savedData?.map((item: any) => item.brews) || []).map((b: any) => ({ ...b, sourceGroup: 'saved' }));
  const ownBrewsList = (ownBrews || []).map((b: any) => ({ ...b, sourceGroup: 'own' }));

  // Combine and deduplicate
  const ownIds = new Set(ownBrewsList.map((b: any) => b.id));
  const uniqueSavedBrews = savedBrews.filter((b: any) => !ownIds.has(b.id));

  const allBrews = [...ownBrewsList, ...uniqueSavedBrews];

  if ((ownError && savedError) || allBrews.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
            <Zap className="text-amber-500 w-8 h-8 fill-amber-500" /> Quick Session
        </h1>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">
          {ownError ? "Fehler beim Laden der Rezepte." : "Keine Rezepte gefunden. Bitte erstelle zuerst ein Rezept."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <Zap className="text-amber-500 w-8 h-8 fill-amber-500" />
        Quick Session
      </h1>
      <p className="text-zinc-400 mb-8">
        Erstelle eine Session ohne Brauprotokoll, direkt für die Flaschenverfolgung.
      </p>

      <QuickSessionForm breweryId={breweryId} brews={allBrews} />
    </div>
  );
}
