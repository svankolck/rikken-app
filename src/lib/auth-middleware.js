import { supabaseAgent } from './supabase-agent.js';

/**
 * Verify API key tegen de database
 * @param {string} apiKey - De API key om te verifiëren
 * @returns {Promise<Object>} Auth info object
 */
export async function verifyApiKey(apiKey) {
    if (!apiKey) {
        throw new Error('No API key provided');
    }

    if (!apiKey.startsWith('agt_')) {
        throw new Error('Invalid API key format (must start with agt_)');
    }

    if (!supabaseAgent) {
        throw new Error('Agent mode not available - missing service key');
    }

    try {
        // Query de api_keys table
        const { data, error } = await supabaseAgent
            .from('api_keys')
            .select('*')
            .eq('key', apiKey)
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('API key verification error:', error);
            throw new Error('Invalid or inactive API key');
        }

        if (!data) {
            throw new Error('API key not found');
        }

        // Check expiration
        if (data.expires_at) {
            const expiresAt = new Date(data.expires_at);
            const now = new Date();

            if (expiresAt < now) {
                throw new Error('API key has expired');
            }
        }

        // Update last_used timestamp
        await supabaseAgent
            .from('api_keys')
            .update({ last_used: new Date().toISOString() })
            .eq('id', data.id);

        console.log(`✅ API key verified: ${data.name} (${data.role})`);

        return {
            isValid: true,
            keyId: data.id,
            name: data.name,
            role: data.role,
            permissions: data.permissions
        };
    } catch (err) {
        console.error('API key verification failed:', err.message);
        throw err;
    }
}

/**
 * Middleware wrapper voor API routes
 * @param {Function} handler - De route handler functie
 * @returns {Function} Wrapped handler met API key check
 */
export function requireApiKey(handler) {
    return async (req, ...args) => {
        // Haal API key uit headers
        const apiKey =
            req.headers?.get?.('X-API-Key') ||
            req.headers?.get?.('Authorization')?.replace('Bearer ', '') ||
            req.headers?.['x-api-key'] ||
            req.headers?.['authorization']?.replace('Bearer ', '');

        try {
            // Verify de API key
            const auth = await verifyApiKey(apiKey);

            // Voeg auth info toe aan request
            req.agentAuth = auth;

            // Call de originele handler
            return handler(req, ...args);
        } catch (error) {
            // Return 401 Unauthorized
            return new Response(
                JSON.stringify({
                    error: error.message,
                    authenticated: false
                }),
                {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }
    };
}

/**
 * Check of een API key geldig is (zonder error te throwen)
 * @param {string} apiKey - De API key om te checken
 * @returns {Promise<boolean>} True als geldig
 */
export async function isValidApiKey(apiKey) {
    try {
        await verifyApiKey(apiKey);
        return true;
    } catch {
        return false;
    }
}
