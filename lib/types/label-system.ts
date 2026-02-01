export type ElementType = 'text' | 'image' | 'qr-code' | 'shape' | 'brand-logo' | 'brand-footer';

export interface LabelStyle {
  fontFamily: string; // Must be one of the registered fonts
  fontSize: number; // in pt
  fontWeight: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline'; // New

  lineHeight?: number; // Relative (e.g. 1.2, 1.5)
  color: string; // Hex code
  textAlign: 'left' | 'center' | 'right';
  opacity?: number; // 0.0 to 1.0
  borderRadius?: number; // mm
  backgroundColor?: string; // Hex code (for shapes)
  borderWidth?: number; // mm
  borderColor?: string; // Hex code
}

export interface LabelElement {
  id: string; // UUID
  type: ElementType;

  // Position & Dimensions (in mm, relative to top-left of label)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // Degrees (0-360)
  zIndex: number; // Layer order

  // Content
  // Can be static text, image URL, or variable placeholder (e.g. "{{batch_nr}}")
  content: string;

  // Visual Styling
  style: LabelStyle;

  // Editor Logic
  isLocked: boolean; // If true, element cannot be selected or moved via UI (full lock)
  isCanvasLocked?: boolean; // If true, element cannot be selected via the canvas but remains selectable in the sidebar
  isDeletable?: boolean; // If false, element cannot be deleted via UI but can still be edited
  aspectLock?: boolean; // If true, width/height ratio is preserved during resize
  isVariable: boolean; // If true, content is replaced during batch generation
  name?: string; // Human readable name for the layer list (e.g. "Main Logo")
}

export interface LabelBackground {
  type: 'color' | 'image';
  value: string; // Hex code or Image URL
  opacity?: number;
}

export interface LabelGuide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number; // mm
}

export interface LabelDesign {
  id: string;
  name: string;
  description?: string;
  formatId: string; // Reference to Avery format ID (e.g. '6137')

  // Cached dimensions from format (in mm) for easier rendering
  width: number;
  height: number;
  orientation?: 'p' | 'l'; // 'p' = Portrait, 'l' = Landscape
  
  guides?: LabelGuide[]; // Custom user guides

  background: LabelBackground;
  elements: LabelElement[];

  createdAt: string;
  updatedAt: string;
  breweryId: string;
  isDefault: boolean;
}

// Variables that can be injected into a label during production
export interface LabelVariables {
  brew_name: string;
  brew_style: string;
  brew_date: string; // Bottling date
  batch_nr: string;
  abv: string;
  ibu: string;
  ebc: string;
  qr_code: string; // The generated QR data URL
  bottle_nr: string; // "001", "002" etc.
  total_bottles: string;
}
