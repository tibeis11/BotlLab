// Run with: npx tsx test_calc_fixes.js
// @ts-nocheck
const { calculateOG, calculateOGDetails, calculateColorEBC, calculateColorEBCDetails, calculateIBU, calculateIBUDetails, calculateWaterProfile, calculateBatchSizeFromWater, calculateTotalGrain, safeFloat, sgToPlato, calculateFG, calculateABV, maltAmountKg, getMaltPotential, getMaltDefaultEBC } = require('./lib/brewing-calculations');

let passed = 0;
let failed = 0;

function assert(name, actual, expected, tolerance = 0.01) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
        console.log(`  ✅ ${name}: ${actual} (expected ~${expected})`);
        passed++;
    } else {
        console.log(`  ❌ ${name}: ${actual} (expected ~${expected}, diff ${diff.toFixed(4)})`);
        failed++;
    }
}

console.log('========================================');
console.log('BUG 1 FIX: Unit conversion (g vs kg)');
console.log('========================================');

const maltsKg = [
    { name: 'Pilsner', amount: '5', unit: 'kg', color_ebc: '3' },
    { name: 'Carahell', amount: '0.3', unit: 'kg', color_ebc: '25' }
];
const maltsG = [
    { name: 'Pilsner', amount: '5000', unit: 'g', color_ebc: '3' },
    { name: 'Carahell', amount: '300', unit: 'g', color_ebc: '25' }
];

const ogKg = calculateOGDetails(23, maltsKg, 72);
const ogG = calculateOGDetails(23, maltsG, 72);
assert('OG (kg) should be reasonable', ogKg.ogPlato, 12.5, 1.0);
assert('OG (g) should match (kg)', ogG.ogPlato, ogKg.ogPlato, 0.1);

const colorKg = calculateColorEBC(23, maltsKg);
const colorG = calculateColorEBC(23, maltsG);
assert('Color (kg) should be reasonable', colorKg, 7, 3);
assert('Color (g) should match (kg)', colorG, colorKg, 0.1);

console.log();
console.log('========================================');
console.log('BUG 2 FIX: Malt-specific potentials');
console.log('========================================');

assert('Pilsner potential', getMaltPotential('Pilsner Malz'), 309, 0);
assert('Munich potential', getMaltPotential('Münchner Malz'), 292, 0);
assert('Carahell potential', getMaltPotential('Carahell'), 275, 0);
assert('Zucker potential', getMaltPotential('Zucker'), 384, 0);
assert('Roasted Barley potential', getMaltPotential('Roasted Barley'), 234, 0);
assert('DME potential', getMaltPotential('Trockenmalzextrakt'), 367, 0);
assert('Unknown malt potential', getMaltPotential('Spezialmischung XYZ'), 300, 0);

// Full OG test with mixed malts
const maltsMixed = [
    { name: 'Pilsner Malz', amount: '4', unit: 'kg', color_ebc: '3' },
    { name: 'Münchner Malz', amount: '1', unit: 'kg', color_ebc: '18' },
    { name: 'Carahell', amount: '0.3', unit: 'kg', color_ebc: '25' },
    { name: 'Zucker', amount: '0.2', unit: 'kg', color_ebc: '0' }
];
const ogMixed = calculateOGDetails(23, maltsMixed, 72);
console.log(`  Mixed recipe OG: ${ogMixed.ogPlato} °P (SG ${ogMixed.ogSG})`);
assert('Mixed recipe OG should be reasonable', ogMixed.ogPlato, 12.5, 1.5);

console.log();
console.log('========================================');
console.log('BUG 4 FIX: Whirlpool IBU');
console.log('========================================');

const hopsWhirlpool = [
    { name: 'Citra', amount: '30', unit: 'g', alpha: '12', time: '60', usage: 'Boil', form: 'Pellet' },
    { name: 'Citra', amount: '50', unit: 'g', alpha: '12', time: '15', usage: 'Whirlpool', form: 'Pellet' }
];
const ibuWP = calculateIBUDetails(20, 13, hopsWhirlpool, 60);
console.log(`  Total IBU with whirlpool: ${ibuWP.totalIBU}`);
assert('Boil hop should contribute IBU', ibuWP.parts[0].ibu, 44.6, 5);
assert('Whirlpool hop should contribute some IBU', ibuWP.parts[1].ibu, 14, 5);
assert('Whirlpool IBU < Boil IBU', ibuWP.parts[1].ibu < ibuWP.parts[0].ibu ? 1 : 0, 1, 0);

console.log();
console.log('========================================');
console.log('BUG 5 FIX: Pellet vs Leaf');
console.log('========================================');

const hopsPellet = [
    { name: 'Cascade', amount: '40', unit: 'g', alpha: '6', time: '60', usage: 'Boil', form: 'Pellet' }
];
const hopsLeaf = [
    { name: 'Cascade', amount: '40', unit: 'g', alpha: '6', time: '60', usage: 'Boil', form: 'Leaf' }
];
const ibuPellet = calculateIBU(20, 12, hopsPellet, 60);
const ibuLeaf = calculateIBU(20, 12, hopsLeaf, 60);
console.log(`  Pellet IBU: ${ibuPellet}, Leaf IBU: ${ibuLeaf}`);
assert('Pellet > Leaf (10% bonus)', ibuPellet > ibuLeaf ? 1 : 0, 1, 0);
assert('Difference should be ~10%', (ibuPellet - ibuLeaf) / ibuLeaf, 0.1, 0.01);

console.log();
console.log('========================================');
console.log('BUG 6 FIX: Default EBC fallback');
console.log('========================================');

assert('Pilsner default EBC', getMaltDefaultEBC('Pilsner'), 3, 0);
assert('Carahell default EBC', getMaltDefaultEBC('Carahell'), 25, 0);
assert('Roasted Barley default EBC', getMaltDefaultEBC('Roasted Barley'), 1300, 0);
assert('Unknown malt default EBC', getMaltDefaultEBC('Spezialmischung'), 4, 0);

const maltsNoColor = [
    { name: 'Pilsner Malz', amount: '5', unit: 'kg' },
    { name: 'Carahell', amount: '0.3', unit: 'kg' }
];
const colorFallback = calculateColorEBC(23, maltsNoColor);
console.log(`  Color with fallback EBC: ${colorFallback} (should be close to ${colorKg})`);
assert('Color with fallback should be > 0', colorFallback > 0 ? 1 : 0, 1, 0);
assert('Color with fallback should match explicit color', colorFallback, colorKg, 0.5);

console.log();
console.log('========================================');
console.log('BUG 7 FIX: Gravity conversion');
console.log('========================================');

const ibuHigh = calculateIBUDetails(20, 20, 
    [{ name: 'Centennial', amount: '50', unit: 'g', alpha: '10', time: '60', usage: 'Boil', form: 'Pellet' }], 60);
console.log(`  High gravity (20°P) boilGravity: ${ibuHigh.boilGravity.toFixed(4)}`);
const expectedSG = 1 + (20 / (258.6 - 0.8796 * 20));
assert('Gravity conversion uses Lincoln eq', ibuHigh.boilGravity, expectedSG, 0.001);

console.log();
console.log('========================================');
console.log('REGRESSION: Core calcs still work');
console.log('========================================');

const water = calculateWaterProfile(23, 5.3, 1.0);
assert('Water HG reasonable', water.mashWater, 18.6, 1);
assert('Water NG reasonable', water.spargeWater, 14, 2);

const batchFromWater = calculateBatchSizeFromWater(water.mashWater, water.spargeWater, maltsKg, 60);
assert('Reverse batch size', batchFromWater, 23, 0.5);

const fg = calculateFG(12.3, 75);
assert('FG from 12.3°P + 75% att', fg, 3.5, 1.0);

const abv = calculateABV(12.3, 3.5);
assert('ABV from 12.3/3.5', abv, 4.8, 0.5);

console.log();
console.log('========================================');
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log('========================================');

process.exit(failed > 0 ? 1 : 0);
