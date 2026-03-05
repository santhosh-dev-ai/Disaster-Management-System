import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Validate stored token on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (!savedToken) {
            setInitializing(false);
            return;
        }
        authAPI.getMe()
            .then((res) => {
                setUser(res.data);
                localStorage.setItem('user', JSON.stringify(res.data));
            })
            .catch(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setToken(null);
            })
            .finally(() => setInitializing(false));
    }, []);

    // Listen for session expiry from the 401 interceptor
    useEffect(() => {
        const handler = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
        };
        window.addEventListener('auth:session-expired', handler);
        return () => window.removeEventListener('auth:session-expired', handler);
    }, []);

    const login = async (email, password) => {
        setLoading(true);
        try {
            const res = await authAPI.login({ email, password });
            const { access_token, user: userData } = res.data;
            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(userData));
            setToken(access_token);
            setUser(userData);
            return { success: true, user: userData };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || 'Login failed',
            };
        } finally {
            setLoading(false);
        }
    };

    const register = async (data) => {
        setLoading(true);
        try {
            const res = await authAPI.register(data);
            // Email verification pending — don't log in yet
            if (res.data?.status === 'pending_verification') {
                return { success: true, pending_verification: true, email: res.data.email };
            }
            const { access_token, user: userData } = res.data;
            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(userData));
            setToken(access_token);
            setUser(userData);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || 'Registration failed',
            };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const isAdmin = user?.role === 'admin';
    const isResponder = user?.role === 'responder';
    const isCitizen = user?.role === 'citizen';

    if (initializing) {
        return null; // Prevent flash before token validation
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                login,
                register,
                logout,
                setUser,
                isAdmin,
                isResponder,
                isCitizen,
                isAuthenticated: !!token,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
