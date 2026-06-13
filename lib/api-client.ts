/**
 * API Client for Sapphire Backend
 * Handles requests to the deployed backend API
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (this.isRefreshing) return false;
    if (typeof window === 'undefined') return false;
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    this.isRefreshing = true;
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });
      if (!res.ok) return false;
      const body = await res.json();
      const newToken = body?.data?.token;
      if (!newToken) return false;
      localStorage.setItem('authToken', newToken);
      return true;
    } catch {
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  private mapErrorStatus(status: number, body: any): Error {
    if (status === 429) {
      const err: any = new Error('Too many requests — please slow down and try again shortly.');
      err.status = 429;
      return err;
    }
    if (status === 503) {
      const err: any = new Error('AI features are temporarily unavailable.');
      err.status = 503;
      return err;
    }
    const requestId = body?.requestId;
    if (status >= 500) {
      const msg = requestId
        ? `Something went wrong. Reference: ${requestId}`
        : (body?.error || body?.message || `Server error ${status}`);
      const err: any = new Error(msg);
      err.status = status;
      if (requestId) err.requestId = requestId;
      return err;
    }
    const msg = body?.error || body?.message || body?.detail || `API Error: ${status}`;
    const err: any = new Error(msg);
    err.status = status;
    return err;
  }

  private async fetchWithRetry(url: string, options: RequestInit, retried = false): Promise<Response> {
    const res = await fetch(url, { ...options, headers: this.getAuthHeaders() });

    if (res.status === 401 && !retried) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.fetchWithRetry(url, options, true);
      }
      // Refresh failed — clear tokens so the next request doesn't loop
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
    }

    return res;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const res = await this.fetchWithRetry(url.toString(), { method: 'GET' });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw this.mapErrorStatus(res.status, body);
    }

    return res.json();
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const res = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw this.mapErrorStatus(res.status, body);
      }

      return res.json();
    } catch (error: any) {
      if (error.status) throw error;
      const networkError: any = new Error(`Failed to connect to backend at ${this.baseUrl}. Please check your connection.`);
      networkError.name = 'NetworkError';
      throw networkError;
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const res = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw this.mapErrorStatus(res.status, body);
      }

      return res.json();
    } catch (error: any) {
      if (error.status) throw error;
      const networkError: any = new Error(`Failed to connect to backend at ${this.baseUrl}. Please check your connection.`);
      networkError.name = 'NetworkError';
      throw networkError;
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    try {
      const res = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw this.mapErrorStatus(res.status, body);
      }

      return res.json();
    } catch (error: any) {
      if (error.status) throw error;
      const networkError: any = new Error(`Failed to connect to backend at ${this.baseUrl}. Please check your connection.`);
      networkError.name = 'NetworkError';
      throw networkError;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export backend URL for direct use
export const getBackendUrl = () => BACKEND_URL;
