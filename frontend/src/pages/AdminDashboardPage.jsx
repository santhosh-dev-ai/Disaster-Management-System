/**
 * AdminDashboardPage – protected at /admin/dashboard
 *
 * Verifies admin_token on mount.  If missing / expired → redirects to
 * /admin/login.  Loads users, responders, alerts, and resources from the
 * admin-only API endpoints (all protected by require_admin middleware).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

// ─── Small helpers ────────────────────────────────────────────────────────────

function Badge({ label, color }) {
    return (
        <span
            style={{
                background: `${color}20`,
                color,
                border: `1px solid ${color}40`,
                borderRadius: '20px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'capitalize',
            }}
        >
            {label}
        </span>
    );
}

const ROLE_COLOR = { citizen: '#10b981', responder: '#f59e0b', admin: '#ef4444' };
const SEV_COLOR  = { low: '#10b981', medium: '#6366f1', high: '#f59e0b', critical: '#ef4444' };

function StatCard({ icon, value, label, accent }) {
    return (
        <div
            style={{
                background: 'var(--bg-card, rgba(30,35,60,0.9))',
                border: `1px solid ${accent}30`,
                borderRadius: '14px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flex: '1 1 160px',
                minWidth: '150px',
            }}
        >
            <div
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: `${accent}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0,
                }}
            >
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '24px', fontWeight: 800 }}>{value ?? '—'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }) {
    return (
        <div
            style={{
                background: 'var(--bg-card, rgba(30,35,60,0.9))',
                border: '1px solid rgba(99,102,241,0.12)',
                borderRadius: '16px',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid rgba(99,102,241,0.08)',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}
            >
                {title}
            </div>
            <div style={{ padding: '0' }}>{children}</div>
        </div>
    );
}

// ─── Table ─────────────────────────────────────────────────────────────────────

function Table({ columns, rows, keyFn }) {
    if (!rows.length) {
        return (
            <div
                style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: 'var(--text-muted, #64748b)',
                    fontSize: '13px',
                }}
            >
                No records found.
            </div>
        );
    }
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                    <tr>
                        {columns.map((c) => (
                            <th
                                key={c.key}
                                style={{
                                    padding: '10px 20px',
                                    textAlign: 'left',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-muted, #64748b)',
                                    borderBottom: '1px solid rgba(99,102,241,0.1)',
                                    background: 'rgba(10,14,26,0.3)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={keyFn(row)}
                            style={{
                                borderBottom: '1px solid rgba(99,102,241,0.06)',
                                transition: 'background 0.15s',
                            }}
                        >
                            {columns.map((c) => (
                                <td
                                    key={c.key}
                                    style={{
                                        padding: '12px 20px',
                                        color: 'var(--text-primary, #f1f5f9)',
                                        verticalAlign: 'middle',
                                    }}
                                >
                                    {c.render ? c.render(row) : (row[c.key] ?? '—')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Users', 'Responders', 'Alerts', 'Resources'];

export default function AdminDashboardPage() {
    const navigate = useNavigate();

    const [adminUser, setAdminUser] = useState(null);
    const [activeTab, setActiveTab] = useState('Overview');

    const [users,     setUsers]     = useState([]);
    const [responders, setResponders] = useState([]);
    const [alerts,    setAlerts]    = useState([]);
    const [resources, setResources] = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);

    // ── Guard: require admin token ──────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            navigate('/admin/login', { replace: true });
            return;
        }
        const saved = localStorage.getItem('admin_user');
        if (saved) {
            try { setAdminUser(JSON.parse(saved)); } catch {}
        }
        // Listen for expiry
        const handler = () => {
            toast.error('Admin session expired. Please log in again.');
            navigate('/admin/login', { replace: true });
        };
        window.addEventListener('admin:session-expired', handler);
        return () => window.removeEventListener('admin:session-expired', handler);
    }, [navigate]);

    // ── Load all data ───────────────────────────────────────────────────
    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [u, r, a, res] = await Promise.all([
                adminAPI.getUsers(),
                adminAPI.getResponders(),
                adminAPI.getAlerts(),
                adminAPI.getResources(),
            ]);
            setUsers(u.data || []);
            setResponders(r.data || []);
            setAlerts(a.data || []);
            setResources(res.data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/admin/login', { replace: true });
                return;
            }
            setError('Failed to load data. Make sure the backend is running.');
            console.error('[AdminDashboard] load error:', err);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) loadAll();
    }, [loadAll]);

    // ── Actions ─────────────────────────────────────────────────────────
    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        toast.success('Logged out.');
        navigate('/admin/login', { replace: true });
    };

    const handleDeactivateUser = async (userId, username) => {
        if (!window.confirm(`Deactivate user "${username}"?`)) return;
        try {
            await adminAPI.deactivateUser(userId);
            toast.success(`${username} deactivated.`);
            loadAll();
        } catch { toast.error('Failed to deactivate user.'); }
    };

    const handleApproveResponder = async (userId) => {
        try {
            await adminAPI.approveResponder(userId);
            toast.success('Responder approved.');
            loadAll();
        } catch { toast.error('Failed to approve responder.'); }
    };

    const handleRevokeResponder = async (userId) => {
        if (!window.confirm('Revoke this responder\'s access?')) return;
        try {
            await adminAPI.revokeResponder(userId);
            toast.success('Responder access revoked.');
            loadAll();
        } catch { toast.error('Failed to revoke responder.'); }
    };

    const handleDeleteAlert = async (alertId) => {
        if (!window.confirm('Delete this alert permanently?')) return;
        try {
            await adminAPI.deleteAlert(alertId);
            toast.success('Alert deleted.');
            loadAll();
        } catch { toast.error('Failed to delete alert.'); }
    };

    const handleDeleteResource = async (resourceId, name) => {
        if (!window.confirm(`Delete resource "${name}"?`)) return;
        try {
            await adminAPI.deleteResource(resourceId);
            toast.success('Resource deleted.');
            loadAll();
        } catch { toast.error('Failed to delete resource.'); }
    };

    // ── Styles ───────────────────────────────────────────────────────────
    const s = {
        page: {
            minHeight: '100vh',
            background: 'var(--bg-primary, #0d1117)',
            color: 'var(--text-primary, #f1f5f9)',
            fontFamily: 'Inter, system-ui, sans-serif',
        },
        topbar: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 32px',
            borderBottom: '1px solid rgba(239,68,68,0.12)',
            background: 'rgba(10,14,26,0.7)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            flexWrap: 'wrap',
            gap: '12px',
        },
        content: {
            padding: '28px 32px',
            maxWidth: '1400px',
            margin: '0 auto',
        },
        tabRow: {
            display: 'flex',
            gap: '4px',
            background: 'rgba(10,14,26,0.5)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '28px',
            flexWrap: 'wrap',
        },
        tab: (active) => ({
            padding: '8px 20px',
            borderRadius: '9px',
            border: 'none',
            background: active ? 'rgba(239,68,68,0.18)' : 'transparent',
            color: active ? '#f87171' : 'var(--text-muted, #64748b)',
            fontSize: '13px',
            fontWeight: active ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
        }),
        actionBtn: (color) => ({
            padding: '5px 12px',
            borderRadius: '7px',
            border: `1px solid ${color}40`,
            background: `${color}12`,
            color,
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
        }),
    };

    // ── Render ───────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div
                style={{
                    ...s.page,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛡️</div>
                    <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
                        Loading admin dashboard…
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={s.page}>
            {/* ── Top bar ── */}
            <div style={s.topbar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '22px' }}>🛡️</span>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>
                            DisasterGuard{' '}
                            <span
                                style={{
                                    background: 'linear-gradient(135deg,#f87171,#c084fc)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Admin
                            </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Logged in as{' '}
                            <strong style={{ color: '#94a3b8' }}>
                                {adminUser?.username || 'Admin'}
                            </strong>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link
                        to="/dashboard"
                        style={{
                            fontSize: '12px',
                            color: '#818cf8',
                            textDecoration: 'none',
                        }}
                    >
                        ← User App
                    </Link>
                    <button
                        onClick={loadAll}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(99,102,241,0.3)',
                            background: 'rgba(99,102,241,0.1)',
                            color: '#818cf8',
                            fontSize: '12px',
                            cursor: 'pointer',
                        }}
                    >
                        ↻ Refresh
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.1)',
                            color: '#f87171',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={s.content}>
                {error && (
                    <div
                        style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '10px',
                            padding: '14px 18px',
                            marginBottom: '24px',
                            fontSize: '13px',
                            color: '#f87171',
                        }}
                    >
                        ⚠️ {error}
                    </div>
                )}

                {/* ── Tab bar ── */}
                <div style={s.tabRow}>
                    {TABS.map((t) => (
                        <button
                            key={t}
                            style={s.tab(activeTab === t)}
                            onClick={() => setActiveTab(t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* ══════════════════ OVERVIEW ══════════════════ */}
                {activeTab === 'Overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Stat cards */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                            <StatCard icon="👥" value={users.length}      label="Total Users"      accent="#818cf8" />
                            <StatCard icon="🚒" value={responders.length} label="Responders"       accent="#f59e0b" />
                            <StatCard icon="🚨" value={alerts.length}     label="Active Alerts"   accent="#ef4444" />
                            <StatCard icon="📦" value={resources.length}  label="Resources"       accent="#10b981" />
                        </div>

                        {/* Role breakdown */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                            {[
                                { label: 'Citizens',   count: users.filter(u => u.role === 'citizen').length,   color: '#10b981' },
                                { label: 'Responders', count: users.filter(u => u.role === 'responder').length, color: '#f59e0b' },
                                { label: 'Inactive',   count: users.filter(u => !u.is_active).length,           color: '#ef4444' },
                                {
                                    label: 'Critical Alerts',
                                    count: alerts.filter(a => a.severity === 'critical' && a.is_active).length,
                                    color: '#ef4444',
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    style={{
                                        flex: '1 1 160px',
                                        padding: '16px 18px',
                                        background: `${item.color}0d`,
                                        border: `1px solid ${item.color}25`,
                                        borderRadius: '12px',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: '22px',
                                            fontWeight: 800,
                                            color: item.color,
                                        }}
                                    >
                                        {item.count}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: 'var(--text-muted, #64748b)',
                                            marginTop: '2px',
                                        }}
                                    >
                                        {item.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ══════════════════ USERS ══════════════════ */}
                {activeTab === 'Users' && (
                    <Section title="👥 All Registered Users">
                        <Table
                            keyFn={(u) => u.id}
                            columns={[
                                { key: 'id',       label: 'ID' },
                                { key: 'username', label: 'Username' },
                                { key: 'email',    label: 'Email' },
                                { key: 'full_name',label: 'Full Name' },
                                {
                                    key: 'role',
                                    label: 'Role',
                                    render: (u) => (
                                        <Badge
                                            label={u.role}
                                            color={ROLE_COLOR[u.role] || '#818cf8'}
                                        />
                                    ),
                                },
                                {
                                    key: 'is_active',
                                    label: 'Status',
                                    render: (u) => (
                                        <Badge
                                            label={u.is_active ? 'Active' : 'Inactive'}
                                            color={u.is_active ? '#10b981' : '#ef4444'}
                                        />
                                    ),
                                },
                                {
                                    key: 'actions',
                                    label: 'Actions',
                                    render: (u) =>
                                        u.is_active ? (
                                            <button
                                                style={s.actionBtn('#ef4444')}
                                                onClick={() =>
                                                    handleDeactivateUser(u.id, u.username)
                                                }
                                            >
                                                Deactivate
                                            </button>
                                        ) : (
                                            <span
                                                style={{ fontSize: '11px', color: '#64748b' }}
                                            >
                                                Inactive
                                            </span>
                                        ),
                                },
                            ]}
                            rows={users}
                        />
                    </Section>
                )}

                {/* ══════════════════ RESPONDERS ══════════════════ */}
                {activeTab === 'Responders' && (
                    <Section title="🚒 Responders">
                        <Table
                            keyFn={(u) => u.id}
                            columns={[
                                { key: 'id',        label: 'ID' },
                                { key: 'username',  label: 'Username' },
                                { key: 'email',     label: 'Email' },
                                { key: 'full_name', label: 'Full Name' },
                                { key: 'location',  label: 'Location' },
                                {
                                    key: 'is_active',
                                    label: 'Status',
                                    render: (u) => (
                                        <Badge
                                            label={u.is_active ? 'Active' : 'Pending'}
                                            color={u.is_active ? '#10b981' : '#f59e0b'}
                                        />
                                    ),
                                },
                                {
                                    key: 'actions',
                                    label: 'Actions',
                                    render: (u) => (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {!u.is_active && (
                                                <button
                                                    style={s.actionBtn('#10b981')}
                                                    onClick={() =>
                                                        handleApproveResponder(u.id)
                                                    }
                                                >
                                                    ✓ Approve
                                                </button>
                                            )}
                                            {u.is_active && (
                                                <button
                                                    style={s.actionBtn('#ef4444')}
                                                    onClick={() =>
                                                        handleRevokeResponder(u.id)
                                                    }
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                        </div>
                                    ),
                                },
                            ]}
                            rows={responders}
                        />
                    </Section>
                )}

                {/* ══════════════════ ALERTS ══════════════════ */}
                {activeTab === 'Alerts' && (
                    <Section title="🚨 Disaster Alerts">
                        <Table
                            keyFn={(a) => a.id}
                            columns={[
                                { key: 'id',           label: 'ID' },
                                { key: 'title',        label: 'Title' },
                                { key: 'disaster_type',label: 'Type' },
                                {
                                    key: 'severity',
                                    label: 'Severity',
                                    render: (a) => (
                                        <Badge
                                            label={a.severity}
                                            color={SEV_COLOR[a.severity] || '#818cf8'}
                                        />
                                    ),
                                },
                                { key: 'location_name', label: 'Location' },
                                {
                                    key: 'is_active',
                                    label: 'Active',
                                    render: (a) => (
                                        <Badge
                                            label={a.is_active ? 'Active' : 'Inactive'}
                                            color={a.is_active ? '#10b981' : '#64748b'}
                                        />
                                    ),
                                },
                                {
                                    key: 'actions',
                                    label: 'Actions',
                                    render: (a) => (
                                        <button
                                            style={s.actionBtn('#ef4444')}
                                            onClick={() => handleDeleteAlert(a.id)}
                                        >
                                            Delete
                                        </button>
                                    ),
                                },
                            ]}
                            rows={alerts}
                        />
                    </Section>
                )}

                {/* ══════════════════ RESOURCES ══════════════════ */}
                {activeTab === 'Resources' && (
                    <Section title="📦 Emergency Resources">
                        <Table
                            keyFn={(r) => r.id}
                            columns={[
                                { key: 'id',            label: 'ID' },
                                { key: 'name',          label: 'Name' },
                                { key: 'resource_type', label: 'Type' },
                                { key: 'quantity',      label: 'Qty' },
                                { key: 'unit',          label: 'Unit' },
                                {
                                    key: 'status',
                                    label: 'Status',
                                    render: (r) => {
                                        const clr =
                                            r.status === 'available'
                                                ? '#10b981'
                                                : r.status === 'deployed'
                                                ? '#f59e0b'
                                                : '#64748b';
                                        return <Badge label={r.status} color={clr} />;
                                    },
                                },
                                { key: 'location_name', label: 'Location' },
                                {
                                    key: 'actions',
                                    label: 'Actions',
                                    render: (r) => (
                                        <button
                                            style={s.actionBtn('#ef4444')}
                                            onClick={() =>
                                                handleDeleteResource(r.id, r.name)
                                            }
                                        >
                                            Delete
                                        </button>
                                    ),
                                },
                            ]}
                            rows={resources}
                        />
                    </Section>
                )}
            </div>
        </div>
    );
}
