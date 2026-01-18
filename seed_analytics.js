// Quick seed script for analytics test data
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Seeding analytics test data...\n');

  // 1. Create user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'test@analytics.test',
    password: 'test123456',
    email_confirm: true
  });

  if (authError) {
    console.log('User might already exist:', authError.message);
    // Try to get existing user
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(u => u.email === 'test@analytics.test');
    if (!existingUser) {
      console.error('Failed to create or find user');
      return;
    }
    console.log('✅ Using existing user:', existingUser.id);
    var userId = existingUser.id;
  } else {
    console.log('✅ User created:', authData.user.id);
    var userId = authData.user.id;
  }

  const breweryId = 'bbbbbbbb-cccc-dddd-eeee-000000000001';

  // 2. Add as brewery member
  const { error: memberError } = await supabase
    .from('brewery_members')
    .insert({
      brewery_id: breweryId,
      user_id: userId,
      role: 'owner'
    });

  if (memberError && !memberError.message.includes('duplicate')) {
    console.error('Member error:', memberError.message);
  } else {
    console.log('✅ User added as brewery owner');
  }

  // 3. Create brews
  const brews = [
    { id: 'cccccccc-dddd-eeee-ffff-000000000001', name: 'Test IPA', style: 'IPA' },
    { id: 'cccccccc-dddd-eeee-ffff-000000000002', name: 'Test Lager', style: 'Lager' }
  ];

  for (const brew of brews) {
    const { error } = await supabase.from('brews').insert({
      id: brew.id,
      name: brew.name,
      style: brew.style,
      user_id: userId,
      brewery_id: breweryId,
      brew_type: 'extract',
      description: 'Test brew for analytics'
    });

    if (error && !error.message.includes('duplicate')) {
      console.error(`Brew ${brew.name} error:`, error.message);
    } else {
      console.log(`✅ Brew created: ${brew.name}`);
    }
  }

  // 4. Create bottles
  for (let i = 0; i < brews.length; i++) {
    const { error } = await supabase.from('bottles').insert({
      brew_id: brews[i].id,
      bottle_number: 1
    });

    if (error && !error.message.includes('duplicate')) {
      console.error('Bottle error:', error.message);
    }
  }
  console.log('✅ Bottles created');

  // 5. Create analytics data (last 30 days)
  console.log('\n📊 Creating analytics data...');
  
  const countries = ['DE', 'AT', 'CH', 'US', 'GB'];
  const cities = ['Berlin', 'Munich', 'Vienna', 'Zurich'];
  const devices = ['mobile', 'desktop', 'tablet'];

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().slice(0, 10);

    // IPA - more scans
    const ipaScans = 5 + Math.floor(Math.random() * 15);
    for (let i = 0; i < ipaScans; i++) {
      const country = countries[Math.floor(Math.random() * countries.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      
      await supabase.rpc('increment_daily_stats', {
        p_brewery_id: breweryId,
        p_brew_id: brews[0].id,
        p_country_code: country,
        p_device_type: device,
        p_session_hash: `test-session-${dateStr}-${i}-${Math.random()}`
      });
    }

    // Lager - fewer scans
    const lagerScans = 2 + Math.floor(Math.random() * 8);
    for (let i = 0; i < lagerScans; i++) {
      const country = countries[Math.floor(Math.random() * countries.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      
      await supabase.rpc('increment_daily_stats', {
        p_brewery_id: breweryId,
        p_brew_id: brews[1].id,
        p_country_code: country,
        p_device_type: device,
        p_session_hash: `test-session-lager-${dateStr}-${i}-${Math.random()}`
      });
    }

    if ((dayOffset + 1) % 10 === 0) {
      console.log(`  Processed ${dayOffset + 1}/30 days...`);
    }
  }

  console.log('✅ Analytics data created');

  // 6. Show summary
  const { count: scanCount } = await supabase
    .from('analytics_daily_stats')
    .select('*', { count: 'exact', head: true })
    .eq('brewery_id', breweryId);

  console.log(`\n✨ Seed complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Daily Stats Records: ${scanCount}`);
  console.log(`\n🔑 Login Info:`);
  console.log(`   Email: test@analytics.test`);
  console.log(`   Password: test123456`);
  console.log(`   Brewery ID: ${breweryId}`);
  console.log(`\n🌐 Test URL: http://localhost:3000/team/${breweryId}/analytics`);
}

seed().catch(console.error);
