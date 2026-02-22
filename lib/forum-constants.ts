/** Forum tag/flair options — shared between server actions and client components. */
export const FORUM_TAGS = [
  'Frage', 'Rezept', 'Showcase', 'Equipment', 'Tipp', 'Problem', 'Diskussion', 'Neuigkeit'
] as const;

export type ForumTag = typeof FORUM_TAGS[number];
