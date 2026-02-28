/**
 * lib/utils/country-names.ts
 *
 * ISO 3166-1 alpha-2 → full country name using i18n-iso-countries.
 * Supports German (de) and English (en).
 *
 * Compatible with Next.js (App Router) on both server and client.
 */

// We use require() so that registration happens at module load time,
// avoiding the async-import dance for a tiny JSON file.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const countries = require('i18n-iso-countries')
// eslint-disable-next-line @typescript-eslint/no-var-requires
countries.registerLocale(require('i18n-iso-countries/langs/de.json'))
// eslint-disable-next-line @typescript-eslint/no-var-requires
countries.registerLocale(require('i18n-iso-countries/langs/en.json'))

/**
 * Convert two-letter ISO country code to a localized country name.
 * Falls back to the code itself if unknown.
 *
 * @example getCountryName("DE", "de") → "Deutschland"
 * @example getCountryName("US", "en") → "United States of America"
 */
export function getCountryName(
  code: string,
  locale: 'de' | 'en' = 'de'
): string {
  if (!code) return 'Unbekannt'
  return countries.getName(code.toUpperCase(), locale) ?? code.toUpperCase()
}

/**
 * Get country name with flag emoji prefix.
 *
 * @example getCountryNameWithFlag("DE") → "🇩🇪 Deutschland"
 */
export function getCountryNameWithFlag(
  code: string,
  locale: 'de' | 'en' = 'de'
): string {
  const name = getCountryName(code, locale)
  const flag = getFlagEmoji(code)
  return flag ? `${flag} ${name}` : name
}

/**
 * Convert ISO country code to flag emoji.
 * Uses Unicode regional indicator symbol letters.
 */
export function getFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return ''
  const offset = 0x1f1e0 - 0x41 // A = U+1F1E6
  const chars = code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
  return chars.join('')
}
