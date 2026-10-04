import axios, { AxiosInstance } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Add CSRF token to POST/PUT requests
apiClient.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
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
  check: async (tenderOrText: File | string) => {
    const formData = new FormData();
    if (tenderOrText instanceof File) {
      formData.append('file', tenderOrText);
    } else {
      formData.append('text', tenderOrText);
    }
    return apiClient.post('/tender-checks/', formData);
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
