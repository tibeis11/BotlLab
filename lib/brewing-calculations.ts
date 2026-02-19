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

// Water Calculations Structure
export interface WaterProfile {
    mashWater: number;
    spargeWater: number;
    totalWater: number;
    preBoilVolume: number;
    boilOffLoss: number;
    grainAbsorptionLoss: number;
}

export function calculateWaterProfile(
    batchSizeLiters: number, 
    totalGrainKg: number, 
    boilTimeHours: number = 1.0, 
    // Standard Config for Homebrewing (could come from equipment profile later)
    config: {
        mashThickness?: number,      // L/kg (3.0 - 4.0)
        grainAbsorption?: number,    // L/kg (0.8 - 1.2)
        boilOffRate?: number,        // L/h
        trubLoss?: number,           // L
        coolingShrinkage?: number    // % (0.04)
    } = {}
): WaterProfile {
    // PHYSICS MODEL (Standard Homebrew Constants, matching calculateBatchSizeDetails)
    
    // Constants (Defaults if config missing)
    const {
         mashThickness,
         grainAbsorption = 0.96, // L/kg
         boilOffRate = 3.5,      // L/h
         trubLoss = 0.5,         // L
         coolingShrinkage = 0.04 // 4%
    } = config;

    // 1. Calculate Post-Boil Hot Volume needed (Pfannevoll am Ende)
    // BatchSize (Cold) = PostBoilHot * (1 - shrinkage)
    // PostBoilHot = BatchSize / (1 - shrinkage)
    let postBoilHot = 0;
    if (batchSizeLiters > 0) {
        postBoilHot = batchSizeLiters / (1 - coolingShrinkage);
    }

    // 2. Calculate Boil Off & Trub Loss
    const totalBoilOff = boilOffRate * boilTimeHours;
    
    // 3. Pre-Boil Volume needed (Pfannevoll am Anfang)
    const preBoilNeed = postBoilHot + totalBoilOff + trubLoss;

    // 4. Grain Absorption
    const absorptionLoss = totalGrainKg * grainAbsorption;

    // 5. Total Water Input needed
    const totalWaterInput = preBoilNeed + absorptionLoss;

    // 6. Split into Mash and Sparge
    // Default thickness if not provided
    const thickness = mashThickness || 3.5;
    
    let mashWater = totalGrainKg * thickness;
    let spargeWater = totalWaterInput - mashWater;

    // Safety check
    if (spargeWater < 0) {
        // e.g. BIAB style where all water is in mash
        mashWater = totalWaterInput;
        spargeWater = 0;
    }

    return {
        mashWater: parseFloat(mashWater.toFixed(1)),
        spargeWater: parseFloat(spargeWater.toFixed(1)),
        totalWater: parseFloat(totalWaterInput.toFixed(1)),
        preBoilVolume: parseFloat(preBoilNeed.toFixed(1)),
        boilOffLoss: parseFloat(totalBoilOff.toFixed(1)),
        grainAbsorptionLoss: parseFloat(absorptionLoss.toFixed(1))
    };
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
    return malts.reduce((sum, m) => {
        let amount = safeFloat(m.amount);
        if (m.unit && (m.unit.toLowerCase() === 'g' || m.unit.toLowerCase() === 'gramm' || m.unit.toLowerCase() === 'grams')) {
            amount = amount / 1000;
        }
        // lbs?
        if (m.unit && (m.unit.toLowerCase() === 'lb' || m.unit.toLowerCase() === 'lbs')) {
            amount = amount * 0.453592;
        }
        if (m.unit && (m.unit.toLowerCase() === 'oz')) {
            amount = amount * 0.0283495;
        }
        return sum + amount;
    }, 0);
}

/**
 * Reverse Calculation: Estimate Batch Size from used Water amounts and Grain Bill.
 */
export function calculateBatchSizeDetails(
    mashWaterLiters: number, 
    spargeWaterLiters: number, 
    malts: MaltItem[],
    boilTimeMinutes: number = 60,
    config: {
        grainAbsorption?: number,
        boilOffRate?: number,
        trubLoss?: number,
        coolingShrinkage?: number
    } = {}
) {
    const mash = safeFloat(mashWaterLiters);
    const sparge = safeFloat(spargeWaterLiters);
    const boilTimeHours = boilTimeMinutes / 60;
    
    // Physics Constants (MUST match calculateWaterProfile)
    const {
        grainAbsorption: grainAbsorptionRate = 0.96, // L/kg
        boilOffRate = 3.5,                           // L/h
        trubLoss = 0.5,                              // L
        coolingShrinkage = 0.04                      // 4%
    } = config;

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
    const totalGrainKg = calculateTotalGrain(malts);
    const grainAbsorption = totalGrainKg * grainAbsorptionRate; 

    // 3. Pre-Boil Volume (Pfannevoll)
    let preBoilVolume = totalWater - grainAbsorption;
    if (preBoilVolume < 0) preBoilVolume = 0;
    
    // 4. Boil Off & Trub Loss (Verdampfung & Schwand)
    const boilOff = boilOffRate * boilTimeHours;
    
    // Post-Boil Hot Volume (End of Boil)
    let postBoilHot = preBoilVolume - boilOff - trubLoss;
    if (postBoilHot < 0) postBoilHot = 0;

    // 5. Cooling Shrinkage (Hot -> Cold)
    // batchSize (Cold) = postBoilHot * (1 - shrinkage)
    const batchSize = postBoilHot * (1 - coolingShrinkage);
    const shrinkageLoss = postBoilHot * coolingShrinkage;

    return {
        batchSize: parseFloat(batchSize.toFixed(1)),
        mashWater: mash,
        spargeWater: sparge,
        totalWater,
        grainAbsorption: parseFloat(grainAbsorption.toFixed(1)),
        preBoilVolume: parseFloat(preBoilVolume.toFixed(1)),
        boilOff: parseFloat(boilOff.toFixed(1)),
        trubLoss,
        shrinkageLoss: parseFloat(shrinkageLoss.toFixed(2)),
        totalGrainKg
    };
}

export function calculateBatchSizeFromWater(
    mashWater: number, 
    spargeWater: number, 
    malts: MaltItem[], 
    boilTimeMinutes: number = 60,
    config: {
        grainAbsorption?: number,
        boilOffRate?: number,
        trubLoss?: number,
        coolingShrinkage?: number
    } = {}
): number {
    return calculateBatchSizeDetails(mashWater, spargeWater, malts, boilTimeMinutes, config).batchSize;
}

/**
 * Detailed OG Calculation.
 */
export function calculateOGDetails(
    batchSizeLiters: number,
    malts: MaltItem[],
    efficiencyPercent: number
) {
    if (batchSizeLiters <= 0) {
        return { ogPlato: 0, totalGrainKg: 0, extractMass: 0, ogPoints: 0, ogSG: 1.000 };
    }

    const efficiency = safeFloat(efficiencyPercent) / 100;
    
    // 1. Calculate Total Grain Mass
    const totalGrainKg = calculateTotalGrain(malts);
    
    // 2. Calculate Total Potential Extract
    // Simplified: Average yield potential ~300 GravityPoints * Liter / kg
    let totalPoints = 0;
    for (const malt of malts) {
        const amount = safeFloat(malt.amount);
        const potential = 300; 
        totalPoints += amount * potential;
    }

    // 3. Apply Efficiency
    const points = (totalPoints * efficiency) / batchSizeLiters;
    
    // 4. Convert to SG
    const sg = 1 + (points / 1000);
    
    // 5. Convert to Plato
    const plato = sgToPlato(sg);

    // Theoretical Extract Mass (simplified)
    const extractMass = totalGrainKg * efficiency; 

    return {
        ogPlato: parseFloat(plato.toFixed(1)),
        totalGrainKg: parseFloat(totalGrainKg.toFixed(2)),
        extractMass: parseFloat(extractMass.toFixed(2)),
        ogPoints: parseFloat(points.toFixed(0)),
        ogSG: parseFloat(sg.toFixed(3))
    };
}

/**
 * Calculates Estimated OG (Plato) from Grain Bill and Efficiency.
 * Supports argument swapping for legacy calls (batch, malts, eff) -> (batch, eff, malts).
 */
export function calculateOG(
    batchSizeLiters: number, 
    arg2: number | MaltItem[], 
    arg3: MaltItem[] | number
): number {
    let efficiencyPercent = 75;
    let malts: MaltItem[] = [];

    // Detect signature: (batch, efficiency, malts) [NEW] or (batch, malts, efficiency) [OLD]
    if (typeof arg2 === 'number') {
        efficiencyPercent = arg2;
        malts = arg3 as MaltItem[];
    } else {
        malts = arg2 as MaltItem[];
        efficiencyPercent = arg3 as number;
    }

    return calculateOGDetails(batchSizeLiters, malts, efficiencyPercent).ogPlato;
}

/**
 * Converts SG (1.xxx) to Plato.
 */
export function sgToPlato(sg: number): number {
    if (sg <= 0) return 0;
    // Formula: °P = (-1 * 616.868) + (1111.14 * sg) - (630.272 * sg^2) + (135.997 * sg^3)
    return (-1 * 616.868) + (1111.14 * sg) - (630.272 * Math.pow(sg, 2)) + (135.997 * Math.pow(sg, 3));
}

/**
 * Detailed ABV Calculation.
 */
export function calculateABVDetails(ogPlato: number, fgPlato: number) {
    const pToSg = (p: number) => 1 + (p / (258.6 - 0.8796 * p)); // Lincoln Equation
    
    // Convert to SG for standard formula
    const ogSg = pToSg(ogPlato);
    const fgSg = pToSg(fgPlato);

    // Standard ABV formula: (OG - FG) * 131.25
    const abv = (ogSg - fgSg) * 131.25;

    return {
        abv: parseFloat(abv.toFixed(1)),
        ogSG: parseFloat(ogSg.toFixed(3)),
        fgSG: parseFloat(fgSg.toFixed(3)),
        attenuation: ogSg > 1 ? (ogSg - fgSg) / (ogSg - 1) * 100 : 0
    };
}

/**
 * Calculates Alcohol by Volume.
 */
export function calculateABV(ogPlato: number, fgPlato: number): number {
   return calculateABVDetails(ogPlato, fgPlato).abv;
}

/**
 * Estimates FG based on yeast attenuation.
 */
export function calculateFG(ogPlato: number, yeastAttenuation: number): number {
    const attenuation = safeFloat(yeastAttenuation) / 100;
    const ogSg = 1 + (ogPlato / (258.6 - 0.8796 * ogPlato));
    
    // Points attenuated
    const points = (ogSg - 1) * 1000;
    const finalPoints = points * (1 - attenuation);
    
    const fgSg = 1 + (finalPoints / 1000);
    return sgToPlato(fgSg);
}

/**
 * Converts EBC to Hex Color (Approximate).
 */
export function ebcToHex(ebc: number): string {
    const srm = ebc * 0.508;
    // Simple lookup-like mapping or formula
    // SRM < 0 -> FFFFFF
    if (srm <= 0) return '#FFFFFF';
    if (srm > 40) return '#000000'; // Stout

    // Simplistic palette often used in brewing apps:
    const palette = [
        '#F8F753', '#F6F513', '#ECE61A', '#D5BC26', '#BF923B', '#BF813A',
        '#BC6733', '#8D4C32', '#5D341A', '#261716', '#160D0A', '#080503'
    ];
    // This is hard to map continuously. 
    // Let's use a continuous RGB formula approximation for beer colors.
    
    // Formula from "Approximating Beer Color in RGB"
    // R = 255
    // G = 255 * (0.98 ^ SRM) since SRM 1 is yellowish? No that's not right.
    // Let's use a simpler known SRM->RGB snippet. (Here simplified heavily)
    
    // SRM 1-40 map to range
    const r = Math.min(255, Math.max(0, 255 * Math.pow(0.975, srm)));
    const g = Math.min(255, Math.max(0, 245 * Math.pow(0.88, srm)));
    const b = Math.min(255, Math.max(0, 220 * Math.pow(0.7, srm)));
    
    const toHex = (n: number) => Math.floor(n).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function calculateABVFromSG(og: number, fg: number): number {
    return (og - fg) * 131.25;
}

export function platoToSG(plato: number): number {
    return 1 + (plato / (258.6 - ((plato / 258.2) * 227.1)));
}

export function calculatePrimingSugar(volumeLiters: number, tempC: number, targetCo2: number): number {
    // 1. Residual CO2
    const residualCo2 = calculateResidualCO2(tempC);
    
    // 2. Needed CO2
    const co2Needed = targetCo2 - residualCo2;
    if (co2Needed <= 0) return 0;
    
    // 3. Sugar needed
    // 1g glucose produces ~0.46g CO2 ?? No.
    // Standard formula: 
    // Grams of Sugar = (Volume * (TargetCO2 - ResidualCO2)) * 4 ?
    // Actually: 1 volume CO2 in 1 Liter = 1.96g CO2.
    // Fermenting 1g Glucose -> 0.49g CO2 + 0.51g Ethanol.
    // So to get 1.96g CO2, we need 1.96 / 0.49 = 4g Glucose.
    // So roughly 4g/L per Volume of CO2.
    
    return parseFloat((volumeLiters * co2Needed * 4).toFixed(1));
}

export function calculateResidualCO2(tempC: number): number {
    // Formula: 1.013 * (2.71828 ^ (-10.73797 + (2617.25 / (TempC + 273.15)))) ?
    // Simpler approximation: 
    // 0C -> 1.7 vol
    // 20C -> 0.8 vol
    return parseFloat((1.013 * Math.exp(-10.73797 + (2617.25 / (tempC + 273.15)))).toFixed(2));
}

/**
 * Calculates current gravity based on attenuation.
 * og: Specific Gravity (e.g. 1.050)
 * attenuation: 0-1 (e.g. 0.75)
 */
export function calculateCurrentGravity(og: number, attenuation: number): number {
    const points = (og - 1) * 1000;
    const currentPoints = points * (1 - attenuation);
    return 1 + (currentPoints / 1000);
}
