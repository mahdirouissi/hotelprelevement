import axios from 'axios';

const API_URL = 'https://localhost:5001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth endpoints
export const authService = {
    login: async (username, password) => {
        const response = await api.post('/auth/login', { Email: username, password: password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    },
    register: async (username, email, password, confirmPassword, role) => {
        const response = await api.post('/auth/register', { username, email, password, confirmPassword, role });
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
};

// Request endpoints
export const requestService = {
    getAllRequests: async () => {
        const response = await api.get('/request');
        return response.data;
    },
    getRequestsByService: async (serviceName) => {
        const response = await api.get(`/request/by-service/${encodeURIComponent(serviceName)}`);
        return response.data;
    },
    getRequestById: async (id) => {
        const response = await api.get(`/request/${id}`);
        return response.data;
    },
    createRequest: async (serviceName, items) => {
        const response = await api.post('/request', { serviceName, items });
        return response.data;
    },
    
    // ========== CONTROL ==========
    controlValidate: async (id, reason = '') => {
        const response = await api.post(`/request/${id}/control-validate`, { reason });
        return response.data;
    },
    controlModify: async (id, reason) => {
        const response = await api.post(`/request/${id}/control-modify`, { reason });
        return response.data;
    },
    controlBlock: async (id, reason) => {
        const response = await api.post(`/request/${id}/control-block`, { reason });
        return response.data;
    },
    updateRequestItems: async (id, items, reason = '') => {
        const response = await api.put(`/request/${id}/items`, { items, reason });
        return response.data;
    },
    
    // ========== DIRECTOR ==========
    directorValidate: async (id, reason = '') => {
        const response = await api.post(`/request/${id}/director-validate`, { reason });
        return response.data;
    },
    directorModify: async (id, reason) => {
        const response = await api.post(`/request/${id}/director-modify`, { reason });
        return response.data;
    },
    directorBlock: async (id, reason) => {
        const response = await api.post(`/request/${id}/director-block`, { reason });
        return response.data;
    },
    updateDirectorItems: async (id, items, reason = '') => {
        const response = await api.put(`/request/${id}/director-items`, { items, reason });
        return response.data;
    },
    
    // ========== ECONOMAT ==========
    economatValidate: async (id, reason = '') => {
        const response = await api.post(`/request/${id}/economat-validate`, { reason });
        return response.data;
    },
    economatModify: async (id, reason) => {
        const response = await api.post(`/request/${id}/economat-modify`, { reason });
        return response.data;
    },
    economatReject: async (id, reason) => {
        const response = await api.post(`/request/${id}/economat-reject`, { reason });
        return response.data;
    },
    
    // ========== FINALIZE ==========
    getProducts: async () => {
        const response = await api.get('/request/products');
        return response.data;
    },
    createProduct: async (codeProduit, designation) => {
        const response = await api.post('/request/products', { code_Produit: codeProduit, designation });
        return response.data;
    },
    finalizeRequest: async (id, productLinks) => {
        const response = await api.post(`/request/${id}/finalize`, { productLinks });
        return response.data;
    },
    getProductStatistics: async () => {
        const response = await api.get('/request/products/statistics');
        return response.data;
    },
    getProcessingTimeStatistics: async () => {
        const response = await api.get('/request/processing-time-statistics');
        return response.data;
    }
};

// Service endpoints
export const serviceService = {
    getAllServices: async () => {
        try {
            const response = await api.get('/service');
            return response.data;
        } catch (err) {
            // If 404, return empty array as fallback
            if (err.response && err.response.status === 404) {
                return [];
            }
            throw err;
        }
    },
    getServiceById: async (id) => {
        const response = await api.get(`/service/${id}`);
        return response.data;
    },
    createService: async (name, description) => {
        const response = await api.post('/service', { name, description });
        return response.data;
    },
    updateService: async (id, name, description, isActive) => {
        const response = await api.put(`/service/${id}`, { name, description, isActive });
        return response.data;
    },
    deleteService: async (id) => {
        const response = await api.delete(`/service/${id}`);
        return response.data;
    }
};

export default api;