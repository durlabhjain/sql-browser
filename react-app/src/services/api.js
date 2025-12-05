import axios from 'axios';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login if needed
      console.error('Unauthorized access - please login');
      // You can add redirect logic here
    }
    return Promise.reject(error);
  }
);

// Outlets API
export const outletsApi = {
  /**
   * Fetch outlets with pagination
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Number of items per page
   * @param {number} params.offset - Offset for pagination
   * @param {string} params.search - Search term for filtering
   */
  getOutlets: async ({ limit = 20, offset = 0, search = '' }) => {
    const response = await apiClient.get('/outlets', {
      params: { limit, offset, search }
    });
    return response.data;
  },

  /**
   * Get a single outlet by ID
   * @param {string} id - Outlet ID
   */
  getOutlet: async (id) => {
    const response = await apiClient.get(`/outlets/${id}`);
    return response.data;
  },

  /**
   * Create a new outlet (admin only)
   * @param {Object} outlet - Outlet data
   */
  createOutlet: async (outlet) => {
    const response = await apiClient.post('/outlets', outlet);
    return response.data;
  },

  /**
   * Update an outlet (admin only)
   * @param {string} id - Outlet ID
   * @param {Object} updates - Fields to update
   */
  updateOutlet: async (id, updates) => {
    const response = await apiClient.put(`/outlets/${id}`, updates);
    return response.data;
  },

  /**
   * Delete an outlet (admin only)
   * @param {string} id - Outlet ID
   */
  deleteOutlet: async (id) => {
    const response = await apiClient.delete(`/outlets/${id}`);
    return response.data;
  }
};

// Auth API
export const authApi = {
  /**
   * Login user
   * @param {string} username
   * @param {string} password
   */
  login: async (username, password) => {
    const response = await apiClient.post('/auth/login', {
      username,
      password
    });

    // Store token in localStorage
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }

    return response.data;
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('authToken');
    }
  }
};

export default apiClient;
