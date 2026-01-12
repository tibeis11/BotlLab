import { Filter } from 'bad-words';

const filter = new Filter();

// Extensive list of German bad words to add to the default English filter
const germanBadWords = [
  // Arsch & Co.
  'arsch', 'arschloch', 'arschgeige', 'arschgesicht', 'arschkriecher', 
  
  // Fäkalsprache
  'scheisse', 'scheiße', 'kacke', 'kackbratze', 'pissnelke', 'pisser', 
  'scheiss', 'scheiß', 'verdammt', 'wichse',
  
  // Sexuelle Beleidigungen & Organe
  'fotze', 'möse', 'schlampe', 'hure', 'hurensohn', 'nutte', 'bitch', 
  'cock', 'cunt', 'pimmel', 'schwanz', 'hoden', 'sack', 'fick', 'ficken', 
  'ficker', 'fic', 'fickfehler', 'verfickt', 'verfickte', 'verfickter', 
  'bumsen', 'wichser', 'wixxer', 'wichs',
  
  // Diskriminierend / Slurs
  'kanake', 'zigeuner', 'nazi', 'schwuchtel', 'mongo', 'spast', 'spasti', 
  'missgeburt', 'behindert', 'behinderter', 'neger', 'bimbo',
  
  // Allgemeine Beleidigungen
  'idiot', 'depp', 'trottel', 'bastard', 'dummkopf', 'penner', 'sau', 
  'drecksau', 'miststück', 'hackfresse', 'vollidiot', 'lackaffe', 'opfer',
  'lauch', 'kek', 'hundesohn'
];

filter.addWords(...germanBadWords);

/**
 * Checks text for profanity.
 * Returns true if profanity is found.
 */
export function isProfane(text: string): boolean {
  if (!text) return false;
  return filter.isProfane(text);
}

/**
 * Cleans text from profanity replacing bad words with asterisks.
 */
export function cleanText(text: string): string {
  if (!text) return text;
  return filter.clean(text);
}
