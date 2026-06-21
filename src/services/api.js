import axios from 'axios';

// Detect API URL at runtime — checks hostname FIRST to override build-time env
function getApiBaseURL() {
  // 1. Production: deployed on Cloudflare Pages — always use production backend
  if (typeof window !== 'undefined' && window.location.hostname.includes('pages.dev')) {
    return 'https://clinic-backend.suma-clinic.workers.dev/api';
  }
  // 2. Build-time env var (for local dev with custom backend)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 3. Local development fallback
  if (typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '5173')) {
    return 'http://localhost:3001/api';
  }
  return 'http://localhost:8787/api';
}

const api = axios.create({
  baseURL: getApiBaseURL(),
});

// Request interceptor to attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
