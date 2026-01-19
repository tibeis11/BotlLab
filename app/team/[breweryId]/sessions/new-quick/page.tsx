import { redirect } from "next/navigation";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import QuickSessionForm from "./QuickSessionForm";

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
  const { data: brews, error } = await supabase
    .from("brews")
    .select("id, name, style, data")
    .eq("brewery_id", breweryId)
    .order("created_at", { ascending: false });

  if (error || !brews || brews.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-4">⚡ Quick Session</h1>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">
          {error ? "Fehler beim Laden der Rezepte." : "Keine Rezepte gefunden. Bitte erstelle zuerst ein Rezept."}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">⚡ Quick Session</h1>
      <p className="text-zinc-400 mb-8">
        Erstelle eine Session ohne Brauprotokoll, direkt für die Flaschenverfolgung.
      </p>

      <QuickSessionForm breweryId={breweryId} brews={brews} />
    </div>
  );
}
