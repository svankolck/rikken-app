import { createClient } from '@supabase/supabase-js';

// Support both Vite (import.meta.env) and Node.js (process.env)
const getEnv = (key) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key];
    }
    return process.env[key];
};

// Regular Supabase client (voor normale users)
const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables!');
}

// Agent Supabase client (voor admin/agent operaties)
const supabaseServiceKey = getEnv('VITE_SUPABASE_SERVICE_KEY');

if (!supabaseServiceKey) {
    console.warn('⚠️ Agent mode disabled: Missing VITE_SUPABASE_SERVICE_KEY');
}

// Create agent client with service role key
export const supabaseAgent = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

// Helper: Check if running as agent
export const isAgentMode = () => {
    return !!supabaseServiceKey && !!supabaseAgent;
};

// Helper: Get info about agent mode
export const getAgentInfo = () => {
    return {
        enabled: isAgentMode(),
        hasServiceKey: !!supabaseServiceKey,
        url: supabaseUrl
    };
};

// Log agent status on load
if (isAgentMode()) {
    console.log('✅ Agent mode enabled - Full database access available');
} else {
    console.log('ℹ️ Agent mode disabled - Using regular user client');
}
