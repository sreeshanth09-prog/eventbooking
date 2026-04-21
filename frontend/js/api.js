const API_BASE_URL = 'http://localhost:5001/api';

const api = {
    getToken() {
        return localStorage.getItem('token');
    },
    setToken(token) {
        localStorage.setItem('token', token);
    },
    removeToken() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },
    
    async request(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            method,
            headers,
        };
        
        if (body) {
            config.body = JSON.stringify(body);
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong');
            }
            return data;
        } catch (error) {
            throw error;
        }
    }
};

function logout() {
    api.removeToken();
    window.location.href = 'login.html';
}

function checkAuth() {
    if (!api.getToken()) {
        window.location.href = 'login.html';
    }
}
