import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const api = axios.create({ baseURL: API_BASE });

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('hearth_token', token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('hearth_token');
    delete api.defaults.headers.common.Authorization;
  }
}

export function bootstrapAuth() {
  const token = localStorage.getItem('hearth_token');
  if (token) setAuthToken(token);
  return token;
}
