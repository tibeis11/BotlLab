'use client';
import { useState } from 'react';

const modes = [
  { key: 'drinker', label: 'Drinker' },
  { key: 'brewer', label: 'Brewer' },
];

export default function AdminModeSwitcher() {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSwitchMode(mode: string) {
    if (!userEmail) { setError('E-Mail eingeben.'); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch('/api/admin/update-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, mode }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Fehler beim Wechseln.');
      else setSuccess(`Modus geändert: ${mode}`);
    } catch (e: any) {
      setError(e.message || 'Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl p-4">
      <h3 className="text-sm font-bold text-(--text-primary) mb-1">App-Modus wechseln</h3>
      <p className="text-xs text-(--text-muted) mb-3">
        Wechselt zwischen{' '}
        <span className="text-(--text-secondary) font-medium">Drinker</span> (Consumer) und{' '}
        <span className="text-(--text-secondary) font-medium">Brewer</span>.
      </p>
      <input
        type="email"
        placeholder="User-E-Mail..."
        value={userEmail}
        onChange={e => setUserEmail(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-(--surface-sunken) text-(--text-primary) placeholder:text-(--text-disabled) border border-(--border) focus:outline-none focus:border-(--border-active) mb-3"
      />
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => handleSwitchMode(m.key)}
            disabled={loading}
            className="text-xs font-bold py-1.5 px-3 rounded-lg bg-(--surface-hover) hover:bg-(--border-hover) text-(--text-primary) border border-(--border) disabled:opacity-40 transition"
          >
            {m.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {success && <p className="text-green-400 text-xs mt-2">{success}</p>}
    </div>
  );
}
