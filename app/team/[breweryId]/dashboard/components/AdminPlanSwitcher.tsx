import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getBreweryTierConfig } from '@/lib/tier-system';

export default function AdminPlanSwitcher({ breweryId }: { breweryId: string }) {
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
    setLoading(true);
    setError(null);
    setSuccess(null);
    const { error } = await supabase
      .from('breweries')
      .update({ tier: plan })
      .eq('id', breweryId);
    if (error) {
      setError('Fehler beim Wechseln des Plans.');
    } else {
      setSuccess('Plan erfolgreich geändert!');
    }
    setLoading(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-8">
      <h3 className="text-lg font-bold text-white mb-2">Admin: Subscription-Plan wechseln</h3>
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
      <p className="text-xs text-zinc-400 mt-2">Nur für Admins sichtbar.</p>
    </div>
  );
}
