import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Newsletter API
export const newsletterApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/newsletters', { params }),

  getLatest: () =>
    api.get('/newsletters/latest'),

  getById: (id: string) =>
    api.get(`/newsletters/${id}`),

  create: (data: { maxArticles?: number; autoPublish?: boolean }) =>
    api.post('/newsletters', data),

  generate: (data: { maxArticles?: number; autoPublish?: boolean }) =>
    api.post('/newsletters/generate', data),

  publish: (id: string) =>
    api.patch(`/newsletters/${id}/publish`),

  archive: (id: string) =>
    api.patch(`/newsletters/${id}/archive`),

  delete: (id: string) =>
    api.delete(`/newsletters/${id}`),
};

// Sources API
export const sourcesApi = {
  getAll: () =>
    api.get('/sources'),

  getById: (id: string) =>
    api.get(`/sources/${id}`),

  create: (data: {
    name: string;
    url: string;
    type: 'RSS' | 'WEBSITE' | 'API';
    category?: string;
    isActive?: boolean;
  }) =>
    api.post('/sources', data),

  update: (id: string, data: Partial<{
    name: string;
    url: string;
    type: 'RSS' | 'WEBSITE' | 'API';
    category: string;
    isActive: boolean;
  }>) =>
    api.patch(`/sources/${id}`, data),

  delete: (id: string) =>
    api.delete(`/sources/${id}`),

  fetch: (id: string) =>
    api.post(`/sources/${id}/fetch`),

  fetchAll: () =>
    api.post('/sources/fetch-all'),
};

// Articles API
export const articlesApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    sourceId?: string;
    isProcessed?: boolean;
    isIncluded?: boolean;
    search?: string;
  }) =>
    api.get('/articles', { params }),

  getById: (id: string) =>
    api.get(`/articles/${id}`),

  update: (id: string, data: { isIncluded?: boolean; summary?: string }) =>
    api.patch(`/articles/${id}`, data),

  delete: (id: string) =>
    api.delete(`/articles/${id}`),

  getStats: () =>
    api.get('/articles/stats/overview'),
};

export default api;
