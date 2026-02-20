import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hearth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hearth_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth
export const auth = {
  getUser: () => api.get('/auth/me'),
  loginUrl: () => `${API_BASE}/auth/google`,
};

// Family
export const family = {
  get: () => api.get('/api/family'),
  create: (name) => api.post('/api/family', { name }),
  join: (inviteCode) => api.post('/api/family/join', { inviteCode }),
};

// Sources
export const sources = {
  list: () => api.get('/api/sources'),
  create: (data) => api.post('/api/sources', data),
  remove: (id) => api.delete(`/api/sources/${id}`),
};

// Feed
export const feed = {
  list: (params) => api.get('/api/feed', { params }),
  confirm: (id, data) => api.post(`/api/feed/${id}/confirm`, data || {}),
  dismiss: (id) => api.post(`/api/feed/${id}/dismiss`),
};

// Calendar
export const calendar = {
  get: (start, end) => api.get('/api/calendar', { params: { start, end } }),
  sync: () => api.post('/api/calendar/sync'),
};

// Digest
export const digest = {
  get: () => api.get('/api/digest'),
};

// Settings
export const settings = {
  getAutonomy: () => api.get('/api/settings/autonomy'),
  updateAutonomy: (category, level) =>
    api.put('/api/settings/autonomy', { category, level }),
};

export default api;
