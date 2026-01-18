export interface LabelDimensions {
  id: string;
  name: string;
  width: number; // mm
  height: number; // mm
  cols: number;
  rows: number;
  marginLeft: number; // mm
  marginTop: number; // mm
  safeZone: number; // mm internal padding
  bgImage?: string; // path to background image in public/
}

export const LABEL_FORMATS: Record<string, LabelDimensions> = {
  // Transposed Dimensions for Landscape Config (Original 105x57 -> 57x105)
  '6137': {
    id: '6137',
    name: 'Standard (6137) - 57x105',
    width: 57,
    height: 105,
    cols: 5,
    rows: 2,
    marginLeft: 6,
    marginTop: 0,
    safeZone: 5,
    bgImage: '/labels/label_105x57.png'
  },
  // Transposed Dimensions for Landscape Config (Original 105x74 -> 74x105)
  '6138': {
    id: '6138',
    name: 'Large (6138) - 74x105',
    width: 74,
    height: 105,
    cols: 4,
    rows: 2,
    marginLeft: 0.5,
    marginTop: 0,
    safeZone: 5,
    bgImage: '/labels/label_105x74.png'
  },
  // Avery 4782 (97x67.7mm) - 4x2 Grid on Portrait
  '4782': {
    id: '4782',
    name: 'Alternative (4782) - 67.7x97',
    width: 67.7,
    height: 97,
    cols: 4,
    rows: 2,
    marginLeft: 13.1, // (297 - 4*67.7) / 2
    marginTop: 8,     // (210 - 2*97) / 2
    safeZone: 5,
    bgImage: '/labels/label_97x67.7.png'
  }
};

export const DEFAULT_FORMAT_ID = '6137';

export const SLOGANS = [
  "Crafted with patience.",
  "Hops, malt, yeast & magic.",
  "Life is too short for bad beer.",
  "Brewed for the bold.",
  "Drink nice beer.",
  "Respect the craft.",
  "Pure liquid happiness.",
  "In hops we trust.",
  "Taste the Science.",
  "Small Batch, Big Heart.",
  "Quality over Quantity.",
  "Trust the Process."
];

export const getSmartLabelConfig = (formatId?: string): LabelDimensions => {
  if (!formatId && typeof window !== 'undefined') {
      const savedId = localStorage.getItem('botllab_label_format');
      return LABEL_FORMATS[savedId as string] || LABEL_FORMATS[DEFAULT_FORMAT_ID];
  }
  return LABEL_FORMATS[formatId || DEFAULT_FORMAT_ID] || LABEL_FORMATS[DEFAULT_FORMAT_ID];
};
