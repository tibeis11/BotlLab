// ZWEI WELTEN Phase 1.6a: Mode-neutral account layout
// No AdminHeader or ConsumerHeader — account settings are accessible for both modes.
// Auth guard is handled inside page.tsx (client-side redirect to /login).

export default function AccountLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-zinc-950 text-white flex flex-col">
			<main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
				{children}
			</main>
		</div>
	);
}
