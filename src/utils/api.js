/**
 * API utility functions with automatic JWT token injection
 */

// Helper function to handle token expiration/invalid token
function handleTokenError() {
  // Remove invalid token from localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Dispatch custom event to notify App component about logout
  window.dispatchEvent(new CustomEvent('tokenExpired'));
  
  // Redirect to login page
  // Using window.location.href ensures full page reload so App.jsx detects no token
  window.location.href = '/login';
}

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log('🔍 API Call:', url, { token: !!token, method: options.method || 'GET' });

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    console.log('📡 API Response:', url, response.status, response.ok);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ API Error:', url, response.status, errorData);
      
      // Handle 401 Unauthorized (token expired/invalid)
      if (response.status === 401) {
        let errorMessage = 'Je sessie is verlopen. Log opnieuw in.';
        
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.error === 'Invalid token' || errorJson.error === 'No token provided') {
            // Token is ongeldig of verlopen - log automatisch uit
            console.warn('⚠️ Token is ongeldig of verlopen, logging uit...');
            handleTokenError();
            errorMessage = 'Je sessie is verlopen. Je wordt nu uitgelogd.';
          }
        } catch (e) {
          // Error data is niet JSON, gebruik standaard bericht
        }
        
        throw new Error(errorMessage);
      }
      
      throw new Error(`API Error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ API Success:', url, data);
    return data;
  } catch (error) {
    console.error('💥 API Fetch Error:', url, error);
    throw error;
  }
}

export default apiFetch;