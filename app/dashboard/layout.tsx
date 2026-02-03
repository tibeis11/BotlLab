import { Suspense } from 'react';
import AdminHeader from './components/AdminHeader';
import { AchievementNotificationProvider } from '../context/AchievementNotificationContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
