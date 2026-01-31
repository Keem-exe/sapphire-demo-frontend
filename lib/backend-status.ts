/**
 * Backend Status Checker
 * Tests if backend is reachable and displays connection status
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function checkBackendStatus(): Promise<{
  isOnline: boolean
  message: string
  endpoint: string
}> {
  try {
    // Try multiple possible health endpoints
    const endpoints = [
      '/api/health',
      '/health',
      '/api/status',
      '/',
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (response.ok) {
          return {
            isOnline: true,
            message: `Backend is online at ${BACKEND_URL}${endpoint}`,
            endpoint: `${BACKEND_URL}${endpoint}`,
          }
        }
      } catch (err) {
        // Try next endpoint
        continue
      }
    }

    return {
      isOnline: false,
      message: `Backend at ${BACKEND_URL} is not responding. Using offline mode with demo user.`,
      endpoint: BACKEND_URL,
    }
  } catch (error) {
    return {
      isOnline: false,
      message: `Failed to connect to backend: ${error}`,
      endpoint: BACKEND_URL,
    }
  }
}

export function getBackendUrl(): string {
  return BACKEND_URL
}
