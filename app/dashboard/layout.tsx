// ZWEI WELTEN Phase 1.6b: Server Component with mode guard
// Consumer (app_mode='drinker') → redirect to /my-cellar
// Brewer (app_mode='brewer') → render dashboard normally
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminHeader from './components/AdminHeader';
import { AchievementNotificationProvider } from '../context/AchievementNotificationContext';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		redirect('/login?callbackUrl=/dashboard');
	}

	// Mode-Check: Consumer gehören nicht ins Dashboard  
	const { data: profile } = await supabase
		.from('profiles')
		.select('app_mode')
		.eq('id', user.id)
		.single();

	if (profile?.app_mode === 'drinker') {
		redirect('/my-cellar');
	}

	return (
		<AchievementNotificationProvider>
			<div className="min-h-screen bg-zinc-950 text-white flex flex-col">
				<Suspense fallback={<div className="h-16 bg-zinc-950 border-b border-zinc-900" />}>
					<AdminHeader />
				</Suspense>
				<main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
					{children}
				</main>
			</div>
		</AchievementNotificationProvider>
	);
}
