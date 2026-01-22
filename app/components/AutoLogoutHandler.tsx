'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

// KONFIGURATION: Inaktivitäts-Limit in Millisekunden
// 30 Minuten = 30 * 60 * 1000
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; 

export default function AutoLogoutHandler() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Wenn kein User eingeloggt ist, müssen wir nichts überwachen
    if (!user) return;

    // Funktion zum Resetten des Timers
    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Neuer Timer: Wenn er abläuft, ausloggen
      timerRef.current = setTimeout(async () => {
        console.log("[AutoLogout] User inactive for too long. Logging out...");
        await signOut();
        // Redirect mit Grund (optional für UI-Anzeige)
        router.push('/login?reason=timeout');
      }, INACTIVITY_TIMEOUT);
    };

    // Events, die als "Aktivität" zählen
    // 'mousemove' habe ich aus Performance-Gründen weggelassen (feuert zu oft),
    // 'click' und 'scroll' reichen meistens aus.
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Initialer Start des Timers
    resetTimer();

    // Event Listener registrieren
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup beim Unmount (oder Logout)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, signOut, router]);

  // Diese Komponente rendert nichts Visuelles
  return null;
}
