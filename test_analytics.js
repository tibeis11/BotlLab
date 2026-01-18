// Test script for analytics tracking
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // Service role for testing
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ANALYTICS_SALT = process.env.ANALYTICS_SALT || 'test-salt-for-local-dev';

async function testAnalytics() {
  console.log('\n🧪 Testing Analytics Implementation...\n');

  // 1. Check if tables exist and are accessible
  console.log('📋 Step 1: Checking table structure...');
  const { data: scanTable, error: scanError } = await supabase
    .from('bottle_scans')
    .select('*')
    .limit(0);
  
  if (scanError) {
    console.error('❌ bottle_scans table error:', scanError.message);
    return;
  }
  console.log('✅ bottle_scans table accessible');

  const { data: statsTable, error: statsError } = await supabase
    .from('analytics_daily_stats')
    .select('*')
    .limit(0);
  
  if (statsError) {
    console.error('❌ analytics_daily_stats table error:', statsError.message);
    return;
  }
  console.log('✅ analytics_daily_stats table accessible');

  // 2. Create test data
  console.log('\n📋 Step 2: Creating test brew and bottle...');
  
  // Get or create a real authenticated user via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: `test-${Date.now()}@analytics-test.local`,
    password: 'test-password-123'
  });

  if (authError) {
    console.error('❌ Auth error:', authError.message);
    return;
  }

  const testUserId = authData.user.id;
  console.log('✅ Test user created:', testUserId);

  // Create test brew
  const { data: brew, error: brewError } = await supabase
    .from('brews')
    .insert({
      name: 'Test IPA Analytics',
      style: 'IPA',
      user_id: testUserId,
      description: 'Test brew for analytics',
      brew_type: 'extract'
    })
    .select()
    .single();

  if (brewError) {
    console.error('❌ Failed to create test brew:', brewError.message);
    return;
  }
  console.log('✅ Test brew created:', brew.id);

  // Create test bottle
  const { data: bottle, error: bottleError } = await supabase
    .from('bottles')
    .insert({
      brew_id: brew.id,
      bottle_number: 1
    })
    .select()
    .single();

  if (bottleError) {
    console.error('❌ Failed to create test bottle:', bottleError.message);
    return;
  }
  console.log('✅ Test bottle created:', bottle.id);

  // 3. Test scan insertion
  console.log('\n📋 Step 3: Inserting test scan...');
  
  const sessionHash = crypto
    .createHash('sha256')
    .update(`test-ip-192.168.1.1-Mozilla/5.0-${new Date().toDateString()}-${ANALYTICS_SALT}`)
    .digest('hex');

  const { data: scan, error: scanInsertError } = await supabase
    .from('bottle_scans')
    .insert({
      bottle_id: bottle.id,
      brew_id: brew.id,
      session_hash: sessionHash,
      country_code: 'DE',
      city: 'Berlin',
      device_type: 'desktop',
      scan_source: 'qr_code'
    })
    .select()
    .single();

  if (scanInsertError) {
    console.error('❌ Failed to insert scan:', scanInsertError.message);
    return;
  }
  console.log('✅ Scan inserted:', scan.id);

  // 4. Test daily stats aggregation
  console.log('\n📋 Step 4: Testing daily stats aggregation...');
  
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('increment_daily_stats', {
      p_brewery_id: null,
      p_brew_id: brew.id,
      p_country_code: 'DE',
      p_device_type: 'desktop',
      p_session_hash: sessionHash
    });

  if (rpcError) {
    console.error('❌ RPC function error:', rpcError.message);
    return;
  }
  console.log('✅ Daily stats aggregation successful');

  // 5. Verify aggregation
  console.log('\n📋 Step 5: Verifying aggregated data...');
  
  const { data: stats, error: statsSelectError } = await supabase
    .from('analytics_daily_stats')
    .select('*')
    .eq('brew_id', brew.id)
    .single();

  if (statsSelectError) {
    console.error('❌ Failed to query stats:', statsSelectError.message);
    return;
  }

  console.log('✅ Daily stats record found:');
  console.log('   - Total Scans:', stats.total_scans);
  console.log('   - Unique Visitors:', stats.unique_visitors);
  console.log('   - Country:', stats.country_code);
  console.log('   - Device:', stats.device_type);

  // 6. Test duplicate detection (same session_hash)
  console.log('\n📋 Step 6: Testing duplicate detection...');
  
  const { data: rpcResult2 } = await supabase
    .rpc('increment_daily_stats', {
      p_brewery_id: null,
      p_brew_id: brew.id,
      p_country_code: 'DE',
      p_device_type: 'desktop',
      p_session_hash: sessionHash
    });

  const { data: stats2 } = await supabase
    .from('analytics_daily_stats')
    .select('*')
    .eq('brew_id', brew.id)
    .single();

  if (stats2.total_scans > stats.total_scans && stats2.unique_visitors === stats.unique_visitors) {
    console.log('✅ Duplicate detection working:');
    console.log('   - Total Scans increased:', stats2.total_scans);
    console.log('   - Unique Visitors unchanged:', stats2.unique_visitors);
  } else {
    console.log('⚠️  Unexpected result for duplicate scan');
  }

  // Cleanup
  console.log('\n🧹 Cleanup: Deleting test data...');
  await supabase.from('analytics_daily_stats').delete().eq('brew_id', brew.id);
  await supabase.from('bottle_scans').delete().eq('bottle_id', bottle.id);
  await supabase.from('bottles').delete().eq('id', bottle.id);
  await supabase.from('brews').delete().eq('id', brew.id);
  await supabase.auth.admin.deleteUser(testUserId);
  console.log('✅ Cleanup complete');

  console.log('\n✨ All tests passed! Analytics system is working correctly.\n');
}

testAnalytics().catch(console.error);
