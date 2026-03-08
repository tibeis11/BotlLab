'use client';

export type IngredientItem = {
  name?: string;
  amount?: number | string;
  unit?: string;
  [key: string]: unknown;
};

export type IngredientMode =
  | 'absolute'
  | 'percentage'
  | 'name_only'
  | { type: 'grams_per_liter'; volume: number };

interface Props {
  items: IngredientItem | IngredientItem[] | string | string[] | null | undefined;
  mode?: IngredientMode;
}

function parseAmount(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
  return 0;
}

export default function IngredientList({ items, mode = 'absolute' }: Props) {
  if (!items) return null;

  // Handle string (legacy/simple)
  if (typeof items === 'string') return <>{items}</>;

  // Handle array
  if (Array.isArray(items)) {
    if (items.length === 0) return null;

    // If elements are strings, join them
    if (typeof items[0] === 'string') return <>{(items as string[]).join(', ')}</>;

    let total = 0;
    let effectiveMode: IngredientMode = mode;

    // Calculation Logic for Percentage Type
    if (effectiveMode === 'percentage') {
      const units = new Set(
        (items as IngredientItem[])
          .filter((i) => i?.amount && i?.unit)
          .map((i) => (i.unit as string).toLowerCase()),
      );

      (items as IngredientItem[]).forEach((item) => {
        let val = parseAmount(item.amount);
        const u = item.unit ? (item.unit as string).toLowerCase() : '';
        if (u === 'kg' && (units.has('g') || units.has('gramm') || units.has('gram'))) val *= 1000;
        else if ((u === 'g' || u === 'gramm' || u === 'gram') && units.has('kg')) val /= 1000;
        total += val;
      });
      // If calc failed, fallback to absolute
      if (total <= 0) effectiveMode = 'absolute';
    }

    return (
      <div className="flex flex-col gap-1.5">
        {(items as IngredientItem[]).map((item, idx) => {
          if (typeof item === 'string') return <span key={idx}>{item as string}</span>;
          if (item?.name) {
            let details = '';
            let highlight = false;

            if (effectiveMode !== 'name_only') {
              if (effectiveMode === 'percentage') {
                let val = parseAmount(item.amount);
                const units = new Set(
                  (items as IngredientItem[])
                    .filter((i) => i?.amount && i?.unit)
                    .map((i) => (i.unit as string).toLowerCase()),
                );
                const u = item.unit ? (item.unit as string).toLowerCase() : '';

                if (u === 'kg' && (units.has('g') || units.has('gramm') || units.has('gram'))) val *= 1000;
                else if ((u === 'g' || u === 'gramm' || u === 'gram') && units.has('kg')) val /= 1000;

                const pct = (val / total) * 100;
                if (pct > 0) {
                  details = `${Math.round(pct)}%`;
                  highlight = true;
                }
              } else if (
                typeof effectiveMode === 'object' &&
                effectiveMode.type === 'grams_per_liter' &&
                effectiveMode.volume > 0
              ) {
                let valInGrams = parseAmount(item.amount);
                const u = item.unit ? (item.unit as string).toLowerCase().trim() : '';
                const weightUnits = ['g', 'gram', 'gramm', 'grams', 'kg', 'kilogram', 'kilogramm'];
                const isWeight = weightUnits.includes(u);

                if (isWeight) {
                  if (u.startsWith('k') && item.amount) valInGrams *= 1000;
                  const gPerL = valInGrams / effectiveMode.volume;
                  if (gPerL > 0) {
                    if (gPerL < 0.1) details = `< 0.1 g/L`;
                    else if (gPerL < 10) details = `${gPerL.toFixed(1)} g/L`;
                    else details = `${Math.round(gPerL)} g/L`;
                    highlight = true;
                  }
                }
              } else {
                // absolute
                if (item.amount) details += item.amount;
                if (item.unit) details += ` ${item.unit}`;
              }
            }

            return (
              <div key={idx} className="flex justify-between items-start text-sm group">
                <span className="text-text-secondary font-medium leading-tight">{item.name}</span>
                {details && (
                  <span
                    className={`text-text-muted text-xs font-mono ml-3 shrink-0 whitespace-nowrap ${highlight ? 'text-brand font-bold' : ''}`}
                  >
                    {details}
                  </span>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Handle single object
  if (typeof items === 'object') {
    const item = items as IngredientItem;
    if (item.name) {
      if (mode === 'name_only') {
        return (
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-secondary font-medium">{item.name}</span>
          </div>
        );
      }
      return (
        <div className="flex justify-between items-center text-sm">
          <span className="text-text-secondary font-medium">{item.name}</span>
          {(item.amount || item.unit) && mode === 'absolute' && (
            <span className="text-text-muted text-xs font-mono ml-3 shrink-0">
              {item.amount && `${item.amount}`}
              {item.unit && ` ${item.unit}`}
            </span>
          )}
        </div>
      );
    }
  }

  return null;
}
