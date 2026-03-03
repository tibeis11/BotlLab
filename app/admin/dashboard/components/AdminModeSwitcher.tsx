import { useState } from 'react';

export default function AdminModeSwitcher() {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const modes = [
    { key: 'drinker', label: '🍺 Drinker', color: 'bg-amber-700 hover:bg-amber-500' },
    { key: 'brewer', label: '🧪 Brewer', color: 'bg-cyan-700 hover:bg-cyan-500' },
  ];

  async function handleSwitchMode(mode: string) {
    if (!userEmail) {
      setError('Bitte eine User-E-Mail eingeben.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/update-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Wechseln des Modus.');
      } else {
        setSuccess(`Modus erfolgreich auf "${mode}" geändert!`);
      }
    } catch (e: any) {
      setError(e.message || 'Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-xl">
      <h3 className="text-lg font-bold text-white mb-1">Admin: App-Modus wechseln</h3>
      <p className="text-xs text-zinc-500 mb-4">
        Wechselt den Modus eines Users zwischen <strong className="text-amber-400">Drinker</strong> (Consumer) und <strong className="text-cyan-400">Brewer</strong>.
      </p>
      <div className="flex gap-2 mb-4">
        <input
          type="email"
          placeholder="User-E-Mail eingeben..."
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          className="flex-1 px-3 py-2 rounded bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-zinc-500"
        />
      </div>
      <div className="flex flex-wrap gap-3 mb-2">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => handleSwitchMode(m.key)}
            className={`${m.color} text-white font-bold py-2 px-5 rounded disabled:opacity-50 transition`}
            disabled={loading}
          >
            {m.label}
          </button>
        ))}
      </div>
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      {success && <div className="text-emerald-400 text-sm mt-2">{success}</div>}
    </div>
  );
}
