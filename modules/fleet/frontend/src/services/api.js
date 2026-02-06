const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => localStorage.getItem('token');

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Network error' } }));
    throw new Error(error.error?.message || 'Request failed');
  }

  return response.json();
};

// Auth API
export const authAPI = {
  login: (email, password) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getMe: () => apiCall('/auth/me'),

  changePassword: (currentPassword, newPassword) =>
    apiCall('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// Trucks API
export const trucksAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/trucks${query ? `?${query}` : ''}`);
  },

  getById: (id) => apiCall(`/trucks/${id}`),

  create: (data) =>
    apiCall('/trucks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiCall(`/trucks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/trucks/${id}`, {
      method: 'DELETE',
    }),

  getStats: () => apiCall('/trucks/stats/summary'),
};

// Drivers API
export const driversAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/drivers${query ? `?${query}` : ''}`);
  },

  getById: (id) => apiCall(`/drivers/${id}`),

  create: (data) =>
    apiCall('/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiCall(`/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  assign: (id, truckId) =>
    apiCall(`/drivers/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ truck_id: truckId }),
    }),

  delete: (id) =>
    apiCall(`/drivers/${id}`, {
      method: 'DELETE',
    }),
};

// GPS API
export const gpsAPI = {
  getFleetLocations: () => apiCall('/gps/fleet/current'),

  getLatest: (truckId) => apiCall(`/gps/${truckId}/latest`),

  getHistory: (truckId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/gps/${truckId}/history${query ? `?${query}` : ''}`);
  },
};

// Fuel API
export const fuelAPI = {
  recordFuel: (data) =>
    apiCall('/fuel', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getHistory: (truckId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/fuel/${truckId}/history${query ? `?${query}` : ''}`);
  },

  getStats: () => apiCall('/fuel/stats/summary'),

  getWeeklyStats: () => apiCall('/fuel/stats/weekly'),
};

// Maintenance API
export const maintenanceAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/maintenance${query ? `?${query}` : ''}`);
  },

  getById: (id) => apiCall(`/maintenance/${id}`),

  create: (data) =>
    apiCall('/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiCall(`/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/maintenance/${id}`, {
      method: 'DELETE',
    }),

  getStats: () => apiCall('/maintenance/stats/summary'),
};

// Alerts API
export const alertsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/alerts${query ? `?${query}` : ''}`);
  },

  getActive: () => apiCall('/alerts/active'),

  acknowledge: (id) =>
    apiCall(`/alerts/${id}/acknowledge`, {
      method: 'PUT',
    }),

  acknowledgeAll: (data = {}) =>
    apiCall('/alerts/acknowledge-all', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getStats: (days = 7) => apiCall(`/alerts/stats/summary?days=${days}`),
};

const api = {
  auth: authAPI,
  trucks: trucksAPI,
  drivers: driversAPI,
  gps: gpsAPI,
  fuel: fuelAPI,
  maintenance: maintenanceAPI,
  alerts: alertsAPI,
};

export default api;
