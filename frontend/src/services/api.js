import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;
export const WS_BASE = `${import.meta.env.VITE_API_URL.replace("https","wss")}/ws`;

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const url = error.config?.url || '';
            // Don't redirect on auth endpoints — let the page handle the error
            const isAuthEndpoint = url.includes('/auth/login')
                || url.includes('/auth/register')
                || url.includes('/auth/me');
            if (!isAuthEndpoint) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.dispatchEvent(new CustomEvent('auth:session-expired'));
            }
        }
        return Promise.reject(error);
    }
);

// ─── Auth API ────────────────────────────────────────────
export const authAPI = {
    login: (data) => api.post('/api/auth/login', data),
    register: (data) => api.post('/api/auth/register', data),
    getMe: () => api.get('/api/auth/me'),
    updateMe: (data) => api.put('/api/auth/me', data),
    getUsers: () => api.get('/api/auth/users'),
    updateUser: (id, data) => api.put(`/api/auth/users/${id}`, data),
};

// ─── Alerts API ──────────────────────────────────────────
export const alertsAPI = {
    getAll: (params) => api.get('/api/alerts/', { params }),
    getById: (id) => api.get(`/api/alerts/${id}`),
    create: (data) => api.post('/api/alerts/', data),
    update: (id, data) => api.put(`/api/alerts/${id}`, data),
    delete: (id) => api.delete(`/api/alerts/${id}`),
};

// ─── Resources API ───────────────────────────────────────
export const resourcesAPI = {
    getAll: (params) => api.get('/api/resources/', { params }),
    getById: (id) => api.get(`/api/resources/${id}`),
    getStats: () => api.get('/api/resources/stats'),
    create: (data) => api.post('/api/resources/', data),
    update: (id, data) => api.put(`/api/resources/${id}`, data),
    delete: (id) => api.delete(`/api/resources/${id}`),
};

// ─── Disasters API ───────────────────────────────────────
export const disastersAPI = {
    getZones: (params) => api.get('/api/disasters/zones', { params }),
    createZone: (data) => api.post('/api/disasters/zones', data),
    getEvents: (params) => api.get('/api/disasters/events', { params }),
    createEvent: (data) => api.post('/api/disasters/events', data),
    predict: (data) => api.post('/api/disasters/predict', data),
    getStats: () => api.get('/api/disasters/stats'),
};

// ─── Earthquakes API (USGS real-time) ────────────────────
export const earthquakeAPI = {
    getAll: (minMag = 2.5) => api.get(`/api/earthquakes?min_magnitude=${minMag}`),
    getSeverity: (params) => api.get('/api/earthquakes/severity', { params }),
};

// ─── Geocoding API ────────────────────────────────────────
export const geoAPI = {
    search: (q) => api.get(`/api/geo/search?q=${encodeURIComponent(q)}`),
    reverse: (lat, lon) => api.get(`/api/geo/reverse?lat=${lat}&lon=${lon}`),
    hotspots: () => api.get('/api/geo/hotspots'),
};

// ─── Responder API ────────────────────────────────────────
export const responderAPI = {
    getMissions: () => api.get('/api/responder/missions'),
    updateMission: (id, data) => api.put(`/api/responder/missions/${id}`, data),
    assignMission: (data) => api.post('/api/responder/missions/assign', data),
    getRecommendation: (params) => api.get('/api/responder/ai-recommendation', { params }),
    getResources: () => api.get('/api/responder/resources'),
    updateLocation: (data) => api.post('/api/responder/location', data),
    getLocation: () => api.get('/api/responder/location'),
    postUpdate: (data) => api.post('/api/responder/update', data),
    getLogs: () => api.get('/api/responder/logs'),
};

export default api;

// ─── Admin API (uses separate admin_token) ────────────────
// All requests carry Authorization: Bearer <admin_token>.

const adminApi = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

adminApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            window.dispatchEvent(new CustomEvent('admin:session-expired'));
        }
        return Promise.reject(error);
    }
);

export const adminAPI = {
    // Auth
    login:           (data)       => adminApi.post('/admin/login', data),
    getMe:           ()           => adminApi.get('/admin/me'),
    // Users
    getUsers:        ()           => adminApi.get('/admin/users'),
    getResponders:   ()           => adminApi.get('/admin/users/responders'),
    updateUser:      (id, data)   => adminApi.put(`/admin/users/${id}`, data),
    deactivateUser:  (id)         => adminApi.delete(`/admin/users/${id}`),
    // Responder approval
    approveResponder: (id)        => adminApi.post(`/admin/responders/${id}/approve`),
    revokeResponder:  (id)        => adminApi.post(`/admin/responders/${id}/revoke`),
    // Alerts
    getAlerts:       ()           => adminApi.get('/admin/alerts'),
    deleteAlert:     (id)         => adminApi.delete(`/admin/alerts/${id}`),
    // Resources
    getResources:    ()           => adminApi.get('/admin/resources'),
    deleteResource:  (id)         => adminApi.delete(`/admin/resources/${id}`),
};

export { adminApi };
