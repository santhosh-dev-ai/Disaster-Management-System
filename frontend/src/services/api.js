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
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
    updateMe: (data) => api.put('/auth/me', data),
    getUsers: () => api.get('/auth/users'),
    updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
};

// ─── Alerts API ──────────────────────────────────────────
export const alertsAPI = {
    getAll: (params) => api.get('/alerts/', { params }),
    getById: (id) => api.get(`/alerts/${id}`),
    create: (data) => api.post('/alerts/', data),
    update: (id, data) => api.put(`/alerts/${id}`, data),
    delete: (id) => api.delete(`/alerts/${id}`),
};

// ─── Resources API ───────────────────────────────────────
export const resourcesAPI = {
    getAll: (params) => api.get('/resources/', { params }),
    getById: (id) => api.get(`/resources/${id}`),
    getStats: () => api.get('/resources/stats'),
    create: (data) => api.post('/resources/', data),
    update: (id, data) => api.put(`/resources/${id}`, data),
    delete: (id) => api.delete(`/resources/${id}`),
};

// ─── Disasters API ───────────────────────────────────────
export const disastersAPI = {
    getZones: (params) => api.get('/disasters/zones', { params }),
    createZone: (data) => api.post('/disasters/zones', data),
    getEvents: (params) => api.get('/disasters/events', { params }),
    createEvent: (data) => api.post('/disasters/events', data),
    predict: (data) => api.post('/disasters/predict', data),
    getStats: () => api.get('/disasters/stats'),
};

// ─── Earthquakes API (USGS real-time) ────────────────────
export const earthquakeAPI = {
    getAll: (minMag = 2.5) => api.get(`/earthquakes?min_magnitude=${minMag}`),
    getSeverity: (params) => api.get('/earthquakes/severity', { params }),
};

// ─── Geocoding API ────────────────────────────────────────
export const geoAPI = {
    search: (q) => api.get(`/geo/search?q=${encodeURIComponent(q)}`),
    reverse: (lat, lon) => api.get(`/geo/reverse?lat=${lat}&lon=${lon}`),
    hotspots: () => api.get('/geo/hotspots'),
};

// ─── Responder API ────────────────────────────────────────
export const responderAPI = {
    getMissions: () => api.get('/responder/missions'),
    updateMission: (id, data) => api.put(`/responder/missions/${id}`, data),
    assignMission: (data) => api.post('/responder/missions/assign', data),
    getRecommendation: (params) => api.get('/responder/ai-recommendation', { params }),
    getResources: () => api.get('/responder/resources'),
    updateLocation: (data) => api.post('/responder/location', data),
    getLocation: () => api.get('/responder/location'),
    postUpdate: (data) => api.post('/responder/update', data),
    getLogs: () => api.get('/responder/logs'),
};

export default api;
