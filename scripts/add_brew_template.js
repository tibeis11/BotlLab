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
  user_id: 'a2e7b77d-b267-431a-802b-66d2521aef29', // REPLACE WITH YOUR USER ID
  brewery_id: '0fc4048a-9683-438f-84cb-7e1d235c1553', // REPLACE WITH YOUR SQUAD ID

  // Basic Info
  name: 'Summer Ale 2026',
  brew_type: 'beer', // Options: 'beer', 'wine', 'softdrink', 'cider', 'mead'
  style: 'Pale Ale',
  description: 'Ein leichtes Sommerbier für heiße Tage.',
  is_public: true, // Should everyone see this?

  // Visuals
  image_url: 'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&w=800&q=80',
  cap_url: '🍺', // Emoji or URL

  // Technical Data (Flexible JSON)
  data: {
    // For BEER
    abv: 5.2,          // Alcohol by Volume %
    ibu: 35,           // Bitterness
    og: 1.050,         // Original Gravity
    fg: 1.010,         // Final Gravity
    
    // Ingredients with Amounts
    hops: [
      { name: 'Citra', amount: 20, unit: 'g' },
      { name: 'Mosaic', amount: 15, unit: 'g' }
    ], 
    malts: [
      { name: 'Maris Otter', amount: 4, unit: 'kg' },
      { name: 'Caramel 20', amount: 0.5, unit: 'kg' }
    ],
    yeast: 'US-05',
    
    // Brewing Steps
    steps: [
      { title: 'Maischen', instruction: 'Malz bei 67°C für 60 Minuten rasten lassen.' },
      { title: 'Läutern', instruction: 'Vorderwürze abziehen und Nachguss geben.' },
      { title: 'Kochen', instruction: 'Würze für 60 Minuten kochen. Hopfen nach Plan zugeben.' },
      { title: 'Gärung', instruction: 'Hefe bei 20°C zugeben und gären lassen.' }
    ],

    // For WINE (comment out if beer)
    // grapes: 'Riesling',
    // vintage: 2025,
    // region: 'Mosel',

    // For CIDER
    // apples: 'Braeburn, Granny Smith',

    // For MEAD
    // honey: 'Waldhonig',
    // adjuncts: 'Zim, Nelken',

    // For SOFTDRINK
    // base: 'Lemon',
    // sugar: 50, // g/l
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
