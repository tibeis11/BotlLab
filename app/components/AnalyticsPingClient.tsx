"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const PING_INTERVAL = 15 * 60 * 1000; // 15 minutes

export default function AnalyticsPingClient() {
  const { session } = useAuth();
  const token = session?.access_token;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const ping = async () => {
      try {
        await fetch('/api/analytics/ping', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } catch (e) {
        // Do not spam console in production
        console.debug('analytics ping failed', e);
      }
    };

    // initial ping on mount
    ping();

    // periodic pings while tab is visible
    timerRef.current = window.setInterval(() => {
      if (!document.hidden && mounted) ping();
    }, PING_INTERVAL);

    // also ping when tab becomes visible
    const onVisibility = () => {
      if (!document.hidden) ping();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token]);

  return null;
}
