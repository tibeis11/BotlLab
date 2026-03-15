/**
 * Clamps a parsed ingredient amount to sensible bounds.
 * Prevents garbage BeerXML/JSON values (e.g. 9999 kg malt) from entering the DB.
 */
export function clampAmount(amount: number, type: string): number {
  if (isNaN(amount) || amount < 0) return 0;
  switch (type) {
    case 'malt':  return Math.min(amount, 500);    // max 500 kg
    case 'hop':   return Math.min(amount, 10000);  // max 10 kg = 10000 g
    case 'yeast': return Math.min(amount, 2000);   // max 2000 g/ml
    case 'misc':  return Math.min(amount, 5000);   // max 5 kg misc
    default:      return Math.min(amount, 100000);
  }
}
