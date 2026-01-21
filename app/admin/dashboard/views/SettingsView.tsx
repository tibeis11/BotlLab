'use client';

import { useState } from 'react';
import { triggerAggregation } from '@/lib/actions/analytics-admin-actions';

export default function SettingsView() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleTrigger(mode: 'daily' | 'hourly' | 'features') {
    setLoading(true);
    setMessage(null);
    try {
      const result = await triggerAggregation(mode);
      setMessage(`✅ Aggregation (${mode}) erfolgreich gestartet!`);
    } catch (e: any) {
      console.error(e);
      setMessage(`❌ Fehler: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">System Verwaltung</h2>
          <p className="text-zinc-500 text-sm">Manuelle Trigger & Konfiguration</p>
        </div>
      </div>

      {/* Analytics Data Management */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h3 className="text-lg font-bold text-white mb-4">Analytics Daten-Aggregation</h3>
        <p className="text-sm text-zinc-400 mb-6 max-w-2xl">
          Die Analyse-Daten werden normalerweise automatisch per Cron-Job (nachts) berechnet. 
          Hier können Sie die Berechnung manuell anstoßen, um das Dashboard zu aktualisieren.
        </p>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleTrigger('daily')}
            disabled={loading}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Berechne...' : '📊 Tägliche Stats neu berechnen'}
          </button>
          
          <button
            onClick={() => handleTrigger('features')}
            disabled={loading}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🧩 Feature-Nutzung berechnen
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm font-bold ${message.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {message}
          </div>
        )}
      </div>

      {/* System Status Info */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between py-2 border-b border-zinc-800">
            <span className="text-zinc-500">Cron Jobs</span>
            <span className="text-green-400">Aktiv (2:00 Uhr)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-zinc-800">
            <span className="text-zinc-500">Datenbank Version</span>
            <span className="text-white">PostgreSQL 15.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
