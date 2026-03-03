import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ROLE_CONFIG = {
    admin: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '🛡️' },
    responder: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🚨' },
    citizen: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '👤' },
};

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ role: '', is_active: true });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const res = await authAPI.getUsers();
            setUsers(res.data);
        } catch (err) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (user) => {
        setEditingId(user.id);
        setEditForm({ role: user.role, is_active: user.is_active });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ role: '', is_active: true });
    };

    const handleSave = async (userId) => {
        setSaving(true);
        try {
            const res = await authAPI.updateUser(userId, editForm);
            setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
            setEditingId(null);
            toast.success('User updated');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update user');
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter((u) =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase())
    );

    const roleCounts = users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
    }, {});

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading users...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Manage roles and access levels for all registered users</p>
                </div>
            </div>

            {/* ─── Stats Row ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Users', value: users.length, icon: '👥', color: '#6366f1' },
                    { label: 'Admins', value: roleCounts.admin || 0, icon: '🛡️', color: '#ef4444' },
                    { label: 'Responders', value: roleCounts.responder || 0, icon: '🚨', color: '#f59e0b' },
                    { label: 'Citizens', value: roleCounts.citizen || 0, icon: '👤', color: '#10b981' },
                ].map(({ label, value, icon, color }) => (
                    <div key={label} className="card" style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* ─── Search ────────────────────────────────── */}
            <div className="card" style={{ marginBottom: '16px', padding: '16px 20px' }}>
                <input
                    className="form-input"
                    placeholder="🔍  Search by name, email or username..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: '400px' }}
                />
            </div>

            {/* ─── Users Table ───────────────────────────── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                            {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                                <th key={h} style={{
                                    padding: '14px 20px', textAlign: 'left',
                                    fontSize: '11px', fontWeight: 600,
                                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    No users found
                                </td>
                            </tr>
                        )}
                        {filteredUsers.map((u) => {
                            const roleStyle = ROLE_CONFIG[u.role] || ROLE_CONFIG.citizen;
                            const isEditing = editingId === u.id;
                            const isSelf = u.id === currentUser?.id;

                            return (
                                <tr key={u.id} style={{
                                    borderBottom: '1px solid var(--border-color)',
                                    background: isEditing ? 'rgba(99,102,241,0.05)' : 'transparent',
                                    transition: 'background 0.15s',
                                }}>
                                    {/* User */}
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: '50%',
                                                background: 'var(--gradient-primary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '14px', fontWeight: 700, color: 'white', flexShrink: 0,
                                            }}>
                                                {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 600 }}>{u.full_name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{u.username}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Email */}
                                    <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {u.email}
                                    </td>

                                    {/* Role */}
                                    <td style={{ padding: '14px 20px' }}>
                                        {isEditing ? (
                                            <select
                                                className="form-input"
                                                value={editForm.role}
                                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                                style={{ padding: '6px 10px', minWidth: '120px' }}
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="responder">Responder</option>
                                                <option value="citizen">Citizen</option>
                                            </select>
                                        ) : (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                padding: '4px 10px', borderRadius: '12px',
                                                background: roleStyle.bg, color: roleStyle.color,
                                                fontSize: '12px', fontWeight: 600,
                                            }}>
                                                {roleStyle.icon} {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                                            </span>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td style={{ padding: '14px 20px' }}>
                                        {isEditing ? (
                                            <select
                                                className="form-input"
                                                value={editForm.is_active ? 'active' : 'inactive'}
                                                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}
                                                style={{ padding: '6px 10px', minWidth: '110px' }}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        ) : (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                padding: '4px 10px', borderRadius: '12px',
                                                background: u.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                                color: u.is_active ? '#10b981' : '#ef4444',
                                                fontSize: '12px', fontWeight: 600,
                                            }}>
                                                {u.is_active ? '● Active' : '● Inactive'}
                                            </span>
                                        )}
                                    </td>

                                    {/* Joined */}
                                    <td style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                                    </td>

                                    {/* Actions */}
                                    <td style={{ padding: '14px 20px' }}>
                                        {isSelf ? (
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>You</span>
                                        ) : isEditing ? (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleSave(u.id)}
                                                    disabled={saving}
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '8px',
                                                        background: '#10b981', border: 'none', color: 'white',
                                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                                    }}
                                                >
                                                    {saving ? '...' : '✓ Save'}
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '8px',
                                                        background: 'transparent', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
                                                    }}
                                                >
                                                    ✕ Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => startEdit(u)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: '8px',
                                                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                                                    color: '#818cf8', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                                }}
                                            >
                                                ✏️ Edit
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
