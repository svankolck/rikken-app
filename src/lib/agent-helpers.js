import { supabaseAgent, isAgentMode } from './supabase-agent.js';

/**
 * Agent Database Helpers
 * Deze functies kunnen alleen gebruikt worden in agent mode (met service key)
 */

// Helper om te checken of agent mode actief is
function requireAgentMode() {
    if (!isAgentMode()) {
        throw new Error('❌ Agent mode required - Missing VITE_SUPABASE_SERVICE_KEY');
    }
}

/**
 * SPELERS
 */
export const agentDb = {
    // Get alle spelers
    async getSpelers() {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('spelers')
            .select('*')
            .order('naam');

        if (error) throw error;
        return data;
    },

    // Get één speler by ID
    async getSpeler(id) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('spelers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Maak nieuwe speler
    async createSpeler(spelerData) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('spelers')
            .insert(spelerData)
            .select()
            .single();

        if (error) throw error;
        console.log(`✅ Speler aangemaakt: ${data.naam}`);
        return data;
    },

    // Update speler
    async updateSpeler(id, updates) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('spelers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        console.log(`✅ Speler geüpdatet: ${data.naam}`);
        return data;
    },

    // Delete speler
    async deleteSpeler(id) {
        requireAgentMode();
        const { error } = await supabaseAgent
            .from('spelers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        console.log(`✅ Speler verwijderd: ${id}`);
        return true;
    },

    /**
     * SPELAVONDEN
     */

    // Get alle spelavonden
    async getSpelavonden(limit = 50) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('spelavonden')
            .select('*')
            .order('datum', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    // Get één spelavond
    async getSpelavond(id) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('spelavonden')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Maak nieuwe spelavond
    async createSpelavond(spelavondData) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('spelavonden')
            .insert(spelavondData)
            .select()
            .single();

        if (error) throw error;
        console.log(`✅ Spelavond aangemaakt: ${data.datum}`);
        return data;
    },

    // Update spelavond
    async updateSpelavond(id, updates) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('spelavonden')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        console.log(`✅ Spelavond geüpdatet: ${id}`);
        return data;
    },

    /**
     * PROFILES
     */

    // Get alle profiles
    async getProfiles() {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('profiles')
            .select('*')
            .order('email');

        if (error) throw error;
        return data;
    },

    // Update profile
    async updateProfile(userId, updates) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        console.log(`✅ Profile geüpdatet: ${data.email}`);
        return data;
    },

    // Link profile aan speler
    async linkProfileToSpeler(userId, spelerId) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('profiles')
            .update({ speler_id: spelerId })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        console.log(`✅ Profile gelinkt aan speler: ${data.email} → ${spelerId}`);
        return data;
    },

    /**
     * LOCATIES
     */

    // Get alle locaties
    async getLocaties() {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('locaties')
            .select('*')
            .order('naam');

        if (error) throw error;
        return data;
    },

    // Maak nieuwe locatie
    async createLocatie(locatieData) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('locaties')
            .insert(locatieData)
            .select()
            .single();

        if (error) throw error;
        console.log(`✅ Locatie aangemaakt: ${data.naam}`);
        return data;
    },

    /**
     * API KEYS MANAGEMENT
     */

    // Get alle API keys (alleen voor monitoring)
    async getApiKeys() {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('api_keys')
            .select('id, name, role, created_at, last_used, expires_at, is_active')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Deactiveer een API key
    async deactivateApiKey(keyId) {
        requireAgentMode();
        const { data, error } = await supabaseAgent
            .from('api_keys')
            .update({ is_active: false })
            .eq('id', keyId)
            .select()
            .single();

        if (error) throw error;
        console.log(`✅ API key gedeactiveerd: ${data.name}`);
        return data;
    }
};

/**
 * Utility functies
 */

// Get statistics
export async function getStats() {
    requireAgentMode();

    const [spelers, spelavonden, profiles, locaties] = await Promise.all([
        agentDb.getSpelers(),
        agentDb.getSpelavonden(100),
        agentDb.getProfiles(),
        agentDb.getLocaties()
    ]);

    return {
        totalSpelers: spelers.length,
        totalSpelavonden: spelavonden.length,
        totalProfiles: profiles.length,
        totalLocaties: locaties.length,
        activeProfiles: profiles.filter(p => p.approved).length,
        recentSpelavonden: spelavonden.slice(0, 5)
    };
}

// Export info
export function getAgentInfo() {
    return {
        mode: isAgentMode() ? 'ACTIVE' : 'DISABLED',
        capabilities: isAgentMode()
            ? [
                'read_all_tables',
                'write_all_tables',
                'bypass_rls',
                'manage_users'
            ]
            : [],
        version: '1.0.0'
    };
}
