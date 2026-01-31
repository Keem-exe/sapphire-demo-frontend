/**
 * Configuration for backend API integration
 */

export const API_CONFIG = {
  // Backend base URL from environment variable
  baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
  
  // API endpoints
  endpoints: {
    // Quiz endpoints
    quiz: {
      generate: '/api/quiz/generate',
      submit: '/api/quiz/submit',
      grade: '/api/quiz/grade',
    },
    
    // Flashcards endpoints
    flashcards: {
      generate: '/api/flashcards/generate',
      list: '/api/flashcards',
    },
    
    // Chat endpoints
    chat: {
      send: '/api/chat',
    },
    
    // YouTube Shorts endpoints
    shorts: {
      fetch: '/api/shorts',
    },
    
    // User endpoints (if backend handles auth)
    auth: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      logout: '/api/auth/logout',
    },
  },
  
  // Request timeout (ms)
  timeout: 30000,
  
  // Retry configuration
  retry: {
    attempts: 3,
    delay: 1000,
  },
};

/**
 * Check if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
}

/**
 * Get full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.baseUrl}${endpoint}`;
}
