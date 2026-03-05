import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLES = [
    { key: 'citizen', label: 'Citizen', icon: '👤', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { key: 'responder', label: 'Responder', icon: '🚒', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
];

export default function RegisterPage() {
    const [form, setForm] = useState({
        email: '',
        username: '',
        full_name: '',
        password: '',
        role: 'citizen',
        phone: '',
    });
    const [pendingEmail, setPendingEmail] = useState(null);
    const { register, loading } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const selectRole = (roleKey) => {
        setForm((f) => ({ ...f, role: roleKey }));
    };

    const activeRole = ROLES.find((r) => r.key === form.role);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await register(form);
        if (result.success) {
            if (result.pending_verification) {
                setPendingEmail(result.email);
            } else {
                toast.success('Account created successfully!');
                const role = result.user?.role;
                if (role === 'responder') navigate('/events');
                else navigate('/dashboard');
            }
        } else {
            toast.error(result.error);
        }
    };

    // Show "Check Your Email" screen after signup
    if (pendingEmail) {
        return (
            <div className="auth-container">
                <div className="auth-card glass-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>📧</div>
                    <h1 className="gradient-text">Check Your Email</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px' }}>
                        We sent a confirmation link to <strong>{pendingEmail}</strong>.<br />
                        Click it to verify your account, then sign in.
                    </p>
                    <Link
                        to="/login"
                        className="btn-primary"
                        style={{ display: 'inline-flex', justifyContent: 'center', padding: '12px 32px' }}
                    >
                        Go to Sign In
                    </Link>
                </div>
            </div>
        );
    }

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
                    <h1 className="gradient-text">Create Account</h1>
                    <p>Join the Disaster Management Network</p>
                </div>

                {/* Role Tabs */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'var(--bg-primary)', borderRadius: '12px', padding: '4px' }}>
                    {ROLES.map((r) => (
                        <button
                            key={r.key}
                            type="button"
                            onClick={() => selectRole(r.key)}
                            style={{
                                flex: 1, padding: '9px 0', borderRadius: '9px', border: 'none',
                                background: form.role === r.key ? r.bg : 'transparent',
                                color: form.role === r.key ? r.color : 'var(--text-muted)',
                                fontWeight: form.role === r.key ? 700 : 500,
                                fontSize: '13px', cursor: 'pointer',
                                boxShadow: form.role === r.key ? `0 2px 10px ${r.color}33` : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {r.icon} {r.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                id="register-name"
                                name="full_name"
                                className="input-field"
                                placeholder="John Doe"
                                value={form.full_name}
                                onChange={handleChange}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                id="register-username"
                                name="username"
                                className="input-field"
                                placeholder="johndoe"
                                value={form.username}
                                onChange={handleChange}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            id="register-email"
                            name="email"
                            type="email"
                            className="input-field"
                            placeholder="john@example.com"
                            value={form.email}
                            onChange={handleChange}
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                id="register-password"
                                name="password"
                                type="password"
                                className="input-field"
                                placeholder="Min 6 characters"
                                value={form.password}
                                onChange={handleChange}
                                autoComplete="new-password"
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input
                                id="register-phone"
                                name="phone"
                                className="input-field"
                                placeholder="+1-555-0000"
                                value={form.phone}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <button
                        id="register-submit"
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}
                    >
                        {loading ? '⏳ Creating...' : '🚀 Create Account'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--accent-blue-light)', textDecoration: 'none', fontWeight: 600 }}>
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
