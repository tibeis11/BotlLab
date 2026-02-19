'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: (redirectPath?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
             // Handle "Refresh Token Not Found" or similar errors.
             // Warning: Do NOT immediately signOut() here as it might be a race condition 
             // with another tab that just refreshed the token.
             if (error.message.includes('Refresh Token') || error.message.includes('refresh_token')) {
                 console.warn("Session error (potential tab race condition):", error.message);
                 // We just clear local state. If the session is truly dead, onAuthStateChange 
                 // will eventually catch a SIGNED_OUT event or subsequent requests will fail.
                 if (mounted) {
                    setSession(null);
                    setUser(null);
                 }
                 return;
             }
             // For other errors, just log (and no session)
             console.error("Error fetching session:", error);
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Optional: Force Refresh on critical events
        if (_event === 'SIGNED_OUT') {
           setUser(null);
           setSession(null);
           // router.refresh(); // Removed: Causes freezing when refreshing protected routes cross-tab
           // Components should react to user=null and redirect themselves
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const signOut = async (redirectPath = '/login') => {
    try {
      // 1. First try client-side sign out
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Client signOut error:", error);
    } catch (e) {
      console.error("SignOut Exception:", e);
    } finally {
      // 2. Clear local state
      setUser(null);
      setSession(null);
      
      // 3. Call server-side logout to ensure cookies are cleared locally
      // We use a POST request to our new route handler
      try {
        await fetch('/auth/signout', { method: 'POST' });
      } catch (e) {
        // Ignore errors here
      }

      // 4. Force a hard redirect to login (or specified path) to clear any remaining memory state
      window.location.href = redirectPath;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
