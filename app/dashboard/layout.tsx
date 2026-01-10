import AdminHeader from './components/AdminHeader';
import { AchievementNotificationProvider } from '../context/AchievementNotificationContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<AchievementNotificationProvider>
			<div className="min-h-screen bg-zinc-950 text-white flex flex-col">
				<AdminHeader />
				<main className="flex-1 max-w-6xl mx-auto w-full p-6">
					{children}
				</main>
			</div>
		</AchievementNotificationProvider>
	);
}
