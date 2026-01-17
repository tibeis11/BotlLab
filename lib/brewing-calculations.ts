// Unit Constants
const LBS_PER_KG = 2.20462;
const GAL_PER_LITER = 0.264172;
const EBC_TO_SRM = 0.508; // Approximately 1/1.97

/**
 * Parses a float from string, handling both dot and comma as decimal separators.
 * Returns 0 if invalid or empty.
 */
export function safeFloat(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(',', '.')) || 0;
}

export interface MaltItem {
    name: string;
    amount: string; // usually kg
    unit: string;
    color_ebc?: string;
}

export interface HopItem {
    name: string;
    amount: string; // usually g
    unit: string;
    alpha?: string; // %
    time?: string; // min
    usage?: string; // Boil, etc.
}

export interface ColorContribution {
    maltName: string;
    amountKg: number;
    colorEBC: number;
    mcu: number;
}

/**
 * Detailed calculation for EBC Color.
 */
export function calculateColorEBCDetails(batchSizeLiters: number, malts: MaltItem[]) {
    if (batchSizeLiters <= 0 || !malts.length) {
        return { totalEBC: 0, totalMCU: 0, srm: 0, parts: [] as ColorContribution[] };
    }

    let totalMCU = 0;
    const parts: ColorContribution[] = [];

    for (const malt of malts) {
        const amount = safeFloat(malt.amount); // kg
        const ebc = safeFloat(malt.color_ebc);
        
        if (amount <= 0) continue;

        const weightLbs = amount * LBS_PER_KG;
        const colorLovibond = ebc * EBC_TO_SRM;
        const volGal = batchSizeLiters * GAL_PER_LITER;

        let mcuContribution = 0;
        if (volGal > 0) {
            mcuContribution = (weightLbs * colorLovibond) / volGal;
            totalMCU += mcuContribution;
        }
        
        parts.push({
            maltName: malt.name,
            amountKg: amount,
            colorEBC: ebc,
            mcu: parseFloat(mcuContribution.toFixed(2))
        });
    }

    if (totalMCU <= 0) {
        return { totalEBC: 0, totalMCU: 0, srm: 0, parts };
    }

    const srm = 1.4922 * Math.pow(totalMCU, 0.6859);
    const totalEBC = parseFloat((srm / EBC_TO_SRM).toFixed(1));
    
    return {
        totalEBC,
        totalMCU: parseFloat(totalMCU.toFixed(2)),
        srm: parseFloat(srm.toFixed(2)),
        parts
    };
}

/**
 * Calculates EBC Color using Morey's formula adapted for metric.
 */
export function calculateColorEBC(batchSizeLiters: number, malts: MaltItem[]): number {
    return calculateColorEBCDetails(batchSizeLiters, malts).totalEBC;
}

export interface IBUContribution {
    hopName: string;
    amount: number;
    alpha: number;
    time: number;
    ibu: number;
    utilization: number;
    bigness: number;
    boilTimeFactor: number;
    mgAlpha: number;
}

/**
 * Detailed calculation for IBU using Tinseth formula.
 */
export function calculateIBUDetails(batchSizeLiters: number, ogPlato: number, hops: HopItem[], boilTimeTotal: number = 60) {
    if (batchSizeLiters <= 0 || !hops.length) {
        return { totalIBU: 0, boilGravity: 0, parts: [] as IBUContribution[] };
    }

    const boilGravity = 1 + (ogPlato * 0.004);
    
    let totalIBU = 0;
    const parts: IBUContribution[] = [];

    for (const hop of hops) {
        const amount = safeFloat(hop.amount); // grams
        const alpha = safeFloat(hop.alpha);
        const time = safeFloat(hop.time);
        const usage = hop.usage || 'Boil';

        if (amount <= 0 || alpha <= 0 || time <= 0) continue;
        if (usage !== 'Boil' && usage !== 'First Wort') continue;

        // 1. Bigness Factor
        const bigness = 1.65 * Math.pow(0.000125, (boilGravity - 1));

        // 2. Boil Time Factor
        const boilTimeFactor = (1 - Math.exp(-0.04 * time)) / 4.15;

        // Tinseth base utilization.
        let utilization = bigness * boilTimeFactor;

        // Apply 10% bonus for pellets
        utilization *= 1.1;

        const mgAlpha = amount * alpha * 10;
        const ibuVal = (utilization * mgAlpha) / batchSizeLiters;
        
        totalIBU += ibuVal;

        parts.push({
            hopName: hop.name,
            amount,
            alpha,
            time,
            ibu: parseFloat(ibuVal.toFixed(1)),
            utilization,
            bigness,
            boilTimeFactor,
            mgAlpha
        });
    }

    return {
        totalIBU: parseFloat(totalIBU.toFixed(1)),
        boilGravity,
        parts
    };
}

/**
 * Calculates IBU using Tinseth formula.
 */
export function calculateIBU(batchSizeLiters: number, ogPlato: number, hops: HopItem[], boilTimeTotal: number = 60): number {
    return calculateIBUDetails(batchSizeLiters, ogPlato, hops, boilTimeTotal).totalIBU;
}

/**
 * Calculates total grain mass in kg from malt list.
 */
export function calculateTotalGrain(malts: MaltItem[]): number {
    if (!malts) return 0;
    return malts.reduce((sum, m) => sum + safeFloat(m.amount), 0);
}

/**
 * Suggests Water amounts.
 * Returns { mashWater, spargeWater } in Liters.
 */
export function calculateWaterProfile(batchSizeLiters: number, malts: MaltItem[]) {
    if (batchSizeLiters <= 0) return { mashWater: 0, spargeWater: 0 };

    const totalGrainKg = calculateTotalGrain(malts);
    
    // 1. Hauptguss (Mash Water)
    // Ratio 3.5 L/kg is a good standard for homebrewers (range 2.5-4)
    const mashRatio = 3.5; 
    const mashWater = totalGrainKg * mashRatio;

    // 2. Nachguss (Sparge Water)
    // We strictly need to reach the boil volume.
    // Boil Volume = Batch Size / 0.9 (assuming 10% boil off total) + Trub Loss (1L)
    // Let's assume simpler: Target Volume into Fermenter = Batch Size
    // Water needed = Batch Size + Grain Absorption + Boil Off
    const grainAbsorption = totalGrainKg * 1.0; // 1 L/kg
    const boilOff = batchSizeLiters * 0.15; // 15% total system loss approx
    
    const totalWaterNeeded = batchSizeLiters + grainAbsorption + boilOff;
    
    let spargeWater = totalWaterNeeded - mashWater;
    if (spargeWater < 0) spargeWater = 0; // Likely "Biab" full volume mash if ratio high

    return {
        mashWater: parseFloat(mashWater.toFixed(1)),
        spargeWater: parseFloat(spargeWater.toFixed(1))
    };
}

/**
 * Reverse Calculation: Estimate Batch Size from used Water amounts and Grain Bill.
 */
export function calculateBatchSizeDetails(mashWaterLiters: number, spargeWaterLiters: number, malts: MaltItem[]) {
    const mash = safeFloat(mashWaterLiters);
    const sparge = safeFloat(spargeWaterLiters);
    
    // 1. Total Water Input
    const totalWater = mash + sparge;
    if (totalWater <= 0) {
        return { 
            batchSize: 0, 
            mashWater: 0,
            spargeWater: 0, 
            totalWater: 0, 
            grainAbsorption: 0, 
            preBoilVolume: 0, 
            boilOff: 0,
            totalGrainKg: 0
        };
    }
    
    // 2. Grain Absorption (Treberverlust)
    // Formula: ~0.96 L / kg (approx 1 L/kg or 0.12 gal/lb standard)
    const totalGrainKg = calculateTotalGrain(malts);
    const grainAbsorption = totalGrainKg * 0.96; 

    // 3. Pre-Boil Volume (Pfannevoll)
    let preBoilVolume = totalWater - grainAbsorption;
    if (preBoilVolume < 0) preBoilVolume = 0;
    
    // 4. Boil Off & Trub Loss (Verdampfung & Schwand)
    // We assume ~15% total system loss from the Pre-Boil volume
    const evaporationRate = 0.15; // 15%
    const boilOff = preBoilVolume * evaporationRate;
    
    const batchSize = preBoilVolume - boilOff;

    return {
        batchSize: parseFloat(batchSize.toFixed(1)),
        mashWater: mash,
        spargeWater: sparge,
        totalWater,
        grainAbsorption: parseFloat(grainAbsorption.toFixed(1)),
        preBoilVolume: parseFloat(preBoilVolume.toFixed(1)),
        boilOff: parseFloat(boilOff.toFixed(1)),
        totalGrainKg
    };
}

export function calculateBatchSizeFromWater(mashWater: number, spargeWater: number, malts: MaltItem[]): number {
    return calculateBatchSizeDetails(mashWater, spargeWater, malts).batchSize;
}

/**
 * Calculates Estimated OG (Plato) from Grain Bill and Efficiency.
 */
export function calculateOGDetails(batchSizeLiters: number, malts: MaltItem[], efficiencyPercent: number) {
    if (batchSizeLiters <= 0 || !malts.length) {
        return { ogPlato: 0, totalGrainKg: 0, efficiency: 0, extractMass: 0 };
    }

    // Default efficiency 75% if not provided
    const eff = efficiencyPercent > 0 ? efficiencyPercent : 75;
    
    const totalGrain = calculateTotalGrain(malts);
    if (totalGrain <= 0) return { ogPlato: 0, totalGrainKg: 0, efficiency: eff, extractMass: 0 };

    // C = (Extract Mass * 100) / Volume
    // Represents "Extract g/100ml" assuming water density ~1
    const C = (eff * totalGrain) / batchSizeLiters;

    // Calculate Plato using the inverted Lincoln Equation.
    // Lincoln Eq: SG = 259 / (259 - Plato)
    // Relation: Plato * SG = C
    // Substitution leads to: P = (259 * C) / (259 + C)
    const CONSTANT_L = 259;
    const plato = (CONSTANT_L * C) / (CONSTANT_L + C);

    // Mass of Extract (sugar) based on efficiency
    const extractMass = totalGrain * (eff / 100);

    return {
        ogPlato: parseFloat(plato.toFixed(1)),
        totalGrainKg: parseFloat(totalGrain.toFixed(2)),
        efficiency: eff,
        extractMass: parseFloat(extractMass.toFixed(2))
    };
}

export function calculateOG(batchSizeLiters: number, malts: MaltItem[], efficiencyPercent: number): number {
    return calculateOGDetails(batchSizeLiters, malts, efficiencyPercent).ogPlato;
}

/**
 * Helper: Convert Plato to SG using Lincoln Equation.
 */
export function platoToSG(plato: number): number {
    if (!plato) return 1.0;
    return 259 / (259 - plato);
}

/**
 * Helper: Calculate ABV from SG values.
 */
export function calculateABVFromSG(og: number, fg: number): number {
    return (og - fg) * 131.25;
}

/**
 * Calculates ABV from Plato.
 */
export function calculateABVDetails(ogPlato: number, fgPlato: number) {
    const ogSG = platoToSG(ogPlato);
    const fgSG = platoToSG(fgPlato);
    const abv = calculateABVFromSG(ogSG, fgSG);
    
    return {
        abv: parseFloat(abv.toFixed(1)),
        ogSG: parseFloat(ogSG.toFixed(3)),
        fgSG: parseFloat(fgSG.toFixed(3)),
        ogPlato,
        fgPlato
    };
}

export function calculateABV(ogPlato: number, fgPlato: number): number {
    return calculateABVDetails(ogPlato, fgPlato).abv;
}

/**
 * Converts EBC color value to a CSS Hex Color String.
 */
export function ebcToHex(ebc: number): string {
    const srm = ebc * EBC_TO_SRM;
    const roundSrm = Math.round(srm);

    if (roundSrm <= 1) return "#FFE699";
    if (roundSrm >= 40) return "#0F0200";

    const map: Record<number, string> = {
        1: "#FFE699", 2: "#FFD878", 3: "#FFCA5A", 4: "#FFBF42", 5: "#FBB123",
        6: "#F8A600", 7: "#F39C00", 8: "#EA8F00", 9: "#E58500", 10: "#DE7C00",
        11: "#D77200", 12: "#CF6900", 13: "#CB6200", 14: "#C35900", 15: "#BB5100",
        16: "#B54C00", 17: "#B04500", 18: "#A63E00", 19: "#A13700", 20: "#9B3200",
        21: "#952D00", 22: "#8E2900", 23: "#882300", 24: "#821E00", 25: "#7B1A00",
        26: "#771900", 27: "#701400", 28: "#6A0E00", 29: "#660D00", 30: "#5E0B00",
        35: "#3D0800"
    };

    if (map[roundSrm]) return map[roundSrm];

    // Find closest
    let closest = 1;
    let minDiff = 100;
    for(const keyStr in map) {
        const key = parseInt(keyStr);
        const diff = Math.abs(key - roundSrm);
        if(diff < minDiff) {
            minDiff = diff;
            closest = key;
        }
    }
    return map[closest];
}

/**
 * Calculates Estimated FG (Plato) based on OG and Yeast Attenuation.
 * Formula: FG = OG * (1 - Attenuation/100)
 */
export function calculateFG(ogPlato: number, attenuationPercent: number): number {
    if (ogPlato <= 0) return 0;
    const att = attenuationPercent > 0 ? attenuationPercent : 75; // Default 75%
    const fg = ogPlato * (1 - att / 100);
    return parseFloat(fg.toFixed(1));
}

/**
 * Calculates Residual CO2 (in g/L) based on fermentation temperature.
 * Formula: CO2(vols) = 3.0378 - (0.050062 * T_F) + (0.00026555 * T_F^2)
 * Converted to g/l by multiplying by 1.96.
 */
export function calculateResidualCO2(tempC: number): number {
    const tempF = tempC * 1.8 + 32;
    const co2Vols = 3.0378 - (0.050062 * tempF) + (0.00026555 * Math.pow(tempF, 2));
    
    // 1 Volume CO2 = 1.96 g/L
    const inGL = co2Vols * 1.96;
    return parseFloat(inGL.toFixed(2));
}

/**
 * Calculates priming sugar needed for carbonation.
 * @param volumeLiters - Volume of beer to package
 * @param tempC - Highest temperature reached after fermentation (for residual CO2)
 * @param targetCO2_gL - Desired CO2 in g/L
 * @param sugarType - Type of sugar. Currently supports 'sucrose' (Table Sugar) and 'glucose' (Dextrose)
 * @returns Amount of sugar in grams
 */
export function calculatePrimingSugar(
    volumeLiters: number, 
    tempC: number, 
    targetCO2_gL: number,
    sugarType: 'sucrose' | 'glucose' = 'sucrose'
): number {
    const residual = calculateResidualCO2(tempC);
    
    // If we already have more CO2 than target, no sugar needed (actually need to degas, but we return 0)
    if (residual >= targetCO2_gL) return 0;
    
    const needed = targetCO2_gL - residual;
    
    // CO2 produced per gram of sugar
    // Sucrose: ~0.5 g CO2 / g Sugar (0.5146 theoretical)
    // Glucose: ~0.46 g CO2 / g Sugar (Dextrose monohydrate usually used, slightly heavy)
    // Using standard homebrew factors
    let factor = 0.5;
    
    if (sugarType === 'glucose') {
        // Dextrose (Glucose Monohydrate usually) logic
        // Needed * Volume / 0.91 (efficiency) ?? 
        // Let's stick to standard practice: Dextrose requires ~10-15% more than Sucrose.
        // Factor for Glucose = 0.5 * 0.91 ??
        // Let's use simple multiplier relative to sucrose
        // Dextrose = Sucrose * 1.1
        factor = 0.5 / 1.1; 
    }
    
    const sugarAmount = (needed * volumeLiters) / factor;
    
    return parseFloat(sugarAmount.toFixed(1));
}
