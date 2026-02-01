
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPlanSwitcher() {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const plans = [
    { key: 'free', label: 'Free' },
    { key: 'brewer', label: 'Brewer' },
    { key: 'brewery', label: 'Brewery' },
    { key: 'enterprise', label: 'Enterprise' },
  ];

  async function handleSwitchPlan(plan: string) {
    if (!userEmail) {
      setError('Bitte eine User-E-Mail eingeben.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, plan })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Fehler beim Wechseln des Plans.')
      } else {
        setSuccess('Plan erfolgreich geändert!')
      }
    } catch (e: any) {
      setError(e.message || 'Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-8 max-w-xl">
      <h3 className="text-lg font-bold text-white mb-2">Admin: Subscription-Plan wechseln</h3>
      <div className="flex gap-2 mb-4">
        <input
          type="email"
          placeholder="User-E-Mail eingeben..."
          value={userEmail}
          onChange={e => setUserEmail(e.target.value)}
          className="flex-1 px-3 py-2 rounded bg-zinc-800 text-white border border-zinc-700 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-3 mb-2">
        {plans.map((plan) => (
          <button
            key={plan.key}
            onClick={() => handleSwitchPlan(plan.key)}
            className="bg-cyan-700 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            disabled={loading}
          >
            {plan.label}
          </button>
        ))}
      </div>
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      {success && <div className="text-emerald-400 text-sm mt-2">{success}</div>}
      <p className="text-xs text-zinc-400 mt-2">Nur für Admins sichtbar. Bitte User-E-Mail angeben.</p>
    </div>
  );
}
