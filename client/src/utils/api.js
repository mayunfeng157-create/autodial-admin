import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API方法
export const auth = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (username, password) => api.post('/auth/register', { username, password }),
  me: () => api.get('/auth/me'),
};

export const contacts = {
  sync: (contacts, taskId) => api.post('/sync/contacts', { contacts, taskId }),
  list: (params) => api.get('/sync/contacts', { params }),
};

export const tasks = {
  list: () => api.get('/sync/tasks'),
  get: (id) => api.get(`/sync/tasks/${id}`),
  delete: (id) => api.delete(`/sync/tasks/${id}`),
};

export const recordings = {
  upload: (formData) => api.post('/upload/recording', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  list: (params) => api.get('/upload/recordings', { params }),
  get: (id) => api.get(`/upload/recordings/${id}`),
  delete: (id) => api.delete(`/upload/recordings/${id}`),
};

export const stats = {
  overview: () => api.get('/stats/overview'),
  daily: (days) => api.get('/stats/daily', { params: { days } }),
  task: (id) => api.get(`/stats/task/${id}`),
  export: (taskId) => api.get('/stats/export', { 
    params: { taskId },
    responseType: 'blob'
  }),
};

export default api;
