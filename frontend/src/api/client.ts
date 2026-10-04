import axios, { AxiosInstance } from 'axios';
import { readStoredString } from '../lib/storage';

export const TOKEN_KEY = 'tr_token';
// Set when a trusted helper works for an owner (access app, X-Acting-For).
export const ACTING_FOR_KEY = 'tr_acting_for';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
});

// Add CSRF token to POST/PUT requests
apiClient.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  const token = readStoredString(TOKEN_KEY);
  if (token) config.headers['Authorization'] = `Token ${token}`;
  const actingFor = readStoredString(ACTING_FOR_KEY);
  if (actingFor) config.headers['X-Acting-For'] = actingFor;
  return config;
});

export default apiClient;

export const authApi = {
  register: async (email: string, password: string) => {
    return apiClient.post('/auth/register', { email, password });
  },
  login: async (email: string, password: string) => {
    return apiClient.post('/auth/login', { email, password });
  },
  logout: async () => {
    return apiClient.post('/auth/logout');
  },
  getProfile: async () => {
    return apiClient.get('/profile/');
  },
  updateProfile: async (data: any) => {
    return apiClient.put('/profile/', data);
  },
};

export const documentsApi = {
  list: async () => {
    return apiClient.get('/documents/');
  },
  upload: async (file: File, docType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    return apiClient.post('/documents/', formData);
  },
  delete: async (id: number) => {
    return apiClient.delete(`/documents/${id}/`);
  },
};

export const tendersApi = {
  list: async () => {
    return apiClient.get('/tenders/');
  },
  detail: async (id: number) => {
    return apiClient.get(`/tenders/${id}/`);
  },
  // Uploads a tender PDF; the backend extracts it and runs the readiness check.
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/tenders/', formData);
  },
};

export const alertsApi = {
  list: async () => {
    return apiClient.get('/alerts/');
  },
  markRead: async (id: number) => {
    return apiClient.post(`/alerts/${id}/read/`);
  },
};

export const assistantApi = {
  ask: async (question: string) => {
    return apiClient.post('/assistant/ask/', { question });
  },
};

export const accessApi = {
  getPrefs: () => apiClient.get('/access/prefs/'),
  savePrefs: (prefs: object) => apiClient.put('/access/prefs/', prefs),
  getAgpo: () => apiClient.get('/access/agpo/'),
  setAgpoCategory: (agpo_category: string) => apiClient.put('/access/agpo/', { agpo_category }),
  listHelpers: () => apiClient.get('/access/helpers/'),
  inviteHelper: (data: object) => apiClient.post('/access/helpers/', data),
  setHelperPermission: (id: number, permission: string) =>
    apiClient.patch(`/access/helpers/${id}/`, { permission }),
  removeHelper: (id: number) => apiClient.delete(`/access/helpers/${id}/`),
  acceptInvite: (token: string) => apiClient.post('/access/helpers/accept/', { token }),
  helperActivity: () => apiClient.get('/access/helpers/activity/'),
  listLetters: () => apiClient.get('/access/letters/'),
  draftLetter: (data: object) => apiClient.post('/access/letters/', data),
  saveLetter: (id: number, letter_text: string) =>
    apiClient.patch(`/access/letters/${id}/`, { letter_text }),
};
