import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh', {
          refreshToken,
        });

        const { accessToken } = response.data.data;
        
        // Save new token
        localStorage.setItem('accessToken', accessToken);
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API calls
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// File API calls
export const fileApi = {
  upload: (formData, onUploadProgress) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      // Large files are chunked server-side; allow long uploads
      timeout: 0,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }),
  list: (params) => api.get('/files', { params }),
  search: (q, params) => api.get('/files/search', { params: { q, ...params } }),
  download: (id) => `${window.location.origin}/api/files/${id}/download`,
  preview: (id) => `${window.location.origin}/api/files/${id}/preview?access_token=${encodeURIComponent(localStorage.getItem('accessToken') || '')}`,
  delete: (id) => api.delete(`/files/${id}`),
  share: (id, data) => api.post(`/files/${id}/share`, data),
  versions: (id) => api.get(`/files/${id}/versions`),
  revert: (id, versionId) => api.post(`/files/${id}/revert/${versionId}`),
  rename: (id, displayFilename) => api.patch(`/files/${id}`, { displayFilename }),
  move: (id, folderId) => api.patch(`/files/${id}`, { folderId }),
  bulk: (action, fileIds, folderId) => api.post('/files/bulk', { action, fileIds, folderId }),
};

// Folder API calls
export const folderApi = {
  list: (parentFolderId = null) =>
    api.get('/folders', { params: { parentFolderId: parentFolderId ?? 'null' } }),
  create: (data) => api.post('/folders', data),
  rename: (id, name) => api.put(`/folders/${id}`, { name }),
  delete: (id) => api.delete(`/folders/${id}`),
};

// Telegram / user config API calls
export const userApi = {
  telegramStatus: () => api.get('/user/telegram/status'),
  connectTelegram: (data) => api.post('/user/telegram/connect', data),
  updateTelegram: (data) => api.put('/user/telegram/config', data),
  unlinkTelegram: () => api.delete('/user/telegram/unlink'),
};

// Multi-bot pool API calls
export const botApi = {
  list: () => api.get('/bots'),
  add: (token) => api.post('/bots', { token }),
  remove: (id) => api.delete(`/bots/${id}`),
};

// Share management API calls
export const shareApi = {
  list: (params) => api.get('/shares', { params }),
  revoke: (id) => api.delete(`/shares/${id}`),
};

// Stats API calls
export const statsApi = {
  storage: () => api.get('/stats/storage'),
  duplicates: () => api.get('/stats/duplicates'),
};

export default api;
