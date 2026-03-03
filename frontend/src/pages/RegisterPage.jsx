import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
    const [form, setForm] = useState({
        email: '',
        username: '',
        full_name: '',
        password: '',
        role: 'citizen',
        phone: '',
    });
    const { register, loading } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await register(form);
        if (result.success) {
            toast.success('Account created successfully!');
            navigate('/dashboard');
        } else {
            toast.error(result.error);
        }
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
                    <h1 className="gradient-text">Create Account</h1>
                    <p>Join the Disaster Management Network</p>
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

                    <div className="form-group">
                        <label>Role</label>
                        <select
                            id="register-role"
                            name="role"
                            className="select-field"
                            value={form.role}
                            onChange={handleChange}
                        >
                            <option value="citizen">👤 Citizen</option>
                            <option value="responder">🚒 Responder</option>
                            <option value="admin">👑 Admin</option>
                        </select>
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
