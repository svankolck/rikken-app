import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

const client = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_SERVICE_KEY);

// Check profiles tabel
const { data: profilesData } = await client.from('profiles').select('*').limit(1);
console.log('=== PROFILES COLUMNS ===');
console.log(profilesData?.[0] ? Object.keys(profilesData[0]).join(', ') : 'Geen data');

// Check spelers tabel
const { data: spelersData } = await client.from('spelers').select('*').limit(1);
console.log('\n=== SPELERS COLUMNS ===');
console.log(spelersData?.[0] ? Object.keys(spelersData[0]).join(', ') : 'Geen data');

// Check locaties tabel
const { data: locatiesData } = await client.from('locaties').select('*').limit(1);
console.log('\n=== LOCATIES COLUMNS ===');
console.log(locatiesData?.[0] ? Object.keys(locatiesData[0]).join(', ') : 'Geen data');

// Check spelavonden tabel
const { data: spelavondenData } = await client.from('spelavonden').select('*').limit(1);
console.log('\n=== SPELAVONDEN COLUMNS ===');
console.log(spelavondenData?.[0] ? Object.keys(spelavondenData[0]).join(', ') : 'Geen data');
