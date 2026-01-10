'use server';

import { checkAndGrantAchievements } from '@/lib/achievements';
import { createClient } from '@supabase/supabase-js';

/**
 * Server Action: Prüft Achievements für den aktuellen User
 */
export async function checkAchievementsAction() {
	try {
		// Supabase Client mit Service Role für server-side
		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		// User aus dem Request holen wäre besser, aber für Server Actions nutzen wir den anon key
		const anonSupabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
		);

		const { data: { user } } = await anonSupabase.auth.getUser();
		
		if (!user) {
			return { success: false, error: 'Not authenticated' };
		}

		const newAchievements = await checkAndGrantAchievements(user.id);
		
		return { 
			success: true, 
			newCount: newAchievements.length,
			newAchievements 
		};
	} catch (error: any) {
		console.error('Achievement check error:', error);
		return { success: false, error: error.message };
	}
}

/**
 * Leichtgewichtige Prüfung ohne zu viel Overhead
 * Kann nach jeder wichtigen Aktion aufgerufen werden
 */
export async function triggerAchievementCheck(userId: string) {
	// Fire and forget - nicht auf Ergebnis warten
	checkAndGrantAchievements(userId).catch(err => {
		console.error('Background achievement check failed:', err);
	});
}
