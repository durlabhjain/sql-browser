import { auth } from '$stores/auth';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Make API request with authentication
 */
export async function apiRequest(endpoint, options = {}) {
  const authState = get(auth);
  const url = `${API_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authState.token) {
    headers['Authorization'] = `Bearer ${authState.token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle 401 - Unauthorized
    if (response.status === 401) {
      auth.logout();
      goto('/login');
      throw new Error('Session expired. Please login again.');
    }

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

/**
 * Auth API
 */
export const authApi = {
  login: async (username, password) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  logout: async () => {
    return apiRequest('/api/auth/logout', {
      method: 'POST'
    });
  },

  getMe: async () => {
    return apiRequest('/api/auth/me');
  },

  changePassword: async (currentPassword, newPassword) => {
    return apiRequest('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }
};

/**
 * Connection API
 */
export const connectionApi = {
  list: async () => {
    return apiRequest('/api/connections');
  },

  get: async (id) => {
    return apiRequest(`/api/connections/${id}`);
  }
};

/**
 * Query API
 */
export const queryApi = {
  execute: async (connectionId, sql) => {
    return apiRequest('/api/query/execute', {
      method: 'POST',
      body: JSON.stringify({ connectionId, sql })
    });
  },

  cancel: async (queryId) => {
    return apiRequest(`/api/query/cancel/${queryId}`, {
      method: 'POST'
    });
  },

  getHistory: async (params = {}) => {
    const queryParams = new URLSearchParams(params);
    return apiRequest(`/api/query/history?${queryParams}`);
  },

  getHistoryItem: async (id) => {
    return apiRequest(`/api/query/history/${id}`);
  },

  getRunning: async () => {
    return apiRequest('/api/query/running');
  },

  getStats: async (days = 30) => {
    return apiRequest(`/api/query/stats?days=${days}`);
  }
};

/**
 * Admin API
 */
export const adminApi = {
  // Users
  listUsers: async (params = {}) => {
    const queryParams = new URLSearchParams(params);
    return apiRequest(`/api/admin/users?${queryParams}`);
  },

  createUser: async (userData) => {
    return apiRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  getUser: async (id) => {
    return apiRequest(`/api/admin/users/${id}`);
  },

  updateUser: async (id, updates) => {
    return apiRequest(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  deleteUser: async (id) => {
    return apiRequest(`/api/admin/users/${id}`, {
      method: 'DELETE'
    });
  },

  // Connections
  listConnections: async (includeInactive = false) => {
    return apiRequest(`/api/admin/connections?includeInactive=${includeInactive}`);
  },

  createConnection: async (connectionData) => {
    return apiRequest('/api/admin/connections', {
      method: 'POST',
      body: JSON.stringify(connectionData)
    });
  },

  getConnection: async (id) => {
    return apiRequest(`/api/admin/connections/${id}`);
  },

  updateConnection: async (id, updates) => {
    return apiRequest(`/api/admin/connections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  deleteConnection: async (id) => {
    return apiRequest(`/api/admin/connections/${id}`, {
      method: 'DELETE'
    });
  },

  testConnection: async (id) => {
    return apiRequest(`/api/admin/connections/${id}/test`, {
      method: 'POST'
    });
  },

  // Stats
  getStats: async () => {
    return apiRequest('/api/admin/stats');
  }
};
