// Complete agent system test
import { readFileSync } from 'fs';

// Parse .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

// Set environment variables
process.env.VITE_SUPABASE_URL = envVars.VITE_SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;
process.env.VITE_SUPABASE_SERVICE_KEY = envVars.VITE_SUPABASE_SERVICE_KEY;
process.env.VITE_AGENT_API_KEY = envVars.VITE_AGENT_API_KEY;

// Import modules
const { agentDb, getStats, getAgentInfo } = await import('./src/lib/agent-helpers.js');
const { verifyApiKey, isValidApiKey } = await import('./src/lib/auth-middleware.js');
const { isAgentMode } = await import('./src/lib/supabase-agent.js');

console.log('🤖 COMPLETE AGENT SYSTEM TEST\n');
console.log('='.repeat(50));

// Test 1: Agent Mode Check
console.log('\n📋 Test 1: Agent Mode Status');
console.log('Agent mode active:', isAgentMode());
const agentInfo = getAgentInfo();
console.log('Agent info:', JSON.stringify(agentInfo, null, 2));

// Test 2: API Key Verification
console.log('\n📋 Test 2: API Key Verification');
const apiKey = process.env.VITE_AGENT_API_KEY;
console.log('API Key:', apiKey.substring(0, 20) + '...');

try {
    const auth = await verifyApiKey(apiKey);
    console.log('✅ API key verified successfully');
    console.log('   Name:', auth.name);
    console.log('   Role:', auth.role);
    console.log('   Permissions:', JSON.stringify(auth.permissions, null, 2));
} catch (err) {
    console.error('❌ API key verification failed:', err.message);
}

// Test 3: Invalid API Key
console.log('\n📋 Test 3: Invalid API Key Rejection');
const invalidKey = 'agt_invalid_key_12345';
const isValid = await isValidApiKey(invalidKey);
console.log('Invalid key correctly rejected:', !isValid ? '✅' : '❌');

// Test 4: Database Operations
console.log('\n📋 Test 4: Database Read Operations');
try {
    const spelers = await agentDb.getSpelers();
    console.log('✅ Spelers fetched:', spelers.length, 'found');
    console.log('   Names:', spelers.map(s => s.naam).join(', '));

    const spelavonden = await agentDb.getSpelavonden(5);
    console.log('✅ Spelavonden fetched:', spelavonden.length, 'found');

    const profiles = await agentDb.getProfiles();
    console.log('✅ Profiles fetched:', profiles.length, 'found');

    const locaties = await agentDb.getLocaties();
    console.log('✅ Locaties fetched:', locaties.length, 'found');
} catch (err) {
    console.error('❌ Database read failed:', err.message);
}

// Test 5: Statistics
console.log('\n📋 Test 5: Get Statistics');
try {
    const stats = await getStats();
    console.log('✅ Statistics retrieved:');
    console.log(JSON.stringify(stats, null, 2));
} catch (err) {
    console.error('❌ Stats failed:', err.message);
}

// Test 6: API Keys Management
console.log('\n📋 Test 6: API Keys Management');
try {
    const apiKeys = await agentDb.getApiKeys();
    console.log('✅ API keys in database:', apiKeys.length);
    apiKeys.forEach(key => {
        console.log(`   - ${key.name} (${key.role})`);
        console.log(`     Created: ${new Date(key.created_at).toLocaleDateString()}`);
        console.log(`     Last used: ${key.last_used ? new Date(key.last_used).toLocaleString() : 'Never'}`);
        console.log(`     Active: ${key.is_active ? '✅' : '❌'}`);
    });
} catch (err) {
    console.error('❌ API keys fetch failed:', err.message);
}

console.log('\n' + '='.repeat(50));
console.log('🎉 AGENT SYSTEM TEST COMPLETE!\n');
