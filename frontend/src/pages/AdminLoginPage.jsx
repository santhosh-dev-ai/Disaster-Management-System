/**
 * AdminLoginPage – standalone page at /admin/login
 *
 * Uses POST /admin/login which ONLY checks the admins table.
 * On success, stores the JWT as  localStorage.admin_token  and
 * the admin user object as  localStorage.admin_user.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    // Redirect if already authenticated as admin
    useEffect(() => {
        if (localStorage.getItem('admin_token')) {
            navigate('/admin/dashboard', { replace: true });
        }
        // Listen for session expiry
        const handler = () => navigate('/admin/login', { replace: true });
        window.addEventListener('admin:session-expired', handler);
        return () => window.removeEventListener('admin:session-expired', handler);
    }, [navigate]);

    const handleChange = (e) =>
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            toast.error('Please fill in all fields.');
            return;
        }
        setLoading(true);
        try {
            const res = await adminAPI.login(form);
            const { access_token, admin } = res.data;
            localStorage.setItem('admin_token', access_token);
            localStorage.setItem('admin_user', JSON.stringify(admin));
            toast.success(`Welcome, ${admin.username}!`);
            navigate('/admin/dashboard', { replace: true });
        } catch (err) {
            const msg =
                err.response?.data?.detail ||
                'Login failed. Check your credentials.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // ── Styles ────────────────────────────────────────────────
    const s = {
        page: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary, #0d1117)',
            padding: '24px',
        },
        card: {
            width: '100%',
            maxWidth: '420px',
            padding: '40px',
            background: 'var(--bg-card, rgba(30,35,60,0.95))',
            borderRadius: '20px',
            border: '1px solid rgba(239,68,68,0.25)',
            boxShadow: '0 20px 60px rgba(239,68,68,0.08), 0 4px 20px rgba(0,0,0,0.4)',
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#f87171',
            borderRadius: '20px',
            padding: '4px 14px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '20px',
        },
        label: {
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary, #94a3b8)',
            marginBottom: '6px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
        },
        input: {
            width: '100%',
            padding: '12px 14px',
            background: 'var(--bg-secondary, rgba(15,20,40,0.6))',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px',
            color: 'var(--text-primary, #f1f5f9)',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
        },
        btn: {
            width: '100%',
            padding: '13px',
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            letterSpacing: '0.03em',
            transition: 'opacity 0.2s',
        },
    };

    return (
        <div style={s.page}>
            <div style={s.card}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: '18px',
                            background:
                                'linear-gradient(135deg, #dc2626, #7c3aed)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '36px',
                            marginBottom: '16px',
                            boxShadow: '0 8px 30px rgba(220,38,38,0.35)',
                        }}
                    >
                        🛡️
                    </div>
                    <div style={s.badge}>🔒 Restricted Access</div>
                    <h1
                        style={{
                            fontSize: '24px',
                            fontWeight: 800,
                            background:
                                'linear-gradient(135deg, #f87171, #c084fc)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: '0 0 6px',
                        }}
                    >
                        Admin Portal
                    </h1>
                    <p
                        style={{
                            fontSize: '13px',
                            color: 'var(--text-muted, #64748b)',
                            margin: 0,
                        }}
                    >
                        DisasterGuard AI · System Administration
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div style={{ marginBottom: '18px' }}>
                        <label style={s.label} htmlFor="email">
                            Admin Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            placeholder="admin@example.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                            style={s.input}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '28px' }}>
                        <label style={s.label} htmlFor="password">
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                required
                                style={{ ...s.input, paddingRight: '44px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    color: '#64748b',
                                    padding: '2px',
                                }}
                                tabIndex={-1}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button type="submit" style={s.btn} disabled={loading}>
                        {loading ? 'Authenticating…' : '🔐 Sign In as Admin'}
                    </button>
                </form>

                {/* Footer */}
                <div
                    style={{
                        marginTop: '24px',
                        padding: '14px',
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: 'var(--text-muted, #64748b)',
                        textAlign: 'center',
                        lineHeight: 1.6,
                    }}
                >
                    ⚠️ Admin access is for authorised personnel only.
                    <br />
                    Accounts are provisioned by the system administrator.
                </div>

                <div
                    style={{
                        marginTop: '20px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--text-muted, #64748b)',
                    }}
                >
                    Not an admin?{' '}
                    <Link
                        to="/login"
                        style={{ color: '#818cf8', textDecoration: 'none' }}
                    >
                        User login →
                    </Link>
                </div>
            </div>
        </div>
    );
}
