import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLES = [
    { key: 'citizen', label: 'Citizen', icon: '👤', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { key: 'responder', label: 'Responder', icon: '🚒', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { key: 'admin', label: 'Admin', icon: '🛡️', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

export default function LoginPage() {
    const [selectedRole, setSelectedRole] = useState('citizen');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    // Detect Supabase email-confirmation redirect (#type=signup)
    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('type=signup') || hash.includes('type=email_change')) {
            toast.success('Email verified! You can now sign in.');
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(email, password);
        if (result.success) {
            toast.success('Welcome back!');
            const role = result.user?.role;
            if (role === 'admin') navigate('/users');
            else if (role === 'responder') navigate('/events');
            else navigate('/dashboard');
        } else {
            toast.error(result.error);
        }
    };

    const activeRole = ROLES.find((r) => r.key === selectedRole);

    return (
        <div className="auth-container">
            <div className="auth-card glass-card">
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 'var(--radius-lg)',
                            background: activeRole ? `linear-gradient(135deg, ${activeRole.color}, var(--accent-primary))` : 'var(--gradient-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            marginBottom: '16px',
                            boxShadow: activeRole ? `0 8px 30px ${activeRole.color}55` : '0 8px 30px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.3s',
                        }}
                    >
                        {activeRole?.icon || '🛡️'}
                    </div>
                    <h1 className="gradient-text">DisasterGuard AI</h1>
                    <p>Sign in to the Disaster Management System</p>
                </div>

                {/* Role Tabs */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'var(--bg-primary)', borderRadius: '12px', padding: '4px' }}>
                    {ROLES.map((r) => (
                        <button
                            key={r.key}
                            type="button"
                            onClick={() => setSelectedRole(r.key)}
                            style={{
                                flex: 1, padding: '9px 0', borderRadius: '9px', border: 'none',
                                background: selectedRole === r.key ? r.bg : 'transparent',
                                color: selectedRole === r.key ? r.color : 'var(--text-muted)',
                                fontWeight: selectedRole === r.key ? 700 : 500,
                                fontSize: '13px', cursor: 'pointer',
                                boxShadow: selectedRole === r.key ? `0 2px 10px ${r.color}33` : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {r.icon} {r.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            id="login-email"
                            type="email"
                            className="input-field"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            id="login-password"
                            type="password"
                            className="input-field"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    <button
                        id="login-submit"
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}
                    >
                        {loading ? '⏳ Signing in...' : '🔐 Sign In'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--accent-blue-light)', textDecoration: 'none', fontWeight: 600 }}>
                        Register
                    </Link>
                </div>
            </div>
        </div>
    );
}
