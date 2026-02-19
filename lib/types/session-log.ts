export type SessionPhase = 'planning' | 'brewing' | 'fermenting' | 'conditioning' | 'completed';

export type LogEventType = 
  | 'NOTE' 
  | 'MEASUREMENT_OG' 
  | 'MEASUREMENT_SG' 
  | 'MEASUREMENT_FG' 
  | 'MEASUREMENT_PH'
  | 'MEASUREMENT_VOLUME'
  | 'INGREDIENT_ADD'
  | 'INGREDIENT_ACTUAL'
  | 'STATUS_CHANGE'
  | 'IMAGE'
  | 'YEAST_HARVEST'
  | 'TASTING_NOTE';

export interface BaseLogEntry {
  id: string; // UUID generated on client or server
  type: LogEventType;
  date: string; // ISO String (when it happened)
  createdAt?: string; // ISO String (when it was logged)
  title?: string;
  description?: string;
  createdBy?: string; // User ID
  imageUrl?: string;
}

export interface MeasurementData {
  gravity?: number; // Normalized to SG (1.xxx)
  originalValue?: number; // The value entered (e.g. 12.5)
  unit?: 'sg' | 'plato' | 'brix';
  temperature?: number;
  ph?: number;
  volume?: number; // In Liters
  correctionFactor?: number;
}

export interface MeasurementLogEntry extends BaseLogEntry {
  type: 'MEASUREMENT_OG' | 'MEASUREMENT_SG' | 'MEASUREMENT_FG' | 'MEASUREMENT_PH' | 'MEASUREMENT_VOLUME';
  data: MeasurementData;
}

export interface IngredientLogEntry extends BaseLogEntry {
  type: 'INGREDIENT_ADD' | 'INGREDIENT_ACTUAL';
  data: {
    name: string;
    amount?: number;
    unit: string;
    additionType?: 'boil' | 'dry_hop' | 'fermentation' | 'mash';
    // INGREDIENT_ACTUAL fields
    planned?: number;
    actual?: number;
    delta?: number;
  };
}

export interface NoteLogEntry extends BaseLogEntry {
  type: 'NOTE';
  data: Record<string, any>; // Allow metadata
}

export interface StatusChangeLogEntry extends BaseLogEntry {
  type: 'STATUS_CHANGE';
  data: {
    newStatus: string;
    previousStatus?: string;
    systemMessage?: boolean;
  };
}

export interface ImageLogEntry extends BaseLogEntry {
  type: 'IMAGE';
  data: {
    caption?: string;
    storagePath?: string;
  };
}

export interface YeastHarvestEntry extends BaseLogEntry {
  type: 'YEAST_HARVEST';
  data: {
    volume: number | string;
    generation: number | string;
    note?: string;
  };
}

export interface TastingNoteEntry extends BaseLogEntry {
  type: 'TASTING_NOTE';
  data: {
    rating: number; // 1-5
    srm?: number; 
    clarity?: string;
    head?: string;
    aroma?: string;
    taste?: string;
    mouthfeel?: string;
    comments?: string;
    carbonation?: string;
  };
}

export type TimelineEvent = 
  | MeasurementLogEntry 
  | IngredientLogEntry 
  | NoteLogEntry 
  | StatusChangeLogEntry 
  | ImageLogEntry
  | YeastHarvestEntry
  | TastingNoteEntry;


// Helper to check if an event is a measurement
export function isMeasurement(event: TimelineEvent): event is MeasurementLogEntry {
  return event.type.startsWith('MEASUREMENT_');
}
