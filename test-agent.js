// Test script voor agent toegang
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Manually parse .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.VITE_SUPABASE_SERVICE_KEY;

console.log('🔍 Testing Agent Access...\n');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? '✅ Found' : '❌ Missing');
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing credentials!');
    process.exit(1);
}

// Create agent client
const supabaseAgent = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('✅ Agent client created\n');

// Test 1: List all tables
console.log('📋 Test 1: Checking database access...');
try {
    // Try to query spelers table
    const { data: spelers, error: spelersError } = await supabaseAgent
        .from('spelers')
        .select('id, naam')
        .limit(5);

    if (spelersError) {
        console.error('❌ Spelers query failed:', spelersError.message);
    } else {
        console.log('✅ Spelers table accessible');
        console.log(`   Found ${spelers.length} spelers:`, spelers.map(s => s.naam).join(', '));
    }
} catch (err) {
    console.error('❌ Error:', err.message);
}

console.log('');

// Test 2: Check profiles table
console.log('📋 Test 2: Checking profiles access...');
try {
    const { data: profiles, error: profilesError } = await supabaseAgent
        .from('profiles')
        .select('id, email, role')
        .limit(3);

    if (profilesError) {
        console.error('❌ Profiles query failed:', profilesError.message);
    } else {
        console.log('✅ Profiles table accessible');
        console.log(`   Found ${profiles.length} profiles`);
    }
} catch (err) {
    console.error('❌ Error:', err.message);
}

console.log('');
console.log('🎉 Agent access test complete!');
