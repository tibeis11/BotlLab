// ZWEI WELTEN Phase 2 — /my-cellar/settings → /account
import { redirect } from 'next/navigation';

export default function MyCellarSettingsRedirect() {
  redirect('/account');
}
