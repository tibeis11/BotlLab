// ZWEI WELTEN Phase 1.6a (updated): Mode-aware account layout
// Server Component: reads app_mode → renders AdminHeader for brewers, ConsumerHeader for drinkers.
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-server';
import AdminHeader from '@/app/dashboard/components/AdminHeader';
import ConsumerHeader from '@/app/my-cellar/components/ConsumerHeader';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	let appMode: 'brewer' | 'drinker' = 'drinker';
	if (user) {
		const { data } = await supabase
			.from('profiles')
			.select('app_mode')
			.eq('id', user.id)
			.single();
		if (data?.app_mode) appMode = data.app_mode as 'brewer' | 'drinker';
	}

	return (
		<div className="min-h-screen bg-background text-text-primary flex flex-col">
			<Suspense fallback={<div className="h-14 bg-background border-b border-border" />}>
				{appMode === 'brewer' ? <AdminHeader /> : <ConsumerHeader />}
			</Suspense>
			<main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
				{children}
			</main>
		</div>
	);
}
