import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(email, password);
        if (result.success) {
            toast.success('Welcome back!');
            navigate('/dashboard');
        } else {
            toast.error(result.error);
        }
    };

    const fillDemo = (role) => {
        const creds = {
            admin: { email: 'admin@disastermgmt.com', password: 'admin123' },
            responder: { email: 'responder@disastermgmt.com', password: 'responder123' },
            citizen: { email: 'citizen@disastermgmt.com', password: 'citizen123' },
        };
        setEmail(creds[role].email);
        setPassword(creds[role].password);
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-card">
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--gradient-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            marginBottom: '16px',
                            boxShadow: '0 8px 30px rgba(99, 102, 241, 0.3)',
                        }}
                    >
                        🛡️
                    </div>
                    <h1 className="gradient-text">DisasterGuard AI</h1>
                    <p>Sign in to the Disaster Management System</p>
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

                {/* Demo accounts */}
                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <div
                        style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                            marginBottom: '12px',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                        }}
                    >
                        Quick Demo Access
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {['admin', 'responder', 'citizen'].map((role) => (
                            <button
                                key={role}
                                onClick={() => fillDemo(role)}
                                type="button"
                                className="btn-outline"
                                style={{ padding: '8px', fontSize: '12px', textTransform: 'capitalize' }}
                            >
                                {role === 'admin' ? '👑' : role === 'responder' ? '🚒' : '👤'} {role}
                            </button>
                        ))}
                    </div>
                </div>

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
