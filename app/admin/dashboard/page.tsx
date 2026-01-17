
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/lib/supabase-server';
import DashboardClient from './components/DashboardClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Initialize Admin Client with Service Role to bypass RLS
// Ensure SUPABASE_SERVICE_ROLE_KEY is in your .env.local
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
  }
);

export default async function AdminDashboardPage() {
    // START: Security Check
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Config: Add comma separated emails in .env.local like ADMIN_EMAILS="me@example.com,you@example.com"
    const allowedEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    
    // Fallback for development if env is not set (Optional: remove in production)
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!allowedEmails.includes(user.email?.toLowerCase() || '') && !allowedEmails.includes('*')) {
        return (
             <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                <div className="max-w-md w-full bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                        🔒
                    </div>
                    <h1 className="text-2xl font-black mb-2 text-white">Zugriff verweigert</h1>
                    <p className="text-zinc-400 mb-6">
                        Dieser Bereich ist nur für Administratoren zugänglich.
                    </p>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-6">
                         <p className="text-xs uppercase text-zinc-600 font-bold tracking-wider mb-1">Angemeldet als</p>
                         <p className="font-mono text-cyan-500 text-sm">{user.email}</p>
                    </div>
                    
                    {isDev && allowedEmails.length === 0 && (
                        <div className="mb-6 text-xs text-yellow-500 bg-yellow-500/10 p-3 rounded-lg text-left">
                            <strong>Setup Info:</strong> Es ist keine <code>ADMIN_EMAILS</code> Umgebungsvariable gesetzt.
                            Füge deine E-Mail in <code>.env.local</code> hinzu.
                        </div>
                    )}

                    <a href="/dashboard" className="block w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition">
                        Zurück zum Dashboard
                    </a>
                </div>
            </div>
        );
    }
    // END: Security Check

    const { data: events, error } = await supabaseAdmin
        .from('analytics_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-red-500 p-4">
                <h1 className="text-2xl font-bold mb-4">Data Access Error</h1>
                <p className="bg-zinc-900 p-4 rounded-lg font-mono text-sm border border-red-900/50">
                    {error.message}
                </p>
                <p className="mt-4 text-zinc-500 text-sm">
                    Ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12">
            <div className="max-w-7xl mx-auto space-y-10">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900 pb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
                             <h1 className="text-3xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                                Mission Control
                             </h1>
                        </div>
                        <p className="text-zinc-500 font-medium">BotlLab Analytics & Insights</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-xs uppercase font-bold text-zinc-600 tracking-widest">Environment</p>
                            <p className="text-zinc-300 font-mono text-sm">Production</p>
                        </div>
                        <div className="h-10 w-px bg-zinc-800 hidden md:block"></div>
                        <a 
                            href="/dashboard" 
                            className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-bold border border-zinc-800 transition flex items-center gap-2 text-sm"
                        >
                            <span>⬅️</span> App
                        </a>
                    </div>
                </header>
                
                <DashboardClient events={events || []} />
            </div>
        </div>
    );
}
