// ==========================================
// 🍺 BOTLLAB RECIPE TEMPLATE 🍺
// ==========================================
// Usage: 
// 1. Edit the CONFIG object below
// 2. Run: node scripts/add_brew_template.js
// ==========================================

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Needs Service Role for admin tasks

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: DB Credentials missing. Check .env.local (Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 📝 CONFIGURATION - EDIT THIS SECTION
// ==========================================

const RECIPE = {
  // Who is creating this?
  user_id: null, // 'a2e7b77d-b267-431a-802b-66d2521aef29', // REPLACE WITH YOUR USER ID
  brewery_id: '11111111-2222-3333-4444-000000000001', // '0fc4048a-9683-438f-84cb-7e1d235c1553', // REPLACE WITH YOUR SQUAD ID

  // Basic Info
  name: 'La Ferme Blanche',
  brew_type: 'beer', // Options: 'beer', 'wine', 'softdrink', 'cider', 'mead'
  style: 'Saison',
  description: 'Ein charaktervolles Saison mit fruchtigen Hopfennoten. Hallertau Blanc ist ein wunderbarer Hopfen für diesen Bierstil. Das Bier war der 2. Platz beim 14. mitteldeutschen Brauertreffen in Leipzig.',
  is_public: true, // Should everyone see this?

  // Visuals
  image_url: 'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&w=800&q=80',
  cap_url: '🍺', // Emoji or URL

  // Technical Data (Flexible JSON)
  data: {
    // For BEER
    abv: 7.8,          // Alcohol by Volume %
    ibu: 32,           // Bitterness
    og: 1.061,         // Original Gravity (approx 15 Plato)
    fg: 1.004,         // Final Gravity (94% attenuation)
    color_ebc: 20,
    
    // Ingredients with Amounts
    hops: [
      { name: 'Hallertau Blanc', amount: 20, unit: 'g', usage: '60 min' },
      { name: 'Hallertau Blanc', amount: 20, unit: 'g', usage: '10 min' },
      { name: 'Hallertau Blanc', amount: 20, unit: 'g', usage: '5 min' },
      { name: 'Hallertau Blanc', amount: 40, unit: 'g', usage: 'Whirlpool' },
      { name: 'Hallertau Blanc', amount: 40, unit: 'g', usage: 'Dry Hop' }
    ], 
    malts: [
      { name: 'Pilsener Malz', amount: 2.92, unit: 'kg' },
      { name: 'Weizenmalz', amount: 0.94, unit: 'kg' },
      { name: 'Roggenmalz', amount: 0.55, unit: 'kg' },
      { name: 'Spitzmalz', amount: 0.55, unit: 'kg' },
      { name: 'Wiener Malz', amount: 0.55, unit: 'kg' }
    ],
    yeast: 'WHC Farmhouse Vibes',
    
    // Structured Mash Schedule
    mash_steps: [
      { name: 'Kombirast', temperature: '67', duration: '70' }
    ],

    // Brewing Steps
    steps: [
      { title: 'Läutern', instruction: 'Vorderwürze abziehen und Nachguss geben.' },
      { title: 'Kochen', instruction: 'Würze 60 Minuten kochen. Hopfengaben laut Plan.' },
      { title: 'Gärung', instruction: 'Gärtemperatur: 17°C.' }
    ]
  }
};

// ==========================================
// 🚀 SCRIPT LOGIC (DO NOT EDIT BELOW)
// ==========================================

async function createRecipe() {
  console.log(`\n🧪 Brewing new recipe: "${RECIPE.name}"...`);

  // 1. Insert into 'brews' table
  const { data: brewData, error: brewError } = await supabase
    .from('brews')
    .insert({
      user_id: RECIPE.user_id,
      brewery_id: RECIPE.brewery_id,
      name: RECIPE.name,
      style: RECIPE.style,
      brew_type: RECIPE.brew_type,
      description: RECIPE.description,
      is_public: RECIPE.is_public,
      image_url: RECIPE.image_url,
      cap_url: RECIPE.cap_url,
      data: RECIPE.data,
      created_at: new Date()
    })
    .select()
    .single();

  if (brewError) {
    console.error('❌ Error creating brew:', brewError.message);
    return;
  }

  console.log(`✅ Recipe created! ID: ${brewData.id}`);

  // 2. Add to Feed (Activity Log)
  const { error: feedError } = await supabase
    .from('brewery_feed')
    .insert({
      brewery_id: RECIPE.brewery_id,
      user_id: RECIPE.user_id,
      type: 'BREW_CREATED',
      content: {
        brew_id: brewData.id,
        brew_name: brewData.name,
        message: 'hat ein neues Rezept erstellt'
      }
    });

  if (feedError) {
    console.warn('⚠️ Warning: Feed entry could not be created:', feedError.message);
  } else {
    console.log('📢 Feed updated.');
  }

  console.log('\n🎉 Done. Detailed JSON:');
  console.log(JSON.stringify(brewData, null, 2));
}

createRecipe();
