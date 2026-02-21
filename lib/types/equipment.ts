export interface EquipmentProfile {
  id: string;
  brewery_id: string;
  name: string;
  brew_method: 'all_grain' | 'extract' | 'biab';
  batch_volume_l: number;
  boil_off_rate: number;       // L/h
  trub_loss: number;           // L
  grain_absorption: number;    // L/kg
  cooling_shrinkage: number;   // 0.04 = 4 %
  mash_thickness: number;      // L/kg
  default_efficiency: number;  // % Sudhausausbeute, Richtwert der Anlage
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** Konvertiert ein Equipment-Profil in das config-Objekt
 *  das calculateWaterProfile() / calculateBatchSizeFromWater() erwartet. */
export function profileToConfig(profile: EquipmentProfile) {
  return {
    boilOffRate:      profile.boil_off_rate,
    trubLoss:         profile.trub_loss,
    grainAbsorption:  profile.grain_absorption,
    coolingShrinkage: profile.cooling_shrinkage,
    mashThickness:    profile.mash_thickness,
  };
}

/** Label für den Braumethoden-Wert */
export const BREW_METHOD_LABELS: Record<EquipmentProfile['brew_method'], string> = {
  all_grain: 'All-Grain',
  extract:   'Extrakt',
  biab:      'BIAB',
};

/** Default-Werte wenn kein Profil vorhanden */
export const DEFAULT_EQUIPMENT_CONFIG = {
  boilOffRate:      3.5,
  trubLoss:         0.5,
  grainAbsorption:  0.96,
  coolingShrinkage: 0.04,
  mashThickness:    3.5,
} as const;
