
'use client';
import { useState } from 'react';

const plans = [
  { key: 'free', label: 'Free' },
  { key: 'brewer', label: 'Brewer' },
  { key: 'brewery', label: 'Brewery' },
  { key: 'enterprise', label: 'Enterprise' },
];

export default function AdminPlanSwitcher() {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSwitchPlan(plan: string) {
    if (!userEmail) { setError('E-Mail eingeben.'); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch('/api/admin/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, plan }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Fehler beim Wechseln.');
      else setSuccess('Plan geändert.');
    } catch (e: any) {
      setError(e.message || 'Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-(--surface) border border-(--border) rounded-xl p-4">
      <h3 className="text-sm font-bold text-(--text-primary) mb-3">Subscription-Plan wechseln</h3>
      <input
        type="email"
        placeholder="User-E-Mail..."
        value={userEmail}
        onChange={e => setUserEmail(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-(--surface-sunken) text-(--text-primary) placeholder:text-(--text-disabled) border border-(--border) focus:outline-none focus:border-(--border-active) mb-3"
      />
      <div className="flex flex-wrap gap-2">
        {plans.map((plan) => (
          <button
            key={plan.key}
            onClick={() => handleSwitchPlan(plan.key)}
            disabled={loading}
            className="text-xs font-bold py-1.5 px-3 rounded-lg bg-(--surface-hover) hover:bg-(--border-hover) text-(--text-primary) border border-(--border) disabled:opacity-40 transition"
          >
            {plan.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {success && <p className="text-green-400 text-xs mt-2">{success}</p>}
    </div>
  );
}
