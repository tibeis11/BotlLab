/**
 * ZWEI WELTEN — User Mode Types
 *
 * Zentraler Typ für die B2B/B2C-Trennung in BotlLab.
 * Wird von allen Routen und Komponenten verwendet, die mode-spezifisches
 * Verhalten implementieren.
 */

export type AppMode = 'drinker' | 'brewer';

/**
 * Minimales User-Profil mit dem neuen app_mode Feld.
 * Für die Weich-Abfrage in Login/Redirect-Logic.
 */
export interface UserModeProfile {
  id: string;
  display_name: string | null;
  app_mode: AppMode;
  active_brewery_id: string | null;
  tasting_iq: number;
  subscription_tier: 'free' | 'brewer' | 'brewery' | 'enterprise';
  subscription_status: string;
}

/**
 * Prüft ob ein User im Brauer-Modus ist.
 * Gibt true zurück wenn app_mode === 'brewer'.
 */
export function isBrewer(profile: Pick<UserModeProfile, 'app_mode'>): boolean {
  return profile.app_mode === 'brewer';
}

/**
 * Prüft ob ein User im Consumer/Trinker-Modus ist.
 */
export function isDrinker(profile: Pick<UserModeProfile, 'app_mode'>): boolean {
  return profile.app_mode === 'drinker';
}

/**
 * Gibt die korrekte Post-Login-Redirect-URL für einen User zurück.
 * - brewer → '/dashboard'
 * - drinker → '/my-cellar'
 */
export function getDefaultRedirect(appMode: AppMode): string {
  return appMode === 'brewer' ? '/dashboard' : '/my-cellar';
}

/**
 * Parst den ?intent= URL-Parameter und konvertiert ihn in einen AppMode.
 * - intent=brew  → 'brewer'
 * - intent=drink → 'drinker'
 * - undefined    → 'drinker' (Default)
 */
export function intentToAppMode(intent: string | null | undefined): AppMode {
  if (intent === 'brew') return 'brewer';
  return 'drinker'; // Default: Consumer
}
