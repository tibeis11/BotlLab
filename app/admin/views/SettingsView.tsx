
'use client';
import { useState } from 'react';
import { BarChart2, Layers, RefreshCw } from 'lucide-react';
import { triggerAggregation } from '@/lib/actions/analytics-admin-actions';
import AdminPlanSwitcher from '../components/AdminPlanSwitcher';
import AdminModeSwitcher from '../components/AdminModeSwitcher';

const aggregationActions = [
  { mode: 'daily' as const, label: 'Tägliche Stats', Icon: BarChart2 },
  { mode: 'features' as const, label: 'Feature-Nutzung', Icon: Layers },
] as const;

const systemStatus = [
  { label: 'Cron Jobs', value: 'Aktiv (2:00 Uhr)', ok: true },
  { label: 'Datenbank', value: 'PostgreSQL 15.1', ok: true },
];

export default function SettingsView() {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleTrigger(mode: 'daily' | 'features') {
    setLoading(mode);
    setMessage(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      await triggerAggregation(mode, today);
      setMessage(`Aggregation (${mode}) erfolgreich gestartet.`);
      setIsError(false);
    } catch (e: any) {
      setMessage(`Fehler: ${e.message}`);
      setIsError(true);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-(--text-primary)">Admin Tools</h2>
        <p className="text-(--text-muted) text-sm">Benutzer-Verwaltung & System-Steuerung</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminPlanSwitcher />
        <AdminModeSwitcher />
      </div>

      <div className="bg-(--surface) rounded-xl p-4 border border-(--border)">
        <h3 className="text-sm font-bold text-(--text-primary) mb-1">Analytics Aggregation</h3>
        <p className="text-xs text-(--text-muted) mb-3">
          Berechnung läuft normalerweise automatisch per Cron-Job (2:00 Uhr). Hier manuell anstoßen.
        </p>
        <div className="flex flex-wrap gap-2">
          {aggregationActions.map(({ mode, label, Icon }) => (
            <button
              key={mode}
              onClick={() => handleTrigger(mode)}
              disabled={loading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-(--surface-hover) hover:bg-(--border-hover) text-(--text-primary) border border-(--border) rounded-lg transition disabled:opacity-40"
            >
              {loading === mode
                ? <RefreshCw className="w-3 h-3 animate-spin" />
                : <Icon className="w-3 h-3" />}
              {label}
            </button>
          ))}
        </div>
        {message && (
          <p className={`mt-2 text-xs font-medium ${isError ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}
      </div>

      <div className="bg-(--surface-sunken) border border-(--border) rounded-xl p-4">
        <h3 className="text-sm font-bold text-(--text-primary) mb-2">System Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          {systemStatus.map(({ label, value, ok }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-(--border-subtle)">
              <span className="text-xs text-(--text-muted)">{label}</span>
              <span className={`text-xs font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
